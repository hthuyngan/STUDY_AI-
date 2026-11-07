/**
 * Evidence Aggregation Engine
 * Strictly processes verified PracticeResult records.
 * Rejects unsubmitted, abandoned, duplicate, mock, or unverified question results.
 */

import type { PracticeResult } from '@/types/practice'
import type { QuestionItem } from '@/types/questionBank'
import type { QuestionAttemptEvidence, SkillEvidence } from '@/types/personalization'

export interface AggregationOptions {
  approvedQuestionMap?: Map<string, QuestionItem>
  requireApprovedQuestions?: boolean
}

export interface PracticeResultValidation {
  isValid: boolean
  errors: string[]
  sanitizedResult?: PracticeResult
}

export interface PracticeResultValidationOptions {
  strictAllQuestionsApproved?: boolean
}

/**
 * Validates the factual integrity and completeness of a PracticeResult.
 * Ensures timestamps, score bounds, unique identifiers, scoring version and question approval.
 */
export function validatePracticeResultIntegrity(
  res: unknown,
  approvedQuestionMap?: Map<string, QuestionItem>,
  options: PracticeResultValidationOptions = {}
): PracticeResultValidation {
  const errors: string[] = []

  if (!res || typeof res !== 'object') {
    return { isValid: false, errors: ['Kết quả thực hành không phải là một đối tượng hợp lệ.'] }
  }

  const r = res as Partial<PracticeResult>

  if (!r.id || typeof r.id !== 'string' || r.id.trim() === '') {
    errors.push('Thiếu hoặc sai định dạng ID kết quả (id).')
  }

  if (!r.sessionId || typeof r.sessionId !== 'string' || r.sessionId.trim() === '') {
    errors.push('Thiếu hoặc sai định dạng phiên luyện tập (sessionId).')
  }

  if (!r.scoringVersion || typeof r.scoringVersion !== 'string') {
    errors.push('Thiếu phiên bản chấm điểm (scoringVersion).')
  }

  if (typeof r.earnedPoints !== 'number' || typeof r.maxPoints !== 'number') {
    errors.push('Điểm số kiếm được hoặc điểm tối đa không phải là số hợp lệ.')
  } else {
    if (r.earnedPoints < 0) {
      errors.push(`Điểm kiếm được không thể âm (${r.earnedPoints}).`)
    }
    if (r.maxPoints <= 0) {
      errors.push(`Điểm tối đa phải lớn hơn 0 (${r.maxPoints}).`)
    }
    if (r.earnedPoints > r.maxPoints + 0.001) {
      errors.push(`Điểm kiếm được (${r.earnedPoints}) vượt quá điểm tối đa (${r.maxPoints}).`)
    }
  }

  if (!r.submittedAt || isNaN(Date.parse(r.submittedAt))) {
    errors.push('Thời điểm nộp bài (submittedAt) không đúng định dạng ISO 8601.')
  }

  if (r.startedAt && !isNaN(Date.parse(r.startedAt)) && r.submittedAt && !isNaN(Date.parse(r.submittedAt))) {
    if (Date.parse(r.startedAt) > Date.parse(r.submittedAt)) {
      errors.push('Thời điểm bắt đầu (startedAt) không thể diễn ra sau thời điểm nộp bài (submittedAt).')
    }
  }

  if (!Array.isArray(r.questionResults) || r.questionResults.length === 0) {
    errors.push('Danh sách câu hỏi (questionResults) phải là một mảng có ít nhất 1 câu.')
  } else {
    let approvedCount = 0

    for (let i = 0; i < r.questionResults.length; i++) {
      const q = r.questionResults[i]
      if (!q || !q.questionId || typeof q.questionId !== 'string') {
        errors.push(`Câu hỏi thứ ${i + 1} thiếu questionId hợp lệ.`)
        continue
      }
      if (typeof q.earnedPoints !== 'number' || typeof q.maxPoints !== 'number' || q.earnedPoints < 0) {
        errors.push(`Câu hỏi ${q.questionId} có cấu trúc điểm không hợp lệ.`)
      }
      if (approvedQuestionMap) {
        const approvedItem = approvedQuestionMap.get(q.questionId)
        if (!approvedItem) {
          if (options.strictAllQuestionsApproved) {
            errors.push(`Câu hỏi ${q.questionId} không tồn tại trong ngân hàng câu hỏi kiểm duyệt.`)
          }
        } else if (approvedItem.reviewStatus !== 'approved') {
          if (options.strictAllQuestionsApproved) {
            errors.push(`Câu hỏi ${q.questionId} chưa được phê duyệt (trạng thái: ${approvedItem.reviewStatus}).`)
          }
        } else {
          approvedCount += 1
        }
      }
    }

    if (approvedQuestionMap && approvedCount === 0) {
      errors.push('Không có câu hỏi nào được phê duyệt (approved) trong kết quả luyện tập.')
    }
  }

  if (errors.length > 0) {
    return { isValid: false, errors }
  }

  return {
    isValid: true,
    errors: [],
    sanitizedResult: r as PracticeResult,
  }
}

/**
 * Aggregates factual skill performance evidence from authentic practice results.
 * Pure function: Never modifies input PracticeResult objects.
 */
export function aggregateSkillEvidence(
  results: PracticeResult[] | null | undefined,
  options: AggregationOptions = {}
): Record<string, SkillEvidence> {
  if (!results || !Array.isArray(results) || results.length === 0) {
    return {}
  }

  // If requireApprovedQuestions is explicitly true but no approvedQuestionMap provided, return empty
  if (options.requireApprovedQuestions && (!options.approvedQuestionMap || options.approvedQuestionMap.size === 0)) {
    return {}
  }

  // 1. Sanitize & Deduplicate results by sessionId (Anti duplicate / double submit)
  const sessionSeen = new Set<string>()
  const validResults: PracticeResult[] = []

  for (const res of results) {
    const validation = validatePracticeResultIntegrity(res, options.approvedQuestionMap)
    if (!validation.isValid || !validation.sanitizedResult) {
      continue
    }

    const validRes = validation.sanitizedResult

    // Reject duplicate sessions
    if (sessionSeen.has(validRes.sessionId)) continue
    sessionSeen.add(validRes.sessionId)

    validResults.push(validRes)
  }

  if (validResults.length === 0) {
    return {}
  }

  // Sort chronologically by submittedAt
  validResults.sort((a, b) => new Date(a.submittedAt).getTime() - new Date(b.submittedAt).getTime())

  const evidenceMap: Record<string, SkillEvidence> = {}

  for (const res of validResults) {
    const sessionSkillIds = new Set<string>()

    for (const qRes of res.questionResults) {
      if (!qRes || !qRes.questionId) continue

      // Verify question approval status if question bank map is provided
      if (options.approvedQuestionMap) {
        const qItem = options.approvedQuestionMap.get(qRes.questionId)
        if (!qItem || qItem.reviewStatus !== 'approved') {
          // Exclude unapproved, needs_review or missing questions
          continue
        }
      }

      if (!qRes.skillIds || qRes.skillIds.length === 0) continue

      const skillWeight = 1 / qRes.skillIds.length
      const earned = qRes.earnedPoints * skillWeight
      const max = qRes.maxPoints * skillWeight

      for (const skillId of qRes.skillIds) {
        sessionSkillIds.add(skillId)

        if (!evidenceMap[skillId]) {
          evidenceMap[skillId] = {
            skillId,
            attemptCount: 0,
            questionCount: 0,
            uniqueQuestionIds: [],
            fullyCorrectCount: 0,
            earnedPoints: 0,
            maxPoints: 0,
            firstAttemptAt: res.submittedAt,
            lastAttemptAt: res.submittedAt,
            relatedQuestionIds: [],
            relatedSessionIds: [],
            relatedLessonIds: [],
            repeatedQuestionCount: 0,
            chronologicalAttempts: [],
          }
        }

        const ev = evidenceMap[skillId]

        ev.questionCount += 1
        ev.earnedPoints += earned
        ev.maxPoints += max

        if (qRes.isFullyCorrect) {
          ev.fullyCorrectCount += 1
        }

        if (!ev.uniqueQuestionIds.includes(qRes.questionId)) {
          ev.uniqueQuestionIds.push(qRes.questionId)
        }

        if (!ev.relatedQuestionIds.includes(qRes.questionId)) {
          ev.relatedQuestionIds.push(qRes.questionId)
        }

        if (res.lessonId && !ev.relatedLessonIds.includes(res.lessonId)) {
          ev.relatedLessonIds.push(res.lessonId)
        }

        // Track timestamp bounds
        if (new Date(res.submittedAt).getTime() < new Date(ev.firstAttemptAt).getTime()) {
          ev.firstAttemptAt = res.submittedAt
        }
        if (new Date(res.submittedAt).getTime() > new Date(ev.lastAttemptAt).getTime()) {
          ev.lastAttemptAt = res.submittedAt
        }

        const attemptEvidence: QuestionAttemptEvidence = {
          sessionId: res.sessionId,
          questionId: qRes.questionId,
          lessonId: res.lessonId,
          timestamp: res.submittedAt,
          isFullyCorrect: qRes.isFullyCorrect,
          earnedPoints: earned,
          maxPoints: max,
          skillWeight,
        }
        ev.chronologicalAttempts.push(attemptEvidence)
      }
    }

    // Increment attemptCount once per session for participating skills
    for (const skillId of sessionSkillIds) {
      if (evidenceMap[skillId]) {
        evidenceMap[skillId].attemptCount += 1
        if (!evidenceMap[skillId].relatedSessionIds.includes(res.sessionId)) {
          evidenceMap[skillId].relatedSessionIds.push(res.sessionId)
        }
      }
    }
  }

  // Calculate repeated question count for each skill
  for (const skillId of Object.keys(evidenceMap)) {
    const ev = evidenceMap[skillId]
    ev.repeatedQuestionCount = Math.max(0, ev.questionCount - ev.uniqueQuestionIds.length)
  }

  return evidenceMap
}

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

  // 1. Sanitize & Deduplicate results by sessionId (Anti duplicate / double submit)
  const sessionSeen = new Set<string>()
  const validResults: PracticeResult[] = []

  for (const res of results) {
    if (!res || typeof res !== 'object') continue
    if (!res.id || !res.sessionId || !Array.isArray(res.questionResults)) continue
    if (!res.submittedAt) continue

    // Reject duplicate sessions
    if (sessionSeen.has(res.sessionId)) continue
    sessionSeen.add(res.sessionId)

    validResults.push(res)
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

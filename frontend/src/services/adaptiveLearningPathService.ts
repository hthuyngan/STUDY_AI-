/**
 * Adaptive Learning Path Service
 * Produces an evidence-based, actionable 3-5 step roadmap.
 * Dynamically recomputed upon every new practice attempt.
 * Zero simulated completion, zero fake dates.
 */

import { aggregateSkillEvidence } from './evidenceAggregationEngine'
import { analyzeSkillPerformances } from './skillPerformanceEngine'
import { detectKnowledgeGaps } from './knowledgeGapDetectionEngine'
import type { PracticeResult } from '@/types/practice'
import type {
  LearnerAnalyticsSummary,
  LearningPathStep,
  PersonalizedLearningPath,
} from '@/types/personalization'
import type { QuestionItem } from '@/types/questionBank'

export interface AdaptivePathOptions {
  approvedQuestionMap?: Map<string, QuestionItem>
  skillNameMap?: Record<string, string>
  lessonTitleMap?: Record<string, string>
}

/**
 * Calculates high-level summary of authentic practice results without fake metrics.
 */
export function calculateLearnerAnalyticsSummary(
  results: PracticeResult[] | null | undefined,
  approvedQuestionMap?: Map<string, QuestionItem>
): LearnerAnalyticsSummary {
  if (!results || results.length === 0) {
    return {
      totalSessions: 0,
      totalQuestionsAnswered: 0,
      uniqueQuestionsAnswered: 0,
      overallScoreRatio: 0,
      skillsEvaluatedCount: 0,
      skillsWithSufficientDataCount: 0,
      skillsNeedingDataCount: 0,
      knowledgeGapsCount: 0,
      firstSessionAt: null,
      lastSessionAt: null,
    }
  }

  const evidenceMap = aggregateSkillEvidence(results, { approvedQuestionMap })
  const performances = analyzeSkillPerformances(evidenceMap)
  const gaps = detectKnowledgeGaps(performances, evidenceMap)

  const uniqueQuestions = new Set<string>()
  let totalQuestionsAnswered = 0
  let totalEarned = 0
  let totalMax = 0

  for (const r of results) {
    totalQuestionsAnswered += r.totalQuestions
    totalEarned += r.earnedPoints
    totalMax += r.maxPoints
    for (const qr of r.questionResults) {
      uniqueQuestions.add(qr.questionId)
    }
  }

  const overallScoreRatio = totalMax > 0 ? Math.round((totalEarned / totalMax) * 1000) / 1000 : 0

  const timestamps = results.map((r) => new Date(r.submittedAt).getTime())
  const minTime = Math.min(...timestamps)
  const maxTime = Math.max(...timestamps)

  const sufficientCount = performances.filter((p) => p.confidenceLevel !== 'insufficient').length
  const needingDataCount = performances.filter((p) => p.confidenceLevel === 'insufficient').length

  return {
    totalSessions: results.length,
    totalQuestionsAnswered,
    uniqueQuestionsAnswered: uniqueQuestions.size,
    overallScoreRatio,
    skillsEvaluatedCount: performances.length,
    skillsWithSufficientDataCount: sufficientCount,
    skillsNeedingDataCount: needingDataCount,
    knowledgeGapsCount: gaps.length,
    firstSessionAt: new Date(minTime).toISOString(),
    lastSessionAt: new Date(maxTime).toISOString(),
  }
}

/**
 * Generates an adaptive, sequential learning path from real PracticeResults.
 */
export function generateAdaptiveLearningPath(
  results: PracticeResult[] | null | undefined,
  options: AdaptivePathOptions = {}
): PersonalizedLearningPath {
  const now = new Date().toISOString()

  if (!results || results.length === 0) {
    return {
      id: 'alp-empty',
      generatedAt: now,
      sourceResultIds: [],
      steps: [],
      explanation:
        'Bạn chưa có đủ kết quả đánh giá để tạo lộ trình cá nhân hóa. Hãy hoàn thành một bài luyện tập để bắt đầu.',
      status: 'empty',
    }
  }

  const evidenceMap = aggregateSkillEvidence(results, {
    approvedQuestionMap: options.approvedQuestionMap,
  })

  // If no valid skills found in results
  if (Object.keys(evidenceMap).length === 0) {
    return {
      id: 'alp-empty-skills',
      generatedAt: now,
      sourceResultIds: results.map((r) => r.id),
      steps: [],
      explanation: 'Các bài luyện tập chưa chứa kỹ năng kiểm chứng hợp lệ.',
      status: 'empty',
    }
  }

  const performances = analyzeSkillPerformances(evidenceMap, options.skillNameMap)
  const gaps = detectKnowledgeGaps(performances, evidenceMap)

  const steps: LearningPathStep[] = []
  let stepNumber = 1

  // Step 1: Address most urgent Knowledge Gap (Lesson Review or Practice)
  if (gaps.length > 0) {
    const topGap = gaps[0]
    const targetLessonId = topGap.relatedLessonIds[0] || 'lesson-math-12-01'

    steps.push({
      id: `step-${stepNumber}`,
      stepNumber: stepNumber++,
      title: `Ôn tập lý thuyết: ${topGap.skillName}`,
      objective: `Củng cố lại khái niệm và phương pháp giải cho kỹ năng ${topGap.skillName}`,
      reason: topGap.evidenceSummary,
      actionType: 'review_lesson',
      targetRoute: `/subjects/math/lessons/${targetLessonId}`,
      lessonId: targetLessonId,
      skillId: topGap.skillId,
      isCompleted: false,
      badgeText: 'Ưu tiên cao',
    })

    steps.push({
      id: `step-${stepNumber}`,
      stepNumber: stepNumber++,
      title: `Luyện tập khắc phục 5 câu: ${topGap.skillName}`,
      objective: `Đạt ít nhất 80% câu trả lời đúng trong bài luyện tập chuyên sâu`,
      reason: `Thực hành ngay sau khi ôn lý thuyết để khắc phục lỗ hổng kiến thức`,
      actionType: 'practice_skill',
      targetRoute: `/practice?skillId=${topGap.skillId}&limit=5`,
      skillId: topGap.skillId,
      isCompleted: false,
      badgeText: 'Thực hành',
    })
  } else {
    // If no critical gaps, recommend diagnostic or next practice
    const candidateSkill = performances[0]
    if (candidateSkill) {
      steps.push({
        id: `step-${stepNumber}`,
        stepNumber: stepNumber++,
        title: `Luyện tập củng cố: ${candidateSkill.skillName}`,
        objective: `Nâng cao độ tin cậy đánh giá và rèn luyện kỹ năng ${candidateSkill.skillName}`,
        reason: `Duy trì phong độ và kiểm chứng thêm số câu hỏi phân biệt`,
        actionType: 'practice_skill',
        targetRoute: `/practice?skillId=${candidateSkill.skillId}&limit=5`,
        skillId: candidateSkill.skillId,
        isCompleted: false,
        badgeText: 'Củng cố',
      })
    }
  }

  // Step 3: Diagnostic Assessment or Next Skill
  const secondSkill = performances.find((p) => p.skillId !== steps[0]?.skillId)
  if (secondSkill && stepNumber <= 3) {
    steps.push({
      id: `step-${stepNumber}`,
      stepNumber: stepNumber++,
      title: `Đánh giá năng lực: ${secondSkill.skillName}`,
      objective: `Thu thập thêm bằng chứng đánh giá cho kỹ năng ${secondSkill.skillName}`,
      reason: `Kỹ năng hiện đang có độ tin cậy ${secondSkill.confidenceLevel === 'insufficient' ? 'chưa đủ' : 'trung bình'}`,
      actionType: 'diagnostic_practice',
      targetRoute: `/practice?skillId=${secondSkill.skillId}&limit=5`,
      skillId: secondSkill.skillId,
      isCompleted: false,
      badgeText: 'Chẩn đoán',
    })
  }

  // Step 4: Continue Curriculum
  steps.push({
    id: `step-${stepNumber}`,
    stepNumber: stepNumber++,
    title: 'Học bài tiếp theo trong chương trình GDPT 2018',
    objective: 'Tiến bước vào bài học tiếp theo của Chương 1 Toán 12',
    reason: 'Đảm bảo lộ trình tiến độ song song với việc khắc phục lỗ hổng kiến thức',
    actionType: 'review_lesson',
    targetRoute: '/subjects/math',
    isCompleted: false,
    badgeText: 'Chương trình',
  })

  const sourceResultIds = results.map((r) => r.id)
  const explanation = `Lộ trình được tự động cá nhân hóa từ ${results.length} bài luyện tập thực tế và ${gaps.length} lỗ hổng kiến thức được nhận diện.`

  return {
    id: `alp-${Date.now()}`,
    generatedAt: now,
    sourceResultIds,
    steps,
    explanation,
    status: 'active',
  }
}

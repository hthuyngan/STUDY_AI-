/**
 * Personalized Recommendation Engine
 * Generates transparent, deterministic, and explainable recommendations.
 * Recommends only valid curriculum lessons and skills with verified approved questions.
 */

import type {
  KnowledgeGapItem,
  LearningRecommendation,
  SkillEvidence,
  SkillPerformance,
} from '@/types/personalization'

export interface RecommendationEngineOptions {
  availableApprovedSkillIds?: Set<string>
  validLessonIds?: Set<string>
  lessonTitleMap?: Record<string, string>
}

/**
 * Generates prioritized, pedagogical learning recommendations.
 */
export function generateRecommendations(
  performances: SkillPerformance[],
  gaps: KnowledgeGapItem[],
  evidenceMap: Record<string, SkillEvidence>,
  options: RecommendationEngineOptions = {}
): LearningRecommendation[] {
  const recommendations: LearningRecommendation[] = []
  const approvedSkills = options.availableApprovedSkillIds
  const validLessons = options.validLessonIds
  const lessonTitles = options.lessonTitleMap || {}

  const now = new Date().toISOString()

  // 1. Critical Gaps -> High Priority Review Lesson & Targeted Practice
  for (const gap of gaps) {
    if (gap.gapLevel === 'critical') {
      const targetLessonId = gap.relatedLessonIds.find((id) => !validLessons || validLessons.has(id))
      const lessonTitle = targetLessonId ? lessonTitles[targetLessonId] || targetLessonId : gap.skillName

      if (targetLessonId) {
        recommendations.push({
          id: `rec-rev-${gap.skillId}`,
          skillId: gap.skillId,
          skillName: gap.skillName,
          title: `Đọc lại lý thuyết: ${lessonTitle}`,
          reason: `Phát hiện lỗ hổng kiến thức nghiêm trọng tại kỹ năng này.`,
          evidence: gap.evidenceSummary,
          actionType: 'review_lesson',
          targetLessonId,
          targetSubjectId: 'math',
          priority: 'high',
          createdAt: now,
        })
      }

      // Recommend practice only if skill has approved questions in Question Bank
      if (!approvedSkills || approvedSkills.has(gap.skillId)) {
        recommendations.push({
          id: `rec-prac-${gap.skillId}`,
          skillId: gap.skillId,
          skillName: gap.skillName,
          title: `Luyện tập khắc phục: ${gap.skillName}`,
          reason: `Cần hoàn thành bài luyện tập 5 câu hỏi kiểm chứng để nâng cao tỷ lệ đúng.`,
          evidence: gap.evidenceSummary,
          actionType: 'practice_skill',
          targetSubjectId: 'math',
          practiceConfig: {
            skillId: gap.skillId,
            limit: 5,
            subjectId: 'math',
          },
          priority: 'high',
          createdAt: now,
        })
      }
    }
  }

  // 2. Insufficient Data on attempted skills -> Medium Priority Diagnostic Practice
  for (const perf of performances) {
    if (perf.status === 'insufficient_data') {
      const ev = evidenceMap[perf.skillId]
      if (ev && ev.questionCount > 0) {
        if (!approvedSkills || approvedSkills.has(perf.skillId)) {
          recommendations.push({
            id: `rec-diag-${perf.skillId}`,
            skillId: perf.skillId,
            skillName: perf.skillName,
            title: `Đánh giá chẩn đoán: ${perf.skillName}`,
            reason: `Dữ liệu đánh giá hiện tại chưa đủ (${perf.evidenceCount} câu hỏi khác nhau). Cần thêm dữ liệu để hệ thống xác định độ tin cậy năng lực.`,
            evidence: `Đã làm ${ev.questionCount} lượt, trong đó có ${ev.uniqueQuestionIds.length} câu hỏi phân biệt.`,
            actionType: 'diagnostic_practice',
            targetSubjectId: 'math',
            practiceConfig: {
              skillId: perf.skillId,
              limit: 5,
              subjectId: 'math',
            },
            priority: 'medium',
            createdAt: now,
          })
        }
      }
    }
  }

  // 3. Moderate Gaps or Reinforcing Skills -> Medium Priority Reinforcement Practice
  for (const gap of gaps) {
    if (gap.gapLevel === 'moderate') {
      if (!approvedSkills || approvedSkills.has(gap.skillId)) {
        recommendations.push({
          id: `rec-reinf-${gap.skillId}`,
          skillId: gap.skillId,
          skillName: gap.skillName,
          title: `Luyện tập củng cố: ${gap.skillName}`,
          reason: `Kỹ năng có tỷ lệ điểm dưới 60%, cần làm thêm bài tập để củng cố.`,
          evidence: gap.evidenceSummary,
          actionType: 'reinforcement',
          targetSubjectId: 'math',
          practiceConfig: {
            skillId: gap.skillId,
            limit: 5,
            subjectId: 'math',
          },
          priority: 'medium',
          createdAt: now,
        })
      }
    }
  }

  // 4. Proficient skills -> Low Priority Continue Learning
  for (const perf of performances) {
    if (perf.status === 'proficient' && perf.scoreRatio >= 0.8) {
      recommendations.push({
        id: `rec-cont-${perf.skillId}`,
        skillId: perf.skillId,
        skillName: perf.skillName,
        title: `Tiếp tục bài học mới: ${perf.skillName}`,
        reason: `Kết quả luyện tập hiện tại đạt mức tốt (${Math.round(perf.scoreRatio * 100)}%). Sẵn sàng tiếp tục bài tiếp theo.`,
        evidence: `Đạt ${Math.round(perf.scoreRatio * 100)}% trên ${perf.evidenceCount} câu hỏi đánh giá.`,
        actionType: 'continue_learning',
        targetSubjectId: 'math',
        priority: 'low',
        createdAt: now,
      })
    }
  }

  // Deduplicate by ID
  const seenIds = new Set<string>()
  const uniqueRecommendations = recommendations.filter((r) => {
    if (seenIds.has(r.id)) return false
    seenIds.add(r.id)
    return true
  })

  // Sort by priority (high > medium > low), then title
  return uniqueRecommendations.sort((a, b) => {
    const pRank: Record<string, number> = { high: 0, medium: 1, low: 2 }
    const diff = pRank[a.priority] - pRank[b.priority]
    if (diff !== 0) return diff
    return a.title.localeCompare(b.title)
  })
}

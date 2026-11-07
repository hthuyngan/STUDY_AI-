/**
 * Personalization Service
 * High-level orchestration facade for Phase 13 evidence-based learning engine.
 * Pulls authentic results from practiceRepository, approved questions from questionBankRepository,
 * and curriculum metadata to provide reactive analytics.
 */

import { practiceRepository } from '@/repositories/practice.repository'
import { questionBankRepository } from '@/repositories/questionBank.repository'
import { aggregateSkillEvidence } from './evidenceAggregationEngine'
import { analyzeSkillPerformances } from './skillPerformanceEngine'
import { detectKnowledgeGaps } from './knowledgeGapDetectionEngine'
import { generateRecommendations } from './recommendationEngine'
import {
  calculateLearnerAnalyticsSummary,
  generateAdaptiveLearningPath,
} from './adaptiveLearningPathService'
import type {
  KnowledgeGapItem,
  LearnerAnalyticsSummary,
  LearningRecommendation,
  PersonalizedLearningPath,
  SkillEvidence,
  SkillPerformance,
} from '@/types/personalization'
import type { QuestionItem } from '@/types/questionBank'

export interface PersonalizationOverview {
  summary: LearnerAnalyticsSummary
  performances: SkillPerformance[]
  gaps: KnowledgeGapItem[]
  recommendations: LearningRecommendation[]
  learningPath: PersonalizedLearningPath
  evidenceMap: Record<string, SkillEvidence>
  hasData: boolean
}

const MATH_SKILL_NAME_MAP: Record<string, string> = {
  'math-12-sk-01': 'Tính đơn điệu của hàm số & xét dấu đạo hàm',
  'math-12-sk-02': 'Cực trị của hàm số bậc ba, bậc bốn và phân thức',
  'math-12-sk-03': 'Giá trị lớn nhất và nhỏ nhất của hàm số trên đoạn',
  'math-12-sk-04': 'Đường tiệm cận đứng và tiệm cận xiên / ngang',
  'math-12-sk-05': 'Khảo sát biến thiên và nhận dạng đồ thị hàm số',
}

const MATH_LESSON_TITLE_MAP: Record<string, string> = {
  'lesson-math-12-01': 'Bài 1: Tính đơn điệu và cực trị của hàm số',
  'lesson-math-12-02': 'Bài 2: Giá trị lớn nhất và giá trị nhỏ nhất của hàm số',
  'lesson-math-12-03': 'Bài 3: Khảo sát sự biến thiên và vẽ đồ thị của hàm số',
}

export const personalizationService = {
  /**
   * Retrieves full personalized analytics data based on actual practice records.
   */
  async getOverview(): Promise<PersonalizationOverview> {
    const results = await practiceRepository.getAllResults()
    const allQuestions = await questionBankRepository.getAll()

    const approvedQuestions = allQuestions.filter((q) => q.reviewStatus === 'approved')
    const approvedQuestionMap = new Map<string, QuestionItem>()
    approvedQuestions.forEach((q) => approvedQuestionMap.set(q.id, q))

    const availableApprovedSkillIds = new Set<string>()
    approvedQuestions.forEach((q) => {
      q.skillIds?.forEach((sId) => availableApprovedSkillIds.add(sId))
    })

    const evidenceMap = aggregateSkillEvidence(results, { approvedQuestionMap })
    const performances = analyzeSkillPerformances(evidenceMap, MATH_SKILL_NAME_MAP)
    const gaps = detectKnowledgeGaps(performances, evidenceMap)
    const recommendations = generateRecommendations(performances, gaps, evidenceMap, {
      availableApprovedSkillIds,
      lessonTitleMap: MATH_LESSON_TITLE_MAP,
    })
    const learningPath = generateAdaptiveLearningPath(results, {
      approvedQuestionMap,
      skillNameMap: MATH_SKILL_NAME_MAP,
      lessonTitleMap: MATH_LESSON_TITLE_MAP,
    })
    const summary = calculateLearnerAnalyticsSummary(results, approvedQuestionMap)

    return {
      summary,
      performances,
      gaps,
      recommendations,
      learningPath,
      evidenceMap,
      hasData: results.length > 0,
    }
  },

  /**
   * Directly generates adaptive learning path from authentic practice history.
   */
  async getAdaptiveLearningPath(): Promise<PersonalizedLearningPath> {
    const overview = await this.getOverview()
    return overview.learningPath
  },

  /**
   * Retrieves specific skill evidence record.
   */
  async getSkillEvidence(skillId: string): Promise<SkillEvidence | null> {
    const overview = await this.getOverview()
    return overview.evidenceMap[skillId] || null
  },
}

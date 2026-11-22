/**
 * Learning Analytics Service
 * Orchestrates analytics computations, aggregates measured metrics, and provides
 * specialized analytics queries for both Learner and Teacher workspaces.
 */

import {
  assessmentAttemptRepository,
  learningEventsRepository,
  learningProgressRepository,
} from '@/repositories'
import { knowledgeGapsService } from '@/services/knowledgeGaps.service'
import { smartReviewService } from '@/services/smartReview.service'
import {
  selectAnalyticsSummary,
  selectDailyActivities,
  selectCompetencyProfile,
  selectSubjectAnalytics,
  selectAssessmentTrends,
  selectLearningHistory,
  normalizeSubjectId,
} from '@/selectors/learningAnalytics.selectors'
import { apiClient } from '@/lib/apiClient'
import type {
  AiLearningReport,
  ExamMatrixRequest,
  ExamReviewAnalytics,
  LearningAnalyticsOverview,
  LearningRisk,
} from '@/types/learningAnalytics'
import type { PracticeSession } from '@/types/practice'
import type {
  StudentLearningAnalyticsData,
  StudentAnalyticsSummary,
  DailyActivityMetric,
  TopicCompetencyItem,
  SubjectAnalyticsItem,
  AssessmentTrendItem,
  TimelineHistoryItem,
} from '@/types/analytics'

export const LEARNING_ANALYTICS_CHANGED_EVENT = 'study_ai:learning_analytics_changed'

export const learningAnalyticsService = {
  /**
   * Retrieves complete learner analytics data.
   */
  getAnalyticsData(): StudentLearningAnalyticsData {
    const progressMap = learningProgressRepository.getAll()
    const attempts = assessmentAttemptRepository.getAll()
    const events = learningEventsRepository.getAll()
    const gaps = knowledgeGapsService.getAllGaps()
    const reviewItems = smartReviewService.getAllItems()

    const summary = selectAnalyticsSummary(progressMap, attempts, gaps, reviewItems)
    const dailyActivities = selectDailyActivities(events, attempts)
    const competencies = selectCompetencyProfile(gaps, attempts, progressMap)
    const subjectAnalytics = selectSubjectAnalytics(progressMap, attempts, gaps)
    const assessmentTrends = selectAssessmentTrends(attempts)
    const historyTimeline = selectLearningHistory(events, attempts, gaps, reviewItems)

    return {
      summary,
      dailyActivities,
      competencies,
      subjectAnalytics,
      assessmentTrends,
      historyTimeline,
    }
  },

  getSummary(): StudentAnalyticsSummary {
    const progressMap = learningProgressRepository.getAll()
    const attempts = assessmentAttemptRepository.getAll()
    const gaps = knowledgeGapsService.getAllGaps()
    const reviewItems = smartReviewService.getAllItems()
    return selectAnalyticsSummary(progressMap, attempts, gaps, reviewItems)
  },

  getDailyActivities(referenceDate?: Date): DailyActivityMetric[] {
    const events = learningEventsRepository.getAll()
    const attempts = assessmentAttemptRepository.getAll()
    return selectDailyActivities(events, attempts, referenceDate)
  },

  getCompetencyProfile(filter?: { subjectId?: string; level?: string }): TopicCompetencyItem[] {
    const progressMap = learningProgressRepository.getAll()
    const attempts = assessmentAttemptRepository.getAll()
    const gaps = knowledgeGapsService.getAllGaps()
    let items = selectCompetencyProfile(gaps, attempts, progressMap)

    if (filter?.subjectId && filter.subjectId !== 'all') {
      const norm = normalizeSubjectId(filter.subjectId)
      items = items.filter((i) => i.subjectId === norm)
    }

    if (filter?.level && filter.level !== 'all') {
      items = items.filter((i) => i.level === filter.level)
    }

    return items
  },

  getSubjectAnalytics(subjectId?: string): SubjectAnalyticsItem[] {
    const progressMap = learningProgressRepository.getAll()
    const attempts = assessmentAttemptRepository.getAll()
    const gaps = knowledgeGapsService.getAllGaps()
    const all = selectSubjectAnalytics(progressMap, attempts, gaps)

    if (subjectId && subjectId !== 'all') {
      const norm = normalizeSubjectId(subjectId)
      return all.filter((s) => s.subjectId === norm)
    }
    return all
  },

  getAssessmentTrends(subjectId?: string): AssessmentTrendItem[] {
    const attempts = assessmentAttemptRepository.getAll()
    const trends = selectAssessmentTrends(attempts)
    if (subjectId && subjectId !== 'all') {
      const norm = normalizeSubjectId(subjectId)
      return trends.filter((t) => t.subjectId === norm)
    }
    return trends
  },

  getLearningHistory(filter?: { subjectId?: string; category?: string }): TimelineHistoryItem[] {
    const events = learningEventsRepository.getAll()
    const attempts = assessmentAttemptRepository.getAll()
    const gaps = knowledgeGapsService.getAllGaps()
    const reviewItems = smartReviewService.getAllItems()
    let list = selectLearningHistory(events, attempts, gaps, reviewItems)

    if (filter?.subjectId && filter.subjectId !== 'all') {
      const norm = normalizeSubjectId(filter.subjectId)
      list = list.filter((item) => item.subjectId === norm)
    }

    if (filter?.category && filter.category !== 'all') {
      list = list.filter((item) => item.category === filter.category)
    }

    return list
  },

  /**
   * Retrieves student learning analytics overview (GDPT 2018 metrics).
   */
  async getAnalyticsOverview(
    subjectId = 'sub_math12',
    timeframe: '7d' | '30d' | 'all' = 'all'
  ): Promise<LearningAnalyticsOverview> {
    return apiClient.get<LearningAnalyticsOverview>(
      `/api/v1/ai/analytics/overview?subjectId=${encodeURIComponent(subjectId)}&timeframe=${encodeURIComponent(timeframe)}`
    )
  },

  /**
   * Retrieves active learning risks and knowledge gap traps.
   */
  async getLearningRisks(subjectId = 'sub_math12'): Promise<LearningRisk[]> {
    return apiClient.get<LearningRisk[]>(
      `/api/v1/ai/analytics/risks?subjectId=${encodeURIComponent(subjectId)}`
    )
  },

  /**
   * Retrieves holistic AI learning report.
   */
  async getAiLearningReport(subjectId = 'sub_math12'): Promise<AiLearningReport> {
    return apiClient.get<AiLearningReport>(
      `/api/v1/ai/analytics/report?subjectId=${encodeURIComponent(subjectId)}`
    )
  },

  /**
   * Generates a matrix-based practice/exam session.
   */
  async generateMatrixExam(request: ExamMatrixRequest): Promise<PracticeSession> {
    return await apiClient.post<PracticeSession>('/api/v1/ai/exams/matrix', request)
  },

  /**
   * Retrieves deep analytical review for a completed exam session.
   */
  async getExamReviewAnalytics(sessionId: string): Promise<ExamReviewAnalytics> {
    return await apiClient.get<ExamReviewAnalytics>(
      `/api/v1/ai/exams/${encodeURIComponent(sessionId)}/review-analytics`
    )
  },
}


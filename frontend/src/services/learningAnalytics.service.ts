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

export interface TeacherStudentAnalyticsData {
  studentId: string
  isDemoProfile: boolean
  disclaimer: string
  summary: StudentAnalyticsSummary
  subjectAnalytics: SubjectAnalyticsItem[]
  competencies: TopicCompetencyItem[]
  assessmentTrends: AssessmentTrendItem[]
  recommendedInterventions: string[]
}

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
   * Generates Teacher Student Analytics for a student profile.
   * Differentiates real device data from demo data, without claiming fake cross-device sync.
   */
  getTeacherStudentAnalytics(
    studentId: string,
    studentName?: string
  ): TeacherStudentAnalyticsData {
    // Current local learner data if matches, else demo academic baseline
    const data = this.getAnalyticsData()

    const recommendedInterventions: string[] = []
    if (data.summary.activeKnowledgeGapsCount > 0) {
      recommendedInterventions.push(
        `Cần ôn luyện ${data.summary.activeKnowledgeGapsCount} điểm kiến thức còn hổng trước khi làm bài kiểm tra tiếp theo.`
      )
    }
    if (data.summary.averageAssessmentScore !== null && data.summary.averageAssessmentScore < 60) {
      recommendedInterventions.push(
        'Điểm bài thu hoạch dưới ngưỡng chuẩn (60%), đề xuất giáo viên giao thêm bài củng cố lý thuyết.'
      )
    }
    if (data.summary.totalReviewSessionsCompleted === 0) {
      recommendedInterventions.push(
        'Học sinh chưa thực hiện phiên ôn tập ngắt quãng Spaced Repetition nào, cần nhắc nhở chuyên cần.'
      )
    }
    if (recommendedInterventions.length === 0) {
      recommendedInterventions.push(
        'Học sinh duy trì tiến độ học tập xuất sắc, nắm chắc kiến thức cơ bản và hoàn thành tốt bài thu hoạch.'
      )
    }

    return {
      studentId,
      isDemoProfile: true,
      disclaimer: `Dữ liệu phân tích học thuật mẫu cho hồ sơ học viên ${studentName || studentId}`,
      summary: data.summary,
      subjectAnalytics: data.subjectAnalytics,
      competencies: data.competencies,
      assessmentTrends: data.assessmentTrends,
      recommendedInterventions,
    }
  },
}


/**
 * Learning Analytics & Student Competency Profile Type Definitions
 * Phase 7: Deterministic aggregations from measured learner activities.
 */

export type CompetencyLevel = 'mastered' | 'reinforcing' | 'needs-review' | 'insufficient-data'

export interface DailyActivityMetric {
  date: string // YYYY-MM-DD
  dayLabel: string // 'T2', 'T3', ... 'CN'
  eventCount: number
  studyTimeMinutes: number
  hasActivity: boolean
}

export interface StudentAnalyticsSummary {
  totalLessonsCompleted: number
  totalLessonsAvailable: number
  overallCompletionPercent: number
  assessmentAttemptsCount: number
  averageAssessmentScore: number | null // null when 0 attempts
  activeKnowledgeGapsCount: number
  masteredGapsCount: number
  totalReviewSessionsCompleted: number
  estimatedStudyTimeMinutes: number
}

export interface TopicCompetencyItem {
  id: string
  subjectId: string
  subjectName: string
  lessonId: string
  lessonTitle: string
  sectionId?: string
  sectionTitle?: string
  title: string
  level: CompetencyLevel
  evidence: string
  wrongAttemptsCount: number
  lastEvaluatedAt: string
}

export interface SubjectAnalyticsItem {
  subjectId: string
  subjectName: string
  completedLessons: number
  totalLessons: number
  completionPercent: number
  assessmentAverageScore: number | null
  attemptCount: number
  activeGapsCount: number
  masteredCount: number
  competencyLevel: CompetencyLevel
  qualitativeAssessment: string
  recommendedAction: string
}

export interface AssessmentTrendItem {
  attemptId: string
  lessonId: string
  lessonTitle: string
  subjectId: string
  subjectName: string
  scorePercent: number
  attemptNumber: number
  submittedAt: string
  isPassing: boolean
}

export interface TimelineHistoryItem {
  id: string
  timestamp: string
  dateFormatted: string
  timeFormatted: string
  category: 'assessment' | 'smart_review' | 'lesson_progress' | 'knowledge_gap'
  title: string
  description: string
  subjectId?: string
  subjectName?: string
  badgeText: string
  badgeVariant: 'success' | 'warning' | 'info' | 'primary'
}

export interface StudentLearningAnalyticsData {
  summary: StudentAnalyticsSummary
  dailyActivities: DailyActivityMetric[]
  competencies: TopicCompetencyItem[]
  subjectAnalytics: SubjectAnalyticsItem[]
  assessmentTrends: AssessmentTrendItem[]
  historyTimeline: TimelineHistoryItem[]
}


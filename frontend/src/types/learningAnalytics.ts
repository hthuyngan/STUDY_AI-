/**
 * Phase AI-03: Learning Analytics & Intelligent Assessment Domain Types
 */

import type { DifficultyBreakdownItem } from './personalization'

export interface ChapterMasteryItem {
  chapterId: string
  chapterTitle: string
  orderIndex: number
  totalLessons: number
  completedLessons: number
  completionPercent: number
  averageMasteryScore: number
  status: 'not_started' | 'in_progress' | 'completed'
}

export interface TopicCompetencyItem {
  topicId: string
  topicName: string
  masteryScore: number
  accuracyPercent: number
  attemptCount: number
  status: 'needs_reinforcement' | 'progressing' | 'proficient' | 'mastered' | 'insufficient_data'
  statusLabel: string
}

export interface ProgressionDataPoint {
  date: string // YYYY-MM-DD
  accuracyPercent: number
  questionsAttempted: number
  cumulativeMasteryScore: number
}

export interface ReviewFrequencyStats {
  sessionsLast7Days: number
  sessionsLast30Days: number
  activeStreakDays: number
  lastActiveAt?: string
}

export interface ExamPerformanceSummary {
  examsCompletedCount: number
  averageExamScoreScaled: number
  highestExamScoreScaled: number
  latestExamScoreScaled: number
  latestExamAt?: string
}

export interface LearningAnalyticsOverview {
  userId: string
  subjectId: string
  subjectName: string
  timeframe: '7d' | '30d' | 'all'
  totalQuestionsAttempted: number
  totalCorrect: number
  totalIncorrect: number
  overallAccuracyPercent: number
  totalTimeSpentSeconds: number
  totalSessionsCompleted: number
  curriculumProgressPercent: number
  currentMasteryTier: string
  currentMasteryLabel: string
  overallMasteryScore: number
  difficultyAccuracy: Record<string, DifficultyBreakdownItem>
  chapterMasteries: ChapterMasteryItem[]
  topStrengths: TopicCompetencyItem[]
  topWeaknesses: TopicCompetencyItem[]
  progressionTimeline: ProgressionDataPoint[]
  reviewFrequency: ReviewFrequencyStats
  examSummary: ExamPerformanceSummary
}

export interface LearningRisk {
  id: string
  riskType: 'consecutive_mistakes' | 'declining_mastery' | 'unremediated_gap' | 'decay_unreviewed' | 'unstable_performance'
  riskLevel: 'high' | 'medium' | 'low'
  title: string
  topicName: string
  lessonId?: string
  rootCauseEvidence: string
  recommendedAction: string
  detectedAt: string
}

export interface ExamMatrixRequest {
  subjectId?: string
  title?: string
  durationMinutes?: number
  totalQuestions?: number
  chapterId?: string
  cognitiveDistribution?: Record<string, number>
}

export interface RecommendedReviewItem {
  lessonId: string
  lessonTitle: string
  chapterTitle: string
  reason: string
}

export interface ExamReviewAnalytics {
  sessionId: string
  subjectId: string
  examTitle: string
  scoreScaled: number
  scoreRaw: number
  scoreMax: number
  totalQuestions: number
  correctCount: number
  incorrectCount: number
  unansweredCount: number
  timeSpentSeconds: number
  completedAt: string
  byCognitiveBreakdown: Record<string, DifficultyBreakdownItem>
  byChapterBreakdown: ChapterMasteryItem[]
  mistakeTopics: string[]
  recommendedLessons: RecommendedReviewItem[]
}

export interface AiLearningReport {
  reportId: string
  userId: string
  subjectId: string
  subjectName: string
  generatedAt: string
  overallMasteryScore: number
  currentCompetencyTier: string
  accuracyPercent: number
  totalQuestionsAttempted: number
  curriculumProgressPercent: number
  overallEvaluation: string
  keyStrengths: string[]
  criticalGaps: string[]
  recentProgressSummary: string
  commonMistakePatterns: string[]
  recommendedGoals: string[]
  shortTermStudyPlan: string[]
  pedagogicalNarrative: string
  provider: string
  isFallbackNarrative: boolean
}


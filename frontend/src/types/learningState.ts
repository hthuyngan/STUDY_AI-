import type { ContinueLessonItem, RecentActivityItem } from './dashboard'

/**
 * Domain representation of a single lesson's learning status and performance.
 */
export interface LessonLearningState {
  lessonId: string
  subjectId: string
  chapterId: string
  title: string
  overallProgress: number // 0 - 100
  contentProgress: number // 0 - 80
  status: 'not-started' | 'in-progress' | 'completed' | 'locked'
  lastActivityAt: string // ISO 8601 timestamp
  completedAt?: string
  assessmentStatus: 'not-attempted' | 'incomplete' | 'completed'
  latestScore?: number // e.g. 80 (%)
  bestScore?: number // e.g. 100 (%)
  attemptCount: number
  totalLearningTimeMs: number
}

/**
 * Domain representation of a curriculum chapter.
 * Progress is computed as the arithmetic average of progress across all lessons in the chapter.
 */
export interface ChapterLearningState {
  chapterId: string
  subjectId: string
  title: string
  lessonCount: number
  startedLessons: number
  completedLessons: number
  progress: number // average lesson progress (0 - 100)
  lastActivityAt?: string
}

/**
 * Domain representation of a subject.
 * Progress is computed as the arithmetic average of all lessons across all chapters.
 */
export interface SubjectLearningState {
  id: string
  name: string
  icon: string
  color: string
  bgColor: string
  progress: number // 0 - 100
  completedLessons: number
  totalLessons: number
  startedLessons: number
  lastActivityAt?: string
  currentLessonId?: string
  currentChapterId?: string
}

/**
 * Study streak calculation based on local calendar dates.
 */
export interface StreakState {
  current: number
  longest: number
  activeDates: string[] // 'YYYY-MM-DD' formatted in local timezone
  isTodayActive: boolean
}

/**
 * Daily activity aggregation for weekly chart.
 */
export interface DailyActivityPoint {
  day: string // 'T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'
  fullDay: string // 'Thứ Hai', 'Thứ Ba'...
  date: string // 'YYYY-MM-DD'
  minutes: number
  lessons: number
}

export interface WeeklyActivityState {
  points: DailyActivityPoint[]
  totalMinutes: number
  weeklyHours: number
  increasePercent: number
}

/**
 * Single source of truth snapshot representing the learner's entire state.
 */
export interface LearningStateSnapshot {
  generatedAt: string
  lessons: Record<string, LessonLearningState>
  chapters: Record<string, ChapterLearningState>
  subjects: Record<string, SubjectLearningState>
  continueLearning: ContinueLessonItem[]
  recentActivities: RecentActivityItem[]
  streak: StreakState
  weeklyActivity: WeeklyActivityState
  summary: {
    totalLessons: number
    completedLessons: number
    inProgressLessons: number
    totalXP: number
    lastAccessedLessonId?: string
    lastAccessedSubjectId?: string
  }
}

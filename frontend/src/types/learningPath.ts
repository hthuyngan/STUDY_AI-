export interface LearningPathStage {
  id: string
  orderNumber: number
  title: string
  status: 'completed' | 'current' | 'upcoming'
  progress: number
  estimatedHours: number
  completedLessons: number
  totalLessons: number
  keyTopics: string[]
  primaryLessonId?: string
  primaryCourseId?: string
}

export interface AISuggestion {
  id: string
  title: string
  reason: string
  actionLabel: string
  actionUrl: string
  topic: string
}

export interface LearningPathData {
  goalTitle: string
  targetExam: string
  daysRemaining: number
  overallProgress: number
  currentStreak: number
  stages: LearningPathStage[]
  aiSuggestion: AISuggestion
}

export type LessonPathStatus = 'not-started' | 'in-progress' | 'completed' | 'recommended'

export interface LearningPathLessonItem {
  id: string
  subjectId: string
  chapterId: string
  chapterTitle: string
  title: string
  order: number
  durationMinutes: number
  xp: number
  status: LessonPathStatus
  progress: number
  isRecommendedNext?: boolean
  lastActiveSectionId?: string
}

export interface LearningPathChapterItem {
  id: string
  title: string
  order: number
  totalLessons: number
  completedLessons: number
  progressPercent: number
  lessons: LearningPathLessonItem[]
}

export interface SubjectLearningPath {
  subjectId: string
  subjectName: string
  grade: string
  totalLessons: number
  completedLessons: number
  overallProgress: number
  recommendedLesson: LearningPathLessonItem | null
  chapters: LearningPathChapterItem[]
  allCompleted: boolean
}

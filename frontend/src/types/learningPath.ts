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

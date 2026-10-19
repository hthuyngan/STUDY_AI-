export interface SubjectSummary {
  id: string
  name: string
  grade: string
  icon: string
  color: string
  bgColor: string
  completedLessons: number
  totalLessons: number
  progress: number
  description: string
  currentChapter?: string
}

export interface SubjectLessonItem {
  id: string
  courseId: string
  title: string
  durationMinutes: number
  status: 'completed' | 'in-progress' | 'available' | 'locked'
  progress?: number
  quizId?: string
}

export interface SubjectChapter {
  id: string
  title: string
  description?: string
  lessons: SubjectLessonItem[]
}

export interface SubjectDetail extends SubjectSummary {
  teacherName: string
  chapters: SubjectChapter[]
}

export type LessonStatus = 'completed' | 'in-progress' | 'available' | 'locked'

export interface SubjectSummary {
  id: string
  name: string
  grade: string
  curriculumLabel?: string // e.g. "Giáo trình SGK"
  icon: string
  color: string
  bgColor: string
  completedLessons: number
  totalLessons: number
  progress: number
  description: string
  currentChapter?: string
  teacherName?: string
}

export interface SubjectLessonItem {
  id: string
  subjectId: string
  courseId?: string // backward compatibility
  chapterId?: string
  chapterTitle?: string
  title: string
  durationMinutes: number
  status: LessonStatus
  progress?: number
  quizId?: string
}

export interface SubjectChapter {
  id: string
  chapterNumber?: number
  title: string
  description?: string
  lessons: SubjectLessonItem[]
}

export interface SubjectDetail extends SubjectSummary {
  chapters: SubjectChapter[]
}

export type LessonFilter = 'all' | 'in-progress'

import type { ContentAvailability } from './curriculum'

export type LessonStatus = 'completed' | 'in-progress' | 'available' | 'locked'

export interface SubjectSummary {
  id: string
  name: string
  grade: string
  curriculumLabel?: string // e.g. "Giáo trình SGK"
  curriculumVersion?: string // e.g. "GDPT 2018"
  icon: string
  color: string
  bgColor: string
  completedLessons: number
  totalLessons: number
  progress: number
  description: string
  currentChapter?: string
  teacherName?: string
  availability?: ContentAvailability // 'available' | 'preview' | 'coming_soon' | 'unavailable'
  plannedTopics?: string[]
}

export interface SubjectTopic {
  id: string
  chapterId?: string
  title: string
  order?: number
  lessons?: SubjectLessonItem[]
}

export interface SubjectLessonItem {
  id: string
  subjectId: string
  courseId?: string // backward compatibility
  chapterId?: string
  chapterTitle?: string
  topicId?: string
  topicTitle?: string
  title: string
  durationMinutes: number
  status: LessonStatus
  progress?: number
  quizId?: string
  availability?: ContentAvailability
  contentType?: 'video' | 'article' | 'exercise' | 'test'
  hasVideo?: boolean
  skillsCount?: number
  learningObjectives?: string[]
}

export interface SubjectChapter {
  id: string
  chapterNumber?: number
  title: string
  description?: string
  availability?: ContentAvailability
  topics?: SubjectTopic[]
  lessons: SubjectLessonItem[]
}

export interface SubjectDetail extends SubjectSummary {
  chapters: SubjectChapter[]
}

export type LessonFilter = 'all' | 'in-progress'

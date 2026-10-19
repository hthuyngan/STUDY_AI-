import type { SubjectLessonItem } from './subject'

export interface CourseSummary {
  id: string
  subjectId: string
  subjectName: string
  title: string
  grade: string
  progress: number
  completedLessons: number
  totalLessons: number
  durationHours: number
  lastActive?: string
  status: 'in-progress' | 'completed' | 'not-started'
  description: string
  firstLessonId: string
}

export interface CourseChapter {
  id: string
  order: number
  title: string
  lessons: SubjectLessonItem[]
}

export interface CourseDetail extends CourseSummary {
  instructor: {
    name: string
    title: string
    avatar: string
  }
  chapters: CourseChapter[]
}

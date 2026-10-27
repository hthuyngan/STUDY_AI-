export type ContentStatus = 'draft' | 'in-review' | 'published' | 'archived'

export interface CurriculumSubjectItem {
  id: string
  name: string
  grade: string
  chapterCount: number
  lessonCount: number
  assessmentCount: number
  publishedPercent: number
  updatedAt: string
}

export interface ContentLessonItem {
  id: string
  title: string
  subjectId: string
  subjectName: string
  chapterId: string
  chapterName: string
  status: ContentStatus
  authorName: string
  updatedAt: string
  hasAssessment: boolean
}

export interface LessonEditorData {
  id: string
  title: string
  subjectId: string
  chapterId: string
  status: ContentStatus
  introduction: string
  definitions: string
  formulas: string
  examples: string
  notes: string
  summary: string
  assessmentId?: string
  lastSavedAt?: string
}

export interface ContentAssessmentSummary {
  id: string
  lessonId: string
  lessonTitle: string
  questionCount: number
  passingScore: number
  status: ContentStatus
  updatedAt: string
}

export interface ContentReviewQueueItem {
  id: string
  title: string
  type: 'lesson' | 'assessment'
  subject: string
  author: string
  submittedAt: string
  status: 'pending' | 'changes-requested' | 'approved'
  reviewer?: string
  commentsCount: number
}

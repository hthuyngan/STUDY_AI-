/**
 * Study Notes and Section Bookmarks Type Definitions
 */

export interface StudyNote {
  id: string
  lessonId: string
  subjectId: string
  lessonTitle: string
  subjectName: string
  sectionId?: string
  sectionTitle?: string
  content: string
  createdAt: string // ISO 8601
  updatedAt: string // ISO 8601
}

export interface SectionBookmark {
  id: string
  lessonId: string
  subjectId: string
  lessonTitle: string
  subjectName: string
  sectionId: string
  sectionTitle: string
  bookmarkedAt: string // ISO 8601
}

export interface CreateNoteInput {
  lessonId: string
  subjectId: string
  lessonTitle: string
  subjectName: string
  sectionId?: string
  sectionTitle?: string
  content: string
}

export interface ToggleBookmarkInput {
  lessonId: string
  subjectId: string
  lessonTitle: string
  subjectName: string
  sectionId: string
  sectionTitle: string
}

export interface ContinueLearningTarget {
  lessonId: string
  subjectId: string
  lessonTitle: string
  subjectName: string
  chapterTitle?: string
  sectionId?: string
  sectionTitle?: string
  progress: number
  lastActivityAt: string
}


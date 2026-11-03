/**
 * Smart Review & Spaced Repetition Types
 */

export type ReviewRating =
  | 'unremembered' // Chưa nhớ (reset về 1 ngày)
  | 'partially-remembered' // Nhớ một phần (tăng nhẹ)
  | 'well-remembered' // Nhớ tốt (tăng theo chu kỳ chuẩn: 1 -> 3 -> 7 -> 14 -> 30)

export type ReviewItemStatus = 'due' | 'overdue' | 'upcoming' | 'completed'

export interface ReviewHistoryEntry {
  reviewedAt: string // ISO 8601
  rating: ReviewRating
  previousIntervalDays: number
  nextIntervalDays: number
}

export interface SmartReviewItem {
  id: string
  gapId: string
  knowledgePointId: string
  subjectId: string
  subjectName: string
  lessonId: string
  lessonTitle: string
  sectionId?: string
  sectionTitle?: string
  title: string
  prompt?: string
  explanation?: string
  dueDate: string // YYYY-MM-DD
  lastReviewedAt?: string // ISO 8601
  reviewCount: number
  intervalDays: number // e.g. 1, 3, 7, 14, 30
  status: ReviewItemStatus
  history: ReviewHistoryEntry[]
  createdAt: string // ISO 8601
  updatedAt: string // ISO 8601
}

export interface ReviewSessionItem {
  reviewItemId: string
  gapId: string
  knowledgePointId: string
  subjectId: string
  subjectName: string
  lessonId: string
  lessonTitle: string
  sectionId?: string
  sectionTitle?: string
  title: string
  prompt: string
  explanation: string
  userRating?: ReviewRating
  isRevealed?: boolean
}

export interface SmartReviewSession {
  id: string
  status: 'active' | 'completed'
  currentIndex: number
  items: ReviewSessionItem[]
  startedAt: string // ISO 8601
  completedAt?: string // ISO 8601
}

export interface SmartReviewSummary {
  dueTodayCount: number
  overdueCount: number
  upcomingCount: number
  totalItems: number
}


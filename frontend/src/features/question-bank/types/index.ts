export interface ContentQuestionItem {
  id: string
  code?: string
  lessonId?: string
  lessonTitle?: string
  chapterId?: string
  chapterTitle?: string
  subjectId?: string
  subjectName?: string
  grade?: string | number
  prompt: string
  options: string[]
  correctAnswer: string
  explanation?: string
  topic?: string
  difficulty: string
  type?: string
  questionType?: string
  status: string
  orderIndex?: number
  imageUrl?: string
  metadataJson?: string
  isDeleted?: boolean
  deletedAt?: string
  deletedBy?: string
  authorId?: string
  authorName?: string
  reviewedBy?: string
  rejectionReason?: string
  sourceType?: string
  sourceBatchId?: string
  sourceUrl?: string
  copyrightStatus?: string
  copyrightProofRef?: string
  version?: number
  createdAt?: string
  updatedAt?: string
}

export interface QuestionOption {
  key: string
  text: string
  isCorrect?: boolean
}

// Aliases for compatibility
export type QuestionBankItem = ContentQuestionItem

export interface QuestionListResponse {
  items: ContentQuestionItem[]
  total: number
  page: number
  pageSize: number
}

export interface QuestionStatsResponse {
  totalQuestions: number
  draftCount: number
  inReviewCount: number
  approvedCount: number
  publishedCount: number
  rejectedCount: number
  deletedCount: number
  byDifficulty: Record<string, number>
  byType: Record<string, number>
  bySubject: Record<string, number>
  bySource: Record<string, number>
}

export type QuestionStatistics = QuestionStatsResponse

export interface QuestionFilterParams {
  search?: string
  subjectId?: string
  chapterId?: string
  lessonId?: string
  grade?: string | number
  difficulty?: string
  type?: string
  questionType?: string
  status?: string
  sourceType?: string
  includeDeleted?: boolean
  page?: number
  pageSize?: number
}

export type QuestionBankFilters = QuestionFilterParams

export interface CreateQuestionPayload {
  code?: string
  lessonId?: string
  subjectId?: string
  chapterId?: string
  grade?: string | number
  prompt: string
  options?: string[] | QuestionOption[]
  correctAnswer: string
  explanation?: string
  topic?: string
  difficulty?: string
  type?: string
  questionType?: string
  status?: string
  orderIndex?: number
  imageUrl?: string
  metadataJson?: string
  sourceType?: string
  copyrightStatus?: string
  copyrightProofRef?: string
}

export type QuestionCreatePayload = CreateQuestionPayload

export interface UpdateQuestionPayload extends Partial<CreateQuestionPayload> {}

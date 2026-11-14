import { apiClient } from '@/lib/apiClient'

export interface ContentQuestionItem {
  id: string
  code?: string
  lessonId?: string
  lessonTitle: string
  chapterId?: string
  chapterTitle: string
  subjectId?: string
  subjectName: string
  grade?: string
  prompt: string
  options: string[]
  correctAnswer: string
  explanation?: string
  topic?: string
  difficulty: string
  type: string
  status: string
  orderIndex: number
  imageUrl?: string
  metadataJson?: string
  isDeleted: boolean
  deletedAt?: string
  deletedBy?: string
  authorId?: string
  authorName: string
  reviewedBy?: string
  rejectionReason?: string
  sourceType: string
  sourceBatchId?: string
  sourceUrl?: string
  copyrightStatus: string
  copyrightProofRef?: string
  version: number
  createdAt: string
  updatedAt: string
}

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

export interface CreateQuestionPayload {
  code?: string
  lessonId?: string
  subjectId?: string
  chapterId?: string
  grade?: string
  prompt: string
  options?: string[]
  correctAnswer: string
  explanation?: string
  topic?: string
  difficulty?: string
  type?: string
  status?: string
  orderIndex?: number
  imageUrl?: string
  metadataJson?: string
  sourceType?: string
  copyrightStatus?: string
  copyrightProofRef?: string
}

export interface UpdateQuestionPayload extends Partial<CreateQuestionPayload> {}

export interface QuestionImportBatchPayload {
  sourceType: string
  sourceUrl?: string
  sourceVersion?: string
  licenseProofRef?: string
  dryRun: boolean
  items: Array<{
    code?: string
    prompt: string
    options?: string[]
    correctAnswer?: string
    explanation?: string
    topic?: string
    difficulty?: string
    type?: string
    grade?: string
    subjectId?: string
    chapterId?: string
    lessonId?: string
    imageUrl?: string
    metadataJson?: string
  }>
}

export interface QuestionImportResult {
  batchId: string
  sourceType: string
  dryRun: boolean
  totalItems: number
  validItems: number
  duplicateItems: number
  errorItems: number
  errors: string[]
  previewItems: ContentQuestionItem[]
  importedIds: string[]
}

export const contentQuestionBankService = {
  async getQuestions(params: {
    lessonId?: string
    subjectId?: string
    chapterId?: string
    grade?: string
    difficulty?: string
    type?: string
    status?: string
    sourceType?: string
    search?: string
    includeDeleted?: boolean
    page?: number
    pageSize?: number
  }): Promise<QuestionListResponse> {
    const query = new URLSearchParams()
    if (params.lessonId && params.lessonId !== 'all') query.set('lessonId', params.lessonId)
    if (params.subjectId && params.subjectId !== 'all') query.set('subjectId', params.subjectId)
    if (params.chapterId && params.chapterId !== 'all') query.set('chapterId', params.chapterId)
    if (params.grade && params.grade !== 'all') query.set('grade', params.grade)
    if (params.difficulty && params.difficulty !== 'all') query.set('difficulty', params.difficulty)
    if (params.type && params.type !== 'all') query.set('type', params.type)
    if (params.status && params.status !== 'all') query.set('status', params.status)
    if (params.sourceType && params.sourceType !== 'all') query.set('sourceType', params.sourceType)
    if (params.search) query.set('search', params.search)
    if (params.includeDeleted) query.set('includeDeleted', 'true')
    query.set('page', String(params.page || 1))
    query.set('pageSize', String(params.pageSize || 20))

    return apiClient.get<QuestionListResponse>(`/api/v1/content/questions?${query.toString()}`)
  },

  async getStatistics(): Promise<QuestionStatsResponse> {
    return apiClient.get<QuestionStatsResponse>('/api/v1/content/questions/statistics')
  },

  async getQuestionById(id: string): Promise<ContentQuestionItem> {
    return apiClient.get<ContentQuestionItem>(`/api/v1/content/questions/${id}`)
  },

  async createQuestion(payload: CreateQuestionPayload): Promise<ContentQuestionItem> {
    return apiClient.post<ContentQuestionItem>('/api/v1/content/questions', payload)
  },

  async updateQuestion(id: string, payload: UpdateQuestionPayload): Promise<ContentQuestionItem> {
    return apiClient.put<ContentQuestionItem>(`/api/v1/content/questions/${id}`, payload)
  },

  async deleteQuestion(id: string): Promise<{ success: boolean; message: string }> {
    return apiClient.delete<{ success: boolean; message: string }>(`/api/v1/content/questions/${id}`)
  },

  async restoreQuestion(id: string): Promise<ContentQuestionItem> {
    return apiClient.post<ContentQuestionItem>(`/api/v1/content/questions/${id}/restore`)
  },

  async submitReview(id: string): Promise<ContentQuestionItem> {
    return apiClient.post<ContentQuestionItem>(`/api/v1/content/questions/${id}/submit-review`)
  },

  async approveQuestion(id: string): Promise<ContentQuestionItem> {
    return apiClient.post<ContentQuestionItem>(`/api/v1/content/questions/${id}/approve`)
  },

  async rejectQuestion(id: string, reason: string): Promise<ContentQuestionItem> {
    return apiClient.post<ContentQuestionItem>(`/api/v1/content/questions/${id}/reject`, { reason })
  },

  async publishQuestion(id: string): Promise<ContentQuestionItem> {
    return apiClient.post<ContentQuestionItem>(`/api/v1/content/questions/${id}/publish`)
  },

  async unpublishQuestion(id: string): Promise<ContentQuestionItem> {
    return apiClient.post<ContentQuestionItem>(`/api/v1/content/questions/${id}/unpublish`)
  },

  async importBatch(payload: QuestionImportBatchPayload): Promise<QuestionImportResult> {
    return apiClient.post<QuestionImportResult>('/api/v1/content/questions/import', payload)
  },
}


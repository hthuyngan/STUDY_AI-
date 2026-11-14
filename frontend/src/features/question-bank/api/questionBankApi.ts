import { apiClient } from '@/lib/apiClient'
import type {
  ContentQuestionItem,
  QuestionListResponse,
  QuestionStatsResponse,
  QuestionFilterParams,
  CreateQuestionPayload,
  UpdateQuestionPayload,
} from '../types'

export const questionBankApi = {
  async getQuestions(params: QuestionFilterParams = {}): Promise<QuestionListResponse> {
    const query = new URLSearchParams()
    if (params.lessonId && params.lessonId !== 'all') query.set('lessonId', params.lessonId)
    if (params.subjectId && params.subjectId !== 'all') query.set('subjectId', params.subjectId)
    if (params.chapterId && params.chapterId !== 'all') query.set('chapterId', params.chapterId)
    if (params.grade && String(params.grade) !== 'all') query.set('grade', String(params.grade))
    if (params.difficulty && params.difficulty !== 'all') query.set('difficulty', params.difficulty)
    if (params.type && params.type !== 'all') query.set('type', params.type)
    if (params.status && params.status !== 'all') query.set('status', params.status)
    if (params.sourceType && params.sourceType !== 'all') query.set('sourceType', params.sourceType)
    if (params.search?.trim()) query.set('search', params.search.trim())
    if (params.includeDeleted) query.set('includeDeleted', 'true')
    query.set('page', String(params.page || 1))
    query.set('pageSize', String(params.pageSize || 15))

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
    // Exclude status from direct update payload so moderation workflow endpoints (/approve, /publish) are respected
    const { status: _status, ...safePayload } = payload
    return apiClient.put<ContentQuestionItem>(`/api/v1/content/questions/${id}`, safePayload)
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
}

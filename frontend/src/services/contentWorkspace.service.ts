import { apiClient } from '@/lib/apiClient'

export interface ContentChapterQuestionStat {
  chapterCode: string
  chapterTitle: string
  questionCount: number
  lessonCount: number
}

export interface ContentRecentEdit {
  id: string
  entityType: string
  title: string
  action: string
  actor: string
  timestamp: string
}

export interface ContentWorkspaceDashboard {
  totalLessons: number
  totalQuestions: number
  totalExams: number
  totalMaterials: number
  publishedCount: number
  draftCount: number
  pendingReviewCount: number
  openErrorReportsCount: number
  aiSourcesIndexedCount: number
  aiSourcesFailedCount: number
  questionsByChapter: ContentChapterQuestionStat[]
  recentEdits: ContentRecentEdit[]
}

export interface ContentMaterialItem {
  id: string
  title: string
  category: string
  chapterCode?: string | null
  chapterTitle?: string | null
  fileName: string
  mimeType: string
  fileSizeBytes: number
  storagePathOrUrl: string
  status: string
  createdAt: string
  updatedAt: string
}

export interface AiKnowledgeSourceItem {
  id: string
  title: string
  sourceType: string
  sourceRefId: string
  chapterCode?: string | null
  status: string
  chunkCount: number
  lastIndexedAt?: string | null
  lastError?: string | null
  updatedAt: string
}

export interface RetrievedKnowledgeChunk {
  chunkId: string
  sourceId: string
  sourceTitle: string
  contentText: string
  score: number
}

export interface ContentErrorReportItem {
  id: string
  reportCode: string
  targetType: string
  targetId?: string | null
  title: string
  description: string
  severity: string
  classification: string
  status: string
  reportedByUserId: string
  resolutionNote?: string | null
  createdAt: string
  updatedAt: string
}

export const contentWorkspaceService = {
  getDashboard(): Promise<ContentWorkspaceDashboard> {
    return apiClient.get<ContentWorkspaceDashboard>('/api/v1/content/workspace/dashboard')
  },

  getMaterials(params?: { category?: string; status?: string; search?: string }): Promise<ContentMaterialItem[]> {
    const q = new URLSearchParams()
    if (params?.category && params.category !== 'all') q.set('category', params.category)
    if (params?.status && params.status !== 'all') q.set('status', params.status)
    if (params?.search?.trim()) q.set('search', params.search.trim())
    const suffix = q.toString() ? `?${q.toString()}` : ''
    return apiClient.get<ContentMaterialItem[]>(`/api/v1/content/workspace/materials${suffix}`)
  },

  createMaterial(payload: {
    title: string
    category: string
    chapterCode?: string
    chapterTitle?: string
    fileName: string
    mimeType: string
    fileSizeBytes: number
    base64Header?: string
    storagePathOrUrl: string
  }): Promise<ContentMaterialItem> {
    return apiClient.post<ContentMaterialItem>('/api/v1/content/workspace/materials', payload)
  },

  updateMaterialStatus(id: string, status: string): Promise<ContentMaterialItem> {
    return apiClient.patch<ContentMaterialItem>(`/api/v1/content/workspace/materials/${id}/status`, { status })
  },

  getKnowledgeSources(): Promise<AiKnowledgeSourceItem[]> {
    return apiClient.get<AiKnowledgeSourceItem[]>('/api/v1/content/workspace/knowledge-sources')
  },

  registerKnowledgeSource(payload: {
    sourceType: 'lesson' | 'material'
    sourceRefId: string
    title?: string
    chapterCode?: string
  }): Promise<AiKnowledgeSourceItem> {
    return apiClient.post<AiKnowledgeSourceItem>('/api/v1/content/workspace/knowledge-sources', payload)
  },

  syncKnowledgeSource(id: string): Promise<AiKnowledgeSourceItem> {
    return apiClient.post<AiKnowledgeSourceItem>(`/api/v1/content/workspace/knowledge-sources/${id}/sync`, {})
  },

  revokeKnowledgeSource(id: string): Promise<AiKnowledgeSourceItem> {
    return apiClient.delete<AiKnowledgeSourceItem>(`/api/v1/content/workspace/knowledge-sources/${id}`)
  },

  testRetrieveKnowledge(query: string, topK = 5): Promise<RetrievedKnowledgeChunk[]> {
    return apiClient.post<RetrievedKnowledgeChunk[]>('/api/v1/content/workspace/knowledge-sources/retrieve-test', {
      query,
      topK,
    })
  },

  getErrorReports(params?: { status?: string; classification?: string }): Promise<ContentErrorReportItem[]> {
    const q = new URLSearchParams()
    if (params?.status && params.status !== 'all') q.set('status', params.status)
    if (params?.classification && params.classification !== 'all') q.set('classification', params.classification)
    const suffix = q.toString() ? `?${q.toString()}` : ''
    return apiClient.get<ContentErrorReportItem[]>(`/api/v1/content/workspace/error-reports${suffix}`)
  },

  createErrorReport(payload: {
    targetType: string
    targetId?: string
    title: string
    description: string
    severity: string
  }): Promise<ContentErrorReportItem> {
    return apiClient.post<ContentErrorReportItem>('/api/v1/content/workspace/error-reports', payload)
  },

  updateErrorReport(
    id: string,
    payload: { status?: string; classification?: string; resolutionNote?: string }
  ): Promise<ContentErrorReportItem> {
    return apiClient.patch<ContentErrorReportItem>(`/api/v1/content/workspace/error-reports/${id}`, payload)
  },
}

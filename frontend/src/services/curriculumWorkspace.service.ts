import { apiClient } from '@/lib/apiClient'

export type LifecycleStatus =
  | 'draft'
  | 'in-review'
  | 'changes-requested'
  | 'approved'
  | 'published'
  | 'archived'

export interface WorkspaceChapter {
  id: string
  subjectId?: string
  subjectName: string
  curriculumEditionId?: string
  curriculumEditionName?: string
  code?: string
  title: string
  description: string
  orderIndex: number
  status: LifecycleStatus
  lessonCount: number
  rowVersion: string
  updatedAt: string
}

export interface WorkspaceLesson {
  id: string
  chapterId: string
  chapterTitle: string
  curriculumEditionId?: string
  code?: string
  title: string
  slug: string
  orderIndex: number
  status: LifecycleStatus
  authorName: string
  videos: Array<{ id: string; title: string; sourceUrl: string }>
  rowVersion: string
  updatedAt: string
}

export interface Paged<T> {
  items: T[]
  page: number
  pageSize: number
  total: number
}

function query(values: Record<string, string | number | undefined>) {
  const params = new URLSearchParams()
  Object.entries(values).forEach(([key, value]) => {
    if (value !== undefined && value !== '') params.set(key, String(value))
  })
  return params.toString()
}

export const curriculumWorkspaceService = {
  listChapters: (params: Record<string, string | number | undefined>) =>
    apiClient.get<Paged<WorkspaceChapter>>(`/api/v1/content/chapters?${query(params)}`),
  createChapter: (payload: {
    curriculumEditionId: string
    code: string
    title: string
    description?: string
    orderIndex: number
  }) => apiClient.post<WorkspaceChapter>('/api/v1/content/chapters', payload),
  updateChapter: (id: string, payload: Partial<WorkspaceChapter>) =>
    apiClient.patch<WorkspaceChapter>(`/api/v1/content/chapters/${id}`, payload),
  chapterAction: (id: string, action: string, rowVersion: string, reason?: string) =>
    apiClient.post<WorkspaceChapter>(`/api/v1/content/chapters/${id}/${action}`, {
      rowVersion,
      reason,
    }),
  reorderChapters: (payload: {
    curriculumEditionId: string
    chapterIds: string[]
    rowVersions: Record<string, string>
  }) => apiClient.post<{ success: boolean }>('/api/v1/content/chapters/reorder', payload),
  listLessons: (params: Record<string, string | number | undefined>) =>
    apiClient.get<Paged<WorkspaceLesson>>(`/api/v1/content/lessons?${query(params)}`),
  createLesson: (payload: {
    chapterId: string
    code: string
    title: string
    slug: string
    orderIndex: number
  }) => apiClient.post<WorkspaceLesson>('/api/v1/content/lessons', payload),
  updateLesson: (id: string, payload: Partial<WorkspaceLesson>) =>
    apiClient.patch<WorkspaceLesson>(`/api/v1/content/lessons/${id}`, payload),
  lessonAction: (id: string, action: string, rowVersion: string, reason?: string) =>
    apiClient.post<WorkspaceLesson>(`/api/v1/content/lessons/${id}/${action}`, {
      rowVersion,
      reason,
    }),
  reorderLessons: (payload: {
    chapterId: string
    lessonIds: string[]
    rowVersions: Record<string, string>
  }) => apiClient.post<{ success: boolean }>('/api/v1/content/lessons/reorder', payload),
}

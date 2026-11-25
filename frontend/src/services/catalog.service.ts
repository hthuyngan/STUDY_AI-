import { apiClient } from '@/lib/apiClient'
import type {
  CatalogListParams,
  CatalogPagedResponse,
  CatalogSubjectItem,
  CurriculumEditionItem,
  CurriculumItem,
  GradeLevelItem,
  TextbookSeriesItem,
} from '@/types/catalog'

function buildQuery(params: CatalogListParams): string {
  const sp = new URLSearchParams()
  if (params.search?.trim()) sp.set('search', params.search.trim())
  if (params.status && params.status !== 'all') sp.set('status', params.status)
  if (params.sort) sp.set('sort', params.sort)
  if (params.direction) sp.set('direction', params.direction)
  if (params.page && params.page > 0) sp.set('page', String(params.page))
  if (params.pageSize && params.pageSize > 0) sp.set('pageSize', String(params.pageSize))
  if (params.gradeLevelId) sp.set('gradeLevelId', params.gradeLevelId)
  if (params.subjectId) sp.set('subjectId', params.subjectId)
  if (params.curriculumId) sp.set('curriculumId', params.curriculumId)
  if (params.textbookSeriesId) sp.set('textbookSeriesId', params.textbookSeriesId)
  if (params.publicationYear) sp.set('publicationYear', String(params.publicationYear))
  const qs = sp.toString()
  return qs ? `?${qs}` : ''
}

const BASE = '/api/v1/content/catalog'

export const catalogService = {
  // GradeLevels
  listGrades: (params: CatalogListParams = {}) =>
    apiClient.get<CatalogPagedResponse<GradeLevelItem>>(`${BASE}/grades${buildQuery(params)}`),
  createGrade: (payload: { code: string; name: string; orderIndex: number }) =>
    apiClient.post<GradeLevelItem>(`${BASE}/grades`, payload),
  updateGrade: (id: string, payload: { code?: string; name?: string; orderIndex?: number; rowVersion: string }) =>
    apiClient.put<GradeLevelItem>(`${BASE}/grades/${id}`, payload),
  archiveGrade: (id: string, rowVersion: string, reason?: string) =>
    apiClient.post<GradeLevelItem>(`${BASE}/grades/${id}/archive`, { rowVersion, reason }),
  reactivateGrade: (id: string, rowVersion: string, reason?: string) =>
    apiClient.post<GradeLevelItem>(`${BASE}/grades/${id}/reactivate`, { rowVersion, reason }),

  // CatalogSubjects
  listSubjects: (params: CatalogListParams = {}) =>
    apiClient.get<CatalogPagedResponse<CatalogSubjectItem>>(`${BASE}/subjects${buildQuery(params)}`),
  createSubject: (payload: { code: string; name: string; description?: string }) =>
    apiClient.post<CatalogSubjectItem>(`${BASE}/subjects`, payload),
  updateSubject: (id: string, payload: { code?: string; name?: string; description?: string; rowVersion: string }) =>
    apiClient.put<CatalogSubjectItem>(`${BASE}/subjects/${id}`, payload),
  archiveSubject: (id: string, rowVersion: string, reason?: string) =>
    apiClient.post<CatalogSubjectItem>(`${BASE}/subjects/${id}/archive`, { rowVersion, reason }),
  reactivateSubject: (id: string, rowVersion: string, reason?: string) =>
    apiClient.post<CatalogSubjectItem>(`${BASE}/subjects/${id}/reactivate`, { rowVersion, reason }),

  // Curricula
  listCurricula: (params: CatalogListParams = {}) =>
    apiClient.get<CatalogPagedResponse<CurriculumItem>>(`${BASE}/curricula${buildQuery(params)}`),
  createCurriculum: (payload: {
    code: string
    gradeLevelId: string
    subjectId: string
    name: string
    framework: string
    academicYearFrom?: number | null
    academicYearTo?: number | null
    sourceName?: string
    sourceUrl?: string
    sourceLicense?: string
  }) => apiClient.post<CurriculumItem>(`${BASE}/curricula`, payload),
  updateCurriculum: (
    id: string,
    payload: {
      code?: string
      gradeLevelId?: string
      subjectId?: string
      name?: string
      framework?: string
      academicYearFrom?: number | null
      academicYearTo?: number | null
      clearAcademicYearFrom?: boolean
      clearAcademicYearTo?: boolean
      sourceName?: string
      sourceUrl?: string
      sourceLicense?: string
      rowVersion: string
    }
  ) => apiClient.put<CurriculumItem>(`${BASE}/curricula/${id}`, payload),
  archiveCurriculum: (id: string, rowVersion: string, reason?: string) =>
    apiClient.post<CurriculumItem>(`${BASE}/curricula/${id}/archive`, { rowVersion, reason }),
  reactivateCurriculum: (id: string, rowVersion: string, reason?: string) =>
    apiClient.post<CurriculumItem>(`${BASE}/curricula/${id}/reactivate`, { rowVersion, reason }),

  // TextbookSeries
  listSeries: (params: CatalogListParams = {}) =>
    apiClient.get<CatalogPagedResponse<TextbookSeriesItem>>(`${BASE}/textbook-series${buildQuery(params)}`),
  createSeries: (payload: {
    code: string
    name: string
    publisher: string
    description?: string
    sourceName?: string
    sourceUrl?: string
    sourceLicense?: string
  }) => apiClient.post<TextbookSeriesItem>(`${BASE}/textbook-series`, payload),
  updateSeries: (
    id: string,
    payload: {
      code?: string
      name?: string
      publisher?: string
      description?: string
      sourceName?: string
      sourceUrl?: string
      sourceLicense?: string
      rowVersion: string
    }
  ) => apiClient.put<TextbookSeriesItem>(`${BASE}/textbook-series/${id}`, payload),
  archiveSeries: (id: string, rowVersion: string, reason?: string) =>
    apiClient.post<TextbookSeriesItem>(`${BASE}/textbook-series/${id}/archive`, { rowVersion, reason }),
  reactivateSeries: (id: string, rowVersion: string, reason?: string) =>
    apiClient.post<TextbookSeriesItem>(`${BASE}/textbook-series/${id}/reactivate`, { rowVersion, reason }),

  // CurriculumEditions
  listEditions: (params: CatalogListParams = {}) =>
    apiClient.get<CatalogPagedResponse<CurriculumEditionItem>>(`${BASE}/editions${buildQuery(params)}`),
  createEdition: (payload: {
    code: string
    curriculumId: string
    textbookSeriesId?: string | null
    editionName: string
    volume?: string
    version?: string
    publicationYear?: number | null
    sourceName?: string
    sourceUrl?: string
    sourceLicense?: string
  }) => apiClient.post<CurriculumEditionItem>(`${BASE}/editions`, payload),
  updateEdition: (
    id: string,
    payload: {
      code?: string
      curriculumId?: string
      textbookSeriesId?: string | null
      editionName?: string
      volume?: string
      version?: string
      publicationYear?: number | null
      clearPublicationYear?: boolean
      sourceName?: string
      sourceUrl?: string
      sourceLicense?: string
      rowVersion: string
    }
  ) => apiClient.put<CurriculumEditionItem>(`${BASE}/editions/${id}`, payload),
  archiveEdition: (id: string, rowVersion: string, reason?: string) =>
    apiClient.post<CurriculumEditionItem>(`${BASE}/editions/${id}/archive`, { rowVersion, reason }),
  reactivateEdition: (id: string, rowVersion: string, reason?: string) =>
    apiClient.post<CurriculumEditionItem>(`${BASE}/editions/${id}/reactivate`, { rowVersion, reason }),
}

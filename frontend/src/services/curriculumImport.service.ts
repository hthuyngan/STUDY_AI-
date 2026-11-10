import { apiClient } from '@/lib/apiClient'

export interface ImportPreviewSummary {
  totalItems: number
  insertCount: number
  updateCount: number
  skipCount: number
  conflictCount: number
  errorCount: number
  warningCount: number
  isValid: boolean
}

export interface ImportValidationError {
  row: number
  field: string
  errorCode: string
  message: string
  rejectedValue?: string | null
  severity: 'Error' | 'Warning' | string
}

export interface ImportItemPreview {
  entityType: 'subject' | 'chapter' | 'lesson' | 'question' | string
  identifier: string
  title: string
  action: 'Insert' | 'Update' | 'Skip' | 'Conflict' | string
  reason?: string | null
}

export interface CurriculumImportPreviewResponse {
  previewToken: string
  fileHashSha256: string
  fileName: string
  fileFormat: string
  summary: ImportPreviewSummary
  errors: ImportValidationError[]
  warnings: ImportValidationError[]
  previewItems: ImportItemPreview[]
  expiresAt: string
}

export interface CurriculumImportConfirmRequest {
  previewToken: string
  auditNote?: string
}

export interface CurriculumImportConfirmSummary {
  totalProcessed: number
  inserted: number
  updated: number
  skipped: number
  failed: number
}

export interface CurriculumImportEntityCounts {
  subjects: number
  chapters: number
  lessons: number
  questions: number
}

export interface CurriculumImportConfirmResponse {
  success: boolean
  previewToken: string
  actorId: string
  confirmedAt: string
  auditLogId: string
  summary: CurriculumImportConfirmSummary
  entityCounts: CurriculumImportEntityCounts
  message: string
}

export const curriculumImportService = {
  async previewImport(file: File): Promise<CurriculumImportPreviewResponse> {
    const formData = new FormData()
    formData.append('file', file)
    return apiClient.postFormData<CurriculumImportPreviewResponse>(
      '/api/v1/content/import/preview',
      formData
    )
  },

  async confirmImport(previewToken: string, auditNote?: string): Promise<CurriculumImportConfirmResponse> {
    const payload: CurriculumImportConfirmRequest = {
      previewToken,
      auditNote: auditNote?.trim() || undefined,
    }
    return apiClient.post<CurriculumImportConfirmResponse>(
      '/api/v1/content/import/confirm',
      payload
    )
  },
}

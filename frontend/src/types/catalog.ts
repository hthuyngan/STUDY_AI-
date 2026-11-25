export type CatalogTabKey = 'grades' | 'subjects' | 'curricula' | 'series' | 'editions'

export type CatalogEntityStatus =
  | 'draft'
  | 'in-review'
  | 'approved'
  | 'published'
  | 'archived'
  | 'changes-requested'

export interface CatalogPagedResponse<T> {
  items: T[]
  total: number
  page: number
  pageSize: number
}

export interface CatalogListParams {
  search?: string
  status?: string
  sort?: string
  direction?: 'asc' | 'desc'
  page?: number
  pageSize?: number
  gradeLevelId?: string
  subjectId?: string
  curriculumId?: string
  textbookSeriesId?: string
  publicationYear?: number
}

export interface GradeLevelItem extends Record<string, unknown> {
  id: string
  code: string
  name: string
  orderIndex: number
  status: CatalogEntityStatus
  rowVersion: string
  createdAt: string
  updatedAt: string
}

export interface CatalogSubjectItem extends Record<string, unknown> {
  id: string
  code: string
  name: string
  description?: string | null
  status: CatalogEntityStatus
  rowVersion: string
  createdAt: string
  updatedAt: string
}

export interface CurriculumItem extends Record<string, unknown> {
  id: string
  code: string
  gradeLevelId: string
  gradeLevelName: string
  subjectId: string
  subjectName: string
  name: string
  framework: string
  academicYearFrom?: number | null
  academicYearTo?: number | null
  status: CatalogEntityStatus
  sourceName?: string | null
  sourceUrl?: string | null
  sourceLicense?: string | null
  rowVersion: string
  createdAt: string
  updatedAt: string
}

export interface TextbookSeriesItem extends Record<string, unknown> {
  id: string
  code: string
  name: string
  publisher: string
  description?: string | null
  status: CatalogEntityStatus
  sourceName?: string | null
  sourceUrl?: string | null
  sourceLicense?: string | null
  rowVersion: string
  createdAt: string
  updatedAt: string
}

export interface CurriculumEditionItem extends Record<string, unknown> {
  id: string
  code: string
  curriculumId: string
  curriculumName: string
  textbookSeriesId?: string | null
  textbookSeriesName?: string | null
  editionName: string
  volume?: string | null
  version?: string | null
  publicationYear?: number | null
  status: CatalogEntityStatus
  sourceName?: string | null
  sourceUrl?: string | null
  sourceLicense?: string | null
  rowVersion: string
  createdAt: string
  updatedAt: string
}

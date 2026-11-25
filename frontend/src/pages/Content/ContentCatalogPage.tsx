import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Plus } from 'lucide-react'
import {
  ManagementDialog,
  ManagementEmptyState,
  ManagementErrorState,
  ManagementFilter,
  ManagementHeader,
  ManagementPagination,
  ManagementTable,
  type ManagementColumn,
} from '@/components/management'
import { Breadcrumb } from '@/components/ui/Breadcrumb'
import { Button } from '@/components/ui/Button'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { Skeleton } from '@/components/ui/Skeleton'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { catalogService } from '@/services/catalog.service'
import type {
  CatalogPagedResponse,
  CatalogSubjectItem,
  CatalogTabKey,
  CurriculumEditionItem,
  CurriculumItem,
  GradeLevelItem,
  TextbookSeriesItem,
} from '@/types/catalog'
import './ContentCatalogPage.css'

const TABS: Array<{ key: CatalogTabKey; label: string; createLabel: string }> = [
  { key: 'grades', label: 'Khối lớp', createLabel: 'Tạo khối lớp' },
  { key: 'subjects', label: 'Môn học', createLabel: 'Tạo môn học' },
  { key: 'curricula', label: 'Chương trình', createLabel: 'Tạo chương trình' },
  { key: 'series', label: 'Bộ sách', createLabel: 'Tạo bộ sách' },
  { key: 'editions', label: 'Phiên bản', createLabel: 'Tạo phiên bản' },
]

type AnyCatalogRow =
  | GradeLevelItem
  | CatalogSubjectItem
  | CurriculumItem
  | TextbookSeriesItem
  | CurriculumEditionItem

function extractErrorInfo(err: unknown): { status?: number; message: string } {
  if (err && typeof err === 'object') {
    const e = err as { status?: number; message?: string; detail?: string }
    return {
      status: e.status,
      message: e.detail || e.message || 'Không thể kết nối máy chủ. Vui lòng thử lại.',
    }
  }
  return { message: 'Không thể kết nối máy chủ. Vui lòng thử lại.' }
}

function parseTab(raw: string | null): CatalogTabKey {
  if (raw === 'grades' || raw === 'subjects' || raw === 'curricula' || raw === 'series' || raw === 'editions') {
    return raw
  }
  return 'subjects'
}

export const ContentCatalogPage: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams()

  const activeTab = parseTab(searchParams.get('tab'))
  const search = searchParams.get('q') ?? ''
  const status = searchParams.get('status') ?? 'all'
  const gradeLevelId = searchParams.get('gradeLevelId') ?? ''
  const subjectId = searchParams.get('subjectId') ?? ''
  const curriculumId = searchParams.get('curriculumId') ?? ''
  const textbookSeriesId = searchParams.get('textbookSeriesId') ?? ''
  const sort = searchParams.get('sort') ?? ''
  const direction: 'asc' | 'desc' = searchParams.get('direction') === 'desc' ? 'desc' : 'asc'
  const page = Math.max(1, Number(searchParams.get('page') || '1') || 1)
  const pageSize = Math.min(100, Math.max(1, Number(searchParams.get('pageSize') || '20') || 20))

  const [data, setData] = useState<CatalogPagedResponse<AnyCatalogRow>>({
    items: [],
    total: 0,
    page: 1,
    pageSize: 20,
  })
  const [isLoading, setIsLoading] = useState(true)
  const [errorInfo, setErrorInfo] = useState<{ status?: number; message: string } | null>(null)
  const [feedbackMessage, setFeedbackMessage] = useState<string | null>(null)

  // Parent option lists loaded from real APIs when needed
  const [gradeOptions, setGradeOptions] = useState<GradeLevelItem[]>([])
  const [subjectOptions, setSubjectOptions] = useState<CatalogSubjectItem[]>([])
  const [curriculumOptions, setCurriculumOptions] = useState<CurriculumItem[]>([])
  const [seriesOptions, setSeriesOptions] = useState<TextbookSeriesItem[]>([])

  // Create / Edit Dialog state
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingRow, setEditingRow] = useState<AnyCatalogRow | null>(null)
  const [isSaving, setIsSaving] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)

  // Form fields
  const [fCode, setFCode] = useState('')
  const [fName, setFName] = useState('')
  const [fDescription, setFDescription] = useState('')
  const [fOrderIndex, setFOrderIndex] = useState('0')
  const [fGradeLevelId, setFGradeLevelId] = useState('')
  const [fSubjectId, setFSubjectId] = useState('')
  const [fFramework, setFFramework] = useState('GDPT 2018')
  const [fYearFrom, setFYearFrom] = useState('')
  const [fYearTo, setFYearTo] = useState('')
  const [fPublisher, setFPublisher] = useState('')
  const [fCurriculumId, setFCurriculumId] = useState('')
  const [fSeriesId, setFSeriesId] = useState('')
  const [fEditionName, setFEditionName] = useState('')
  const [fVolume, setFVolume] = useState('')
  const [fVersion, setFVersion] = useState('')
  const [fPublicationYear, setFPublicationYear] = useState('')
  const [fSourceName, setFSourceName] = useState('')
  const [fSourceUrl, setFSourceUrl] = useState('')
  const [fSourceLicense, setFSourceLicense] = useState('')

  // Archive/Reactivate confirm dialog
  const [confirmState, setConfirmState] = useState<{
    open: boolean
    mode: 'archive' | 'reactivate'
    row: AnyCatalogRow | null
  }>({ open: false, mode: 'archive', row: null })
  const [isMutatingStatus, setIsMutatingStatus] = useState(false)

  const updateParams = useCallback(
    (patch: Record<string, string | null>) => {
      const next = new URLSearchParams(searchParams)
      Object.entries(patch).forEach(([k, v]) => {
        if (v === null || v === '' || (k === 'status' && v === 'all') || (k === 'page' && v === '1')) {
          next.delete(k)
        } else {
          next.set(k, v)
        }
      })
      setSearchParams(next, { replace: true })
    },
    [searchParams, setSearchParams]
  )

  const loadParentOptions = useCallback(async () => {
    try {
      const [g, s, c, sr] = await Promise.all([
        catalogService.listGrades({ page: 1, pageSize: 100 }),
        catalogService.listSubjects({ page: 1, pageSize: 100 }),
        catalogService.listCurricula({ page: 1, pageSize: 100 }),
        catalogService.listSeries({ page: 1, pageSize: 100 }),
      ])
      setGradeOptions(g.items)
      setSubjectOptions(s.items)
      setCurriculumOptions(c.items)
      setSeriesOptions(sr.items)
    } catch {
      // Parent selectors remain empty if user lacks read access; main fetch handles error UI
    }
  }, [])

  const fetchList = useCallback(async () => {
    setIsLoading(true)
    setErrorInfo(null)
    try {
      const params = {
        search: search || undefined,
        status: status !== 'all' ? status : undefined,
        sort: sort || undefined,
        direction,
        page,
        pageSize,
        gradeLevelId: gradeLevelId || undefined,
        subjectId: subjectId || undefined,
        curriculumId: curriculumId || undefined,
        textbookSeriesId: textbookSeriesId || undefined,
      }
      let res: CatalogPagedResponse<AnyCatalogRow>
      if (activeTab === 'grades') res = await catalogService.listGrades(params)
      else if (activeTab === 'subjects') res = await catalogService.listSubjects(params)
      else if (activeTab === 'curricula') res = await catalogService.listCurricula(params)
      else if (activeTab === 'series') res = await catalogService.listSeries(params)
      else res = await catalogService.listEditions(params)

      setData(res)
    } catch (err) {
      setErrorInfo(extractErrorInfo(err))
    } finally {
      setIsLoading(false)
    }
  }, [activeTab, curriculumId, direction, gradeLevelId, page, pageSize, search, sort, status, subjectId, textbookSeriesId])

  useEffect(() => {
    void fetchList()
  }, [fetchList])

  useEffect(() => {
    if (activeTab === 'curricula' || activeTab === 'editions') {
      void loadParentOptions()
    }
  }, [activeTab, loadParentOptions])

  const openCreateModal = () => {
    setEditingRow(null)
    setFormError(null)
    setFCode('')
    setFName('')
    setFDescription('')
    setFOrderIndex('0')
    setFGradeLevelId(gradeOptions[0]?.id ?? '')
    setFSubjectId(subjectOptions[0]?.id ?? '')
    setFFramework('GDPT 2018')
    setFYearFrom('')
    setFYearTo('')
    setFPublisher('')
    setFCurriculumId(curriculumOptions[0]?.id ?? '')
    setFSeriesId('')
    setFEditionName('')
    setFVolume('')
    setFVersion('')
    setFPublicationYear('')
    setFSourceName('')
    setFSourceUrl('')
    setFSourceLicense('')
    setDialogOpen(true)
    void loadParentOptions()
  }

  const openEditModal = useCallback((row: AnyCatalogRow) => {
    setEditingRow(row)
    setFormError(null)
    setFCode(String(row.code ?? ''))
    setFName(String((row as { name?: string }).name ?? ''))
    setFDescription(String((row as { description?: string }).description ?? ''))
    setFOrderIndex(String((row as { orderIndex?: number }).orderIndex ?? 0))
    setFGradeLevelId(String((row as { gradeLevelId?: string }).gradeLevelId ?? ''))
    setFSubjectId(String((row as { subjectId?: string }).subjectId ?? ''))
    setFFramework(String((row as { framework?: string }).framework ?? 'GDPT 2018'))
    setFYearFrom((row as { academicYearFrom?: number | null }).academicYearFrom ? String((row as { academicYearFrom?: number }).academicYearFrom) : '')
    setFYearTo((row as { academicYearTo?: number | null }).academicYearTo ? String((row as { academicYearTo?: number }).academicYearTo) : '')
    setFPublisher(String((row as { publisher?: string }).publisher ?? ''))
    setFCurriculumId(String((row as { curriculumId?: string }).curriculumId ?? ''))
    setFSeriesId(String((row as { textbookSeriesId?: string }).textbookSeriesId ?? ''))
    setFEditionName(String((row as { editionName?: string }).editionName ?? ''))
    setFVolume(String((row as { volume?: string }).volume ?? ''))
    setFVersion(String((row as { version?: string }).version ?? ''))
    setFPublicationYear((row as { publicationYear?: number | null }).publicationYear ? String((row as { publicationYear?: number }).publicationYear) : '')
    setFSourceName(String((row as { sourceName?: string }).sourceName ?? ''))
    setFSourceUrl(String((row as { sourceUrl?: string }).sourceUrl ?? ''))
    setFSourceLicense(String((row as { sourceLicense?: string }).sourceLicense ?? ''))
    setDialogOpen(true)
    void loadParentOptions()
  }, [loadParentOptions])

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSaving(true)
    setFormError(null)
    setFeedbackMessage(null)

    try {
      const rv = editingRow ? String(editingRow.rowVersion ?? '') : ''
      if (activeTab === 'grades') {
        if (editingRow) {
          await catalogService.updateGrade(editingRow.id, {
            code: fCode,
            name: fName,
            orderIndex: Number(fOrderIndex) || 0,
            rowVersion: rv,
          })
        } else {
          await catalogService.createGrade({
            code: fCode,
            name: fName,
            orderIndex: Number(fOrderIndex) || 0,
          })
        }
      } else if (activeTab === 'subjects') {
        if (editingRow) {
          await catalogService.updateSubject(editingRow.id, {
            code: fCode,
            name: fName,
            description: fDescription || undefined,
            rowVersion: rv,
          })
        } else {
          await catalogService.createSubject({
            code: fCode,
            name: fName,
            description: fDescription || undefined,
          })
        }
      } else if (activeTab === 'curricula') {
        const yFrom = fYearFrom.trim() ? Number(fYearFrom) : null
        const yTo = fYearTo.trim() ? Number(fYearTo) : null
        if (editingRow) {
          await catalogService.updateCurriculum(editingRow.id, {
            code: fCode,
            gradeLevelId: fGradeLevelId,
            subjectId: fSubjectId,
            name: fName,
            framework: fFramework,
            academicYearFrom: yFrom,
            academicYearTo: yTo,
            sourceName: fSourceName || undefined,
            sourceUrl: fSourceUrl || undefined,
            sourceLicense: fSourceLicense || undefined,
            rowVersion: rv,
          })
        } else {
          await catalogService.createCurriculum({
            code: fCode,
            gradeLevelId: fGradeLevelId,
            subjectId: fSubjectId,
            name: fName,
            framework: fFramework,
            academicYearFrom: yFrom,
            academicYearTo: yTo,
            sourceName: fSourceName || undefined,
            sourceUrl: fSourceUrl || undefined,
            sourceLicense: fSourceLicense || undefined,
          })
        }
      } else if (activeTab === 'series') {
        if (editingRow) {
          await catalogService.updateSeries(editingRow.id, {
            code: fCode,
            name: fName,
            publisher: fPublisher,
            description: fDescription || undefined,
            sourceName: fSourceName || undefined,
            sourceUrl: fSourceUrl || undefined,
            sourceLicense: fSourceLicense || undefined,
            rowVersion: rv,
          })
        } else {
          await catalogService.createSeries({
            code: fCode,
            name: fName,
            publisher: fPublisher,
            description: fDescription || undefined,
            sourceName: fSourceName || undefined,
            sourceUrl: fSourceUrl || undefined,
            sourceLicense: fSourceLicense || undefined,
          })
        }
      } else {
        const pubYear = fPublicationYear.trim() ? Number(fPublicationYear) : null
        if (editingRow) {
          await catalogService.updateEdition(editingRow.id, {
            code: fCode,
            curriculumId: fCurriculumId,
            textbookSeriesId: fSeriesId || null,
            editionName: fEditionName,
            volume: fVolume || undefined,
            version: fVersion || undefined,
            publicationYear: pubYear,
            sourceName: fSourceName || undefined,
            sourceUrl: fSourceUrl || undefined,
            sourceLicense: fSourceLicense || undefined,
            rowVersion: rv,
          })
        } else {
          await catalogService.createEdition({
            code: fCode,
            curriculumId: fCurriculumId,
            textbookSeriesId: fSeriesId || null,
            editionName: fEditionName,
            volume: fVolume || undefined,
            version: fVersion || undefined,
            publicationYear: pubYear,
            sourceName: fSourceName || undefined,
            sourceUrl: fSourceUrl || undefined,
            sourceLicense: fSourceLicense || undefined,
          })
        }
      }

      setDialogOpen(false)
      setFeedbackMessage(editingRow ? 'Đã cập nhật bản ghi danh mục thành công.' : 'Đã tạo bản ghi nháp (draft) thành công.')
      await fetchList()
    } catch (err) {
      setFormError(extractErrorInfo(err).message)
    } finally {
      setIsSaving(false)
    }
  }

  const handleConfirmStatusChange = async () => {
    if (!confirmState.row) return
    setIsMutatingStatus(true)
    setFeedbackMessage(null)
    const row = confirmState.row
    const rv = String(row.rowVersion ?? '')

    try {
      if (confirmState.mode === 'archive') {
        if (activeTab === 'grades') await catalogService.archiveGrade(row.id, rv)
        else if (activeTab === 'subjects') await catalogService.archiveSubject(row.id, rv)
        else if (activeTab === 'curricula') await catalogService.archiveCurriculum(row.id, rv)
        else if (activeTab === 'series') await catalogService.archiveSeries(row.id, rv)
        else await catalogService.archiveEdition(row.id, rv)
        setFeedbackMessage('Đã lưu trữ bản ghi.')
      } else {
        if (activeTab === 'grades') await catalogService.reactivateGrade(row.id, rv)
        else if (activeTab === 'subjects') await catalogService.reactivateSubject(row.id, rv)
        else if (activeTab === 'curricula') await catalogService.reactivateCurriculum(row.id, rv)
        else if (activeTab === 'series') await catalogService.reactivateSeries(row.id, rv)
        else await catalogService.reactivateEdition(row.id, rv)
        setFeedbackMessage('Đã khôi phục bản ghi về trạng thái nháp (draft).')
      }
      setConfirmState({ open: false, mode: 'archive', row: null })
      await fetchList()
    } catch (err) {
      setConfirmState({ open: false, mode: 'archive', row: null })
      setErrorInfo(extractErrorInfo(err))
    } finally {
      setIsMutatingStatus(false)
    }
  }

  const handleSort = (columnKey: string) => {
    const nextDir = sort === columnKey && direction === 'asc' ? 'desc' : 'asc'
    updateParams({ sort: columnKey, direction: nextDir, page: '1' })
  }

  const columns: ManagementColumn<AnyCatalogRow>[] = useMemo(() => {
    const actionCol: ManagementColumn<AnyCatalogRow> = {
      key: 'actions',
      title: 'Thao tác',
      align: 'right',
      render: (_, record) => (
        <div className="catalog-row-actions">
          <button type="button" className="catalog-action-btn" onClick={() => openEditModal(record)}>
            Sửa
          </button>
          {record.status !== 'archived' ? (
            <button
              type="button"
              className="catalog-action-btn is-danger"
              onClick={() => setConfirmState({ open: true, mode: 'archive', row: record })}
            >
              Lưu trữ
            </button>
          ) : (
            <button
              type="button"
              className="catalog-action-btn"
              onClick={() => setConfirmState({ open: true, mode: 'reactivate', row: record })}
            >
              Khôi phục
            </button>
          )}
        </div>
      ),
    }

    const statusCol: ManagementColumn<AnyCatalogRow> = {
      key: 'status',
      title: 'Trạng thái',
      sortable: true,
      render: (val) => <StatusBadge status={String(val ?? 'draft')} />,
    }

    if (activeTab === 'grades') {
      return [
        { key: 'code', title: 'Mã khối', sortable: true, render: (v) => <span className="catalog-code-badge">{String(v)}</span> },
        { key: 'name', title: 'Tên khối lớp', sortable: true },
        { key: 'orderIndex', title: 'Thứ tự', sortable: true },
        statusCol,
        actionCol,
      ]
    }
    if (activeTab === 'subjects') {
      return [
        { key: 'code', title: 'Mã môn', sortable: true, render: (v) => <span className="catalog-code-badge">{String(v)}</span> },
        { key: 'name', title: 'Tên môn học', sortable: true },
        { key: 'description', title: 'Mô tả', render: (v) => String(v || '—') },
        statusCol,
        actionCol,
      ]
    }
    if (activeTab === 'curricula') {
      return [
        { key: 'code', title: 'Mã CT', sortable: true, render: (v) => <span className="catalog-code-badge">{String(v)}</span> },
        { key: 'name', title: 'Tên chương trình', sortable: true },
        { key: 'gradeLevelName', title: 'Khối lớp' },
        { key: 'subjectName', title: 'Môn học' },
        { key: 'framework', title: 'Khung', sortable: true },
        statusCol,
        actionCol,
      ]
    }
    if (activeTab === 'series') {
      return [
        { key: 'code', title: 'Mã bộ sách', sortable: true, render: (v) => <span className="catalog-code-badge">{String(v)}</span> },
        { key: 'name', title: 'Tên bộ sách', sortable: true },
        { key: 'publisher', title: 'Nhà xuất bản', sortable: true },
        statusCol,
        actionCol,
      ]
    }
    return [
      { key: 'code', title: 'Mã phiên bản', sortable: true, render: (v) => <span className="catalog-code-badge">{String(v)}</span> },
      { key: 'editionName', title: 'Tên phiên bản', sortable: true },
      { key: 'curriculumName', title: 'Chương trình' },
      { key: 'textbookSeriesName', title: 'Bộ sách', render: (v) => String(v || 'Chuẩn khung (không bộ sách)') },
      { key: 'publicationYear', title: 'Năm XB', sortable: true, render: (v) => String(v || '—') },
      statusCol,
      actionCol,
    ]
  }, [activeTab, openEditModal])

  const activeTabMeta = TABS.find((t) => t.key === activeTab) ?? TABS[1]
  const totalPages = Math.max(1, Math.ceil(data.total / pageSize))

  return (
    <div className="catalog-page">
      <Breadcrumb
        items={[
          { label: 'Nội dung', to: '/content' },
          { label: 'Danh mục chuẩn' },
        ]}
      />

      <ManagementHeader
        title="Danh mục giáo trình đa môn"
        actions={
          <Button variant="primary" onClick={openCreateModal}>
            <Plus size={16} aria-hidden="true" />
            <span>{activeTabMeta.createLabel}</span>
          </Button>
        }
      />

        {feedbackMessage && (
          <div className="catalog-feedback-banner" role="status">
            {feedbackMessage}
          </div>
        )}

        <div className="catalog-tabs" role="tablist" aria-label="Phân loại danh mục">
          {TABS.map((t) => (
            <button
              key={t.key}
              type="button"
              role="tab"
              aria-selected={activeTab === t.key}
              className={`catalog-tab ${activeTab === t.key ? 'is-active' : ''}`}
              onClick={() =>
                updateParams({
                  tab: t.key,
                  page: '1',
                  sort: null,
                  direction: null,
                })
              }
            >
              {t.label}
            </button>
          ))}
        </div>

        <ManagementFilter
          search={search}
          onSearchChange={(val) => updateParams({ q: val || null, page: '1' })}
          searchPlaceholder={`Tìm theo mã hoặc tên ${activeTabMeta.label.toLowerCase()}...`}
          onReset={() =>
            updateParams({
              q: null,
              status: null,
              gradeLevelId: null,
              subjectId: null,
              curriculumId: null,
              textbookSeriesId: null,
              sort: null,
              direction: null,
              page: '1',
            })
          }
        >
          <select
            className="mgmt-select"
            aria-label="Lọc trạng thái"
            value={status}
            onChange={(e) => updateParams({ status: e.target.value, page: '1' })}
          >
            <option value="all">Tất cả trạng thái</option>
            <option value="draft">Nháp (draft)</option>
            <option value="in-review">Chờ duyệt (in-review)</option>
            <option value="approved">Đã duyệt (approved)</option>
            <option value="published">Đã xuất bản (published)</option>
            <option value="archived">Đã lưu trữ (archived)</option>
          </select>

          {activeTab === 'curricula' && (
            <>
              <select
                className="mgmt-select"
                aria-label="Lọc khối lớp"
                value={gradeLevelId}
                onChange={(e) => updateParams({ gradeLevelId: e.target.value || null, page: '1' })}
              >
                <option value="">Tất cả khối lớp</option>
                {gradeOptions.map((g) => (
                  <option key={g.id} value={g.id}>
                    {g.name} ({g.code})
                  </option>
                ))}
              </select>
              <select
                className="mgmt-select"
                aria-label="Lọc môn học"
                value={subjectId}
                onChange={(e) => updateParams({ subjectId: e.target.value || null, page: '1' })}
              >
                <option value="">Tất cả môn học</option>
                {subjectOptions.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name} ({s.code})
                  </option>
                ))}
              </select>
            </>
          )}

          {activeTab === 'editions' && (
            <>
              <select
                className="mgmt-select"
                aria-label="Lọc chương trình"
                value={curriculumId}
                onChange={(e) => updateParams({ curriculumId: e.target.value || null, page: '1' })}
              >
                <option value="">Tất cả chương trình</option>
                {curriculumOptions.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} ({c.code})
                  </option>
                ))}
              </select>
              <select
                className="mgmt-select"
                aria-label="Lọc bộ sách"
                value={textbookSeriesId}
                onChange={(e) => updateParams({ textbookSeriesId: e.target.value || null, page: '1' })}
              >
                <option value="">Tất cả bộ sách</option>
                {seriesOptions.map((sr) => (
                  <option key={sr.id} value={sr.id}>
                    {sr.name}
                  </option>
                ))}
              </select>
            </>
          )}
        </ManagementFilter>

        {isLoading ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }} aria-label="Đang tải danh mục">
            <Skeleton height={38} />
            <Skeleton height={44} />
            <Skeleton height={44} />
            <Skeleton height={44} />
          </div>
        ) : errorInfo ? (
          <ManagementErrorState
            title={
              errorInfo.status === 403
                ? 'Không có quyền truy cập'
                : 'Không thể tải dữ liệu danh mục'
            }
            message={
              errorInfo.status === 403
                ? 'Tài khoản hiện tại không có quyền xem hoặc quản lý danh mục chuẩn.'
                : errorInfo.message
            }
            onRetry={() => void fetchList()}
          />
        ) : data.items.length === 0 ? (
          <ManagementEmptyState
            title={`Chưa có ${activeTabMeta.label.toLowerCase()} nào`}
            description="Danh mục đang trống hoặc không có bản ghi khớp bộ lọc hiện tại."
            actionLabel={activeTabMeta.createLabel}
            onAction={openCreateModal}
          />
        ) : (
          <>
            <ManagementTable
              columns={columns}
              data={data.items}
              rowKey={(r) => r.id}
              sortColumn={sort}
              sortDirection={direction}
              onSort={handleSort}
              ariaLabel={`Bảng ${activeTabMeta.label}`}
            />
            <ManagementPagination
              currentPage={data.page}
              totalPages={totalPages}
              totalCount={data.total}
              pageSize={data.pageSize}
              onPageChange={(nextPage) => updateParams({ page: String(nextPage) })}
              onPageSizeChange={(nextSize) => updateParams({ pageSize: String(nextSize), page: '1' })}
            />
          </>
        )}

        <ManagementDialog
          isOpen={dialogOpen}
          onClose={() => !isSaving && setDialogOpen(false)}
          title={editingRow ? `Chỉnh sửa ${activeTabMeta.label.toLowerCase()}` : activeTabMeta.createLabel}
          maxWidth={560}
          footer={
            <>
              <Button variant="secondary" onClick={() => setDialogOpen(false)} disabled={isSaving}>
                Hủy
              </Button>
              <Button variant="primary" type="submit" form="catalog-entity-form" disabled={isSaving}>
                {isSaving ? 'Đang lưu...' : editingRow ? 'Lưu thay đổi' : 'Tạo bản nháp'}
              </Button>
            </>
          }
        >
          <form id="catalog-entity-form" className="catalog-form-grid" onSubmit={handleSave}>
            {formError && (
              <div className="catalog-form-error" role="alert">
                {formError}
              </div>
            )}

            <div className="catalog-form-row">
              <div className="catalog-form-field">
                <label className="catalog-form-label" htmlFor="cat-code">
                  Mã chuẩn *
                </label>
                <input
                  id="cat-code"
                  className="catalog-form-input"
                  value={fCode}
                  onChange={(e) => setFCode(e.target.value)}
                  placeholder={activeTab === 'grades' ? 'VD: 10' : 'VD: HIST'}
                  required
                />
              </div>

              {activeTab !== 'editions' ? (
                <div className="catalog-form-field">
                  <label className="catalog-form-label" htmlFor="cat-name">
                    Tên hiển thị *
                  </label>
                  <input
                    id="cat-name"
                    className="catalog-form-input"
                    value={fName}
                    onChange={(e) => setFName(e.target.value)}
                    required
                  />
                </div>
              ) : (
                <div className="catalog-form-field">
                  <label className="catalog-form-label" htmlFor="cat-ed-name">
                    Tên phiên bản *
                  </label>
                  <input
                    id="cat-ed-name"
                    className="catalog-form-input"
                    value={fEditionName}
                    onChange={(e) => setFEditionName(e.target.value)}
                    required
                  />
                </div>
              )}
            </div>

            {activeTab === 'grades' && (
              <div className="catalog-form-field">
                <label className="catalog-form-label" htmlFor="cat-order">
                  Thứ tự hiển thị
                </label>
                <input
                  id="cat-order"
                  type="number"
                  className="catalog-form-input"
                  value={fOrderIndex}
                  onChange={(e) => setFOrderIndex(e.target.value)}
                />
              </div>
            )}

            {(activeTab === 'subjects' || activeTab === 'series') && (
              <>
                {activeTab === 'series' && (
                  <div className="catalog-form-field">
                    <label className="catalog-form-label" htmlFor="cat-publisher">
                      Nhà xuất bản *
                    </label>
                    <input
                      id="cat-publisher"
                      className="catalog-form-input"
                      value={fPublisher}
                      onChange={(e) => setFPublisher(e.target.value)}
                      required
                    />
                  </div>
                )}
                <div className="catalog-form-field">
                  <label className="catalog-form-label" htmlFor="cat-desc">
                    Mô tả
                  </label>
                  <textarea
                    id="cat-desc"
                    className="catalog-form-textarea"
                    value={fDescription}
                    onChange={(e) => setFDescription(e.target.value)}
                  />
                </div>
              </>
            )}

            {activeTab === 'curricula' && (
              <>
                <div className="catalog-form-row">
                  <div className="catalog-form-field">
                    <label className="catalog-form-label" htmlFor="cat-grade-sel">
                      Khối lớp *
                    </label>
                    <select
                      id="cat-grade-sel"
                      className="catalog-form-select"
                      value={fGradeLevelId}
                      onChange={(e) => setFGradeLevelId(e.target.value)}
                      required
                    >
                      <option value="">-- Chọn khối lớp --</option>
                      {gradeOptions.map((g) => (
                        <option key={g.id} value={g.id}>
                          {g.name} ({g.code})
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="catalog-form-field">
                    <label className="catalog-form-label" htmlFor="cat-subj-sel">
                      Môn học *
                    </label>
                    <select
                      id="cat-subj-sel"
                      className="catalog-form-select"
                      value={fSubjectId}
                      onChange={(e) => setFSubjectId(e.target.value)}
                      required
                    >
                      <option value="">-- Chọn môn học --</option>
                      {subjectOptions.map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.name} ({s.code})
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
                <div className="catalog-form-row">
                  <div className="catalog-form-field">
                    <label className="catalog-form-label" htmlFor="cat-framework">
                      Khung chương trình *
                    </label>
                    <input
                      id="cat-framework"
                      className="catalog-form-input"
                      value={fFramework}
                      onChange={(e) => setFFramework(e.target.value)}
                      required
                    />
                  </div>
                  <div className="catalog-form-row">
                    <div className="catalog-form-field">
                      <label className="catalog-form-label" htmlFor="cat-yfrom">
                        Từ năm
                      </label>
                      <input
                        id="cat-yfrom"
                        type="number"
                        className="catalog-form-input"
                        value={fYearFrom}
                        onChange={(e) => setFYearFrom(e.target.value)}
                      />
                    </div>
                    <div className="catalog-form-field">
                      <label className="catalog-form-label" htmlFor="cat-yto">
                        Đến năm
                      </label>
                      <input
                        id="cat-yto"
                        type="number"
                        className="catalog-form-input"
                        value={fYearTo}
                        onChange={(e) => setFYearTo(e.target.value)}
                      />
                    </div>
                  </div>
                </div>
              </>
            )}

            {activeTab === 'editions' && (
              <>
                <div className="catalog-form-row">
                  <div className="catalog-form-field">
                    <label className="catalog-form-label" htmlFor="cat-cur-sel">
                      Chương trình *
                    </label>
                    <select
                      id="cat-cur-sel"
                      className="catalog-form-select"
                      value={fCurriculumId}
                      onChange={(e) => setFCurriculumId(e.target.value)}
                      required
                    >
                      <option value="">-- Chọn chương trình --</option>
                      {curriculumOptions.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name} ({c.code})
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="catalog-form-field">
                    <label className="catalog-form-label" htmlFor="cat-ser-sel">
                      Bộ sách (tùy chọn)
                    </label>
                    <select
                      id="cat-ser-sel"
                      className="catalog-form-select"
                      value={fSeriesId}
                      onChange={(e) => setFSeriesId(e.target.value)}
                    >
                      <option value="">Không gắn bộ sách (Chuẩn khung)</option>
                      {seriesOptions.map((sr) => (
                        <option key={sr.id} value={sr.id}>
                          {sr.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
                <div className="catalog-form-row">
                  <div className="catalog-form-field">
                    <label className="catalog-form-label" htmlFor="cat-vol">
                      Tập (Volume)
                    </label>
                    <input
                      id="cat-vol"
                      className="catalog-form-input"
                      value={fVolume}
                      onChange={(e) => setFVolume(e.target.value)}
                    />
                  </div>
                  <div className="catalog-form-field">
                    <label className="catalog-form-label" htmlFor="cat-ver">
                      Phiên bản (Version)
                    </label>
                    <input
                      id="cat-ver"
                      className="catalog-form-input"
                      value={fVersion}
                      onChange={(e) => setFVersion(e.target.value)}
                    />
                  </div>
                </div>
                <div className="catalog-form-field">
                  <label className="catalog-form-label" htmlFor="cat-pubyear">
                    Năm xuất bản
                  </label>
                  <input
                    id="cat-pubyear"
                    type="number"
                    className="catalog-form-input"
                    value={fPublicationYear}
                    onChange={(e) => setFPublicationYear(e.target.value)}
                  />
                </div>
              </>
            )}

            {(activeTab === 'curricula' || activeTab === 'series' || activeTab === 'editions') && (
              <div className="catalog-form-row">
                <div className="catalog-form-field">
                  <label className="catalog-form-label" htmlFor="cat-src-name">
                    Nguồn / Tổ chức
                  </label>
                  <input
                    id="cat-src-name"
                    className="catalog-form-input"
                    value={fSourceName}
                    onChange={(e) => setFSourceName(e.target.value)}
                  />
                </div>
                <div className="catalog-form-field">
                  <label className="catalog-form-label" htmlFor="cat-src-license">
                    Giấy phép
                  </label>
                  <input
                    id="cat-src-license"
                    className="catalog-form-input"
                    value={fSourceLicense}
                    onChange={(e) => setFSourceLicense(e.target.value)}
                  />
                </div>
              </div>
            )}
          </form>
        </ManagementDialog>

        <ConfirmDialog
          isOpen={confirmState.open}
          title={confirmState.mode === 'archive' ? 'Xác nhận lưu trữ' : 'Xác nhận khôi phục'}
          message={
            confirmState.mode === 'archive'
              ? `Bạn có chắc muốn lưu trữ "${String((confirmState.row as { name?: string; editionName?: string })?.name || (confirmState.row as { editionName?: string })?.editionName || confirmState.row?.code || '')}"?`
              : `Khôi phục bản ghi về trạng thái nháp (draft)?`
          }
          confirmText={confirmState.mode === 'archive' ? 'Lưu trữ' : 'Khôi phục'}
          variant={confirmState.mode === 'archive' ? 'danger' : 'primary'}
          isLoading={isMutatingStatus}
          onConfirm={handleConfirmStatusChange}
        onCancel={() => setConfirmState({ open: false, mode: 'archive', row: null })}
      />
    </div>
  )
}

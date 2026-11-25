import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { ArrowDown, ArrowUp, FolderTree, Plus, RefreshCw } from 'lucide-react'
import { Breadcrumb } from '@/components/ui/Breadcrumb'
import { Button } from '@/components/ui/Button'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { PageErrorState } from '@/components/ui/PageErrorState'
import { Skeleton } from '@/components/ui/Skeleton'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { catalogService } from '@/services/catalog.service'
import {
  curriculumWorkspaceService,
  type LifecycleStatus,
  type WorkspaceChapter,
  type WorkspaceLesson,
} from '@/services/curriculumWorkspace.service'
import type {
  CatalogSubjectItem,
  CurriculumEditionItem,
  CurriculumItem,
  GradeLevelItem,
  TextbookSeriesItem,
} from '@/types/catalog'
import './CurriculumWorkspacePage.css'

const PAGE_SIZE = 20

const STATUSES: Array<{ value: string; label: string }> = [
  { value: '', label: 'Tất cả trạng thái' },
  { value: 'draft', label: 'Bản nháp' },
  { value: 'in-review', label: 'Chờ duyệt' },
  { value: 'changes-requested', label: 'Yêu cầu sửa' },
  { value: 'approved', label: 'Đã duyệt' },
  { value: 'published', label: 'Đã xuất bản' },
  { value: 'archived', label: 'Đã lưu trữ' },
]

function extractErrorMessage(err: unknown, fallback: string): string {
  if (err && typeof err === 'object') {
    const e = err as { detail?: string; message?: string; status?: number }
    if (e.status === 409) {
      return e.detail || 'Dữ liệu đã thay đổi bởi người dùng khác (409). Vui lòng tải lại.'
    }
    if (e.status === 403) {
      return e.detail || 'Bạn không có quyền thực hiện thao tác này (403).'
    }
    if (e.detail) return e.detail
    if (e.message) return e.message
  }
  return fallback
}

function nextAction(status: LifecycleStatus): { key: string; label: string; confirm?: boolean } | null {
  if (status === 'draft' || status === 'changes-requested') {
    return { key: 'submit-review', label: 'Gửi duyệt' }
  }
  if (status === 'in-review') return { key: 'approve', label: 'Phê duyệt' }
  if (status === 'approved') return { key: 'publish', label: 'Xuất bản' }
  if (status === 'published') return { key: 'unpublish', label: 'Gỡ xuất bản', confirm: true }
  if (status === 'archived') return { key: 'reactivate', label: 'Khôi phục' }
  return null
}

export function CurriculumWorkspacePage() {
  const [params, setParams] = useSearchParams()
  const gradeId = params.get('gradeId') ?? ''
  const subjectId = params.get('subjectId') ?? ''
  const curriculumId = params.get('curriculumId') ?? ''
  const seriesId = params.get('seriesId') ?? ''
  const editionId = params.get('editionId') ?? ''
  const chapterId = params.get('chapterId') ?? ''
  const status = params.get('status') ?? ''
  const search = params.get('q') ?? ''
  const sort = params.get('sort') ?? 'orderIndex'
  const direction = params.get('dir') === 'desc' ? 'desc' : 'asc'
  const page = Math.max(1, Number(params.get('page') || 1))
  const chapterPage = Math.max(1, Number(params.get('cpage') || 1))

  const [grades, setGrades] = useState<GradeLevelItem[]>([])
  const [subjects, setSubjects] = useState<CatalogSubjectItem[]>([])
  const [curricula, setCurricula] = useState<CurriculumItem[]>([])
  const [seriesList, setSeriesList] = useState<TextbookSeriesItem[]>([])
  const [editions, setEditions] = useState<CurriculumEditionItem[]>([])

  const [chapters, setChapters] = useState<WorkspaceChapter[]>([])
  const [chapterTotal, setChapterTotal] = useState(0)
  const [lessons, setLessons] = useState<WorkspaceLesson[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState('')
  const [actionError, setActionError] = useState('')
  const [treeOpenMobile, setTreeOpenMobile] = useState(false)

  const [form, setForm] = useState<'chapter' | 'lesson' | null>(null)
  const [editing, setEditing] = useState<WorkspaceChapter | WorkspaceLesson | null>(null)
  const [code, setCode] = useState('')
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [formError, setFormError] = useState('')
  const [saving, setSaving] = useState(false)

  const [pendingConfirm, setPendingConfirm] = useState<{
    kind: 'chapter' | 'lesson'
    row: WorkspaceChapter | WorkspaceLesson
    action: string
    label: string
  } | null>(null)

  const returnFocusRef = useRef<HTMLButtonElement | null>(null)

  const updateParams = (patch: Record<string, string | null>) => {
    const next = new URLSearchParams(params)
    Object.entries(patch).forEach(([key, value]) =>
      value ? next.set(key, value) : next.delete(key)
    )
    setParams(next, { replace: true })
  }

  // Load base catalog filters (grades, subjects, textbook series)
  useEffect(() => {
    Promise.all([
      catalogService.listGrades({ page: 1, pageSize: 50 }),
      catalogService.listSubjects({ page: 1, pageSize: 50 }),
      catalogService.listSeries({ page: 1, pageSize: 50 }),
    ])
      .then(([g, s, ts]) => {
        setGrades(g.items)
        setSubjects(s.items)
        setSeriesList(ts.items)
      })
      .catch((err) =>
        setLoadError(extractErrorMessage(err, 'Không thể tải danh mục giáo trình.'))
      )
  }, [])

  // Cascade curricula when gradeId / subjectId changes
  useEffect(() => {
    catalogService
      .listCurricula({
        gradeLevelId: gradeId || undefined,
        subjectId: subjectId || undefined,
        page: 1,
        pageSize: 50,
      })
      .then((res) => setCurricula(res.items))
      .catch(() => setCurricula([]))
  }, [gradeId, subjectId])

  // Cascade editions when curriculumId / seriesId changes
  useEffect(() => {
    catalogService
      .listEditions({
        curriculumId: curriculumId || undefined,
        textbookSeriesId: seriesId || undefined,
        page: 1,
        pageSize: 50,
      })
      .then((res) => setEditions(res.items))
      .catch(() => setEditions([]))
  }, [curriculumId, seriesId])

  const load = useCallback(async () => {
    setLoading(true)
    setLoadError('')
    try {
      if (!editionId) {
        setChapters([])
        setChapterTotal(0)
        setLessons([])
        setTotal(0)
        return
      }
      const chapterResult = await curriculumWorkspaceService.listChapters({
        curriculumEditionId: editionId,
        page: chapterPage,
        pageSize: PAGE_SIZE,
        sort: 'orderIndex',
        direction: 'asc',
      })
      setChapters(chapterResult.items)
      setChapterTotal(chapterResult.total)

      if (chapterId) {
        const lessonResult = await curriculumWorkspaceService.listLessons({
          chapterId,
          status: status || undefined,
          search: search || undefined,
          page,
          pageSize: PAGE_SIZE,
          sort,
          direction,
        })
        setLessons(lessonResult.items)
        setTotal(lessonResult.total)
      } else {
        setLessons([])
        setTotal(0)
      }
    } catch (err) {
      setLoadError(extractErrorMessage(err, 'Không thể tải dữ liệu chương và bài học từ máy chủ.'))
    } finally {
      setLoading(false)
    }
  }, [chapterId, chapterPage, direction, editionId, page, search, sort, status])

  useEffect(() => {
    void load()
  }, [load])

  const selectedChapter = useMemo(
    () => chapters.find((c) => c.id === chapterId),
    [chapters, chapterId]
  )

  const hasActiveFilters = Boolean(status || search.trim())

  const openForm = (
    kind: 'chapter' | 'lesson',
    row?: WorkspaceChapter | WorkspaceLesson,
    trigger?: HTMLButtonElement | null
  ) => {
    if (trigger) returnFocusRef.current = trigger
    setForm(kind)
    setEditing(row ?? null)
    setCode(row?.code ?? '')
    setTitle(row?.title ?? '')
    setDescription('description' in (row ?? {}) ? (row as WorkspaceChapter).description : '')
    setFormError('')
  }

  const closeForm = () => {
    setForm(null)
    setEditing(null)
    setFormError('')
    returnFocusRef.current?.focus()
  }

  const save = async () => {
    if (!title.trim() || !code.trim()) {
      setFormError('Mã và tiêu đề là bắt buộc.')
      return
    }
    setSaving(true)
    setFormError('')
    try {
      if (form === 'chapter') {
        if (!editionId) throw new Error('Hãy chọn phiên bản giáo trình.')
        if (editing) {
          await curriculumWorkspaceService.updateChapter(editing.id, {
            code: code.trim(),
            title: title.trim(),
            description,
            rowVersion: editing.rowVersion,
          })
        } else {
          await curriculumWorkspaceService.createChapter({
            curriculumEditionId: editionId,
            code: code.trim(),
            title: title.trim(),
            description,
            orderIndex: chapterTotal + 1,
          })
        }
      } else {
        if (!chapterId) throw new Error('Hãy chọn chương.')
        const slug = code
          .trim()
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, '-')
          .replace(/^-|-$/g, '') || `lesson-${Date.now()}`
        if (editing) {
          await curriculumWorkspaceService.updateLesson(editing.id, {
            code: code.trim(),
            title: title.trim(),
            rowVersion: editing.rowVersion,
          })
        } else {
          await curriculumWorkspaceService.createLesson({
            chapterId,
            code: code.trim(),
            title: title.trim(),
            slug,
            orderIndex: total + 1,
          })
        }
      }
      closeForm()
      await load()
    } catch (err) {
      setFormError(extractErrorMessage(err, 'Không thể lưu dữ liệu.'))
    } finally {
      setSaving(false)
    }
  }

  const executeTransition = async (
    row: WorkspaceChapter | WorkspaceLesson,
    kind: 'chapter' | 'lesson',
    actionKey: string
  ) => {
    setActionError('')
    try {
      if (kind === 'chapter') {
        await curriculumWorkspaceService.chapterAction(row.id, actionKey, row.rowVersion)
      } else {
        await curriculumWorkspaceService.lessonAction(row.id, actionKey, row.rowVersion)
      }
      await load()
    } catch (err) {
      setActionError(
        extractErrorMessage(
          err,
          'Không thể chuyển trạng thái. Kiểm tra quyền, phiên bản dữ liệu và trạng thái cha.'
        )
      )
    }
  }

  const handleTransitionClick = (
    row: WorkspaceChapter | WorkspaceLesson,
    kind: 'chapter' | 'lesson',
    action: { key: string; label: string; confirm?: boolean }
  ) => {
    if (action.confirm) {
      setPendingConfirm({ kind, row, action: action.key, label: action.label })
      return
    }
    void executeTransition(row, kind, action.key)
  }

  const moveLesson = async (index: number, delta: -1 | 1) => {
    if (!chapterId) return
    const targetIndex = index + delta
    if (targetIndex < 0 || targetIndex >= lessons.length) return
    const nextOrder = [...lessons]
    const [moved] = nextOrder.splice(index, 1)
    nextOrder.splice(targetIndex, 0, moved)
    const rowVersions = Object.fromEntries(lessons.map((l) => [l.id, l.rowVersion]))
    setActionError('')
    try {
      await curriculumWorkspaceService.reorderLessons({
        chapterId,
        lessonIds: nextOrder.map((l) => l.id),
        rowVersions,
      })
      await load()
    } catch (err) {
      setActionError(extractErrorMessage(err, 'Không thể sắp xếp thứ tự bài học.'))
    }
  }

  const toggleSort = (col: string) => {
    const nextDir = sort === col && direction === 'asc' ? 'desc' : 'asc'
    updateParams({ sort: col, dir: nextDir, page: null })
  }

  const ariaSort = (col: string): 'ascending' | 'descending' | 'none' =>
    sort === col ? (direction === 'asc' ? 'ascending' : 'descending') : 'none'

  return (
    <main className="curriculum-workspace">
      <Breadcrumb
        items={[{ label: 'Quản lý nội dung', to: '/content' }, { label: 'Không gian giáo trình' }]}
      />
      <header className="curriculum-workspace__header">
        <div>
          <h1>Không gian giáo trình</h1>
          <p>Quản lý chương và bài học đa môn theo phiên bản giáo trình trên dữ liệu thật.</p>
        </div>
        <div className="curriculum-workspace__header-actions">
          <Button
            variant="secondary"
            className="curriculum-workspace__tree-toggle"
            onClick={() => setTreeOpenMobile((v) => !v)}
          >
            <FolderTree size={16} /> Cây chương
          </Button>
          <Button variant="secondary" onClick={() => void load()}>
            <RefreshCw size={16} /> Tải lại
          </Button>
        </div>
      </header>

      <section className="curriculum-workspace__filters" aria-label="Bộ lọc giáo trình">
        <select
          aria-label="Khối lớp"
          value={gradeId}
          onChange={(e) =>
            updateParams({
              gradeId: e.target.value || null,
              curriculumId: null,
              editionId: null,
              chapterId: null,
              page: null,
              cpage: null,
            })
          }
        >
          <option value="">Tất cả khối lớp</option>
          {grades.map((g) => (
            <option key={g.id} value={g.id}>
              {g.name}
            </option>
          ))}
        </select>

        <select
          aria-label="Môn học"
          value={subjectId}
          onChange={(e) =>
            updateParams({
              subjectId: e.target.value || null,
              curriculumId: null,
              editionId: null,
              chapterId: null,
              page: null,
              cpage: null,
            })
          }
        >
          <option value="">Tất cả môn học</option>
          {subjects.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </select>

        <select
          aria-label="Chương trình"
          value={curriculumId}
          onChange={(e) =>
            updateParams({
              curriculumId: e.target.value || null,
              editionId: null,
              chapterId: null,
              page: null,
              cpage: null,
            })
          }
        >
          <option value="">Tất cả chương trình</option>
          {curricula.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name} ({c.code})
            </option>
          ))}
        </select>

        <select
          aria-label="Bộ sách"
          value={seriesId}
          onChange={(e) =>
            updateParams({
              seriesId: e.target.value || null,
              editionId: null,
              chapterId: null,
              page: null,
              cpage: null,
            })
          }
        >
          <option value="">Tất cả bộ sách</option>
          {seriesList.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </select>

        <select
          aria-label="Phiên bản giáo trình"
          value={editionId}
          onChange={(e) =>
            updateParams({
              editionId: e.target.value || null,
              chapterId: null,
              page: null,
              cpage: null,
            })
          }
        >
          <option value="">Chọn phiên bản giáo trình</option>
          {editions.map((e) => (
            <option key={e.id} value={e.id}>
              {e.editionName} ({e.code})
            </option>
          ))}
        </select>

        <select
          aria-label="Trạng thái"
          value={status}
          onChange={(e) => updateParams({ status: e.target.value || null, page: null })}
        >
          {STATUSES.map((s) => (
            <option key={s.value} value={s.value}>
              {s.label}
            </option>
          ))}
        </select>

        <input
          aria-label="Tìm bài học"
          value={search}
          onChange={(e) => updateParams({ q: e.target.value || null, page: null })}
          placeholder="Tìm theo tên hoặc mã"
        />
      </section>

      {actionError && (
        <div className="curriculum-workspace__error" role="alert">
          {actionError}
        </div>
      )}

      {loadError ? (
        <PageErrorState title="Không thể tải không gian giáo trình" description={loadError} onRetry={load} />
      ) : (
        <section className="curriculum-workspace__body">
          <aside className={`curriculum-tree ${treeOpenMobile ? 'curriculum-tree--open' : ''}`}>
            <div className="curriculum-table__toolbar">
              <h2 className="curriculum-tree__title">Cây chương</h2>
              <Button
                size="sm"
                aria-label="Thêm chương"
                disabled={!editionId}
                onClick={(e) => openForm('chapter', undefined, e.currentTarget)}
              >
                <Plus size={14} />
              </Button>
            </div>
            {!editionId ? (
              <div className="curriculum-workspace__empty">Chọn phiên bản để xem chương.</div>
            ) : loading && chapters.length === 0 ? (
              <div className="curriculum-workspace__skeleton">
                <Skeleton height={32} />
                <Skeleton height={32} />
              </div>
            ) : chapters.length === 0 ? (
              <div className="curriculum-workspace__empty">Giáo trình chưa có chương.</div>
            ) : (
              <>
                {chapters.map((c) => (
                  <button
                    key={c.id}
                    type="button"
                    aria-current={chapterId === c.id ? 'true' : undefined}
                    onClick={() => {
                      updateParams({ chapterId: c.id, page: null })
                      setTreeOpenMobile(false)
                    }}
                  >
                    <span className="curriculum-tree__code">{c.code}</span>
                    {c.title}
                    <br />
                    <small>
                      {c.lessonCount} bài · {c.status}
                    </small>
                  </button>
                ))}
                {chapterTotal > PAGE_SIZE && (
                  <div className="curriculum-workspace__pagination">
                    <Button
                      size="sm"
                      variant="secondary"
                      disabled={chapterPage === 1}
                      onClick={() => updateParams({ cpage: String(chapterPage - 1) })}
                    >
                      Trước
                    </Button>
                    <span>
                      {chapterPage}/{Math.ceil(chapterTotal / PAGE_SIZE)}
                    </span>
                    <Button
                      size="sm"
                      variant="secondary"
                      disabled={chapterPage * PAGE_SIZE >= chapterTotal}
                      onClick={() => updateParams({ cpage: String(chapterPage + 1) })}
                    >
                      Sau
                    </Button>
                  </div>
                )}
              </>
            )}
          </aside>

          <div className="curriculum-table">
            <div className="curriculum-table__toolbar">
              <div>
                <strong>{selectedChapter?.title ?? 'Bài học'}</strong>
                <div>{total} mục</div>
              </div>
              <Button
                size="sm"
                disabled={!chapterId}
                onClick={(e) => openForm('lesson', undefined, e.currentTarget)}
              >
                <Plus size={14} /> Thêm bài học
              </Button>
            </div>

            {loading ? (
              <div className="curriculum-workspace__skeleton">
                <Skeleton height={36} />
                <Skeleton height={36} />
                <Skeleton height={36} />
              </div>
            ) : !chapterId ? (
              <div className="curriculum-workspace__empty">Chọn một chương trong cây bên trái.</div>
            ) : lessons.length === 0 ? (
              <div className="curriculum-workspace__empty">
                {hasActiveFilters ? (
                  <>
                    <p>Không có bài học khớp bộ lọc.</p>
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() => updateParams({ status: null, q: null, page: null })}
                    >
                      Xóa bộ lọc
                    </Button>
                  </>
                ) : (
                  'Chương chưa có bài học. Không có dữ liệu mẫu được tạo tự động.'
                )}
              </div>
            ) : (
              <table>
                <thead>
                  <tr>
                    <th aria-sort={ariaSort('orderIndex')}>
                      <button type="button" className="curriculum-sort" onClick={() => toggleSort('orderIndex')}>
                        Thứ tự
                      </button>
                    </th>
                    <th>Mã</th>
                    <th aria-sort={ariaSort('title')}>
                      <button type="button" className="curriculum-sort" onClick={() => toggleSort('title')}>
                        Bài học
                      </button>
                    </th>
                    <th aria-sort={ariaSort('status')}>
                      <button type="button" className="curriculum-sort" onClick={() => toggleSort('status')}>
                        Trạng thái
                      </button>
                    </th>
                    <th>Video</th>
                    <th>Thao tác</th>
                  </tr>
                </thead>
                <tbody>
                  {lessons.map((l, idx) => {
                    const action = nextAction(l.status)
                    return (
                      <tr key={l.id}>
                        <td>{l.orderIndex}</td>
                        <td>{l.code || '—'}</td>
                        <td>
                          <Link to={`/content/lessons/${l.id}`}>{l.title}</Link>
                        </td>
                        <td>
                          <StatusBadge status={l.status} />
                        </td>
                        <td>{l.videos.length || '—'}</td>
                        <td>
                          <div className="curriculum-table__actions">
                            <Button
                              size="sm"
                              variant="secondary"
                              aria-label={`Lên ${l.title}`}
                              disabled={idx === 0}
                              onClick={() => void moveLesson(idx, -1)}
                            >
                              <ArrowUp size={14} />
                            </Button>
                            <Button
                              size="sm"
                              variant="secondary"
                              aria-label={`Xuống ${l.title}`}
                              disabled={idx === lessons.length - 1}
                              onClick={() => void moveLesson(idx, 1)}
                            >
                              <ArrowDown size={14} />
                            </Button>
                            <Button
                              size="sm"
                              variant="secondary"
                              onClick={(e) => openForm('lesson', l, e.currentTarget)}
                            >
                              Sửa
                            </Button>
                            {action && (
                              <Button
                                size="sm"
                                onClick={() => handleTransitionClick(l, 'lesson', action)}
                              >
                                {action.label}
                              </Button>
                            )}
                            {l.status !== 'archived' && (
                              <Button
                                size="sm"
                                variant="secondary"
                                onClick={() =>
                                  handleTransitionClick(l, 'lesson', {
                                    key: 'archive',
                                    label: 'Lưu trữ',
                                    confirm: true,
                                  })
                                }
                              >
                                Lưu trữ
                              </Button>
                            )}
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            )}

            {total > PAGE_SIZE && (
              <div className="curriculum-workspace__pagination">
                <Button
                  size="sm"
                  variant="secondary"
                  disabled={page === 1}
                  onClick={() => updateParams({ page: String(page - 1) })}
                >
                  Trước
                </Button>
                <span>
                  Trang {page}/{Math.ceil(total / PAGE_SIZE)}
                </span>
                <Button
                  size="sm"
                  variant="secondary"
                  disabled={page * PAGE_SIZE >= total}
                  onClick={() => updateParams({ page: String(page + 1) })}
                >
                  Sau
                </Button>
              </div>
            )}
          </div>
        </section>
      )}

      {selectedChapter && (
        <div className="curriculum-table__actions curriculum-workspace__chapter-bar">
          <Button
            variant="secondary"
            onClick={(e) => openForm('chapter', selectedChapter, e.currentTarget)}
          >
            Sửa chương
          </Button>
          {nextAction(selectedChapter.status) && (
            <Button
              onClick={() =>
                handleTransitionClick(
                  selectedChapter,
                  'chapter',
                  nextAction(selectedChapter.status)!
                )
              }
            >
              {nextAction(selectedChapter.status)?.label}
            </Button>
          )}
          {selectedChapter.status !== 'archived' && (
            <Button
              variant="secondary"
              onClick={() =>
                handleTransitionClick(selectedChapter, 'chapter', {
                  key: 'archive',
                  label: 'Lưu trữ chương',
                  confirm: true,
                })
              }
            >
              Lưu trữ
            </Button>
          )}
        </div>
      )}

      {form && (
        <section
          aria-label={form === 'chapter' ? 'Biểu mẫu chương' : 'Biểu mẫu bài học'}
          className="curriculum-workspace__form"
        >
          <h2>
            {editing ? 'Chỉnh sửa' : 'Tạo'} {form === 'chapter' ? 'chương' : 'bài học'}
          </h2>
          {formError && (
            <div className="curriculum-workspace__error" role="alert">
              {formError}
            </div>
          )}
          <label>
            Mã
            <input value={code} onChange={(e) => setCode(e.target.value)} />
          </label>
          <label>
            Tiêu đề
            <input value={title} onChange={(e) => setTitle(e.target.value)} />
          </label>
          {form === 'chapter' && (
            <label>
              Mô tả
              <textarea value={description} onChange={(e) => setDescription(e.target.value)} />
            </label>
          )}
          <div className="curriculum-workspace__form-actions">
            <Button variant="secondary" onClick={closeForm}>
              Hủy
            </Button>
            <Button disabled={saving} onClick={() => void save()}>
              {saving ? 'Đang lưu…' : 'Lưu'}
            </Button>
          </div>
        </section>
      )}

      <ConfirmDialog
        isOpen={pendingConfirm !== null}
        title={pendingConfirm?.label ?? 'Xác nhận'}
        message={`Xác nhận thực hiện "${pendingConfirm?.label}" cho "${pendingConfirm?.row.title}"?`}
        variant={pendingConfirm?.action === 'archive' ? 'danger' : 'warning'}
        onCancel={() => setPendingConfirm(null)}
        onConfirm={async () => {
          if (!pendingConfirm) return
          const current = pendingConfirm
          setPendingConfirm(null)
          await executeTransition(current.row, current.kind, current.action)
        }}
      />
    </main>
  )
}

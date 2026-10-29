import React, { useEffect, useState, useCallback } from 'react'
import {
  FileText,
  Plus,
  Search,
  CheckCircle2,
  X,
  ExternalLink,
  Trash2,
  ChevronLeft,
  ChevronRight,
  Send,
  Globe,
  FileEdit,
  MoreHorizontal,
} from 'lucide-react'
import { Link } from 'react-router-dom'
import { educationService } from '@/services/education.service'
import type { CurriculumLessonItem, CurriculumSubjectItem, CurriculumChapterItem, ContentStatus } from '@/types/education'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { Skeleton } from '@/components/ui/Skeleton'
import { EmptyState } from '@/components/ui/EmptyState'
import './ContentPages.css'
import '../Admin/AdminPages.css'
import '@/components/admin/AdminComponents.css'

export const ContentLessonsPage: React.FC = () => {
  const [lessons, setLessons] = useState<CurriculumLessonItem[]>([])
  const [subjects, setSubjects] = useState<CurriculumSubjectItem[]>([])
  const [chapters, setChapters] = useState<CurriculumChapterItem[]>([])
  const [loading, setLoading] = useState(true)

  // Filters & Pagination
  const [search, setSearch] = useState('')
  const [subjectFilter, setSubjectFilter] = useState('all')
  const [chapterFilter, setChapterFilter] = useState('all')
  const [statusFilter, setStatusFilter] = useState<'all' | ContentStatus>('all')
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)
  const [toastMessage, setToastMessage] = useState<string | null>(null)

  // Create Dialog State
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [formTitle, setFormTitle] = useState('')
  const [formSubjectId, setFormSubjectId] = useState('math')
  const [formChapterId, setFormChapterId] = useState('ch-01')
  const [formAuthor, setFormAuthor] = useState('Quản trị viên')
  const [formStatus, setFormStatus] = useState<ContentStatus>('draft')
  const [formError, setFormError] = useState<string | null>(null)

  // Action Menu Dropdown State
  const [openMenuId, setOpenMenuId] = useState<string | null>(null)

  // Listen for Escape key and outside clicks to dismiss modal and dropdown
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (!(e.target as HTMLElement).closest('.action-dropdown-wrap')) {
        setOpenMenuId(null)
      }
    }
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setOpenMenuId(null)
        if (isCreateOpen) setIsCreateOpen(false)
      }
    }
    document.addEventListener('click', handleClickOutside)
    window.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('click', handleClickOutside)
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [isCreateOpen])

  // Lock body scroll when modal is open
  useEffect(() => {
    if (isCreateOpen) {
      const originalOverflow = document.body.style.overflow
      document.body.style.overflow = 'hidden'
      return () => {
        document.body.style.overflow = originalOverflow
      }
    }
  }, [isCreateOpen])

  const showToast = (msg: string) => {
    setToastMessage(msg)
    setTimeout(() => setToastMessage(null), 3000)
  }

  const loadData = useCallback(() => {
    setLoading(true)
    Promise.all([
      educationService.getSubjects(),
      educationService.getChapters(),
      educationService.getLessons({
        subjectId: subjectFilter,
        chapterId: chapterFilter,
        status: statusFilter,
        search,
      }),
    ]).then(([subjList, chList, lList]) => {
      setSubjects(subjList)
      setChapters(chList)
      setLessons(lList)
      setLoading(false)
    })
  }, [subjectFilter, chapterFilter, statusFilter, search])

  useEffect(() => {
    let active = true
    Promise.all([
      educationService.getSubjects(),
      educationService.getChapters(),
      educationService.getLessons({
        subjectId: subjectFilter,
        chapterId: chapterFilter,
        status: statusFilter,
        search,
      }),
    ]).then(([subjList, chList, lList]) => {
      if (active) {
        setSubjects(subjList)
        setChapters(chList)
        setLessons(lList)
        setLoading(false)
      }
    })
    return () => {
      active = false
    }
  }, [subjectFilter, chapterFilter, statusFilter, search])

  // Filter available chapters when form subject changes
  const availableChapters = chapters.filter(
    (c) => formSubjectId === 'all' || c.subjectId === formSubjectId
  )

  // Pagination calculation
  const totalCount = lessons.length
  const totalPages = Math.ceil(totalCount / pageSize) || 1
  const paginatedLessons = lessons.slice((page - 1) * pageSize, page * pageSize)

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formTitle.trim()) {
      setFormError('Vui lòng nhập tên bài học.')
      return
    }

    const subj = subjects.find((s) => s.id === formSubjectId)
    const ch = chapters.find((c) => c.id === formChapterId)

    await educationService.createLesson({
      title: formTitle.trim(),
      subjectId: formSubjectId,
      subjectName: subj ? subj.name : 'Toán học 12',
      chapterId: formChapterId,
      chapterName: ch ? ch.title : 'Chương 1',
      authorName: formAuthor.trim() || 'Quản trị viên',
      status: formStatus,
      hasAssessment: false,
    })

    showToast(`Đã tạo thành công bài học demo: ${formTitle}`)
    setIsCreateOpen(false)
    setFormTitle('')
    setFormError(null)
    loadData()
  }

  const handleStatusChange = async (id: string, newStatus: ContentStatus, title: string) => {
    await educationService.changeLessonStatus(id, newStatus)
    const statusLabels: Record<ContentStatus, string> = {
      draft: 'Bản nháp',
      'in-review': 'Gửi kiểm duyệt',
      published: 'Đã xuất bản',
      archived: 'Lưu trữ',
    }
    showToast(`Đã chuyển bài "${title}" sang trạng thái: ${statusLabels[newStatus]}`)
    loadData()
  }

  const handleDelete = async (id: string, title: string) => {
    if (window.confirm(`Bạn có chắc muốn xóa bài học "${title}" (Dữ liệu mô phỏng)?`)) {
      await educationService.deleteLesson(id)
      showToast(`Đã xóa bài học: ${title}`)
      loadData()
    }
  }

  return (
    <div className="admin-page-container">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="admin-toast">
          <CheckCircle2 size={16} />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Page Header */}
      <div className="staff-page-header">
        <div className="admin-header-row">
          <div>
            <h1 className="staff-page-title">Quản lý bài học</h1>
            <p className="staff-page-desc">
              Kiểm soát quy trình biên soạn bài giảng, duyệt nội dung và xuất bản học liệu học tập chuẩn theo chương trình.
            </p>
          </div>
          <div className="admin-header-actions">
            <button
              type="button"
              className="btn btn-primary"
              onClick={() => {
                setFormSubjectId(subjects[0]?.id || 'math')
                setFormChapterId(chapters[0]?.id || 'ch-01')
                setIsCreateOpen(true)
              }}
              aria-label="Tạo bài học mới"
            >
              <Plus size={16} />
              <span>Tạo bài học</span>
            </button>
          </div>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="admin-toolbar" style={{ marginBottom: '12px', flexWrap: 'wrap', gap: '8px' }}>
        <div className="admin-search-wrap">
          <Search size={16} className="admin-search-icon" />
          <input
            type="search"
            placeholder="Tìm theo tiêu đề bài học hoặc tác giả..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="admin-search-input"
            aria-label="Tìm kiếm bài học"
          />
        </div>

        <div className="admin-filter-group" style={{ flexWrap: 'wrap', gap: '8px' }}>
          {/* Subject Filter */}
          <select
            value={subjectFilter}
            onChange={(e) => {
              setSubjectFilter(e.target.value)
              setChapterFilter('all')
              setPage(1)
            }}
            className="admin-select"
            aria-label="Lọc theo môn"
          >
            <option value="all">Tất cả môn học</option>
            {subjects.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>

          {/* Chapter Filter */}
          <select
            value={chapterFilter}
            onChange={(e) => {
              setChapterFilter(e.target.value)
              setPage(1)
            }}
            className="admin-select"
            aria-label="Lọc theo chương"
          >
            <option value="all">Tất cả chương</option>
            {chapters
              .filter((c) => subjectFilter === 'all' || c.subjectId === subjectFilter)
              .map((c) => (
                <option key={c.id} value={c.id}>
                  {c.title}
                </option>
              ))}
          </select>

          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value as 'all' | ContentStatus)
              setPage(1)
            }}
            className="admin-select"
            aria-label="Lọc theo trạng thái"
          >
            <option value="all">Tất cả trạng thái</option>
            <option value="published">Đã xuất bản</option>
            <option value="in-review">Đang kiểm duyệt</option>
            <option value="draft">Bản nháp</option>
          </select>

          {/* Page Size */}
          <select
            value={pageSize}
            onChange={(e) => {
              setPageSize(Number(e.target.value))
              setPage(1)
            }}
            className="admin-select"
            aria-label="Số bài mỗi trang"
          >
            <option value={10}>10 bài / trang</option>
            <option value={20}>20 bài / trang</option>
            <option value={50}>50 bài / trang</option>
          </select>
        </div>
      </div>

      {/* Lessons Table */}
      {loading ? (
        <div className="admin-table-container">
          {[1, 2, 3].map((i) => (
            <div key={i} style={{ padding: '16px' }}>
              <Skeleton width="100%" height="40px" />
            </div>
          ))}
        </div>
      ) : paginatedLessons.length === 0 ? (
        <EmptyState
          title="Không tìm thấy bài học nào"
          description="Thử thay đổi bộ lọc hoặc tạo bài học mới cho chương trình này."
          icon={FileText}
          actionLabel="Tạo bài học"
          onAction={() => setIsCreateOpen(true)}
        />
      ) : (
        <div className="staff-table-wrapper">
          <table className="staff-table" aria-label="Bảng danh sách bài học">
            <thead>
              <tr>
                <th>Tên bài học</th>
                <th>Môn & Chương học</th>
                <th>Tác giả</th>
                <th>Thu hoạch</th>
                <th>Trạng thái</th>
                <th style={{ textAlign: 'right' }}>Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {paginatedLessons.map((l) => (
                <tr key={l.id}>
                  <td>
                    <div style={{ fontWeight: 600, color: 'var(--text-main, #102a43)' }}>
                      {l.title}
                    </div>
                    <div style={{ fontSize: '0.72rem', color: 'var(--text-muted, #627d98)', marginTop: '2px' }}>
                      ID: {l.id} · Cập nhật: {new Date(l.updatedAt).toLocaleDateString('vi-VN')}
                    </div>
                  </td>
                  <td>
                    <div style={{ fontWeight: 500, fontSize: '0.85rem' }}>{l.subjectName}</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted, #627d98)' }}>
                      {l.chapterName}
                    </div>
                  </td>
                  <td style={{ fontSize: '0.85rem' }}>{l.authorName}</td>
                  <td>
                    {l.hasAssessment ? (
                      <span style={{ fontSize: '0.75rem', color: '#047857', fontWeight: 600 }}>
                        ✓ Đã có bài
                      </span>
                    ) : (
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-muted, #627d98)' }}>
                        Chưa gắn
                      </span>
                    )}
                  </td>
                  <td>
                    <StatusBadge status={l.status} />
                  </td>
                  <td style={{ textAlign: 'right' }}>
                    <div className="table-action-group">
                      {/* Primary Action: Open Editor */}
                      <Link
                        to={`/content/lessons/${l.id}`}
                        className="admin-btn-outline"
                        title="Mở giao diện soạn thảo bài học"
                        aria-label={`Soạn thảo ${l.title}`}
                      >
                        <ExternalLink size={13} aria-hidden />
                        <span>Soạn thảo</span>
                      </Link>

                      {/* Secondary Actions Dropdown */}
                      <div className="action-dropdown-wrap">
                        <button
                          type="button"
                          className="action-dropdown-trigger"
                          onClick={(e) => {
                            e.stopPropagation()
                            setOpenMenuId(openMenuId === l.id ? null : l.id)
                          }}
                          title="Thao tác khác"
                          aria-label={`Thao tác khác ${l.title}`}
                          aria-haspopup="true"
                          aria-expanded={openMenuId === l.id}
                        >
                          <MoreHorizontal size={15} aria-hidden />
                        </button>

                        {openMenuId === l.id && (
                          <div className="action-dropdown-menu" role="menu">
                            {l.status !== 'published' && (
                              <button
                                type="button"
                                className="action-dropdown-item"
                                role="menuitem"
                                onClick={() => {
                                  setOpenMenuId(null)
                                  handleStatusChange(l.id, 'published', l.title)
                                }}
                                aria-label={`Xuất bản ${l.title}`}
                              >
                                <Globe size={14} style={{ color: '#047857' }} aria-hidden />
                                <span>Xuất bản ngay</span>
                              </button>
                            )}

                            {l.status === 'draft' && (
                              <button
                                type="button"
                                className="action-dropdown-item"
                                role="menuitem"
                                onClick={() => {
                                  setOpenMenuId(null)
                                  handleStatusChange(l.id, 'in-review', l.title)
                                }}
                                aria-label={`Gửi duyệt ${l.title}`}
                              >
                                <Send size={14} style={{ color: '#b45309' }} aria-hidden />
                                <span>Gửi kiểm duyệt</span>
                              </button>
                            )}

                            {l.status === 'published' && (
                              <button
                                type="button"
                                className="action-dropdown-item"
                                role="menuitem"
                                onClick={() => {
                                  setOpenMenuId(null)
                                  handleStatusChange(l.id, 'draft', l.title)
                                }}
                                aria-label={`Chuyển nháp ${l.title}`}
                              >
                                <FileEdit size={14} style={{ color: '#475569' }} aria-hidden />
                                <span>Chuyển về nháp</span>
                              </button>
                            )}

                            <div className="action-dropdown-divider" />

                            <button
                              type="button"
                              className="action-dropdown-item danger"
                              role="menuitem"
                              onClick={() => {
                                setOpenMenuId(null)
                                handleDelete(l.id, l.title)
                              }}
                              aria-label={`Xóa ${l.title}`}
                            >
                              <Trash2 size={14} aria-hidden />
                              <span>Xóa bài học</span>
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Pagination Bar */}
          <div className="admin-pagination-bar">
            <div>
              Hiển thị <strong>{(page - 1) * pageSize + 1}</strong> -{' '}
              <strong>{Math.min(page * pageSize, totalCount)}</strong> trên tổng số{' '}
              <strong>{totalCount}</strong> bài học
            </div>
            <div className="admin-pagination-controls">
              <button
                type="button"
                className="admin-page-btn"
                disabled={page <= 1}
                onClick={() => setPage((p) => p - 1)}
                aria-label="Trang trước"
              >
                <ChevronLeft size={16} />
              </button>
              {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
                <button
                  key={p}
                  type="button"
                  className={`admin-page-btn ${p === page ? 'active' : ''}`}
                  onClick={() => setPage(p)}
                >
                  {p}
                </button>
              ))}
              <button
                type="button"
                className="admin-page-btn"
                disabled={page >= totalPages}
                onClick={() => setPage((p) => p + 1)}
                aria-label="Trang sau"
              >
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Create Lesson Dialog */}
      {isCreateOpen && (
        <div className="admin-dialog-backdrop" onClick={() => setIsCreateOpen(false)}>
          <div
            className="admin-dialog-card admin-form-dialog"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-labelledby="dialog-lesson-title"
          >
            <div className="admin-dialog-header">
              <div style={{ display: 'flex', alignItems: 'center' }}>
                <span className="admin-form-icon-wrap">
                  <FileText size={16} />
                </span>
                <h2 id="dialog-lesson-title" className="admin-dialog-title">
                  Tạo bài học mới
                </h2>
              </div>
              <button
                type="button"
                className="admin-dialog-close"
                onClick={() => setIsCreateOpen(false)}
                aria-label="Đóng"
              >
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleCreate}>
              <div className="admin-dialog-body admin-form-body">
                {formError && (
                  <div
                    style={{
                      padding: '8px 12px',
                      borderRadius: '6px',
                      background: 'rgba(220, 38, 38, 0.1)',
                      color: '#dc2626',
                      fontSize: '0.82rem',
                    }}
                  >
                    {formError}
                  </div>
                )}

                <div className="admin-form-group">
                  <label htmlFor="form-lesson-name" className="admin-form-label">
                    Tên bài học *
                  </label>
                  <input
                    id="form-lesson-name"
                    type="text"
                    required
                    value={formTitle}
                    onChange={(e) => setFormTitle(e.target.value)}
                    placeholder="Ví dụ: Cực trị của hàm số, Định luật Ôm..."
                    className="admin-input"
                  />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <div className="admin-form-group">
                    <label htmlFor="form-lesson-subj" className="admin-form-label">
                      Môn học *
                    </label>
                    <select
                      id="form-lesson-subj"
                      value={formSubjectId}
                      onChange={(e) => {
                        const newSubj = e.target.value
                        setFormSubjectId(newSubj)
                        const firstCh = chapters.find((c) => c.subjectId === newSubj)
                        if (firstCh) setFormChapterId(firstCh.id)
                      }}
                      className="admin-select"
                      style={{ width: '100%' }}
                    >
                      {subjects.map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="admin-form-group">
                    <label htmlFor="form-lesson-ch" className="admin-form-label">
                      Chương học *
                    </label>
                    <select
                      id="form-lesson-ch"
                      value={formChapterId}
                      onChange={(e) => setFormChapterId(e.target.value)}
                      className="admin-select"
                      style={{ width: '100%' }}
                    >
                      {availableChapters.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.title}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <div className="admin-form-group">
                    <label htmlFor="form-lesson-author" className="admin-form-label">
                      Tác giả / Giáo viên biên soạn
                    </label>
                    <input
                      id="form-lesson-author"
                      type="text"
                      value={formAuthor}
                      onChange={(e) => setFormAuthor(e.target.value)}
                      className="admin-input"
                    />
                  </div>

                  <div className="admin-form-group">
                    <label htmlFor="form-lesson-status" className="admin-form-label">
                      Trạng thái ban đầu
                    </label>
                    <select
                      id="form-lesson-status"
                      value={formStatus}
                      onChange={(e) => setFormStatus(e.target.value as ContentStatus)}
                      className="admin-select"
                      style={{ width: '100%' }}
                    >
                      <option value="draft">Bản nháp (Draft)</option>
                      <option value="in-review">Gửi duyệt (In-review)</option>
                      <option value="published">Xuất bản ngay (Published)</option>
                    </select>
                  </div>
                </div>
              </div>

              <div className="admin-dialog-footer">
                <button
                  type="button"
                  className="admin-btn-secondary"
                  onClick={() => setIsCreateOpen(false)}
                >
                  Hủy
                </button>
                <button type="submit" className="admin-btn-primary">
                  Tạo bài học
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

import React, { useEffect, useState, useCallback, useMemo } from 'react'
import {
  Layers,
  Plus,
  ArrowUp,
  ArrowDown,
  Edit2,
  Trash2,
  CheckCircle2,
  X,
  Search,
  BookOpen,
  ArrowRight,
  Eye,
  EyeOff,
  AlertTriangle,
  FileText,
  Clock,
} from 'lucide-react'
import { Link, useSearchParams } from 'react-router-dom'
import { educationService } from '@/services/education.service'
import type { CurriculumChapterItem, CurriculumSubjectItem, ContentStatus } from '@/types/education'
import { Skeleton } from '@/components/ui/Skeleton'
import { EmptyState } from '@/components/ui/EmptyState'
import { Breadcrumb } from '@/components/ui/Breadcrumb'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import './ContentChaptersPage.css'

export const ContentChaptersPage: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams()
  const initialSubject = searchParams.get('subject') || searchParams.get('subjectId') || 'all'

  const [subjects, setSubjects] = useState<CurriculumSubjectItem[]>([])
  const [selectedSubjectId, setSelectedSubjectId] = useState<string>(initialSubject)
  const [chapters, setChapters] = useState<CurriculumChapterItem[]>([])
  const [loading, setLoading] = useState(true)
  const [toastMessage, setToastMessage] = useState<string | null>(null)

  // Filters
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all')

  // Create / Edit Modal State
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingChapter, setEditingChapter] = useState<CurriculumChapterItem | null>(null)
  const [formSubjectId, setFormSubjectId] = useState<string>('')
  const [formTitle, setFormTitle] = useState('')
  const [formDescription, setFormDescription] = useState('')
  const [formOrder, setFormOrder] = useState<number>(1)
  const [formStatus, setFormStatus] = useState<ContentStatus>('published')
  const [formError, setFormError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Delete State
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false)
  const [safetyAlertOpen, setSafetyAlertOpen] = useState(false)
  const [targetChapter, setTargetChapter] = useState<CurriculumChapterItem | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)

  const showToast = (msg: string) => {
    setToastMessage(msg)
    setTimeout(() => setToastMessage(null), 3000)
  }

  // Load subjects and chapters
  const loadData = useCallback(async () => {
    setLoading(true)
    try {
      const [subjList, chList] = await Promise.all([
        educationService.getSubjects(),
        educationService.getChapters(selectedSubjectId !== 'all' ? selectedSubjectId : undefined),
      ])
      setSubjects(subjList)
      setChapters(chList)

      // Sync form subject ID
      if (subjList.length > 0) {
        setFormSubjectId((prev) => prev || (selectedSubjectId !== 'all' ? selectedSubjectId : subjList[0].id))
      }
    } catch {
      showToast('Lỗi khi tải danh sách chương học.')
    } finally {
      setLoading(false)
    }
  }, [selectedSubjectId])

  useEffect(() => {
    loadData()
  }, [loadData])

  // Subject filter change
  const handleSubjectChange = (newSubj: string) => {
    setSelectedSubjectId(newSubj)
    if (newSubj === 'all') {
      searchParams.delete('subject')
      searchParams.delete('subjectId')
      setSearchParams(searchParams)
    } else {
      setSearchParams({ subject: newSubj })
    }
  }

  // Current Subject detail
  const currentSubject = useMemo(() => {
    if (selectedSubjectId === 'all') return null
    return subjects.find((s) => s.id === selectedSubjectId) || null
  }, [subjects, selectedSubjectId])

  // Filtered chapters list
  const filteredChapters = useMemo(() => {
    return chapters.filter((ch) => {
      // Status filter
      if (statusFilter === 'active' && ch.status !== 'published') return false
      if (statusFilter === 'inactive' && ch.status === 'published') return false

      // Search filter
      if (searchQuery.trim()) {
        const term = searchQuery.trim().toLowerCase()
        const matchTitle = ch.title.toLowerCase().includes(term)
        const matchDesc = (ch.description || '').toLowerCase().includes(term)
        const matchId = ch.id.toLowerCase().includes(term)
        if (!matchTitle && !matchDesc && !matchId) return false
      }

      return true
    })
  }, [chapters, statusFilter, searchQuery])

  // KPIs calculation
  const totalChapters = chapters.length
  const activeChapters = chapters.filter((c) => c.status === 'published').length
  const inactiveChapters = chapters.filter((c) => c.status !== 'published').length
  const totalLessons = chapters.reduce((sum, c) => sum + (c.lessonsCount || 0), 0)

  // Open Create Modal
  const openCreateModal = () => {
    setEditingChapter(null)
    const effectiveSubjectId = selectedSubjectId !== 'all' ? selectedSubjectId : (subjects[0]?.id || 'math')
    setFormSubjectId(effectiveSubjectId)
    setFormTitle('')
    setFormDescription('')
    const nextOrder = chapters.filter((c) => selectedSubjectId === 'all' || c.subjectId === selectedSubjectId).length + 1
    setFormOrder(nextOrder)
    setFormStatus('published')
    setFormError(null)
    setIsModalOpen(true)
  }

  // Open Edit Modal
  const openEditModal = (ch: CurriculumChapterItem) => {
    setEditingChapter(ch)
    setFormSubjectId(ch.subjectId)
    setFormTitle(ch.title)
    setFormDescription(ch.description || '')
    setFormOrder(ch.order)
    setFormStatus(ch.status)
    setFormError(null)
    setIsModalOpen(true)
  }

  // Submit Modal (Create or Update)
  const handleSubmitModal = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formTitle.trim()) {
      setFormError('Vui lòng nhập tên chương học.')
      return
    }

    setIsSubmitting(true)
    setFormError(null)
    try {
      const subj = subjects.find((s) => s.id === formSubjectId)
      const subjectName = subj ? subj.name : 'Toán học 12'

      if (editingChapter) {
        await educationService.updateChapter(editingChapter.id, {
          subjectId: formSubjectId,
          subjectName,
          title: formTitle.trim(),
          description: formDescription.trim(),
          order: Number(formOrder) || 1,
          status: formStatus,
        })
        showToast(`Đã cập nhật chương: "${formTitle.trim()}"`)
      } else {
        await educationService.createChapter({
          subjectId: formSubjectId,
          subjectName,
          title: formTitle.trim(),
          description: formDescription.trim(),
          order: Number(formOrder) || 1,
          status: formStatus,
        })
        showToast(`Đã thêm chương mới: "${formTitle.trim()}"`)
      }

      setIsModalOpen(false)
      await loadData()
    } catch (err: any) {
      setFormError(err?.message || 'Có lỗi xảy ra khi lưu chương học.')
    } finally {
      setIsSubmitting(false)
    }
  }

  // Toggle Publish / Draft
  const handleToggleStatus = async (ch: CurriculumChapterItem) => {
    const nextStatus: ContentStatus = ch.status === 'published' ? 'draft' : 'published'
    try {
      await educationService.updateChapter(ch.id, { status: nextStatus })
      showToast(nextStatus === 'published' ? `Đã hiển thị chương: "${ch.title}"` : `Đã tạm ẩn chương: "${ch.title}"`)
      await loadData()
    } catch {
      showToast('Không thể cập nhật trạng thái chương.')
    }
  }

  const isFilterActive = searchQuery.trim().length > 0 || statusFilter !== 'all'
  const isReorderAllowed = selectedSubjectId !== 'all' && !isFilterActive

  // Reorder Up / Down
  const handleMoveOrder = async (ch: CurriculumChapterItem, direction: 'up' | 'down') => {
    if (selectedSubjectId === 'all' || isFilterActive) {
      showToast('Chỉ cho phép sắp xếp thứ tự khi chọn một môn học cụ thể và không áp dụng bộ lọc.')
      return
    }

    // Get all chapters for this subject sorted by order
    const subjectChapters = chapters
      .filter((c) => c.subjectId === selectedSubjectId)
      .sort((a, b) => a.order - b.order)

    const currentIndex = subjectChapters.findIndex((c) => c.id === ch.id)
    if (currentIndex === -1) return

    const targetIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1
    if (targetIndex < 0 || targetIndex >= subjectChapters.length) return

    const newOrderList = [...subjectChapters]
    const temp = newOrderList[currentIndex]
    newOrderList[currentIndex] = newOrderList[targetIndex]
    newOrderList[targetIndex] = temp

    // Build ordered IDs list for the entire subject
    const orderedIds = newOrderList.map((c) => c.id)

    try {
      await educationService.reorderChapters(selectedSubjectId, orderedIds)
      showToast('Đã cập nhật thứ tự chương giảng dạy')
      await loadData()
    } catch (err: any) {
      showToast(err?.message || 'Không thể cập nhật thứ tự chương.')
    }
  }

  // Delete Click: Check if chapter has lessons
  const handleDeleteClick = (ch: CurriculumChapterItem) => {
    setTargetChapter(ch)
    if (ch.lessonsCount > 0) {
      // Cannot delete if chapter contains lessons
      setSafetyAlertOpen(true)
    } else {
      // Empty chapter: confirm deletion
      setDeleteConfirmOpen(true)
    }
  }

  // Confirm delete for empty chapter
  const handleConfirmDelete = async () => {
    if (!targetChapter) return
    setIsDeleting(true)
    try {
      await educationService.deleteChapter(targetChapter.id)
      showToast(`Đã xóa chương "${targetChapter.title}" thành công.`)
      setDeleteConfirmOpen(false)
      setTargetChapter(null)
      await loadData()
    } catch (err: any) {
      showToast(err?.message || 'Lỗi khi xóa chương học.')
    } finally {
      setIsDeleting(false)
    }
  }

  return (
    <div className="content-chapters-root" role="main" aria-label="Trang quản lý chương học">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="content-toast-notification" role="status" aria-live="polite">
          <CheckCircle2 size={18} color="#10b981" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Breadcrumb Navigation */}
      <Breadcrumb
        items={[
          { label: 'Quản lý nội dung', to: '/content' },
          { label: 'Môn học', to: '/content/subjects' },
          ...(currentSubject
            ? [{ label: currentSubject.name, to: `/content/subjects/${currentSubject.id}` }]
            : []),
          { label: 'Chương học' },
        ]}
      />

      {/* Page Header */}
      <div className="content-chapters-header">
        <div className="chapters-header-left">
          <div className="chapters-header-icon-box" aria-hidden="true">
            <BookOpen size={24} />
          </div>
          <div>
            <div className="chapters-header-title-row">
              <h1 className="chapters-header-title">Quản lý chương học</h1>
              {currentSubject?.grade && (
                <span className="chapters-grade-badge">Khối {currentSubject.grade}</span>
              )}
            </div>
            <p className="chapters-header-desc">
              {currentSubject ? (
                <>
                  Môn học:{' '}
                  <strong style={{ color: 'var(--evon-ch-text-main)' }}>{currentSubject.name}</strong>{' '}
                  &bull; Quản lý cấu trúc chương, thứ tự chuyên đề và bài giảng trực thuộc
                </>
              ) : (
                'Quản lý cấu trúc chương học, thứ tự giảng dạy và số lượng bài học theo từng môn.'
              )}
            </p>
          </div>
        </div>

        <button
          type="button"
          className="btn-evon-primary"
          onClick={openCreateModal}
          aria-label="Thêm chương học"
        >
          <Plus size={18} />
          <span>Thêm chương học</span>
        </button>
      </div>

      {/* 4 KPIs Summary Strip */}
      <div className="chapters-kpi-grid" aria-label="Thống kê nhanh chương học">
        <div className="chapters-kpi-card">
          <div className="kpi-icon-circle" style={{ background: '#f5f3ff', color: '#7c3aed' }}>
            <Layers size={22} />
          </div>
          <div className="kpi-data">
            <span className="kpi-value">{totalChapters}</span>
            <span className="kpi-label">Tổng số chương</span>
          </div>
        </div>

        <div className="chapters-kpi-card">
          <div className="kpi-icon-circle" style={{ background: '#ecfdf5', color: '#059669' }}>
            <CheckCircle2 size={22} />
          </div>
          <div className="kpi-data">
            <span className="kpi-value" style={{ color: '#059669' }}>
              {activeChapters}
            </span>
            <span className="kpi-label">Đang hoạt động</span>
          </div>
        </div>

        <div className="chapters-kpi-card">
          <div className="kpi-icon-circle" style={{ background: '#fffbeb', color: '#d97706' }}>
            <EyeOff size={22} />
          </div>
          <div className="kpi-data">
            <span className="kpi-value" style={{ color: '#d97706' }}>
              {inactiveChapters}
            </span>
            <span className="kpi-label">Tạm ẩn / Bản nháp</span>
          </div>
        </div>

        <div className="chapters-kpi-card">
          <div className="kpi-icon-circle" style={{ background: '#f0f9ff', color: '#0284c7' }}>
            <FileText size={22} />
          </div>
          <div className="kpi-data">
            <span className="kpi-value" style={{ color: '#0284c7' }}>
              {totalLessons}
            </span>
            <span className="kpi-label">Tổng bài học</span>
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="chapters-filter-container">
        <div className="chapters-filter-left">
          {/* Subject Filter */}
          <div className="chapters-select-group">
            <label htmlFor="chapter-subject-select" className="chapters-select-label">
              Môn học áp dụng
            </label>
            <select
              id="chapter-subject-select"
              value={selectedSubjectId}
              onChange={(e) => handleSubjectChange(e.target.value)}
              className="chapters-select"
              aria-label="Chọn môn học để xem chương"
            >
              <option value="all">Tất cả môn học ({subjects.length})</option>
              {subjects.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name} {s.grade ? `(Khối ${s.grade})` : `(${s.code})`}
                </option>
              ))}
            </select>
          </div>

          {/* Status Filter */}
          <div className="chapters-select-group">
            <label htmlFor="chapter-status-select" className="chapters-select-label">
              Trạng thái
            </label>
            <select
              id="chapter-status-select"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as any)}
              className="chapters-select"
              style={{ minWidth: 170 }}
              aria-label="Lọc theo trạng thái"
            >
              <option value="all">Tất cả trạng thái</option>
              <option value="active">Đang hoạt động</option>
              <option value="inactive">Tạm ẩn</option>
            </select>
          </div>
        </div>

        {/* Search Box */}
        <div className="chapters-search-group">
          <Search size={16} color="#94a3b8" />
          <input
            type="text"
            placeholder="Tìm theo tên chương học..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            aria-label="Tìm kiếm chương học"
          />
        </div>
      </div>

      {/* ===================================================================== */}
      {/* VERTICAL ORDERED CARD STACK (PHƯƠNG ÁN A)                              */}
      {/* ===================================================================== */}
      <div className="sr-only" aria-hidden="true">
        <span>Tên chương học</span>
        <span>Số bài học</span>
      </div>

      {loading ? (
        <div className="chapters-stack">
          {[1, 2, 3].map((i) => (
            <div key={i} style={{ marginBottom: 12 }}>
              <Skeleton width="100%" height="96px" />
            </div>
          ))}
        </div>
      ) : filteredChapters.length === 0 ? (
        <EmptyState
          title={selectedSubjectId !== 'all' ? 'Không tìm thấy chương học phù hợp' : 'Chưa có chương học nào'}
          description={
            searchQuery
              ? 'Không có chương nào khớp với từ khóa tìm kiếm của bạn.'
              : 'Hãy thêm chương học mới cho môn học này để bắt đầu xây dựng bài giảng.'
          }
          icon={Layers}
          actionLabel="Thêm chương học mới"
          onAction={openCreateModal}
        />
      ) : (
        <div className="chapters-stack" role="list" aria-label="Danh sách chương học dạng thẻ dọc">
          {filteredChapters.map((ch, idx) => {
            const subject = subjects.find((s) => s.id === ch.subjectId)
            const isInactive = ch.status !== 'published'
            const displayOrder = idx + 1
            const formattedOrder = displayOrder < 10 ? `0${displayOrder}` : `${displayOrder}`

            return (
              <div
                key={ch.id}
                className={`chapter-card-item ${isInactive ? 'is-inactive' : ''}`}
                role="listitem"
              >
                {/* Main Information (Left & Center) */}
                <div className="chapter-main-info">
                  {/* Order column */}
                  <div className="chapter-order-col">
                    <div className="chapter-order-pill" title={`Thứ tự giảng dạy #${ch.order}`}>
                      {formattedOrder}
                    </div>
                    {/* Reorder Arrows */}
                    <div className="chapter-order-btns">
                      <button
                        type="button"
                        className="btn-order-arrow"
                        disabled={!isReorderAllowed || idx === 0}
                        onClick={() => handleMoveOrder(ch, 'up')}
                        title={
                          !isReorderAllowed
                            ? 'Chỉ sắp xếp thứ tự khi chọn một môn học cụ thể và không áp dụng bộ lọc'
                            : 'Di chuyển lên trên'
                        }
                        aria-label={`Di chuyển chương "${ch.title}" lên trên`}
                      >
                        <ArrowUp size={13} />
                      </button>
                      <button
                        type="button"
                        className="btn-order-arrow"
                        disabled={!isReorderAllowed || idx === filteredChapters.length - 1}
                        onClick={() => handleMoveOrder(ch, 'down')}
                        title={
                          !isReorderAllowed
                            ? 'Chỉ sắp xếp thứ tự khi chọn một môn học cụ thể và không áp dụng bộ lọc'
                            : 'Di chuyển xuống dưới'
                        }
                        aria-label={`Di chuyển chương "${ch.title}" xuống dưới`}
                      >
                        <ArrowDown size={13} />
                      </button>
                    </div>
                  </div>

                  {/* Details */}
                  <div className="chapter-details">
                    <div className="chapter-title-row">
                      <h2
                        className="chapter-title-text"
                        onClick={() => openEditModal(ch)}
                        title="Bấm để chỉnh sửa chi tiết chương"
                      >
                        {ch.title}
                      </h2>
                      <span
                        className={`chapter-status-pill ${ch.status === 'published' ? 'is-active' : 'is-inactive'}`}
                      >
                        {ch.status === 'published' ? 'Đang hoạt động' : 'Tạm ẩn (Bản nháp)'}
                      </span>
                    </div>

                    {ch.description && <p className="chapter-desc-text">{ch.description}</p>}

                    {/* Metadata */}
                    <div className="chapter-meta-row">
                      <span className="chapter-meta-badge">
                        <BookOpen size={13} />
                        {ch.lessonsCount || 0} bài học
                      </span>
                      <span>&bull;</span>
                      <span>
                        Môn học:{' '}
                        <strong style={{ color: '#334155' }}>
                          {subject ? subject.name : ch.subjectName || ch.subjectId}
                        </strong>
                      </span>
                      {subject?.grade && (
                        <>
                          <span>&bull;</span>
                          <span>Khối: {subject.grade}</span>
                        </>
                      )}
                      <span>&bull;</span>
                      <span className="chapter-code-tag">{ch.id}</span>
                      {ch.updatedAt && (
                        <>
                          <span>&bull;</span>
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                            <Clock size={12} />
                            {new Date(ch.updatedAt).toLocaleDateString('vi-VN')}
                          </span>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                {/* Action Buttons Group (Right) */}
                <div className="chapter-actions-group">
                  {/* 1. Quản lý bài học (Primary Purple) */}
                  <Link
                    to={`/content/lessons?subjectId=${ch.subjectId}&chapterId=${ch.id}`}
                    className="btn-card-manage-lessons"
                    title={`Quản lý danh sách bài học thuộc chương ${ch.title}`}
                  >
                    <span>Quản lý bài học</span>
                    <ArrowRight size={14} />
                  </Link>

                  {/* 2. Sửa */}
                  <button
                    type="button"
                    className="btn-card-action"
                    onClick={() => openEditModal(ch)}
                    title="Chỉnh sửa thông tin chương"
                    aria-label={`Chỉnh sửa chương ${ch.title}`}
                  >
                    <Edit2 size={13} color="#64748b" />
                    <span>Sửa</span>
                  </button>

                  {/* 3. Ẩn / Hiện (Toggle) */}
                  <button
                    type="button"
                    className={`btn-card-action ${ch.status === 'published' ? 'btn-toggle-active' : 'btn-toggle-inactive'}`}
                    onClick={() => handleToggleStatus(ch)}
                    title={ch.status === 'published' ? 'Ẩn chương khỏi học sinh' : 'Hiển thị chương cho học sinh'}
                    aria-label={ch.status === 'published' ? `Ẩn chương ${ch.title}` : `Hiện chương ${ch.title}`}
                  >
                    {ch.status === 'published' ? (
                      <>
                        <EyeOff size={13} />
                        <span>Ẩn</span>
                      </>
                    ) : (
                      <>
                        <Eye size={13} />
                        <span>Hiện</span>
                      </>
                    )}
                  </button>

                  {/* 4. Xóa */}
                  <button
                    type="button"
                    className="btn-card-action btn-danger"
                    onClick={() => handleDeleteClick(ch)}
                    title="Xóa chương học"
                    aria-label={`Xóa chương ${ch.title}`}
                  >
                    <Trash2 size={13} />
                    <span>Xóa</span>
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* ===================================================================== */}
      {/* MODAL THÊM / CẬP NHẬT CHƯƠNG HỌC                                      */}
      {/* ===================================================================== */}
      {isModalOpen && (
        <div className="chapter-modal-backdrop" onClick={() => setIsModalOpen(false)}>
          <div
            className="chapter-modal-card"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-labelledby="modal-chapter-heading"
          >
            <div className="chapter-modal-header">
              <div>
                <h2 id="modal-chapter-heading">
                  {editingChapter ? 'Chỉnh sửa chương học' : 'Thêm chương học mới'}
                </h2>
                <p>
                  {editingChapter
                    ? 'Cập nhật tên, mục tiêu và trạng thái của chương'
                    : 'Khởi tạo chương học mới trong cấu trúc chương trình giáo dục'}
                </p>
              </div>
              <button
                type="button"
                className="chapter-modal-close"
                onClick={() => setIsModalOpen(false)}
                aria-label="Đóng modal"
              >
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleSubmitModal}>
              <div className="chapter-modal-body">
                {formError && (
                  <div
                    style={{
                      background: '#fef2f2',
                      border: '1px solid #fecdd3',
                      color: '#b91c1c',
                      padding: '10px 14px',
                      borderRadius: '12px',
                      fontSize: '0.825rem',
                    }}
                  >
                    {formError}
                  </div>
                )}

                {/* Môn học áp dụng */}
                <div className="modal-form-group">
                  <label htmlFor="form-chapter-subject" className="modal-form-label">
                    Môn học áp dụng <span className="required-star">*</span>
                  </label>
                  <select
                    id="form-chapter-subject"
                    value={formSubjectId}
                    onChange={(e) => setFormSubjectId(e.target.value)}
                    className="modal-form-select"
                    disabled={!!editingChapter}
                    required
                  >
                    {subjects.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name} {s.grade ? `(Khối ${s.grade})` : `(${s.code})`}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Tên chương học */}
                <div className="modal-form-group">
                  <label htmlFor="form-chapter-title" className="modal-form-label">
                    Tên chương học <span className="required-star">*</span>
                  </label>
                  <input
                    id="form-chapter-title"
                    type="text"
                    required
                    value={formTitle}
                    onChange={(e) => setFormTitle(e.target.value)}
                    placeholder="Ví dụ: Chương 1: Ứng dụng đạo hàm để khảo sát hàm số..."
                    className="modal-form-input"
                  />
                </div>

                {/* Thứ tự giảng dạy */}
                <div className="modal-form-group">
                  <label htmlFor="form-chapter-order" className="modal-form-label">
                    Thứ tự hiển thị (Vị trí) <span className="required-star">*</span>
                  </label>
                  <input
                    id="form-chapter-order"
                    type="number"
                    min={1}
                    required
                    value={formOrder}
                    onChange={(e) => setFormOrder(Number(e.target.value))}
                    className="modal-form-input"
                    style={{ maxWidth: 140 }}
                  />
                </div>

                {/* Mô tả mục tiêu kiến thức */}
                <div className="modal-form-group">
                  <label htmlFor="form-chapter-desc" className="modal-form-label">
                    Mô tả mục tiêu kiến thức (Không bắt buộc)
                  </label>
                  <textarea
                    id="form-chapter-desc"
                    rows={3}
                    value={formDescription}
                    onChange={(e) => setFormDescription(e.target.value)}
                    placeholder="Tóm tắt trọng tâm lý thuyết và kỹ năng đầu ra của chương..."
                    className="modal-form-textarea"
                  />
                </div>

                {/* Trạng thái phát hành */}
                <div className="modal-form-group">
                  <label className="modal-form-label">Trạng thái phát hành</label>
                  <div className="modal-radio-grid">
                    <label
                      className={`modal-radio-card ${formStatus === 'published' ? 'is-selected' : ''}`}
                    >
                      <input
                        type="radio"
                        name="form_chapter_status"
                        value="published"
                        checked={formStatus === 'published'}
                        onChange={() => setFormStatus('published')}
                      />
                      <div>
                        <div style={{ fontSize: '0.825rem', fontWeight: 700, color: '#0f172a' }}>
                          Đang hoạt động
                        </div>
                        <div style={{ fontSize: '0.725rem', color: '#64748b' }}>
                          Hiển thị cho học sinh
                        </div>
                      </div>
                    </label>

                    <label
                      className={`modal-radio-card ${formStatus === 'draft' ? 'is-selected' : ''}`}
                    >
                      <input
                        type="radio"
                        name="form_chapter_status"
                        value="draft"
                        checked={formStatus === 'draft'}
                        onChange={() => setFormStatus('draft')}
                      />
                      <div>
                        <div style={{ fontSize: '0.825rem', fontWeight: 700, color: '#0f172a' }}>
                          Tạm ẩn (Bản nháp)
                        </div>
                        <div style={{ fontSize: '0.725rem', color: '#64748b' }}>
                          Chỉ quản trị viên thấy
                        </div>
                      </div>
                    </label>
                  </div>
                </div>
              </div>

              <div className="chapter-modal-footer">
                <button
                  type="button"
                  className="btn-modal-cancel"
                  onClick={() => setIsModalOpen(false)}
                  disabled={isSubmitting}
                >
                  Hủy bỏ
                </button>
                <button
                  type="submit"
                  className="btn-modal-submit"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? 'Đang lưu...' : editingChapter ? 'Lưu thay đổi' : 'Thêm chương học'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ===================================================================== */}
      {/* DIALOG CẢNH BÁO CHẶN XÓA (KHI CHƯƠNG ĐANG CÓ BÀI HỌC)                   */}
      {/* ===================================================================== */}
      {safetyAlertOpen && targetChapter && (
        <div className="chapter-modal-backdrop" onClick={() => setSafetyAlertOpen(false)}>
          <div
            className="chapter-modal-card"
            style={{ maxWidth: 460 }}
            onClick={(e) => e.stopPropagation()}
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="safety-alert-title"
          >
            <div className="chapter-modal-header" style={{ alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div
                  style={{
                    width: 40,
                    height: 40,
                    borderRadius: 12,
                    background: '#fffbeb',
                    color: '#d97706',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <AlertTriangle size={22} />
                </div>
                <div>
                  <h2 id="safety-alert-title" style={{ fontSize: '1.1rem' }}>
                    Không thể xóa chương học
                  </h2>
                  <p style={{ color: '#d97706', fontWeight: 600 }}>Quy tắc toàn vẹn dữ liệu</p>
                </div>
              </div>
              <button
                type="button"
                className="chapter-modal-close"
                onClick={() => setSafetyAlertOpen(false)}
                aria-label="Đóng"
              >
                <X size={16} />
              </button>
            </div>

            <div className="chapter-modal-body" style={{ gap: 12 }}>
              <p style={{ fontSize: '0.875rem', color: '#334155', margin: 0 }}>
                Chương <strong>"{targetChapter.title}"</strong> hiện đang chứa:
              </p>

              <div className="safety-warning-box">
                <BookOpen size={18} style={{ flexShrink: 0, marginTop: 2 }} />
                <div>
                  <strong>{targetChapter.lessonsCount} bài giảng đang hoạt động.</strong>
                  <div style={{ marginTop: 4 }}>
                    Hệ thống không cho phép xóa chương khi còn chứa bài giảng trực thuộc. Vui lòng di
                    chuyển hoặc xóa toàn bộ bài học trước khi thực hiện xóa chương.
                  </div>
                </div>
              </div>
            </div>

            <div className="chapter-modal-footer">
              <button
                type="button"
                className="btn-modal-cancel"
                style={{ width: '100%', textAlign: 'center' }}
                onClick={() => setSafetyAlertOpen(false)}
              >
                Đã hiểu & Quay lại
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ===================================================================== */}
      {/* DIALOG XÁC NHẬN XÓA (KHI CHƯƠNG RỖNG - 0 BÀI HỌC)                     */}
      {/* ===================================================================== */}
      <ConfirmDialog
        isOpen={deleteConfirmOpen}
        title="Xác nhận xóa chương học"
        message={`Bạn có chắc chắn muốn xóa chương "${targetChapter?.title}"? Hành động này sẽ xóa vĩnh viễn chương học và không thể hoàn tác.`}
        confirmText="Xác nhận xóa"
        cancelText="Hủy bỏ"
        variant="danger"
        isLoading={isDeleting}
        onConfirm={handleConfirmDelete}
        onCancel={() => {
          setDeleteConfirmOpen(false)
          setTargetChapter(null)
        }}
      />
    </div>
  )
}

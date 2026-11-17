import React, { useEffect, useState, useCallback, useMemo } from 'react'
import {
  Plus,
  Search,
  Layers,
  BookOpen,
  Edit2,
  Trash2,
  CheckCircle2,
  X,
  ArrowRight,
  Eye,
  EyeOff,
  AlertCircle,
  RotateCcw,
} from 'lucide-react'
import { Link } from 'react-router-dom'
import { educationService } from '@/services/education.service'
import type { CurriculumSubjectItem, ContentStatus } from '@/types/education'
import { Breadcrumb } from '@/components/ui/Breadcrumb'
import { Skeleton } from '@/components/ui/Skeleton'
import { EmptyState } from '@/components/ui/EmptyState'
import { PageErrorState } from '@/components/ui/PageErrorState'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import {
  SubjectIconSvg,
  SUBJECT_ICON_OPTIONS,
  resolveSubjectIcon,
  extractDescriptionText,
  packDescriptionWithIcon,
  type SubjectIconType,
} from '@/components/subjects/SubjectIconSvg'
import './ContentSubjectsPage.css'

export const ContentSubjectsPage: React.FC = () => {
  const [subjects, setSubjects] = useState<CurriculumSubjectItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [gradeFilter, setGradeFilter] = useState('all')
  const [statusFilter, setStatusFilter] = useState<'all' | ContentStatus>('all')
  const [toastMessage, setToastMessage] = useState<string | null>(null)
  const [toastType, setToastType] = useState<'success' | 'error'>('success')

  // Modal State
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingSubject, setEditingSubject] = useState<CurriculumSubjectItem | null>(null)
  const [formName, setFormName] = useState('')
  const [formCode, setFormCode] = useState('')
  const [formGrade, setFormGrade] = useState('12')
  const [formIcon, setFormIcon] = useState<SubjectIconType>('math')
  const [formDescription, setFormDescription] = useState('')
  const [formStatus, setFormStatus] = useState<ContentStatus>('published')
  const [formError, setFormError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Delete Confirm State
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false)
  const [deletingSubject, setDeletingSubject] = useState<{ id: string; name: string } | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)

  const showToast = (msg: string, type: 'success' | 'error' = 'success') => {
    setToastMessage(msg)
    setToastType(type)
    setTimeout(() => setToastMessage(null), 3500)
  }

  // Fetch subjects from backend
  const loadData = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await educationService.getSubjects()
      setSubjects(data)
    } catch (err: any) {
      const msg = err?.data?.detail || err?.message || 'Không thể tải danh sách môn học từ máy chủ.'
      setError(msg)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadData()

    const handleDataChange = () => {
      loadData()
    }
    window.addEventListener('study_ai_education_change', handleDataChange)
    return () => {
      window.removeEventListener('study_ai_education_change', handleDataChange)
    }
  }, [loadData])

  // Lock body scroll on modal open
  useEffect(() => {
    if (isDialogOpen) {
      const orig = document.body.style.overflow
      document.body.style.overflow = 'hidden'
      return () => {
        document.body.style.overflow = orig
      }
    }
  }, [isDialogOpen])

  // Listen for Escape key to close modal
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isDialogOpen && !isSubmitting) {
        setIsDialogOpen(false)
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isDialogOpen, isSubmitting])

  // Filtered list
  const filteredSubjects = useMemo(() => {
    return subjects.filter((s) => {
      const term = search.trim().toLowerCase()
      const matchSearch =
        !term ||
        s.name.toLowerCase().includes(term) ||
        s.code.toLowerCase().includes(term) ||
        s.description.toLowerCase().includes(term)

      const matchGrade =
        gradeFilter === 'all' ||
        s.grade.replace(/[^0-9]/g, '') === gradeFilter.replace(/[^0-9]/g, '')

      const matchStatus = statusFilter === 'all' || s.status === statusFilter

      return matchSearch && matchGrade && matchStatus
    })
  }, [subjects, search, gradeFilter, statusFilter])

  // KPIs
  const totalSubjects = subjects.length
  const activeCount = subjects.filter((s) => s.status === 'published').length
  const draftCount = subjects.filter((s) => s.status === 'draft').length
  const totalLessons = subjects.reduce((sum, s) => sum + (s.lessonCount || 0), 0)

  // Open Create Modal
  const openCreateDialog = () => {
    setEditingSubject(null)
    setFormName('')
    setFormCode('')
    setFormGrade('12')
    setFormIcon('math')
    setFormDescription('')
    setFormStatus('published')
    setFormError(null)
    setIsDialogOpen(true)
  }

  // Open Edit Modal
  const openEditDialog = (s: CurriculumSubjectItem) => {
    setEditingSubject(s)
    setFormName(s.name)
    setFormCode(s.code)
    const gradeClean = s.grade ? s.grade.replace(/[^0-9]/g, '') || '12' : '12'
    setFormGrade(gradeClean)
    setFormIcon(resolveSubjectIcon(s.code, s.name, s.icon, s.description))
    setFormDescription(extractDescriptionText(s.description))
    setFormStatus(s.status || 'published')
    setFormError(null)
    setIsDialogOpen(true)
  }

  // Quick Toggle Active / Hidden
  const handleToggleStatus = async (s: CurriculumSubjectItem) => {
    const newStatus: ContentStatus = s.status === 'published' ? 'draft' : 'published'
    try {
      await educationService.updateSubject(s.id, {
        status: newStatus,
      })
      showToast(
        newStatus === 'published'
          ? `Đã kích hoạt môn học: ${s.name}`
          : `Đã tạm ẩn môn học: ${s.name}`,
        'success'
      )
      loadData()
    } catch (err: any) {
      const msg = err?.data?.detail || err?.message || 'Không thể thay đổi trạng thái môn học.'
      showToast(msg, 'error')
    }
  }

  // Form Submit Handler
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formName.trim() || !formCode.trim()) {
      setFormError('Vui lòng nhập tên môn và mã môn học.')
      return
    }

    setIsSubmitting(true)
    setFormError(null)

    const packedDesc = packDescriptionWithIcon(formDescription, formIcon)

    try {
      if (editingSubject) {
        await educationService.updateSubject(editingSubject.id, {
          name: formName.trim(),
          code: formCode.trim().toUpperCase(),
          grade: `Lớp ${formGrade}`,
          icon: formIcon,
          description: packedDesc,
          status: formStatus,
        })
        showToast(`Đã cập nhật môn học: ${formName.trim()}`, 'success')
      } else {
        await educationService.createSubject({
          name: formName.trim(),
          code: formCode.trim().toUpperCase(),
          grade: `Lớp ${formGrade}`,
          icon: formIcon,
          description: packedDesc,
          status: formStatus,
        })
        showToast(`Đã thêm môn học mới: ${formName.trim()}`, 'success')
      }
      setIsDialogOpen(false)
      loadData()
    } catch (err: any) {
      const msg = err?.data?.detail || err?.message || 'Có lỗi xảy ra khi lưu môn học. Vui lòng thử lại.'
      setFormError(msg)
    } finally {
      setIsSubmitting(false)
    }
  }

  // Delete Handlers
  const handleDeleteClick = (id: string, name: string) => {
    setDeletingSubject({ id, name })
    setDeleteConfirmOpen(true)
  }

  const handleDeleteConfirm = async () => {
    if (!deletingSubject) return
    setIsDeleting(true)
    try {
      await educationService.deleteSubject(deletingSubject.id)
      showToast(`Đã xóa môn học: ${deletingSubject.name}`, 'success')
      setDeleteConfirmOpen(false)
      setDeletingSubject(null)
      loadData()
    } catch (err: any) {
      const msg = err?.data?.detail || err?.message || 'Không thể xóa môn học do có nội dung ràng buộc.'
      showToast(msg, 'error')
      setDeleteConfirmOpen(false)
      setDeletingSubject(null)
    } finally {
      setIsDeleting(false)
    }
  }

  return (
    <div className="content-subjects-root">
      {/* Toast Notification */}
      {toastMessage && (
        <div
          className={`admin-toast-notification ${toastType === 'error' ? 'toast-error' : ''}`}
          style={{
            position: 'fixed',
            top: 24,
            right: 24,
            zIndex: 2000,
            background: toastType === 'error' ? '#fef2f2' : '#ecfdf5',
            color: toastType === 'error' ? '#991b1b' : '#065f46',
            border: `1px solid ${toastType === 'error' ? '#fca5a5' : '#a7f3d0'}`,
            padding: '12px 20px',
            borderRadius: '12px',
            boxShadow: '0 8px 24px rgba(0, 0, 0, 0.08)',
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            fontWeight: 600,
            fontSize: '0.9rem',
          }}
          role="status"
        >
          {toastType === 'error' ? (
            <AlertCircle size={20} color="#dc2626" />
          ) : (
            <CheckCircle2 size={20} color="#059669" />
          )}
          <span>{toastMessage}</span>
        </div>
      )}

      {/* 1. Breadcrumb */}
      <Breadcrumb
        items={[
          { label: 'Quản lý nội dung', to: '/content' },
          { label: 'Danh mục môn học' },
        ]}
      />

      {/* 2. Page Header */}
      <header className="content-subjects-header">
        <div className="subjects-header-text">
          <h1>Quản lý môn học</h1>
          <p>
            Quản lý khung chương trình GDPT, môn học, khối lớp và các liên kết giáo trình trên hệ thống STUDY_AI.
          </p>
        </div>
        <div className="subjects-header-actions">
          <button
            type="button"
            className="btn-evon-primary"
            onClick={openCreateDialog}
            title="Thêm môn học mới"
          >
            <Plus size={18} />
            <span>Thêm môn học</span>
          </button>
        </div>
      </header>

      {/* 3. KPI / Metrics Strip */}
      <section className="subjects-kpi-grid" aria-label="Thống kê tổng quan môn học">
        <div className="subjects-kpi-card">
          <div className="kpi-icon-circle" style={{ background: '#eef2ff', color: '#4f46e5' }}>
            <Layers size={22} />
          </div>
          <div className="kpi-data">
            <span className="kpi-value">{totalSubjects}</span>
            <span className="kpi-label">Tổng số môn</span>
          </div>
        </div>

        <div className="subjects-kpi-card">
          <div className="kpi-icon-circle" style={{ background: '#ecfdf5', color: '#059669' }}>
            <CheckCircle2 size={22} />
          </div>
          <div className="kpi-data">
            <span className="kpi-value">{activeCount}</span>
            <span className="kpi-label">Đang hoạt động</span>
          </div>
        </div>

        <div className="subjects-kpi-card">
          <div className="kpi-icon-circle" style={{ background: '#fffbeb', color: '#d97706' }}>
            <EyeOff size={22} />
          </div>
          <div className="kpi-data">
            <span className="kpi-value">{draftCount}</span>
            <span className="kpi-label">Bản nháp / Ẩn</span>
          </div>
        </div>

        <div className="subjects-kpi-card">
          <div className="kpi-icon-circle" style={{ background: '#f5f3ff', color: '#7c3aed' }}>
            <BookOpen size={22} />
          </div>
          <div className="kpi-data">
            <span className="kpi-value">{totalLessons}</span>
            <span className="kpi-label">Tổng bài học</span>
          </div>
        </div>
      </section>

      {/* 4. Search and Filter Bar */}
      <div className="subjects-filter-container">
        <div className="subjects-search-group">
          <Search size={18} color="#94a3b8" aria-hidden />
          <input
            type="search"
            placeholder="Tìm theo tên môn, mã môn..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            aria-label="Tìm kiếm môn học"
          />
        </div>

        <div className="subjects-select-filters">
          <select
            className="evon-select"
            value={gradeFilter}
            onChange={(e) => setGradeFilter(e.target.value)}
            aria-label="Lọc theo khối lớp"
          >
            <option value="all">Tất cả khối lớp</option>
            <option value="12">Lớp 12</option>
            <option value="11">Lớp 11</option>
            <option value="10">Lớp 10</option>
          </select>

          <select
            className="evon-select"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as 'all' | ContentStatus)}
            aria-label="Lọc theo trạng thái"
          >
            <option value="all">Tất cả trạng thái</option>
            <option value="published">Đang hoạt động</option>
            <option value="draft">Bản nháp / Tạm ẩn</option>
          </select>

          {(search || gradeFilter !== 'all' || statusFilter !== 'all') && (
            <button
              type="button"
              className="btn-evon-cancel"
              style={{ padding: '6px 12px', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: 4 }}
              onClick={() => {
                setSearch('')
                setGradeFilter('all')
                setStatusFilter('all')
              }}
            >
              <RotateCcw size={12} />
              <span>Đặt lại</span>
            </button>
          )}
        </div>
      </div>

      {/* 5. Main Card Grid Content */}
      {loading ? (
        <div className="subjects-card-grid">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="subject-card" style={{ minHeight: 260 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
                <Skeleton variant="rect" width={56} height={56} style={{ borderRadius: 16 }} />
                <Skeleton variant="rect" width={80} height={24} style={{ borderRadius: 8 }} />
              </div>
              <Skeleton variant="text" width="70%" height={22} style={{ marginBottom: 8 }} />
              <Skeleton variant="text" width="90%" height={14} style={{ marginBottom: 16 }} />
              <Skeleton variant="rect" width="100%" height={40} style={{ borderRadius: 10, marginTop: 'auto' }} />
            </div>
          ))}
        </div>
      ) : error ? (
        <PageErrorState
          title="Không thể tải dữ liệu môn học"
          description={error}
          onRetry={loadData}
        />
      ) : filteredSubjects.length === 0 ? (
        <EmptyState
          title="Không tìm thấy môn học nào"
          description={
            search || gradeFilter !== 'all' || statusFilter !== 'all'
              ? 'Không có môn học nào phù hợp với điều kiện tìm kiếm và bộ lọc hiện tại.'
              : 'Chưa có môn học nào trong hệ thống. Hãy thêm môn học đầu tiên để bắt đầu tạo giáo trình.'
          }
          actionLabel={search || gradeFilter !== 'all' || statusFilter !== 'all' ? 'Xóa bộ lọc' : 'Thêm môn học ngay'}
          onAction={
            search || gradeFilter !== 'all' || statusFilter !== 'all'
              ? () => {
                  setSearch('')
                  setGradeFilter('all')
                  setStatusFilter('all')
                }
              : openCreateDialog
          }
        />
      ) : (
        <div className="subjects-card-grid" role="region" aria-label="Lưới danh sách môn học">
          {filteredSubjects.map((s) => {
            const isPublished = s.status === 'published'
            const iconType = resolveSubjectIcon(s.code, s.name, s.icon, s.description)
            const cleanDescription = extractDescriptionText(s.description)

            return (
              <article
                key={s.id}
                className={`subject-card ${!isPublished ? 'is-draft' : ''}`}
                aria-label={`Môn học ${s.name}`}
              >
                <div>
                  {/* Top Row: SVG Icon & Badges */}
                  <div className="subject-card-top-row">
                    <div className="subject-svg-wrapper">
                      <SubjectIconSvg type={iconType} size={58} />
                    </div>
                    <div className="subject-card-badges">
                      <span className="subject-grade-pill">{s.grade}</span>
                      <span className={`subject-status-pill ${isPublished ? 'published' : 'draft'}`}>
                        {isPublished ? (
                          <>
                            <CheckCircle2 size={11} aria-hidden /> Đang hoạt động
                          </>
                        ) : (
                          <>
                            <EyeOff size={11} aria-hidden /> Tạm ẩn
                          </>
                        )}
                      </span>
                    </div>
                  </div>

                  {/* Info: Code, Title, Description */}
                  <div className="subject-card-info">
                    <span className="subject-card-code">{s.code}</span>
                    <h2 className="subject-card-title">{s.name}</h2>
                    <p className="subject-card-desc" title={cleanDescription}>
                      {cleanDescription || 'Chương trình chuẩn theo khung bám sát định hướng thi THPT Quốc gia.'}
                    </p>
                  </div>
                </div>

                <div>
                  {/* Stats Row */}
                  <div className="subject-card-stats">
                    <div className="card-stat-item">
                      <Layers size={15} aria-hidden />
                      <span>
                        Chương: <strong>{s.chapterCount || 0}</strong>
                      </span>
                    </div>
                    <div className="card-stat-item">
                      <BookOpen size={15} aria-hidden />
                      <span>
                        Bài học: <strong>{s.lessonCount || 0}</strong>
                      </span>
                    </div>
                  </div>

                  {/* Actions Footer */}
                  <div className="subject-card-actions">
                    <Link
                      to={`/content/subjects/${s.id}`}
                      className="btn-card-manage"
                      title={`Quản lý chương và bài giảng môn ${s.name}`}
                    >
                      <span>Quản lý</span>
                      <ArrowRight size={14} aria-hidden />
                    </Link>

                    <button
                      type="button"
                      className="btn-card-icon"
                      onClick={() => openEditDialog(s)}
                      title={`Chỉnh sửa môn ${s.name}`}
                      aria-label={`Chỉnh sửa môn ${s.name}`}
                    >
                      <Edit2 size={15} />
                    </button>

                    <button
                      type="button"
                      className="btn-card-icon"
                      onClick={() => handleToggleStatus(s)}
                      title={isPublished ? `Tạm ẩn môn ${s.name}` : `Kích hoạt môn ${s.name}`}
                      aria-label={isPublished ? `Tạm ẩn môn ${s.name}` : `Kích hoạt môn ${s.name}`}
                    >
                      {isPublished ? <EyeOff size={15} /> : <Eye size={15} />}
                    </button>

                    <button
                      type="button"
                      className="btn-card-icon btn-danger"
                      onClick={() => handleDeleteClick(s.id, s.name)}
                      title={`Xóa môn ${s.name}`}
                      aria-label={`Xóa môn ${s.name}`}
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                </div>
              </article>
            )
          })}
        </div>
      )}

      {/* 6. Modal Create / Edit Subject */}
      {isDialogOpen && (
        <div
          className="evon-modal-backdrop"
          onClick={() => {
            if (!isSubmitting) setIsDialogOpen(false)
          }}
          role="presentation"
        >
          <div
            className="evon-modal-dialog"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-labelledby="subject-modal-title"
          >
            {/* Modal Header */}
            <header className="evon-modal-header">
              <h2 id="subject-modal-title">
                {editingSubject ? `Chỉnh sửa môn học: ${editingSubject.name}` : 'Thêm môn học mới'}
              </h2>
              <button
                type="button"
                className="evon-modal-close"
                onClick={() => setIsDialogOpen(false)}
                disabled={isSubmitting}
                aria-label="Đóng cửa sổ"
              >
                <X size={20} />
              </button>
            </header>

            {/* Modal Form */}
            <form onSubmit={handleSubmit} style={{ display: 'contents' }}>
              <div className="evon-modal-body">
                {formError && (
                  <div className="evon-form-error" role="alert">
                    {formError}
                  </div>
                )}

                <div className="evon-form-row">
                  <div className="evon-form-group">
                    <label htmlFor="form-subject-name" className="evon-label">
                      Tên môn học <span className="req">*</span>
                    </label>
                    <input
                      id="form-subject-name"
                      type="text"
                      className="evon-input"
                      placeholder="VD: Toán học 12, Vật lý 12..."
                      value={formName}
                      onChange={(e) => setFormName(e.target.value)}
                      required
                      autoFocus
                    />
                  </div>

                  <div className="evon-form-group">
                    <label htmlFor="form-subject-code" className="evon-label">
                      Mã môn học <span className="req">*</span>
                    </label>
                    <input
                      id="form-subject-code"
                      type="text"
                      className="evon-input"
                      placeholder="VD: MATH12, PHYS12..."
                      value={formCode}
                      onChange={(e) => setFormCode(e.target.value.toUpperCase())}
                      required
                    />
                  </div>
                </div>

                <div className="evon-form-row">
                  <div className="evon-form-group">
                    <label htmlFor="form-subject-grade" className="evon-label">
                      Khối lớp <span className="req">*</span>
                    </label>
                    <select
                      id="form-subject-grade"
                      className="evon-form-select"
                      value={formGrade}
                      onChange={(e) => setFormGrade(e.target.value)}
                    >
                      <option value="12">Lớp 12</option>
                      <option value="11">Lớp 11</option>
                      <option value="10">Lớp 10</option>
                      <option value="THPT">Khối THPT</option>
                    </select>
                  </div>

                  <div className="evon-form-group">
                    <label className="evon-label">Trạng thái phát hành</label>
                    <div className="evon-radio-row" style={{ marginTop: 10 }}>
                      <label className="evon-radio-label">
                        <input
                          type="radio"
                          name="subject-status"
                          value="published"
                          checked={formStatus === 'published'}
                          onChange={() => setFormStatus('published')}
                        />
                        <span>Hoạt động</span>
                      </label>
                      <label className="evon-radio-label">
                        <input
                          type="radio"
                          name="subject-status"
                          value="draft"
                          checked={formStatus === 'draft'}
                          onChange={() => setFormStatus('draft')}
                        />
                        <span>Bản nháp / Ẩn</span>
                      </label>
                    </div>
                  </div>
                </div>

                {/* Visual SVG Icon Picker */}
                <div className="evon-form-group">
                  <label className="evon-label">
                    Biểu tượng SVG môn học <span className="req">*</span>
                  </label>
                  <span style={{ fontSize: '0.78rem', color: '#64748b' }}>
                    Chọn biểu tượng đồ họa SVG hiển thị trên thẻ môn học:
                  </span>
                  <div className="icon-picker-grid" role="radiogroup" aria-label="Chọn biểu tượng môn học">
                    {SUBJECT_ICON_OPTIONS.map((opt) => {
                      const isSelected = formIcon === opt.id
                      return (
                        <button
                          key={opt.id}
                          type="button"
                          role="radio"
                          aria-checked={isSelected}
                          className={`icon-picker-item ${isSelected ? 'is-selected' : ''}`}
                          onClick={() => setFormIcon(opt.id)}
                          title={`Chọn biểu tượng ${opt.label}`}
                          aria-label={`Chọn biểu tượng ${opt.label}`}
                        >
                          <SubjectIconSvg type={opt.id} size={38} />
                          <span className="icon-picker-label">{opt.label}</span>
                        </button>
                      )
                    })}
                  </div>
                </div>

                <div className="evon-form-group">
                  <label htmlFor="form-subject-desc" className="evon-label">
                    Mô tả môn học
                  </label>
                  <textarea
                    id="form-subject-desc"
                    className="evon-textarea"
                    rows={3}
                    placeholder="Mô tả tóm tắt nội dung, mục tiêu chương trình học bám sát kỳ thi..."
                    value={formDescription}
                    onChange={(e) => setFormDescription(e.target.value)}
                  />
                </div>
              </div>

              {/* Modal Footer */}
              <footer className="evon-modal-footer">
                <button
                  type="button"
                  className="btn-evon-cancel"
                  onClick={() => setIsDialogOpen(false)}
                  disabled={isSubmitting}
                >
                  Hủy bỏ
                </button>
                <button
                  type="submit"
                  className="btn-evon-primary"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? (
                    <span>Đang lưu...</span>
                  ) : (
                    <span>{editingSubject ? 'Lưu thay đổi' : 'Tạo môn học'}</span>
                  )}
                </button>
              </footer>
            </form>
          </div>
        </div>
      )}

      {/* 7. Delete Confirmation Dialog */}
      <ConfirmDialog
        isOpen={deleteConfirmOpen}
        title="Xác nhận xóa môn học"
        message={`Bạn có chắc chắn muốn xóa môn học "${deletingSubject?.name}"? Hệ thống sẽ ngăn chặn việc xóa nếu môn học đã có chương, bài giảng hoặc dữ liệu tiến độ của học sinh.`}
        confirmText={isDeleting ? 'Đang xóa...' : 'Xóa môn học'}
        cancelText="Hủy bỏ"
        variant="danger"
        isLoading={isDeleting}
        onConfirm={handleDeleteConfirm}
        onCancel={() => {
          if (!isDeleting) {
            setDeleteConfirmOpen(false)
            setDeletingSubject(null)
          }
        }}
      />
    </div>
  )
}

export default ContentSubjectsPage

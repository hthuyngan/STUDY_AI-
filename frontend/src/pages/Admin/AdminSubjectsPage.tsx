import React, { useEffect, useState, useCallback } from 'react'
import {
  BookOpen,
  Plus,
  Search,
  Layers,
  Edit2,
  Trash2,
  CheckCircle2,
  X,
  ArrowRight,
} from 'lucide-react'
import { Link } from 'react-router-dom'
import { educationService } from '@/services/education.service'
import type { CurriculumSubjectItem, ContentStatus } from '@/types/education'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { Skeleton } from '@/components/ui/Skeleton'
import { EmptyState } from '@/components/ui/EmptyState'
import './AdminPages.css'
import '@/components/admin/AdminComponents.css'

export const AdminSubjectsPage: React.FC = () => {
  const [subjects, setSubjects] = useState<CurriculumSubjectItem[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<'all' | ContentStatus>('all')
  const [toastMessage, setToastMessage] = useState<string | null>(null)

  // Dialog State
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingSubject, setEditingSubject] = useState<CurriculumSubjectItem | null>(null)
  const [formName, setFormName] = useState('')
  const [formCode, setFormCode] = useState('')
  const [formGrade, setFormGrade] = useState('Lớp 12')
  const [formIcon, setFormIcon] = useState('📖')
  const [formDescription, setFormDescription] = useState('')
  const [formStatus, setFormStatus] = useState<ContentStatus>('published')
  const [formError, setFormError] = useState<string | null>(null)

  const showToast = (msg: string) => {
    setToastMessage(msg)
    setTimeout(() => setToastMessage(null), 3000)
  }

  const loadData = useCallback(() => {
    setLoading(true)
    educationService.getSubjects().then((data) => {
      setSubjects(data)
      setLoading(false)
    })
  }, [])

  useEffect(() => {
    let active = true
    educationService.getSubjects().then((data) => {
      if (active) {
        setSubjects(data)
        setLoading(false)
      }
    })
    return () => {
      active = false
    }
  }, [])

  const filteredSubjects = subjects.filter((s) => {
    const matchSearch =
      s.name.toLowerCase().includes(search.toLowerCase()) ||
      s.code.toLowerCase().includes(search.toLowerCase())
    const matchStatus = statusFilter === 'all' || s.status === statusFilter
    return matchSearch && matchStatus
  })

  const openCreateDialog = () => {
    setEditingSubject(null)
    setFormName('')
    setFormCode('')
    setFormGrade('Lớp 12')
    setFormIcon('📖')
    setFormDescription('')
    setFormStatus('published')
    setFormError(null)
    setIsDialogOpen(true)
  }

  const openEditDialog = (s: CurriculumSubjectItem) => {
    setEditingSubject(s)
    setFormName(s.name)
    setFormCode(s.code)
    setFormGrade(s.grade)
    setFormIcon(s.icon || '📖')
    setFormDescription(s.description || '')
    setFormStatus(s.status || 'published')
    setFormError(null)
    setIsDialogOpen(true)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formName.trim() || !formCode.trim()) {
      setFormError('Vui lòng nhập tên môn và mã môn học.')
      return
    }

    if (editingSubject) {
      await educationService.updateSubject(editingSubject.id, {
        name: formName.trim(),
        code: formCode.trim().toUpperCase(),
        grade: formGrade,
        icon: formIcon,
        description: formDescription.trim(),
        status: formStatus,
      })
      showToast(`Đã cập nhật môn học: ${formName}`)
    } else {
      await educationService.createSubject({
        name: formName.trim(),
        code: formCode.trim().toUpperCase(),
        grade: formGrade,
        icon: formIcon,
        description: formDescription.trim(),
        status: formStatus,
      })
      showToast(`Đã thêm môn học mới: ${formName}`)
    }

    setIsDialogOpen(false)
    loadData()
  }

  const handleDelete = async (id: string, name: string) => {
    if (window.confirm(`Bạn có chắc muốn xóa môn học "${name}" (Dữ liệu mô phỏng)?`)) {
      await educationService.deleteSubject(id)
      showToast(`Đã xóa môn học: ${name}`)
      loadData()
    }
  }

  return (
    <div className="staff-page">
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
            <div className="admin-prototype-badge">
              <span className="prototype-dot" />
              <span>Dữ liệu mô phỏng · Lưu cục bộ</span>
            </div>
            <h1 className="staff-page-title">Quản lý môn học</h1>
            <p className="staff-page-desc">
              Quản lý danh mục bộ môn, khung chương trình đào tạo và theo dõi tiến độ xuất bản tài liệu trên STUDY_AI.
            </p>
          </div>
          <div className="admin-header-actions">
            <button
              type="button"
              className="admin-btn-primary"
              onClick={openCreateDialog}
              aria-label="Thêm môn học"
            >
              <Plus size={16} />
              <span>Thêm môn học</span>
            </button>
          </div>
        </div>
      </div>

      {/* Filter & Search Toolbar */}
      <div className="admin-toolbar" style={{ marginBottom: '20px' }}>
        <div className="admin-search-wrap">
          <Search size={16} className="admin-search-icon" />
          <input
            type="search"
            placeholder="Tìm theo tên môn hoặc mã môn..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="admin-search-input"
            aria-label="Tìm kiếm môn học"
          />
        </div>

        <div className="admin-filter-group">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as 'all' | ContentStatus)}
            className="admin-select"
            aria-label="Lọc trạng thái"
          >
            <option value="all">Tất cả trạng thái</option>
            <option value="published">Đã xuất bản</option>
            <option value="draft">Bản nháp</option>
            <option value="in-review">Đang duyệt</option>
          </select>
        </div>
      </div>

      {/* Subjects Grid */}
      {loading ? (
        <div className="admin-subject-grid">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="admin-subject-card">
              <Skeleton width="100%" height="160px" />
            </div>
          ))}
        </div>
      ) : filteredSubjects.length === 0 ? (
        <EmptyState
          title="Không tìm thấy môn học nào"
          description="Thử thay đổi từ khóa tìm kiếm hoặc tạo một môn học mới."
          icon={BookOpen}
          actionLabel="Thêm môn học"
          onAction={openCreateDialog}
        />
      ) : (
        <div className="admin-subject-grid">
          {filteredSubjects.map((subj) => (
            <div key={subj.id} className="admin-subject-card">
              <div>
                <div className="admin-subject-card-top">
                  <div className="admin-subject-icon-box">{subj.icon}</div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                      <h3 className="admin-subject-title">{subj.name}</h3>
                      <span className="admin-subject-code">{subj.code}</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '4px' }}>
                      <StatusBadge status={subj.status || 'published'} />
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-muted, #627d98)' }}>
                        {subj.grade}
                      </span>
                    </div>
                  </div>
                </div>

                <p className="admin-subject-desc">{subj.description}</p>

                <div className="admin-subject-metrics">
                  <div>
                    <div className="admin-subject-metric-val">{subj.chapterCount || 0}</div>
                    <div className="admin-subject-metric-label">Chương</div>
                  </div>
                  <div>
                    <div className="admin-subject-metric-val">{subj.lessonCount || 0}</div>
                    <div className="admin-subject-metric-label">Bài học</div>
                  </div>
                  <div>
                    <div className="admin-subject-metric-val">{subj.publishedPercent || 0}%</div>
                    <div className="admin-subject-metric-label">Đã xuất bản</div>
                  </div>
                </div>
              </div>

              <div className="admin-subject-card-footer">
                <Link
                  to={`/admin/chapters?subject=${subj.id}`}
                  className="admin-btn-outline"
                  style={{ fontSize: '0.8rem', padding: '5px 10px', gap: '4px' }}
                  title="Quản lý chương học của môn này"
                >
                  <Layers size={14} />
                  <span>Xem chương</span>
                  <ArrowRight size={13} />
                </Link>

                <div style={{ display: 'flex', gap: '6px' }}>
                  <button
                    type="button"
                    className="admin-btn-outline"
                    onClick={() => openEditDialog(subj)}
                    title="Chỉnh sửa môn học"
                    aria-label={`Chỉnh sửa ${subj.name}`}
                  >
                    <Edit2 size={14} />
                  </button>
                  <button
                    type="button"
                    className="admin-btn-outline"
                    onClick={() => handleDelete(subj.id, subj.name)}
                    title="Xóa môn học"
                    aria-label={`Xóa ${subj.name}`}
                    style={{ color: '#dc2626' }}
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create / Edit Dialog */}
      {isDialogOpen && (
        <div className="admin-dialog-backdrop" onClick={() => setIsDialogOpen(false)}>
          <div
            className="admin-dialog-card admin-form-dialog"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-labelledby="dialog-title"
          >
            <div className="admin-dialog-header">
              <div style={{ display: 'flex', alignItems: 'center' }}>
                <span className="admin-form-icon-wrap">
                  <BookOpen size={16} />
                </span>
                <h2 id="dialog-title" className="admin-dialog-title">
                  {editingSubject ? 'Chỉnh sửa môn học' : 'Thêm môn học mới'}
                </h2>
              </div>
              <button
                type="button"
                className="admin-dialog-close"
                onClick={() => setIsDialogOpen(false)}
                aria-label="Đóng"
              >
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleSubmit}>
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
                  <label htmlFor="form-subject-name" className="admin-form-label">
                    Tên môn học *
                  </label>
                  <input
                    id="form-subject-name"
                    type="text"
                    required
                    value={formName}
                    onChange={(e) => setFormName(e.target.value)}
                    placeholder="Ví dụ: Toán học 12, Sinh học 12..."
                    className="admin-input"
                  />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <div className="admin-form-group">
                    <label htmlFor="form-subject-code" className="admin-form-label">
                      Mã môn học *
                    </label>
                    <input
                      id="form-subject-code"
                      type="text"
                      required
                      value={formCode}
                      onChange={(e) => setFormCode(e.target.value)}
                      placeholder="MATH-12"
                      className="admin-input"
                    />
                  </div>
                  <div className="admin-form-group">
                    <label htmlFor="form-subject-grade" className="admin-form-label">
                      Khối lớp
                    </label>
                    <select
                      id="form-subject-grade"
                      value={formGrade}
                      onChange={(e) => setFormGrade(e.target.value)}
                      className="admin-select"
                      style={{ width: '100%' }}
                    >
                      <option value="Lớp 12">Lớp 12</option>
                      <option value="Lớp 11">Lớp 11</option>
                      <option value="Lớp 10">Lớp 10</option>
                    </select>
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <div className="admin-form-group">
                    <label htmlFor="form-subject-icon" className="admin-form-label">
                      Biểu tượng (Icon/Emoji)
                    </label>
                    <input
                      id="form-subject-icon"
                      type="text"
                      value={formIcon}
                      onChange={(e) => setFormIcon(e.target.value)}
                      placeholder="∑, ⚛, ⚗, 📖..."
                      className="admin-input"
                    />
                  </div>
                  <div className="admin-form-group">
                    <label htmlFor="form-subject-status" className="admin-form-label">
                      Trạng thái xuất bản
                    </label>
                    <select
                      id="form-subject-status"
                      value={formStatus}
                      onChange={(e) => setFormStatus(e.target.value as ContentStatus)}
                      className="admin-select"
                      style={{ width: '100%' }}
                    >
                      <option value="published">Đã xuất bản (Published)</option>
                      <option value="draft">Bản nháp (Draft)</option>
                      <option value="in-review">Đang kiểm duyệt</option>
                    </select>
                  </div>
                </div>

                <div className="admin-form-group">
                  <label htmlFor="form-subject-desc" className="admin-form-label">
                    Mô tả chương trình học
                  </label>
                  <textarea
                    id="form-subject-desc"
                    rows={3}
                    value={formDescription}
                    onChange={(e) => setFormDescription(e.target.value)}
                    placeholder="Mô tả tóm tắt nội dung và chuẩn đầu ra của môn học..."
                    className="admin-textarea"
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      borderRadius: '6px',
                      border: '1px solid var(--border-subtle, #e2e8f0)',
                      fontSize: '0.85rem',
                      fontFamily: 'inherit',
                    }}
                  />
                </div>
              </div>

              <div className="admin-dialog-footer">
                <button
                  type="button"
                  className="admin-btn-secondary"
                  onClick={() => setIsDialogOpen(false)}
                >
                  Hủy
                </button>
                <button type="submit" className="admin-btn-primary">
                  {editingSubject ? 'Lưu thay đổi' : 'Tạo môn học'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

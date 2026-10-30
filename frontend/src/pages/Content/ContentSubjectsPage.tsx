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
import { SummaryStrip } from '@/components/ui/SummaryStrip'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { SubjectCardList } from './components/subjects/SubjectCardList'
import './ContentPages.css'
import '../Admin/AdminPages.css'
import '@/components/admin/AdminComponents.css'

export const ContentSubjectsPage: React.FC = () => {
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
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false)
  const [deletingSubject, setDeletingSubject] = useState<{ id: string; name: string } | null>(null)

  // Listen for Escape key to close dialog
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isDialogOpen) {
        setIsDialogOpen(false)
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isDialogOpen])

  // Lock body scroll when dialog is open
  useEffect(() => {
    if (isDialogOpen) {
      const originalOverflow = document.body.style.overflow
      document.body.style.overflow = 'hidden'
      return () => {
        document.body.style.overflow = originalOverflow
      }
    }
  }, [isDialogOpen])

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

    const handleDataChange = () => {
      if (active) loadData()
    }
    window.addEventListener('study_ai_education_change', handleDataChange)
    return () => {
      active = false
      window.removeEventListener('study_ai_education_change', handleDataChange)
    }
  }, [loadData])

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

  const handleDelete = (id: string, name: string) => {
    setDeletingSubject({ id, name })
    setDeleteConfirmOpen(true)
  }

  const handleDeleteConfirm = async () => {
    if (!deletingSubject) return
    await educationService.deleteSubject(deletingSubject.id)
    showToast(`Đã xóa môn học: ${deletingSubject.name}`)
    setDeleteConfirmOpen(false)
    setDeletingSubject(null)
    loadData()
  }

  const subjectKPIs = [
    { id: 'total', label: 'Tổng số môn học', value: subjects.length, color: 'var(--navy-primary, #102a43)' },
    { id: 'grades', label: 'Khối lớp THPT', value: '3 khối (10-12)', color: '#0284c7' },
    { id: 'lessons', label: 'Tổng bài học', value: subjects.reduce((sum, s) => sum + (s.lessonCount || 0), 0), color: '#16a34a' },
    { id: 'published', label: 'Đã xuất bản', value: subjects.filter((s) => s.status === 'published').length, color: '#8b5cf6' },
  ]

  return (
    <div className="admin-page-container">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="admin-toast-notification">
          <CheckCircle2 size={18} color="#047857" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Page Header */}
      <div className="staff-page-header">
        <div className="admin-header-row">
          <div>
            <h1 className="staff-page-title">Quản lý môn học (Subjects)</h1>
            <p className="staff-page-desc">
              Khung chương trình giảng dạy, thiết lập danh mục môn học và theo dõi độ phủ bài học trên STUDY_AI.
            </p>
          </div>
          <div className="admin-header-actions">
            <button
              type="button"
              className="btn btn-primary"
              onClick={openCreateDialog}
            >
              <Plus size={16} />
              <span>Thêm môn học</span>
            </button>
          </div>
        </div>
      </div>

      {/* 4 KPIs Summary Strip */}
      <SummaryStrip items={subjectKPIs} ariaLabel="Thống kê nhanh môn học" />

      {/* Filter and Search Bar */}
      <div className="admin-filter-bar">
        <div className="admin-search-input-wrap">
          <Search size={16} className="admin-search-icon" />
          <input
            type="text"
            className="admin-search-input"
            placeholder="Tìm theo tên môn, mã môn..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <select
          className="admin-filter-select"
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as 'all' | ContentStatus)}
        >
          <option value="all">Tất cả trạng thái</option>
          <option value="published">Đã xuất bản</option>
          <option value="draft">Bản nháp</option>
          <option value="archived">Lưu trữ</option>
        </select>
      </div>

      {/* Subjects Table */}
      <div className="staff-table-wrapper has-mobile-cards">
        {loading ? (
          <div style={{ padding: '24px' }}>
            <Skeleton height={48} />
          </div>
        ) : filteredSubjects.length === 0 ? (
          <EmptyState
            title="Không tìm thấy môn học"
            description="Hãy thử thay đổi điều kiện tìm kiếm hoặc thêm môn học mới."
          />
        ) : (
          <>
            <table className="staff-table">
              <thead>
                <tr>
                  <th>Môn học</th>
                  <th>Mã môn</th>
                  <th>Khối lớp</th>
                  <th>Số chương</th>
                  <th>Số bài học</th>
                  <th>Trạng thái</th>
                  <th>Cập nhật cuối</th>
                  <th style={{ textAlign: 'right' }}>Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {filteredSubjects.map((s) => (
                  <tr key={s.id}>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <span style={{ fontSize: '1.4rem' }}>{s.icon || '📖'}</span>
                        <div>
                          <strong style={{ color: '#102a43' }}>{s.name}</strong>
                          {s.description && (
                            <div style={{ fontSize: '0.8rem', color: '#627d98', maxWidth: 260, textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>
                              {s.description}
                            </div>
                          )}
                        </div>
                      </div>
                    </td>
                    <td>
                      <code>{s.code}</code>
                    </td>
                    <td>{s.grade}</td>
                    <td>
                      <Link
                        to={`/content/chapters?subject=${s.id}`}
                        style={{ color: '#0284c7', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: 4, textDecoration: 'none' }}
                        title="Xem danh sách chương học"
                      >
                        <Layers size={14} />
                        <span>{s.chapterCount || 0} chương</span>
                      </Link>
                    </td>
                    <td>{s.lessonCount || 0} bài học</td>
                    <td>
                      <StatusBadge status={s.status} />
                    </td>
                    <td style={{ fontSize: '0.85rem', color: '#627d98' }}>
                      {new Date(s.updatedAt).toLocaleDateString('vi-VN')}
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <div className="table-actions" style={{ justifyContent: 'flex-end', gap: 6 }}>
                        <Link
                          to={`/content/subjects/${s.id}`}
                          className="table-action-btn"
                          title="Xem chi tiết giáo trình"
                        >
                          <ArrowRight size={16} />
                        </Link>
                        <button
                          type="button"
                          className="table-action-btn"
                          onClick={() => openEditDialog(s)}
                          title="Chỉnh sửa môn học"
                        >
                          <Edit2 size={16} />
                        </button>
                        <button
                          type="button"
                          className="table-action-btn text-danger"
                          onClick={() => handleDelete(s.id, s.name)}
                          title="Xóa môn học"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Mobile Card List (<768px) */}
            <SubjectCardList
              subjects={filteredSubjects}
              onEdit={openEditDialog}
              onDelete={handleDelete}
            />
          </>
        )}
      </div>

      {/* Modal Dialog Tạo / Sửa Môn */}
      {isDialogOpen && (
        <div className="admin-modal-overlay" role="dialog" aria-modal="true">
          <div className="admin-modal-card">
            <div className="admin-modal-header">
              <h3 className="modal-title">
                {editingSubject ? 'Chỉnh sửa môn học' : 'Thêm môn học mới'}
              </h3>
              <button
                type="button"
                className="modal-close-btn"
                onClick={() => setIsDialogOpen(false)}
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSubmit}>
              <div className="admin-modal-body">
                {formError && (
                  <div className="form-error-banner" style={{ marginBottom: 16 }}>
                    {formError}
                  </div>
                )}

                <div className="form-group" style={{ marginBottom: 14 }}>
                  <label className="form-label" htmlFor="subj-name">
                    Tên môn học <span className="text-danger">*</span>
                  </label>
                  <input
                    id="subj-name"
                    type="text"
                    className="form-input"
                    placeholder="VD: Toán học 12, Vật lý 12..."
                    value={formName}
                    onChange={(e) => setFormName(e.target.value)}
                    required
                    autoFocus
                  />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 14 }}>
                  <div className="form-group">
                    <label className="form-label" htmlFor="subj-code">
                      Mã môn học <span className="text-danger">*</span>
                    </label>
                    <input
                      id="subj-code"
                      type="text"
                      className="form-input"
                      placeholder="VD: MATH12, PHY12..."
                      value={formCode}
                      onChange={(e) => setFormCode(e.target.value)}
                      required
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label" htmlFor="subj-grade">
                      Khối lớp
                    </label>
                    <select
                      id="subj-grade"
                      className="form-input"
                      value={formGrade}
                      onChange={(e) => setFormGrade(e.target.value)}
                    >
                      <option value="Lớp 10">Lớp 10</option>
                      <option value="Lớp 11">Lớp 11</option>
                      <option value="Lớp 12">Lớp 12</option>
                    </select>
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '120px 1fr', gap: 14, marginBottom: 14 }}>
                  <div className="form-group">
                    <label className="form-label" htmlFor="subj-icon">
                      Biểu tượng
                    </label>
                    <input
                      id="subj-icon"
                      type="text"
                      className="form-input"
                      placeholder="📖, 📐, 🔬..."
                      value={formIcon}
                      onChange={(e) => setFormIcon(e.target.value)}
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label" htmlFor="subj-status">
                      Trạng thái xuất bản
                    </label>
                    <select
                      id="subj-status"
                      className="form-input"
                      value={formStatus}
                      onChange={(e) => setFormStatus(e.target.value as ContentStatus)}
                    >
                      <option value="published">Đã xuất bản</option>
                      <option value="draft">Bản nháp</option>
                      <option value="archived">Lưu trữ</option>
                    </select>
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label" htmlFor="subj-desc">
                    Mô tả môn học
                  </label>
                  <textarea
                    id="subj-desc"
                    className="form-input"
                    rows={3}
                    placeholder="Mô tả tóm tắt nội dung chương trình học..."
                    value={formDescription}
                    onChange={(e) => setFormDescription(e.target.value)}
                  />
                </div>
              </div>

              <div className="admin-modal-footer">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setIsDialogOpen(false)}
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                >
                  <BookOpen size={16} />
                  <span>{editingSubject ? 'Lưu thay đổi' : 'Tạo môn học'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        isOpen={deleteConfirmOpen}
        title="Xác nhận xóa môn học"
        message={`Bạn có chắc chắn muốn xóa môn học "${deletingSubject?.name}"? Các chương và bài học thuộc môn này cũng sẽ bị ẩn.`}
        confirmText="Xác nhận xóa"
        cancelText="Hủy bỏ"
        variant="danger"
        onConfirm={handleDeleteConfirm}
        onCancel={() => {
          setDeleteConfirmOpen(false)
          setDeletingSubject(null)
        }}
      />
    </div>
  )
}

import React, { useEffect, useState, useCallback } from 'react'
import {
  Layers,
  Plus,
  ArrowUp,
  ArrowDown,
  Edit2,
  Trash2,
  CheckCircle2,
  X,
} from 'lucide-react'
import { Link, useSearchParams } from 'react-router-dom'
import { educationService } from '@/services/education.service'
import type { CurriculumChapterItem, CurriculumSubjectItem, ContentStatus } from '@/types/education'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { Skeleton } from '@/components/ui/Skeleton'
import { EmptyState } from '@/components/ui/EmptyState'
import './ContentPages.css'
import '../Admin/AdminPages.css'
import '@/components/admin/AdminComponents.css'

export const ContentChaptersPage: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams()
  const initialSubject = searchParams.get('subject') || 'all'

  const [subjects, setSubjects] = useState<CurriculumSubjectItem[]>([])
  const [selectedSubjectId, setSelectedSubjectId] = useState(initialSubject)
  const [chapters, setChapters] = useState<CurriculumChapterItem[]>([])
  const [loading, setLoading] = useState(true)
  const [toastMessage, setToastMessage] = useState<string | null>(null)

  // Dialog State
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingChapter, setEditingChapter] = useState<CurriculumChapterItem | null>(null)
  const [formSubjectId, setFormSubjectId] = useState('math')
  const [formTitle, setFormTitle] = useState('')
  const [formOrder, setFormOrder] = useState(1)
  const [formStatus, setFormStatus] = useState<ContentStatus>('published')
  const [formError, setFormError] = useState<string | null>(null)

  const showToast = (msg: string) => {
    setToastMessage(msg)
    setTimeout(() => setToastMessage(null), 3000)
  }

  const loadData = useCallback(() => {
    setLoading(true)
    Promise.all([
      educationService.getSubjects(),
      educationService.getChapters(selectedSubjectId),
    ]).then(([subjList, chList]) => {
      setSubjects(subjList)
      setChapters(chList)
      setLoading(false)
    })
  }, [selectedSubjectId])

  useEffect(() => {
    let active = true
    Promise.all([
      educationService.getSubjects(),
      educationService.getChapters(selectedSubjectId),
    ]).then(([subjList, chList]) => {
      if (active) {
        setSubjects(subjList)
        setChapters(chList)
        setLoading(false)
      }
    })
    return () => {
      active = false
    }
  }, [selectedSubjectId])

  const handleSubjectChange = (newSubj: string) => {
    setSelectedSubjectId(newSubj)
    if (newSubj === 'all') {
      searchParams.delete('subject')
      setSearchParams(searchParams)
    } else {
      setSearchParams({ subject: newSubj })
    }
  }

  const openCreateDialog = () => {
    setEditingChapter(null)
    setFormSubjectId(selectedSubjectId !== 'all' ? selectedSubjectId : subjects[0]?.id || 'math')
    setFormTitle('')
    setFormOrder(chapters.length + 1)
    setFormStatus('published')
    setFormError(null)
    setIsDialogOpen(true)
  }

  const openEditDialog = (ch: CurriculumChapterItem) => {
    setEditingChapter(ch)
    setFormSubjectId(ch.subjectId)
    setFormTitle(ch.title)
    setFormOrder(ch.order)
    setFormStatus(ch.status)
    setFormError(null)
    setIsDialogOpen(true)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formTitle.trim()) {
      setFormError('Vui lòng nhập tên chương học.')
      return
    }

    const subj = subjects.find((s) => s.id === formSubjectId)
    const subjectName = subj ? subj.name : 'Toán học 12'

    if (editingChapter) {
      await educationService.updateChapter(editingChapter.id, {
        subjectId: formSubjectId,
        subjectName,
        title: formTitle.trim(),
        order: Number(formOrder),
        status: formStatus,
      })
      showToast(`Đã cập nhật chương: ${formTitle}`)
    } else {
      await educationService.createChapter({
        subjectId: formSubjectId,
        subjectName,
        title: formTitle.trim(),
        order: Number(formOrder),
        status: formStatus,
      })
      showToast(`Đã thêm chương mới: ${formTitle}`)
    }

    setIsDialogOpen(false)
    loadData()
  }

  const handleDelete = async (id: string, title: string) => {
    if (window.confirm(`Bạn có chắc muốn xóa chương "${title}" (Dữ liệu mô phỏng)?`)) {
      await educationService.deleteChapter(id)
      showToast(`Đã xóa chương: ${title}`)
      loadData()
    }
  }

  const handleMoveOrder = async (index: number, direction: 'up' | 'down') => {
    const targetIndex = direction === 'up' ? index - 1 : index + 1
    if (targetIndex < 0 || targetIndex >= chapters.length) return

    const newOrderList = [...chapters]
    const temp = newOrderList[index]
    newOrderList[index] = newOrderList[targetIndex]
    newOrderList[targetIndex] = temp

    const subjectIdToUpdate = chapters[index].subjectId
    const orderedIds = newOrderList
      .filter((c) => c.subjectId === subjectIdToUpdate)
      .map((c) => c.id)

    await educationService.reorderChapters(subjectIdToUpdate, orderedIds)
    showToast('Đã cập nhật thứ tự chương giảng dạy')
    loadData()
  }

  return (
    <div className="admin-page-container">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="admin-toast-notification">
          <CheckCircle2 size={18} color="#047857" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Page Header (Section 5.1 compliant) */}
      <div className="staff-page-header">
        <div className="admin-prototype-badge">
          <span className="prototype-dot" />
          <span>CONTENT WORKSPACE • QUẢN LÝ CHƯƠNG TRÌNH</span>
        </div>
        <div className="admin-header-row">
          <div>
            <nav className="staff-breadcrumbs" aria-label="Breadcrumb" style={{ marginBottom: 4 }}>
              <Link to="/content/subjects">Giáo trình</Link>
              <span style={{ margin: '0 6px', color: '#94a3b8' }}>/</span>
              <span aria-current="page" style={{ color: '#102a43', fontWeight: 600 }}>Chương học</span>
            </nav>
            <h1 className="staff-page-title">Quản lý chương học</h1>
            <p className="staff-page-desc">
              Quản lý cấu trúc chương, thứ tự giảng dạy và số lượng bài học theo từng môn.
            </p>
          </div>
          <div className="admin-header-actions">
            <button
              type="button"
              className="btn btn-primary"
              onClick={openCreateDialog}
              aria-label="Thêm chương học mới"
              style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}
            >
              <Plus size={16} />
              <span>Thêm chương học</span>
            </button>
          </div>
        </div>
      </div>

      {/* Subject Filter Toolbar (Section 5.2 compliant) */}
      <div className="admin-filter-bar">
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
          <label htmlFor="chapter-subject-filter" style={{ fontSize: '0.88rem', fontWeight: 600, color: 'var(--staff-text-main, #102a43)' }}>
            Môn học:
          </label>
          <select
            id="chapter-subject-filter"
            value={selectedSubjectId}
            onChange={(e) => handleSubjectChange(e.target.value)}
            className="admin-filter-select"
            aria-label="Chọn môn học để xem chương"
            style={{ minWidth: 220 }}
          >
            <option value="all">Tất cả môn học</option>
            {subjects.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name} ({s.code})
              </option>
            ))}
          </select>
        </div>

        <div className="admin-toolbar-summary">
          Tổng số: <strong>{chapters.length}</strong> chương học
        </div>
      </div>

      {/* Chapters Table (Section 5.3 & 5.4 compliant) */}
      {loading ? (
        <div className="staff-table-wrapper" style={{ padding: '24px' }}>
          {[1, 2, 3].map((i) => (
            <div key={i} style={{ marginBottom: i < 3 ? '12px' : 0 }}>
              <Skeleton width="100%" height="42px" />
            </div>
          ))}
        </div>
      ) : chapters.length === 0 ? (
        <EmptyState
          title={selectedSubjectId !== 'all' ? 'Không tìm thấy chương học phù hợp' : 'Chưa có chương học nào'}
          description={
            selectedSubjectId !== 'all'
              ? 'Môn học này hiện chưa có chương nào được phân bổ. Hãy bấm thêm chương học mới.'
              : 'Hãy thêm chương học mới cho môn học này để bắt đầu xây dựng bài giảng.'
          }
          icon={Layers}
          actionLabel="Thêm chương học mới"
          onAction={openCreateDialog}
        />
      ) : (
        <div className="staff-table-wrapper">
          <table className="staff-table chapter-table" aria-label="Bảng danh sách chương học">
            <thead>
              <tr>
                <th className="chapter-col-order">Thứ tự</th>
                <th className="chapter-col-title">Tên chương học</th>
                <th className="chapter-col-subject">Môn học</th>
                <th className="chapter-col-lessons">Số bài học</th>
                <th className="chapter-col-status">Trạng thái</th>
                <th className="chapter-col-actions">Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {chapters.map((ch, idx) => {
                const subject = subjects.find((s) => s.id === ch.subjectId)
                return (
                  <tr key={ch.id}>
                    <td className="chapter-col-order">
                      <div className="admin-order-controls">
                        <span style={{ fontWeight: 700, width: '22px', textAlign: 'center', fontVariantNumeric: 'tabular-nums' }}>
                          #{ch.order}
                        </span>
                        <button
                          type="button"
                          className="admin-order-btn"
                          disabled={idx === 0}
                          onClick={() => handleMoveOrder(idx, 'up')}
                          aria-label={`Di chuyển chương "${ch.title}" lên`}
                          title="Di chuyển lên"
                        >
                          <ArrowUp size={13} />
                        </button>
                        <button
                          type="button"
                          className="admin-order-btn"
                          disabled={idx === chapters.length - 1}
                          onClick={() => handleMoveOrder(idx, 'down')}
                          aria-label={`Di chuyển chương "${ch.title}" xuống`}
                          title="Di chuyển xuống"
                        >
                          <ArrowDown size={13} />
                        </button>
                      </div>
                    </td>
                    <td className="chapter-col-title">
                      <div className="chapter-title-cell">
                        <div className="chapter-title-text" title={ch.title}>
                          {ch.title}
                        </div>
                        <div className="chapter-id-sub">
                          MÃ: {ch.id}
                        </div>
                      </div>
                    </td>
                    <td className="chapter-col-subject">
                      <span className="subject-badge-pill">
                        {subject ? subject.name : ch.subjectName || ch.subjectId}
                      </span>
                    </td>
                    <td className="chapter-col-lessons" style={{ fontWeight: 600 }}>
                      <span className="badge-count-link">
                        {ch.lessonsCount || 0} bài
                      </span>
                    </td>
                    <td className="chapter-col-status">
                      <StatusBadge
                        status={ch.status}
                        label={
                          ch.status === 'published'
                            ? 'Đã xuất bản'
                            : ch.status === 'in-review'
                              ? 'Chờ duyệt'
                              : 'Bản nháp'
                        }
                      />
                    </td>
                    <td className="chapter-col-actions">
                      <div className="table-actions" style={{ justifyContent: 'flex-end', gap: 6 }}>
                        <button
                          type="button"
                          className="table-action-btn"
                          onClick={() => openEditDialog(ch)}
                          title="Chỉnh sửa chương"
                          aria-label={`Chỉnh sửa chương ${ch.title}`}
                        >
                          <Edit2 size={14} />
                        </button>
                        <button
                          type="button"
                          className="table-action-btn text-danger"
                          onClick={() => handleDelete(ch.id, ch.title)}
                          title="Xóa chương"
                          aria-label={`Xóa chương ${ch.title}`}
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
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
            aria-labelledby="dialog-chapter-title"
          >
            <div className="admin-dialog-header">
              <div style={{ display: 'flex', alignItems: 'center' }}>
                <span className="admin-form-icon-wrap">
                  <Layers size={16} />
                </span>
                <h2 id="dialog-chapter-title" className="admin-dialog-title">
                  {editingChapter ? 'Chỉnh sửa chương học' : 'Thêm chương học mới'}
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
                  <label htmlFor="form-chapter-subject" className="admin-form-label">
                    Môn học *
                  </label>
                  <select
                    id="form-chapter-subject"
                    value={formSubjectId}
                    onChange={(e) => setFormSubjectId(e.target.value)}
                    className="admin-select"
                    style={{ width: '100%' }}
                  >
                    {subjects.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name} ({s.code})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="admin-form-group">
                  <label htmlFor="form-chapter-name" className="admin-form-label">
                    Tên chương học *
                  </label>
                  <input
                    id="form-chapter-name"
                    type="text"
                    required
                    value={formTitle}
                    onChange={(e) => setFormTitle(e.target.value)}
                    placeholder="Ví dụ: Chương 1: Ứng dụng đạo hàm để khảo sát hàm số..."
                    className="admin-input"
                  />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <div className="admin-form-group">
                    <label htmlFor="form-chapter-order" className="admin-form-label">
                      Thứ tự giảng dạy
                    </label>
                    <input
                      id="form-chapter-order"
                      type="number"
                      min={1}
                      value={formOrder}
                      onChange={(e) => setFormOrder(Number(e.target.value))}
                      className="admin-input"
                    />
                  </div>
                  <div className="admin-form-group">
                    <label htmlFor="form-chapter-status" className="admin-form-label">
                      Trạng thái
                    </label>
                    <select
                      id="form-chapter-status"
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
              </div>

              <div className="admin-dialog-footer">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setIsDialogOpen(false)}
                >
                  Hủy
                </button>
                <button type="submit" className="btn btn-primary">
                  {editingChapter ? 'Lưu thay đổi' : 'Thêm chương học'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

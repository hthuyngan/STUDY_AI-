import React, { useEffect, useState, useMemo } from 'react'
import {
  Search,
  Plus,
  CheckCircle2,
  Calendar,
  Trash2,
  Edit2,
} from 'lucide-react'
import { operationsService } from '@/services/operations.service'
import { classroomService } from '@/services/classroom.service'
import type {
  AnnouncementAudience,
  AnnouncementItem,
  AnnouncementSeverity,
  AnnouncementStatus,
} from '@/types/operations'
import type { AdminClassItem } from '@/types/classroom'
import { Skeleton } from '@/components/ui/Skeleton'
import { EmptyState } from '@/components/ui/EmptyState'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { AdminSummaryStrip } from './components/common/AdminSummaryStrip'
import { AnnouncementCardList } from './components/announcements/AnnouncementCardList'
import './AdminPages.css'
import '@/components/admin/AdminComponents.css'
import './AdminPolish.css'

export const AdminAnnouncementsPage: React.FC = () => {
  const [announcements, setAnnouncements] = useState<AnnouncementItem[]>([])
  const [classes, setClasses] = useState<AdminClassItem[]>([])
  const [loading, setLoading] = useState(true)

  // Filters
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<'all' | AnnouncementStatus>('all')
  const [audienceFilter, setAudienceFilter] = useState<'all' | AnnouncementAudience>('all')

  // Modal
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingItem, setEditingItem] = useState<AnnouncementItem | null>(null)
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false)
  const [deletingItem, setDeletingItem] = useState<AnnouncementItem | null>(null)
  const [formData, setFormData] = useState({
    title: '',
    content: '',
    audience: 'all' as AnnouncementAudience,
    targetClassId: '',
    severity: 'info' as AnnouncementSeverity,
    status: 'published' as AnnouncementStatus,
  })
  const [toastMessage, setToastMessage] = useState<string | null>(null)

  const showToast = (msg: string) => {
    setToastMessage(msg)
    setTimeout(() => setToastMessage(null), 3500)
  }

  
  const announcementKPIs = useMemo(() => {
    const total = announcements.length
    const published = announcements.filter((a) => a.status === 'published').length
    const draft = announcements.filter((a) => a.status === 'draft').length
    const urgent = announcements.filter((a) => a.severity === 'danger' || a.severity === 'warning').length
    return [
      { id: 'total', label: 'Tổng số thông báo', value: total, color: 'var(--navy-primary, #102a43)' },
      { id: 'published', label: 'Đang hiển thị', value: published, color: '#16a34a' },
      { id: 'draft', label: 'Bản lưu nháp', value: draft, color: '#64748b' },
      { id: 'urgent', label: 'Cần lưu ý / Khẩn cấp', value: urgent, color: '#d97706' },
    ]
  }, [announcements])

  const loadData = () => {
    setLoading(true)
    Promise.all([
      operationsService.getAnnouncements(),
      classroomService.getClasses(),
    ])
      .then(([ancList, clsList]) => {
        setAnnouncements(ancList)
        setClasses(clsList)
        setLoading(false)
      })
      .catch((err) => {
        console.error(err)
        setLoading(false)
      })
  }

  useEffect(() => {
    let active = true
    Promise.all([
      operationsService.getAnnouncements(),
      classroomService.getClasses(),
    ])
      .then(([ancList, clsList]) => {
        if (active) {
          setAnnouncements(ancList)
          setClasses(clsList)
          setLoading(false)
        }
      })
      .catch((err) => {
        console.error(err)
        if (active) setLoading(false)
      })

    const handleOperationsChange = () => {
      operationsService.getAnnouncements().then((data) => {
        if (active) setAnnouncements(data)
      })
    }
    window.addEventListener('study_ai_operations_change', handleOperationsChange)

    return () => {
      active = false
      window.removeEventListener('study_ai_operations_change', handleOperationsChange)
    }
  }, [])

  // Filtered List
  const filteredAnnouncements = useMemo(() => {
    return announcements.filter((a) => {
      const matchSearch =
        a.title.toLowerCase().includes(search.toLowerCase()) ||
        a.content.toLowerCase().includes(search.toLowerCase()) ||
        a.createdBy.toLowerCase().includes(search.toLowerCase())
      const matchStatus = statusFilter === 'all' || a.status === statusFilter
      const matchAudience = audienceFilter === 'all' || a.audience === audienceFilter
      return matchSearch && matchStatus && matchAudience
    })
  }, [announcements, search, statusFilter, audienceFilter])

  const handleOpenCreate = () => {
    setEditingItem(null)
    setFormData({
      title: '',
      content: '',
      audience: 'all',
      targetClassId: '',
      severity: 'info',
      status: 'published',
    })
    setIsModalOpen(true)
  }

  const handleOpenEdit = (item: AnnouncementItem) => {
    setEditingItem(item)
    setFormData({
      title: item.title,
      content: item.content,
      audience: item.audience,
      targetClassId: item.targetClassId || '',
      severity: item.severity,
      status: item.status,
    })
    setIsModalOpen(true)
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.title.trim() || !formData.content.trim()) {
      alert('Vui lòng nhập đầy đủ tiêu đề và nội dung thông báo')
      return
    }

    const selectedCls = classes.find((c) => c.id === formData.targetClassId)
    const targetClassName = selectedCls ? selectedCls.name : undefined

    try {
      if (editingItem) {
        await operationsService.saveAnnouncement({
          ...editingItem,
          ...formData,
          targetClassName,
        })
        showToast(`Đã cập nhật thông báo: ${formData.title}`)
      } else {
        await operationsService.saveAnnouncement({
          ...formData,
          targetClassName,
        })
        showToast(`Đã tạo thông báo mới: ${formData.title}`)
      }
      setIsModalOpen(false)
      loadData()
    } catch (err: unknown) {
      if (err instanceof Error) alert(err.message)
    }
  }

  const handleDelete = (item: AnnouncementItem) => {
    setDeletingItem(item)
    setDeleteConfirmOpen(true)
  }

  const handleDeleteConfirm = async () => {
    if (!deletingItem) return
    try {
      await operationsService.deleteAnnouncement(deletingItem.id)
      showToast(`Đã xóa thông báo: ${deletingItem.title}`)
      setDeleteConfirmOpen(false)
      setDeletingItem(null)
      loadData()
    } catch (err: unknown) {
      if (err instanceof Error) alert(err.message)
    }
  }

  return (
    <div className="admin-page-container">
      {/* Toast */}
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
            <h1 className="staff-page-title">Thông báo hệ thống</h1>
            <p className="staff-page-desc">
              Tạo và phát hành các thông báo điều hành theo đối tượng người dùng (học viên, giáo viên, nhân viên, lớp học).
            </p>
          </div>
          <div className="admin-header-actions">
            <button
              type="button"
              className="btn btn-primary"
              onClick={handleOpenCreate}
            >
              <Plus size={16} />
              <span>Tạo thông báo mới</span>
            </button>
          </div>
        </div>
      </div>

      {/* 4 KPIs Summary Strip */}
      <AdminSummaryStrip items={announcementKPIs} ariaLabel="Thống kê nhanh thông báo hệ thống" />

      {/* Filter Bar */}
      <div className="admin-filter-bar">
        <div className="admin-search-input-wrap">
          <Search size={16} className="admin-search-icon" />
          <input
            type="text"
            className="admin-search-input"
            placeholder="Tìm theo tiêu đề hoặc nội dung thông báo..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <select
          className="admin-filter-select"
          value={audienceFilter}
          onChange={(e) => setAudienceFilter(e.target.value as 'all' | AnnouncementAudience)}
          aria-label="Lọc theo đối tượng"
        >
          <option value="all">Tất cả đối tượng</option>
          <option value="learners">Học viên</option>
          <option value="teachers">Giáo viên</option>
          <option value="staff">Nhân viên</option>
          <option value="class">Lớp cụ thể</option>
        </select>

        <select
          className="admin-filter-select"
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as 'all' | AnnouncementStatus)}
          aria-label="Lọc theo trạng thái"
        >
          <option value="all">Tất cả trạng thái</option>
          <option value="published">Đã xuất bản</option>
          <option value="draft">Bản nháp</option>
          <option value="scheduled">Đã lên lịch</option>
          <option value="archived">Lưu trữ</option>
        </select>

        {(search || audienceFilter !== 'all' || statusFilter !== 'all') && (
          <button
            type="button"
            className="admin-filter-btn-clear"
            onClick={() => {
              setSearch('')
              setAudienceFilter('all')
              setStatusFilter('all')
            }}
          >
            Xóa bộ lọc
          </button>
        )}
      </div>

      {/* Table */}
      <div className="staff-table-wrapper has-mobile-cards">
        {loading ? (
          <div style={{ padding: '24px' }}>
            <Skeleton height={48} />
          </div>
        ) : filteredAnnouncements.length === 0 ? (
          <EmptyState
            title="Chưa có thông báo nào"
            description="Tạo thông báo mới để gửi thông tin quan trọng tới học viên và giáo viên."
            actionLabel="Tạo thông báo mới"
            onAction={handleOpenCreate}
          />
        ) : (
          <>
            <table className="staff-table">
            <thead>
              <tr>
                <th>Tiêu đề thông báo</th>
                <th>Đối tượng</th>
                <th>Mức độ</th>
                <th>Người tạo</th>
                <th>Ngày phát hành</th>
                <th>Trạng thái</th>
                <th style={{ textAlign: 'right' }}>Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {filteredAnnouncements.map((a) => (
                <tr key={a.id}>
                  <td>
                    <div>
                      <strong style={{ color: '#102a43' }}>{a.title}</strong>
                      <p style={{ margin: '3px 0 0 0', fontSize: '0.82rem', color: '#627d98', maxWidth: 360, textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>
                        {a.content}
                      </p>
                    </div>
                  </td>
                  <td>
                    <span className="status-badge status-default" style={{ textTransform: 'capitalize' }}>
                      {a.audience === 'all'
                        ? 'Tất cả'
                        : a.audience === 'learners'
                        ? 'Học viên'
                        : a.audience === 'teachers'
                        ? 'Giáo viên'
                        : a.audience === 'staff'
                        ? 'Nhân viên'
                        : a.targetClassName || 'Lớp cụ thể'}
                    </span>
                  </td>
                  <td>
                    <span
                      className={`status-badge ${
                        a.severity === 'danger'
                          ? 'status-danger'
                          : a.severity === 'warning'
                          ? 'status-warning'
                          : a.severity === 'success'
                          ? 'status-success'
                          : 'status-info'
                      }`}
                    >
                      {a.severity === 'danger'
                        ? 'Khẩn cấp'
                        : a.severity === 'warning'
                        ? 'Cảnh báo'
                        : a.severity === 'success'
                        ? 'Thành công'
                        : 'Thông tin'}
                    </span>
                  </td>
                  <td>
                    <span style={{ fontSize: '0.85rem' }}>{a.createdBy}</span>
                  </td>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.82rem', color: '#627d98' }}>
                      <Calendar size={13} />
                      <span>{a.publishedAt ? new Date(a.publishedAt).toLocaleDateString('vi-VN') : 'Chưa phát hành'}</span>
                    </div>
                  </td>
                  <td>
                    <span className={`status-badge ${a.status === 'published' ? 'status-success' : 'status-default'}`}>
                      {a.status === 'published' ? 'Đang hiển thị' : a.status === 'draft' ? 'Bản nháp' : 'Đã lên lịch'}
                    </span>
                  </td>
                  <td style={{ textAlign: 'right' }}>
                    <div className="table-actions" style={{ justifyContent: 'flex-end', gap: 6 }}>
                      <button
                        type="button"
                        className="table-action-btn"
                        onClick={() => handleOpenEdit(a)}
                        title="Chỉnh sửa thông báo"
                      >
                        <Edit2 size={16} />
                      </button>
                      <button
                        type="button"
                        className="table-action-btn text-danger"
                        onClick={() => handleDelete(a)}
                        title="Xóa thông báo"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

            {/* Mobile Card List (<= 768px) */}
            <AnnouncementCardList
              announcements={filteredAnnouncements}
              onEdit={handleOpenEdit}
              onDelete={handleDelete}
            />
          </>
        )}
      </div>

      {/* Modal Tạo / Sửa thông báo */}
      {isModalOpen && (
        <div className="admin-modal-overlay" role="dialog" aria-modal="true">
          <div className="admin-modal-card" style={{ maxWidth: 520 }}>
            <div className="admin-modal-header">
              <h3 className="modal-title">{editingItem ? 'Chỉnh sửa thông báo' : 'Tạo thông báo mới'}</h3>
              <button
                type="button"
                className="modal-close-btn"
                onClick={() => setIsModalOpen(false)}
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSave}>
              <div className="admin-modal-body" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                <div>
                  <label className="form-label" htmlFor="anc-title">Tiêu đề thông báo <span className="text-danger">*</span></label>
                  <input
                    id="anc-title"
                    type="text"
                    className="form-input"
                    placeholder="VD: Lịch thi khảo sát trực tuyến tháng 11"
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    required
                  />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <div>
                    <label className="form-label" htmlFor="anc-audience">Đối tượng nhận</label>
                    <select
                      id="anc-audience"
                      className="form-input"
                      value={formData.audience}
                      onChange={(e) => setFormData({ ...formData, audience: e.target.value as AnnouncementAudience })}
                    >
                      <option value="all">Tất cả người dùng</option>
                      <option value="learners">Học viên</option>
                      <option value="teachers">Giáo viên</option>
                      <option value="staff">Nhân viên vận hành</option>
                      <option value="class">Một lớp học cụ thể</option>
                    </select>
                  </div>

                  <div>
                    <label className="form-label" htmlFor="anc-severity">Mức độ hiển thị</label>
                    <select
                      id="anc-severity"
                      className="form-input"
                      value={formData.severity}
                      onChange={(e) => setFormData({ ...formData, severity: e.target.value as AnnouncementSeverity })}
                    >
                      <option value="info">Thông tin (Xanh dương)</option>
                      <option value="warning">Cảnh báo (Vàng / Cam)</option>
                      <option value="danger">Khẩn cấp (Đỏ)</option>
                      <option value="success">Thành công (Xanh lá)</option>
                    </select>
                  </div>
                </div>

                {formData.audience === 'class' && (
                  <div>
                    <label className="form-label" htmlFor="anc-class-select">Chọn lớp nhận thông báo</label>
                    <select
                      id="anc-class-select"
                      className="form-input"
                      value={formData.targetClassId}
                      onChange={(e) => setFormData({ ...formData, targetClassId: e.target.value })}
                    >
                      <option value="">-- Chọn lớp học --</option>
                      {classes.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name} ({c.grade})
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                <div>
                  <label className="form-label" htmlFor="anc-content">Nội dung thông báo <span className="text-danger">*</span></label>
                  <textarea
                    id="anc-content"
                    className="form-input"
                    rows={4}
                    placeholder="Nhập nội dung chi tiết thông báo..."
                    value={formData.content}
                    onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                    required
                  />
                </div>

                <div>
                  <label className="form-label" htmlFor="anc-status">Trạng thái phát hành</label>
                  <select
                    id="anc-status"
                    className="form-input"
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value as AnnouncementStatus })}
                  >
                    <option value="published">Xuất bản ngay lập tức</option>
                    <option value="draft">Lưu dưới dạng bản nháp</option>
                    <option value="scheduled">Đã lên lịch</option>
                  </select>
                </div>
              </div>

              <div className="admin-modal-footer">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setIsModalOpen(false)}
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                >
                  {editingItem ? 'Lưu thay đổi' : 'Tạo thông báo'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        isOpen={deleteConfirmOpen}
        title="Xóa thông báo hệ thống"
        description={`Bạn có chắc chắn muốn xóa thông báo "${deletingItem?.title}"? Thao tác này không thể hoàn tác.`}
        confirmText="Xóa thông báo"
        cancelText="Hủy bỏ"
        isDestructive
        onConfirm={handleDeleteConfirm}
        onCancel={() => {
          setDeleteConfirmOpen(false)
          setDeletingItem(null)
        }}
      />
    </div>
  )
}
import React, { useEffect, useState, useMemo } from 'react'
import {
  Search,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Eye,
  Check,
  X,
  RotateCcw,
  BookOpen,
} from 'lucide-react'
import { Link } from 'react-router-dom'
import { operationsService } from '@/services/operations.service'
import type {
  ApprovalContentType,
  ApprovalItem,
  ApprovalStatus,
} from '@/types/operations'
import { Skeleton } from '@/components/ui/Skeleton'
import { EmptyState } from '@/components/ui/EmptyState'
import '../Admin/AdminPages.css'
import '@/components/admin/AdminComponents.css'

export const ContentReviewPage: React.FC = () => {
  const [approvals, setApprovals] = useState<ApprovalItem[]>([])
  const [loading, setLoading] = useState(true)

  // Filters
  const [search, setSearch] = useState('')
  const [typeFilter, setTypeFilter] = useState<'all' | ApprovalContentType>('all')
  const [statusFilter, setStatusFilter] = useState<'all' | ApprovalStatus>('all')

  // Rejection/Revision Modal
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [modalMode, setModalMode] = useState<'reject' | 'changes'>('reject')
  const [selectedItem, setSelectedItem] = useState<ApprovalItem | null>(null)
  const [actionReason, setActionReason] = useState('')
  const [toastMessage, setToastMessage] = useState<string | null>(null)

  const showToast = (msg: string) => {
    setToastMessage(msg)
    setTimeout(() => setToastMessage(null), 3500)
  }

  const loadData = () => {
    setLoading(true)
    operationsService
      .getApprovals()
      .then((data) => {
        setApprovals(data)
        setLoading(false)
      })
      .catch((err) => {
        console.error(err)
        setLoading(false)
      })
  }

  useEffect(() => {
    let active = true
    operationsService
      .getApprovals()
      .then((data) => {
        if (active) {
          setApprovals(data)
          setLoading(false)
        }
      })
      .catch((err) => {
        console.error(err)
        if (active) setLoading(false)
      })

    const handleOperationsChange = () => {
      operationsService.getApprovals().then((data) => {
        if (active) setApprovals(data)
      })
    }
    window.addEventListener('study_ai_operations_change', handleOperationsChange)

    return () => {
      active = false
      window.removeEventListener('study_ai_operations_change', handleOperationsChange)
    }
  }, [])

  // KPI Calculations
  const pendingCount = approvals.filter((a) => a.status === 'pending').length
  const approvedCount = approvals.filter((a) => a.status === 'approved').length
  const rejectedCount = approvals.filter((a) => a.status === 'rejected' || a.status === 'changes-requested').length
  const publishedCount = approvals.filter((a) => a.status === 'published').length

  // Filtered List
  const filteredApprovals = useMemo(() => {
    return approvals.filter((a) => {
      const matchSearch =
        a.title.toLowerCase().includes(search.toLowerCase()) ||
        a.authorName.toLowerCase().includes(search.toLowerCase()) ||
        a.subjectName.toLowerCase().includes(search.toLowerCase())
      const matchType = typeFilter === 'all' || a.contentType === typeFilter
      const matchStatus = statusFilter === 'all' || a.status === statusFilter
      return matchSearch && matchType && matchStatus
    })
  }, [approvals, search, typeFilter, statusFilter])

  const handleQuickApprove = async (item: ApprovalItem) => {
    if (window.confirm(`Xác nhận phê duyệt nội dung: "${item.title}"?`)) {
      try {
        await operationsService.approveContent(item.id, 'Phê duyệt nhanh từ danh sách', 'Demo Admin')
        showToast(`Đã phê duyệt nội dung: ${item.title}`)
        loadData()
      } catch (err: unknown) {
        if (err instanceof Error) alert(err.message)
      }
    }
  }

  const handleOpenActionModal = (item: ApprovalItem, mode: 'reject' | 'changes') => {
    setSelectedItem(item)
    setModalMode(mode)
    setActionReason('')
    setIsModalOpen(true)
  }

  const handleSaveAction = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedItem) return
    if (!actionReason.trim()) {
      alert('Vui lòng nhập lý do cụ thể')
      return
    }

    try {
      if (modalMode === 'reject') {
        await operationsService.rejectContent(selectedItem.id, actionReason, 'Demo Admin')
        showToast(`Đã từ chối nội dung: ${selectedItem.title}`)
      } else {
        await operationsService.requestChanges(selectedItem.id, actionReason, 'Demo Admin')
        showToast(`Đã gửi yêu cầu chỉnh sửa: ${selectedItem.title}`)
      }
      setIsModalOpen(false)
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
        <div className="admin-prototype-badge">
          <span className="prototype-dot"></span>
          <span>CONTENT WORKSPACE • PHÊ DUYỆT NỘI DUNG</span>
        </div>
        <div className="admin-header-row">
          <div>
            <h1 className="staff-page-title">Phê duyệt nội dung</h1>
            <p className="staff-page-desc">
              Kiểm tra chất lượng bài học và bài thu hoạch trước khi xuất bản lên nền tảng học tập chính thức.
            </p>
          </div>
        </div>
      </div>

      {/* 4 KPIs Compact */}
      <div className="admin-kpi-grid">
        <div className="admin-kpi-card">
          <div className="kpi-top-row">
            <span className="kpi-label">Chờ duyệt</span>
            <div className="kpi-icon-wrap" style={{ background: 'rgba(245, 158, 11, 0.1)', color: '#d97706' }}>
              <Clock size={20} />
            </div>
          </div>
          <div className="kpi-value-row">
            <span className="kpi-num" style={{ color: '#d97706' }}>{pendingCount}</span>
            <span className="kpi-comparison">Cần kiểm định</span>
          </div>
        </div>

        <div className="admin-kpi-card">
          <div className="kpi-top-row">
            <span className="kpi-label">Đã duyệt</span>
            <div className="kpi-icon-wrap" style={{ background: 'rgba(4, 120, 87, 0.08)', color: '#047857' }}>
              <CheckCircle2 size={20} />
            </div>
          </div>
          <div className="kpi-value-row">
            <span className="kpi-num" style={{ color: '#047857' }}>{approvedCount}</span>
            <span className="kpi-comparison">Sẵn sàng xuất bản</span>
          </div>
        </div>

        <div className="admin-kpi-card">
          <div className="kpi-top-row">
            <span className="kpi-label">Cần sửa / Từ chối</span>
            <div className="kpi-icon-wrap" style={{ background: 'rgba(220, 38, 38, 0.08)', color: '#dc2626' }}>
              <AlertTriangle size={20} />
            </div>
          </div>
          <div className="kpi-value-row">
            <span className="kpi-num" style={{ color: '#dc2626' }}>{rejectedCount}</span>
            <span className="kpi-comparison">Chờ tác giả cập nhật</span>
          </div>
        </div>

        <div className="admin-kpi-card">
          <div className="kpi-top-row">
            <span className="kpi-label">Đã xuất bản</span>
            <div className="kpi-icon-wrap" style={{ background: 'rgba(2, 132, 199, 0.08)', color: '#0284c7' }}>
              <BookOpen size={20} />
            </div>
          </div>
          <div className="kpi-value-row">
            <span className="kpi-num">{publishedCount}</span>
            <span className="kpi-comparison">Đang phục vụ học tập</span>
          </div>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="admin-filter-bar">
        <div className="admin-search-input-wrap">
          <Search size={16} className="admin-search-icon" />
          <input
            type="text"
            className="admin-search-input"
            placeholder="Tìm theo tiêu đề, tác giả hoặc môn học..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <select
          className="admin-filter-select"
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value as 'all' | ApprovalContentType)}
          aria-label="Lọc theo loại nội dung"
        >
          <option value="all">Tất cả loại nội dung</option>
          <option value="lesson">Bài học</option>
          <option value="assessment">Bài thu hoạch</option>
        </select>

        <select
          className="admin-filter-select"
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as 'all' | ApprovalStatus)}
          aria-label="Lọc theo trạng thái"
        >
          <option value="all">Tất cả trạng thái</option>
          <option value="pending">Chờ duyệt</option>
          <option value="approved">Đã duyệt</option>
          <option value="changes-requested">Yêu cầu chỉnh sửa</option>
          <option value="rejected">Bị từ chối</option>
          <option value="published">Đã xuất bản</option>
        </select>

        {(search || typeFilter !== 'all' || statusFilter !== 'all') && (
          <button
            type="button"
            className="admin-filter-btn-clear"
            onClick={() => {
              setSearch('')
              setTypeFilter('all')
              setStatusFilter('all')
            }}
          >
            Xóa bộ lọc
          </button>
        )}
      </div>

      {/* Table */}
      <div className="staff-table-wrapper">
        {loading ? (
          <div style={{ padding: '24px' }}>
            <Skeleton height={48} />
          </div>
        ) : filteredApprovals.length === 0 ? (
          <EmptyState
            title="Không có nội dung nào trong danh sách"
            description="Tất cả bài học và bài thu hoạch đều đã được xử lý hoặc chưa có nội dung gửi duyệt mới."
          />
        ) : (
          <table className="staff-table">
            <thead>
              <tr>
                <th>Tiêu đề nội dung</th>
                <th>Loại nội dung</th>
                <th>Môn học</th>
                <th>Người tạo</th>
                <th>Ngày gửi</th>
                <th>Trạng thái</th>
                <th style={{ textAlign: 'right' }}>Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {filteredApprovals.map((item) => (
                <tr key={item.id}>
                  <td>
                    <div>
                      <Link
                        to={`/content/review/${item.id}`}
                        className="font-medium text-navy-primary hover:underline"
                        style={{ fontWeight: 600, color: '#102a43' }}
                      >
                        {item.title}
                      </Link>
                      <div style={{ fontSize: '0.78rem', color: '#627d98' }}>
                        Phiên bản: <code style={{ background: '#f1f5f9', padding: '1px 4px', borderRadius: 4 }}>{item.version}</code>
                      </div>
                    </div>
                  </td>
                  <td>
                    <span className="status-badge status-default">
                      {item.contentType === 'lesson' ? 'Bài học' : item.contentType === 'assessment' ? 'Bài thu hoạch' : 'Bài tập'}
                    </span>
                  </td>
                  <td>
                    <strong style={{ fontSize: '0.88rem', color: '#334e68' }}>{item.subjectName}</strong>
                  </td>
                  <td>
                    <div>
                      <span style={{ fontSize: '0.88rem', fontWeight: 500 }}>{item.authorName}</span>
                      <div style={{ fontSize: '0.75rem', color: '#627d98' }}>{item.authorRole}</div>
                    </div>
                  </td>
                  <td>
                    <span style={{ fontSize: '0.82rem', color: '#627d98' }}>
                      {new Date(item.submittedAt).toLocaleDateString('vi-VN')}
                    </span>
                  </td>
                  <td>
                    <span
                      className={`status-badge ${
                        item.status === 'published'
                          ? 'status-success'
                          : item.status === 'approved'
                          ? 'status-info'
                          : item.status === 'pending'
                          ? 'status-warning'
                          : item.status === 'changes-requested'
                          ? 'status-danger'
                          : 'status-default'
                      }`}
                    >
                      {item.status === 'published'
                        ? 'Đã xuất bản'
                        : item.status === 'approved'
                        ? 'Đã duyệt'
                        : item.status === 'pending'
                        ? 'Chờ duyệt'
                        : item.status === 'changes-requested'
                        ? 'Yêu cầu sửa'
                        : 'Bị từ chối'}
                    </span>
                  </td>
                  <td style={{ textAlign: 'right' }}>
                    <div className="table-actions" style={{ justifyContent: 'flex-end', gap: 6 }}>
                      <Link
                        to={`/content/review/${item.id}`}
                        className="table-action-btn"
                        title="Xem chi tiết nội dung"
                      >
                        <Eye size={16} />
                      </Link>
                      {item.status === 'pending' && (
                        <>
                          <button
                            type="button"
                            className="table-action-btn text-success"
                            onClick={() => handleQuickApprove(item)}
                            title="Phê duyệt nhanh"
                          >
                            <Check size={16} />
                          </button>
                          <button
                            type="button"
                            className="table-action-btn text-warning"
                            onClick={() => handleOpenActionModal(item, 'changes')}
                            title="Yêu cầu chỉnh sửa"
                          >
                            <RotateCcw size={16} />
                          </button>
                          <button
                            type="button"
                            className="table-action-btn text-danger"
                            onClick={() => handleOpenActionModal(item, 'reject')}
                            title="Từ chối nội dung"
                          >
                            <X size={16} />
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Modal Từ chối / Yêu cầu chỉnh sửa */}
      {isModalOpen && selectedItem && (
        <div className="admin-modal-overlay" role="dialog" aria-modal="true">
          <div className="admin-modal-card" style={{ maxWidth: 480 }}>
            <div className="admin-modal-header">
              <h3 className="modal-title">
                {modalMode === 'reject' ? 'Từ chối phê duyệt nội dung' : 'Yêu cầu tác giả chỉnh sửa'}
              </h3>
              <button
                type="button"
                className="modal-close-btn"
                onClick={() => setIsModalOpen(false)}
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveAction}>
              <div className="admin-modal-body" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                <div style={{ background: '#f8fafc', padding: 12, borderRadius: 6 }}>
                  <div style={{ fontWeight: 600, color: '#102a43' }}>{selectedItem.title}</div>
                  <div style={{ fontSize: '0.8rem', color: '#627d98' }}>Tác giả: {selectedItem.authorName} • {selectedItem.subjectName}</div>
                </div>

                <div>
                  <label className="form-label" htmlFor="reason-input">
                    {modalMode === 'reject' ? 'Lý do từ chối' : 'Nội dung và lý do cần chỉnh sửa'} <span className="text-danger">*</span>
                  </label>
                  <textarea
                    id="reason-input"
                    className="form-input"
                    rows={4}
                    placeholder={
                      modalMode === 'reject'
                        ? 'Nêu rõ lý do nội dung không đạt chuẩn...'
                        : 'Mô tả chi tiết những phần kiến thức, câu hỏi hoặc ví dụ cần cập nhật...'
                    }
                    value={actionReason}
                    onChange={(e) => setActionReason(e.target.value)}
                    required
                  />
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
                  className={`btn ${modalMode === 'reject' ? 'btn-danger' : 'btn-primary'}`}
                >
                  {modalMode === 'reject' ? 'Xác nhận từ chối' : 'Gửi yêu cầu sửa'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

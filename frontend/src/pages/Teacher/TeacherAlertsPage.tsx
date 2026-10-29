import React, { useEffect, useState, useMemo } from 'react'
import {
  AlertTriangle,
  Search,
  CheckCircle2,
  Clock,
  Eye,
  Edit2,
  ShieldAlert,
  HelpCircle,
} from 'lucide-react'
import { Link } from 'react-router-dom'
import { classroomService } from '@/services/classroom.service'
import type {
  AdminLearningAlert,
  AlertSeverity,
  AlertStatus,
} from '@/types/classroom'
import { Skeleton } from '@/components/ui/Skeleton'
import { EmptyState } from '@/components/ui/EmptyState'
import './TeacherPages.css'
import '../Admin/AdminPages.css'
import '@/components/admin/AdminComponents.css'

export const TeacherAlertsPage: React.FC = () => {
  const [alerts, setAlerts] = useState<AdminLearningAlert[]>([])
  const [loading, setLoading] = useState(true)

  // Filters
  const [search, setSearch] = useState('')
  const [severityFilter, setSeverityFilter] = useState<'all' | AlertSeverity>('all')
  const [statusFilter, setStatusFilter] = useState<'all' | AlertStatus>('all')

  // Resolve Modal
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [selectedAlert, setSelectedAlert] = useState<AdminLearningAlert | null>(null)
  const [newStatus, setNewStatus] = useState<AlertStatus>('resolved')
  const [resolutionNote, setResolutionNote] = useState('')
  const [toastMessage, setToastMessage] = useState<string | null>(null)

  const showToast = (msg: string) => {
    setToastMessage(msg)
    setTimeout(() => setToastMessage(null), 3500)
  }

  const loadAlerts = () => {
    setLoading(true)
    classroomService
      .getAlerts()
      .then((data) => {
        setAlerts(data)
        setLoading(false)
      })
      .catch((err) => {
        console.error(err)
        setLoading(false)
      })
  }

  useEffect(() => {
    let active = true
    classroomService
      .getAlerts()
      .then((data) => {
        if (active) {
          setAlerts(data)
          setLoading(false)
        }
      })
      .catch((err) => {
        console.error(err)
        if (active) setLoading(false)
      })
    return () => {
      active = false
    }
  }, [])

  // KPI Calculations
  const totalAlerts = alerts.length
  const highCount = alerts.filter((a) => a.severity === 'high' && a.status !== 'resolved').length
  const mediumCount = alerts.filter((a) => a.severity === 'medium' && a.status !== 'resolved').length
  const resolvedCount = alerts.filter((a) => a.status === 'resolved').length

  // Filtered List
  const filteredAlerts = useMemo(() => {
    return alerts.filter((a) => {
      const matchSearch =
        a.studentName.toLowerCase().includes(search.toLowerCase()) ||
        a.className.toLowerCase().includes(search.toLowerCase()) ||
        a.reason.toLowerCase().includes(search.toLowerCase())
      const matchSeverity = severityFilter === 'all' || a.severity === severityFilter
      const matchStatus = statusFilter === 'all' || a.status === statusFilter
      return matchSearch && matchSeverity && matchStatus
    })
  }, [alerts, search, severityFilter, statusFilter])

  const handleOpenActionModal = (alertItem: AdminLearningAlert) => {
    setSelectedAlert(alertItem)
    setNewStatus(alertItem.status)
    setResolutionNote(alertItem.resolutionNote || '')
    setIsModalOpen(true)
  }

  const handleSaveAction = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedAlert) return

    try {
      await classroomService.updateAlertStatus(selectedAlert.id, newStatus, resolutionNote)
      showToast(`Đã cập nhật trạng thái cảnh báo cho học sinh ${selectedAlert.studentName}`)
      setIsModalOpen(false)
      loadAlerts()
    } catch (err: unknown) {
      if (err instanceof Error) alert(err.message)
    }
  }

  const handleResolveAll = async () => {
    if (window.confirm('Bạn có chắc muốn đánh dấu tất cả các cảnh báo là Đã giải quyết?')) {
      try {
        await classroomService.resolveAllAlerts()
        showToast('Đã đánh dấu tất cả cảnh báo là Đã giải quyết')
        loadAlerts()
      } catch (err: unknown) {
        if (err instanceof Error) alert(err.message)
      }
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
          <span>TEACHER WORKSPACE • CẢNH BÁO HỌC TẬP</span>
        </div>
        <div className="admin-header-row">
          <div>
            <nav className="staff-breadcrumbs" aria-label="Breadcrumb" style={{ marginBottom: 4 }}>
              <Link to="/teacher">Giáo viên</Link>
              <span style={{ margin: '0 6px', color: '#94a3b8' }}>/</span>
              <span aria-current="page" style={{ color: '#102a43', fontWeight: 600 }}>Cảnh báo</span>
            </nav>
            <h1 className="staff-page-title">Cảnh báo học tập</h1>
            <p className="staff-page-desc">
              Phát hiện sớm học sinh chậm tiến độ, chưa nộp bài hoặc điểm số dưới chuẩn để can thiệp sư phạm kịp thời.
            </p>
          </div>
          <div className="admin-header-actions">
            <button
              type="button"
              className="btn btn-secondary"
              onClick={handleResolveAll}
              style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}
            >
              <CheckCircle2 size={16} />
              <span>Đánh dấu tất cả đã xử lý</span>
            </button>
          </div>
        </div>
      </div>

      {/* 4 KPIs */}
      <div className="admin-kpi-grid">
        <div className="admin-kpi-card">
          <div className="kpi-top-row">
            <span className="kpi-label">Tổng cảnh báo</span>
            <div className="kpi-icon-wrap" style={{ background: 'rgba(16, 42, 67, 0.08)', color: '#102a43' }}>
              <AlertTriangle size={20} />
            </div>
          </div>
          <div className="kpi-value-row">
            <span className="kpi-num">{totalAlerts}</span>
            <span className="kpi-comparison">Toàn bộ các lớp</span>
          </div>
        </div>

        <div className="admin-kpi-card">
          <div className="kpi-top-row">
            <span className="kpi-label">Nghiêm trọng (Cao)</span>
            <div className="kpi-icon-wrap" style={{ background: 'rgba(220, 38, 38, 0.08)', color: '#dc2626' }}>
              <ShieldAlert size={20} />
            </div>
          </div>
          <div className="kpi-value-row">
            <span className="kpi-num" style={{ color: '#dc2626' }}>{highCount}</span>
            <span className="kpi-comparison" style={{ color: '#b91c1c' }}>Cần can thiệp gấp</span>
          </div>
        </div>

        <div className="admin-kpi-card">
          <div className="kpi-top-row">
            <span className="kpi-label">Cần chú ý (Vừa)</span>
            <div className="kpi-icon-wrap" style={{ background: 'rgba(245, 158, 11, 0.1)', color: '#d97706' }}>
              <HelpCircle size={20} />
            </div>
          </div>
          <div className="kpi-value-row">
            <span className="kpi-num" style={{ color: '#d97706' }}>{mediumCount}</span>
            <span className="kpi-comparison">Theo dõi sát sao</span>
          </div>
        </div>

        <div className="admin-kpi-card">
          <div className="kpi-top-row">
            <span className="kpi-label">Đã giải quyết</span>
            <div className="kpi-icon-wrap" style={{ background: 'rgba(4, 120, 87, 0.08)', color: '#047857' }}>
              <CheckCircle2 size={20} />
            </div>
          </div>
          <div className="kpi-value-row">
            <span className="kpi-num" style={{ color: '#047857' }}>{resolvedCount}</span>
            <span className="kpi-comparison">Đã xử lý xong</span>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="admin-filter-bar">
        <div className="admin-search-input-wrap">
          <Search size={16} className="admin-search-icon" />
          <input
            type="text"
            className="admin-search-input"
            placeholder="Tìm theo tên học sinh, lớp hoặc lý do cảnh báo..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <select
          aria-label="Lọc theo mức độ nghiêm trọng"
          className="admin-filter-select"
          value={severityFilter}
          onChange={(e) => setSeverityFilter(e.target.value as 'all' | AlertSeverity)}
        >
          <option value="all">Tất cả mức độ</option>
          <option value="high">Nghiêm trọng (Cao)</option>
          <option value="medium">Cần chú ý (Trung bình)</option>
          <option value="low">Nhắc nhở (Thấp)</option>
        </select>

        <select
          aria-label="Lọc theo trạng thái xử lý"
          className="admin-filter-select"
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as 'all' | AlertStatus)}
        >
          <option value="all">Tất cả trạng thái</option>
          <option value="unresolved">Chưa xử lý</option>
          <option value="investigating">Đang theo dõi</option>
          <option value="resolved">Đã giải quyết</option>
        </select>

        {(search || severityFilter !== 'all' || statusFilter !== 'all') && (
          <button
            type="button"
            className="admin-filter-btn-clear"
            onClick={() => {
              setSearch('')
              setSeverityFilter('all')
              setStatusFilter('all')
            }}
          >
            Xóa bộ lọc
          </button>
        )}
      </div>

      {/* Grouped Alert List: Desktop Table + Mobile Cards */}
      <div className="teacher-classes-wrapper">
        {loading ? (
          <div style={{ padding: '24px' }}>
            <Skeleton height={48} />
          </div>
        ) : filteredAlerts.length === 0 ? (
          <EmptyState
            title="Không có cảnh báo nào"
            description="Tất cả học sinh trong các lớp đều đang đảm bảo tiến độ và điểm số học tập."
          />
        ) : (
          <>
            {/* Desktop Table View */}
            <div className="staff-table-wrapper teacher-desktop-table">
              <table className="staff-table">
                <thead>
                  <tr>
                    <th>Học sinh</th>
                    <th>Lớp</th>
                    <th>Mức độ</th>
                    <th>Lý do cảnh báo</th>
                    <th>Chỉ số phát hiện</th>
                    <th>Thời gian</th>
                    <th>Trạng thái</th>
                    <th style={{ textAlign: 'right' }}>Thao tác</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredAlerts.map((alr) => (
                    <tr key={alr.id}>
                      <td>
                        <Link
                          to={`/teacher/students/${alr.studentId}`}
                          className="font-medium text-navy-primary hover:underline"
                          style={{ fontWeight: 600, color: '#102a43' }}
                        >
                          {alr.studentName}
                        </Link>
                      </td>
                      <td>
                        <span style={{ fontWeight: 500 }}>{alr.className}</span>
                      </td>
                      <td>
                        <span
                          className={`status-badge ${
                            alr.severity === 'high'
                              ? 'status-danger'
                              : alr.severity === 'medium'
                              ? 'status-warning'
                              : 'status-default'
                          }`}
                        >
                          {alr.severity === 'high' ? 'Cao' : alr.severity === 'medium' ? 'Vừa' : 'Thấp'}
                        </span>
                      </td>
                      <td style={{ maxWidth: 280, color: '#102a43' }}>
                        {alr.reason}
                        {alr.resolutionNote && (
                          <div style={{ fontSize: '0.78rem', color: '#047857', marginTop: 2 }}>
                            ✓ Ghi chú: {alr.resolutionNote}
                          </div>
                        )}
                      </td>
                      <td>
                        <code style={{ background: '#f1f5f9', padding: '2px 6px', borderRadius: 4, fontSize: '0.8rem' }}>
                          {alr.indicator}
                        </code>
                      </td>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.85rem', color: '#627d98' }}>
                          <Clock size={13} />
                          <span>{new Date(alr.detectedAt).toLocaleDateString('vi-VN')}</span>
                        </div>
                      </td>
                      <td>
                        <span
                          className={`status-badge ${
                            alr.status === 'resolved'
                              ? 'status-success'
                              : alr.status === 'investigating'
                              ? 'status-info'
                              : 'status-danger'
                          }`}
                        >
                          {alr.status === 'resolved'
                            ? 'Đã xử lý'
                            : alr.status === 'investigating'
                            ? 'Đang theo dõi'
                            : 'Chưa xử lý'}
                        </span>
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        <div className="table-actions" style={{ justifyContent: 'flex-end', gap: 6 }}>
                          <Link
                            to={`/teacher/students/${alr.studentId}`}
                            className="table-action-btn"
                            title="Xem hồ sơ học sinh"
                            aria-label={`Xem hồ sơ ${alr.studentName}`}
                          >
                            <Eye size={16} />
                          </Link>
                          <button
                            type="button"
                            className="table-action-btn"
                            onClick={() => handleOpenActionModal(alr)}
                            title="Cập nhật trạng thái can thiệp"
                            aria-label={`Cập nhật can thiệp ${alr.studentName}`}
                          >
                            <Edit2 size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile Cards List (<768px) */}
            <div className="teacher-mobile-cards-list">
              {filteredAlerts.map((alr) => (
                <div key={alr.id} className="teacher-card-item">
                  <div className="teacher-card-item-header">
                    <div>
                      <Link to={`/teacher/students/${alr.studentId}`} className="teacher-card-title">
                        {alr.studentName}
                      </Link>
                      <div className="teacher-card-meta-line">
                        <span>Lớp: {alr.className}</span>
                        <span>•</span>
                        <span>{new Date(alr.detectedAt).toLocaleDateString('vi-VN')}</span>
                      </div>
                    </div>
                    <span
                      className={`status-badge ${
                        alr.severity === 'high'
                          ? 'status-danger'
                          : alr.severity === 'medium'
                          ? 'status-warning'
                          : 'status-default'
                      }`}
                    >
                      {alr.severity === 'high' ? 'Cao' : 'Vừa'}
                    </span>
                  </div>

                  <p style={{ margin: '8px 0', fontSize: '0.88rem', color: '#102a43', lineHeight: 1.4 }}>
                    {alr.reason}
                  </p>

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 4 }}>
                    <code style={{ background: '#f1f5f9', padding: '2px 6px', borderRadius: 4, fontSize: '0.78rem' }}>
                      {alr.indicator}
                    </code>
                    <span
                      className={`status-badge ${
                        alr.status === 'resolved'
                          ? 'status-success'
                          : alr.status === 'investigating'
                          ? 'status-info'
                          : 'status-danger'
                      }`}
                    >
                      {alr.status === 'resolved' ? 'Đã xử lý' : alr.status === 'investigating' ? 'Đang theo dõi' : 'Chưa xử lý'}
                    </span>
                  </div>

                  <div className="teacher-card-item-footer">
                    <Link
                      to={`/teacher/students/${alr.studentId}`}
                      className="btn btn-secondary btn-sm"
                      style={{ flex: 1, textAlign: 'center', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 6 }}
                    >
                      <Eye size={14} />
                      <span>Hồ sơ học sinh</span>
                    </Link>
                    <button
                      type="button"
                      className="btn btn-primary btn-sm"
                      onClick={() => handleOpenActionModal(alr)}
                      style={{ display: 'flex', alignItems: 'center', gap: 6 }}
                    >
                      <Edit2 size={14} />
                      <span>Xử lý</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      {/* Modal Cập Nhật Trạng Thái Can Thiệp */}
      {isModalOpen && selectedAlert && (
        <div className="admin-modal-overlay" role="dialog" aria-modal="true">
          <div className="admin-modal-card" style={{ maxWidth: 440 }}>
            <div className="admin-modal-header">
              <h3 className="modal-title">Ghi nhận can thiệp học sinh</h3>
              <button
                type="button"
                className="modal-close-btn"
                onClick={() => setIsModalOpen(false)}
                aria-label="Đóng"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveAction}>
              <div className="admin-modal-body" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                <div style={{ background: '#f8fafc', padding: 12, borderRadius: 6, border: '1px solid #e2e8f0' }}>
                  <div style={{ fontWeight: 600, color: '#102a43' }}>{selectedAlert.studentName} ({selectedAlert.className})</div>
                  <div style={{ fontSize: '0.82rem', color: '#627d98', marginTop: 2 }}>{selectedAlert.reason}</div>
                </div>

                <div>
                  <label className="form-label" htmlFor="alert-status-select">
                    Trạng thái can thiệp <span className="text-danger">*</span>
                  </label>
                  <select
                    id="alert-status-select"
                    className="form-input"
                    value={newStatus}
                    onChange={(e) => setNewStatus(e.target.value as AlertStatus)}
                  >
                    <option value="investigating">Đang theo dõi & Nhắc nhở</option>
                    <option value="resolved">Đã giải quyết xong</option>
                    <option value="unresolved">Chưa giải quyết</option>
                  </select>
                </div>

                <div>
                  <label className="form-label" htmlFor="alert-note-input">
                    Ghi chú sư phạm / Hướng xử lý
                  </label>
                  <textarea
                    id="alert-note-input"
                    className="form-input"
                    rows={3}
                    placeholder="VD: Đã liên hệ phụ huynh và giao bài tập củng cố thêm..."
                    value={resolutionNote}
                    onChange={(e) => setResolutionNote(e.target.value)}
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
                  className="btn btn-primary"
                >
                  Lưu kết quả
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

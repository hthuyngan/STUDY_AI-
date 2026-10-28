import React, { useEffect, useState, useMemo } from 'react'
import {
  LifeBuoy,
  Search,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Eye,
  UserCheck,
  MessageSquare,
} from 'lucide-react'
import { Link } from 'react-router-dom'
import { supportService } from '@/services/support.service'
import type {
  SupportTicketItem,
  TicketCategory,
  TicketPriority,
  TicketStatus,
} from '@/types/support'
import { Skeleton } from '@/components/ui/Skeleton'
import { EmptyState } from '@/components/ui/EmptyState'
import '../Admin/AdminPages.css'
import '@/components/admin/AdminComponents.css'
import './SupportPages.css'

export const SupportTicketsPage: React.FC = () => {
  const [tickets, setTickets] = useState<SupportTicketItem[]>([])
  const [loading, setLoading] = useState(true)

  // Filters
  const [search, setSearch] = useState('')
  const [categoryFilter, setCategoryFilter] = useState<'all' | TicketCategory>('all')
  const [priorityFilter, setPriorityFilter] = useState<'all' | TicketPriority>('all')
  const [statusFilter, setStatusFilter] = useState<'all' | TicketStatus>('all')

  // Assign Modal
  const [isAssignOpen, setIsAssignOpen] = useState(false)
  const [selectedTicket, setSelectedTicket] = useState<SupportTicketItem | null>(null)
  const [assigneeName, setAssigneeName] = useState('Lê Hữu Phúc')
  const [toastMessage, setToastMessage] = useState<string | null>(null)

  const showToast = (msg: string) => {
    setToastMessage(msg)
    setTimeout(() => setToastMessage(null), 3500)
  }

  const loadData = () => {
    setLoading(true)
    supportService
      .getTickets()
      .then((data) => {
        setTickets(data)
        setLoading(false)
      })
      .catch((err) => {
        console.error(err)
        setLoading(false)
      })
  }

  useEffect(() => {
    let active = true
    supportService
      .getTickets()
      .then((data) => {
        if (active) {
          setTickets(data)
          setLoading(false)
        }
      })
      .catch((err) => {
        console.error(err)
        if (active) setLoading(false)
      })

    const handleOperationsChange = () => {
      supportService.getTickets().then((data) => {
        if (active) setTickets(data)
      })
    }
    window.addEventListener('study_ai_operations_change', handleOperationsChange)

    return () => {
      active = false
      window.removeEventListener('study_ai_operations_change', handleOperationsChange)
    }
  }, [])

  // KPI Calculations
  const totalCount = tickets.length
  const openCount = tickets.filter((t) => t.status === 'open').length
  const inProgressCount = tickets.filter((t) => t.status === 'in-progress' || t.status === 'waiting').length
  const resolvedCount = tickets.filter((t) => t.status === 'resolved').length

  // Filtered List
  const filteredTickets = useMemo(() => {
    return tickets.filter((t) => {
      const matchSearch =
        t.title.toLowerCase().includes(search.toLowerCase()) ||
        t.userName.toLowerCase().includes(search.toLowerCase()) ||
        t.userEmail.toLowerCase().includes(search.toLowerCase()) ||
        t.id.toLowerCase().includes(search.toLowerCase())
      const matchCat = categoryFilter === 'all' || t.category === categoryFilter
      const matchPri = priorityFilter === 'all' || t.priority === priorityFilter
      const matchStatus = statusFilter === 'all' || t.status === statusFilter
      return matchSearch && matchCat && matchPri && matchStatus
    })
  }, [tickets, search, categoryFilter, priorityFilter, statusFilter])

  const handleOpenAssignModal = (ticket: SupportTicketItem) => {
    setSelectedTicket(ticket)
    setAssigneeName(ticket.assignedTo || 'Lê Hữu Phúc')
    setIsAssignOpen(true)
  }

  const handleSaveAssign = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedTicket) return

    try {
      await supportService.assignTicket(selectedTicket.id, assigneeName, 'Demo Support')
      showToast(`Đã phân công ticket ${selectedTicket.id} cho ${assigneeName}`)
      setIsAssignOpen(false)
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
          <span>SUPPORT WORKSPACE • VẬN HÀNH & HỖ TRỢ</span>
        </div>
        <div className="admin-header-row">
          <div>
            <h1 className="staff-page-title">Yêu cầu hỗ trợ (Support Tickets)</h1>
            <p className="staff-page-desc">
              Tiếp nhận, phân công và xử lý các sự cố kỹ thuật, học tập hoặc tài khoản của học viên và giáo viên.
            </p>
          </div>
        </div>
      </div>

      {/* 4 KPIs */}
      <div className="admin-kpi-grid">
        <div className="admin-kpi-card">
          <div className="kpi-top-row">
            <span className="kpi-label">Tổng yêu cầu</span>
            <div className="kpi-icon-wrap" style={{ background: 'rgba(16, 42, 67, 0.08)', color: '#102a43' }}>
              <LifeBuoy size={20} />
            </div>
          </div>
          <div className="kpi-value-row">
            <span className="kpi-num">{totalCount}</span>
            <span className="kpi-comparison">Đã ghi nhận</span>
          </div>
        </div>

        <div className="admin-kpi-card">
          <div className="kpi-top-row">
            <span className="kpi-label">Chưa xử lý (Mới)</span>
            <div className="kpi-icon-wrap" style={{ background: 'rgba(220, 38, 38, 0.08)', color: '#dc2626' }}>
              <AlertTriangle size={20} />
            </div>
          </div>
          <div className="kpi-value-row">
            <span className="kpi-num" style={{ color: '#dc2626' }}>{openCount}</span>
            <span className="kpi-comparison">Cần tiếp nhận</span>
          </div>
        </div>

        <div className="admin-kpi-card">
          <div className="kpi-top-row">
            <span className="kpi-label">Đang giải quyết</span>
            <div className="kpi-icon-wrap" style={{ background: 'rgba(245, 158, 11, 0.1)', color: '#d97706' }}>
              <Clock size={20} />
            </div>
          </div>
          <div className="kpi-value-row">
            <span className="kpi-num" style={{ color: '#d97706' }}>{inProgressCount}</span>
            <span className="kpi-comparison">Đã phân công</span>
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
            <span className="kpi-comparison">Xong việc</span>
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
            placeholder="Tìm theo mã ticket, tiêu đề hoặc tên người gửi..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <select
          className="admin-filter-select"
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value as 'all' | TicketCategory)}
          aria-label="Lọc theo loại vấn đề"
        >
          <option value="all">Tất cả loại vấn đề</option>
          <option value="account">Tài khoản</option>
          <option value="sync">Đồng bộ dữ liệu</option>
          <option value="billing">Học phí / Gói học</option>
          <option value="content">Nội dung bài học</option>
          <option value="other">Vấn đề khác</option>
        </select>

        <select
          className="admin-filter-select"
          value={priorityFilter}
          onChange={(e) => setPriorityFilter(e.target.value as 'all' | TicketPriority)}
          aria-label="Lọc theo mức ưu tiên"
        >
          <option value="all">Tất cả mức ưu tiên</option>
          <option value="urgent">Khẩn cấp (Urgent)</option>
          <option value="high">Cao (High)</option>
          <option value="medium">Trung bình (Medium)</option>
          <option value="low">Thấp (Low)</option>
        </select>

        <select
          className="admin-filter-select"
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as 'all' | TicketStatus)}
          aria-label="Lọc theo trạng thái"
        >
          <option value="all">Tất cả trạng thái</option>
          <option value="open">Chưa xử lý (Open)</option>
          <option value="in-progress">Đang xử lý</option>
          <option value="waiting">Chờ phản hồi</option>
          <option value="resolved">Đã giải quyết</option>
        </select>

        {(search || categoryFilter !== 'all' || priorityFilter !== 'all' || statusFilter !== 'all') && (
          <button
            type="button"
            className="admin-filter-btn-clear"
            onClick={() => {
              setSearch('')
              setCategoryFilter('all')
              setPriorityFilter('all')
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
        ) : filteredTickets.length === 0 ? (
          <EmptyState
            title="Không tìm thấy yêu cầu hỗ trợ nào"
            description="Tất cả các sự cố của người dùng đã được giải quyết hoặc chưa có khiếu nại mới."
          />
        ) : (
          <table className="staff-table">
            <thead>
              <tr>
                <th>Mã Ticket</th>
                <th>Tiêu đề yêu cầu</th>
                <th>Người gửi</th>
                <th>Loại vấn đề</th>
                <th>Mức độ</th>
                <th>Nhân viên phụ trách</th>
                <th>Trạng thái</th>
                <th>Cập nhật cuối</th>
                <th style={{ textAlign: 'right' }}>Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {filteredTickets.map((t) => (
                <tr key={t.id}>
                  <td>
                    <code>{t.id}</code>
                  </td>
                  <td>
                    <Link
                      to={`/support/tickets/${t.id}`}
                      className="font-medium text-navy-primary hover:underline"
                      style={{ fontWeight: 600, color: '#102a43' }}
                    >
                      {t.title}
                    </Link>
                    <div style={{ fontSize: '0.78rem', color: '#627d98', display: 'flex', alignItems: 'center', gap: 4 }}>
                      <MessageSquare size={12} />
                      <span>{t.messageCount} phản hồi</span>
                    </div>
                  </td>
                  <td>
                    <div>
                      <span style={{ fontWeight: 500 }}>{t.userName}</span>
                      <div style={{ fontSize: '0.78rem', color: '#627d98' }}>{t.userEmail}</div>
                    </div>
                  </td>
                  <td>
                    <span className="status-badge status-default" style={{ textTransform: 'capitalize' }}>
                      {t.category}
                    </span>
                  </td>
                  <td>
                    <span
                      className={`status-badge ${
                        t.priority === 'urgent'
                          ? 'status-danger'
                          : t.priority === 'high'
                          ? 'status-danger'
                          : t.priority === 'medium'
                          ? 'status-warning'
                          : 'status-default'
                      }`}
                    >
                      {t.priority === 'urgent'
                        ? 'Khẩn cấp'
                        : t.priority === 'high'
                        ? 'Cao'
                        : t.priority === 'medium'
                        ? 'Trung bình'
                        : 'Thấp'}
                    </span>
                  </td>
                  <td>
                    <span style={{ fontWeight: 500, color: t.assignedTo ? '#102a43' : '#94a3b8' }}>
                      {t.assignedTo || 'Chưa phân công'}
                    </span>
                  </td>
                  <td>
                    <span
                      className={`status-badge ${
                        t.status === 'resolved'
                          ? 'status-success'
                          : t.status === 'in-progress'
                          ? 'status-info'
                          : t.status === 'waiting'
                          ? 'status-warning'
                          : 'status-danger'
                      }`}
                    >
                      {t.status === 'resolved'
                        ? 'Đã giải quyết'
                        : t.status === 'in-progress'
                        ? 'Đang xử lý'
                        : t.status === 'waiting'
                        ? 'Chờ phản hồi'
                        : 'Chưa xử lý'}
                    </span>
                  </td>
                  <td>
                    <span style={{ fontSize: '0.8rem', color: '#627d98' }}>
                      {new Date(t.updatedAt).toLocaleDateString('vi-VN')}
                    </span>
                  </td>
                  <td style={{ textAlign: 'right' }}>
                    <div className="table-actions" style={{ justifyContent: 'flex-end', gap: 6 }}>
                      <Link
                        to={`/support/tickets/${t.id}`}
                        className="table-action-btn"
                        title="Xem chi tiết ticket"
                      >
                        <Eye size={16} />
                      </Link>
                      <button
                        type="button"
                        className="table-action-btn"
                        onClick={() => handleOpenAssignModal(t)}
                        title="Phân công nhân viên phụ trách"
                      >
                        <UserCheck size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Modal Phân công */}
      {isAssignOpen && selectedTicket && (
        <div className="admin-modal-overlay" role="dialog" aria-modal="true">
          <div className="admin-modal-card" style={{ maxWidth: 440 }}>
            <div className="admin-modal-header">
              <h3 className="modal-title">Phân công nhân viên xử lý</h3>
              <button
                type="button"
                className="modal-close-btn"
                onClick={() => setIsAssignOpen(false)}
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveAssign}>
              <div className="admin-modal-body" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                <div style={{ background: '#f8fafc', padding: 12, borderRadius: 6 }}>
                  <div style={{ fontWeight: 600, color: '#102a43' }}>[{selectedTicket.id}] {selectedTicket.title}</div>
                  <div style={{ fontSize: '0.8rem', color: '#627d98' }}>Người gửi: {selectedTicket.userName} ({selectedTicket.userEmail})</div>
                </div>

                <div>
                  <label className="form-label" htmlFor="staff-select">Chọn nhân viên phụ trách <span className="text-danger">*</span></label>
                  <select
                    id="staff-select"
                    className="form-input"
                    value={assigneeName}
                    onChange={(e) => setAssigneeName(e.target.value)}
                    required
                  >
                    <option value="Lê Hữu Phúc">Lê Hữu Phúc (Chuyên viên Kỹ thuật)</option>
                    <option value="Trần Thị Thanh">Trần Thị Thanh (Chăm sóc Khách hàng)</option>
                    <option value="Nguyễn Văn An">Nguyễn Văn An (Quản trị Hệ thống)</option>
                    <option value="Demo Support">Demo Support (Hỗ trợ viên)</option>
                  </select>
                </div>
              </div>

              <div className="admin-modal-footer">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setIsAssignOpen(false)}
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                >
                  Xác nhận phân công
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

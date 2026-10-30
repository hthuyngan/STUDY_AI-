import React, { useEffect, useState, useMemo } from 'react'
import {
  Search,
  CheckCircle2,
  UserCheck,
} from 'lucide-react'
import { supportService } from '@/services/support.service'
import type {
  SupportTicketItem,
  TicketCategory,
  TicketPriority,
  TicketStatus,
} from '@/types/support'
import { Skeleton } from '@/components/ui/Skeleton'
import { EmptyState } from '@/components/ui/EmptyState'
import { SummaryStrip } from '@/components/ui/SummaryStrip'
import { SupportTicketTable } from './components/tickets/SupportTicketTable'
import { SupportTicketCardList } from './components/tickets/SupportTicketCardList'
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

  const ticketKPIs = [
    {
      id: 'total',
      label: 'Tổng yêu cầu',
      value: totalCount,
      color: 'var(--navy-primary, #102a43)',
    },
    {
      id: 'open',
      label: 'Chưa xử lý (Mới)',
      value: openCount,
      color: '#dc2626',
    },
    {
      id: 'in-progress',
      label: 'Đang giải quyết',
      value: inProgressCount,
      color: '#d97706',
    },
    {
      id: 'resolved',
      label: 'Đã giải quyết',
      value: resolvedCount,
      color: '#047857',
    },
  ]

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
            <h1 className="staff-page-title">Yêu cầu hỗ trợ (Support Tickets)</h1>
            <p className="staff-page-desc">
              Tiếp nhận, phân công và xử lý các sự cố kỹ thuật, học tập hoặc tài khoản của học viên và giáo viên.
            </p>
          </div>
        </div>
      </div>

      {/* 4 KPIs Summary Strip */}
      <SummaryStrip items={ticketKPIs} ariaLabel="Thống kê nhanh yêu cầu hỗ trợ" />

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

      {/* Table & Mobile Cards */}
      <div className="staff-table-wrapper has-mobile-cards">
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
          <>
            <SupportTicketTable tickets={filteredTickets} onAssign={handleOpenAssignModal} />
            <SupportTicketCardList tickets={filteredTickets} onAssign={handleOpenAssignModal} />
          </>
        )}
      </div>

      {/* Modal Phân công nhân viên */}
      {isAssignOpen && selectedTicket && (
        <div className="admin-modal-overlay" role="dialog" aria-modal="true">
          <div className="admin-modal-card" style={{ maxWidth: 440 }}>
            <div className="admin-modal-header">
              <h3 className="modal-title">Phân công xử lý Ticket</h3>
              <button
                type="button"
                className="modal-close-btn"
                onClick={() => setIsAssignOpen(false)}
                aria-label="Đóng"
              >
                &times;
              </button>
            </div>
            <form onSubmit={handleSaveAssign}>
              <div className="admin-modal-body">
                <p style={{ fontSize: '0.86rem', color: '#627d98', marginBottom: 14 }}>
                  Chỉ định nhân viên chịu trách nhiệm giải quyết yêu cầu:{' '}
                  <strong style={{ color: '#102a43' }}>{selectedTicket.id}</strong> - {selectedTicket.title}
                </p>

                <div className="form-group" style={{ marginBottom: 14 }}>
                  <label className="form-label" style={{ display: 'block', marginBottom: 6, fontWeight: 600 }}>
                    Nhân viên hỗ trợ:
                  </label>
                  <select
                    className="admin-filter-select"
                    style={{ width: '100%' }}
                    value={assigneeName}
                    onChange={(e) => setAssigneeName(e.target.value)}
                  >
                    <option value="Lê Hữu Phúc">Lê Hữu Phúc (Hỗ trợ kỹ thuật)</option>
                    <option value="Lê Hữu Phước">Lê Hữu Phước (Kỹ sư hệ thống)</option>
                    <option value="Vũ Hoàng Yến">Vũ Hoàng Yến (Chăm sóc học viên)</option>
                    <option value="Nguyễn Tuấn Kiệt">Nguyễn Tuấn Kiệt (Điều phối dịch vụ)</option>
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
                <button type="submit" className="btn btn-primary" style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                  <UserCheck size={14} />
                  <span>Lưu phân công</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

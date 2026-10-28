import React, { useEffect, useState } from 'react'
import {
  ArrowLeft,
  CheckCircle2,
  Send,
  Check,
} from 'lucide-react'
import { Link, useParams } from 'react-router-dom'
import { supportService } from '@/services/support.service'
import type {
  SupportTicketItem,
  SupportTicketMessage,
  SupportUserProfile,
  TicketStatus,
} from '@/types/support'
import { Skeleton } from '@/components/ui/Skeleton'
import { EmptyState } from '@/components/ui/EmptyState'
import './AdminPages.css'
import '@/components/admin/AdminComponents.css'

export const AdminTicketDetailPage: React.FC = () => {
  const { ticketId } = useParams<{ ticketId: string }>()
  const [ticket, setTicket] = useState<SupportTicketItem | null>(null)
  const [messages, setMessages] = useState<SupportTicketMessage[]>([])
  const [userProfile, setUserProfile] = useState<SupportUserProfile | null>(null)
  const [loading, setLoading] = useState(true)

  // Reply Composer
  const [replyText, setReplyText] = useState('')
  const [internalNote, setInternalNote] = useState('')
  const [internalNotesList, setInternalNotesList] = useState<Array<{ text: string; date: string }>>([
    { text: 'Ticket cần ưu tiên xử lý trước giờ kiểm tra của học sinh.', date: '2026-10-27T08:30:00Z' },
  ])

  // Status & Assignee dropdowns
  const [currentStatus, setCurrentStatus] = useState<TicketStatus>('open')
  const [currentAssignee, setCurrentAssignee] = useState('Chưa phân công')

  const [toastMessage, setToastMessage] = useState<string | null>(null)

  const showToast = (msg: string) => {
    setToastMessage(msg)
    setTimeout(() => setToastMessage(null), 3500)
  }

  const loadData = () => {
    if (!ticketId) return
    setLoading(true)
    supportService
      .getTicketDetail(ticketId)
      .then(({ ticket: t, messages: m, userProfile: u }) => {
        setTicket(t)
        setMessages(m)
        setUserProfile(u)
        if (t) {
          setCurrentStatus(t.status)
          setCurrentAssignee(t.assignedTo || 'Chưa phân công')
        }
        setLoading(false)
      })
      .catch((err) => {
        console.error(err)
        setLoading(false)
      })
  }

  useEffect(() => {
    if (!ticketId) return
    let active = true
    supportService
      .getTicketDetail(ticketId)
      .then(({ ticket: t, messages: m, userProfile: u }) => {
        if (active) {
          setTicket(t)
          setMessages(m)
          setUserProfile(u)
          if (t) {
            setCurrentStatus(t.status)
            setCurrentAssignee(t.assignedTo || 'Chưa phân công')
          }
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
  }, [ticketId])

  const handleSendReply = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!ticketId || !replyText.trim()) return

    try {
      const newMsg = await supportService.sendReply(
        ticketId,
        replyText.trim(),
        'Demo Admin (Quản trị viên)',
        'support'
      )
      setMessages((prev) => [...prev, newMsg])
      setReplyText('')
      showToast('Đã gửi phản hồi thành công')
      loadData()
    } catch (err: unknown) {
      if (err instanceof Error) alert(err.message)
    }
  }

  const handleAddInternalNote = (e: React.FormEvent) => {
    e.preventDefault()
    if (!internalNote.trim()) return
    setInternalNotesList((prev) => [
      ...prev,
      { text: internalNote.trim(), date: new Date().toISOString() },
    ])
    setInternalNote('')
    showToast('Đã lưu ghi chú nội bộ')
  }

  const handleUpdateStatus = async (newStatus: TicketStatus) => {
    if (!ticket) return
    try {
      await supportService.updateTicketStatus(ticket.id, newStatus, 'Demo Admin')
      setCurrentStatus(newStatus)
      showToast(`Đã chuyển trạng thái ticket sang: ${newStatus}`)
      loadData()
    } catch (err: unknown) {
      if (err instanceof Error) alert(err.message)
    }
  }

  const handleUpdateAssignee = async (newAssignee: string) => {
    if (!ticket) return
    try {
      await supportService.assignTicket(ticket.id, newAssignee, 'Demo Admin')
      setCurrentAssignee(newAssignee)
      showToast(`Đã phân công ticket cho: ${newAssignee}`)
      loadData()
    } catch (err: unknown) {
      if (err instanceof Error) alert(err.message)
    }
  }

  if (loading) {
    return (
      <div className="admin-page-container" style={{ padding: '32px' }}>
        <Skeleton height={40} width={250} />
        <div style={{ marginTop: 24 }}>
          <Skeleton height={200} />
        </div>
      </div>
    )
  }

  if (!ticket) {
    return (
      <div className="admin-page-container">
        <EmptyState
          title="Không tìm thấy yêu cầu hỗ trợ"
          description="Ticket bạn tìm kiếm không tồn tại hoặc đã được chuyển kho lưu trữ."
          actionLabel="Quay lại danh sách tickets"
          onAction={() => window.history.back()}
        />
      </div>
    )
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

      {/* Breadcrumb Header */}
      <div className="staff-page-header">
        <div style={{ marginBottom: 12 }}>
          <Link
            to="/admin/tickets"
            className="flex items-center gap-1.5 text-sm font-medium text-navy-primary hover:underline"
            style={{ display: 'inline-flex', alignItems: 'center', gap: 6, color: '#102a43', fontSize: '0.88rem' }}
          >
            <ArrowLeft size={16} />
            <span>Quay lại Yêu cầu hỗ trợ</span>
          </Link>
        </div>

        <div className="admin-header-row">
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
              <h1 className="staff-page-title" style={{ margin: 0 }}>
                {ticket.title}
              </h1>
              <code style={{ background: '#f1f5f9', padding: '2px 8px', borderRadius: 4, fontWeight: 700 }}>
                {ticket.id}
              </code>
              <span className="status-badge status-default" style={{ textTransform: 'capitalize' }}>
                {ticket.category}
              </span>
              <span
                className={`status-badge ${
                  ticket.priority === 'urgent'
                    ? 'status-danger'
                    : ticket.priority === 'high'
                    ? 'status-danger'
                    : ticket.priority === 'medium'
                    ? 'status-warning'
                    : 'status-default'
                }`}
              >
                {ticket.priority === 'urgent'
                  ? 'Khẩn cấp'
                  : ticket.priority === 'high'
                  ? 'Cao'
                  : ticket.priority === 'medium'
                  ? 'Trung bình'
                  : 'Thấp'}
              </span>
            </div>
            <p className="staff-page-desc" style={{ marginTop: 6 }}>
              Người gửi: <strong>{ticket.userName}</strong> ({ticket.userEmail}) • Cập nhật cuối: {new Date(ticket.updatedAt).toLocaleString('vi-VN')}
            </p>
          </div>

          <div className="admin-header-actions">
            {currentStatus !== 'resolved' && (
              <button
                type="button"
                className="btn btn-primary"
                onClick={() => handleUpdateStatus('resolved')}
              >
                <Check size={16} />
                <span>Đánh dấu đã giải quyết</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Main Grid: Left Messages, Right Sidebar */}
      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 24 }}>
        {/* Left Column: Conversation Thread & Notes */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
          {/* Messages Card */}
          <div className="admin-card" style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 8, padding: 20 }}>
            <h3 style={{ fontSize: '1rem', fontWeight: 700, color: '#102a43', margin: '0 0 16px 0' }}>
              Nội dung trao đổi hỗ trợ ({messages.length})
            </h3>

            {messages.length === 0 ? (
              <div style={{ padding: '24px 0', textAlign: 'center', color: '#627d98', fontStyle: 'italic' }}>
                Chưa có trao đổi nào trong ticket này. Hãy phản hồi cho học viên bên dưới.
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                {messages.map((m) => (
                  <div
                    key={m.id}
                    style={{
                      padding: 14,
                      borderRadius: 8,
                      background: m.senderRole === 'support' ? '#f0f9ff' : '#f8fafc',
                      border: m.senderRole === 'support' ? '1px solid #bae6fd' : '1px solid #e2e8f0',
                      borderLeft: m.senderRole === 'support' ? '4px solid #0284c7' : '4px solid #627d98',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                      <strong style={{ fontSize: '0.88rem', color: m.senderRole === 'support' ? '#0369a1' : '#102a43' }}>
                        {m.senderName} {m.senderRole === 'support' && '(Hỗ trợ viên)'}
                      </strong>
                      <span style={{ fontSize: '0.78rem', color: '#627d98' }}>
                        {new Date(m.timestamp).toLocaleString('vi-VN')}
                      </span>
                    </div>
                    <p style={{ margin: 0, fontSize: '0.9rem', color: '#334e68', lineHeight: 1.5, whiteSpace: 'pre-wrap' }}>
                      {m.message}
                    </p>
                  </div>
                ))}
              </div>
            )}

            {/* Reply Composer */}
            <form onSubmit={handleSendReply} style={{ marginTop: 20 }}>
              <label className="form-label" htmlFor="reply-composer">Phản hồi người dùng</label>
              <textarea
                id="reply-composer"
                className="form-input"
                rows={3}
                placeholder="Nhập nội dung phản hồi hoặc hướng dẫn xử lý sự cố..."
                value={replyText}
                onChange={(e) => setReplyText(e.target.value)}
              />
              <div style={{ marginTop: 8, display: 'flex', justifyContent: 'flex-end' }}>
                <button
                  type="submit"
                  className="btn btn-primary btn-sm"
                  disabled={!replyText.trim()}
                >
                  <Send size={14} style={{ marginRight: 6 }} />
                  <span>Gửi phản hồi</span>
                </button>
              </div>
            </form>
          </div>

          {/* Internal Notes */}
          <div className="admin-card" style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 8, padding: 20 }}>
            <h3 style={{ fontSize: '0.95rem', fontWeight: 700, color: '#102a43', margin: '0 0 12px 0' }}>
              Ghi chú nội bộ dành cho Quản trị viên
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 14 }}>
              {internalNotesList.map((n, i) => (
                <div key={i} style={{ padding: '10px 12px', background: '#fffbeb', border: '1px solid #fef3c7', borderRadius: 6 }}>
                  <div style={{ fontSize: '0.85rem', color: '#92400e' }}>{n.text}</div>
                  <div style={{ fontSize: '0.75rem', color: '#b45309', marginTop: 4 }}>
                    {new Date(n.date).toLocaleString('vi-VN')} • Nội bộ
                  </div>
                </div>
              ))}
            </div>

            <form onSubmit={handleAddInternalNote}>
              <div style={{ display: 'flex', gap: 8 }}>
                <input
                  type="text"
                  className="form-input"
                  placeholder="Thêm ghi chú nội bộ mới..."
                  value={internalNote}
                  onChange={(e) => setInternalNote(e.target.value)}
                />
                <button type="submit" className="btn btn-secondary btn-sm" disabled={!internalNote.trim()}>
                  Thêm
                </button>
              </div>
            </form>
          </div>
        </div>

        {/* Right Column: User Profile & Actions */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          {/* Status & Assignment Controls */}
          <div className="admin-card" style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 8, padding: 20 }}>
            <h3 style={{ fontSize: '0.95rem', fontWeight: 700, color: '#102a43', margin: '0 0 14px 0' }}>
              Điều hành & Phân công
            </h3>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div>
                <label className="form-label" htmlFor="ticket-status-select">Trạng thái ticket</label>
                <select
                  id="ticket-status-select"
                  className="form-input"
                  value={currentStatus}
                  onChange={(e) => handleUpdateStatus(e.target.value as TicketStatus)}
                >
                  <option value="open">Chưa xử lý (Open)</option>
                  <option value="in-progress">Đang xử lý</option>
                  <option value="waiting">Chờ phản hồi</option>
                  <option value="resolved">Đã giải quyết</option>
                </select>
              </div>

              <div>
                <label className="form-label" htmlFor="ticket-assignee-select">Nhân viên phụ trách</label>
                <select
                  id="ticket-assignee-select"
                  className="form-input"
                  value={currentAssignee}
                  onChange={(e) => handleUpdateAssignee(e.target.value)}
                >
                  <option value="Chưa phân công">Chưa phân công</option>
                  <option value="Lê Hữu Phước">Lê Hữu Phước (Kỹ thuật)</option>
                  <option value="Trần Thị Thanh">Trần Thị Thanh (CSKH)</option>
                  <option value="Nguyễn Văn An">Nguyễn Văn An (SysAdmin)</option>
                  <option value="Demo Admin">Demo Admin (Quản trị)</option>
                </select>
              </div>
            </div>
          </div>

          {/* User Profile */}
          <div className="admin-card" style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 8, padding: 20 }}>
            <h3 style={{ fontSize: '0.95rem', fontWeight: 700, color: '#102a43', margin: '0 0 14px 0' }}>
              Hồ sơ người gửi
            </h3>

            {userProfile ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10, fontSize: '0.85rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: '#627d98' }}>Họ tên:</span>
                  <strong style={{ color: '#102a43' }}>{userProfile.displayName}</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: '#627d98' }}>Email:</span>
                  <span>{userProfile.email}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: '#627d98' }}>Vai trò:</span>
                  <span className="status-badge status-default" style={{ textTransform: 'capitalize' }}>
                    {userProfile.role}
                  </span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: '#627d98' }}>Đồng bộ:</span>
                  <span className="status-badge status-success">{userProfile.syncState}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: '#627d98' }}>Bài đã học:</span>
                  <strong>{userProfile.completedLessonsCount} bài</strong>
                </div>
              </div>
            ) : (
              <div style={{ color: '#627d98' }}>Chưa có thông tin hồ sơ chi tiết.</div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

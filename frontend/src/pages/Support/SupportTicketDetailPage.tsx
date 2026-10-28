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
import '../Admin/AdminPages.css'
import '@/components/admin/AdminComponents.css'
import './SupportPages.css'

export const SupportTicketDetailPage: React.FC = () => {
  const { id: routeId, ticketId: paramId } = useParams<{ id?: string; ticketId?: string }>()
  const ticketId = paramId || routeId || 'TK-4821'

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
        if (!active) return
        setTicket(t)
        setMessages(m)
        setUserProfile(u)
        if (t) {
          setCurrentStatus(t.status)
          setCurrentAssignee(t.assignedTo || 'Chưa phân công')
        }
        setLoading(false)
      })
      .catch(() => {
        if (!active) return
        showToast('Lỗi khi tải chi tiết yêu cầu hỗ trợ')
        setLoading(false)
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
        'Demo Support (Hỗ trợ viên)',
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
      await supportService.updateTicketStatus(ticket.id, newStatus, 'Demo Support')
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
      await supportService.assignTicket(ticket.id, newAssignee, 'Demo Support')
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
        <Skeleton height={40} width={260} />
        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 20, marginTop: 20 }}>
          <Skeleton height={360} />
          <Skeleton height={360} />
        </div>
      </div>
    )
  }

  if (!ticket) {
    return (
      <div className="admin-page-container">
        <Link to="/support/tickets" className="btn btn-secondary" style={{ marginBottom: 16 }}>
          <ArrowLeft size={16} /> Quay lại danh sách yêu cầu
        </Link>
        <EmptyState
          title="Không tìm thấy yêu cầu hỗ trợ"
          description="Ticket có thể không tồn tại hoặc đã bị xóa."
        />
      </div>
    )
  }

  return (
    <div className="admin-page-container">
      {toastMessage && (
        <div className="admin-toast-notification">
          <CheckCircle2 size={18} color="#047857" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Top back navigation */}
      <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Link to="/support/tickets" className="btn btn-secondary btn-sm" style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
          <ArrowLeft size={15} /> Danh sách Ticket
        </Link>

        <div style={{ display: 'flex', gap: 10 }}>
          {currentStatus !== 'resolved' && (
            <button
              type="button"
              className="btn btn-primary btn-sm"
              onClick={() => handleUpdateStatus('resolved')}
              style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}
            >
              <Check size={14} /> Đánh dấu đã giải quyết
            </button>
          )}
        </div>
      </div>

      {/* Main Grid: Left Conversation, Right Info */}
      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 2fr) minmax(300px, 1fr)', gap: 20 }}>
        {/* Left Column: Ticket conversation */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          {/* Header Card */}
          <div className="admin-card">
            <div className="admin-card-body">
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                <span style={{ fontSize: '0.85rem', fontWeight: 800, color: '#627D98', fontFamily: 'monospace' }}>
                  {ticket.id}
                </span>
                <span
                  className={`badge ${
                    ticket.priority === 'urgent'
                      ? 'badge-danger'
                      : ticket.priority === 'high'
                      ? 'badge-warning'
                      : 'badge-secondary'
                  }`}
                >
                  Ưu tiên: {ticket.priority}
                </span>
                <span className="badge badge-secondary">{ticket.category}</span>
              </div>

              <h1 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#102A43', margin: '0 0 10px 0' }}>
                {ticket.title}
              </h1>

              <div style={{ fontSize: '0.85rem', color: '#627D98', display: 'flex', gap: 16 }}>
                <span>Người tạo: <strong style={{ color: '#102A43' }}>{ticket.userName}</strong></span>
                <span>Cập nhật: {new Date(ticket.updatedAt).toLocaleString('vi-VN')}</span>
              </div>
            </div>
          </div>

          {/* Messages Thread */}
          <div className="admin-card">
            <div className="admin-card-header">
              <h2 className="admin-card-title">Trao đổi & Phản hồi ({messages.length})</h2>
            </div>

            <div className="admin-card-body" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {messages.length === 0 ? (
                <div style={{ padding: '24px 0', textAlign: 'center', color: '#627d98', fontStyle: 'italic' }}>
                  Chưa có trao đổi nào trong ticket này. Hãy phản hồi cho học viên bên dưới.
                </div>
              ) : (
                messages.map((msg) => {
                  const isStaff = msg.senderRole === 'support'
                  return (
                    <div
                      key={msg.id}
                      style={{
                        display: 'flex',
                        flexDirection: 'column',
                        alignSelf: isStaff ? 'flex-end' : 'flex-start',
                        maxWidth: '85%',
                      }}
                    >
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 8,
                          marginBottom: 4,
                          alignSelf: isStaff ? 'flex-end' : 'flex-start',
                          fontSize: '0.8rem',
                          color: '#627D98',
                        }}
                      >
                        <strong style={{ color: isStaff ? '#102A43' : '#334E68' }}>{msg.senderName}</strong>
                        <span className={`badge ${isStaff ? 'badge-primary' : 'badge-secondary'}`} style={{ fontSize: '0.7rem' }}>
                          {isStaff ? 'Chuyên viên Hỗ trợ' : 'Người dùng'}
                        </span>
                        <span>{new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                      </div>

                      <div
                        style={{
                          padding: '12px 16px',
                          borderRadius: 8,
                          backgroundColor: isStaff ? '#EBF8FF' : '#F8FAFC',
                          border: isStaff ? '1px solid #BEE3F8' : '1px solid #E2E8F0',
                          color: '#102A43',
                          lineHeight: 1.5,
                          fontSize: '0.9rem',
                          whiteSpace: 'pre-wrap',
                        }}
                      >
                        {msg.message}
                      </div>
                    </div>
                  )
                })
              )}
            </div>

            {/* Reply Composer */}
            <div style={{ padding: '16px 20px', borderTop: '1px solid #E2E8F0', backgroundColor: '#FAFCFE' }}>
              <form onSubmit={handleSendReply}>
                <label className="form-label" htmlFor="ticket-reply">
                  Gửi phản hồi cho người dùng
                </label>
                <textarea
                  id="ticket-reply"
                  className="form-input"
                  rows={3}
                  placeholder="Nhập nội dung giải đáp, giải pháp kỹ thuật hoặc hướng dẫn khắc phục..."
                  value={replyText}
                  onChange={(e) => setReplyText(e.target.value)}
                  required
                />
                <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 10 }}>
                  <button
                    type="submit"
                    className="btn btn-primary"
                    disabled={!replyText.trim()}
                    style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}
                  >
                    <Send size={15} /> Gửi phản hồi
                  </button>
                </div>
              </form>
            </div>
          </div>

          {/* Internal Notes */}
          <div className="admin-card">
            <div className="admin-card-header">
              <h2 className="admin-card-title">Ghi chú nội bộ chuyên viên</h2>
            </div>
            <div className="admin-card-body" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {internalNotesList.map((n, i) => (
                <div
                  key={i}
                  style={{
                    padding: 10,
                    backgroundColor: '#FFFBEA',
                    borderLeft: '4px solid #F59E0B',
                    borderRadius: 4,
                    fontSize: '0.85rem',
                    color: '#78350F',
                  }}
                >
                  <p style={{ margin: 0 }}>{n.text}</p>
                  <div style={{ fontSize: '0.75rem', color: '#B45309', marginTop: 4 }}>
                    {new Date(n.date).toLocaleString('vi-VN')}
                  </div>
                </div>
              ))}

              <form onSubmit={handleAddInternalNote} style={{ marginTop: 6, display: 'flex', gap: 10 }}>
                <input
                  type="text"
                  className="form-input"
                  placeholder="Thêm ghi chú riêng cho đồng nghiệp..."
                  value={internalNote}
                  onChange={(e) => setInternalNote(e.target.value)}
                />
                <button
                  type="submit"
                  className="btn btn-secondary"
                  disabled={!internalNote.trim()}
                  style={{ whiteSpace: 'nowrap' }}
                >
                  Lưu ghi chú
                </button>
              </form>
            </div>
          </div>
        </div>

        {/* Right Column: Ticket Status, Assignee, User Profile */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          {/* Controls Card */}
          <div className="admin-card">
            <div className="admin-card-header">
              <h2 className="admin-card-title">Cấu hình trạng thái</h2>
            </div>
            <div className="admin-card-body" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div>
                <label className="form-label" htmlFor="ticket-status-select">Trạng thái xử lý</label>
                <select
                  id="ticket-status-select"
                  className="form-input"
                  value={currentStatus}
                  onChange={(e) => handleUpdateStatus(e.target.value as TicketStatus)}
                >
                  <option value="open">Mới tiếp nhận (Open)</option>
                  <option value="in-progress">Đang xử lý (In Progress)</option>
                  <option value="waiting">Chờ phản hồi (Waiting)</option>
                  <option value="resolved">Đã giải quyết (Resolved)</option>
                </select>
              </div>

              <div>
                <label className="form-label" htmlFor="ticket-assign-select">Chuyên viên phụ trách</label>
                <select
                  id="ticket-assign-select"
                  className="form-input"
                  value={currentAssignee}
                  onChange={(e) => handleUpdateAssignee(e.target.value)}
                >
                  <option value="Chưa phân công">Chưa phân công</option>
                  <option value="Lê Hữu Phúc">Lê Hữu Phúc (Kỹ thuật)</option>
                  <option value="Trần Thị Thanh">Trần Thị Thanh (CSKH)</option>
                  <option value="Nguyễn Văn An">Nguyễn Văn An (Quản trị)</option>
                  <option value="Demo Support">Demo Support (Hỗ trợ viên)</option>
                </select>
              </div>
            </div>
          </div>

          {/* User Profile Card */}
          <div className="admin-card">
            <div className="admin-card-header">
              <h2 className="admin-card-title">Thông tin người yêu cầu</h2>
            </div>
            <div className="admin-card-body" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, paddingBottom: 10, borderBottom: '1px solid #E2E8F0' }}>
                <div
                  style={{
                    width: 44,
                    height: 44,
                    borderRadius: '50%',
                    backgroundColor: '#102A43',
                    color: '#FFF9EA',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontWeight: 700,
                  }}
                >
                  {ticket.userName.charAt(0)}
                </div>
                <div>
                  <div style={{ fontWeight: 700, color: '#102A43' }}>{ticket.userName}</div>
                  <div style={{ fontSize: '0.8rem', color: '#627D98' }}>{ticket.userEmail}</div>
                </div>
              </div>

              {userProfile && (
                <>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem' }}>
                    <span style={{ color: '#627D98' }}>Vai trò:</span>
                    <strong style={{ color: '#102A43' }}>{userProfile.role}</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem' }}>
                    <span style={{ color: '#627D98' }}>Trạng thái:</span>
                    <strong style={{ color: '#102A43' }}>{userProfile.status}</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem' }}>
                    <span style={{ color: '#627D98' }}>Bài học đã xong:</span>
                    <strong style={{ color: '#102A43' }}>{userProfile.completedLessonsCount}</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem' }}>
                    <span style={{ color: '#627D98' }}>Lần đăng nhập cuối:</span>
                    <strong style={{ color: '#102A43' }}>
                      {userProfile.lastLoginAt ? new Date(userProfile.lastLoginAt).toLocaleString('vi-VN') : 'N/A'}
                    </strong>
                  </div>
                </>
              )}

              <Link
                to={`/support/users/${ticket.userId || 'usr-1'}`}
                className="btn btn-secondary btn-sm"
                style={{ textAlign: 'center', marginTop: 6 }}
              >
                Tra cứu chi tiết tài khoản
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

import React, { useEffect, useState } from 'react'
import {
  ArrowLeft,
  CheckCircle2,
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
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { TicketConversation } from './components/detail/TicketConversation'
import { TicketReplyComposer } from './components/detail/TicketReplyComposer'
import { TicketDetailsPanel } from './components/detail/TicketDetailsPanel'
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

  // Internal Notes State
  const [internalNotesList, setInternalNotesList] = useState<Array<{ text: string; date: string }>>([
    { text: 'Ticket cần ưu tiên xử lý trước giờ kiểm tra của học sinh.', date: '2026-10-27T08:30:00Z' },
  ])

  // Status & Assignee dropdowns
  const [currentStatus, setCurrentStatus] = useState<TicketStatus>('open')
  const [currentAssignee, setCurrentAssignee] = useState('Chưa phân công')
  const [isResolveConfirmOpen, setIsResolveConfirmOpen] = useState(false)
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

  const handleSendReply = async (messageText: string) => {
    if (!ticketId || !messageText.trim()) return

    try {
      const newMsg = await supportService.sendReply(
        ticketId,
        messageText.trim(),
        'Demo Support (Hỗ trợ viên)',
        'support'
      )
      setMessages((prev) => [...prev, newMsg])
      showToast('Đã gửi phản hồi thành công')
      loadData()
    } catch (err: unknown) {
      if (err instanceof Error) alert(err.message)
    }
  }

  const handleAddInternalNote = (noteText: string) => {
    if (!noteText.trim()) return

    setInternalNotesList((prev) => [
      ...prev,
      { text: noteText.trim(), date: new Date().toISOString() },
    ])
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

  const handleConfirmResolve = async () => {
    await handleUpdateStatus('resolved')
    setIsResolveConfirmOpen(false)
  }

  if (loading) {
    return (
      <div className="admin-page-container" style={{ padding: '24px' }}>
        <Skeleton height={36} width={240} />
        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 2fr) minmax(300px, 1fr)', gap: 20, marginTop: 20 }}>
          <Skeleton height={420} />
          <Skeleton height={420} />
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
      {/* Toast Feedback */}
      {toastMessage && (
        <div className="admin-toast-notification">
          <CheckCircle2 size={18} color="#047857" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Top back navigation & quick resolve button */}
      <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10 }}>
        <Link
          to="/support/tickets"
          className="btn btn-secondary btn-sm"
          style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}
        >
          <ArrowLeft size={15} />
          <span>Danh sách Ticket</span>
        </Link>

        {currentStatus !== 'resolved' && (
          <button
            type="button"
            className="btn btn-primary btn-sm"
            onClick={() => setIsResolveConfirmOpen(true)}
            style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}
          >
            <Check size={14} />
            <span>Đánh dấu đã giải quyết</span>
          </button>
        )}
      </div>

      {/* Main Two-Column Layout */}
      <div
        className="support-detail-grid"
        style={{
          display: 'grid',
          gridTemplateColumns: 'minmax(0, 2fr) minmax(300px, 1fr)',
          gap: 20,
          alignItems: 'start',
        }}
      >
        {/* Left Column: Conversation & Reply Composer */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* Ticket Header & Issue Context Card */}
          <div className="admin-card" style={{ padding: '16px 20px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8, flexWrap: 'wrap' }}>
              <code
                style={{
                  background: '#f1f5f9',
                  padding: '2px 8px',
                  borderRadius: 4,
                  fontWeight: 700,
                  fontSize: '0.85rem',
                  color: 'var(--navy-primary, #102a43)',
                }}
              >
                {ticket.id}
              </code>
              <span
                className={`status-badge ${
                  ticket.priority === 'urgent' || ticket.priority === 'high'
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
              <span className="status-badge status-default" style={{ textTransform: 'capitalize' }}>
                {ticket.category === 'sync'
                  ? 'Đồng bộ dữ liệu'
                  : ticket.category === 'account'
                  ? 'Tài khoản'
                  : ticket.category === 'billing'
                  ? 'Học phí'
                  : ticket.category === 'content'
                  ? 'Nội dung bài học'
                  : 'Vấn đề khác'}
              </span>
              <span
                className={`status-badge ${
                  currentStatus === 'resolved'
                    ? 'status-success'
                    : currentStatus === 'in-progress'
                    ? 'status-info'
                    : currentStatus === 'waiting'
                    ? 'status-warning'
                    : 'status-danger'
                }`}
              >
                {currentStatus === 'resolved'
                  ? 'Đã giải quyết'
                  : currentStatus === 'in-progress'
                  ? 'Đang xử lý'
                  : currentStatus === 'waiting'
                  ? 'Chờ phản hồi'
                  : 'Chưa xử lý'}
              </span>
            </div>

            <h1 style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--navy-primary, #102a43)', margin: '0 0 8px 0', lineHeight: 1.4 }}>
              {ticket.title}
            </h1>

            <div style={{ fontSize: '0.82rem', color: '#627d98', display: 'flex', gap: 16, flexWrap: 'wrap' }}>
              <span>
                Người gửi:{' '}
                <strong style={{ color: '#102a43' }}>{ticket.userName}</strong> ({ticket.userEmail})
              </span>
              <span>•</span>
              <span>Cập nhật cuối: {new Date(ticket.updatedAt).toLocaleString('vi-VN')}</span>
            </div>
          </div>

          {/* Conversation History */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <h2 style={{ fontSize: '0.94rem', fontWeight: 700, color: '#102a43', margin: '4px 0' }}>
              Lịch sử trao đổi & Phản hồi
            </h2>
            <TicketConversation messages={messages} internalNotes={internalNotesList} />
          </div>

          {/* Reply Composer */}
          <div style={{ marginTop: 8 }}>
            <h2 style={{ fontSize: '0.94rem', fontWeight: 700, color: '#102a43', margin: '0 0 8px 0' }}>
              Soạn phản hồi hỗ trợ
            </h2>
            <TicketReplyComposer
              onSendReply={handleSendReply}
              onAddInternalNote={handleAddInternalNote}
            />
          </div>
        </div>

        {/* Right Column: Ticket Metadata & Diagnostic Info */}
        <TicketDetailsPanel
          ticket={ticket}
          userProfile={userProfile}
          currentStatus={currentStatus}
          currentAssignee={currentAssignee}
          onStatusChange={handleUpdateStatus}
          onAssigneeChange={handleUpdateAssignee}
          onMarkResolved={() => setIsResolveConfirmOpen(true)}
        />
      </div>

      {/* Confirm Resolve Dialog */}
      <ConfirmDialog
        isOpen={isResolveConfirmOpen}
        title="Xác nhận giải quyết yêu cầu hỗ trợ"
        description={`Bạn có chắc chắn muốn đánh dấu ticket "${ticket.id}: ${ticket.title}" là đã giải quyết thành công?`}
        confirmText="Xác nhận đã giải quyết"
        cancelText="Quay lại"
        onConfirm={handleConfirmResolve}
        onCancel={() => setIsResolveConfirmOpen(false)}
      />
    </div>
  )
}

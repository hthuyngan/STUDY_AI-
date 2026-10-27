import { useState, type FormEvent } from 'react'
import { useParams, Link } from 'react-router-dom'
import { useSupportTicketDetail } from '@/hooks/useSupport'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { Skeleton } from '@/components/ui/Skeleton'
import { PageErrorState } from '@/components/ui/PageErrorState'
import './SupportPages.css'

export function SupportTicketDetailPage() {
  const { id } = useParams<{ id: string }>()
  const ticketId = id || 'TK-4821'
  const { ticket, messages, userProfile, loading, error, sendReply, updateStatus, refresh } =
    useSupportTicketDetail(ticketId)

  const [replyText, setReplyText] = useState('')
  const [submittingReply, setSubmittingReply] = useState(false)

  const handleSendReply = async (e: FormEvent) => {
    e.preventDefault()
    if (!replyText.trim()) return

    setSubmittingReply(true)
    try {
      await sendReply(replyText.trim())
      setReplyText('')
      await updateStatus('waiting')
    } finally {
      setSubmittingReply(false)
    }
  }

  if (loading) {
    return (
      <div className="staff-page">
        <Skeleton height={36} width={280} />
        <div style={{ marginTop: '20px', display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '20px' }}>
          <Skeleton height={300} />
          <Skeleton height={300} />
        </div>
      </div>
    )
  }

  if (error || !ticket) {
    return (
      <div className="staff-page">
        <PageErrorState title="Lỗi tải ticket" message={error || 'Không tìm thấy ticket'} onRetry={refresh} />
      </div>
    )
  }

  return (
    <div className="staff-page">
      <div className="staff-page-header">
        <div className="staff-page-title-row">
          <div>
            <nav className="staff-breadcrumbs" aria-label="Breadcrumb">
              <Link to="/support">Hỗ trợ</Link>
              <span>/</span>
              <Link to="/support/tickets">Danh sách ticket</Link>
              <span>/</span>
              <span aria-current="page">{ticket.id}</span>
            </nav>
            <h1>{ticket.title}</h1>
            <p className="staff-page-desc">
              Phân loại: <strong style={{ textTransform: 'capitalize' }}>{ticket.category}</strong> • Người yêu cầu:{' '}
              {ticket.userName} ({ticket.userEmail})
            </p>
          </div>
          <div className="staff-page-actions" style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <StatusBadge
              status={ticket.status}
              label={
                ticket.status === 'open'
                  ? 'Mới mở'
                  : ticket.status === 'in-progress'
                    ? 'Đang xử lý'
                    : ticket.status === 'waiting'
                      ? 'Chờ phản hồi'
                      : 'Đã giải quyết'
              }
            />
            {ticket.status !== 'resolved' ? (
              <button
                type="button"
                className="staff-btn staff-btn-primary"
                onClick={() => updateStatus('resolved')}
              >
                Đánh dấu đã giải quyết
              </button>
            ) : (
              <button
                type="button"
                className="staff-btn staff-btn-secondary"
                onClick={() => updateStatus('in-progress')}
              >
                Mở lại ticket
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="support-detail-grid">
        {/* LEFT 2/3: Conversation Timeline & Reply */}
        <div>
          <div className="ticket-timeline">
            {messages.map((m) => (
              <div key={m.id} className={`ticket-message-card ${m.senderRole}`}>
                <div className="ticket-message-header">
                  <div className="ticket-message-author">
                    {m.senderName}{' '}
                    <span style={{ fontSize: '11px', color: 'var(--color-ink-muted)', fontWeight: 400 }}>
                      ({m.senderRole === 'support' ? 'Nhân viên hỗ trợ' : 'Người dùng'})
                    </span>
                  </div>
                  <div className="ticket-message-time">
                    {new Date(m.timestamp).toLocaleString('vi-VN')}
                  </div>
                </div>
                <div className="ticket-message-body">{m.message}</div>
              </div>
            ))}
          </div>

          {/* Reply Form */}
          <div className="staff-card" style={{ marginTop: '16px' }}>
            <h3 style={{ fontSize: '14px', fontWeight: 600, marginBottom: '12px', margin: 0 }}>
              Gửi phản hồi cho người dùng
            </h3>
            <form onSubmit={handleSendReply} className="ticket-reply-box" style={{ marginTop: '12px' }}>
              <textarea
                rows={4}
                value={replyText}
                onChange={(e) => setReplyText(e.target.value)}
                placeholder="Nhập nội dung hướng dẫn hoặc giải đáp sự cố..."
                required
              />
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                <button
                  type="submit"
                  className="staff-btn staff-btn-primary"
                  disabled={submittingReply || !replyText.trim()}
                >
                  {submittingReply ? 'Đang gửi...' : 'Gửi phản hồi'}
                </button>
              </div>
            </form>
          </div>
        </div>

        {/* RIGHT 1/3: User Context & Diagnostic Sidebar */}
        <div className="staff-card">
          <h2 className="staff-card-title">Ngữ cảnh & Chẩn đoán</h2>

          <div className="support-context-section">
            <div className="support-context-label">Tài khoản</div>
            <div className="support-context-value" style={{ fontWeight: 600 }}>
              {ticket.userName}
            </div>
            <div className="support-context-value" style={{ color: 'var(--color-ink-muted)', fontSize: '12px' }}>
              {ticket.userEmail}
            </div>
            <div style={{ marginTop: '8px' }}>
              <Link
                to={`/support/users/${ticket.userId}`}
                className="staff-btn staff-btn-secondary"
                style={{ fontSize: '11px', padding: '3px 8px' }}
              >
                Xem chi tiết hồ sơ
              </Link>
            </div>
          </div>

          {userProfile && (
            <>
              <div className="support-context-section">
                <div className="support-context-label">Trạng thái đồng bộ (Sync State)</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span
                    style={{
                      display: 'inline-block',
                      width: '8px',
                      height: '8px',
                      borderRadius: '50%',
                      background: 'var(--color-success, #2b8a3e)',
                    }}
                  />
                  <span style={{ fontSize: '13px', fontWeight: 500 }}>{userProfile.syncState.toUpperCase()}</span>
                </div>
                <div style={{ fontSize: '11px', color: 'var(--color-ink-muted)', marginTop: '4px' }}>
                  Bộ nhớ: <code>{userProfile.storageNamespace}</code>
                </div>
              </div>

              <div className="support-context-section">
                <div className="support-context-label">Tiến trình học tập</div>
                <div className="support-context-value">
                  {userProfile.completedLessonsCount} bài học đã xong • {userProfile.totalAttemptsCount} bài thi thu hoạch
                </div>
              </div>

              <div className="support-context-section">
                <div className="support-context-label">Lịch sử hỗ trợ gần đây</div>
                {userProfile.recentTicketHistory.map((h) => (
                  <div key={h.id} style={{ fontSize: '12px', marginTop: '4px' }}>
                    <strong>{h.id}</strong>: {h.title} ({h.date})
                  </div>
                ))}
              </div>
            </>
          )}

          <div className="support-context-section">
            <div className="support-context-label">Thông tin bảo mật</div>
            <div style={{ fontSize: '12px', color: 'var(--color-ink-muted)' }}>
              Mật khẩu và session token được ẩn theo tiêu chuẩn an toàn bảo mật least privilege.
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

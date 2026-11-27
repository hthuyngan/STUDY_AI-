import React, { useCallback, useEffect, useRef, useState } from 'react'
import { MessageSquare, Plus, Send } from 'lucide-react'
import {
  AdminButton,
  AdminEmptyState,
  AdminErrorState,
  AdminFormField,
  AdminLoadingState,
  StatusBadge,
} from '@/components/admin/ui'
import {
  SUPPORT_CATEGORY_LABELS,
  supportService,
  type SupportTicketCategory,
  type SupportTicketDetail,
  type SupportTicketSummary,
} from '@/services/support.service'

export const SupportCenterPage: React.FC = () => {
  const [tickets, setTickets] = useState<SupportTicketSummary[]>([])
  const [selected, setSelected] = useState<SupportTicketDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showCreate, setShowCreate] = useState(false)

  const [subject, setSubject] = useState('')
  const [category, setCategory] = useState<SupportTicketCategory>('TECHNICAL')
  const [message, setMessage] = useState('')
  const [replyBody, setReplyBody] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [feedback, setFeedback] = useState<string | null>(null)
  const detailSeqRef = useRef(0)

  const loadTickets = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await supportService.listMyTickets()
      setTickets(res.items)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Không thể tải lịch sử hỗ trợ.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadTickets()
  }, [loadTickets])

  const handleOpen = async (ticketId: string) => {
    const reqSeq = ++detailSeqRef.current
    try {
      const detail = await supportService.getMyTicket(ticketId)
      if (detailSeqRef.current !== reqSeq) return
      setSelected(detail)
      setReplyBody('')
    } catch (err) {
      if (detailSeqRef.current !== reqSeq) return
      setFeedback(err instanceof Error ? err.message : 'Không thể mở chi tiết yêu cầu.')
    }
  }

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)
    setFeedback(null)
    try {
      const created = await supportService.createTicket({ subject, category, message })
      setSubject('')
      setMessage('')
      setShowCreate(false)
      setSelected(created)
      setFeedback(`Đã gửi yêu cầu hỗ trợ ${created.ticketCode}.`)
      await loadTickets()
    } catch (err) {
      setFeedback(err instanceof Error ? err.message : 'Không thể tạo yêu cầu hỗ trợ.')
    } finally {
      setSubmitting(false)
    }
  }

  const handleReply = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selected || !replyBody.trim()) return
    setSubmitting(true)
    try {
      const updated = await supportService.replyMyTicket(selected.id, replyBody.trim())
      setSelected(updated)
      setReplyBody('')
      await loadTickets()
    } catch (err) {
      setFeedback(err instanceof Error ? err.message : 'Không thể gửi tin nhắn.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div style={{ maxWidth: '1080px', margin: '0 auto', padding: '24px 16px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px', marginBottom: '20px' }}>
        <div>
          <h1 style={{ margin: 0, fontSize: '22px', fontWeight: 700, color: '#0F172A' }}>Trung tâm hỗ trợ</h1>
          <p style={{ margin: '4px 0 0', fontSize: '14px', color: '#64748B' }}>
            Gửi yêu cầu trợ giúp và theo dõi phản hồi từ đội ngũ quản trị STUDY_AI.
          </p>
        </div>
        <AdminButton variant="primary" icon={<Plus size={15} />} onClick={() => setShowCreate((v) => !v)}>
          {showCreate ? 'Đóng biểu mẫu' : 'Tạo yêu cầu hỗ trợ'}
        </AdminButton>
      </div>

      {feedback && (
        <div role="status" style={{ padding: '10px 14px', borderRadius: '8px', background: '#EFF6FF', border: '1px solid #BFDBFE', color: '#1E40AF', fontSize: '13px', marginBottom: '16px' }}>
          {feedback}
        </div>
      )}

      {showCreate && (
        <form onSubmit={handleCreate} style={{ background: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: '8px', padding: '18px', marginBottom: '20px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <h2 style={{ margin: 0, fontSize: '16px', fontWeight: 600 }}>Gửi yêu cầu hỗ trợ mới</h2>
          <AdminFormField label="Nhóm vấn đề" required>
            <select className="admin-select" value={category} onChange={(e) => setCategory(e.target.value as SupportTicketCategory)}>
              {Object.entries(SUPPORT_CATEGORY_LABELS).map(([k, label]) => (
                <option key={k} value={k}>
                  {label}
                </option>
              ))}
            </select>
          </AdminFormField>
          <AdminFormField label="Tiêu đề" required>
            <input
              className="admin-input"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="Mô tả ngắn gọn vấn đề bạn gặp phải"
              required
              minLength={3}
              maxLength={200}
            />
          </AdminFormField>
          <AdminFormField label="Nội dung chi tiết" required>
            <textarea
              className="admin-input"
              rows={4}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Cung cấp thông tin chi tiết để đội ngũ hỗ trợ xử lý nhanh nhất..."
              required
            />
          </AdminFormField>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
            <AdminButton type="button" variant="secondary" onClick={() => setShowCreate(false)}>
              Hủy
            </AdminButton>
            <AdminButton type="submit" variant="primary" isLoading={submitting}>
              Gửi yêu cầu
            </AdminButton>
          </div>
        </form>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: selected ? '1fr 1.2fr' : '1fr', gap: '16px' }}>
        <div style={{ background: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: '8px', overflow: 'hidden' }}>
          {loading ? (
            <AdminLoadingState label="Đang tải yêu cầu hỗ trợ của bạn..." />
          ) : error ? (
            <AdminErrorState description={error} onRetry={loadTickets} />
          ) : tickets.length === 0 ? (
            <AdminEmptyState
              icon={<MessageSquare size={24} />}
              title="Bạn chưa có yêu cầu hỗ trợ nào"
              description="Nhấn 'Tạo yêu cầu hỗ trợ' nếu bạn cần trợ giúp về tài khoản, bài học hoặc AI Tutor."
            />
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              {tickets.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => handleOpen(t.id)}
                  style={{
                    textAlign: 'left',
                    padding: '14px 16px',
                    border: 'none',
                    borderBottom: '1px solid #F1F5F9',
                    background: selected?.id === t.id ? '#EFF6FF' : '#FFFFFF',
                    cursor: 'pointer',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                    <code style={{ fontSize: '12px', color: '#475569' }}>{t.ticketCode}</code>
                    <StatusBadge status={t.status} />
                  </div>
                  <div style={{ fontWeight: 600, fontSize: '14px', color: '#0F172A' }}>{t.subject}</div>
                  <div style={{ fontSize: '12px', color: '#64748B', marginTop: '4px' }}>
                    {SUPPORT_CATEGORY_LABELS[t.category]} · {new Date(t.updatedAt).toLocaleString('vi-VN')}
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        {selected && (
          <div style={{ background: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: '8px', padding: '16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '8px' }}>
              <div>
                <code style={{ fontSize: '12px', color: '#64748B' }}>{selected.ticketCode}</code>
                <h2 style={{ margin: '2px 0 0', fontSize: '16px', fontWeight: 600 }}>{selected.subject}</h2>
              </div>
              <StatusBadge status={selected.status} />
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '320px', overflowY: 'auto', padding: '10px', background: '#F8FAFC', borderRadius: '6px' }}>
              {selected.messages.map((m) => (
                <div key={m.id} style={{ padding: '10px', borderRadius: '6px', border: '1px solid #E2E8F0', background: m.senderRole === 'user' ? '#FFFFFF' : '#EFF6FF' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: '#475569', marginBottom: '4px' }}>
                    <strong>{m.senderRole === 'user' ? 'Bạn' : `${m.senderName} (Hỗ trợ)`}</strong>
                    <span>{new Date(m.createdAt).toLocaleString('vi-VN')}</span>
                  </div>
                  <div style={{ fontSize: '13px', color: '#0F172A', whiteSpace: 'pre-wrap' }}>{m.body}</div>
                </div>
              ))}
            </div>

            {selected.status !== 'CLOSED' ? (
              <form onSubmit={handleReply} style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <textarea
                  className="admin-input"
                  rows={3}
                  value={replyBody}
                  onChange={(e) => setReplyBody(e.target.value)}
                  placeholder="Nhập tin nhắn tiếp tục trao đổi..."
                  required
                />
                <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                  <AdminButton type="submit" variant="primary" icon={<Send size={14} />} isLoading={submitting} disabled={!replyBody.trim()}>
                    Gửi tin nhắn
                  </AdminButton>
                </div>
              </form>
            ) : (
              <div style={{ fontSize: '12px', color: '#64748B', padding: '8px', background: '#F8FAFC', borderRadius: '6px' }}>
                Yêu cầu hỗ trợ này đã được đóng. Nếu cần thêm trợ giúp, vui lòng tạo yêu cầu mới.
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

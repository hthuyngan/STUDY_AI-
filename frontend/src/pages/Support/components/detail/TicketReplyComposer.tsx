import React, { useState } from 'react'
import { Send, Lock, MessageSquare } from 'lucide-react'

interface TicketReplyComposerProps {
  onSendReply: (message: string) => Promise<void> | void
  onAddInternalNote: (note: string) => void
  isSubmitting?: boolean
}

export const TicketReplyComposer: React.FC<TicketReplyComposerProps> = ({
  onSendReply,
  onAddInternalNote,
  isSubmitting = false,
}) => {
  const [mode, setMode] = useState<'public' | 'internal'>('public')
  const [content, setContent] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!content.trim() || isSubmitting) return

    if (mode === 'public') {
      await onSendReply(content.trim())
      setContent('')
    } else {
      onAddInternalNote(content.trim())
      setContent('')
    }
  }

  return (
    <div
      className="ticket-reply-composer"
      style={{
        background: mode === 'internal' ? '#fffdf7' : '#ffffff',
        border: mode === 'internal' ? '1px dashed #d97706' : '1px solid #cbd5e1',
        borderRadius: 8,
        overflow: 'hidden',
        boxShadow: '0 2px 6px rgba(0, 0, 0, 0.04)',
      }}
    >
      {/* Mode Switch Tabs */}
      <div
        style={{
          display: 'flex',
          borderBottom: '1px solid #e2e8f0',
          background: mode === 'internal' ? '#fffbeb' : '#f8fafc',
          padding: '4px 8px 0 8px',
          gap: 6,
        }}
      >
        <button
          type="button"
          onClick={() => setMode('public')}
          style={{
            padding: '8px 14px',
            fontSize: '0.84rem',
            fontWeight: 600,
            border: 'none',
            borderBottom: mode === 'public' ? '2px solid var(--navy-primary, #102a43)' : '2px solid transparent',
            background: 'transparent',
            color: mode === 'public' ? 'var(--navy-primary, #102a43)' : '#64748b',
            cursor: 'pointer',
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
          }}
        >
          <MessageSquare size={14} />
          <span>Phản hồi công khai</span>
        </button>

        <button
          type="button"
          onClick={() => setMode('internal')}
          style={{
            padding: '8px 14px',
            fontSize: '0.84rem',
            fontWeight: 600,
            border: 'none',
            borderBottom: mode === 'internal' ? '2px solid #d97706' : '2px solid transparent',
            background: 'transparent',
            color: mode === 'internal' ? '#b45309' : '#64748b',
            cursor: 'pointer',
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
          }}
        >
          <Lock size={14} />
          <span>Ghi chú nội bộ</span>
        </button>
      </div>

      <form onSubmit={handleSubmit} style={{ padding: '14px 16px' }}>
        {mode === 'internal' && (
          <div
            style={{
              fontSize: '0.78rem',
              color: '#b45309',
              marginBottom: 8,
              display: 'flex',
              alignItems: 'center',
              gap: 5,
              fontWeight: 600,
            }}
          >
            <Lock size={13} />
            <span>Nội dung này được bảo mật, người dùng sẽ không nhìn thấy.</span>
          </div>
        )}

        <textarea
          rows={4}
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder={
            mode === 'public'
              ? 'Nhập nội dung phản hồi hoặc hướng dẫn xử lý sự cố cho người dùng...'
              : 'Nhập ghi chú kỹ thuật nội bộ (nguyên nhân sự cố, lưu ý hệ thống)...'
          }
          style={{
            width: '100%',
            padding: '10px 12px',
            borderRadius: 6,
            border: '1px solid #cbd5e1',
            fontSize: '0.88rem',
            fontFamily: 'inherit',
            lineHeight: 1.5,
            resize: 'vertical',
            background: '#ffffff',
            color: '#102a43',
            boxSizing: 'border-box',
          }}
          disabled={isSubmitting}
        />

        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginTop: 10,
          }}
        >
          <span style={{ fontSize: '0.78rem', color: '#64748b' }}>
            {content.length > 0 ? `${content.length} ký tự` : 'Hỗ trợ định dạng văn bản thuần'}
          </span>

          <button
            type="submit"
            className="btn btn-primary"
            disabled={!content.trim() || isSubmitting}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              background: mode === 'internal' ? '#d97706' : 'var(--navy-primary, #102a43)',
              borderColor: mode === 'internal' ? '#d97706' : 'var(--navy-primary, #102a43)',
              fontSize: '0.85rem',
              padding: '8px 16px',
            }}
          >
            {mode === 'internal' ? <Lock size={14} /> : <Send size={14} />}
            <span>{isSubmitting ? 'Đang gửi...' : mode === 'internal' ? 'Lưu ghi chú' : 'Gửi phản hồi'}</span>
          </button>
        </div>
      </form>
    </div>
  )
}


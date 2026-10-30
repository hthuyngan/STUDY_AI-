import React from 'react'
import { User, ShieldCheck, Lock, Clock } from 'lucide-react'
import type { SupportTicketMessage } from '@/types/support'

interface InternalNoteItem {
  text: string
  date: string
}

interface TicketConversationProps {
  messages: SupportTicketMessage[]
  internalNotes?: InternalNoteItem[]
}

export const TicketConversation: React.FC<TicketConversationProps> = ({
  messages,
  internalNotes = [],
}) => {
  return (
    <div className="ticket-conversation-container" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      {/* Messages */}
      {messages.map((msg) => {
        const isSupport = msg.senderRole === 'support'

        return (
          <div
            key={msg.id}
            className={`ticket-message-card ${isSupport ? 'is-support' : 'is-user'}`}
            style={{
              padding: '14px 16px',
              borderRadius: 8,
              border: isSupport ? '1px solid #cbd5e1' : '1px solid #e2e8f0',
              background: isSupport ? 'rgba(16, 42, 67, 0.03)' : '#ffffff',
              boxShadow: '0 1px 3px rgba(0, 0, 0, 0.04)',
            }}
          >
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: 8,
                paddingBottom: 6,
                borderBottom: '1px solid rgba(0, 0, 0, 0.06)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <div
                  style={{
                    width: 28,
                    height: 28,
                    borderRadius: '50%',
                    background: isSupport ? 'var(--navy-primary, #102a43)' : '#0284c7',
                    color: '#ffffff',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '0.75rem',
                    fontWeight: 700,
                  }}
                >
                  {isSupport ? <ShieldCheck size={14} /> : <User size={14} />}
                </div>
                <div>
                  <span style={{ fontWeight: 700, fontSize: '0.88rem', color: '#102a43' }}>
                    {msg.senderName}
                  </span>
                  {isSupport && (
                    <span
                      style={{
                        marginLeft: 6,
                        fontSize: '0.72rem',
                        fontWeight: 600,
                        background: 'rgba(16, 42, 67, 0.08)',
                        color: 'var(--navy-primary, #102a43)',
                        padding: '1px 6px',
                        borderRadius: 4,
                      }}
                    >
                      Ban hỗ trợ
                    </span>
                  )}
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: '0.78rem', color: '#627d98' }}>
                <Clock size={12} />
                <span>
                  {new Date(msg.timestamp).toLocaleString('vi-VN', {
                    hour: '2-digit',
                    minute: '2-digit',
                    day: '2-digit',
                    month: '2-digit',
                  })}
                </span>
              </div>
            </div>

            <div
              style={{
                fontSize: '0.9rem',
                lineHeight: 1.55,
                color: '#334e68',
                whiteSpace: 'pre-wrap',
                wordBreak: 'break-word',
              }}
            >
              {msg.message}
            </div>
          </div>
        )
      })}

      {/* Internal Notes Display */}
      {internalNotes.map((note, idx) => (
        <div
          key={`note-${idx}`}
          className="ticket-internal-note-card"
          style={{
            padding: '12px 16px',
            borderRadius: 8,
            border: '1px dashed #f59e0b',
            background: '#fffdf5',
            boxShadow: '0 1px 2px rgba(245, 158, 11, 0.05)',
          }}
        >
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: 6,
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#b45309', fontWeight: 700, fontSize: '0.8rem' }}>
              <Lock size={13} />
              <span>GHI CHÚ NỘI BỘ (Chỉ nhân viên nhìn thấy)</span>
            </div>
            <span style={{ fontSize: '0.75rem', color: '#92400e' }}>
              {new Date(note.date).toLocaleString('vi-VN', {
                hour: '2-digit',
                minute: '2-digit',
                day: '2-digit',
                month: '2-digit',
              })}
            </span>
          </div>
          <div style={{ fontSize: '0.88rem', color: '#78350f', lineHeight: 1.5 }}>
            {note.text}
          </div>
        </div>
      ))}
    </div>
  )
}


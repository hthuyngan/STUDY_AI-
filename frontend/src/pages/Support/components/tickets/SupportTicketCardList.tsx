import React from 'react'
import { Link } from 'react-router-dom'
import { Eye, MessageSquare, UserCheck, Clock, User } from 'lucide-react'
import type { SupportTicketItem } from '@/types/support'

interface SupportTicketCardListProps {
  tickets: SupportTicketItem[]
  onAssign?: (ticket: SupportTicketItem) => void
}

export const SupportTicketCardList: React.FC<SupportTicketCardListProps> = ({
  tickets,
  onAssign,
}) => {
  return (
    <div className="staff-mobile-card-list">
      {tickets.map((t) => (
        <div key={t.id} className="staff-mobile-card">
          <div className="staff-mobile-card-header">
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4, flexWrap: 'wrap' }}>
                <span
                  className={`status-badge ${
                    t.priority === 'urgent' || t.priority === 'high'
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
                <span className="status-badge status-default" style={{ textTransform: 'capitalize' }}>
                  {t.category === 'sync'
                    ? 'Đồng bộ'
                    : t.category === 'account'
                    ? 'Tài khoản'
                    : t.category === 'billing'
                    ? 'Học phí'
                    : t.category === 'content'
                    ? 'Nội dung'
                    : 'Khác'}
                </span>
              </div>
              <h3 className="staff-mobile-card-title">
                <Link to={`/support/tickets/${t.id}`} style={{ color: 'inherit', textDecoration: 'none' }}>
                  {t.title}
                </Link>
              </h3>
            </div>
            <code
              style={{
                background: '#f1f5f9',
                padding: '2px 8px',
                borderRadius: 4,
                fontWeight: 700,
                fontSize: '0.8rem',
                color: 'var(--navy-primary, #102a43)',
                alignSelf: 'flex-start',
              }}
            >
              {t.id}
            </code>
          </div>

          <div className="staff-mobile-card-meta">
            <div className="staff-mobile-card-meta-item">
              <span className="meta-label">Người gửi:</span>
              <span className="meta-value" style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                <User size={12} color="#627d98" />
                {t.userName}
              </span>
            </div>
            <div className="staff-mobile-card-meta-item">
              <span className="meta-label">Phụ trách:</span>
              <span className="meta-value">{t.assignedTo || 'Chưa phân công'}</span>
            </div>
            <div className="staff-mobile-card-meta-item">
              <span className="meta-label">Phản hồi:</span>
              <span className="meta-value" style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                <MessageSquare size={12} color="#627d98" />
                {t.messageCount} lượt
              </span>
            </div>
            <div className="staff-mobile-card-meta-item">
              <span className="meta-label">Cập nhật:</span>
              <span className="meta-value" style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                <Clock size={12} color="#627d98" />
                {new Date(t.updatedAt).toLocaleDateString('vi-VN')}
              </span>
            </div>
          </div>

          <div className="staff-mobile-card-actions">
            {onAssign && (
              <button
                type="button"
                className="admin-btn-secondary"
                style={{ flex: 1, padding: '7px 12px', fontSize: '0.82rem', gap: 6, display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}
                onClick={() => onAssign(t)}
              >
                <UserCheck size={14} />
                <span>Phân công</span>
              </button>
            )}
            <Link
              to={`/support/tickets/${t.id}`}
              className="admin-btn-primary"
              style={{ flex: 1, padding: '7px 12px', fontSize: '0.82rem', gap: 6, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', textDecoration: 'none' }}
            >
              <Eye size={14} />
              <span>Xem chi tiết</span>
            </Link>
          </div>
        </div>
      ))}
    </div>
  )
}


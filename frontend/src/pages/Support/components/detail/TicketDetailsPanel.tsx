import React from 'react'
import { Link } from 'react-router-dom'
import {
  User,
  Calendar,
  Clock,
  ExternalLink,
  CheckCircle2,
  AlertCircle,
  Check,
} from 'lucide-react'
import type {
  SupportTicketItem,
  SupportUserProfile,
  TicketStatus,
} from '@/types/support'

interface TicketDetailsPanelProps {
  ticket: SupportTicketItem
  userProfile: SupportUserProfile | null
  currentStatus: TicketStatus
  currentAssignee: string
  onStatusChange: (status: TicketStatus) => void
  onAssigneeChange: (assignee: string) => void
  onMarkResolved?: () => void
}

const STAFF_LIST = [
  'Lê Hữu Phúc',
  'Lê Hữu Phước',
  'Vũ Hoàng Yến',
  'Nguyễn Tuấn Kiệt',
  'Trần Quản Trị',
]

export const TicketDetailsPanel: React.FC<TicketDetailsPanelProps> = ({
  ticket,
  userProfile,
  currentStatus,
  currentAssignee,
  onStatusChange,
  onAssigneeChange,
  onMarkResolved,
}) => {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* Ticket Operations Card */}
      <div className="admin-card">
        <div className="admin-card-header" style={{ padding: '12px 16px', borderBottom: '1px solid #e2e8f0' }}>
          <h2 style={{ fontSize: '0.92rem', fontWeight: 700, margin: 0, color: 'var(--navy-primary, #102a43)' }}>
            Quản trị & Điều phối Ticket
          </h2>
        </div>
        <div className="admin-card-body" style={{ padding: 16 }}>
          <div style={{ marginBottom: 14 }}>
            <label
              htmlFor="ticket-status-select"
              style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#475569', marginBottom: 4 }}
            >
              Trạng thái xử lý:
            </label>
            <select
              id="ticket-status-select"
              className="admin-filter-select"
              style={{ width: '100%' }}
              value={currentStatus}
              onChange={(e) => onStatusChange(e.target.value as TicketStatus)}
              aria-label="Cập nhật trạng thái"
            >
              <option value="open">Chưa xử lý (Open)</option>
              <option value="in-progress">Đang xử lý (In Progress)</option>
              <option value="waiting">Chờ phản hồi (Waiting)</option>
              <option value="resolved">Đã giải quyết (Resolved)</option>
            </select>
          </div>

          <div style={{ marginBottom: 14 }}>
            <label
              htmlFor="ticket-assignee-select"
              style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#475569', marginBottom: 4 }}
            >
              Nhân viên phụ trách:
            </label>
            <select
              id="ticket-assignee-select"
              className="admin-filter-select"
              style={{ width: '100%' }}
              value={currentAssignee}
              onChange={(e) => onAssigneeChange(e.target.value)}
              aria-label="Nhân viên phụ trách"
            >
              <option value="Chưa phân công">Chưa phân công</option>
              {STAFF_LIST.map((staff) => (
                <option key={staff} value={staff}>
                  {staff}
                </option>
              ))}
            </select>
          </div>

          {currentStatus !== 'resolved' && onMarkResolved && (
            <button
              type="button"
              className="btn btn-primary"
              style={{ width: '100%', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 6, fontSize: '0.85rem' }}
              onClick={onMarkResolved}
            >
              <Check size={14} />
              <span>Đánh dấu đã giải quyết</span>
            </button>
          )}
        </div>
      </div>

      {/* User Context & Diagnostic Card */}
      <div className="admin-card">
        <div
          className="admin-card-header"
          style={{
            padding: '12px 16px',
            borderBottom: '1px solid #e2e8f0',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <h2 style={{ fontSize: '0.92rem', fontWeight: 700, margin: 0, color: 'var(--navy-primary, #102a43)' }}>
            Hồ sơ người dùng hỗ trợ
          </h2>
          <Link
            to={`/support/users/${ticket.userId}`}
            style={{ fontSize: '0.8rem', color: '#0284c7', display: 'inline-flex', alignItems: 'center', gap: 4, textDecoration: 'none', fontWeight: 600 }}
            title="Mở hồ sơ kỹ thuật đầy đủ"
          >
            <span>Tra cứu</span>
            <ExternalLink size={12} />
          </Link>
        </div>

        <div className="admin-card-body" style={{ padding: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
            <div
              style={{
                width: 36,
                height: 36,
                borderRadius: '50%',
                background: '#e0f2fe',
                color: '#0284c7',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: 700,
                fontSize: '0.88rem',
              }}
            >
              <User size={18} />
            </div>
            <div>
              <div style={{ fontWeight: 700, color: '#102a43', fontSize: '0.92rem' }}>
                {ticket.userName}
              </div>
              <div style={{ fontSize: '0.78rem', color: '#64748b' }}>
                {ticket.userEmail}
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, fontSize: '0.82rem', borderTop: '1px solid #f1f5f9', paddingTop: 10 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: '#64748b' }}>User ID:</span>
              <code style={{ background: '#f1f5f9', padding: '1px 5px', borderRadius: 4, fontWeight: 600 }}>
                {ticket.userId}
              </code>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ color: '#64748b' }}>Trạng thái đồng bộ:</span>
              <span
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 4,
                  fontSize: '0.75rem',
                  fontWeight: 600,
                  color: userProfile?.syncState === 'synced' ? '#047857' : '#d97706',
                  background: userProfile?.syncState === 'synced' ? 'rgba(4, 120, 87, 0.08)' : 'rgba(217, 119, 6, 0.08)',
                  padding: '2px 6px',
                  borderRadius: 4,
                }}
              >
                {userProfile?.syncState === 'synced' ? <CheckCircle2 size={12} /> : <AlertCircle size={12} />}
                <span>{userProfile?.syncState === 'synced' ? 'Đã đồng bộ' : 'Chờ đồng bộ'}</span>
              </span>
            </div>

            {userProfile?.storageNamespace && (
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: '#64748b' }}>Storage Namespace:</span>
                <span style={{ fontFamily: 'monospace', fontSize: '0.75rem', color: '#334e68' }}>
                  {userProfile.storageNamespace}
                </span>
              </div>
            )}

            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: '#64748b' }}>Bài hoàn thành:</span>
              <span style={{ fontWeight: 600, color: '#102a43' }}>
                {userProfile?.completedLessonsCount || 0} bài học
              </span>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: '#64748b' }}>Lần đăng nhập cuối:</span>
              <span style={{ color: '#334e68' }}>
                {userProfile?.lastLoginAt ? new Date(userProfile.lastLoginAt).toLocaleDateString('vi-VN') : '—'}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Metadata Timestamps Card */}
      <div className="admin-card" style={{ padding: '12px 16px', fontSize: '0.8rem', color: '#64748b' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
          <Calendar size={13} />
          <span>Tạo lúc: {new Date(ticket.updatedAt).toLocaleDateString('vi-VN')}</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <Clock size={13} />
          <span>Cập nhật: {new Date(ticket.updatedAt).toLocaleTimeString('vi-VN')}</span>
        </div>
      </div>
    </div>
  )
}

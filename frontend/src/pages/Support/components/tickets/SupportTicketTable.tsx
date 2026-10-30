import React from 'react'
import { Link } from 'react-router-dom'
import { Eye, MessageSquare, UserCheck } from 'lucide-react'
import type { SupportTicketItem } from '@/types/support'

interface SupportTicketTableProps {
  tickets: SupportTicketItem[]
  onAssign?: (ticket: SupportTicketItem) => void
}

export const SupportTicketTable: React.FC<SupportTicketTableProps> = ({
  tickets,
  onAssign,
}) => {
  return (
    <table className="staff-table" aria-label="Bảng danh sách yêu cầu hỗ trợ">
      <thead>
        <tr>
          <th style={{ width: 110 }}>Mã Ticket</th>
          <th>Tiêu đề yêu cầu</th>
          <th>Người gửi</th>
          <th>Loại vấn đề</th>
          <th>Mức độ</th>
          <th>Nhân viên phụ trách</th>
          <th>Trạng thái</th>
          <th>Cập nhật cuối</th>
          <th style={{ textAlign: 'right', width: 100 }}>Thao tác</th>
        </tr>
      </thead>
      <tbody>
        {tickets.map((t) => (
          <tr key={t.id}>
            <td>
              <code style={{ background: '#f1f5f9', padding: '2px 6px', borderRadius: 4, fontWeight: 700, color: 'var(--navy-primary, #102a43)' }}>
                {t.id}
              </code>
            </td>
            <td>
              <Link
                to={`/support/tickets/${t.id}`}
                className="font-medium text-navy-primary hover:underline"
                style={{ fontWeight: 600, color: '#102a43', display: 'block', marginBottom: 2 }}
              >
                {t.title}
              </Link>
              <div style={{ fontSize: '0.78rem', color: '#627d98', display: 'flex', alignItems: 'center', gap: 4 }}>
                <MessageSquare size={12} />
                <span>{t.messageCount} phản hồi</span>
              </div>
            </td>
            <td>
              <div>
                <span style={{ fontWeight: 500, color: '#102a43' }}>{t.userName}</span>
                <div style={{ fontSize: '0.78rem', color: '#627d98' }}>{t.userEmail}</div>
              </div>
            </td>
            <td>
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
            </td>
            <td>
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
            </td>
            <td>
              <span style={{ fontWeight: 500, color: t.assignedTo ? '#102a43' : '#94a3b8' }}>
                {t.assignedTo || 'Chưa phân công'}
              </span>
            </td>
            <td>
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
            </td>
            <td>
              <span style={{ fontSize: '0.82rem', color: '#627d98' }}>
                {new Date(t.updatedAt).toLocaleDateString('vi-VN', {
                  hour: '2-digit',
                  minute: '2-digit',
                  day: '2-digit',
                  month: '2-digit',
                })}
              </span>
            </td>
            <td style={{ textAlign: 'right' }}>
              <div className="table-actions" style={{ justifyContent: 'flex-end', gap: 6 }}>
                {onAssign && (
                  <button
                    type="button"
                    className="table-action-btn"
                    onClick={() => onAssign(t)}
                    title="Phân công nhân viên"
                  >
                    <UserCheck size={15} />
                  </button>
                )}
                <Link
                  to={`/support/tickets/${t.id}`}
                  className="table-action-btn"
                  title="Mở chi tiết ticket"
                >
                  <Eye size={15} />
                </Link>
              </div>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}


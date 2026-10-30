import React from 'react'
import { Link } from 'react-router-dom'
import { Eye, CheckCircle2, AlertCircle, User } from 'lucide-react'
import type { SupportUserProfile } from '@/types/support'

interface SupportUserTableProps {
  users: SupportUserProfile[]
}

export const SupportUserTable: React.FC<SupportUserTableProps> = ({ users }) => {
  return (
    <table className="staff-table" aria-label="Bảng tra cứu kỹ thuật người dùng">
      <thead>
        <tr>
          <th style={{ width: 100 }}>User ID</th>
          <th>Tên người dùng</th>
          <th>Email</th>
          <th>Vai trò</th>
          <th>Đồng bộ dữ liệu</th>
          <th>Tiến độ học tập</th>
          <th>Đăng nhập gần nhất</th>
          <th style={{ textAlign: 'right', width: 90 }}>Thao tác</th>
        </tr>
      </thead>
      <tbody>
        {users.map((u) => (
          <tr key={u.id}>
            <td>
              <code style={{ background: '#f1f5f9', padding: '2px 6px', borderRadius: 4, fontWeight: 700, color: 'var(--navy-primary, #102a43)' }}>
                {u.id}
              </code>
            </td>
            <td>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <div
                  style={{
                    width: 28,
                    height: 28,
                    borderRadius: '50%',
                    background: '#e0f2fe',
                    color: '#0284c7',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontWeight: 700,
                    fontSize: '0.75rem',
                  }}
                >
                  <User size={14} />
                </div>
                <Link
                  to={`/support/users/${u.id}`}
                  style={{ fontWeight: 600, color: 'var(--navy-primary, #102a43)', textDecoration: 'none' }}
                >
                  {u.displayName}
                </Link>
              </div>
            </td>
            <td>
              <span style={{ color: '#627d98', fontSize: '0.84rem' }}>{u.email}</span>
            </td>
            <td>
              <span className="status-badge status-default">
                {u.role === 'learner' ? 'Học viên' : u.role}
              </span>
            </td>
            <td>
              <span
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 4,
                  fontSize: '0.78rem',
                  fontWeight: 600,
                  color: u.syncState === 'synced' ? '#047857' : '#d97706',
                  background: u.syncState === 'synced' ? 'rgba(4, 120, 87, 0.08)' : 'rgba(217, 119, 6, 0.08)',
                  padding: '2px 6px',
                  borderRadius: 4,
                }}
              >
                {u.syncState === 'synced' ? <CheckCircle2 size={13} /> : <AlertCircle size={13} />}
                <span>{u.syncState === 'synced' ? 'Đã đồng bộ' : 'Chờ đồng bộ'}</span>
              </span>
            </td>
            <td>
              <span style={{ fontSize: '0.84rem', color: '#102a43', fontWeight: 500 }}>
                {u.completedLessonsCount} bài hoàn thành
              </span>
            </td>
            <td>
              <span style={{ fontSize: '0.82rem', color: '#627d98' }}>
                {u.lastLoginAt ? new Date(u.lastLoginAt).toLocaleDateString('vi-VN') : '—'}
              </span>
            </td>
            <td style={{ textAlign: 'right' }}>
              <div className="table-actions" style={{ justifyContent: 'flex-end' }}>
                <Link
                  to={`/support/users/${u.id}`}
                  className="table-action-btn"
                  title="Xem hồ sơ hỗ trợ chi tiết"
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


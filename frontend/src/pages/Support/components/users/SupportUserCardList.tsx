import React from 'react'
import { Link } from 'react-router-dom'
import { Eye, CheckCircle2, AlertCircle, Clock, BookOpen, User } from 'lucide-react'
import type { SupportUserProfile } from '@/types/support'

interface SupportUserCardListProps {
  users: SupportUserProfile[]
}

export const SupportUserCardList: React.FC<SupportUserCardListProps> = ({ users }) => {
  return (
    <div className="staff-mobile-card-list">
      {users.map((u) => (
        <div key={u.id} className="staff-mobile-card">
          <div className="staff-mobile-card-header">
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: '50%',
                  background: '#e0f2fe',
                  color: '#0284c7',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontWeight: 700,
                  fontSize: '0.8rem',
                }}
              >
                <User size={16} />
              </div>
              <div>
                <h3 className="staff-mobile-card-title">
                  <Link to={`/support/users/${u.id}`} style={{ color: 'inherit', textDecoration: 'none' }}>
                    {u.displayName}
                  </Link>
                </h3>
                <p className="staff-mobile-card-subtitle">{u.email}</p>
              </div>
            </div>
            <code
              style={{
                background: '#f1f5f9',
                padding: '2px 8px',
                borderRadius: 4,
                fontWeight: 700,
                fontSize: '0.78rem',
                color: 'var(--navy-primary, #102a43)',
                alignSelf: 'flex-start',
              }}
            >
              {u.id}
            </code>
          </div>

          <div className="staff-mobile-card-meta">
            <div className="staff-mobile-card-meta-item">
              <span className="meta-label">Đồng bộ:</span>
              <span
                className="meta-value"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 4,
                  fontWeight: 600,
                  color: u.syncState === 'synced' ? '#047857' : '#d97706',
                }}
              >
                {u.syncState === 'synced' ? <CheckCircle2 size={12} /> : <AlertCircle size={12} />}
                <span>{u.syncState === 'synced' ? 'Đã đồng bộ' : 'Chờ đồng bộ'}</span>
              </span>
            </div>
            <div className="staff-mobile-card-meta-item">
              <span className="meta-label">Tiến trình:</span>
              <span className="meta-value" style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                <BookOpen size={12} color="#627d98" />
                {u.completedLessonsCount} bài
              </span>
            </div>
            <div className="staff-mobile-card-meta-item" style={{ gridColumn: '1 / -1' }}>
              <span className="meta-label">Đăng nhập cuối:</span>
              <span className="meta-value" style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                <Clock size={12} color="#627d98" />
                {u.lastLoginAt ? new Date(u.lastLoginAt).toLocaleString('vi-VN') : '—'}
              </span>
            </div>
          </div>

          <div className="staff-mobile-card-actions">
            <Link
              to={`/support/users/${u.id}`}
              className="admin-btn-primary"
              style={{
                width: '100%',
                padding: '8px 12px',
                fontSize: '0.82rem',
                gap: 6,
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                textDecoration: 'none',
              }}
            >
              <Eye size={14} />
              <span>Xem hồ sơ hỗ trợ kỹ thuật</span>
            </Link>
          </div>
        </div>
      ))}
    </div>
  )
}


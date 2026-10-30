import React from 'react'
import { Link } from 'react-router-dom'
import { ArrowRight } from 'lucide-react'
import type { AdminUserItem } from '@/types/admin'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { ROLE_LABELS } from '@/components/layout/workspaceNavigation'

export interface UserCardListProps {
  users: AdminUserItem[]
  selectedIds: string[]
  onToggleSelect: (id: string) => void
}

export const UserCardList: React.FC<UserCardListProps> = ({
  users,
  selectedIds,
  onToggleSelect,
}) => {
  return (
    <div className="admin-mobile-card-list user-mobile-card-list" role="region" aria-label="Danh sách người dùng di động">
      {users.map((user) => {
        const isSelected = selectedIds.includes(user.id)
        return (
          <div key={user.id} className={`admin-mobile-card ${isSelected ? 'row-selected' : ''}`}>
            {/* Header: Checkbox + Avatar + Name + Status */}
            <div className="admin-mobile-header">
              <div className="admin-mobile-id-wrap">
                <input
                  type="checkbox"
                  aria-label={`Chọn tài khoản ${user.displayName}`}
                  checked={isSelected}
                  onChange={() => onToggleSelect(user.id)}
                  className="admin-checkbox"
                />
                <div className="staff-avatar-sm" aria-hidden="true">
                  {user.displayName.charAt(0).toUpperCase()}
                </div>
                <div className="admin-mobile-user-info">
                  <Link
                    to={`/admin/users/${user.id}`}
                    className="admin-mobile-name-link"
                  >
                    ND. {user.displayName}
                  </Link>
                  <span className="admin-mobile-email">{user.email}</span>
                </div>
              </div>
              <div className="admin-mobile-status-wrap">
                <StatusBadge status={user.status} />
              </div>
            </div>

            {/* Meta row: Role + Class */}
            <div className="admin-mobile-meta-row">
              <span className={`staff-role-pill role-${user.role}`}>
                {ROLE_LABELS[user.role]}
              </span>
              {user.className && (
                <span className="admin-class-pill">
                  {user.className}
                </span>
              )}
            </div>

            {/* Stats row: Last login */}
            <div className="admin-mobile-stats-row">
              <span className="admin-stat-label">Đăng nhập cuối:</span>
              <span className="admin-stat-value">
                {user.lastLoginAt
                  ? new Date(user.lastLoginAt).toLocaleDateString('vi-VN')
                  : 'Chưa đăng nhập'}
              </span>
            </div>

            {/* Actions */}
            <div className="admin-mobile-actions">
              <Link
                to={`/admin/users/${user.id}`}
                className="btn btn-secondary btn-sm admin-mobile-action-btn"
                aria-label={`Xem chi tiết tài khoản ${user.displayName}`}
              >
                <span>Chi tiết tài khoản</span>
                <ArrowRight size={13} />
              </Link>
            </div>
          </div>
        )
      })}
    </div>
  )
}

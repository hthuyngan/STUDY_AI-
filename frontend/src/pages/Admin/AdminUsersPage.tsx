import React from 'react'
import { ArrowRight } from 'lucide-react'
import { Link } from 'react-router-dom'
import { useAdminUsers } from '@/hooks/useAdmin'
import { FilterBar } from '@/components/ui/FilterBar'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { EmptyState } from '@/components/ui/EmptyState'
import { Skeleton } from '@/components/ui/Skeleton'
import { ROLE_LABELS } from '@/components/layout/workspaceNavigation'
import { PageErrorState } from '@/components/ui/PageErrorState'
import './AdminPages.css'

export const AdminUsersPage: React.FC = () => {
  const {
    users,
    loading,
    error,
    refresh,
    search,
    setSearch,
    roleFilter,
    setRoleFilter,
    statusFilter,
    setStatusFilter,
  } = useAdminUsers()

  if (error) {
    return (
      <PageErrorState
        title="Không thể kết nối máy chủ quản trị."
        description={error}
        onRetry={refresh}
      />
    )
  }

  const roleSelectOptions = [
    { label: 'Tất cả vai trò', value: 'all' },
    { label: 'Học viên', value: 'learner' },
    { label: 'Giáo viên', value: 'teacher' },
    { label: 'Nội dung', value: 'content' },
    { label: 'Hỗ trợ', value: 'support' },
    { label: 'Quản trị viên', value: 'admin' },
  ]

  const statusSelectOptions = [
    { label: 'Tất cả trạng thái', value: 'all' },
    { label: 'Đang hoạt động', value: 'active' },
    { label: 'Tạm khóa', value: 'suspended' },
    { label: 'Chờ duyệt', value: 'pending' },
  ]

  return (
    <div className="admin-users-page">
      {/* Header */}
      <div className="staff-page-header">
        <h1 className="staff-page-title">Quản lý người dùng</h1>
        <p className="staff-page-desc">
          Danh sách tài khoản học viên và nhân sự trong hệ thống StudyAI.
        </p>
      </div>

      {/* Filter Toolbar */}
      <FilterBar
        search={{
          value: search,
          onChange: setSearch,
          placeholder: 'Tìm theo tên hoặc email...',
        }}
        selects={[
          {
            id: 'role',
            label: 'Lọc theo vai trò',
            value: roleFilter,
            onChange: setRoleFilter,
            options: roleSelectOptions,
          },
          {
            id: 'status',
            label: 'Lọc theo trạng thái',
            value: statusFilter,
            onChange: setStatusFilter,
            options: statusSelectOptions,
          },
        ]}
      />

      {/* Table Surface */}
      <div className="staff-table-wrapper">
        {loading ? (
          <div style={{ padding: '24px' }}>
            <Skeleton height={44} style={{ marginBottom: 8 }} />
            <Skeleton height={44} style={{ marginBottom: 8 }} />
            <Skeleton height={44} style={{ marginBottom: 8 }} />
            <Skeleton height={44} />
          </div>
        ) : users.length === 0 ? (
          <div style={{ padding: '40px 20px' }}>
            <EmptyState
              title="Không tìm thấy người dùng"
              description="Không có tài khoản nào khớp với tiêu chí tìm kiếm hoặc bộ lọc hiện tại."
            />
          </div>
        ) : (
          <table className="staff-table" aria-label="Danh sách tài khoản người dùng">
            <thead>
              <tr>
                <th scope="col">Người dùng</th>
                <th scope="col">Vai trò</th>
                <th scope="col">Trạng thái</th>
                <th scope="col">Ngày tạo</th>
                <th scope="col">Đăng nhập cuối</th>
                <th scope="col" style={{ textAlign: 'right' }}>Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {users.map((user) => (
                <tr key={user.id}>
                  <td>
                    <div className="staff-user-cell">
                      <div className="staff-avatar-sm" aria-hidden="true">
                        {user.displayName.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <div className="staff-user-name">{user.displayName}</div>
                        <div className="staff-user-email">{user.email}</div>
                      </div>
                    </div>
                  </td>
                  <td>
                    <span className={`staff-role-pill role-${user.role}`}>
                      {ROLE_LABELS[user.role]}
                    </span>
                  </td>
                  <td>
                    <StatusBadge status={user.status} />
                  </td>
                  <td>
                    {new Date(user.createdAt).toLocaleDateString('vi-VN')}
                  </td>
                  <td>
                    {user.lastLoginAt
                      ? new Date(user.lastLoginAt).toLocaleDateString('vi-VN')
                      : 'Chưa đăng nhập'}
                  </td>
                  <td style={{ textAlign: 'right' }}>
                    <Link
                      to={`/admin/users/${user.id}`}
                      className="staff-action-link"
                      aria-label={`Xem chi tiết tài khoản ${user.displayName}`}
                    >
                      <span>Chi tiết</span>
                      <ArrowRight size={13} />
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}

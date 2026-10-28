import React, { useState } from 'react'
import { ArrowRight, CheckCircle2, ChevronLeft, ChevronRight } from 'lucide-react'
import { Link } from 'react-router-dom'
import { useAdminUsers } from '@/hooks/useAdmin'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { EmptyState } from '@/components/ui/EmptyState'
import { Skeleton } from '@/components/ui/Skeleton'
import { ROLE_LABELS } from '@/components/layout/workspaceNavigation'
import { PageErrorState } from '@/components/ui/PageErrorState'
import { AdminUserTableToolbar } from '@/components/admin/AdminUserTableToolbar'
import { AdminBulkActions } from '@/components/admin/AdminBulkActions'
import { AdminUserFormDialog } from '@/components/admin/AdminUserFormDialog'
import type { AccountStatus, CreateDemoUserInput } from '@/types/admin'
import type { UserRole } from '@/auth/auth.types'
import './AdminPages.css'
import '@/components/admin/AdminComponents.css'

export const AdminUsersPage: React.FC = () => {
  const {
    paginatedUsers,
    totalCount,
    totalPages,
    page,
    setPage,
    pageSize,
    setPageSize,
    selectedIds,
    isSelectedAll,
    toggleSelect,
    toggleSelectAll,
    clearSelection,
    loading,
    error,
    search,
    setSearch,
    roleFilter,
    setRoleFilter,
    statusFilter,
    setStatusFilter,
    createUser,
    bulkUpdateStatus,
    bulkUpdateRole,
    bulkDelete,
    exportCSV,
    refresh,
  } = useAdminUsers()

  const [isFormDialogOpen, setIsFormDialogOpen] = useState(false)
  const [feedbackToast, setFeedbackToast] = useState<string | null>(null)

  const showToast = (msg: string) => {
    setFeedbackToast(msg)
    setTimeout(() => {
      setFeedbackToast(null)
    }, 3500)
  }

  const handleCreateUser = async (input: CreateDemoUserInput) => {
    const user = await createUser(input)
    showToast(`Đã thêm thành công người dùng demo: ${user.displayName}`)
  }

  const handleBulkStatus = async (status: AccountStatus) => {
    const res = await bulkUpdateStatus(status)
    showToast(`Đã cập nhật trạng thái (${status}) cho ${res.updatedCount} tài khoản.`)
  }

  const handleBulkRole = async (role: UserRole) => {
    const res = await bulkUpdateRole(role)
    showToast(`Đã gán vai trò (${ROLE_LABELS[role]}) cho ${res.updatedCount} tài khoản.`)
  }

  const handleBulkDelete = async () => {
    const res = await bulkDelete()
    showToast(`Đã xóa ${res.deletedCount} tài khoản demo khỏi hệ thống.`)
  }

  if (error) {
    return (
      <PageErrorState
        title="Không thể kết nối máy chủ quản trị."
        description={error}
        onRetry={refresh}
      />
    )
  }

  return (
    <div className="admin-users-page">
      {/* Toast notification */}
      {feedbackToast && (
        <div className="admin-toast-banner" role="status">
          <CheckCircle2 size={16} />
          <span>{feedbackToast}</span>
        </div>
      )}

      {/* Header */}
      <div className="staff-page-header">
        <h1 className="staff-page-title">Quản lý người dùng</h1>
        <p className="staff-page-desc">
          Danh sách tài khoản học viên, giáo viên và nhân sự trong hệ thống STUDY_AI.
        </p>
      </div>

      {/* Toolbar: Search, Filters, Page Size, Add User, Export CSV */}
      <AdminUserTableToolbar
        search={search}
        onSearchChange={setSearch}
        roleFilter={roleFilter}
        onRoleFilterChange={setRoleFilter}
        statusFilter={statusFilter}
        onStatusFilterChange={setStatusFilter}
        pageSize={pageSize}
        onPageSizeChange={setPageSize}
        onAddUserClick={() => setIsFormDialogOpen(true)}
        onExportCSVClick={exportCSV}
        totalCount={totalCount}
      />

      {/* Bulk actions bar if accounts are selected */}
      <AdminBulkActions
        selectedCount={selectedIds.length}
        onClearSelection={clearSelection}
        onBulkStatusChange={handleBulkStatus}
        onBulkRoleChange={handleBulkRole}
        onBulkDelete={handleBulkDelete}
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
        ) : paginatedUsers.length === 0 ? (
          <div style={{ padding: '40px 20px' }}>
            <EmptyState
              title="Không tìm thấy người dùng"
              description="Không có tài khoản nào khớp với từ khóa tìm kiếm hoặc bộ lọc hiện tại."
              actionLabel="Thêm người dùng mới"
              onAction={() => setIsFormDialogOpen(true)}
            />
          </div>
        ) : (
          <>
            <table className="staff-table" aria-label="Danh sách tài khoản người dùng">
              <thead>
                <tr>
                  <th scope="col" style={{ width: '40px', textAlign: 'center' }}>
                    <input
                      type="checkbox"
                      aria-label="Chọn tất cả người dùng trên trang này"
                      checked={isSelectedAll}
                      onChange={toggleSelectAll}
                      className="admin-checkbox"
                    />
                  </th>
                  <th scope="col">Người dùng</th>
                  <th scope="col">Vai trò</th>
                  <th scope="col">Trạng thái</th>
                  <th scope="col">Lớp / Tổ bộ môn</th>
                  <th scope="col">Đăng nhập cuối</th>
                  <th scope="col" style={{ textAlign: 'right' }}>Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {paginatedUsers.map((user) => {
                  const isSelected = selectedIds.includes(user.id)
                  return (
                    <tr key={user.id} className={isSelected ? 'row-selected' : undefined}>
                      <td style={{ textAlign: 'center' }}>
                        <input
                          type="checkbox"
                          aria-label={`Chọn tài khoản ${user.displayName}`}
                          checked={isSelected}
                          onChange={() => toggleSelect(user.id)}
                          className="admin-checkbox"
                        />
                      </td>
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
                        <span style={{ fontSize: '0.85rem', color: 'var(--text-main)' }}>
                          {user.className || '—'}
                        </span>
                      </td>
                      <td>
                        <span style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                          {user.lastLoginAt
                            ? new Date(user.lastLoginAt).toLocaleDateString('vi-VN')
                            : 'Chưa đăng nhập'}
                        </span>
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
                  )
                })}
              </tbody>
            </table>

            {/* Pagination Controls */}
            <div className="admin-pagination-bar">
              <div className="admin-pagination-info">
                Hiển thị{' '}
                <strong>
                  {Math.min(totalCount, (page - 1) * pageSize + 1)} -{' '}
                  {Math.min(totalCount, page * pageSize)}
                </strong>{' '}
                trên tổng số <strong>{totalCount}</strong> người dùng
              </div>

              <div className="admin-pagination-controls">
                <button
                  type="button"
                  className="admin-page-btn"
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page <= 1}
                  aria-label="Trang trước"
                >
                  <ChevronLeft size={16} />
                </button>

                {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
                  <button
                    key={p}
                    type="button"
                    className={`admin-page-btn ${p === page ? 'active' : ''}`}
                    onClick={() => setPage(p)}
                    aria-label={`Trang ${p}`}
                    aria-current={p === page ? 'page' : undefined}
                  >
                    {p}
                  </button>
                ))}

                <button
                  type="button"
                  className="admin-page-btn"
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page >= totalPages}
                  aria-label="Trang tiếp theo"
                >
                  <ChevronRight size={16} />
                </button>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Add User Dialog */}
      <AdminUserFormDialog
        isOpen={isFormDialogOpen}
        onClose={() => setIsFormDialogOpen(false)}
        onSubmit={handleCreateUser}
      />
    </div>
  )
}

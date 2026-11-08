import React, { useState, useMemo } from 'react'
import {
  ArrowRight,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Edit2,
  KeyRound,
  Lock,
  RotateCcw,
  Trash2,
  Unlock,
} from 'lucide-react'
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
import { AdminUserEditDialog } from '@/components/admin/AdminUserEditDialog'
import { AdminResetPasswordDialog } from '@/components/admin/AdminResetPasswordDialog'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { AdminSummaryStrip } from './components/common/AdminSummaryStrip'
import { UserCardList } from './components/users/UserCardList'
import type { AccountStatus, AdminUserItem, CreateDemoUserInput, UpdateUserInput } from '@/types/admin'
import type { UserRole } from '@/auth/auth.types'
import './AdminPages.css'
import '@/components/admin/AdminComponents.css'
import './AdminPolish.css'

export const AdminUsersPage: React.FC = () => {
  const {
    users,
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
    editUser,
    toggleStatus,
    revokeSessions,
    resetPassword,
    deleteUser,
    bulkUpdateStatus,
    bulkUpdateRole,
    bulkDelete,
    exportCSV,
    refresh,
  } = useAdminUsers()

  // Dialog states
  const [isFormDialogOpen, setIsFormDialogOpen] = useState(false)
  const [editingUser, setEditingUser] = useState<AdminUserItem | null>(null)
  const [resetPassUser, setResetPassUser] = useState<AdminUserItem | null>(null)

  // Confirmation modal states
  const [statusTarget, setStatusTarget] = useState<AdminUserItem | null>(null)
  const [revokeTarget, setRevokeTarget] = useState<AdminUserItem | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<AdminUserItem | null>(null)
  const [actionLoading, setActionLoading] = useState(false)

  // Feedback toast
  const [feedbackToast, setFeedbackToast] = useState<string | null>(null)

  const showToast = (msg: string) => {
    setFeedbackToast(msg)
    setTimeout(() => {
      setFeedbackToast(null)
    }, 4000)
  }

  const handleCreateUser = async (input: CreateDemoUserInput) => {
    const user = await createUser(input)
    showToast(`Đã tạo thành công người dùng: ${user.displayName} (${user.email})`)
  }

  const handleEditUser = async (userId: string, input: UpdateUserInput) => {
    const updated = await editUser(userId, input)
    showToast(`Đã cập nhật thông tin người dùng: ${updated.displayName}`)
  }

  const handleConfirmToggleStatus = async () => {
    if (!statusTarget) return
    setActionLoading(true)
    try {
      await toggleStatus(statusTarget.id)
      const nextStatus = statusTarget.status === 'active' ? 'Tạm khóa' : 'Đang hoạt động'
      showToast(`Đã đổi trạng thái tài khoản ${statusTarget.displayName} sang: ${nextStatus}`)
      setStatusTarget(null)
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Lỗi khi cập nhật trạng thái')
    } finally {
      setActionLoading(false)
    }
  }

  const handleConfirmRevokeSessions = async () => {
    if (!revokeTarget) return
    setActionLoading(true)
    try {
      await revokeSessions(revokeTarget.id)
      showToast(`Đã thu hồi toàn bộ phiên đăng nhập của: ${revokeTarget.displayName}`)
      setRevokeTarget(null)
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Lỗi khi thu hồi phiên')
    } finally {
      setActionLoading(false)
    }
  }

  const handleConfirmDelete = async () => {
    if (!deleteTarget) return
    setActionLoading(true)
    try {
      await deleteUser(deleteTarget.id)
      showToast(`Đã xóa mềm tài khoản ${deleteTarget.displayName}. Lịch sử học tập được bảo lưu.`)
      setDeleteTarget(null)
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Lỗi khi xóa tài khoản')
    } finally {
      setActionLoading(false)
    }
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
    showToast(`Đã xóa ${res.deletedCount} tài khoản khỏi hệ thống.`)
  }

  const userKPIs = useMemo(() => {
    const total = totalCount || users.length
    const learners = users.filter((u) => u.role === 'learner').length
    const staff = users.filter((u) => u.role !== 'learner').length
    const active = users.filter((u) => u.status === 'active').length
    return [
      { id: 'total', label: 'Tổng số người dùng', value: total, color: 'var(--navy-primary, #102a43)' },
      { id: 'learners', label: 'Học viên', value: learners, color: '#0284c7' },
      { id: 'staff', label: 'Giáo viên & Cán bộ', value: staff, color: '#8b5cf6' },
      { id: 'active', label: 'Đang hoạt động', value: active, color: '#16a34a' },
    ]
  }, [totalCount, users])

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
          Danh sách tài khoản học viên, giáo viên và nhân sự trong hệ thống STUDY_AI kết nối trực tiếp cơ sở dữ liệu SQL Server.
        </p>
      </div>

      {/* 4 KPIs Summary Strip */}
      <AdminSummaryStrip items={userKPIs} ariaLabel="Thống kê nhanh tài khoản người dùng" />

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
      <div className="staff-table-wrapper has-mobile-cards">
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
                  <th scope="col">Khối / Lớp</th>
                  <th scope="col">Đăng nhập cuối</th>
                  <th scope="col" style={{ textAlign: 'right', minWidth: '220px' }}>Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {paginatedUsers.map((user) => {
                  const isSelected = selectedIds.includes(user.id)
                  const isActive = user.status === 'active'
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
                          {user.grade || user.className || '—'}
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
                        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                          <button
                            type="button"
                            className="btn btn-ghost btn-sm"
                            onClick={() => setEditingUser(user)}
                            title="Chỉnh sửa thông tin"
                            aria-label={`Sửa tài khoản ${user.displayName}`}
                            style={{ padding: '4px 6px', color: '#102a43' }}
                          >
                            <Edit2 size={14} />
                          </button>

                          <button
                            type="button"
                            className="btn btn-ghost btn-sm"
                            onClick={() => setStatusTarget(user)}
                            title={isActive ? 'Tạm khóa tài khoản' : 'Mở khóa tài khoản'}
                            aria-label={isActive ? `Tạm ngưng ${user.displayName}` : `Mở hoạt động ${user.displayName}`}
                            style={{ padding: '4px 6px', color: isActive ? '#d97706' : '#16a34a' }}
                          >
                            {isActive ? <Lock size={14} /> : <Unlock size={14} />}
                          </button>

                          <button
                            type="button"
                            className="btn btn-ghost btn-sm"
                            onClick={() => setResetPassUser(user)}
                            title="Đặt lại mật khẩu"
                            aria-label={`Đặt lại mật khẩu ${user.displayName}`}
                            style={{ padding: '4px 6px', color: '#6366f1' }}
                          >
                            <KeyRound size={14} />
                          </button>

                          <button
                            type="button"
                            className="btn btn-ghost btn-sm"
                            onClick={() => setRevokeTarget(user)}
                            title="Thu hồi phiên đăng nhập"
                            aria-label={`Thu hồi phiên ${user.displayName}`}
                            style={{ padding: '4px 6px', color: '#8b5cf6' }}
                          >
                            <RotateCcw size={14} />
                          </button>

                          <button
                            type="button"
                            className="btn btn-ghost btn-sm"
                            onClick={() => setDeleteTarget(user)}
                            title="Xóa mềm tài khoản"
                            aria-label={`Xóa tài khoản ${user.displayName}`}
                            style={{ padding: '4px 6px', color: '#dc2626' }}
                          >
                            <Trash2 size={14} />
                          </button>

                          <Link
                            to={`/admin/users/${user.id}`}
                            className="staff-action-link"
                            aria-label={`Xem chi tiết tài khoản ${user.displayName}`}
                            style={{ marginLeft: '4px' }}
                          >
                            <span>Chi tiết</span>
                            <ArrowRight size={13} />
                          </Link>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>

            {/* Mobile Card List (displayed at <= 768px) */}
            <UserCardList
              users={paginatedUsers}
              selectedIds={selectedIds}
              onToggleSelect={toggleSelect}
            />

            {/* Pagination Controls */}
            <div className="admin-pagination-bar">
              <div className="admin-pagination-info">
                Hiển thị{' '}
                <strong>
                  {totalCount === 0 ? 0 : Math.min(totalCount, (page - 1) * pageSize + 1)} -{' '}
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

      {/* Edit User Dialog */}
      <AdminUserEditDialog
        key={editingUser?.id}
        user={editingUser}
        isOpen={!!editingUser}
        onClose={() => setEditingUser(null)}
        onSubmit={handleEditUser}
      />

      {/* Reset Password Dialog */}
      <AdminResetPasswordDialog
        key={resetPassUser?.id}
        user={resetPassUser}
        isOpen={!!resetPassUser}
        onClose={() => setResetPassUser(null)}
        onReset={resetPassword}
      />

      {/* Toggle Status Confirmation Dialog */}
      <ConfirmDialog
        isOpen={!!statusTarget}
        title={statusTarget?.status === 'active' ? 'Tạm khóa tài khoản người dùng?' : 'Mở khóa tài khoản người dùng?'}
        description={
          statusTarget?.status === 'active'
            ? `Bạn có chắc chắn muốn tạm khóa tài khoản "${statusTarget?.displayName}" (${statusTarget?.email})? Mọi phiên đăng nhập hiện tại sẽ bị thu hồi và người dùng sẽ không thể truy cập hệ thống.`
            : `Kích hoạt lại tài khoản "${statusTarget?.displayName}" (${statusTarget?.email})? Người dùng sẽ có thể đăng nhập bình thường.`
        }
        confirmText={statusTarget?.status === 'active' ? 'Tạm khóa tài khoản' : 'Mở khóa'}
        cancelText="Hủy bỏ"
        variant={statusTarget?.status === 'active' ? 'warning' : 'primary'}
        isLoading={actionLoading}
        onConfirm={handleConfirmToggleStatus}
        onCancel={() => setStatusTarget(null)}
      />

      {/* Revoke Sessions Confirmation Dialog */}
      <ConfirmDialog
        isOpen={!!revokeTarget}
        title="Thu hồi toàn bộ phiên đăng nhập?"
        description={`Bạn có chắc chắn muốn thu hồi tất cả phiên đăng nhập và refresh token đang hoạt động của "${revokeTarget?.displayName}" (${revokeTarget?.email})? Người dùng sẽ phải đăng nhập lại trên mọi thiết bị.`}
        confirmText="Thu hồi phiên"
        cancelText="Hủy bỏ"
        variant="warning"
        isLoading={actionLoading}
        onConfirm={handleConfirmRevokeSessions}
        onCancel={() => setRevokeTarget(null)}
      />

      {/* Soft Delete Confirmation Dialog */}
      <ConfirmDialog
        isOpen={!!deleteTarget}
        title="Xác nhận xóa mềm tài khoản?"
        description={`Bạn có chắc chắn muốn xóa tài khoản "${deleteTarget?.displayName}" (${deleteTarget?.email})? Tài khoản sẽ bị vô hiệu hóa và thu hồi toàn bộ phiên. Lịch sử bài tập, điểm đánh giá và nhật ký hoạt động sẽ được bảo lưu toàn vẹn trong hệ thống.`}
        confirmText="Xóa tài khoản"
        cancelText="Hủy bỏ"
        isDestructive
        isLoading={actionLoading}
        onConfirm={handleConfirmDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  )
}

import React, { useState } from 'react'
import {
  ArrowLeft,
  CheckCircle2,
  KeyRound,
  Shield,
  UserX,
  UserCheck,
} from 'lucide-react'
import { Link, useParams } from 'react-router-dom'
import { useAdminUserDetail } from '@/hooks/useAdmin'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { Button } from '@/components/ui/Button'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { Skeleton } from '@/components/ui/Skeleton'
import { PageErrorState } from '@/components/ui/PageErrorState'
import { ROLE_LABELS } from '@/components/layout/workspaceNavigation'
import { AdminDetailTabs } from '@/components/admin/AdminDetailTabs'
import type { UserRole } from '@/auth/auth.types'
import './AdminPages.css'
import '@/components/admin/AdminComponents.css'

export const AdminUserDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>()
  const {
    user,
    loading,
    error,
    activeTab,
    setActiveTab,
    updateRole,
    toggleStatus,
    revokeSessions,
    refresh,
  } = useAdminUserDetail(id || '')

  // Modals / Dialog state
  const [roleModalOpen, setRoleModalOpen] = useState(false)
  const [selectedRole, setSelectedRole] = useState<UserRole>('learner')
  const [statusConfirmOpen, setStatusConfirmOpen] = useState(false)
  const [resetConfirmOpen, setResetConfirmOpen] = useState(false)
  const [actionLoading, setActionLoading] = useState(false)
  const [feedbackToast, setFeedbackToast] = useState<string | null>(null)

  const showToast = (msg: string) => {
    setFeedbackToast(msg)
    setTimeout(() => {
      setFeedbackToast(null)
    }, 4000)
  }

  if (loading) {
    return (
      <div style={{ padding: '24px' }}>
        <Skeleton height={32} width={220} style={{ marginBottom: 16 }} />
        <Skeleton height={280} />
      </div>
    )
  }

  if (error || !user) {
    return (
      <PageErrorState
        title="Không tìm thấy người dùng."
        description={error || 'Tài khoản không tồn tại trong hệ thống demo.'}
        onRetry={refresh}
      />
    )
  }

  const handleRoleChange = async () => {
    setActionLoading(true)
    try {
      await updateRole(selectedRole)
      setRoleModalOpen(false)
      showToast(`Đã cập nhật vai trò thành công: ${ROLE_LABELS[selectedRole]}`)
    } finally {
      setActionLoading(false)
    }
  }

  const handleToggleStatus = async () => {
    setActionLoading(true)
    try {
      await toggleStatus()
      setStatusConfirmOpen(false)
      const nextStatus = user.status === 'active' ? 'Tạm khóa' : 'Đang hoạt động'
      showToast(`Đã cập nhật trạng thái tài khoản sang: ${nextStatus}`)
    } finally {
      setActionLoading(false)
    }
  }

  const handleRevokeSessions = async () => {
    setActionLoading(true)
    try {
      await revokeSessions()
      setResetConfirmOpen(false)
      showToast('Mô phỏng thành công: Đã thu hồi toàn bộ token đăng nhập của người dùng.')
    } finally {
      setActionLoading(false)
    }
  }

  return (
    <div className="admin-user-detail-page">
      {/* Toast Feedback */}
      {feedbackToast && (
        <div className="admin-toast-banner" role="status">
          <CheckCircle2 size={16} />
          <span>{feedbackToast}</span>
        </div>
      )}

      {/* Back button */}
      <div style={{ marginBottom: '16px' }}>
        <Link
          to="/admin/users"
          className="admin-back-link"
          aria-label="Quay lại danh sách người dùng"
        >
          <ArrowLeft size={16} />
          <span>Quay lại danh sách người dùng</span>
        </Link>
      </div>

      <div className="staff-detail-grid">
        {/* Cột trái 1/3: Hồ sơ, vai trò, trạng thái, thao tác */}
        <div className="staff-profile-card">
          <div className="staff-profile-avatar-lg">
            {user.displayName.charAt(0).toUpperCase()}
          </div>
          <h2 className="staff-profile-name">{user.displayName}</h2>
          <div className="staff-profile-email">{user.email}</div>

          <div style={{ display: 'flex', gap: '8px', marginBottom: '16px', flexWrap: 'wrap', justifyContent: 'center' }}>
            <span className={`staff-role-pill role-${user.role}`}>
              {ROLE_LABELS[user.role]}
            </span>
            <StatusBadge status={user.status} />
          </div>

          <div className="staff-profile-meta-list">
            <div className="staff-profile-meta-row">
              <span className="staff-profile-meta-label">ID tài khoản:</span>
              <span className="staff-profile-meta-val" style={{ fontFamily: 'monospace' }}>
                {user.id}
              </span>
            </div>
            {user.className && (
              <div className="staff-profile-meta-row">
                <span className="staff-profile-meta-label">Lớp / Bộ môn:</span>
                <span className="staff-profile-meta-val">{user.className}</span>
              </div>
            )}
            <div className="staff-profile-meta-row">
              <span className="staff-profile-meta-label">Ngày tạo:</span>
              <span className="staff-profile-meta-val">
                {new Date(user.createdAt).toLocaleDateString('vi-VN')}
              </span>
            </div>
            <div className="staff-profile-meta-row">
              <span className="staff-profile-meta-label">Đăng nhập cuối:</span>
              <span className="staff-profile-meta-val">
                {user.lastLoginAt
                  ? new Date(user.lastLoginAt).toLocaleString('vi-VN')
                  : 'Chưa đăng nhập'}
              </span>
            </div>
          </div>

          {/* Action buttons */}
          <div className="staff-profile-actions">
            <Button
              variant="outline"
              icon={Shield}
              onClick={() => {
                setSelectedRole(user.role)
                setRoleModalOpen(true)
              }}
              fullWidth
            >
              Đổi vai trò
            </Button>

            <Button
              variant="outline"
              icon={user.status === 'active' ? UserX : UserCheck}
              onClick={() => setStatusConfirmOpen(true)}
              fullWidth
              style={
                user.status === 'active'
                  ? { color: '#dc2626', borderColor: '#fca5a5' }
                  : { color: '#047857', borderColor: '#a7f3d0' }
              }
            >
              {user.status === 'active' ? 'Khóa tài khoản' : 'Mở khóa tài khoản'}
            </Button>

            <Button
              variant="ghost"
              icon={KeyRound}
              onClick={() => setResetConfirmOpen(true)}
              fullWidth
              title="Mô phỏng hành động thu hồi phiên làm việc"
            >
              Thu hồi phiên (Mô phỏng)
            </Button>
          </div>
        </div>

        {/* Cột phải 2/3: Tabs chi tiết */}
        <div className="staff-detail-right-col">
          <AdminDetailTabs
            user={user}
            activeTab={activeTab}
            onTabChange={setActiveTab}
          />
        </div>
      </div>

      {/* Role Change Modal */}
      {roleModalOpen && (
        <div className="confirm-dialog-backdrop" onClick={() => setRoleModalOpen(false)}>
          <div
            className="confirm-dialog-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="role-modal-title"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="confirm-dialog-header">
              <h3 id="role-modal-title" className="confirm-dialog-title">
                Thay đổi vai trò cho {user.displayName}
              </h3>
            </div>
            <div className="confirm-dialog-body">
              <p className="confirm-dialog-desc">
                Chọn vai trò mới cho tài khoản. Phân quyền và không gian làm việc tương ứng sẽ cập nhật ngay trong phiên demo này.
              </p>
              <div style={{ marginTop: '14px' }}>
                <label htmlFor="select-new-role" className="admin-form-label">
                  Vai trò mới:
                </label>
                <select
                  id="select-new-role"
                  className="admin-form-select"
                  value={selectedRole}
                  onChange={(e) => setSelectedRole(e.target.value as UserRole)}
                  style={{ marginTop: '6px' }}
                >
                  <option value="learner">Học viên (Learner)</option>
                  <option value="teacher">Giáo viên (Teacher)</option>
                  <option value="content">Biên soạn nội dung (Content)</option>
                  <option value="support">Nhân viên hỗ trợ (Support)</option>
                  <option value="admin">Quản trị viên (Admin)</option>
                </select>
              </div>
            </div>
            <div className="confirm-dialog-footer">
              <Button
                variant="ghost"
                onClick={() => setRoleModalOpen(false)}
                disabled={actionLoading}
              >
                Hủy bỏ
              </Button>
              <Button
                variant="primary"
                onClick={handleRoleChange}
                isLoading={actionLoading}
              >
                Lưu vai trò
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Deactivate/Activate Confirm */}
      <ConfirmDialog
        isOpen={statusConfirmOpen}
        title={user.status === 'active' ? 'Khóa tài khoản này?' : 'Mở khóa tài khoản?'}
        description={
          user.status === 'active'
            ? `Tài khoản ${user.displayName} sẽ không thể đăng nhập vào bài học cho đến khi mở khóa lại.`
            : `Tài khoản ${user.displayName} sẽ có thể truy cập trở lại vào hệ thống STUDY_AI bình thường.`
        }
        confirmText={user.status === 'active' ? 'Xác nhận khóa' : 'Mở khóa'}
        isDestructive={user.status === 'active'}
        isLoading={actionLoading}
        onConfirm={handleToggleStatus}
        onCancel={() => setStatusConfirmOpen(false)}
      />

      {/* Revoke Session Confirm */}
      <ConfirmDialog
        isOpen={resetConfirmOpen}
        title="Mô phỏng: Thu hồi toàn bộ phiên đăng nhập?"
        description={`Hành động này mô phỏng việc hủy toàn bộ token refresh trong cơ sở dữ liệu của ${user.displayName}. Người dùng sẽ buộc phải đăng nhập lại.`}
        confirmText="Xác nhận thu hồi"
        isDestructive={true}
        isLoading={actionLoading}
        onConfirm={handleRevokeSessions}
        onCancel={() => setResetConfirmOpen(false)}
      />
    </div>
  )
}

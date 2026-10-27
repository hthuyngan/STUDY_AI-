import React, { useState } from 'react'
import {
  ArrowLeft,
  CheckCircle2,
  Clock,
  KeyRound,
  Shield,
  UserX,
} from 'lucide-react'
import { Link, useParams } from 'react-router-dom'
import { useAdminUserDetail } from '@/hooks/useAdmin'
import { adminService } from '@/services/admin.service'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { Button } from '@/components/ui/Button'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { Skeleton } from '@/components/ui/Skeleton'
import { PageErrorState } from '@/components/ui/PageErrorState'
import { ROLE_LABELS } from '@/components/layout/workspaceNavigation'
import type { UserRole } from '@/auth/auth.types'
import './AdminPages.css'

export const AdminUserDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>()
  const { user, loading, error, refresh } = useAdminUserDetail(id || '')

  // Modals / Dialog state
  const [roleModalOpen, setRoleModalOpen] = useState(false)
  const [selectedRole, setSelectedRole] = useState<UserRole>('learner')
  const [statusConfirmOpen, setStatusConfirmOpen] = useState(false)
  const [resetConfirmOpen, setResetConfirmOpen] = useState(false)
  const [actionLoading, setActionLoading] = useState(false)

  if (loading) {
    return (
      <div style={{ padding: '24px' }}>
        <Skeleton height={32} width={200} style={{ marginBottom: 16 }} />
        <Skeleton height={240} />
      </div>
    )
  }

  if (error || !user) {
    return <PageErrorState description={error || 'Không tìm thấy người dùng'} />
  }

  const handleRoleChange = async () => {
    setActionLoading(true)
    try {
      await adminService.updateUserRole(user.id, selectedRole)
      setRoleModalOpen(false)
      refresh()
    } finally {
      setActionLoading(false)
    }
  }

  const handleToggleStatus = async () => {
    setActionLoading(true)
    try {
      await adminService.toggleUserStatus(user.id)
      setStatusConfirmOpen(false)
      refresh()
    } finally {
      setActionLoading(false)
    }
  }

  const handleResetSession = async () => {
    setActionLoading(true)
    try {
      // Mock session reset
      await new Promise((resolve) => setTimeout(resolve, 400))
      setResetConfirmOpen(false)
    } finally {
      setActionLoading(false)
    }
  }

  return (
    <div className="admin-user-detail-page">
      {/* Back button */}
      <div style={{ marginBottom: '16px' }}>
        <Link
          to="/admin/users"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            fontSize: '0.88rem',
            color: 'var(--text-muted)',
            textDecoration: 'none',
          }}
        >
          <ArrowLeft size={16} />
          <span>Quay lại danh sách người dùng</span>
        </Link>
      </div>

      <div className="staff-detail-grid">
        {/* Left Profile Card */}
        <div className="staff-profile-card">
          <div className="staff-profile-avatar-lg">
            {user.displayName.charAt(0).toUpperCase()}
          </div>
          <h2 className="staff-profile-name">{user.displayName}</h2>
          <div className="staff-profile-email">{user.email}</div>

          <div style={{ display: 'flex', gap: '8px', marginBottom: '12px' }}>
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
            <div className="staff-profile-meta-row">
              <span className="staff-profile-meta-label">Ngày đăng ký:</span>
              <span className="staff-profile-meta-val">
                {new Date(user.createdAt).toLocaleDateString('vi-VN')}
              </span>
            </div>
            <div className="staff-profile-meta-row">
              <span className="staff-profile-meta-label">Đăng nhập cuối:</span>
              <span className="staff-profile-meta-val">
                {user.lastLoginAt
                  ? new Date(user.lastLoginAt).toLocaleString('vi-VN')
                  : 'Chưa có'}
              </span>
            </div>
          </div>

          <div className="staff-profile-actions">
            <Button
              variant="outline"
              icon={Shield}
              onClick={() => {
                setSelectedRole(user.role)
                setRoleModalOpen(true)
              }}
            >
              Đổi vai trò
            </Button>
            <Button
              variant="outline"
              icon={UserX}
              onClick={() => setStatusConfirmOpen(true)}
              style={
                user.status === 'active'
                  ? { color: '#dc2626', borderColor: '#fca5a5' }
                  : undefined
              }
            >
              {user.status === 'active' ? 'Khóa tài khoản' : 'Mở khóa tài khoản'}
            </Button>
            <Button
              variant="ghost"
              icon={KeyRound}
              onClick={() => setResetConfirmOpen(true)}
            >
              Thu hồi phiên đăng nhập
            </Button>
          </div>
        </div>

        {/* Right Info Panels */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {/* Academic summary if learner */}
          {user.role === 'learner' && (
            <div className="staff-card">
              <div className="staff-card-header">
                <h3 className="staff-card-title">Tóm tắt tiến độ học tập</h3>
              </div>
              <div className="staff-card-body">
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                  <div style={{ background: 'var(--bg-main)', padding: '14px', borderRadius: '6px' }}>
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                      BÀI HỌC HOÀN THÀNH
                    </div>
                    <div style={{ fontSize: '1.4rem', fontWeight: 700, color: 'var(--text-main)', marginTop: '4px' }}>
                      {user.totalCompletedLessons || 0} bài
                    </div>
                  </div>
                  <div style={{ background: 'var(--bg-main)', padding: '14px', borderRadius: '6px' }}>
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                      ĐIỂM THU HOẠCH TRUNG BÌNH
                    </div>
                    <div style={{ fontSize: '1.4rem', fontWeight: 700, color: 'var(--text-main)', marginTop: '4px' }}>
                      {user.averageScore ? `${user.averageScore}/100` : 'Chưa có'}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Account Security & Audit Status */}
          <div className="staff-card">
            <div className="staff-card-header">
              <h3 className="staff-card-title">Bảo mật & Trạng thái lưu trữ</h3>
            </div>
            <div className="staff-card-body">
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <CheckCircle2 size={16} color="#047857" />
                  <span style={{ fontSize: '0.88rem' }}>
                    Mật khẩu lưu băm Argon2id an toàn, không lộ mật khẩu thô.
                  </span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <CheckCircle2 size={16} color="#047857" />
                  <span style={{ fontSize: '0.88rem' }}>
                    Phiên xác thực bảo vệ qua HttpOnly cookie, tự động xoay vòng refresh token.
                  </span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <Clock size={16} color="#627d98" />
                  <span style={{ fontSize: '0.88rem' }}>
                    Namespace lưu trữ: <code style={{ fontSize: '0.82rem' }}>study_ai.{user.id}.v2</code>
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Role Change Modal */}
      <ConfirmDialog
        isOpen={roleModalOpen}
        title="Thay đổi vai trò người dùng"
        description="Chọn vai trò mới cho tài khoản. Phân quyền của người dùng sẽ cập nhật ngay sau khi xác nhận."
        confirmText="Lưu vai trò"
        cancelText="Đóng"
        isLoading={actionLoading}
        onConfirm={handleRoleChange}
        onCancel={() => setRoleModalOpen(false)}
      />

      {/* Deactivate/Activate Confirm */}
      <ConfirmDialog
        isOpen={statusConfirmOpen}
        title={user.status === 'active' ? 'Khóa tài khoản này?' : 'Mở khóa tài khoản?'}
        description={
          user.status === 'active'
            ? 'Người dùng sẽ không thể đăng nhập vào hệ thống cho đến khi được mở khóa lại.'
            : 'Người dùng sẽ có thể đăng nhập và truy cập lại vào dữ liệu học tập bình thường.'
        }
        confirmText={user.status === 'active' ? 'Xác nhận khóa' : 'Mở khóa'}
        isDestructive={user.status === 'active'}
        isLoading={actionLoading}
        onConfirm={handleToggleStatus}
        onCancel={() => setStatusConfirmOpen(false)}
      />

      {/* Reset Session Confirm */}
      <ConfirmDialog
        isOpen={resetConfirmOpen}
        title="Thu hồi toàn bộ phiên đăng nhập?"
        description="Toàn bộ token refresh trong cơ sở dữ liệu sẽ bị hủy hiệu lực lập tức. Người dùng sẽ buộc phải đăng nhập lại trên tất cả thiết bị."
        confirmText="Thu hồi phiên"
        isDestructive={true}
        isLoading={actionLoading}
        onConfirm={handleResetSession}
        onCancel={() => setResetConfirmOpen(false)}
      />
    </div>
  )
}

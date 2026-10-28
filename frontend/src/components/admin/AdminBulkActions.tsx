import React, { useState } from 'react'
import { CheckCircle2, ShieldAlert, UserCheck, Trash2, Shield, X } from 'lucide-react'
import type { AccountStatus } from '@/types/admin'
import type { UserRole } from '@/auth/auth.types'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import './AdminComponents.css'

export interface AdminBulkActionsProps {
  selectedCount: number
  onClearSelection: () => void
  onBulkStatusChange: (status: AccountStatus) => Promise<void>
  onBulkRoleChange: (role: UserRole) => Promise<void>
  onBulkDelete: () => Promise<void>
}

export const AdminBulkActions: React.FC<AdminBulkActionsProps> = ({
  selectedCount,
  onClearSelection,
  onBulkStatusChange,
  onBulkRoleChange,
  onBulkDelete,
}) => {
  const [confirmDialog, setConfirmDialog] = useState<{
    isOpen: boolean
    title: string
    description: string
    action: () => Promise<void>
    isDestructive?: boolean
  }>({
    isOpen: false,
    title: '',
    description: '',
    action: async () => {},
  })
  const [isLoading, setIsLoading] = useState(false)
  const [showRoleMenu, setShowRoleMenu] = useState(false)

  if (selectedCount === 0) return null

  const handleExecute = async () => {
    setIsLoading(true)
    try {
      await confirmDialog.action()
      setConfirmDialog((prev) => ({ ...prev, isOpen: false }))
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <>
      <div className="admin-bulk-toolbar" role="region" aria-label="Thanh thao tác hàng loạt">
        <div className="admin-bulk-info">
          <CheckCircle2 size={16} className="admin-bulk-check-icon" aria-hidden="true" />
          <span>
            Đã chọn <strong>{selectedCount}</strong> tài khoản
          </span>
        </div>

        <div className="admin-bulk-actions-buttons">
          {/* Activate */}
          <button
            type="button"
            className="admin-bulk-btn activate"
            onClick={() =>
              setConfirmDialog({
                isOpen: true,
                title: `Kích hoạt ${selectedCount} tài khoản?`,
                description: 'Các tài khoản được chọn sẽ chuyển sang trạng thái "Đang hoạt động" và có thể đăng nhập bình thường.',
                action: async () => onBulkStatusChange('active'),
              })
            }
          >
            <UserCheck size={14} aria-hidden="true" />
            <span>Kích hoạt</span>
          </button>

          {/* Suspend */}
          <button
            type="button"
            className="admin-bulk-btn suspend"
            onClick={() =>
              setConfirmDialog({
                isOpen: true,
                title: `Khóa ${selectedCount} tài khoản?`,
                description: 'Các tài khoản được chọn sẽ bị tạm ngưng và không thể truy cập vào bài học cho tới khi mở lại.',
                action: async () => onBulkStatusChange('suspended'),
                isDestructive: true,
              })
            }
          >
            <ShieldAlert size={14} aria-hidden="true" />
            <span>Khóa</span>
          </button>

          {/* Change Role Dropdown */}
          <div className="admin-bulk-dropdown-wrap">
            <button
              type="button"
              className="admin-bulk-btn role"
              onClick={() => setShowRoleMenu((prev) => !prev)}
              aria-haspopup="true"
              aria-expanded={showRoleMenu}
            >
              <Shield size={14} aria-hidden="true" />
              <span>Gán vai trò...</span>
            </button>

            {showRoleMenu && (
              <div className="admin-bulk-role-menu" role="menu">
                <button
                  type="button"
                  role="menuitem"
                  onClick={() => {
                    setShowRoleMenu(false)
                    setConfirmDialog({
                      isOpen: true,
                      title: `Đổi vai trò sang Học viên cho ${selectedCount} tài khoản?`,
                      description: 'Phân quyền học viên sẽ được áp dụng cho tất cả tài khoản đã chọn.',
                      action: async () => onBulkRoleChange('learner'),
                    })
                  }}
                >
                  Học viên (Learner)
                </button>
                <button
                  type="button"
                  role="menuitem"
                  onClick={() => {
                    setShowRoleMenu(false)
                    setConfirmDialog({
                      isOpen: true,
                      title: `Đổi vai trò sang Giáo viên cho ${selectedCount} tài khoản?`,
                      description: 'Phân quyền giáo viên sẽ được áp dụng cho tất cả tài khoản đã chọn.',
                      action: async () => onBulkRoleChange('teacher'),
                    })
                  }}
                >
                  Giáo viên (Teacher)
                </button>
                <button
                  type="button"
                  role="menuitem"
                  onClick={() => {
                    setShowRoleMenu(false)
                    setConfirmDialog({
                      isOpen: true,
                      title: `Đổi vai trò sang Nội dung cho ${selectedCount} tài khoản?`,
                      description: 'Phân quyền biên soạn nội dung sẽ được áp dụng.',
                      action: async () => onBulkRoleChange('content'),
                    })
                  }}
                >
                  Nội dung (Content)
                </button>
                <button
                  type="button"
                  role="menuitem"
                  onClick={() => {
                    setShowRoleMenu(false)
                    setConfirmDialog({
                      isOpen: true,
                      title: `Đổi vai trò sang Hỗ trợ cho ${selectedCount} tài khoản?`,
                      description: 'Phân quyền giải quyết ticket hỗ trợ sẽ được áp dụng.',
                      action: async () => onBulkRoleChange('support'),
                    })
                  }}
                >
                  Hỗ trợ (Support)
                </button>
              </div>
            )}
          </div>

          {/* Delete */}
          <button
            type="button"
            className="admin-bulk-btn delete"
            onClick={() =>
              setConfirmDialog({
                isOpen: true,
                title: `Xóa ${selectedCount} tài khoản demo?`,
                description: 'Các tài khoản demo này sẽ được xóa khỏi danh sách và bộ nhớ localStorage.',
                action: async () => onBulkDelete(),
                isDestructive: true,
              })
            }
          >
            <Trash2 size={14} aria-hidden="true" />
            <span>Xóa</span>
          </button>

          {/* Clear */}
          <button
            type="button"
            className="admin-bulk-btn clear"
            onClick={onClearSelection}
            aria-label="Bỏ chọn tất cả"
          >
            <X size={14} aria-hidden="true" />
            <span>Bỏ chọn</span>
          </button>
        </div>
      </div>

      <ConfirmDialog
        isOpen={confirmDialog.isOpen}
        title={confirmDialog.title}
        description={confirmDialog.description}
        confirmText="Xác nhận thực hiện"
        cancelText="Đóng"
        isDestructive={confirmDialog.isDestructive}
        isLoading={isLoading}
        onConfirm={handleExecute}
        onCancel={() => setConfirmDialog((prev) => ({ ...prev, isOpen: false }))}
      />
    </>
  )
}

import React, { useCallback, useEffect, useRef, useState } from 'react'
import { X, Edit3, AlertCircle } from 'lucide-react'
import type { AccountStatus, AdminUserItem, UpdateUserInput } from '@/types/admin'
import type { UserRole } from '@/auth/auth.types'
import { Button } from '@/components/ui/Button'
import './AdminComponents.css'

export interface AdminUserEditDialogProps {
  user: AdminUserItem | null
  isOpen: boolean
  onClose: () => void
  onSubmit: (userId: string, input: UpdateUserInput) => Promise<void>
}

export const AdminUserEditDialog: React.FC<AdminUserEditDialogProps> = ({
  user,
  isOpen,
  onClose,
  onSubmit,
}) => {
  const dialogRef = useRef<HTMLDivElement>(null)
  const [displayName, setDisplayName] = useState(user?.displayName || '')
  const [role, setRole] = useState<UserRole>(user?.role || 'learner')
  const [status, setStatus] = useState<AccountStatus>(user?.status || 'active')
  const [grade, setGrade] = useState(user?.grade || user?.className || '')
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleClose = useCallback(() => {
    setErrorMsg(null)
    onClose()
  }, [onClose])

  useEffect(() => {
    if (!isOpen) return
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !isSubmitting) {
        handleClose()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, isSubmitting, handleClose])

  if (!isOpen || !user) return null

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setErrorMsg(null)

    if (!displayName.trim()) {
      setErrorMsg('Vui lòng nhập họ và tên hiển thị.')
      return
    }

    setIsSubmitting(true)
    try {
      await onSubmit(user.id, {
        displayName: displayName.trim(),
        role,
        status,
        grade: role === 'learner' ? grade.trim() : undefined,
      })
      onClose()
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : 'Lỗi khi cập nhật tài khoản.')
      setIsSubmitting(false)
    }
  }

  return (
    <div className="confirm-dialog-backdrop admin-form-backdrop" onClick={handleClose}>
      <div
        className="confirm-dialog-modal admin-form-dialog"
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="admin-edit-dialog-title"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="confirm-dialog-header">
          <div className="confirm-dialog-title-wrap">
            <span className="admin-form-icon-wrap" aria-hidden="true">
              <Edit3 size={18} />
            </span>
            <h3 id="admin-edit-dialog-title" className="confirm-dialog-title">
              Chỉnh sửa thông tin người dùng
            </h3>
          </div>
          <button
            type="button"
            className="confirm-dialog-close-btn"
            onClick={handleClose}
            disabled={isSubmitting}
            aria-label="Đóng hộp thoại"
          >
            <X size={16} />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="confirm-dialog-body admin-form-body">
            {errorMsg && (
              <div className="admin-form-error-banner" role="alert">
                <AlertCircle size={15} />
                <span>{errorMsg}</span>
              </div>
            )}

            <div className="admin-form-group">
              <label className="admin-form-label">Email tài khoản</label>
              <input
                type="text"
                className="admin-form-input"
                value={user.email}
                disabled
                style={{ opacity: 0.7, backgroundColor: 'var(--paper-light, #f1f5f9)' }}
              />
            </div>

            <div className="admin-form-group">
              <label htmlFor="edit-user-display-name" className="admin-form-label">
                Họ và tên hiển thị <span className="required-star">*</span>
              </label>
              <input
                id="edit-user-display-name"
                type="text"
                className="admin-form-input"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                required
                autoFocus
              />
            </div>

            <div className="admin-form-row">
              <div className="admin-form-group" style={{ flex: 1 }}>
                <label htmlFor="edit-user-role-select" className="admin-form-label">
                  Vai trò hệ thống
                </label>
                <select
                  id="edit-user-role-select"
                  className="admin-form-select"
                  value={role}
                  onChange={(e) => setRole(e.target.value as UserRole)}
                >
                  <option value="learner">Học viên (Learner)</option>
                  <option value="teacher">Giáo viên (Teacher)</option>
                  <option value="content">Biên soạn nội dung (Content)</option>
                  <option value="support">Nhân viên hỗ trợ (Support)</option>
                  <option value="admin">Quản trị viên (Admin)</option>
                </select>
              </div>

              <div className="admin-form-group" style={{ flex: 1 }}>
                <label htmlFor="edit-user-status-select" className="admin-form-label">
                  Trạng thái tài khoản
                </label>
                <select
                  id="edit-user-status-select"
                  className="admin-form-select"
                  value={status}
                  onChange={(e) => setStatus(e.target.value as AccountStatus)}
                >
                  <option value="active">Đang hoạt động (Active)</option>
                  <option value="suspended">Tạm khóa (Suspended)</option>
                  <option value="disabled">Vô hiệu hóa (Disabled)</option>
                </select>
              </div>
            </div>

            {role === 'learner' && (
              <div className="admin-form-group">
                <label htmlFor="edit-user-grade" className="admin-form-label">
                  Khối / Lớp học
                </label>
                <input
                  id="edit-user-grade"
                  type="text"
                  className="admin-form-input"
                  placeholder="Ví dụ: Khối 12, 12A1"
                  value={grade}
                  onChange={(e) => setGrade(e.target.value)}
                />
              </div>
            )}
          </div>

          <div className="confirm-dialog-footer">
            <Button
              type="button"
              variant="ghost"
              onClick={handleClose}
              disabled={isSubmitting}
            >
              Hủy bỏ
            </Button>
            <Button
              type="submit"
              variant="primary"
              isLoading={isSubmitting}
            >
              Lưu thay đổi
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}

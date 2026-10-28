import React, { useCallback, useEffect, useRef, useState } from 'react'
import { X, UserPlus, AlertCircle } from 'lucide-react'
import type { AccountStatus, CreateDemoUserInput } from '@/types/admin'
import type { UserRole } from '@/auth/auth.types'
import { Button } from '@/components/ui/Button'
import './AdminComponents.css'

export interface AdminUserFormDialogProps {
  isOpen: boolean
  onClose: () => void
  onSubmit: (input: CreateDemoUserInput) => Promise<void>
}

export const AdminUserFormDialog: React.FC<AdminUserFormDialogProps> = ({
  isOpen,
  onClose,
  onSubmit,
}) => {
  const dialogRef = useRef<HTMLDivElement>(null)
  const [displayName, setDisplayName] = useState('')
  const [email, setEmail] = useState('')
  const [role, setRole] = useState<UserRole>('learner')
  const [status, setStatus] = useState<AccountStatus>('active')
  const [className, setClassName] = useState('12A1')
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const resetForm = useCallback(() => {
    setDisplayName('')
    setEmail('')
    setRole('learner')
    setStatus('active')
    setClassName('12A1')
    setErrorMsg(null)
    setIsSubmitting(false)
  }, [])

  const handleClose = useCallback(() => {
    resetForm()
    onClose()
  }, [resetForm, onClose])

  // ESC key listener
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

  if (!isOpen) return null

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setErrorMsg(null)

    if (!displayName.trim()) {
      setErrorMsg('Vui lòng nhập họ và tên hiển thị.')
      return
    }

    if (!email.trim() || !email.includes('@')) {
      setErrorMsg('Vui lòng nhập địa chỉ email hợp lệ.')
      return
    }

    setIsSubmitting(true)
    try {
      await onSubmit({
        displayName: displayName.trim(),
        email: email.trim(),
        role,
        status,
        className: role === 'learner' ? className.trim() : undefined,
      })
      resetForm()
      onClose()
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : 'Lỗi khi tạo tài khoản demo.')
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
        aria-labelledby="admin-form-dialog-title"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="confirm-dialog-header">
          <div className="confirm-dialog-title-wrap">
            <span className="admin-form-icon-wrap" aria-hidden="true">
              <UserPlus size={18} />
            </span>
            <h3 id="admin-form-dialog-title" className="confirm-dialog-title">
              Thêm người dùng mới (Demo)
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
              <label htmlFor="user-display-name" className="admin-form-label">
                Họ và tên hiển thị <span className="required-star">*</span>
              </label>
              <input
                id="user-display-name"
                type="text"
                className="admin-form-input"
                placeholder="Ví dụ: Hoàng Minh Đức"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                required
                autoFocus
              />
            </div>

            <div className="admin-form-group">
              <label htmlFor="user-email" className="admin-form-label">
                Địa chỉ Email <span className="required-star">*</span>
              </label>
              <input
                id="user-email"
                type="email"
                className="admin-form-input"
                placeholder="duc.hoang@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>

            <div className="admin-form-row">
              <div className="admin-form-group" style={{ flex: 1 }}>
                <label htmlFor="user-role-select" className="admin-form-label">
                  Vai trò hệ thống
                </label>
                <select
                  id="user-role-select"
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
                <label htmlFor="user-status-select" className="admin-form-label">
                  Trạng thái tài khoản
                </label>
                <select
                  id="user-status-select"
                  className="admin-form-select"
                  value={status}
                  onChange={(e) => setStatus(e.target.value as AccountStatus)}
                >
                  <option value="active">Đang hoạt động (Active)</option>
                  <option value="pending">Chờ phê duyệt (Pending)</option>
                  <option value="suspended">Tạm khóa (Suspended)</option>
                </select>
              </div>
            </div>

            {role === 'learner' && (
              <div className="admin-form-group">
                <label htmlFor="user-class-name" className="admin-form-label">
                  Lớp học
                </label>
                <input
                  id="user-class-name"
                  type="text"
                  className="admin-form-input"
                  placeholder="Ví dụ: 12A1, 12A2, Chuyên Toán"
                  value={className}
                  onChange={(e) => setClassName(e.target.value)}
                />
              </div>
            )}

            <div className="admin-form-note">
              <span>Ghi chú: Tài khoản sẽ được lưu vào bộ nhớ trình duyệt (localStorage) để trải nghiệm demo không bị mất khi tải lại trang.</span>
            </div>
          </div>

          <div className="confirm-dialog-footer">
            <Button
              type="button"
              variant="ghost"
              onClick={onClose}
              disabled={isSubmitting}
            >
              Hủy bỏ
            </Button>
            <Button
              type="submit"
              variant="primary"
              isLoading={isSubmitting}
            >
              Tạo tài khoản demo
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}

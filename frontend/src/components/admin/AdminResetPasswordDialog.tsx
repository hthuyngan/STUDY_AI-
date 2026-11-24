import React, { useCallback, useEffect, useRef, useState } from 'react'
import { X, KeyRound, AlertCircle } from 'lucide-react'
import type { AdminUserItem, ResetPasswordResult } from '@/types/admin'
import { Button } from '@/components/ui/Button'
import './AdminComponents.css'

export interface AdminResetPasswordDialogProps {
  user: AdminUserItem | null
  isOpen: boolean
  onClose: () => void
  onReset: (userId: string, newPassword: string) => Promise<ResetPasswordResult>
}

export const AdminResetPasswordDialog: React.FC<AdminResetPasswordDialogProps> = ({
  user,
  isOpen,
  onClose,
  onReset,
}) => {
  const dialogRef = useRef<HTMLDivElement>(null)
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [result, setResult] = useState<ResetPasswordResult | null>(null)

  const handleClose = useCallback(() => {
    setNewPassword('')
    setConfirmPassword('')
    setErrorMsg(null)
    setResult(null)
    setIsSubmitting(false)
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

    if (!newPassword || newPassword.trim().length < 8) {
      setErrorMsg('Mật khẩu mới phải chứa ít nhất 8 ký tự.')
      return
    }

    if (newPassword.length > 128) {
      setErrorMsg('Mật khẩu mới không được vượt quá 128 ký tự.')
      return
    }

    if (newPassword !== confirmPassword) {
      setErrorMsg('Mật khẩu xác nhận không khớp.')
      return
    }

    setIsSubmitting(true)
    try {
      const res = await onReset(user.id, newPassword.trim())
      setResult(res)
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : 'Lỗi khi đặt lại mật khẩu.')
    } finally {
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
        aria-labelledby="admin-reset-dialog-title"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="confirm-dialog-header">
          <div className="confirm-dialog-title-wrap">
            <span className="admin-form-icon-wrap" aria-hidden="true" style={{ backgroundColor: '#fef3c7', color: '#b45309' }}>
              <KeyRound size={18} />
            </span>
            <h3 id="admin-reset-dialog-title" className="confirm-dialog-title">
              Đặt lại mật khẩu người dùng
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

        {result ? (
          <div className="confirm-dialog-body admin-form-body">
            <div style={{ padding: '16px', backgroundColor: '#f0fdf4', borderRadius: '8px', border: '1px solid #bbf7d0', marginBottom: '16px' }}>
              <div style={{ fontWeight: 600, color: '#166534', marginBottom: '8px' }}>
                ✓ Mật khẩu đã được đặt lại thành công!
              </div>
              <div style={{ fontSize: '0.88rem', color: '#15803d', marginBottom: '12px' }}>
                Tất cả phiên đăng nhập trước đây của tài khoản <strong>{user.email}</strong> đã bị thu hồi ngay lập tức để bảo vệ an toàn.
              </div>
              <div style={{ fontSize: '0.85rem', color: '#166534' }}>
                Người dùng có thể đăng nhập bằng mật khẩu mới vừa thiết lập.
              </div>
            </div>
            <div className="confirm-dialog-footer" style={{ padding: 0 }}>
              <Button type="button" variant="primary" onClick={handleClose}>
                Hoàn tất
              </Button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit}>
            <div className="confirm-dialog-body admin-form-body">
              {errorMsg && (
                <div className="admin-form-error-banner" role="alert">
                  <AlertCircle size={15} />
                  <span>{errorMsg}</span>
                </div>
              )}

              <p style={{ fontSize: '0.9rem', color: 'var(--text-main)', marginBottom: '12px' }}>
                Bạn đang thực hiện đặt lại mật khẩu cho tài khoản: <strong>{user.displayName}</strong> ({user.email}).
              </p>

              <div className="admin-form-group">
                <label htmlFor="reset-new-password" className="admin-form-label">
                  Mật khẩu mới <span className="required-star">*</span>
                </label>
                <input
                  id="reset-new-password"
                  type="password"
                  className="admin-form-input"
                  placeholder="Nhập ít nhất 8 ký tự"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  required
                  autoFocus
                />
              </div>

              <div className="admin-form-group">
                <label htmlFor="reset-confirm-password" className="admin-form-label">
                  Xác nhận mật khẩu mới <span className="required-star">*</span>
                </label>
                <input
                  id="reset-confirm-password"
                  type="password"
                  className="admin-form-input"
                  placeholder="Nhập lại mật khẩu mới"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                />
              </div>

              <div className="admin-form-note" style={{ backgroundColor: '#fffbeb', borderLeft: '3px solid #f59e0b', padding: '10px 12px' }}>
                <span style={{ color: '#92400e', fontSize: '0.84rem' }}>
                  Lưu ý: Ngay sau khi đặt lại mật khẩu, toàn bộ token refresh và phiên hoạt động hiện tại của người dùng này trong hệ thống sẽ bị thu hồi.
                </span>
              </div>
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
                Đặt lại mật khẩu
              </Button>
            </div>
          </form>
        )}
      </div>
    </div>
  )
}

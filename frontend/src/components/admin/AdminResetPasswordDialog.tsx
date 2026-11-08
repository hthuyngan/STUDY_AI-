import React, { useCallback, useEffect, useRef, useState } from 'react'
import { X, KeyRound, AlertCircle, Copy, Check } from 'lucide-react'
import type { AdminUserItem, ResetPasswordResult } from '@/types/admin'
import { Button } from '@/components/ui/Button'
import './AdminComponents.css'

export interface AdminResetPasswordDialogProps {
  user: AdminUserItem | null
  isOpen: boolean
  onClose: () => void
  onReset: (userId: string, newPassword?: string) => Promise<ResetPasswordResult>
}

export const AdminResetPasswordDialog: React.FC<AdminResetPasswordDialogProps> = ({
  user,
  isOpen,
  onClose,
  onReset,
}) => {
  const dialogRef = useRef<HTMLDivElement>(null)
  const [newPassword, setNewPassword] = useState('')
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [result, setResult] = useState<ResetPasswordResult | null>(null)
  const [copied, setCopied] = useState(false)

  const handleClose = useCallback(() => {
    setNewPassword('')
    setErrorMsg(null)
    setResult(null)
    setCopied(false)
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

    if (newPassword && newPassword.trim().length < 8) {
      setErrorMsg('Mật khẩu mới nếu nhập phải có ít nhất 8 ký tự.')
      return
    }

    setIsSubmitting(true)
    try {
      const res = await onReset(user.id, newPassword.trim() || undefined)
      setResult(res)
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : 'Lỗi khi đặt lại mật khẩu.')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleCopy = () => {
    if (result?.temporaryPassword) {
      void navigator.clipboard.writeText(result.temporaryPassword)
      setCopied(true)
      setTimeout(() => setCopied(false), 2500)
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
              {result.temporaryPassword && (
                <div>
                  <div style={{ fontSize: '0.82rem', fontWeight: 600, color: '#14532d', marginBottom: '4px' }}>
                    Mật khẩu tạm thời mới:
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', backgroundColor: '#ffffff', padding: '8px 12px', borderRadius: '6px', border: '1px solid #86efac' }}>
                    <code style={{ fontSize: '1rem', fontWeight: 700, letterSpacing: '0.05em', color: '#102a43', flex: 1 }}>
                      {result.temporaryPassword}
                    </code>
                    <button
                      type="button"
                      onClick={handleCopy}
                      className="admin-page-btn"
                      style={{ padding: '4px 8px', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '4px' }}
                      title="Sao chép mật khẩu"
                    >
                      {copied ? <Check size={14} color="#16a34a" /> : <Copy size={14} />}
                      <span>{copied ? 'Đã sao chép' : 'Sao chép'}</span>
                    </button>
                  </div>
                  <div style={{ fontSize: '0.8rem', color: '#64748b', marginTop: '6px' }}>
                    Vui lòng cung cấp mật khẩu này cho người dùng và yêu cầu họ đổi mật khẩu sau khi đăng nhập.
                  </div>
                </div>
              )}
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
                  Mật khẩu mới <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>(Tùy chọn)</span>
                </label>
                <input
                  id="reset-new-password"
                  type="password"
                  className="admin-form-input"
                  placeholder="Để trống để tự động tạo mật khẩu an toàn ngẫu nhiên"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  autoFocus
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

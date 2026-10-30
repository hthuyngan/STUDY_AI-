import React, { useEffect, useRef } from 'react'
import { AlertTriangle, X } from 'lucide-react'
import { Button } from './Button'
import './ConfirmDialog.css'

export interface ConfirmDialogProps {
  isOpen: boolean
  title: string
  description?: string
  message?: string
  confirmText?: string
  cancelText?: string
  isDestructive?: boolean
  variant?: 'danger' | 'warning' | 'primary' | string
  isLoading?: boolean
  onConfirm: () => void | Promise<void>
  onCancel: () => void
}

export const ConfirmDialog: React.FC<ConfirmDialogProps> = ({
  isOpen,
  title,
  description,
  message,
  confirmText = 'Xác nhận',
  cancelText = 'Hủy bỏ',
  isDestructive = false,
  variant,
  isLoading = false,
  onConfirm,
  onCancel,
}) => {
  const dialogRef = useRef<HTMLDivElement>(null)
  const effectiveDescription = description || message || ''
  const effectiveDestructive = isDestructive || variant === 'danger'

  // ESC key listener
  useEffect(() => {
    if (!isOpen) return

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !isLoading) {
        onCancel()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, isLoading, onCancel])

  if (!isOpen) return null

  return (
    <div className="confirm-dialog-backdrop" onClick={onCancel} role="presentation">
      <div
        className="confirm-dialog-modal"
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="confirm-dialog-title"
        aria-describedby="confirm-dialog-desc"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="confirm-dialog-header">
          <div className="confirm-dialog-title-wrap">
            {effectiveDestructive && (
              <span className="confirm-dialog-warning-icon" aria-hidden="true">
                <AlertTriangle size={18} />
              </span>
            )}
            <h3 id="confirm-dialog-title" className="confirm-dialog-title">
              {title}
            </h3>
          </div>
          <button
            type="button"
            className="confirm-dialog-close-btn"
            onClick={onCancel}
            disabled={isLoading}
            aria-label="Đóng hộp thoại"
          >
            <X size={16} />
          </button>
        </div>

        <div className="confirm-dialog-body">
          <p id="confirm-dialog-desc" className="confirm-dialog-desc">
            {effectiveDescription}
          </p>
        </div>

        <div className="confirm-dialog-footer">
          <Button
            variant="ghost"
            onClick={onCancel}
            disabled={isLoading}
          >
            {cancelText}
          </Button>
          <Button
            variant="primary"
            onClick={onConfirm}
            isLoading={isLoading}
            style={
              effectiveDestructive
                ? { backgroundColor: '#dc2626', borderColor: '#dc2626' }
                : undefined
            }
          >
            {confirmText}
          </Button>
        </div>
      </div>
    </div>
  )
}

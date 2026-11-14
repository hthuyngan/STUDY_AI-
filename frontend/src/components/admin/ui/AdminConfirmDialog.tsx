import React from 'react'
import { AlertTriangle, AlertCircle } from 'lucide-react'
import { AdminModal } from './AdminModal'
import { AdminButton } from './AdminButton'
import './AdminDesignSystem.css'

export interface AdminConfirmDialogProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: () => void
  title: string
  message: React.ReactNode
  confirmText?: string
  cancelText?: string
  variant?: 'danger' | 'warning' | 'primary'
  isLoading?: boolean
}

export const AdminConfirmDialog: React.FC<AdminConfirmDialogProps> = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmText = 'Xác nhận',
  cancelText = 'Hủy bỏ',
  variant = 'danger',
  isLoading = false,
}) => {
  return (
    <AdminModal
      isOpen={isOpen}
      onClose={onClose}
      title={title}
      maxWidth="460px"
      footer={
        <>
          <AdminButton variant="secondary" onClick={onClose} disabled={isLoading}>
            {cancelText}
          </AdminButton>
          <AdminButton
            variant={variant === 'danger' ? 'danger' : 'primary'}
            onClick={onConfirm}
            isLoading={isLoading}
          >
            {confirmText}
          </AdminButton>
        </>
      }
    >
      <div style={{ display: 'flex', gap: '16px', alignItems: 'flex-start' }}>
        <div
          style={{
            width: '40px',
            height: '40px',
            borderRadius: 'var(--admin-radius-full)',
            background:
              variant === 'danger'
                ? 'var(--admin-danger-light)'
                : variant === 'warning'
                ? 'var(--admin-warning-light)'
                : 'var(--admin-primary-light)',
            color:
              variant === 'danger'
                ? 'var(--admin-danger)'
                : variant === 'warning'
                ? 'var(--admin-warning)'
                : 'var(--admin-primary)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
          }}
        >
          {variant === 'danger' ? (
            <AlertCircle size={22} />
          ) : (
            <AlertTriangle size={22} />
          )}
        </div>
        <div style={{ fontSize: '14px', color: 'var(--admin-text-main)', lineHeight: 1.5 }}>
          {message}
        </div>
      </div>
    </AdminModal>
  )
}

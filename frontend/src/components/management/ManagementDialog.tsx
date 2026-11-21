import React, { useEffect } from 'react'
import { X } from 'lucide-react'
import './ManagementLayout.css'

export interface ManagementDialogProps {
  isOpen: boolean
  onClose: () => void
  title: string
  maxWidth?: number | string
  children: React.ReactNode
  footer?: React.ReactNode
  className?: string
}

export const ManagementDialog: React.FC<ManagementDialogProps> = ({
  isOpen,
  onClose,
  title,
  maxWidth = 480,
  children,
  footer,
  className = '',
}) => {
  // Listen for Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, onClose])

  // Prevent background scroll
  useEffect(() => {
    if (isOpen) {
      const prev = document.body.style.overflow
      document.body.style.overflow = 'hidden'
      return () => {
        document.body.style.overflow = prev
      }
    }
  }, [isOpen])

  if (!isOpen) return null

  return (
    <div
      className="mgmt-dialog-backdrop"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label={title}
    >
      <div
        className={`mgmt-dialog ${className}`.trim()}
        style={{ maxWidth }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mgmt-dialog-header">
          <h2 className="mgmt-dialog-title">{title}</h2>
          <button
            type="button"
            onClick={onClose}
            className="mgmt-btn mgmt-btn-secondary"
            style={{ width: '28px', height: '28px', padding: 0 }}
            aria-label="Đóng hộp thoại"
          >
            <X size={15} />
          </button>
        </div>

        <div className="mgmt-dialog-body">{children}</div>

        {footer && <div className="mgmt-dialog-footer">{footer}</div>}
      </div>
    </div>
  )
}

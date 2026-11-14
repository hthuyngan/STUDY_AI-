import React, { useEffect } from 'react'
import { X } from 'lucide-react'
import './AdminDesignSystem.css'

export interface AdminModalProps {
  isOpen: boolean
  onClose: () => void
  title: string
  children: React.ReactNode
  footer?: React.ReactNode
  maxWidth?: string | number
  className?: string
}

export const AdminModal: React.FC<AdminModalProps> = ({
  isOpen,
  onClose,
  title,
  children,
  footer,
  maxWidth = '560px',
  className = '',
}) => {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose()
      }
    }
    if (isOpen) {
      document.body.style.overflow = 'hidden'
      window.addEventListener('keydown', handleKeyDown)
    }
    return () => {
      document.body.style.overflow = ''
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [isOpen, onClose])

  if (!isOpen) return null

  return (
    <div
      className="admin-modal-backdrop"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="admin-modal-title"
    >
      <div className={`admin-modal ${className}`} style={{ maxWidth }}>
        <div className="admin-modal-header">
          <h3 id="admin-modal-title" className="admin-modal-title">
            {title}
          </h3>
          <button
            onClick={onClose}
            className="admin-btn admin-btn-ghost"
            style={{ width: '32px', height: '32px', padding: 0 }}
            aria-label="Đóng"
          >
            <X size={18} />
          </button>
        </div>
        <div className="admin-modal-body">{children}</div>
        {footer && <div className="admin-modal-footer">{footer}</div>}
      </div>
    </div>
  )
}

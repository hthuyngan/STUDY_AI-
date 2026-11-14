import React, { useEffect } from 'react'
import { X } from 'lucide-react'
import './ManagementLayout.css'

export interface ManagementDrawerProps {
  isOpen: boolean
  onClose: () => void
  title: string
  subtitle?: string
  width?: string | number
  children: React.ReactNode
  footer?: React.ReactNode
  className?: string
}

export const ManagementDrawer: React.FC<ManagementDrawerProps> = ({
  isOpen,
  onClose,
  title,
  subtitle,
  width = 540,
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
    <>
      <div
        className="mgmt-drawer-backdrop"
        onClick={onClose}
        aria-hidden="true"
      />
      <aside
        className={`mgmt-drawer ${className}`.trim()}
        style={{ maxWidth: width }}
        role="dialog"
        aria-modal="true"
        aria-label={title}
      >
        <div className="mgmt-drawer-header">
          <div>
            <h2 className="mgmt-drawer-title">{title}</h2>
            {subtitle && (
              <p style={{ margin: '2px 0 0 0', fontSize: '12px', color: 'var(--mgmt-text-muted)' }}>
                {subtitle}
              </p>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="mgmt-btn mgmt-btn-secondary"
            style={{ width: '30px', height: '30px', padding: 0 }}
            aria-label="Đóng bảng chi tiết"
          >
            <X size={16} />
          </button>
        </div>

        <div className="mgmt-drawer-body">{children}</div>

        {footer && <div className="mgmt-drawer-footer">{footer}</div>}
      </aside>
    </>
  )
}


import React, { useEffect, useRef } from 'react'
import { X } from 'lucide-react'
import './AdminDesignSystem.css'

export interface AdminDetailDrawerProps {
  open: boolean
  onClose: () => void
  title: string
  subtitle?: string
  width?: 'md' | 'lg'
  footer?: React.ReactNode
  children: React.ReactNode
}

export const AdminDetailDrawer: React.FC<AdminDetailDrawerProps> = ({
  open,
  onClose,
  title,
  subtitle,
  width = 'md',
  footer,
  children,
}) => {
  const drawerRef = useRef<HTMLElement>(null)
  const previousFocusRef = useRef<HTMLElement | null>(null)

  useEffect(() => {
    if (!open) return

    previousFocusRef.current = document.activeElement as HTMLElement | null
    const drawerEl = drawerRef.current
    if (drawerEl) {
      const focusable = drawerEl.querySelectorAll<HTMLElement>(
        'button:not(:disabled), [href], input:not(:disabled), select:not(:disabled), textarea:not(:disabled), [tabindex]:not([tabindex="-1"])'
      )
      if (focusable.length > 0) {
        focusable[0].focus()
      } else {
        drawerEl.focus()
      }
    }

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose()
        return
      }
      if (e.key === 'Tab' && drawerRef.current) {
        const focusable = Array.from(
          drawerRef.current.querySelectorAll<HTMLElement>(
            'button:not(:disabled), [href], input:not(:disabled), select:not(:disabled), textarea:not(:disabled), [tabindex]:not([tabindex="-1"])'
          )
        )
        if (focusable.length === 0) return
        const first = focusable[0]
        const last = focusable[focusable.length - 1]
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault()
          last.focus()
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault()
          first.focus()
        }
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => {
      window.removeEventListener('keydown', handleKeyDown)
      previousFocusRef.current?.focus?.()
    }
  }, [open, onClose])

  if (!open) return null

  return (
    <div
      className="admin-drawer-backdrop"
      role="presentation"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      <aside
        ref={drawerRef}
        tabIndex={-1}
        className={`admin-drawer admin-drawer-${width}`}
        role="dialog"
        aria-modal="true"
        aria-label={title}
      >
        <div className="admin-drawer-header">
          <div>
            <h2 className="admin-drawer-title">{title}</h2>
            {subtitle && <p className="admin-drawer-subtitle">{subtitle}</p>}
          </div>
          <button
            type="button"
            className="admin-icon-btn admin-icon-btn-ghost admin-icon-btn-sm"
            onClick={onClose}
            aria-label="Đóng chi tiết"
            title="Đóng (Esc)"
          >
            <X size={18} />
          </button>
        </div>
        <div className="admin-drawer-body">{children}</div>
        {footer && <div className="admin-drawer-footer">{footer}</div>}
      </aside>
    </div>
  )
}

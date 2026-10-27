import React, { useEffect, useRef, useState } from 'react'
import { Cloud, Laptop, Loader2 } from 'lucide-react'
import { useAuth } from '@/auth/useAuth'
import './MigrationDialog.css'

export const MigrationDialog: React.FC = () => {
  const { migrationPending, confirmMigration, declineMigration } = useAuth()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const dialogRef = useRef<HTMLDivElement>(null)
  const primaryButtonRef = useRef<HTMLButtonElement>(null)

  // Focus trap and keyboard handling
  useEffect(() => {
    if (!migrationPending) return

    primaryButtonRef.current?.focus()

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !isSubmitting) {
        declineMigration()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [migrationPending, declineMigration, isSubmitting])

  if (!migrationPending) return null

  const handleConfirm = async () => {
    setIsSubmitting(true)
    try {
      await confirmMigration()
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div
      className="migration-dialog-backdrop"
      role="presentation"
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="migration-dialog-title"
        aria-describedby="migration-dialog-desc"
        className="migration-dialog-card"
      >
        <div className="migration-dialog-header">
          <div className="migration-dialog-icon-wrapper" aria-hidden="true">
            <Laptop className="migration-dialog-icon laptop" size={24} />
            <Cloud className="migration-dialog-icon cloud" size={24} />
          </div>
          <h2 id="migration-dialog-title" className="migration-dialog-title">
            Bạn có tiến độ học tập trên thiết bị này
          </h2>
          <p id="migration-dialog-desc" className="migration-dialog-question">
            Bạn có muốn chuyển tiến độ này vào tài khoản vừa đăng nhập không?
          </p>
        </div>

        <div className="migration-dialog-explanation">
          <p>
            Đồng bộ sẽ hợp nhất tiến độ bài học, bài tập thu hoạch và lịch sử
            học trên thiết bị này với tài khoản của bạn.
          </p>
        </div>

        <div className="migration-dialog-actions">
          <button
            ref={primaryButtonRef}
            type="button"
            className="migration-btn migration-btn-primary"
            onClick={handleConfirm}
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <>
                <Loader2 className="btn-spinner" size={16} />
                <span>Đang đồng bộ...</span>
              </>
            ) : (
              <span>Đồng bộ vào tài khoản</span>
            )}
          </button>

          <button
            type="button"
            className="migration-btn migration-btn-secondary"
            onClick={declineMigration}
            disabled={isSubmitting}
          >
            Giữ riêng trên thiết bị
          </button>
        </div>
      </div>
    </div>
  )
}

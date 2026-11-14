import React from 'react'
import { AlertCircle, RotateCcw } from 'lucide-react'
import './ManagementLayout.css'

export interface ManagementErrorStateProps {
  title?: string
  message?: string
  onRetry?: () => void
  className?: string
}

export const ManagementErrorState: React.FC<ManagementErrorStateProps> = ({
  title = 'Đã có lỗi xảy ra',
  message = 'Không thể tải dữ liệu từ máy chủ. Vui lòng thử lại.',
  onRetry,
  className = '',
}) => {
  return (
    <div className={`mgmt-error-state ${className}`.trim()} role="alert">
      <div className="mgmt-error-icon" aria-hidden="true">
        <AlertCircle size={22} />
      </div>
      <h3 className="mgmt-error-title">{title}</h3>
      <p className="mgmt-error-desc">{message}</p>
      {onRetry && (
        <button
          type="button"
          onClick={onRetry}
          className="mgmt-btn mgmt-btn-secondary"
          style={{ marginTop: '8px' }}
        >
          <RotateCcw size={14} aria-hidden="true" />
          <span>Thử lại</span>
        </button>
      )}
    </div>
  )
}


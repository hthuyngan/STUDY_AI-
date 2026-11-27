import React from 'react'
import { AlertCircle, RefreshCw } from 'lucide-react'
import { AdminButton } from './AdminButton'
import './AdminDesignSystem.css'

export interface AdminErrorStateProps {
  title?: string
  description?: string
  onRetry?: () => void
  retryLabel?: string
  className?: string
}

export const AdminErrorState: React.FC<AdminErrorStateProps> = ({
  title = 'Không thể tải dữ liệu',
  description = 'Đã xảy ra lỗi kết nối hoặc máy chủ không phản hồi. Vui lòng thử lại.',
  onRetry,
  retryLabel = 'Thử lại',
  className = '',
}) => {
  return (
    <div className={`admin-error-state ${className}`} role="alert">
      <div className="admin-error-icon">
        <AlertCircle size={24} />
      </div>
      <h4 className="admin-error-title">{title}</h4>
      <p className="admin-error-desc">{description}</p>
      {onRetry && (
        <AdminButton variant="secondary" size="sm" icon={<RefreshCw size={14} />} onClick={onRetry}>
          {retryLabel}
        </AdminButton>
      )}
    </div>
  )
}

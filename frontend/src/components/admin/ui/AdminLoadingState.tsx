import React from 'react'
import { Loader2 } from 'lucide-react'
import './AdminDesignSystem.css'

export interface AdminLoadingStateProps {
  label?: string
  className?: string
}

export const AdminLoadingState: React.FC<AdminLoadingStateProps> = ({
  label = 'Đang tải dữ liệu...',
  className = '',
}) => {
  return (
    <div className={`admin-loading-state ${className}`} role="status" aria-live="polite">
      <Loader2 size={20} className="animate-spin" />
      <span>{label}</span>
    </div>
  )
}

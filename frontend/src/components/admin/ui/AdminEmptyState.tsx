import React from 'react'
import { Inbox } from 'lucide-react'
import './AdminDesignSystem.css'

export interface AdminEmptyStateProps {
  icon?: React.ReactNode
  title?: string
  description?: string
  action?: React.ReactNode
  className?: string
}

export const AdminEmptyState: React.FC<AdminEmptyStateProps> = ({
  icon,
  title = 'Không có dữ liệu',
  description = 'Hiện chưa có mục nào trong danh sách hoặc không tìm thấy kết quả phù hợp.',
  action,
  className = '',
}) => {
  return (
    <div className={`admin-empty-state ${className}`}>
      <div className="admin-empty-icon">{icon || <Inbox size={28} />}</div>
      <h4 className="admin-empty-title">{title}</h4>
      <p className="admin-empty-desc">{description}</p>
      {action && <div>{action}</div>}
    </div>
  )
}


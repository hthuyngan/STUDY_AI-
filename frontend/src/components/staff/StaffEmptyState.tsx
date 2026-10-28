import React from 'react'
import { FolderOpen } from 'lucide-react'
import './staff-shared.css'

export interface StaffEmptyStateProps {
  title: string
  description?: string
  icon?: React.ReactNode
  action?: React.ReactNode
}

export const StaffEmptyState: React.FC<StaffEmptyStateProps> = ({
  title,
  description,
  icon,
  action,
}) => {
  return (
    <div className="staff-empty-state-root">
      <div className="staff-empty-icon-wrap" aria-hidden="true">
        {icon || <FolderOpen size={24} />}
      </div>
      <h4 className="staff-empty-title">{title}</h4>
      {description && <p className="staff-empty-desc">{description}</p>}
      {action && <div>{action}</div>}
    </div>
  )
}

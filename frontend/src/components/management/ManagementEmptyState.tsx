import React from 'react'
import { FolderOpen } from 'lucide-react'
import './ManagementLayout.css'

export interface ManagementEmptyStateProps {
  icon?: React.ReactNode
  title: string
  description?: string
  actionLabel?: string
  onAction?: () => void
  className?: string
}

export const ManagementEmptyState: React.FC<ManagementEmptyStateProps> = ({
  icon,
  title,
  description,
  actionLabel,
  onAction,
  className = '',
}) => {
  return (
    <div className={`mgmt-empty-state ${className}`.trim()}>
      <div className="mgmt-empty-icon" aria-hidden="true">
        {icon || <FolderOpen size={20} />}
      </div>
      <h3 className="mgmt-empty-title">{title}</h3>
      {description && <p className="mgmt-empty-desc">{description}</p>}
      {actionLabel && onAction && (
        <button
          type="button"
          onClick={onAction}
          className="mgmt-btn mgmt-btn-primary"
          style={{ marginTop: '6px' }}
        >
          {actionLabel}
        </button>
      )}
    </div>
  )
}

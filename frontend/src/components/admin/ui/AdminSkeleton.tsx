import React from 'react'
import './AdminDesignSystem.css'

export interface AdminSkeletonProps {
  width?: string | number
  height?: string | number
  borderRadius?: string | number
  className?: string
  style?: React.CSSProperties
}

export const AdminSkeleton: React.FC<AdminSkeletonProps> = ({
  width = '100%',
  height = '20px',
  borderRadius = 'var(--admin-radius-sm)',
  className = '',
  style,
}) => {
  return (
    <div
      className={`admin-skeleton ${className}`}
      style={{
        width,
        height,
        borderRadius,
        ...style,
      }}
    />
  )
}

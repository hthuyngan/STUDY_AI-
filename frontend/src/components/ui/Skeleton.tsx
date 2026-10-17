import type { HTMLAttributes } from 'react'

export interface SkeletonProps extends HTMLAttributes<HTMLDivElement> {
  width?: string | number
  height?: string | number
  rounded?: 'sm' | 'md' | 'lg' | 'xl' | 'full'
  className?: string
}

export function Skeleton({
  width,
  height,
  rounded = 'md',
  className = '',
  style,
  ...props
}: SkeletonProps) {
  const radiusMap = {
    sm: 'var(--radius-sm)',
    md: 'var(--radius-md)',
    lg: 'var(--radius-lg)',
    xl: 'var(--radius-xl)',
    full: 'var(--radius-full)',
  }

  const customStyle = {
    width: typeof width === 'number' ? `${width}px` : width,
    height: typeof height === 'number' ? `${height}px` : height,
    borderRadius: radiusMap[rounded],
    ...style,
  }

  return (
    <div
      className={`skeleton ${className}`.trim()}
      style={customStyle}
      aria-hidden="true"
      {...props}
    />
  )
}

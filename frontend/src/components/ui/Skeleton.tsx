import type { HTMLAttributes } from 'react'

export interface SkeletonProps extends HTMLAttributes<HTMLDivElement> {
  width?: string | number
  height?: string | number
  variant?: 'text' | 'rect' | 'circle'
  rounded?: 'sm' | 'md' | 'lg' | 'xl' | 'full'
  className?: string
}

export function Skeleton({
  width,
  height,
  variant,
  rounded = 'md',
  className = '',
  style,
  ...props
}: SkeletonProps) {
  const effectiveRounded =
    variant === 'circle'
      ? 'full'
      : variant === 'text'
        ? 'sm'
        : variant === 'rect'
          ? 'lg'
          : rounded

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
    borderRadius: radiusMap[effectiveRounded],
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

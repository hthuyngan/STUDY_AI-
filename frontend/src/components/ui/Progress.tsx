export interface ProgressProps {
  value: number // 0 to 100
  max?: number
  height?: number
  size?: 'sm' | 'md' | 'lg' | string
  color?: string
  backgroundColor?: string
  className?: string
  showLabel?: boolean
  labelPrefix?: string
}

export function Progress({
  value,
  max = 100,
  height,
  size,
  color,
  backgroundColor,
  className = '',
  showLabel = false,
  labelPrefix = '',
}: ProgressProps) {
  const computedHeight = height ?? (size === 'sm' ? 6 : size === 'lg' ? 12 : 8)
  const percentage = Math.min(Math.max(Math.round((value / max) * 100), 0), 100)

  return (
    <div className={`progress-container ${className}`.trim()}>
      <div
        className="progress-track"
        style={{
          height: `${computedHeight}px`,
          backgroundColor: backgroundColor || 'var(--surface-sunken)',
        }}
        role="progressbar"
        aria-valuenow={percentage}
        aria-valuemin={0}
        aria-valuemax={100}
      >
        <div
          className="progress-fill"
          style={{
            width: `${percentage}%`,
            backgroundColor: color || 'var(--color-primary)',
          }}
        />
      </div>
      {showLabel && (
        <span className="progress-label">
          {labelPrefix}{percentage}%
        </span>
      )}
    </div>
  )
}

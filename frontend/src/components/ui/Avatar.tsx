export interface AvatarProps {
  src?: string
  alt: string
  fallback?: string
  size?: 'sm' | 'md' | 'lg' | 'xl'
  className?: string
}

export function Avatar({
  src,
  alt,
  fallback,
  size = 'md',
  className = '',
}: AvatarProps) {
  const sizeMap = {
    sm: 32,
    md: 40,
    lg: 48,
    xl: 64,
  }

  const dim = sizeMap[size]
  const initials = fallback || alt.slice(0, 2).toUpperCase()

  return (
    <div
      className={`avatar avatar-${size} ${className}`.trim()}
      style={{ width: `${dim}px`, height: `${dim}px` }}
      aria-label={alt}
    >
      {src ? (
        <img
          src={src}
          alt={alt}
          className="avatar-img"
          loading="lazy"
          onError={(e) => {
            // fallback to initials on error
            ;(e.currentTarget as HTMLElement).style.display = 'none'
          }}
        />
      ) : null}
      <span className="avatar-fallback" aria-hidden>{initials}</span>
    </div>
  )
}

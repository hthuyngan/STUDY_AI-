import { useState } from 'react'
import { STICKERS, type StickerName } from '@/assets/stickers'
import './StickerIllustration.css'

export type StickerSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl' | number

export interface StickerIllustrationProps {
  name: StickerName
  size?: StickerSize
  decorative?: boolean
  alt?: string
  className?: string
}

const SIZE_MAP: Record<'xs' | 'sm' | 'md' | 'lg' | 'xl', number> = {
  xs: 36,
  sm: 52,
  md: 68,
  lg: 96,
  xl: 148,
}

// Built-in graceful vector artwork fallback so the UI looks complete immediately
function StickerVectorFallback({ name, size }: { name: StickerName; size: number }) {
  switch (name) {
    case 'welcome':
      return (
        <svg
          width={size}
          height={size}
          viewBox="0 0 160 160"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="sticker-svg-artwork"
          aria-hidden="true"
        >
          {/* Soft paper base */}
          <circle cx="80" cy="80" r="70" fill="var(--color-primary-light, #EFF6FF)" />
          {/* Graduation Cap & Mascot */}
          <path
            d="M80 36L132 60L80 84L28 60L80 36Z"
            fill="var(--navy-primary, #102A43)"
          />
          <path
            d="M48 70V96C48 114 62 126 80 126C98 126 112 114 112 96V70"
            stroke="var(--navy-primary, #102A43)"
            strokeWidth="8"
            strokeLinecap="round"
          />
          {/* Tassel */}
          <path
            d="M132 60V100"
            stroke="var(--warm-accent, #F4B942)"
            strokeWidth="5"
            strokeLinecap="round"
          />
          <circle cx="132" cy="103" r="6" fill="var(--warm-accent, #F4B942)" />
          {/* Sparkle */}
          <path
            d="M120 32L124 20L128 32L140 36L128 40L124 52L120 40L108 36L120 32Z"
            fill="var(--warm-accent, #F4B942)"
          />
        </svg>
      )
    case 'calendar':
      return (
        <svg
          width={size}
          height={size}
          viewBox="0 0 80 80"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="sticker-svg-artwork"
          aria-hidden="true"
        >
          <rect x="12" y="18" width="56" height="50" rx="10" fill="var(--surface-card, #FFFFFF)" stroke="var(--navy-primary, #102A43)" strokeWidth="4" />
          <path d="M12 32H68" stroke="var(--navy-primary, #102A43)" strokeWidth="3" />
          <path d="M26 12V22M54 12V22" stroke="var(--warm-accent, #F4B942)" strokeWidth="5" strokeLinecap="round" />
          <rect x="22" y="40" width="8" height="8" rx="2" fill="var(--navy-primary, #102A43)" />
          <rect x="36" y="40" width="8" height="8" rx="2" fill="var(--navy-primary, #102A43)" />
          <rect x="50" y="40" width="8" height="8" rx="2" fill="var(--warm-accent, #F4B942)" />
          <rect x="22" y="52" width="8" height="8" rx="2" fill="var(--navy-primary, #102A43)" />
          <rect x="36" y="52" width="8" height="8" rx="2" fill="var(--navy-primary, #102A43)" />
        </svg>
      )
    case 'streak':
      return (
        <svg
          width={size}
          height={size}
          viewBox="0 0 80 80"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="sticker-svg-artwork"
          aria-hidden="true"
        >
          <path
            d="M40 10C40 10 54 26 54 44C54 58 44 68 32 68C20 68 12 56 18 40C12 46 16 60 28 66C44 74 66 60 62 38C59 22 40 10 40 10Z"
            fill="var(--warm-accent, #F4B942)"
          />
          <path
            d="M38 32C38 32 46 42 46 52C46 60 40 66 32 66C24 66 22 58 26 50C22 54 24 62 32 64C40 66 48 58 46 46C44 38 38 32 38 32Z"
            fill="#EF4444"
          />
        </svg>
      )
    case 'progress':
      return (
        <svg
          width={size}
          height={size}
          viewBox="0 0 80 80"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="sticker-svg-artwork"
          aria-hidden="true"
        >
          <circle cx="40" cy="40" r="30" stroke="var(--border-default, #E2E8F0)" strokeWidth="6" />
          <path
            d="M40 10C56.5685 10 70 23.4315 70 40C70 48.2843 66.6421 55.7843 61.2132 61.2132"
            stroke="var(--navy-primary, #102A43)"
            strokeWidth="6"
            strokeLinecap="round"
          />
          <path
            d="M30 40L37 47L52 32"
            stroke="var(--warm-accent, #F4B942)"
            strokeWidth="5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      )
    case 'aiTutor':
      return (
        <svg
          width={size}
          height={size}
          viewBox="0 0 100 100"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="sticker-svg-artwork"
          aria-hidden="true"
        >
          {/* Friendly AI Bot Head */}
          <rect x="22" y="26" width="56" height="48" rx="14" fill="var(--surface-card, #FFFFFF)" stroke="var(--navy-primary, #102A43)" strokeWidth="4" />
          <path d="M50 14V26" stroke="var(--navy-primary, #102A43)" strokeWidth="4" strokeLinecap="round" />
          <circle cx="50" cy="12" r="5" fill="var(--warm-accent, #F4B942)" />
          {/* Friendly Eyes */}
          <circle cx="38" cy="48" r="5" fill="var(--navy-primary, #102A43)" />
          <circle cx="62" cy="48" r="5" fill="var(--navy-primary, #102A43)" />
          {/* Smile */}
          <path d="M42 58C46 62 54 62 58 58" stroke="var(--warm-accent, #F4B942)" strokeWidth="4" strokeLinecap="round" />
          {/* Ear antennas */}
          <rect x="14" y="44" width="8" height="12" rx="3" fill="var(--warm-accent, #F4B942)" />
          <rect x="78" y="44" width="8" height="12" rx="3" fill="var(--warm-accent, #F4B942)" />
        </svg>
      )
    case 'achievement':
      return (
        <svg
          width={size}
          height={size}
          viewBox="0 0 80 80"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="sticker-svg-artwork"
          aria-hidden="true"
        >
          <path
            d="M26 16H54V36C54 44 48 50 40 50C32 50 26 44 26 36V16Z"
            fill="var(--warm-accent, #F4B942)"
            stroke="var(--navy-primary, #102A43)"
            strokeWidth="4"
          />
          <path
            d="M26 22H16C16 32 22 36 26 36M54 22H64C64 32 58 36 54 36"
            stroke="var(--navy-primary, #102A43)"
            strokeWidth="4"
            strokeLinecap="round"
          />
          <path d="M40 50V62M30 62H50" stroke="var(--navy-primary, #102A43)" strokeWidth="4" strokeLinecap="round" />
        </svg>
      )
    case 'study':
    case 'book':
      return (
        <svg
          width={size}
          height={size}
          viewBox="0 0 80 80"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="sticker-svg-artwork"
          aria-hidden="true"
        >
          <path
            d="M16 26C24 22 36 22 40 26C44 22 56 22 64 26V58C56 54 44 54 40 58C36 54 24 54 16 58V26Z"
            fill="var(--surface-card, #FFFFFF)"
            stroke="var(--navy-primary, #102A43)"
            strokeWidth="4"
          />
          <path d="M40 26V58" stroke="var(--navy-primary, #102A43)" strokeWidth="3" />
          <path d="M48 34H58M48 42H58M22 34H32M22 42H32" stroke="var(--warm-accent, #F4B942)" strokeWidth="3" strokeLinecap="round" />
        </svg>
      )
    case 'review':
    case 'goal':
    default:
      return (
        <svg
          width={size}
          height={size}
          viewBox="0 0 80 80"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="sticker-svg-artwork"
          aria-hidden="true"
        >
          <circle cx="40" cy="40" r="30" fill="var(--color-primary-light, #EFF6FF)" stroke="var(--navy-primary, #102A43)" strokeWidth="4" />
          <path
            d="M28 40L36 48L54 30"
            stroke="var(--warm-accent, #F4B942)"
            strokeWidth="5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      )
  }
}

export function StickerIllustration({
  name,
  size = 'md',
  decorative = true,
  alt = '',
  className = '',
}: StickerIllustrationProps) {
  const [imgError, setImgError] = useState(false)
  const pixelSize = typeof size === 'number' ? size : SIZE_MAP[size] || 64
  const assetPath = STICKERS[name]

  return (
    <div
      className={`sticker-illustration-root ${className}`.trim()}
      style={{
        width: `${pixelSize}px`,
        height: `${pixelSize}px`,
        minWidth: `${pixelSize}px`,
        minHeight: `${pixelSize}px`,
      }}
      aria-hidden={decorative ? 'true' : undefined}
      role={decorative ? undefined : 'img'}
      aria-label={decorative ? undefined : alt || `${name} illustration`}
    >
      {!imgError && assetPath ? (
        <img
          src={assetPath}
          alt={decorative ? '' : alt}
          className="sticker-image"
          onError={() => setImgError(true)}
          style={{ width: `${pixelSize}px`, height: `${pixelSize}px` }}
        />
      ) : (
        <StickerVectorFallback name={name} size={pixelSize} />
      )}
    </div>
  )
}

export default StickerIllustration

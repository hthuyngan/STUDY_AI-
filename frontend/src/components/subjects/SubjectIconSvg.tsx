import React from 'react'

export type SubjectIconType =
  | 'math'
  | 'physics'
  | 'chemistry'
  | 'biology'
  | 'literature'
  | 'english'
  | 'history'
  | 'geography'
  | 'informatics'
  | 'civics'

export interface SubjectIconOption {
  id: SubjectIconType
  label: string
  color: string
  bgColor: string
}

export const SUBJECT_ICON_OPTIONS: SubjectIconOption[] = [
  { id: 'math', label: 'Toán học', color: '#4f46e5', bgColor: '#eef2ff' },
  { id: 'physics', label: 'Vật lý', color: '#7c3aed', bgColor: '#f5f3ff' },
  { id: 'chemistry', label: 'Hóa học', color: '#0891b2', bgColor: '#ecfeff' },
  { id: 'biology', label: 'Sinh học', color: '#059669', bgColor: '#ecfdf5' },
  { id: 'literature', label: 'Ngữ văn', color: '#d97706', bgColor: '#fffbeb' },
  { id: 'english', label: 'Tiếng Anh', color: '#2563eb', bgColor: '#eff6ff' },
  { id: 'history', label: 'Lịch sử', color: '#dc2626', bgColor: '#fef2f2' },
  { id: 'geography', label: 'Địa lý', color: '#0d9488', bgColor: '#f0fdfa' },
  { id: 'informatics', label: 'Tin học', color: '#0284c7', bgColor: '#f0f9ff' },
  { id: 'civics', label: 'GDCD & Pháp luật', color: '#9333ea', bgColor: '#faf5ff' },
]

export function resolveSubjectIcon(
  code?: string,
  name?: string,
  explicitIcon?: string,
  description?: string
): SubjectIconType {
  // 1. Check metadata tag in description: [icon:chemistry]
  if (description) {
    const match = description.match(/\[icon:([a-z0-9_-]+)\]/i)
    if (match) {
      const tag = match[1].toLowerCase() as SubjectIconType
      if (SUBJECT_ICON_OPTIONS.some((opt) => opt.id === tag)) {
        return tag
      }
    }
  }

  // 2. Check explicit icon prop
  if (explicitIcon) {
    const lower = explicitIcon.toLowerCase().trim()
    const found = SUBJECT_ICON_OPTIONS.find((opt) => opt.id === lower)
    if (found) return found.id
    if (lower.includes('math') || lower.includes('toan')) return 'math'
    if (lower.includes('phys') || lower.includes('ly')) return 'physics'
    if (lower.includes('chem') || lower.includes('hoa')) return 'chemistry'
    if (lower.includes('bio') || lower.includes('sinh')) return 'biology'
    if (lower.includes('lit') || lower.includes('van')) return 'literature'
    if (lower.includes('eng') || lower.includes('anh')) return 'english'
    if (lower.includes('hist') || lower.includes('su')) return 'history'
    if (lower.includes('geo') || lower.includes('dia')) return 'geography'
    if (lower.includes('info') || lower.includes('tin')) return 'informatics'
    if (lower.includes('civ') || lower.includes('gdcd')) return 'civics'
  }

  // 3. Check code
  const c = (code || '').toUpperCase()
  if (c.includes('MATH') || c.includes('TOAN')) return 'math'
  if (c.includes('PHYS') || c.includes('VATLY') || c.includes('VLY')) return 'physics'
  if (c.includes('CHEM') || c.includes('HOA')) return 'chemistry'
  if (c.includes('BIO') || c.includes('SINH')) return 'biology'
  if (c.includes('LIT') || c.includes('VAN')) return 'literature'
  if (c.includes('ENG') || c.includes('ANH')) return 'english'
  if (c.includes('HIST') || c.includes('SU')) return 'history'
  if (c.includes('GEO') || c.includes('DIA')) return 'geography'
  if (c.includes('INFO') || c.includes('TIN')) return 'informatics'
  if (c.includes('CIV') || c.includes('GDCD') || c.includes('PL')) return 'civics'

  // 4. Check name
  const n = (name || '').toLowerCase()
  if (n.includes('toán')) return 'math'
  if (n.includes('vật lý') || n.includes('vật lí') || n.includes('lý')) return 'physics'
  if (n.includes('hóa')) return 'chemistry'
  if (n.includes('sinh')) return 'biology'
  if (n.includes('văn')) return 'literature'
  if (n.includes('tiếng anh') || n.includes('anh')) return 'english'
  if (n.includes('sử')) return 'history'
  if (n.includes('địa')) return 'geography'
  if (n.includes('tin')) return 'informatics'
  if (n.includes('gdcd') || n.includes('kinh tế') || n.includes('pháp luật')) return 'civics'

  return 'math'
}

export function extractDescriptionText(rawDesc?: string): string {
  if (!rawDesc) return ''
  return rawDesc.replace(/\[icon:[a-z0-9_-]+\]/gi, '').trim()
}

export function packDescriptionWithIcon(text: string, iconId: SubjectIconType): string {
  const clean = extractDescriptionText(text)
  return clean ? `${clean} [icon:${iconId}]` : `[icon:${iconId}]`
}

interface SubjectIconSvgProps {
  type: SubjectIconType | string
  size?: number
  className?: string
}

export const SubjectIconSvg: React.FC<SubjectIconSvgProps> = ({
  type,
  size = 48,
  className = '',
}) => {
  const normalized = (type || 'math').toLowerCase()

  switch (normalized) {
    case 'physics':
      return (
        <svg
          width={size}
          height={size}
          viewBox="0 0 64 64"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className={className}
          aria-hidden="true"
        >
          <defs>
            <linearGradient id="physGrad" x1="8" y1="8" x2="56" y2="56" gradientUnits="userSpaceOnUse">
              <stop stopColor="#8b5cf6" />
              <stop offset="1" stopColor="#6d28d9" />
            </linearGradient>
            <linearGradient id="physRing" x1="12" y1="12" x2="52" y2="52" gradientUnits="userSpaceOnUse">
              <stop stopColor="#c4b5fd" />
              <stop offset="1" stopColor="#8b5cf6" />
            </linearGradient>
          </defs>
          <rect width="64" height="64" rx="16" fill="#f5f3ff" />
          <ellipse cx="32" cy="32" rx="22" ry="8" transform="rotate(-30 32 32)" stroke="url(#physRing)" strokeWidth="2.5" strokeDasharray="3 3" />
          <ellipse cx="32" cy="32" rx="22" ry="8" transform="rotate(30 32 32)" stroke="url(#physRing)" strokeWidth="2.5" />
          <ellipse cx="32" cy="32" rx="22" ry="8" transform="rotate(90 32 32)" stroke="url(#physRing)" strokeWidth="2.5" />
          <circle cx="32" cy="32" r="7" fill="url(#physGrad)" />
          <circle cx="30" cy="30" r="2" fill="#ffffff" opacity="0.8" />
          <circle cx="48" cy="23" r="3" fill="#7c3aed" />
          <circle cx="16" cy="41" r="3" fill="#7c3aed" />
        </svg>
      )

    case 'chemistry':
      return (
        <svg
          width={size}
          height={size}
          viewBox="0 0 64 64"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className={className}
          aria-hidden="true"
        >
          <defs>
            <linearGradient id="chemGrad" x1="16" y1="20" x2="48" y2="56" gradientUnits="userSpaceOnUse">
              <stop stopColor="#06b6d4" />
              <stop offset="1" stopColor="#0e7490" />
            </linearGradient>
            <linearGradient id="chemLiquid" x1="20" y1="36" x2="44" y2="50" gradientUnits="userSpaceOnUse">
              <stop stopColor="#22d3ee" />
              <stop offset="1" stopColor="#0891b2" />
            </linearGradient>
          </defs>
          <rect width="64" height="64" rx="16" fill="#ecfeff" />
          <path
            d="M28 14H36M30 14V24L18 46C16.5 49 18.5 52 22 52H42C45.5 52 47.5 49 46 46L34 24V14"
            stroke="#0e7490"
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path
            d="M21 44L24 38C26 36 29 36 32 38C35 40 38 40 40 38L43 44C44 46 43 50 40 50H24C21 50 20 46 21 44Z"
            fill="url(#chemLiquid)"
          />
          <circle cx="28" cy="44" r="2" fill="#ffffff" opacity="0.8" />
          <circle cx="36" cy="42" r="1.5" fill="#ffffff" opacity="0.8" />
          <circle cx="32" cy="46" r="1" fill="#ffffff" opacity="0.8" />
        </svg>
      )

    case 'biology':
      return (
        <svg
          width={size}
          height={size}
          viewBox="0 0 64 64"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className={className}
          aria-hidden="true"
        >
          <defs>
            <linearGradient id="bioGrad" x1="16" y1="16" x2="48" y2="48" gradientUnits="userSpaceOnUse">
              <stop stopColor="#10b981" />
              <stop offset="1" stopColor="#047857" />
            </linearGradient>
          </defs>
          <rect width="64" height="64" rx="16" fill="#ecfdf5" />
          <path
            d="M20 18C26 22 38 22 44 18M20 28C26 32 38 32 44 28M20 38C26 42 38 42 44 38M20 48C26 52 38 52 44 48"
            stroke="#059669"
            strokeWidth="2.5"
            strokeLinecap="round"
          />
          <path
            d="M22 14C22 28 42 36 42 50M42 14C42 28 22 36 22 50"
            stroke="url(#bioGrad)"
            strokeWidth="3.5"
            strokeLinecap="round"
          />
          <circle cx="22" cy="18" r="3" fill="#10b981" />
          <circle cx="42" cy="18" r="3" fill="#10b981" />
          <circle cx="22" cy="48" r="3" fill="#047857" />
          <circle cx="42" cy="48" r="3" fill="#047857" />
        </svg>
      )

    case 'literature':
      return (
        <svg
          width={size}
          height={size}
          viewBox="0 0 64 64"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className={className}
          aria-hidden="true"
        >
          <defs>
            <linearGradient id="litGrad" x1="16" y1="16" x2="48" y2="48" gradientUnits="userSpaceOnUse">
              <stop stopColor="#f59e0b" />
              <stop offset="1" stopColor="#b45309" />
            </linearGradient>
          </defs>
          <rect width="64" height="64" rx="16" fill="#fffbeb" />
          <path
            d="M16 22C21 20 27 21 32 24C37 21 43 20 48 22V48C43 46 37 47 32 50C27 47 21 46 16 48V22Z"
            fill="#fef3c7"
            stroke="url(#litGrad)"
            strokeWidth="3"
            strokeLinejoin="round"
          />
          <path d="M32 24V50" stroke="#b45309" strokeWidth="2.5" strokeLinecap="round" />
          <path d="M20 28H28M20 34H26M36 28H44M38 34H44" stroke="#d97706" strokeWidth="2" strokeLinecap="round" />
          <path d="M42 14L48 20L44 24L38 18L42 14Z" fill="#d97706" />
        </svg>
      )

    case 'english':
      return (
        <svg
          width={size}
          height={size}
          viewBox="0 0 64 64"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className={className}
          aria-hidden="true"
        >
          <defs>
            <linearGradient id="engGrad" x1="14" y1="14" x2="50" y2="50" gradientUnits="userSpaceOnUse">
              <stop stopColor="#3b82f6" />
              <stop offset="1" stopColor="#1d4ed8" />
            </linearGradient>
          </defs>
          <rect width="64" height="64" rx="16" fill="#eff6ff" />
          <circle cx="32" cy="32" r="18" stroke="url(#engGrad)" strokeWidth="3" fill="#dbeafe" />
          <ellipse cx="32" cy="32" rx="9" ry="18" stroke="#2563eb" strokeWidth="2" />
          <path d="M14 32H50" stroke="#2563eb" strokeWidth="2" />
          <rect x="34" y="16" width="16" height="12" rx="3" fill="#1d4ed8" />
          <text x="38" y="25" fill="#ffffff" fontSize="9" fontWeight="bold" fontFamily="sans-serif">EN</text>
        </svg>
      )

    case 'history':
      return (
        <svg
          width={size}
          height={size}
          viewBox="0 0 64 64"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className={className}
          aria-hidden="true"
        >
          <defs>
            <linearGradient id="histGrad" x1="16" y1="16" x2="48" y2="48" gradientUnits="userSpaceOnUse">
              <stop stopColor="#ef4444" />
              <stop offset="1" stopColor="#b91c1c" />
            </linearGradient>
          </defs>
          <rect width="64" height="64" rx="16" fill="#fef2f2" />
          <path d="M16 26L32 16L48 26H16Z" fill="#fecaca" stroke="url(#histGrad)" strokeWidth="2.5" strokeLinejoin="round" />
          <path d="M14 50H50M18 46H46" stroke="#b91c1c" strokeWidth="3" strokeLinecap="round" />
          <path d="M22 26V46M32 26V46M42 26V46" stroke="url(#histGrad)" strokeWidth="3" strokeLinecap="round" />
        </svg>
      )

    case 'geography':
      return (
        <svg
          width={size}
          height={size}
          viewBox="0 0 64 64"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className={className}
          aria-hidden="true"
        >
          <defs>
            <linearGradient id="geoGrad" x1="16" y1="16" x2="48" y2="48" gradientUnits="userSpaceOnUse">
              <stop stopColor="#14b8a6" />
              <stop offset="1" stopColor="#0f766e" />
            </linearGradient>
          </defs>
          <rect width="64" height="64" rx="16" fill="#f0fdfa" />
          <circle cx="32" cy="32" r="18" stroke="url(#geoGrad)" strokeWidth="3" fill="#ccfbf1" />
          <path d="M24 26C27 24 31 25 33 28C35 31 32 35 29 36C26 37 25 41 28 44" stroke="#0f766e" strokeWidth="2.5" strokeLinecap="round" />
          <path d="M38 22C42 24 44 28 41 31C39 33 42 37 45 38" stroke="#0f766e" strokeWidth="2.5" strokeLinecap="round" />
          <path d="M32 10V14M32 50V54M10 32H14M50 32H54" stroke="#0d9488" strokeWidth="2.5" strokeLinecap="round" />
        </svg>
      )

    case 'informatics':
      return (
        <svg
          width={size}
          height={size}
          viewBox="0 0 64 64"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className={className}
          aria-hidden="true"
        >
          <defs>
            <linearGradient id="infoGrad" x1="16" y1="16" x2="48" y2="48" gradientUnits="userSpaceOnUse">
              <stop stopColor="#0284c7" />
              <stop offset="1" stopColor="#0369a1" />
            </linearGradient>
          </defs>
          <rect width="64" height="64" rx="16" fill="#f0f9ff" />
          <rect x="18" y="18" width="28" height="20" rx="3" stroke="url(#infoGrad)" strokeWidth="3" fill="#e0f2fe" />
          <path d="M14 44H50C51 44 52 45 52 46C52 47 51 48 50 48H14C13 48 12 47 12 46C12 45 13 44 14 44Z" fill="#0284c7" />
          <path d="M25 25L22 28L25 31M39 25L42 28L39 31M34 23L30 33" stroke="#0369a1" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      )

    case 'civics':
      return (
        <svg
          width={size}
          height={size}
          viewBox="0 0 64 64"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className={className}
          aria-hidden="true"
        >
          <defs>
            <linearGradient id="civGrad" x1="16" y1="16" x2="48" y2="48" gradientUnits="userSpaceOnUse">
              <stop stopColor="#9333ea" />
              <stop offset="1" stopColor="#6b21a8" />
            </linearGradient>
          </defs>
          <rect width="64" height="64" rx="16" fill="#faf5ff" />
          <path d="M32 16V46M32 16L18 24M32 16L46 24" stroke="url(#civGrad)" strokeWidth="3" strokeLinecap="round" />
          <path d="M18 24L14 34H22L18 24ZM46 24L42 34H50L46 24Z" stroke="#7e22ce" strokeWidth="2.5" fill="#f3e8ff" strokeLinejoin="round" />
          <path d="M24 48H40" stroke="#6b21a8" strokeWidth="3.5" strokeLinecap="round" />
        </svg>
      )

    case 'math':
    default:
      return (
        <svg
          width={size}
          height={size}
          viewBox="0 0 64 64"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className={className}
          aria-hidden="true"
        >
          <defs>
            <linearGradient id="mathGrad" x1="14" y1="14" x2="50" y2="50" gradientUnits="userSpaceOnUse">
              <stop stopColor="#4f46e5" />
              <stop offset="1" stopColor="#3730a3" />
            </linearGradient>
          </defs>
          <rect width="64" height="64" rx="16" fill="#eef2ff" />
          <path
            d="M18 36L22 46L28 18H46M32 30H44M32 36H44M38 24V42"
            stroke="url(#mathGrad)"
            strokeWidth="3.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <circle cx="44" cy="44" r="3" fill="#4f46e5" />
        </svg>
      )
  }
}

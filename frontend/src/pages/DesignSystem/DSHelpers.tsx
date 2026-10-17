import type { ReactNode } from 'react'

interface SectionProps {
  title: string
  description?: string
  children: ReactNode
}

export function DSSection({ title, description, children }: SectionProps) {
  return (
    <section style={{ marginBottom: '3rem' }}>
      <div style={{ marginBottom: '1.5rem', paddingBottom: '0.75rem', borderBottom: '1px solid var(--border-default)' }}>
        <h2 style={{ fontSize: 'var(--text-xl)', fontWeight: 'var(--font-bold)', color: 'var(--text-primary)', marginBottom: description ? '0.25rem' : '0' }}>
          {title}
        </h2>
        {description && (
          <p style={{ fontSize: 'var(--text-sm)', color: 'var(--text-secondary)', margin: 0 }}>
            {description}
          </p>
        )}
      </div>
      {children}
    </section>
  )
}

interface PreviewProps {
  label: string
  children: ReactNode
  code?: string
  dark?: boolean
}

export function DSPreview({ label, children, code, dark }: PreviewProps) {
  return (
    <div style={{ border: '1px solid var(--border-default)', borderRadius: 'var(--radius-lg)', overflow: 'hidden' }}>
      <div
        style={{
          padding: '2rem',
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          gap: '1rem',
          background: dark ? 'var(--neutral-900)' : 'var(--surface-page)',
          minHeight: '80px',
        }}
      >
        {children}
      </div>
      <div style={{
        padding: '0.5rem 1rem',
        background: 'var(--surface-sunken)',
        borderTop: '1px solid var(--border-default)',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
      }}>
        <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-tertiary)', fontWeight: 'var(--font-medium)' }}>
          {label}
        </span>
        {code && (
          <code style={{ fontSize: 'var(--text-xs)', color: 'var(--text-secondary)' }}>{code}</code>
        )}
      </div>
    </div>
  )
}

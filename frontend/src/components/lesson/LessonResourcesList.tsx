import { ExternalLink, FileText, Image as ImageIcon, Link2, Paperclip } from 'lucide-react'
import type { LearnerResourceItem } from '@/types/content'

interface LessonResourcesListProps {
  resources?: LearnerResourceItem[]
}

function isSafeDisplayUrl(url?: string | null, resourceType?: string): boolean {
  if (!url) return false
  const trimmed = url.trim()
  if (resourceType === 'attachment' && trimmed.startsWith('/uploads/') && !trimmed.includes('..')) {
    return true
  }
  try {
    const parsed = new URL(trimmed)
    return parsed.protocol === 'https:'
  } catch {
    return false
  }
}

export function LessonResourcesList({ resources }: LessonResourcesListProps) {
  if (!resources || resources.length === 0) return null

  // Non-embeddable videos or non-video resources (image, document, link, attachment)
  const displayItems = resources.filter(
    (r) => r.resourceType !== 'video' || !r.embedAllowed
  )

  if (displayItems.length === 0) return null

  return (
    <section
      aria-label="Tài liệu và liên kết bổ trợ"
      className="lesson-resources-section"
      style={{ marginTop: '20px', display: 'grid', gap: '12px' }}
    >
      <h2 style={{ fontSize: '17px', margin: 0 }}>Tài liệu &amp; Tài nguyên bổ trợ</h2>
      <div style={{ display: 'grid', gap: '10px' }}>
        {displayItems.map((res) => {
          const safe = isSafeDisplayUrl(res.sourceUrl, res.resourceType)
          if (!safe) {
            return (
              <div
                key={res.id}
                role="status"
                style={{
                  padding: '12px',
                  borderRadius: '10px',
                  border: '1px solid #fecaca',
                  background: '#fef2f2',
                  fontSize: '13px',
                  color: '#991b1b',
                }}
              >
                Tài nguyên "{res.title}" có đường dẫn không hợp lệ và đã được ẩn để đảm bảo an toàn.
              </div>
            )
          }

          if (res.resourceType === 'image') {
            return (
              <figure
                key={res.id}
                style={{
                  margin: 0,
                  padding: '12px',
                  borderRadius: '10px',
                  border: '1px solid var(--border-subtle, #e2e8f0)',
                  display: 'grid',
                  gap: '8px',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 600, fontSize: '14px' }}>
                  <ImageIcon size={16} aria-hidden />
                  <span>{res.title}</span>
                </div>
                <img
                  src={res.sourceUrl}
                  alt={res.title}
                  loading="lazy"
                  style={{ maxWidth: '100%', height: 'auto', borderRadius: '8px' }}
                />
                {(res.description || res.sourceName || res.sourceLicense) && (
                  <figcaption style={{ fontSize: '12px', color: 'var(--color-ink-muted)' }}>
                    {res.description}
                    {res.sourceName ? ` · Nguồn: ${res.sourceName}` : ''}
                    {res.sourceLicense ? ` (${res.sourceLicense})` : ''}
                  </figcaption>
                )}
              </figure>
            )
          }

          const Icon =
            res.resourceType === 'document'
              ? FileText
              : res.resourceType === 'attachment'
                ? Paperclip
                : Link2

          return (
            <div
              key={res.id}
              style={{
                padding: '12px',
                borderRadius: '10px',
                border: '1px solid var(--border-subtle, #e2e8f0)',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                gap: '12px',
                flexWrap: 'wrap',
              }}
            >
              <div style={{ minWidth: 0, flex: '1 1 200px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 600, fontSize: '14px' }}>
                  <Icon size={16} aria-hidden />
                  <span>{res.title}</span>
                </div>
                {res.description && (
                  <p style={{ margin: '4px 0 0', fontSize: '13px', color: 'var(--color-ink-muted)' }}>
                    {res.description}
                  </p>
                )}
                {(res.sourceName || res.sourceLicense) && (
                  <div style={{ fontSize: '12px', color: 'var(--color-ink-muted)', marginTop: '2px' }}>
                    {res.sourceName ? `Nguồn: ${res.sourceName}` : ''}
                    {res.sourceLicense ? ` · ${res.sourceLicense}` : ''}
                  </div>
                )}
              </div>
              <a
                href={res.sourceUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="staff-btn staff-btn-secondary"
                style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '13px' }}
              >
                <span>{res.resourceType === 'attachment' || res.resourceType === 'document' ? 'Mở / Tải tài liệu' : 'Mở liên kết'}</span>
                <ExternalLink size={14} aria-hidden />
              </a>
            </div>
          )
        })}
      </div>
    </section>
  )
}

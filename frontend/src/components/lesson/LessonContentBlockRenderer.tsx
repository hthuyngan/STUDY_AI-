import React from 'react'
import { AlertTriangle, BookOpen, ExternalLink, FileText, HelpCircle, Lightbulb, PlayCircle } from 'lucide-react'
import { MathView } from '@/components/common/MathView'
import type { LessonContentBlock } from '@/types/content'
import './LessonContentBlockRenderer.css'

export interface LessonContentBlockRendererProps {
  blocks: LessonContentBlock[]
}

const SUPPORTED_SCHEMA_VERSION = 1

function isSafeHttpOrUploadUrl(url: string | undefined, allowUploads = false): boolean {
  if (!url) return false
  if (allowUploads && url.startsWith('/uploads/')) return true
  try {
    const parsed = new URL(url)
    return parsed.protocol === 'https:' || parsed.protocol === 'http:'
  } catch {
    return false
  }
}

/**
 * Renders safe structured Markdown lines into React elements without raw HTML injection.
 */
function SafeMarkdownSubset({ content }: { content: string }) {
  const lines = content.split(/\r?\n/)
  const nodes: React.ReactNode[] = []
  let listItems: string[] = []

  const flushList = (keyPrefix: string) => {
    if (listItems.length > 0) {
      nodes.push(
        <ul key={`${keyPrefix}-ul`} className="lcb-md-list">
          {listItems.map((item, idx) => (
            <li key={idx}>{item}</li>
          ))}
        </ul>
      )
      listItems = []
    }
  }

  lines.forEach((rawLine, idx) => {
    const line = rawLine.trim()
    if (!line) {
      flushList(`empty-${idx}`)
      return
    }
    if (line.startsWith('- ') || line.startsWith('* ')) {
      listItems.push(line.slice(2).trim())
      return
    }
    flushList(`line-${idx}`)
    if (line.startsWith('### ')) {
      nodes.push(<h4 key={idx} className="lcb-md-h4">{line.slice(4)}</h4>)
    } else if (line.startsWith('## ')) {
      nodes.push(<h3 key={idx} className="lcb-md-h3">{line.slice(3)}</h3>)
    } else if (line.startsWith('# ')) {
      nodes.push(<h2 key={idx} className="lcb-md-h2">{line.slice(2)}</h2>)
    } else {
      nodes.push(<p key={idx} className="lcb-md-p">{line}</p>)
    }
  })
  flushList('end')

  return <div className="lcb-markdown">{nodes}</div>
}

function UnsupportedBlockAlert({ blockType, schemaVersion }: { blockType: string; schemaVersion: unknown }) {
  return (
    <div className="lcb-unsupported" role="alert">
      <AlertTriangle size={18} aria-hidden="true" />
      <span>
        Không thể hiển thị khối nội dung (loại <code>{blockType || 'unknown'}</code>, phiên bản{' '}
        <code>{String(schemaVersion ?? 'unknown')}</code> không được hỗ trợ).
      </span>
    </div>
  )
}

function renderBlock(block: LessonContentBlock, index: number): React.ReactNode {
  if (block.schemaVersion !== SUPPORTED_SCHEMA_VERSION) {
    return <UnsupportedBlockAlert key={block.id ?? index} blockType={block.blockType} schemaVersion={block.schemaVersion} />
  }

  switch (block.blockType) {
    case 'text':
      return (
        <div key={block.id ?? index} className="lcb-block lcb-text">
          <p>{block.payload.content}</p>
        </div>
      )

    case 'markdown':
      return (
        <div key={block.id ?? index} className="lcb-block">
          <SafeMarkdownSubset content={block.payload.content} />
        </div>
      )

    case 'formula':
      return (
        <figure key={block.id ?? index} className="lcb-block lcb-formula">
          <div className="lcb-formula__math">
            <MathView math={block.payload.latex} displayMode={block.payload.displayMode ?? true} />
          </div>
          {block.payload.caption && <figcaption className="lcb-caption">{block.payload.caption}</figcaption>}
        </figure>
      )

    case 'image':
      if (!isSafeHttpOrUploadUrl(block.payload.url, true)) {
        return <UnsupportedBlockAlert key={block.id ?? index} blockType="image(unsafe-url)" schemaVersion={block.schemaVersion} />
      }
      return (
        <figure key={block.id ?? index} className="lcb-block lcb-image">
          <img src={block.payload.url} alt={block.payload.alt} loading="lazy" />
          {block.payload.caption && <figcaption className="lcb-caption">{block.payload.caption}</figcaption>}
        </figure>
      )

    case 'video':
      if (!isSafeHttpOrUploadUrl(block.payload.url, false)) {
        return <UnsupportedBlockAlert key={block.id ?? index} blockType="video(unsafe-url)" schemaVersion={block.schemaVersion} />
      }
      return (
        <div key={block.id ?? index} className="lcb-block lcb-video">
          <div className="lcb-block-header">
            <PlayCircle size={18} aria-hidden="true" />
            <span>{block.payload.title}</span>
          </div>
          <a href={block.payload.url} target="_blank" rel="noopener noreferrer" className="lcb-external-link">
            Mở video bài giảng <ExternalLink size={14} aria-hidden="true" />
          </a>
        </div>
      )

    case 'example':
      return (
        <section key={block.id ?? index} className="lcb-block lcb-example" aria-label={block.payload.title}>
          <div className="lcb-block-header">
            <Lightbulb size={18} aria-hidden="true" />
            <h3>{block.payload.title}</h3>
          </div>
          <p className="lcb-prompt">{block.payload.prompt}</p>
          {block.payload.solution && (
            <details className="lcb-solution">
              <summary>Xem lời giải tham khảo</summary>
              <p>{block.payload.solution}</p>
            </details>
          )}
        </section>
      )

    case 'exercise':
      return (
        <section key={block.id ?? index} className="lcb-block lcb-exercise" aria-label="Bài tập thực hành">
          <div className="lcb-block-header">
            <HelpCircle size={18} aria-hidden="true" />
            <h3>Bài tập</h3>
          </div>
          <p className="lcb-prompt">{block.payload.prompt}</p>
          {block.payload.hint && <p className="lcb-hint">Gợi ý: {block.payload.hint}</p>}
        </section>
      )

    case 'table':
      return (
        <div key={block.id ?? index} className="lcb-block lcb-table-wrap">
          <table className="lcb-table">
            {block.payload.caption && <caption>{block.payload.caption}</caption>}
            <thead>
              <tr>
                {block.payload.headers.map((h, hIdx) => (
                  <th key={hIdx} scope="col">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {block.payload.rows.map((row, rIdx) => (
                <tr key={rIdx}>
                  {row.map((cell, cIdx) => (
                    <td key={cIdx}>{cell}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )

    case 'diagram':
      return (
        <figure key={block.id ?? index} className="lcb-block lcb-diagram" aria-label={block.payload.alt}>
          <div className="lcb-diagram__meta">Sơ đồ ({block.payload.format})</div>
          <pre className="lcb-diagram__source" aria-label={block.payload.alt}>{block.payload.source}</pre>
          <figcaption className="lcb-caption">{block.payload.caption || block.payload.alt}</figcaption>
        </figure>
      )

    case 'timeline':
      return (
        <section key={block.id ?? index} className="lcb-block lcb-timeline" aria-label={block.payload.caption || 'Dòng thời gian'}>
          {block.payload.caption && <h3 className="lcb-timeline__title">{block.payload.caption}</h3>}
          <ol className="lcb-timeline__list">
            {block.payload.events.map((ev, eIdx) => (
              <li key={eIdx} className="lcb-timeline__item">
                <span className="lcb-timeline__date">{ev.date}</span>
                <strong className="lcb-timeline__event-title">{ev.title}</strong>
                {ev.description && <p className="lcb-timeline__desc">{ev.description}</p>}
              </li>
            ))}
          </ol>
        </section>
      )

    case 'summary':
      return (
        <section key={block.id ?? index} className="lcb-block lcb-summary" aria-label={block.payload.title || 'Tóm tắt'}>
          <div className="lcb-block-header">
            <BookOpen size={18} aria-hidden="true" />
            <h3>{block.payload.title || 'Tóm tắt trọng tâm'}</h3>
          </div>
          <ul className="lcb-summary__list">
            {block.payload.points.map((pt, pIdx) => (
              <li key={pIdx}>{pt}</li>
            ))}
          </ul>
        </section>
      )

    case 'reference':
      return (
        <div key={block.id ?? index} className="lcb-block lcb-reference">
          <FileText size={16} aria-hidden="true" />
          <div>
            <strong>{block.payload.label}</strong>
            {block.payload.citation && <p className="lcb-reference__citation">{block.payload.citation}</p>}
            {block.payload.url && isSafeHttpOrUploadUrl(block.payload.url, false) && (
              <a href={block.payload.url} target="_blank" rel="noopener noreferrer" className="lcb-external-link">
                Nguồn tham khảo <ExternalLink size={14} aria-hidden="true" />
              </a>
            )}
          </div>
        </div>
      )

    default: {
      const unknownBlock = block as { blockType?: string; schemaVersion?: unknown }
      return <UnsupportedBlockAlert key={index} blockType={unknownBlock.blockType ?? 'unknown'} schemaVersion={unknownBlock.schemaVersion} />
    }
  }
}

export const LessonContentBlockRenderer: React.FC<LessonContentBlockRendererProps> = ({ blocks }) => {
  if (!blocks || blocks.length === 0) {
    return null
  }

  const ordered = [...blocks].sort((a, b) => a.orderIndex - b.orderIndex)

  return (
    <div className="lcb-renderer">
      {ordered.map((block, index) => renderBlock(block, index))}
    </div>
  )
}

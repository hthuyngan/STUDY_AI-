import { useState, useMemo, type ReactNode } from 'react'
import { Sparkles, Check, Copy, HelpCircle, Layers, Lightbulb, ListChecks, FileText } from 'lucide-react'
import katex from 'katex'
import 'katex/dist/katex.min.css'
import type { ChatMessage, LearningAssistanceMode } from '../../types/aiTutor'
import { MessageActions } from './MessageActions'

interface AssistantMessageProps {
  message: ChatMessage
  onFollowUpClick?: (prompt: string) => void
  isLatest?: boolean
}

/**
 * Custom CodeBlock with language header and copy button
 */
function CodeBlock({ code, language }: { code: string; language: string }) {
  const [copied, setCopied] = useState(false)

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(code)
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    } catch {
      setCopied(false)
    }
  }

  return (
    <div className="ai-codeblock-container">
      <div className="ai-codeblock-header">
        <span className="ai-codeblock-lang">{language || 'code'}</span>
        <button
          type="button"
          onClick={handleCopy}
          className="ai-codeblock-copy-btn"
          aria-label={copied ? 'Đã sao chép mã' : 'Sao chép mã'}
        >
          {copied ? (
            <>
              <Check size={13} className="text-success" aria-hidden />
              <span>Đã chép</span>
            </>
          ) : (
            <>
              <Copy size={13} aria-hidden />
              <span>Sao chép</span>
            </>
          )}
        </button>
      </div>
      <pre className="ai-codeblock-pre">
        <code>{code}</code>
      </pre>
    </div>
  )
}

/**
 * Math Block displaying LaTeX equations centered with horizontal scroll
 */
function MathBlock({ formula }: { formula: string }) {
  const html = useMemo(() => {
    try {
      return katex.renderToString(formula.trim(), {
        displayMode: true,
        throwOnError: false,
      })
    } catch {
      return formula
    }
  }, [formula])

  return (
    <div
      className="ai-math-block-container"
      tabIndex={0}
      aria-label={`Công thức toán: ${formula}`}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  )
}

/**
 * Helper to render inline math or fallback text safely
 */
function renderInlineMath(formula: string, key: string): ReactNode {
  try {
    const html = katex.renderToString(formula.trim(), {
      displayMode: false,
      throwOnError: false,
    })
    return (
      <span
        key={key}
        className="ai-inline-math"
        aria-label={formula}
        dangerouslySetInnerHTML={{ __html: html }}
      />
    )
  } catch {
    return <span key={key} className="ai-inline-math-fallback">${formula}$</span>
  }
}

/**
 * Format inline text (bold, italic, code, inline math $...$) safely into React nodes
 */
function formatInlineText(text: string): ReactNode[] {
  const parts: ReactNode[] = []
  // Matches:
  // 1. Inline math: $...$ or \(...\)
  // 2. Bold: **...**
  // 3. Italic: *...* or _..._
  // 4. Inline code: `...`
  const regex = /(\$[^$\n]+\$|\\\([^)]+\\\)|\*\*[^*]+\*\*|`[^`]+`|\*[^*]+\*|_[^_]+_)/g
  let lastIndex = 0
  let match: RegExpExecArray | null

  while ((match = regex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      parts.push(text.substring(lastIndex, match.index))
    }
    const token = match[0]

    // Inline Math: $...$ or \(...\)
    if (token.startsWith('$') && token.endsWith('$') && token.length > 2) {
      const formula = token.slice(1, -1)
      parts.push(renderInlineMath(formula, `im-${match.index}`))
    } else if (token.startsWith('\\(') && token.endsWith('\\)')) {
      const formula = token.slice(2, -2)
      parts.push(renderInlineMath(formula, `im2-${match.index}`))
    } else if (token.startsWith('**') && token.endsWith('**')) {
      parts.push(
        <strong key={`b-${match.index}`} className="font-semibold text-text">
          {token.slice(2, -2)}
        </strong>
      )
    } else if (token.startsWith('`') && token.endsWith('`')) {
      parts.push(
        <code key={`c-${match.index}`} className="ai-inline-code">
          {token.slice(1, -1)}
        </code>
      )
    } else if (
      (token.startsWith('*') && token.endsWith('*')) ||
      (token.startsWith('_') && token.endsWith('_'))
    ) {
      parts.push(
        <em key={`i-${match.index}`} className="italic">
          {token.slice(1, -1)}
        </em>
      )
    }

    lastIndex = regex.lastIndex
  }

  if (lastIndex < text.length) {
    parts.push(text.substring(lastIndex))
  }

  return parts
}

/**
 * Safe block renderer supporting paragraphs, headings, blockquotes, tables, lists, math and code
 */
function SafeContentRenderer({ content }: { content: string }) {
  if (!content) return null

  // Match code blocks (```...```) and block math ($$...$$ or \[...\])
  const blockRegex = /(```[a-zA-Z0-9_-]*\n[\s\S]*?```|\$\$[\s\S]*?\$\$|\\\[[\s\S]*?\\\])/g
  const blocks: ReactNode[] = []
  let lastIndex = 0
  let match: RegExpExecArray | null
  let blockKey = 0

  while ((match = blockRegex.exec(content)) !== null) {
    if (match.index > lastIndex) {
      const textSection = content.substring(lastIndex, match.index)
      renderTextSection(textSection, blocks, blockKey)
      blockKey += 100
    }

    const token = match[0]

    if (token.startsWith('```')) {
      const firstLineEnd = token.indexOf('\n')
      const language = token.substring(3, firstLineEnd).trim() || 'code'
      const code = token.substring(firstLineEnd + 1, token.length - 3).trimEnd()
      blocks.push(<CodeBlock key={`cb-${match.index}`} code={code} language={language} />)
    } else if (token.startsWith('$$')) {
      const formula = token.slice(2, -2)
      blocks.push(<MathBlock key={`mb-${match.index}`} formula={formula} />)
    } else if (token.startsWith('\\[')) {
      const formula = token.slice(2, -2)
      blocks.push(<MathBlock key={`mb2-${match.index}`} formula={formula} />)
    }

    lastIndex = blockRegex.lastIndex
  }

  if (lastIndex < content.length) {
    const remainingText = content.substring(lastIndex)
    renderTextSection(remainingText, blocks, blockKey)
  }

  return <div className="assistant-content-flow">{blocks}</div>
}

function renderTextSection(text: string, blocks: ReactNode[], baseKey: number) {
  const lines = text.split('\n')
  let currentList: { type: 'ul' | 'ol'; items: string[] } | null = null
  let currentTable: { headers: string[]; rows: string[][] } | null = null
  let lineIdx = 0

  const flushList = () => {
    if (!currentList) return
    const key = `list-${baseKey}-${lineIdx}`
    if (currentList.type === 'ol') {
      blocks.push(
        <ol key={key} className="ai-numbered-list">
          {currentList.items.map((item, idx) => (
            <li key={idx} className="ai-list-item">
              {formatInlineText(item)}
            </li>
          ))}
        </ol>
      )
    } else {
      blocks.push(
        <ul key={key} className="ai-bullet-list">
          {currentList.items.map((item, idx) => (
            <li key={idx} className="ai-list-item">
              {formatInlineText(item)}
            </li>
          ))}
        </ul>
      )
    }
    currentList = null
  }

  const flushTable = () => {
    if (!currentTable) return
    const key = `tbl-${baseKey}-${lineIdx}`
    blocks.push(
      <div key={key} className="ai-table-container">
        <table className="ai-markdown-table">
          <thead>
            <tr>
              {currentTable.headers.map((h, i) => (
                <th key={i}>{formatInlineText(h.trim())}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {currentTable.rows.map((row, rIdx) => (
              <tr key={rIdx}>
                {row.map((cell, cIdx) => (
                  <td key={cIdx}>{formatInlineText(cell.trim())}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    )
    currentTable = null
  }

  for (let i = 0; i < lines.length; i++) {
    lineIdx++
    const line = lines[i]
    const trimmed = line.trim()
    if (!trimmed) {
      flushList()
      flushTable()
      continue
    }

    // Markdown Table detection: | Col 1 | Col 2 |
    if (trimmed.startsWith('|') && trimmed.endsWith('|')) {
      flushList()
      const cells = trimmed
        .slice(1, -1)
        .split('|')
        .map((c) => c.trim())

      // Divider line like |:---|:---|
      if (cells.every((c) => /^:?-+:?$/.test(c))) {
        continue
      }

      if (!currentTable) {
        currentTable = { headers: cells, rows: [] }
      } else {
        currentTable.rows.push(cells)
      }
      continue
    } else {
      flushTable()
    }

    // Headings
    if (trimmed.startsWith('### ')) {
      flushList()
      blocks.push(
        <h4 key={`h3-${baseKey}-${lineIdx}`} className="ai-heading-3">
          {formatInlineText(trimmed.slice(4))}
        </h4>
      )
      continue
    }
    if (trimmed.startsWith('## ')) {
      flushList()
      blocks.push(
        <h3 key={`h2-${baseKey}-${lineIdx}`} className="ai-heading-2">
          {formatInlineText(trimmed.slice(3))}
        </h3>
      )
      continue
    }
    if (trimmed.startsWith('# ')) {
      flushList()
      blocks.push(
        <h2 key={`h1-${baseKey}-${lineIdx}`} className="ai-heading-1">
          {formatInlineText(trimmed.slice(2))}
        </h2>
      )
      continue
    }

    // Blockquote: > ...
    if (trimmed.startsWith('> ')) {
      flushList()
      blocks.push(
        <blockquote key={`bq-${baseKey}-${lineIdx}`} className="ai-blockquote">
          {formatInlineText(trimmed.slice(2))}
        </blockquote>
      )
      continue
    }

    // Numbered list: e.g. "1. ..." or "2) ..."
    const numMatch = trimmed.match(/^(\d+)[.)]\s+(.*)/)
    if (numMatch) {
      if (currentList && currentList.type !== 'ol') flushList()
      if (!currentList) currentList = { type: 'ol', items: [] }
      currentList.items.push(numMatch[2])
      continue
    }

    // Bullet list: e.g. "• ..." or "- ..." or "* ..."
    const bulletMatch = trimmed.match(/^[*•-]\s+(.*)/)
    if (bulletMatch) {
      if (currentList && currentList.type !== 'ul') flushList()
      if (!currentList) currentList = { type: 'ul', items: [] }
      currentList.items.push(bulletMatch[1])
      continue
    }

    // Normal paragraph
    flushList()
    blocks.push(
      <p key={`p-${baseKey}-${lineIdx}`} className="ai-paragraph">
        {formatInlineText(trimmed)}
      </p>
    )
  }

  flushList()
  flushTable()
}

function getModeMeta(mode?: LearningAssistanceMode) {
  switch (mode) {
    case 'hint':
      return { label: 'Gợi ý tư duy', icon: HelpCircle, colorClass: 'mode-hint' }
    case 'step-by-step':
      return { label: 'Hướng dẫn từng bước', icon: Layers, colorClass: 'mode-step' }
    case 'practice':
      return { label: 'Bài tập vận dụng', icon: ListChecks, colorClass: 'mode-practice' }
    case 'summarize':
      return { label: 'Tóm tắt cốt lõi', icon: FileText, colorClass: 'mode-summarize' }
    case 'explain':
    default:
      return { label: 'Giải thích lý thuyết', icon: Lightbulb, colorClass: 'mode-explain' }
  }
}

export function AssistantMessage({
  message,
  onFollowUpClick,
  isLatest = false,
}: AssistantMessageProps) {
  const isStreaming = message.status === 'streaming'
  const isError = message.status === 'error'
  const modeMeta = message.assistanceMode ? getModeMeta(message.assistanceMode) : null
  const ModeIcon = modeMeta?.icon

  return (
    <article
      className={`assistant-message-row ${isError ? 'assistant-message-error' : ''}`}
      aria-label="Câu trả lời từ AI Tutor"
      aria-live={isStreaming ? 'polite' : 'off'}
    >
      <header className="assistant-message-header">
        <div className="assistant-avatar" aria-hidden>
          <Sparkles size={16} />
        </div>
        <div className="assistant-meta">
          <span className="assistant-name">AI Tutor</span>
          {isStreaming && <span className="assistant-status-tag">Đang trả lời...</span>}
          {modeMeta && ModeIcon && (
            <span className={`ai-mode-pill ${modeMeta.colorClass}`}>
              <ModeIcon size={11} aria-hidden /> {modeMeta.label}
            </span>
          )}
        </div>
      </header>

      {/* Historical Context Snapshot Badge */}
      {message.learningContextSnapshot && (
        <div className="assistant-context-snapshot-bar">
          <span className="context-snapshot-source">
            {message.learningContextSnapshot.source === 'assessment-question'
              ? 'Câu hỏi thu hoạch'
              : message.learningContextSnapshot.source === 'knowledge-gap'
                ? 'Kiến thức yếu'
                : message.learningContextSnapshot.source === 'study-note'
                  ? 'Ghi chú học tập'
                  : 'Ngữ cảnh bài học'}
          </span>
          <span className="context-snapshot-title">
            {message.learningContextSnapshot.subjectName ? `${message.learningContextSnapshot.subjectName} · ` : ''}
            {message.learningContextSnapshot.title}
          </span>
        </div>
      )}

      <div className="assistant-body">
        <SafeContentRenderer content={message.content} />
        {isStreaming && <span className="ai-streaming-cursor" aria-hidden />}
      </div>

      {!isStreaming && !isError && message.content && (
        <MessageActions
          content={message.content}
          onFollowUpClick={onFollowUpClick}
          showFollowUps={isLatest}
        />
      )}
    </article>
  )
}

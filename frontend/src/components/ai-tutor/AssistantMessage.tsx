import { useState, type ReactNode } from 'react'
import { Sparkles, Check, Copy } from 'lucide-react'
import type { ChatMessage } from '../../types/aiTutor'
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
 * Format inline text (e.g. bold **text**, inline `code`) safely into React nodes
 */
function formatInlineText(text: string): ReactNode[] {
  const parts: ReactNode[] = []
  // Match bold **text** or code `code`
  const regex = /(\*\*[^*]+\*\*|`[^`]+`)/g
  let lastIndex = 0
  let match: RegExpExecArray | null

  while ((match = regex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      parts.push(text.substring(lastIndex, match.index))
    }
    const token = match[0]
    if (token.startsWith('**') && token.endsWith('**')) {
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
    }
    lastIndex = regex.lastIndex
  }

  if (lastIndex < text.length) {
    parts.push(text.substring(lastIndex))
  }

  return parts
}

/**
 * Safe block renderer supporting paragraphs, lists, and code blocks
 */
function SafeContentRenderer({ content }: { content: string }) {
  if (!content) return null

  // Split by code blocks first
  const codeBlockRegex = /```([a-zA-Z0-9_-]*)\n([\s\S]*?)```/g
  const blocks: ReactNode[] = []
  let lastIndex = 0
  let match: RegExpExecArray | null
  let blockKey = 0

  while ((match = codeBlockRegex.exec(content)) !== null) {
    if (match.index > lastIndex) {
      const textSection = content.substring(lastIndex, match.index)
      renderTextSection(textSection, blocks, blockKey)
      blockKey += 100
    }

    const language = match[1] || 'code'
    const code = match[2].trimEnd()
    blocks.push(
      <CodeBlock key={`cb-${match.index}`} code={code} language={language} />
    )
    lastIndex = codeBlockRegex.lastIndex
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

  for (const line of lines) {
    lineIdx++
    const trimmed = line.trim()
    if (!trimmed) {
      flushList()
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
}

export function AssistantMessage({
  message,
  onFollowUpClick,
  isLatest = false,
}: AssistantMessageProps) {
  const isStreaming = message.status === 'streaming'
  const isError = message.status === 'error'

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
        </div>
      </header>

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

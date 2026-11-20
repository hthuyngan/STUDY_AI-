import React, { useState } from 'react'
import { Bot, Check, Copy, User } from 'lucide-react'
import katex from 'katex'
import 'katex/dist/katex.min.css'
import type { ChatMessage } from '@/types/aiTutor'

export interface AiChatMessageItemProps {
  message: ChatMessage
  onFollowUpClick?: (action: string) => void
}

/**
 * Parses text into formatted segments including KaTeX inline ($...$) and block ($$...$$) math.
 */
function renderMathContent(rawText: string): React.ReactNode {
  if (!rawText) return null

  // Split by block math $$...$$ first, then inline $...$
  const blockParts = rawText.split(/(\$\$[\s\S]+?\$\$)/g)

  return blockParts.map((blockPart, blockIdx) => {
    if (blockPart.startsWith('$$') && blockPart.endsWith('$$')) {
      const math = blockPart.slice(2, -2).trim()
      try {
        const html = katex.renderToString(math, { displayMode: true, throwOnError: false })
        return <div key={blockIdx} className="ai-katex-block" dangerouslySetInnerHTML={{ __html: html }} />
      } catch {
        return <pre key={blockIdx} className="ai-katex-error">{math}</pre>
      }
    }

    // Split inline math $...$
    const inlineParts = blockPart.split(/(\$[^$\n]+?\$)/g)
    return (
      <span key={blockIdx}>
        {inlineParts.map((inlinePart, inlineIdx) => {
          if (inlinePart.startsWith('$') && inlinePart.endsWith('$') && inlinePart.length > 2) {
            const math = inlinePart.slice(1, -1).trim()
            try {
              const html = katex.renderToString(math, { displayMode: false, throwOnError: false })
              return <span key={inlineIdx} className="ai-katex-inline" dangerouslySetInnerHTML={{ __html: html }} />
            } catch {
              return <code key={inlineIdx}>{inlinePart}</code>
            }
          }

          // Plain text formatting: handle newlines and bold **text**
          const lines = inlinePart.split('\n')
          return lines.map((line, lineIdx) => (
            <React.Fragment key={`${inlineIdx}-${lineIdx}`}>
              {lineIdx > 0 && <br />}
              {renderBoldText(line)}
            </React.Fragment>
          ))
        })}
      </span>
    )
  })
}

function renderBoldText(text: string): React.ReactNode {
  const parts = text.split(/(\*\*[^*]+?\*\*)/g)
  return parts.map((part, idx) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return <strong key={idx}>{part.slice(2, -2)}</strong>
    }
    return part
  })
}

export const AiChatMessageItem: React.FC<AiChatMessageItemProps> = ({ message, onFollowUpClick }) => {
  const isUser = message.role === 'user'
  const isError = message.status === 'error'
  const isStreaming = message.status === 'streaming'
  const [copied, setCopied] = useState(false)

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(message.content)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      setCopied(false)
    }
  }

  return (
    <div className={`ai-message-row ${isUser ? 'is-user' : 'is-assistant'} ${isError ? 'is-error' : ''}`}>
      {!isUser && (
        <div className="ai-message-avatar" aria-hidden>
          <Bot size={16} />
        </div>
      )}

      <div className="ai-message-bubble-wrap">
        <div className="ai-message-bubble">
          {isUser ? (
            <p className="ai-user-text">{message.content}</p>
          ) : (
            <div className="ai-assistant-content">
              {renderMathContent(message.content)}
              {isStreaming && (
                <span className="ai-streaming-cursor" aria-hidden>
                  ▍
                </span>
              )}
            </div>
          )}
        </div>

        {!isUser && !isStreaming && !isError && message.content && (
          <div className="ai-message-meta">
            <button
              type="button"
              className="ai-copy-btn"
              onClick={handleCopy}
              title={copied ? 'Đã sao chép' : 'Sao chép câu trả lời'}
              aria-label={copied ? 'Đã sao chép' : 'Sao chép'}
            >
              {copied ? (
                <>
                  <Check size={12} className="text-success" aria-hidden />
                  <span>Đã chép</span>
                </>
              ) : (
                <>
                  <Copy size={12} aria-hidden />
                  <span>Sao chép</span>
                </>
              )}
            </button>
          </div>
        )}

        {!isUser && message.suggestedActions && message.suggestedActions.length > 0 && onFollowUpClick && (
          <div className="ai-suggested-followups">
            {message.suggestedActions.map((action, idx) => (
              <button
                key={idx}
                type="button"
                className="ai-followup-pill"
                onClick={() => onFollowUpClick(action)}
              >
                {action}
              </button>
            ))}
          </div>
        )}
      </div>

      {isUser && (
        <div className="ai-message-avatar user-avatar" aria-hidden>
          <User size={16} />
        </div>
      )}
    </div>
  )
}


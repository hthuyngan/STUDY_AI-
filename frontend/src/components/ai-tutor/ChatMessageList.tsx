import { useEffect, useRef } from 'react'
import { ArrowDown } from 'lucide-react'
import type { ChatMessage } from '../../types/aiTutor'
import { UserMessage } from './UserMessage'
import { AssistantMessage } from './AssistantMessage'
import { TypingIndicator } from './TypingIndicator'
import { ChatErrorState } from './ChatErrorState'

interface ChatMessageListProps {
  messages: ChatMessage[]
  isTyping: boolean
  isStreaming: boolean
  error: string | null
  onRetry: () => void
  onFollowUpClick: (prompt: string) => void
  containerRef: React.RefObject<HTMLDivElement | null>
  isAtBottom: boolean
  scrollToBottom: () => void
}

export function ChatMessageList({
  messages,
  isTyping,
  isStreaming,
  error,
  onRetry,
  onFollowUpClick,
  containerRef,
  isAtBottom,
  scrollToBottom,
}: ChatMessageListProps) {
  const bottomAnchorRef = useRef<HTMLDivElement>(null)

  // Auto-scroll when new messages arrive or when streaming updates, if user is already at bottom
  useEffect(() => {
    if (isAtBottom) {
      bottomAnchorRef.current?.scrollIntoView({ behavior: 'smooth' })
    }
  }, [messages, isTyping, isAtBottom])

  return (
    <div className="chat-messages-scroll-area" ref={containerRef} role="log" aria-live="polite">
      <div className="chat-messages-container">
        {messages.map((message, index) => {
          const isLatest = index === messages.length - 1
          if (message.role === 'user') {
            return <UserMessage key={message.id} message={message} />
          }
          return (
            <AssistantMessage
              key={message.id}
              message={message}
              onFollowUpClick={onFollowUpClick}
              isLatest={isLatest && !isStreaming}
            />
          )
        })}

        {isTyping && (
          <div className="chat-typing-container">
            <TypingIndicator />
          </div>
        )}

        {error && (
          <div className="chat-error-row">
            <ChatErrorState message={error} onRetry={onRetry} isRetrying={isStreaming} />
          </div>
        )}

        <div ref={bottomAnchorRef} className="chat-bottom-anchor" />
      </div>

      {!isAtBottom && (
        <button
          type="button"
          onClick={scrollToBottom}
          className="chat-scroll-bottom-btn"
          aria-label="Cuộn xuống tin nhắn mới nhất"
        >
          <ArrowDown size={14} aria-hidden />
          <span>Tin nhắn mới</span>
        </button>
      )}
    </div>
  )
}

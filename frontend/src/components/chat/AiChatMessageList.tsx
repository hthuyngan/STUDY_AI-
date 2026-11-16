import React, { useEffect, useRef } from 'react'
import { AlertCircle } from 'lucide-react'
import { useAiChat } from '@/context/AiChatContext'
import { AiChatMessageItem } from './AiChatMessageItem'
import { AiChatSuggestions } from './AiChatSuggestions'

export interface AiChatMessageListProps {
  onSelectPrompt: (prompt: string) => void
}

export const AiChatMessageList: React.FC<AiChatMessageListProps> = ({ onSelectPrompt }) => {
  const { messages, isStreaming, error, clearError } = useAiChat()
  const scrollRef = useRef<HTMLDivElement>(null)
  const isNearBottomRef = useRef(true)

  const handleScroll = () => {
    if (!scrollRef.current) return
    const { scrollTop, scrollHeight, clientHeight } = scrollRef.current
    isNearBottomRef.current = scrollHeight - scrollTop - clientHeight < 60
  }

  useEffect(() => {
    if (isNearBottomRef.current && scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [messages, isStreaming])

  return (
    <div
      className="ai-chat-messages-container"
      ref={scrollRef}
      onScroll={handleScroll}
      role="log"
      aria-live="polite"
    >
      {messages.length === 0 ? (
        <div className="ai-chat-empty-state">
          <div className="empty-state-welcome">
            <h4>Chào bạn! Mình là AI Tutor.</h4>
            <p>
              Hãy đặt bất kỳ câu hỏi nào về bài học, công thức hoặc dạng bài tập Toán 12 để mình hỗ trợ nhé!
            </p>
          </div>
          <AiChatSuggestions onSelectPrompt={onSelectPrompt} />
        </div>
      ) : (
        <div className="ai-messages-list">
          {messages.map((msg) => (
            <AiChatMessageItem
              key={msg.id}
              message={msg}
              onFollowUpClick={onSelectPrompt}
            />
          ))}

          {isStreaming && messages.every((m) => m.status !== 'streaming') && (
            <div className="ai-typing-indicator-row">
              <div className="ai-typing-dots">
                <span />
                <span />
                <span />
              </div>
              <span className="ai-typing-text">AI Tutor đang suy nghĩ...</span>
            </div>
          )}
        </div>
      )}

      {error && (
        <div className="ai-chat-error-alert" role="alert">
          <AlertCircle size={16} className="error-icon" aria-hidden />
          <div className="error-text">
            <span>{error}</span>
          </div>
          <button type="button" className="error-dismiss-btn" onClick={clearError} aria-label="Đóng thông báo">
            ✕
          </button>
        </div>
      )}
    </div>
  )
}


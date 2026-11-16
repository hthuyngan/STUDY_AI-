import React, { useEffect, useRef, useState } from 'react'
import { ArrowUp, Square } from 'lucide-react'
import { useAiChat } from '@/context/AiChatContext'

export interface AiChatInputProps {
  externalPrompt?: string
  onClearExternalPrompt?: () => void
}

export const AiChatInput: React.FC<AiChatInputProps> = ({
  externalPrompt,
  onClearExternalPrompt,
}) => {
  const { sendMessage, isStreaming, cancelProcessing } = useAiChat()
  const [text, setText] = useState('')
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  // Handle external prompt injection (e.g. from suggestions or contextual buttons)
  useEffect(() => {
    if (externalPrompt) {
      setText(externalPrompt)
      if (textareaRef.current) {
        textareaRef.current.focus()
        try {
          textareaRef.current.setSelectionRange(externalPrompt.length, externalPrompt.length)
        } catch {
          // Ignore selection range errors in non-supporting environments
        }
        // Auto-adjust height
        textareaRef.current.style.height = 'auto'
        textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 120)}px`
      }
      onClearExternalPrompt?.()
    }
  }, [externalPrompt, onClearExternalPrompt])

  const handleInput = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setText(e.target.value)
    // Auto-expand textarea
    e.target.style.height = 'auto'
    e.target.style.height = `${Math.min(e.target.scrollHeight, 120)}px`
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSubmit()
    }
  }

  const handleSubmit = async () => {
    const trimmed = text.trim()
    if (!trimmed || isStreaming) return

    setText('')
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'
    }

    await sendMessage(trimmed)
  }

  return (
    <div className="ai-chat-input-wrap">
      <div className="ai-chat-input-box">
        <textarea
          ref={textareaRef}
          value={text}
          onChange={handleInput}
          onKeyDown={handleKeyDown}
          placeholder="Hỏi AI Tutor về bài học..."
          className="ai-chat-textarea"
          rows={1}
          aria-label="Nội dung câu hỏi cho AI Tutor"
          disabled={isStreaming}
        />

        {isStreaming ? (
          <button
            type="button"
            className="ai-input-btn is-cancel"
            onClick={cancelProcessing}
            aria-label="Hủy yêu cầu AI"
            title="Dừng phản hồi"
          >
            <Square size={14} className="cancel-icon" aria-hidden />
          </button>
        ) : (
          <button
            type="button"
            className={`ai-input-btn is-send ${text.trim() ? 'can-send' : ''}`}
            onClick={handleSubmit}
            disabled={!text.trim()}
            aria-label="Gửi câu hỏi"
            title="Gửi (Enter)"
          >
            <ArrowUp size={16} aria-hidden />
          </button>
        )}
      </div>

      <div className="ai-chat-input-hint">
        <span>Nhấn Enter để gửi, Shift + Enter để xuống dòng</span>
      </div>
    </div>
  )
}


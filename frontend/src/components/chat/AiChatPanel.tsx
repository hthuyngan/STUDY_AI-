import React, { useState } from 'react'
import { Bot, Maximize2, Sparkles, X } from 'lucide-react'
import { useAiChat } from '@/context/useAiChat'
import { AiChatHeader } from './AiChatHeader'
import { AiChatMessageList } from './AiChatMessageList'
import { AiChatInput } from './AiChatInput'

export const AiChatPanel: React.FC = () => {
  const {
    isOpen,
    closeChat,
    isMinimized,
    toggleMinimize,
    learningContext,
    injectedPrompt,
    clearInjectedPrompt,
  } = useAiChat()
  const [localPrompt, setLocalPrompt] = useState<string | undefined>(undefined)

  const effectivePrompt = injectedPrompt || localPrompt

  if (!isOpen) return null

  if (isMinimized) {
    return (
      <div className="ai-chat-minimized-bar" onClick={toggleMinimize}>
        <div className="minimized-inner">
          <Bot size={18} className="text-primary" aria-hidden />
          <span className="minimized-title">AI Tutor đang mở</span>
        </div>
        <div className="minimized-actions">
          <button
            type="button"
            className="minimized-btn"
            onClick={(e) => {
              e.stopPropagation()
              toggleMinimize()
            }}
            title="Mở lại"
            aria-label="Mở lại cửa sổ chat"
          >
            <Maximize2 size={14} aria-hidden />
          </button>
          <button
            type="button"
            className="minimized-btn"
            onClick={(e) => {
              e.stopPropagation()
              closeChat()
            }}
            title="Đóng"
            aria-label="Đóng AI Tutor"
          >
            <X size={14} aria-hidden />
          </button>
        </div>
      </div>
    )
  }

  const contextTitle =
    learningContext?.lessonTitle ||
    learningContext?.title ||
    (learningContext as any)?.subjectName

  return (
    <aside
      className="ai-chat-panel"
      role="complementary"
      aria-label="Cửa sổ trò chuyện AI Tutor"
    >
      <AiChatHeader onClose={closeChat} onMinimize={toggleMinimize} />

      {contextTitle && (
        <div className="ai-context-indicator">
          <Sparkles size={12} className="context-sparkle" aria-hidden />
          <span className="context-text" title={contextTitle}>
            Ngữ cảnh: <strong>{contextTitle}</strong>
          </span>
        </div>
      )}

      <AiChatMessageList onSelectPrompt={(prompt) => setLocalPrompt(prompt)} />

      <AiChatInput
        externalPrompt={effectivePrompt}
        onClearExternalPrompt={() => {
          setLocalPrompt(undefined)
          clearInjectedPrompt()
        }}
      />
    </aside>
  )
}


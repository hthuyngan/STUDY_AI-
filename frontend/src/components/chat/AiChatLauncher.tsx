import React from 'react'
import { Bot, Sparkles, X } from 'lucide-react'
import { useAiChat } from '@/context/useAiChat'

export interface AiChatLauncherProps {
  className?: string
}

export const AiChatLauncher: React.FC<AiChatLauncherProps> = ({ className = '' }) => {
  const { isOpen, toggleChat, isMinimized, providerStatus } = useAiChat()

  const isReady = providerStatus?.isReady ?? false

  return (
    <div className={`ai-chat-launcher-wrap ${className}`.trim()}>
      <button
        type="button"
        className={`ai-chat-launcher-btn ${isOpen && !isMinimized ? 'is-open' : ''}`}
        onClick={toggleChat}
        aria-label={isOpen && !isMinimized ? 'Đóng AI Tutor' : 'Hỏi AI Tutor'}
        title="Hỏi AI Tutor"
      >
        {isOpen && !isMinimized ? (
          <X size={24} className="launcher-icon close-icon" aria-hidden />
        ) : (
          <>
            <Bot size={26} className="launcher-icon bot-icon" aria-hidden />
            {isReady && <span className="launcher-status-dot" title="AI sẵn sàng hỗ trợ" />}
          </>
        )}
      </button>

      {!isOpen && (
        <div className="ai-launcher-tooltip" role="tooltip">
          <Sparkles size={13} className="tooltip-sparkle" aria-hidden />
          <span>Hỏi AI Tutor</span>
        </div>
      )}
    </div>
  )
}


import React from 'react'
import { Bot, Minimize2, Plus, Sparkles, X } from 'lucide-react'
import { useAiChat } from '@/context/AiChatContext'

export interface AiChatHeaderProps {
  onClose: () => void
  onMinimize: () => void
}

export const AiChatHeader: React.FC<AiChatHeaderProps> = ({ onClose, onMinimize }) => {
  const { providerStatus, startNewConversation, isStreaming } = useAiChat()

  const isReady = providerStatus?.isReady ?? false
  const providerLabel = providerStatus?.displayName || 'Gemini Live'

  return (
    <header className="ai-chat-header">
      <div className="ai-header-left">
        <div className="ai-header-avatar">
          <Bot size={20} className="ai-avatar-icon" aria-hidden />
          <Sparkles size={10} className="ai-avatar-sparkle" aria-hidden />
        </div>

        <div className="ai-header-titles">
          <div className="ai-header-title-row">
            <h3 className="ai-header-title">AI Tutor</h3>
            {isReady ? (
              <span className="ai-status-pill is-ready" title={`Kết nối AI thành công (${providerLabel})`}>
                <span className="status-indicator-dot" />
                Sẵn sàng hỗ trợ
              </span>
            ) : (
              <span className="ai-status-pill is-offline" title="Chưa xác minh kết nối AI">
                <span className="status-indicator-dot offline" />
                Chưa kết nối AI
              </span>
            )}
          </div>
          <span className="ai-header-subtext">Gia sư sư phạm cá nhân hóa Toán 12</span>
        </div>
      </div>

      <div className="ai-header-actions">
        <button
          type="button"
          className="ai-header-action-btn"
          onClick={() => startNewConversation()}
          disabled={isStreaming}
          aria-label="Cuộc trò chuyện mới"
          title="Bắt đầu cuộc trò chuyện mới"
        >
          <Plus size={18} aria-hidden />
        </button>

        <button
          type="button"
          className="ai-header-action-btn"
          onClick={onMinimize}
          aria-label="Thu nhỏ khung chat"
          title="Thu nhỏ"
        >
          <Minimize2 size={16} aria-hidden />
        </button>

        <button
          type="button"
          className="ai-header-action-btn btn-close"
          onClick={onClose}
          aria-label="Đóng AI Tutor"
          title="Đóng"
        >
          <X size={18} aria-hidden />
        </button>
      </div>
    </header>
  )
}


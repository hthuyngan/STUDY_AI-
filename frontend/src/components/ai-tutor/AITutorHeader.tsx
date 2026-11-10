import { ArrowLeft, History, Plus } from 'lucide-react'
import { Link } from 'react-router-dom'
import { Badge } from '../ui/Badge'
import { Button } from '../ui/Button'
import { SUBJECT_OPTIONS } from '../../data/aiTutor.mock'
import type { AiProviderStatus } from '../../services/aiTutor.service'

interface AITutorHeaderProps {
  title: string
  subjectId?: string
  providerStatus?: AiProviderStatus | null
  onToggleHistory: () => void
  onNewChat: () => void
  isStreaming?: boolean
}

export function AITutorHeader({
  title,
  subjectId = 'all',
  providerStatus,
  onToggleHistory,
  onNewChat,
  isStreaming = false,
}: AITutorHeaderProps) {
  const currentSubject = SUBJECT_OPTIONS.find((s) => s.id === subjectId)
  const subjectName = currentSubject?.name || 'Chung'

  return (
    <header className="ai-tutor-header-bar">
      <div className="ai-header-left">
        <Link
          to="/dashboard"
          className="ai-header-back-btn"
          aria-label="Quay lại Trang chủ"
          title="Trang chủ"
        >
          <ArrowLeft size={18} aria-hidden />
        </Link>

        <button
          type="button"
          onClick={onToggleHistory}
          className="ai-history-toggle-btn"
          aria-label="Mở lịch sử hội thoại"
          title="Lịch sử hội thoại"
        >
          <History size={18} aria-hidden />
        </button>

        <div className="ai-header-title-wrap">
          <h1 className="ai-header-title" title={title}>
            {title}
          </h1>
          {subjectId !== 'all' && (
            <Badge variant="primary" size="sm" className="ai-header-subject-badge">
              {subjectName}
            </Badge>
          )}
        </div>
      </div>

      <div className="ai-header-right">
        {providerStatus && (
          <div
            className={`ai-provider-badge provider-${providerStatus.provider}`}
            data-testid="ai-provider-status"
            title={providerStatus.model ? `Mô hình: ${providerStatus.model}` : undefined}
          >
            <span
              className={`provider-dot ${
                providerStatus.provider === 'openai'
                  ? 'dot-live'
                  : providerStatus.provider === 'fake'
                    ? 'dot-fake'
                    : 'dot-unconfigured'
              }`}
            />
            <span className="provider-text">{providerStatus.displayName}</span>
          </div>
        )}

        <Button
          variant="outline"
          icon={Plus}
          onClick={onNewChat}
          disabled={isStreaming}
          className="ai-header-new-chat-btn"
        >
          Đoạn chat mới
        </Button>
      </div>
    </header>
  )
}

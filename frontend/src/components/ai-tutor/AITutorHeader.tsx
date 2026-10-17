import { History, Plus } from 'lucide-react'
import { Badge } from '../ui/Badge'
import { Button } from '../ui/Button'
import { SUBJECT_OPTIONS } from '../../data/aiTutor.mock'

interface AITutorHeaderProps {
  title: string
  subjectId?: string
  onToggleHistory: () => void
  onNewChat: () => void
  isStreaming?: boolean
}

export function AITutorHeader({
  title,
  subjectId = 'all',
  onToggleHistory,
  onNewChat,
  isStreaming = false,
}: AITutorHeaderProps) {
  const currentSubject = SUBJECT_OPTIONS.find((s) => s.id === subjectId)
  const subjectName = currentSubject?.name || 'Chung'

  return (
    <header className="ai-tutor-header-bar">
      <div className="ai-header-left">
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

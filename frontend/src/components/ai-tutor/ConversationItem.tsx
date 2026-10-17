import { MessageSquare, Trash2 } from 'lucide-react'
import type { ChatConversation } from '../../types/aiTutor'

interface ConversationItemProps {
  conversation: ChatConversation
  isActive: boolean
  onSelect: (id: string) => void
  onDelete: (id: string) => void
}

export function ConversationItem({
  conversation,
  isActive,
  onSelect,
  onDelete,
}: ConversationItemProps) {
  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation()
    onDelete(conversation.id)
  }

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => onSelect(conversation.id)}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          onSelect(conversation.id)
        }
      }}
      className={`conv-item-root ${isActive ? 'is-active' : ''}`}
      aria-current={isActive ? 'true' : undefined}
    >
      <MessageSquare size={15} className="conv-item-icon" aria-hidden />
      <span className="conv-item-title" title={conversation.title}>
        {conversation.title}
      </span>
      <button
        type="button"
        onClick={handleDelete}
        className="conv-item-delete-btn"
        aria-label={`Xóa cuộc trò chuyện: ${conversation.title}`}
        title="Xóa cuộc trò chuyện"
      >
        <Trash2 size={13} aria-hidden />
      </button>
    </div>
  )
}

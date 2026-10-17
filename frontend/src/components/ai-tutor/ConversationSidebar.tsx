import { useMemo } from 'react'
import { Plus, X } from 'lucide-react'
import type { ChatConversation } from '../../types/aiTutor'
import { Button } from '../ui/Button'
import { ConversationItem } from './ConversationItem'

interface ConversationSidebarProps {
  conversations: ChatConversation[]
  activeId?: string
  onSelectConversation: (id: string) => void
  onNewConversation: () => void
  onDeleteConversation: (id: string) => void
  isOpenOnMobile?: boolean
  onCloseMobile?: () => void
}

export function ConversationSidebar({
  conversations,
  activeId,
  onSelectConversation,
  onNewConversation,
  onDeleteConversation,
  isOpenOnMobile = false,
  onCloseMobile,
}: ConversationSidebarProps) {
  // Group conversations into "Hôm nay" and "Trước đó"
  const { todayList, earlierList } = useMemo(() => {
    const todayStr = new Date().toDateString()
    const today: ChatConversation[] = []
    const earlier: ChatConversation[] = []

    for (const c of conversations) {
      if (new Date(c.updatedAt).toDateString() === todayStr) {
        today.push(c)
      } else {
        earlier.push(c)
      }
    }
    return { todayList: today, earlierList: earlier }
  }, [conversations])

  return (
    <>
      {/* Mobile backdrop */}
      {isOpenOnMobile && (
        <div
          className="ai-history-backdrop"
          onClick={onCloseMobile}
          aria-hidden="true"
        />
      )}

      <aside
        className={`ai-history-sidebar ${isOpenOnMobile ? 'is-mobile-open' : ''}`}
        aria-label="Lịch sử cuộc trò chuyện"
      >
        <div className="ai-history-header">
          <div className="ai-history-header-top">
            <h3 className="ai-history-heading">Lịch sử hội thoại</h3>
            {onCloseMobile && (
              <button
                type="button"
                onClick={onCloseMobile}
                className="ai-history-close-btn"
                aria-label="Đóng lịch sử"
              >
                <X size={18} aria-hidden />
              </button>
            )}
          </div>

          <Button
            variant="outline"
            fullWidth
            icon={Plus}
            onClick={() => {
              onNewConversation()
              if (onCloseMobile) onCloseMobile()
            }}
            className="ai-new-chat-btn"
          >
            Cuộc trò chuyện mới
          </Button>
        </div>

        <div className="ai-history-scroll-list">
          {conversations.length === 0 ? (
            <div className="ai-history-empty">Chưa có cuộc trò chuyện nào</div>
          ) : (
            <>
              {todayList.length > 0 && (
                <div className="ai-history-group">
                  <span className="ai-history-group-title">Hôm nay</span>
                  <div className="ai-history-group-items">
                    {todayList.map((conv) => (
                      <ConversationItem
                        key={conv.id}
                        conversation={conv}
                        isActive={conv.id === activeId}
                        onSelect={(id) => {
                          onSelectConversation(id)
                          if (onCloseMobile) onCloseMobile()
                        }}
                        onDelete={onDeleteConversation}
                      />
                    ))}
                  </div>
                </div>
              )}

              {earlierList.length > 0 && (
                <div className="ai-history-group">
                  <span className="ai-history-group-title">Trước đó</span>
                  <div className="ai-history-group-items">
                    {earlierList.map((conv) => (
                      <ConversationItem
                        key={conv.id}
                        conversation={conv}
                        isActive={conv.id === activeId}
                        onSelect={(id) => {
                          onSelectConversation(id)
                          if (onCloseMobile) onCloseMobile()
                        }}
                        onDelete={onDeleteConversation}
                      />
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </aside>
    </>
  )
}

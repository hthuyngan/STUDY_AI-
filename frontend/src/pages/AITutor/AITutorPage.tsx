import { useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useAITutor } from '../../hooks/useAITutor'
import { useAutoScroll } from '../../hooks/useAutoScroll'
import { ConversationSidebar } from '../../components/ai-tutor/ConversationSidebar'
import { AITutorHeader } from '../../components/ai-tutor/AITutorHeader'
import { AITutorEmptyState } from '../../components/ai-tutor/AITutorEmptyState'
import { ChatMessageList } from '../../components/ai-tutor/ChatMessageList'
import { ChatComposer } from '../../components/ai-tutor/ChatComposer'
import './AITutorPage.css'

export function AITutorPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const topicParam = searchParams.get('topic')
  const lessonParam = searchParams.get('lesson')
  const contextTopic = topicParam || (lessonParam ? `Bài học #${lessonParam}` : undefined)

  const handleClearContext = () => {
    const next = new URLSearchParams(searchParams)
    next.delete('topic')
    next.delete('lesson')
    setSearchParams(next, { replace: true })
  }

  const {
    conversations,
    activeConversation,
    activeSubject,
    isStreaming,
    isTyping,
    error,
    prefilledInput,
    setPrefilledInput,
    selectConversation,
    startNewConversation,
    deleteConversation,
    selectSubject,
    sendMessage,
    retryLastMessage,
    stopStreaming,
  } = useAITutor()

  const { containerRef, isAtBottom, scrollToBottom } = useAutoScroll()
  const [isMobileHistoryOpen, setIsMobileHistoryOpen] = useState(false)

  const handleSelectPrompt = (prompt: string, subject?: string) => {
    if (subject) {
      selectSubject(subject)
    }
    // Set prompt into composer and trigger send
    sendMessage(prompt)
  }

  const handleFollowUpClick = (followUpPrompt: string) => {
    sendMessage(followUpPrompt)
  }

  const messages = activeConversation?.messages || []
  const hasMessages = messages.length > 0
  const conversationTitle = activeConversation?.title || 'Cuộc trò chuyện mới'

  return (
    <div className="ai-tutor-layout">
      {/* History Sidebar */}
      <ConversationSidebar
        conversations={conversations}
        activeId={activeConversation?.id}
        onSelectConversation={selectConversation}
        onNewConversation={() => startNewConversation()}
        onDeleteConversation={deleteConversation}
        isOpenOnMobile={isMobileHistoryOpen}
        onCloseMobile={() => setIsMobileHistoryOpen(false)}
      />

      {/* Main Chat Pane */}
      <main className="ai-tutor-main-pane">
        <AITutorHeader
          title={conversationTitle}
          subjectId={activeSubject}
          onToggleHistory={() => setIsMobileHistoryOpen(true)}
          onNewChat={() => startNewConversation()}
          isStreaming={isStreaming}
        />

        {hasMessages ? (
          <ChatMessageList
            messages={messages}
            isTyping={isTyping}
            isStreaming={isStreaming}
            error={error}
            onRetry={retryLastMessage}
            onFollowUpClick={handleFollowUpClick}
            containerRef={containerRef}
            isAtBottom={isAtBottom}
            scrollToBottom={scrollToBottom}
          />
        ) : (
          <AITutorEmptyState onSelectPrompt={handleSelectPrompt} />
        )}

        <ChatComposer
          onSendMessage={(msg) => {
            setPrefilledInput('')
            sendMessage(msg)
          }}
          isStreaming={isStreaming}
          onStopStreaming={stopStreaming}
          activeSubject={activeSubject}
          onSelectSubject={selectSubject}
          prefilledText={prefilledInput}
          contextTopic={contextTopic}
          onClearContext={handleClearContext}
        />
      </main>
    </div>
  )
}
export default AITutorPage

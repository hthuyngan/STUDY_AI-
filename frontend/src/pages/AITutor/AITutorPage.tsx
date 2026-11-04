import { useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useAITutor } from '../../hooks/useAITutor'
import { useAutoScroll } from '../../hooks/useAutoScroll'
import { ConversationSidebar } from '../../components/ai-tutor/ConversationSidebar'
import { AITutorHeader } from '../../components/ai-tutor/AITutorHeader'
import { AITutorEmptyState } from '../../components/ai-tutor/AITutorEmptyState'
import { ChatMessageList } from '../../components/ai-tutor/ChatMessageList'
import { ChatComposer } from '../../components/ai-tutor/ChatComposer'
import { ContextualHeaderBadge } from '../../components/ai-tutor/ContextualHeaderBadge'
import './AITutorPage.css'

export function AITutorPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const topicParam = searchParams.get('topic')
  const lessonParam = searchParams.get('lesson')
  const legacyContextTopic = topicParam || (lessonParam ? `Bài học #${lessonParam}` : undefined)

  const {
    conversations,
    activeConversation,
    activeSubject,
    activeContext,
    activeMode,
    isStreaming,
    isTyping,
    error,
    prefilledInput,
    setPrefilledInput,
    setAssistanceMode,
    clearLearningContext,
    selectConversation,
    startNewConversation,
    deleteConversation,
    selectSubject,
    sendMessage,
    retryLastMessage,
    stopStreaming,
  } = useAITutor()

  const handleClearContext = () => {
    clearLearningContext()
    const next = new URLSearchParams(searchParams)
    next.delete('topic')
    next.delete('lesson')
    setSearchParams(next, { replace: true })
  }

  const { containerRef, isAtBottom, scrollToBottom } = useAutoScroll()
  const [isMobileHistoryOpen, setIsMobileHistoryOpen] = useState(false)

  const handleSelectPrompt = (prompt: string, subject?: string) => {
    if (subject) {
      selectSubject(subject)
    }
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

        {/* Phase 8 Contextual Learning Header Badge */}
        {activeContext && (
          <ContextualHeaderBadge
            context={activeContext}
            onClearContext={handleClearContext}
          />
        )}

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
          contextTopic={activeContext ? undefined : legacyContextTopic}
          onClearContext={handleClearContext}
          activeMode={activeMode}
          onSelectMode={setAssistanceMode}
        />
      </main>
    </div>
  )
}
export default AITutorPage

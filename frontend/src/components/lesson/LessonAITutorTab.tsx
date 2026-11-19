import React, { useCallback, useEffect, useMemo, useState } from 'react'
import {
  Bot,
  HelpCircle,
  Lightbulb,
  Maximize2,
  RotateCcw,
  Send,
  Sparkles,
  User,
} from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/Button'
import { aiTutorService } from '@/services/aiTutor.service'
import { learningContextService } from '@/services/learningContext.service'
import type { ChatMessage, TutorLearningContext } from '@/types/aiTutor'
import './LessonAITutorTab.css'

export interface LessonAITutorTabProps {
  lessonId: string
  subjectId: string
  lessonTitle: string
  subjectName: string
  chapterTitle?: string
}

export const LessonAITutorTab: React.FC<LessonAITutorTabProps> = ({
  lessonId,
  subjectId,
  lessonTitle,
  subjectName,
  chapterTitle,
}) => {
  const navigate = useNavigate()
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [inputValue, setInputValue] = useState('')
  const [isStreaming, setIsStreaming] = useState(false)
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null)

  const learningContext: TutorLearningContext = useMemo(
    () => ({
      source: 'lesson-section',
      title: `Bài học: ${lessonTitle}`,
      lessonId,
      subjectId,
      lessonTitle,
      subjectName,
      sectionTitle: chapterTitle,
      returnUrl: `/subjects/${subjectId}/lessons/${lessonId}`,
    }),
    [lessonId, subjectId, lessonTitle, subjectName, chapterTitle]
  )

  // Pre-configured pedagogical Socratic prompts for this lesson
  const quickPrompts = [
    {
      id: 'p1',
      icon: Lightbulb,
      label: 'Giải thích trực quan',
      prompt: `Hãy giải thích trực quan, dễ hiểu nhất về nội dung bài học "${lessonTitle}".`,
    },
    {
      id: 'p2',
      icon: Sparkles,
      label: 'Hướng dẫn từng bước',
      prompt: `Hướng dẫn tôi phương pháp giải từng bước các dạng bài tập trọng tâm của bài "${lessonTitle}".`,
    },
    {
      id: 'p3',
      icon: HelpCircle,
      label: 'Kiểm tra mức độ hiểu bài',
      prompt: `Hãy đóng vai giáo viên Socratic, đặt cho tôi một câu hỏi kiểm tra nhanh để xem tôi đã thực sự nắm vững bài "${lessonTitle}" chưa.`,
    },
    {
      id: 'p4',
      icon: RotateCcw,
      label: 'Bẫy đề thi hay gặp',
      prompt: `Các lỗi sai và bẫy đề thi học sinh hay mắc phải nhất ở bài "${lessonTitle}" là gì?`,
    },
  ]

  // Initialize conversation with welcome message
  useEffect(() => {
    let isMounted = true
    const init = async () => {
      try {
        const conv = await aiTutorService.createConversation(
          subjectId,
          `Trợ giúp bài học: ${lessonTitle}`,
          learningContext,
          'explain'
        )
        if (isMounted) {
          setActiveConversationId(conv.id)
          setMessages([
            {
              id: 'msg-welcome',
              role: 'assistant',
              content: `Xin chào! Tôi là **AI Tutor Socratic** của bạn cho bài học **"${lessonTitle}"** (${subjectName}).\n\nTôi sẵn sàng hướng dẫn bạn tìm hiểu sâu lý thuyết, giải thích công thức, chỉ ra bẫy đề thi hoặc cùng bạn giải từng bước bài tập. Bạn muốn khám phá phần nào trước?`,
              createdAt: new Date().toISOString(),
              learningContextSnapshot: learningContext,
            },
          ])
        }
      } catch {
        if (isMounted) {
          setMessages([
            {
              id: 'msg-welcome-fallback',
              role: 'assistant',
              content: `Xin chào! Tôi là **AI Tutor** cho bài **${lessonTitle}**. Bạn có thắc mắc gì về bài học này không?`,
              createdAt: new Date().toISOString(),
            },
          ])
        }
      }
    }
    init()
    return () => {
      isMounted = false
    }
  }, [lessonId, subjectId, lessonTitle, subjectName, learningContext])

  const handleSendMessage = useCallback(
    async (textToSend?: string) => {
      const text = (textToSend || inputValue).trim()
      if (!text || isStreaming || !activeConversationId) return

      setInputValue('')
      const userMsg: ChatMessage = {
        id: `usr-${Date.now()}`,
        role: 'user',
        content: text,
        createdAt: new Date().toISOString(),
      }

      setMessages((prev) => [...prev, userMsg])
      setIsStreaming(true)

      const assistantMsgId = `asst-${Date.now()}`
      let streamedContent = ''

      try {
        await aiTutorService.sendMessageStream(
          {
            conversationId: activeConversationId,
            message: text,
            subject: subjectId,
            learningContext,
            mode: 'step-by-step',
          },
          (chunk: string) => {
            streamedContent += chunk
            setMessages((prev) => {
              const last = prev[prev.length - 1]
              if (last && last.id === assistantMsgId) {
                return prev.map((m) => (m.id === assistantMsgId ? { ...m, content: streamedContent } : m))
              }
              return [
                ...prev,
                {
                  id: assistantMsgId,
                  role: 'assistant',
                  content: streamedContent,
                  createdAt: new Date().toISOString(),
                },
              ]
            })
          }
        )
      } catch {
        setMessages((prev) => [
          ...prev,
          {
            id: assistantMsgId,
            role: 'assistant',
            content: 'Xin lỗi, đã có lỗi kết nối với AI Tutor. Vui lòng thử lại sau ít giây.',
            createdAt: new Date().toISOString(),
          },
        ])
      } finally {
        setIsStreaming(false)
      }
    },
    [inputValue, isStreaming, activeConversationId, subjectId, learningContext]
  )

  const handleOpenFullscreenChat = () => {
    learningContextService.setContext(learningContext)
    navigate('/ai-tutor')
  }

  return (
    <div className="lesson-ai-tutor-container">
      {/* Top Header */}
      <div className="ai-tutor-tab-header">
        <div className="ai-header-left">
          <div className="ai-avatar-badge">
            <Bot size={18} aria-hidden />
          </div>
          <div>
            <h3 className="ai-header-title">Trợ lý AI Socratic · {lessonTitle}</h3>
            <p className="ai-header-subtitle">
              Hướng dẫn từng bước, gợi ý phương pháp giải toán, không làm hộ bài tập
            </p>
          </div>
        </div>

        <button
          type="button"
          className="btn-open-fullscreen-ai"
          onClick={handleOpenFullscreenChat}
          title="Mở toàn màn hình AI Tutor"
        >
          <Maximize2 size={15} aria-hidden />
          <span>Mở không gian AI Tutor đầy đủ</span>
        </button>
      </div>

      {/* Quick Prompts Bar */}
      <div className="ai-quick-prompts-row scrollbar-clean">
        {quickPrompts.map((p) => {
          const Icon = p.icon
          return (
            <button
              key={p.id}
              type="button"
              className="quick-prompt-pill"
              onClick={() => handleSendMessage(p.prompt)}
              disabled={isStreaming}
            >
              <Icon size={14} className="prompt-icon" aria-hidden />
              <span>{p.label}</span>
            </button>
          )
        })}
      </div>

      {/* Messages Thread */}
      <div className="ai-messages-thread scrollbar-clean">
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`ai-message-bubble-row ${msg.role === 'user' ? 'is-user' : 'is-assistant'}`}
          >
            <div className="message-sender-avatar" aria-hidden>
              {msg.role === 'user' ? <User size={14} /> : <Bot size={15} />}
            </div>
            <div className="message-bubble-content">
              <div className="message-markdown-text">
                {msg.content.split('\n\n').map((paragraph, pIdx) => (
                  <p key={pIdx}>{paragraph}</p>
                ))}
              </div>
            </div>
          </div>
        ))}
        {isStreaming && (
          <div className="ai-typing-indicator">
            <span className="dot" />
            <span className="dot" />
            <span className="dot" />
          </div>
        )}
      </div>

      {/* Composer Input Bar */}
      <form
        className="ai-composer-form"
        onSubmit={(e) => {
          e.preventDefault()
          handleSendMessage()
        }}
      >
        <input
          type="text"
          className="ai-composer-input"
          placeholder="Hỏi AI Tutor về khái niệm, công thức hoặc cách giải bài tập này..."
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          disabled={isStreaming}
        />
        <Button
          type="submit"
          variant="primary"
          size="sm"
          icon={Send}
          disabled={!inputValue.trim() || isStreaming}
        >
          Gửi
        </Button>
      </form>
    </div>
  )
}
export default LessonAITutorTab

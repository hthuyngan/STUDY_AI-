import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from 'react'
import { useLocation } from 'react-router-dom'
import { aiTutorService, type AiProviderStatus } from '@/services/aiTutor.service'
import type {
  ChatConversation,
  ChatMessage,
  TutorLearningContext,
  LearningAssistanceMode,
} from '@/types/aiTutor'

export interface AiChatContextValue {
  isOpen: boolean
  isMinimized: boolean
  openChat: (customContext?: TutorLearningContext, suggestedPrompt?: string) => void
  closeChat: () => void
  toggleChat: () => void
  toggleMinimize: () => void
  activeConversation: ChatConversation | null
  messages: ChatMessage[]
  isStreaming: boolean
  error: string | null
  learningContext: TutorLearningContext | null
  setLearningContext: (context: TutorLearningContext | null) => void
  providerStatus: AiProviderStatus | null
  sendMessage: (text: string, mode?: LearningAssistanceMode) => Promise<void>
  cancelProcessing: () => void
  startNewConversation: () => Promise<void>
  clearError: () => void
  injectedPrompt?: string
  clearInjectedPrompt: () => void
}

const AiChatContext = createContext<AiChatContextValue | null>(null)

export function useAiChat(): AiChatContextValue {
  const context = useContext(AiChatContext)
  if (!context) {
    return {
      isOpen: false,
      isMinimized: false,
      openChat: () => {},
      closeChat: () => {},
      toggleChat: () => {},
      toggleMinimize: () => {},
      activeConversation: null,
      messages: [],
      isStreaming: false,
      error: null,
      learningContext: null,
      setLearningContext: () => {},
      providerStatus: null,
      sendMessage: async () => {},
      cancelProcessing: () => {},
      startNewConversation: async () => {},
      clearError: () => {},
      clearInjectedPrompt: () => {},
    }
  }
  return context
}

export interface AiChatProviderProps {
  children: React.ReactNode
}

export function AiChatProvider({ children }: AiChatProviderProps) {
  const location = useLocation()
  const [isOpen, setIsOpen] = useState(false)
  const [isMinimized, setIsMinimized] = useState(false)
  const [activeConversation, setActiveConversation] = useState<ChatConversation | null>(null)
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [isStreaming, setIsStreaming] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [learningContext, setLearningContextState] = useState<TutorLearningContext | null>(null)
  const [providerStatus, setProviderStatus] = useState<AiProviderStatus | null>(null)
  const [injectedPrompt, setInjectedPrompt] = useState<string | undefined>(undefined)

  const abortControllerRef = useRef<AbortController | null>(null)
  const explicitContextRef = useRef<TutorLearningContext | null>(null)

  // 1. Fetch provider status on mount and window focus
  const checkStatus = useCallback(async () => {
    try {
      const status = await aiTutorService.getProviderStatus()
      setProviderStatus(status)
    } catch {
      setProviderStatus({
        provider: 'unconfigured',
        displayName: 'AI chưa sẵn sàng',
        isReady: false,
        model: null,
      })
    }
  }, [])

  useEffect(() => {
    checkStatus()
    window.addEventListener('focus', checkStatus)
    return () => window.removeEventListener('focus', checkStatus)
  }, [checkStatus])

  // 2. Derive route context automatically when explicit context is not overriding
  useEffect(() => {
    const pathname = location.pathname

    if (explicitContextRef.current) {
      setLearningContextState(explicitContextRef.current)
      return
    }

    if (pathname.includes('/lessons/')) {
      const match = pathname.match(/\/subjects\/([^/]+)\/lessons\/([^/]+)/)
      if (match) {
        setLearningContextState({
          source: 'lesson-section',
          subjectId: match[1],
          lessonId: match[2],
          pageType: 'lesson',
          title: 'Bài học Toán 12',
        } as TutorLearningContext)
        return
      }
    }

    if (pathname.startsWith('/subjects')) {
      setLearningContextState({
        source: 'curriculum',
        pageType: 'curriculum',
        subjectName: 'Toán học',
        grade: '12',
        textbook: 'Kết nối tri thức với cuộc sống',
        title: 'Giáo trình Toán 12',
      } as TutorLearningContext)
      return
    }

    if (pathname.startsWith('/practice')) {
      setLearningContextState({
        source: 'practice',
        pageType: 'practice',
        title: 'Luyện tập Toán 12',
      } as TutorLearningContext)
      return
    }

    if (pathname.startsWith('/smart-review') || pathname.startsWith('/knowledge-gaps')) {
      setLearningContextState({
        source: 'review_wrong',
        pageType: 'review_wrong',
        title: 'Ôn tập câu sai & Lỗ hổng kiến thức',
      } as TutorLearningContext)
      return
    }

    // Default general context
    setLearningContextState(null)
  }, [location.pathname])

  const setLearningContext = useCallback((ctx: TutorLearningContext | null) => {
    explicitContextRef.current = ctx
    setLearningContextState(ctx)
  }, [])

  const clearInjectedPrompt = useCallback(() => {
    setInjectedPrompt(undefined)
  }, [])

  const openChat = useCallback((customContext?: TutorLearningContext, suggestedPrompt?: string) => {
    if (customContext) {
      explicitContextRef.current = customContext
      setLearningContextState(customContext)
    }
    if (suggestedPrompt) {
      setInjectedPrompt(suggestedPrompt)
    }
    setIsOpen(true)
    setIsMinimized(false)
  }, [])

  const closeChat = useCallback(() => {
    setIsOpen(false)
  }, [])

  const toggleChat = useCallback(() => {
    setIsOpen((prev) => !prev)
    setIsMinimized(false)
  }, [])

  const toggleMinimize = useCallback(() => {
    setIsMinimized((prev) => !prev)
  }, [])

  const clearError = useCallback(() => {
    setError(null)
  }, [])

  const cancelProcessing = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
      abortControllerRef.current = null
    }
    setIsStreaming(false)
  }, [])

  const startNewConversation = useCallback(async () => {
    cancelProcessing()
    setError(null)
    try {
      const conv = await aiTutorService.createConversation(
        learningContext?.subjectId || 'math',
        learningContext?.title || 'Cuộc trò chuyện mới',
        learningContext || undefined,
        'explain'
      )
      setActiveConversation(conv)
      setMessages([])
    } catch {
      setActiveConversation(null)
      setMessages([])
    }
  }, [cancelProcessing, learningContext])

  const sendMessage = useCallback(
    async (text: string, mode: LearningAssistanceMode = 'explain') => {
      const trimmed = text.trim()
      if (!trimmed || isStreaming) return

      setError(null)
      setIsStreaming(true)

      const userMsgId = `user_${Date.now()}`
      const assistantMsgId = `assistant_${Date.now()}`
      const now = new Date().toISOString()

      const userMsg: ChatMessage = {
        id: userMsgId,
        role: 'user',
        content: trimmed,
        createdAt: now,
        status: 'done',
        assistanceMode: mode,
        learningContextSnapshot: learningContext || undefined,
      }

      setMessages((prev) => [...prev, userMsg])

      // Placeholder for streaming assistant response
      const assistantMsgPlaceholder: ChatMessage = {
        id: assistantMsgId,
        role: 'assistant',
        content: '',
        createdAt: now,
        status: 'streaming',
        assistanceMode: mode,
        learningContextSnapshot: learningContext || undefined,
      }

      setMessages((prev) => [...prev, assistantMsgPlaceholder])

      const controller = new AbortController()
      abortControllerRef.current = controller

      try {
        let convId = activeConversation?.id

        if (!convId) {
          const newConv = await aiTutorService.createConversation(
            learningContext?.subjectId || 'math',
            trimmed.slice(0, 36) + (trimmed.length > 36 ? '...' : ''),
            learningContext || undefined,
            mode
          )
          setActiveConversation(newConv)
          convId = newConv.id
        }

        let accumulatedContent = ''

        const finalMsg = await aiTutorService.sendMessageStream(
          {
            conversationId: convId,
            message: trimmed,
            mode,
            learningContext: learningContext || undefined,
          },
          (chunk) => {
            accumulatedContent += chunk
            setMessages((prev) =>
              prev.map((m) =>
                m.id === assistantMsgId
                  ? { ...m, content: accumulatedContent, status: 'streaming' }
                  : m
              )
            )
          },
          controller.signal
        )

        setMessages((prev) =>
          prev.map((m) =>
            m.id === assistantMsgId
              ? {
                  ...m,
                  content: finalMsg.content || accumulatedContent,
                  suggestedActions: finalMsg.suggestedActions || [],
                  status: 'done',
                }
              : m
          )
        )
      } catch (err: any) {
        if (controller.signal.aborted) {
          setMessages((prev) =>
            prev.map((m) =>
              m.id === assistantMsgId
                ? { ...m, content: m.content || '(Đã hủy yêu cầu)', status: 'done' }
                : m
            )
          )
        } else {
          const msg = err?.message || 'Không thể nhận phản hồi từ AI Tutor.'
          setError(msg)
          setMessages((prev) =>
            prev.map((m) =>
              m.id === assistantMsgId
                ? { ...m, content: `⚠️ Lỗi: ${msg}`, status: 'error' }
                : m
            )
          )
        }
      } finally {
        setIsStreaming(false)
        abortControllerRef.current = null
      }
    },
    [activeConversation, isStreaming, learningContext]
  )

  const value: AiChatContextValue = {
    isOpen,
    isMinimized,
    openChat,
    closeChat,
    toggleChat,
    toggleMinimize,
    activeConversation,
    messages,
    isStreaming,
    error,
    learningContext,
    setLearningContext,
    providerStatus,
    sendMessage,
    cancelProcessing,
    startNewConversation,
    clearError,
    injectedPrompt,
    clearInjectedPrompt,
  }

  return <AiChatContext.Provider value={value}>{children}</AiChatContext.Provider>
}


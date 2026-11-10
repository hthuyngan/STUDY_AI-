import { useCallback, useEffect, useRef, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import type {
  ChatConversation,
  ChatMessage,
  LearningAssistanceMode,
  TutorLearningContext,
} from '../types/aiTutor'
import { aiTutorService } from '../services/aiTutor.service'
import {
  learningContextService,
  LEARNING_CONTEXT_CHANGED_EVENT,
} from '../services/learningContext.service'
import { SUGGESTED_PROMPTS } from '../data/aiTutor.mock'

export function useAITutor() {
  const [searchParams, setSearchParams] = useSearchParams()
  const [conversations, setConversations] = useState<ChatConversation[]>([])
  const [activeConversation, setActiveConversation] = useState<ChatConversation | null>(null)

  // Learning Context and Assistance Mode
  const [activeContext, setActiveContext] = useState<TutorLearningContext | null>(() =>
    learningContextService.getContext()
  )
  const [activeMode, setActiveMode] = useState<LearningAssistanceMode>('explain')

  const [activeSubject, setActiveSubject] = useState<string>(() => {
    const promptParam = searchParams.get('prompt')
    if (promptParam) {
      const matched = SUGGESTED_PROMPTS.find(
        (p) => p.id === promptParam || p.title.toLowerCase().includes(promptParam.toLowerCase())
      )
      if (matched?.subject) return matched.subject
    }
    const initialCtx = learningContextService.getContext()
    if (initialCtx?.subjectId) return initialCtx.subjectId
    return 'all'
  })

  const [isStreaming, setIsStreaming] = useState(false)
  const [isTyping, setIsTyping] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [prefilledInput, setPrefilledInput] = useState<string>(() => {
    const promptParam = searchParams.get('prompt')
    if (promptParam) {
      const matched = SUGGESTED_PROMPTS.find(
        (p) => p.id === promptParam || p.title.toLowerCase().includes(promptParam.toLowerCase())
      )
      if (matched) return matched.prompt
      return decodeURIComponent(promptParam.replace(/-/g, ' '))
    }
    const initialCtx = learningContextService.getContext()
    if (initialCtx) {
      return learningContextService.buildDefaultPrompt(initialCtx, 'explain')
    }
    return ''
  })

  const [lastPromptParam, setLastPromptParam] = useState(() => searchParams.get('prompt'))

  const currentPromptParam = searchParams.get('prompt')
  if (currentPromptParam && currentPromptParam !== lastPromptParam) {
    setLastPromptParam(currentPromptParam)
    const matched = SUGGESTED_PROMPTS.find(
      (p) =>
        p.id === currentPromptParam ||
        p.title.toLowerCase().includes(currentPromptParam.toLowerCase())
    )
    if (matched) {
      setPrefilledInput(matched.prompt)
      if (matched.subject) {
        setActiveSubject(matched.subject)
      }
    } else {
      setPrefilledInput(decodeURIComponent(currentPromptParam.replace(/-/g, ' ')))
    }
  }

  const lastUserMessageRef = useRef<string | null>(null)
  const abortControllerRef = useRef<AbortController | null>(null)
  const activeConversationRef = useRef(activeConversation)
  const activeSubjectRef = useRef(activeSubject)
  const activeContextRef = useRef(activeContext)
  const activeModeRef = useRef(activeMode)

  useEffect(() => {
    activeConversationRef.current = activeConversation
    activeSubjectRef.current = activeSubject
    activeContextRef.current = activeContext
    activeModeRef.current = activeMode
  }, [activeConversation, activeSubject, activeContext, activeMode])

  // Listen to learning context changes across app
  useEffect(() => {
    const handleContextChange = (e: Event) => {
      const customEvent = e as CustomEvent<TutorLearningContext | null>
      const newCtx = customEvent.detail
      setActiveContext(newCtx)
      if (newCtx?.subjectId) {
        setActiveSubject(newCtx.subjectId)
      }
      if (newCtx) {
        setPrefilledInput(learningContextService.buildDefaultPrompt(newCtx, activeModeRef.current))
      }
    }

    window.addEventListener(LEARNING_CONTEXT_CHANGED_EVENT, handleContextChange)
    return () => {
      window.removeEventListener(LEARNING_CONTEXT_CHANGED_EVENT, handleContextChange)
    }
  }, [])

  // Load conversations on mount
  useEffect(() => {
    let mounted = true
    aiTutorService.getConversations().then(async (list) => {
      if (!mounted) return
      setConversations(list)
      // Pick first active conversation if available, or create new
      if (list.length > 0 && !activeConversationRef.current) {
        const first = list[0]
        let fullFirst = first
        try {
          const detail = await aiTutorService.getConversationById(first.id)
          if (detail) fullFirst = detail
        } catch {
          // use summary if detail fails
        }
        if (!mounted) return
        setActiveConversation(fullFirst)
        setActiveSubject(fullFirst.subject || 'all')
        if (fullFirst.assistanceMode) {
          setActiveMode(fullFirst.assistanceMode)
        }
        if (fullFirst.learningContext && !activeContextRef.current) {
          setActiveContext(fullFirst.learningContext)
        }
      }
    }).catch((err) => {
      if (mounted) setError(err?.message || 'Không thể tải danh sách cuộc trò chuyện.')
    })
    return () => {
      mounted = false
    }
  }, [])

  // Clean URL search param prompt so refresh/back doesn't re-populate
  useEffect(() => {
    if (searchParams.has('prompt')) {
      const newParams = new URLSearchParams(searchParams)
      newParams.delete('prompt')
      setSearchParams(newParams, { replace: true })
    }
  }, [searchParams, setSearchParams])

  const selectConversation = useCallback(
    async (id: string) => {
      if (isStreaming) {
        abortControllerRef.current?.abort()
        setIsStreaming(false)
      }
      setError(null)
      let conv = conversations.find((c) => c.id === id) || null
      try {
        const detail = await aiTutorService.getConversationById(id)
        if (detail) conv = detail
      } catch {
        // use summary
      }
      if (conv) {
        setActiveConversation(conv)
        setActiveSubject(conv.subject || 'all')
        if (conv.assistanceMode) {
          setActiveMode(conv.assistanceMode)
        }
        if (conv.learningContext) {
          setActiveContext(conv.learningContext)
        }
      }
    },
    [conversations, isStreaming]
  )

  const startNewConversation = useCallback(
    async (subject?: string) => {
      if (isStreaming) {
        abortControllerRef.current?.abort()
        setIsStreaming(false)
      }
      setError(null)
      const targetSubject = subject || activeSubject
      const newConv = await aiTutorService.createConversation(
        targetSubject,
        undefined,
        activeContext || undefined,
        activeMode
      )
      setConversations((prev) => [newConv, ...prev])
      setActiveConversation(newConv)
    },
    [activeSubject, activeContext, activeMode, isStreaming]
  )

  const deleteConversation = useCallback(
    async (id: string) => {
      await aiTutorService.deleteConversation(id)
      setConversations((prev) => {
        const remaining = prev.filter((c) => c.id !== id)
        if (activeConversation?.id === id) {
          setActiveConversation(remaining[0] || null)
        }
        return remaining
      })
    },
    [activeConversation]
  )

  const stopStreaming = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
      abortControllerRef.current = null
    }
    setIsStreaming(false)
    setIsTyping(false)
  }, [])

  const setAssistanceMode = useCallback(
    (mode: LearningAssistanceMode) => {
      setActiveMode(mode)
      if (activeContext) {
        // Refresh prompt suggestion if input is currently clean/unmodified
        const currentSuggestion = learningContextService.buildDefaultPrompt(activeContext, activeModeRef.current)
        if (!prefilledInput || prefilledInput === currentSuggestion) {
          setPrefilledInput(learningContextService.buildDefaultPrompt(activeContext, mode))
        }
      }
      if (activeConversation) {
        setActiveConversation((prev) => (prev ? { ...prev, assistanceMode: mode } : prev))
      }
    },
    [activeContext, activeConversation, prefilledInput]
  )

  const clearLearningContext = useCallback(() => {
    learningContextService.clearContext()
    setActiveContext(null)
    setPrefilledInput('')
  }, [])

  const sendMessage = useCallback(
    async (content: string) => {
      const trimmed = content.trim()
      if (!trimmed || isStreaming) return

      setError(null)
      lastUserMessageRef.current = trimmed

      // Ensure we have an active conversation
      let targetConv = activeConversationRef.current
      if (!targetConv) {
        targetConv = await aiTutorService.createConversation(
          activeSubjectRef.current,
          trimmed.slice(0, 32) + (trimmed.length > 32 ? '...' : ''),
          activeContextRef.current || undefined,
          activeModeRef.current
        )
        setConversations((prev) => [targetConv!, ...prev])
        setActiveConversation(targetConv)
      }

      const userMsgId = `usr-${Date.now()}`
      const userMessage: ChatMessage = {
        id: userMsgId,
        role: 'user',
        content: trimmed,
        createdAt: new Date().toISOString(),
        status: 'done',
        learningContextSnapshot: activeContextRef.current || undefined,
        assistanceMode: activeModeRef.current,
      }

      const assistantMsgId = `ast-${Date.now()}`
      const assistantPlaceholder: ChatMessage = {
        id: assistantMsgId,
        role: 'assistant',
        content: '',
        createdAt: new Date().toISOString(),
        status: 'streaming',
        learningContextSnapshot: activeContextRef.current || undefined,
        assistanceMode: activeModeRef.current,
      }

      // Append user message and streaming placeholder to active conversation
      const updatedMessages = [...targetConv.messages, userMessage, assistantPlaceholder]
      const updatedConv: ChatConversation = {
        ...targetConv,
        messages: updatedMessages,
        title:
          targetConv.messages.length === 0
            ? trimmed.slice(0, 36) + (trimmed.length > 36 ? '...' : '')
            : targetConv.title,
        updatedAt: new Date().toISOString(),
        learningContext: targetConv.learningContext || activeContextRef.current || undefined,
        assistanceMode: activeModeRef.current,
      }

      setActiveConversation(updatedConv)
      setConversations((prev) =>
        prev.map((c) => (c.id === updatedConv.id ? updatedConv : c))
      )

      // Persist user message to storage
      await aiTutorService.appendMessage(targetConv.id, userMessage)

      setIsTyping(true)
      setIsStreaming(true)

      const abortController = new AbortController()
      abortControllerRef.current = abortController

      try {
        await aiTutorService.sendMessageStream(
          {
            conversationId: targetConv.id,
            message: trimmed,
            subject: activeSubjectRef.current,
            learningContext: activeContextRef.current || undefined,
            mode: activeModeRef.current,
          },
          (streamedText) => {
            setIsTyping(false)
            setActiveConversation((prev) => {
              if (!prev) return prev
              const msgs = prev.messages.map((m) =>
                m.id === assistantMsgId
                  ? { ...m, content: streamedText, status: 'streaming' as const }
                  : m
              )
              return { ...prev, messages: msgs }
            })
          },
          abortController.signal
        )

        // Mark assistant message as done
        setActiveConversation((prev) => {
          if (!prev) return prev
          const msgs = prev.messages.map((m) =>
            m.id === assistantMsgId ? { ...m, status: 'done' as const } : m
          )
          const finalized = { ...prev, messages: msgs }
          setConversations((all) => all.map((c) => (c.id === finalized.id ? finalized : c)))
          return finalized
        })
      } catch (err: unknown) {
        if (err instanceof DOMException && err.name === 'AbortError') {
          setActiveConversation((prev) => {
            if (!prev) return prev
            const msgs = prev.messages.map((m) =>
              m.id === assistantMsgId ? { ...m, status: 'done' as const } : m
            )
            return { ...prev, messages: msgs }
          })
        } else {
          setError((err as Error)?.message || 'Không thể tạo câu trả lời. Vui lòng thử lại.')
          setActiveConversation((prev) => {
            if (!prev) return prev
            const msgs = prev.messages.map((m) =>
              m.id === assistantMsgId ? { ...m, status: 'error' as const } : m
            )
            return { ...prev, messages: msgs }
          })
        }
      } finally {
        setIsStreaming(false)
        setIsTyping(false)
        abortControllerRef.current = null
      }
    },
    [isStreaming]
  )

  const retryLastMessage = useCallback(async () => {
    if (!lastUserMessageRef.current || isStreaming) return
    if (activeConversation) {
      const cleaned = activeConversation.messages.filter((m) => m.status !== 'error')
      setActiveConversation({ ...activeConversation, messages: cleaned })
    }
    await sendMessage(lastUserMessageRef.current)
  }, [activeConversation, isStreaming, sendMessage])

  const selectSubject = useCallback((subject: string) => {
    setActiveSubject(subject)
    setActiveConversation((prev) => (prev ? { ...prev, subject } : prev))
  }, [])

  return {
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
  }
}

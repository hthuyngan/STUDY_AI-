import { useCallback, useEffect, useRef, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import type { ChatConversation, ChatMessage } from '../types/aiTutor'
import { aiTutorService } from '../services/aiTutor.service'
import { SUGGESTED_PROMPTS } from '../data/aiTutor.mock'

export function useAITutor() {
  const [searchParams, setSearchParams] = useSearchParams()
  const [conversations, setConversations] = useState<ChatConversation[]>([])
  const [activeConversation, setActiveConversation] = useState<ChatConversation | null>(null)
  const [activeSubject, setActiveSubject] = useState<string>(() => {
    const promptParam = searchParams.get('prompt')
    if (promptParam) {
      const matched = SUGGESTED_PROMPTS.find(
        (p) => p.id === promptParam || p.title.toLowerCase().includes(promptParam.toLowerCase())
      )
      if (matched?.subject) return matched.subject
    }
    return 'all'
  })
  const [isStreaming, setIsStreaming] = useState(false)
  const [isTyping, setIsTyping] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [prefilledInput, setPrefilledInput] = useState<string>(() => {
    const promptParam = searchParams.get('prompt')
    if (!promptParam) return ''
    const matched = SUGGESTED_PROMPTS.find(
      (p) => p.id === promptParam || p.title.toLowerCase().includes(promptParam.toLowerCase())
    )
    if (matched) return matched.prompt
    return decodeURIComponent(promptParam.replace(/-/g, ' '))
  })
  const [lastPromptParam, setLastPromptParam] = useState(() => searchParams.get('prompt'))

  const currentPromptParam = searchParams.get('prompt')
  if (currentPromptParam && currentPromptParam !== lastPromptParam) {
    setLastPromptParam(currentPromptParam)
    const matched = SUGGESTED_PROMPTS.find(
      (p) => p.id === currentPromptParam || p.title.toLowerCase().includes(currentPromptParam.toLowerCase())
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

  useEffect(() => {
    activeConversationRef.current = activeConversation
    activeSubjectRef.current = activeSubject
  }, [activeConversation, activeSubject])

  // Load conversations on mount
  useEffect(() => {
    let mounted = true
    aiTutorService.getConversations().then((list) => {
      if (!mounted) return
      setConversations(list)
      // Pick first active conversation if available, or create new
      if (list.length > 0 && !activeConversationRef.current) {
        setActiveConversation(list[0])
        setActiveSubject(list[0].subject || 'all')
      }
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
      const conv = conversations.find((c) => c.id === id)
      if (conv) {
        setActiveConversation(conv)
        setActiveSubject(conv.subject || 'all')
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
      const newConv = await aiTutorService.createConversation(targetSubject)
      setConversations((prev) => [newConv, ...prev])
      setActiveConversation(newConv)
    },
    [activeSubject, isStreaming]
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
          trimmed.slice(0, 32) + (trimmed.length > 32 ? '...' : '')
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
      }

      const assistantMsgId = `ast-${Date.now()}`
      const assistantPlaceholder: ChatMessage = {
        id: assistantMsgId,
        role: 'assistant',
        content: '',
        createdAt: new Date().toISOString(),
        status: 'streaming',
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
      }

      setActiveConversation(updatedConv)
      setConversations((prev) =>
        prev.map((c) => (c.id === updatedConv.id ? updatedConv : c))
      )

      setIsTyping(true)
      setIsStreaming(true)

      const abortController = new AbortController()
      abortControllerRef.current = abortController

      try {
        await aiTutorService.sendMessageStream(
          {
            conversationId: targetConv.id,
            message: trimmed,
            subject: activeSubject,
          },
          (streamedText) => {
            setIsTyping(false)
            setActiveConversation((prev) => {
              if (!prev) return prev
              const msgs = prev.messages.map((m) =>
                m.id === assistantMsgId ? { ...m, content: streamedText, status: 'streaming' as const } : m
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
          // Message aborted by user, mark assistant message done with partial content
          setActiveConversation((prev) => {
            if (!prev) return prev
            const msgs = prev.messages.map((m) =>
              m.id === assistantMsgId ? { ...m, status: 'done' as const } : m
            )
            return { ...prev, messages: msgs }
          })
        } else {
          // Actual network / server failure
          setError((err as Error)?.message || 'Không thể tạo câu trả lời. Vui lòng thử lại.')
          // Mark assistant placeholder as error
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
    [activeSubject, isStreaming]
  )

  const retryLastMessage = useCallback(async () => {
    if (!lastUserMessageRef.current || isStreaming) return
    // Remove last error assistant message and re-send
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
  }
}

import { renderHook, act, waitFor } from '@testing-library/react'
import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest'
import { MemoryRouter } from 'react-router-dom'
import type { ReactNode } from 'react'
import { useAITutor } from './useAITutor'
import { aiTutorService, LEGACY_AI_CONVERSATIONS_KEY } from '../services/aiTutor.service'
import type { ChatMessage, ChatConversation } from '../types/aiTutor'

function wrapper({ children }: { children: ReactNode }) {
  return <MemoryRouter>{children}</MemoryRouter>
}

const TEST_INITIAL_CONVERSATION: ChatConversation = {
  id: 'conv-test-init',
  title: 'Cuộc trò chuyện khởi tạo',
  subject: 'toan-12',
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  messages: [],
}

describe('useAITutor Hook', () => {
  beforeEach(() => {
    localStorage.setItem(LEGACY_AI_CONVERSATIONS_KEY, JSON.stringify([TEST_INITIAL_CONVERSATION]))
    localStorage.setItem('study_ai_guest_ai_conversations', JSON.stringify([TEST_INITIAL_CONVERSATION]))
  })

  afterEach(() => {
    localStorage.clear()
    vi.restoreAllMocks()
  })

  it('initializes with existing conversations and first active conversation', async () => {
    const { result } = renderHook(() => useAITutor(), { wrapper })

    await waitFor(() => {
      expect(result.current.conversations.length).toBeGreaterThan(0)
      expect(result.current.activeConversation).not.toBeNull()
    }, { timeout: 3000 })
  })

  it('initializes cleanly with empty state when no saved conversations exist', async () => {
    localStorage.clear()
    const { result } = renderHook(() => useAITutor(), { wrapper })

    await waitFor(() => {
      expect(result.current.conversations).toEqual([])
      expect(result.current.activeConversation).toBeNull()
    })
  })

  it('allows starting a new conversation', async () => {
    const { result } = renderHook(() => useAITutor(), { wrapper })

    await waitFor(() => {
      expect(result.current.conversations.length).toBeGreaterThan(0)
    }, { timeout: 3000 })

    const initialCount = result.current.conversations.length

    await act(async () => {
      await result.current.startNewConversation('toan-12')
    })

    expect(result.current.conversations.length).toBe(initialCount + 1)
    expect(result.current.activeConversation?.subject).toBe('toan-12')
    expect(result.current.activeConversation?.messages).toEqual([])
  })

  it('streams response chunks when a user sends a message', async () => {
    const { result } = renderHook(() => useAITutor(), { wrapper })

    await act(async () => {
      await new Promise((r) => setTimeout(r, 120))
      await result.current.startNewConversation()
    })

    await act(async () => {
      const sendPromise = result.current.sendMessage('Giải thích đạo hàm cực trị')
      await new Promise((r) => setTimeout(r, 80))
      return sendPromise
    })

    const messages = result.current.activeConversation?.messages || []
    expect(messages.length).toBe(2)
    expect(messages[0].role).toBe('user')
    expect(messages[0].content).toBe('Giải thích đạo hàm cực trị')
    expect(messages[1].role).toBe('assistant')
    expect(messages[1].content.length).toBeGreaterThan(0)
  }, 15000)

  it('handles error simulation and retry', async () => {
    const { result } = renderHook(() => useAITutor(), { wrapper })

    await act(async () => {
      await new Promise((r) => setTimeout(r, 120))
      await result.current.startNewConversation()
    })

    await act(async () => {
      await result.current.sendMessage('error_test')
    })

    expect(result.current.error).toBeTruthy()
    expect(result.current.isStreaming).toBe(false)
  })

  // REGRESSION TESTS
  it('aborts active stream cleanly and prevents unhandled errors when unmounting during streaming', async () => {
    vi.spyOn(aiTutorService, 'appendMessage').mockResolvedValue()
    let aborted = false
    let resolveStream: () => void = () => {}
    const streamPromise = new Promise<ChatMessage>((resolve) => {
      resolveStream = () =>
        resolve({
          id: 'ast-mock-1',
          role: 'assistant',
          content: 'Streaming chunk 1',
          createdAt: new Date().toISOString(),
          status: 'done',
        })
    })

    vi.spyOn(aiTutorService, 'sendMessageStream').mockImplementation(
      async (_payload, onChunk, signal) => {
        onChunk('Streaming chunk 1')
        signal?.addEventListener('abort', () => {
          aborted = true
        })
        return streamPromise
      }
    )

    const { result, unmount } = renderHook(() => useAITutor(), { wrapper })

    await waitFor(() => {
      expect(result.current.activeConversation).not.toBeNull()
    })

    let sendPromise: Promise<void>
    act(() => {
      sendPromise = result.current.sendMessage('Câu hỏi kiểm tra unmount')
    })

    await waitFor(() => {
      expect(result.current.isStreaming).toBe(true)
    })

    // Unmount while stream is active
    unmount()

    expect(aborted).toBe(true)
    resolveStream()
    await sendPromise!
  })

  it('aborts request midway when stopStreaming is called', async () => {
    vi.spyOn(aiTutorService, 'appendMessage').mockResolvedValue()
    let aborted = false
    let rejectStream: () => void = () => {}
    const streamPromise = new Promise<ChatMessage>((_resolve, reject) => {
      rejectStream = () => reject(new DOMException('Aborted by user', 'AbortError'))
    })

    vi.spyOn(aiTutorService, 'sendMessageStream').mockImplementation(
      async (_payload, onChunk, signal) => {
        onChunk('Nửa câu trả lời đầu tiên')
        signal?.addEventListener('abort', () => {
          aborted = true
          rejectStream()
        })
        return streamPromise
      }
    )

    const { result } = renderHook(() => useAITutor(), { wrapper })

    await waitFor(() => {
      expect(result.current.activeConversation).not.toBeNull()
    })

    let sendPromise: Promise<void>
    act(() => {
      sendPromise = result.current.sendMessage('Câu hỏi test stopStreaming')
    })

    await waitFor(() => {
      expect(result.current.isStreaming).toBe(true)
    })

    await act(async () => {
      result.current.stopStreaming()
    })

    await sendPromise!

    expect(aborted).toBe(true)
    expect(result.current.isStreaming).toBe(false)
    expect(result.current.isTyping).toBe(false)
    expect(result.current.error).toBeNull()

    const activeMsgs = result.current.activeConversation?.messages || []
    const lastMsg = activeMsgs[activeMsgs.length - 1]
    expect(lastMsg?.role).toBe('assistant')
    expect(lastMsg?.status).toBe('done')
  })

  it('does not overwrite new conversation when switching conversation while streaming', async () => {
    vi.spyOn(aiTutorService, 'appendMessage').mockResolvedValue()
    let rejectStreamConv1: () => void = () => {}
    let conv1Aborted = false
    const streamPromiseConv1 = new Promise<ChatMessage>((_resolve, reject) => {
      rejectStreamConv1 = () => reject(new DOMException('Aborted by user', 'AbortError'))
    })

    vi.spyOn(aiTutorService, 'sendMessageStream').mockImplementation(
      async (payload, onChunk, signal) => {
        if (payload.message === 'Tin nhắn cho conv 1') {
          onChunk('Đang trả lời tin nhắn 1...')
          signal?.addEventListener('abort', () => {
            conv1Aborted = true
            rejectStreamConv1()
          })
          return streamPromiseConv1
        }
        return {
          id: 'ast-default',
          role: 'assistant',
          content: 'Default',
          createdAt: new Date().toISOString(),
          status: 'done',
        }
      }
    )

    const { result } = renderHook(() => useAITutor(), { wrapper })

    await waitFor(() => {
      expect(result.current.conversations.length).toBeGreaterThan(0)
    })

    // Start a second conversation so we have two conversations
    await act(async () => {
      await result.current.startNewConversation('hoa-12')
    })

    const conv2Id = result.current.activeConversation?.id
    const conv1Id = result.current.conversations.find((c) => c.id !== conv2Id)?.id

    expect(conv1Id).toBeDefined()
    expect(conv2Id).toBeDefined()

    // Switch to conv 1
    await act(async () => {
      await result.current.selectConversation(conv1Id!)
    })
    expect(result.current.activeConversation?.id).toBe(conv1Id)

    // Send streaming message in conv 1
    let sendPromise: Promise<void>
    act(() => {
      sendPromise = result.current.sendMessage('Tin nhắn cho conv 1')
    })

    await waitFor(() => {
      expect(result.current.isStreaming).toBe(true)
    })

    // Switch to conv 2 while conv 1 is streaming
    await act(async () => {
      await result.current.selectConversation(conv2Id!)
    })

    await sendPromise!

    // Streaming for conv 1 was aborted
    expect(conv1Aborted).toBe(true)
    expect(result.current.activeConversation?.id).toBe(conv2Id)
    expect(result.current.isStreaming).toBe(false)

    // Verify conv 2 was not contaminated by conv 1
    const conv2Messages = result.current.activeConversation?.messages || []
    const hasConv1Msg = conv2Messages.some(
      (m) =>
        m.content.includes('Tin nhắn cho conv 1') ||
        m.content.includes('Đang trả lời tin nhắn 1')
    )
    expect(hasConv1Msg).toBe(false)
  })

  it('sets error state and marks assistant message as error when network error occurs during streaming', async () => {
    vi.spyOn(aiTutorService, 'appendMessage').mockResolvedValue()
    vi.spyOn(aiTutorService, 'sendMessageStream').mockRejectedValue(
      new Error('Mạng bị gián đoạn (Network error)')
    )

    const { result } = renderHook(() => useAITutor(), { wrapper })

    await waitFor(() => {
      expect(result.current.activeConversation).not.toBeNull()
    })

    await act(async () => {
      await result.current.sendMessage('Kiểm tra lỗi mạng')
    })

    expect(result.current.isStreaming).toBe(false)
    expect(result.current.error).toBe('Mạng bị gián đoạn (Network error)')

    const messages = result.current.activeConversation?.messages || []
    const lastMsg = messages[messages.length - 1]
    expect(lastMsg?.role).toBe('assistant')
    expect(lastMsg?.status).toBe('error')
  })

  it('safely ignores promise completion after component has unmounted without throwing', async () => {
    vi.spyOn(aiTutorService, 'appendMessage').mockResolvedValue()
    let resolveDelayedStream: (msg: ChatMessage) => void = () => {}
    const delayedPromise = new Promise<ChatMessage>((resolve) => {
      resolveDelayedStream = resolve
    })

    vi.spyOn(aiTutorService, 'sendMessageStream').mockImplementation(
      async (_payload, onChunk) => {
        onChunk('Chunk trước unmount')
        return delayedPromise
      }
    )

    const { result, unmount } = renderHook(() => useAITutor(), { wrapper })

    await waitFor(() => {
      expect(result.current.activeConversation).not.toBeNull()
    })

    let sendPromise: Promise<void>
    act(() => {
      sendPromise = result.current.sendMessage('Gửi trước khi unmount')
    })

    await waitFor(() => {
      expect(result.current.isStreaming).toBe(true)
    })

    // Unmount component
    unmount()

    // Now resolve the promise in the background after unmount
    await act(async () => {
      resolveDelayedStream({
        id: 'ast-delayed',
        role: 'assistant',
        content: 'Nội dung trả về sau unmount',
        createdAt: new Date().toISOString(),
        status: 'done',
      })
    })

    await sendPromise!
    // If no unhandled error occurred, the test passes cleanly
  })
})

import { renderHook, act } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import { MemoryRouter } from 'react-router-dom'
import type { ReactNode } from 'react'
import { useAITutor } from './useAITutor'

function wrapper({ children }: { children: ReactNode }) {
  return <MemoryRouter>{children}</MemoryRouter>
}

describe('useAITutor Hook', () => {
  it('initializes with mock conversations and first active conversation', async () => {
    const { result } = renderHook(() => useAITutor(), { wrapper })

    // Wait for initial conversation fetch to resolve
    await act(async () => {
      await new Promise((r) => setTimeout(r, 120))
    })

    expect(result.current.conversations.length).toBeGreaterThan(0)
    expect(result.current.activeConversation).not.toBeNull()
  })

  it('allows starting a new conversation', async () => {
    const { result } = renderHook(() => useAITutor(), { wrapper })

    await act(async () => {
      await new Promise((r) => setTimeout(r, 120))
    })

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
})

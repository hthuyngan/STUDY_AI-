import { renderHook, act, waitFor } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import { useLesson } from './useLesson'

describe('useLesson Hook', () => {
  it('loads lesson and outline data successfully', async () => {
    const { result } = renderHook(() => useLesson('math-12', 'lesson-math-08'))

    expect(result.current.isLoading).toBe(true)

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false)
    })

    expect(result.current.lesson).not.toBeNull()
    expect(result.current.lesson?.id).toBe('lesson-math-08')
    expect(result.current.outline.length).toBeGreaterThan(0)
    expect(result.current.error).toBeNull()
  })

  it('handles toggling bookmark and completing lesson', async () => {
    const { result } = renderHook(() => useLesson('math-12', 'lesson-math-08'))

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false)
    })

    const initialBookmark = result.current.isBookmarked
    await act(async () => {
      await result.current.toggleBookmark()
    })
    expect(result.current.isBookmarked).toBe(!initialBookmark)

    await act(async () => {
      await result.current.completeLesson()
    })
    expect(result.current.isCompleted).toBe(true)
  })
})

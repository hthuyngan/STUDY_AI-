import { renderHook, act, waitFor } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import type { QuizResultReport } from '@/types/quiz'
import { useQuiz } from './useQuiz'

describe('useQuiz Hook', () => {
  it('loads quiz questions and handles answer submission', async () => {
    const { result } = renderHook(() => useQuiz('quiz-math-08'))

    expect(result.current.isLoading).toBe(true)

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false)
    })

    expect(result.current.quiz).not.toBeNull()
    expect(result.current.quiz?.id).toBe('quiz-math-08')
    expect(result.current.quiz?.questions.length).toBeGreaterThan(0)

    // Test submit answers
    let report: QuizResultReport | undefined
    await act(async () => {
      report = await result.current.submitAnswers([
        { questionId: 'q-1', selectedOptionId: 'opt-1-1' },
      ])
    })

    expect(report).toBeDefined()
    expect(report?.quizId).toBe('quiz-math-08')
  })
})

import { useCallback, useEffect, useState } from 'react'
import { getLatestQuizResult, getQuiz, submitQuiz } from '@/services/quiz.service'
import type { QuizDetail, QuizResultReport, QuizSubmissionAnswer } from '@/types/quiz'

export function useQuiz(quizId: string | undefined) {
  const [quiz, setQuiz] = useState<QuizDetail | null>(null)
  const [isLoading, setIsLoading] = useState(Boolean(quizId))
  const [error, setError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const reload = useCallback(async () => {
    if (!quizId) return
    setIsLoading(true)
    setError(null)
    try {
      const data = await getQuiz(quizId)
      if (!data) {
        setError('Không tìm thấy bài kiểm tra.')
      } else {
        setQuiz(data)
      }
    } catch {
      setError('Lỗi tải bài trắc nghiệm.')
    } finally {
      setIsLoading(false)
    }
  }, [quizId])

  useEffect(() => {
    if (!quizId) return
    let isMounted = true

    getQuiz(quizId)
      .then((data) => {
        if (!isMounted) return
        if (!data) {
          setError('Không tìm thấy bài kiểm tra.')
        } else {
          setQuiz(data)
        }
        setIsLoading(false)
      })
      .catch(() => {
        if (!isMounted) return
        setError('Lỗi tải bài trắc nghiệm.')
        setIsLoading(false)
      })

    return () => {
      isMounted = false
    }
  }, [quizId])

  const submitAnswers = useCallback(
    async (
      answers: QuizSubmissionAnswer[],
      timeTakenSeconds?: number
    ): Promise<QuizResultReport> => {
      if (!quizId) throw new Error('No quiz id')
      setIsSubmitting(true)
      try {
        return await submitQuiz(quizId, answers, timeTakenSeconds)
      } finally {
        setIsSubmitting(false)
      }
    },
    [quizId]
  )

  return { quiz, isLoading, error, isSubmitting, submitAnswers, reload }
}

export function useQuizResult(quizId: string | undefined) {
  const [result, setResult] = useState<QuizResultReport | null>(null)
  const [isLoading, setIsLoading] = useState(Boolean(quizId))
  const [error, setError] = useState<string | null>(null)

  const reload = useCallback(async () => {
    if (!quizId) return
    setIsLoading(true)
    setError(null)
    try {
      const data = await getLatestQuizResult(quizId)
      setResult(data)
    } catch {
      setError('Lỗi khi tải kết quả kiểm tra.')
    } finally {
      setIsLoading(false)
    }
  }, [quizId])

  useEffect(() => {
    if (!quizId) return
    let isMounted = true

    getLatestQuizResult(quizId)
      .then((data) => {
        if (!isMounted) return
        setResult(data)
        setIsLoading(false)
      })
      .catch(() => {
        if (!isMounted) return
        setError('Lỗi khi tải kết quả kiểm tra.')
        setIsLoading(false)
      })

    return () => {
      isMounted = false
    }
  }, [quizId])

  return { result, isLoading, error, reload }
}

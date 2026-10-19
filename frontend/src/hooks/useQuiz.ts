import { useEffect, useState } from 'react'
import { getLatestQuizResult, getQuiz, submitQuiz } from '@/services/quiz.service'
import type { QuizDetail, QuizResultReport, QuizSubmissionAnswer } from '@/types/quiz'

export function useQuiz(quizId: string | undefined) {
  const [quiz, setQuiz] = useState<QuizDetail | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const fetchQuiz = async () => {
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
  }

  useEffect(() => {
    fetchQuiz()
  }, [quizId])

  const submitAnswers = async (
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
  }

  return { quiz, isLoading, error, isSubmitting, submitAnswers, reload: fetchQuiz }
}

export function useQuizResult(quizId: string | undefined) {
  const [result, setResult] = useState<QuizResultReport | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchResult = async () => {
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
  }

  useEffect(() => {
    fetchResult()
  }, [quizId])

  return { result, isLoading, error, reload: fetchResult }
}

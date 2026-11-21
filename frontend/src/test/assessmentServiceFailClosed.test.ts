import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  submitAttemptWithServerValidation,
  startNewAttempt,
  getActiveUnfinishedAttempt,
  getLatestCompletedAttempt,
} from '@/services/assessment.service'
import { getLessonProgress } from '@/services/lessonProgress.service'
import { curriculumService } from '@/services/curriculum.service'
import { apiClient } from '@/lib/apiClient'
import * as authSession from '@/auth/authSession'
import type { LessonAssessment, AssessmentQuestion } from '@/types/assessment'

describe('Assessment Service Fail-Closed Session Finalization (Codex Review Issue 9)', () => {
  const dummyQuestions: AssessmentQuestion[] = [
    {
      id: 'q1',
      type: 'single-choice',
      prompt: 'Tính đạo hàm của x^2?',
      options: [
        { id: 'opt-a', label: 'A', text: '2x' },
        { id: 'opt-b', label: 'B', text: 'x' },
      ],
      correctOptionId: 'opt-a',
      explanation: 'Đạo hàm x^2 là 2x',
    },
  ]

  const dummyAssessment: LessonAssessment = {
    id: 'asm-1',
    lessonId: 'les-math10-01',
    subjectId: 'sub_math10',
    title: 'Bài kiểm tra Hàm số',
    description: '',
    estimatedMinutes: 10,
    passingScorePercent: 60,
    questions: dummyQuestions,
  }

  beforeEach(() => {
    localStorage.clear()
    vi.restoreAllMocks()
  })

  it('preserves attempt in in-progress state and does NOT mark completed when backend submission fails', async () => {
    vi.spyOn(authSession, 'getAccessToken').mockReturnValue('mock_learner_token')
    vi.spyOn(curriculumService, 'checkQuestionAnswer').mockResolvedValue({
      questionId: 'q1',
      isCorrect: true,
      correctAnswer: 'A',
      explanation: 'Đúng',
      scoreEarned: 1.0,
      feedback: 'Chính xác',
    })
    // Server submission fails
    vi.spyOn(apiClient, 'post').mockRejectedValue(new Error('500 Internal Server Error'))

    const initialAttempt = startNewAttempt(dummyAssessment, 'chap-01', 'learner-1')
    initialAttempt.responses['q1'] = {
      questionId: 'q1',
      selectedOptionIds: ['opt-a'],
      firstAnsweredAt: new Date().toISOString(),
      lastAnsweredAt: new Date().toISOString(),
      changeCount: 1,
      timeSpentMs: 5000,
      isCorrect: false,
    }

    await expect(
      submitAttemptWithServerValidation(initialAttempt, dummyQuestions, 60, 5000, 5)
    ).rejects.toThrow('500 Internal Server Error')

    // Verify local attempt is STILL in-progress and incomplete
    const savedAttempt = getActiveUnfinishedAttempt('les-math10-01')
    expect(savedAttempt).not.toBeNull()
    expect(savedAttempt?.status).toBe('in-progress')
    expect(savedAttempt?.completionStatus).toBe('incomplete')
    expect(savedAttempt?.responses['q1'].isCorrect).toBe(true)

    // Verify lesson progress is NOT marked completed
    const progress = getLessonProgress('les-math10-01')
    expect(progress?.assessmentStatus).not.toBe('completed')
  })

  it('marks attempt completed and saves result when backend submission succeeds', async () => {
    vi.spyOn(authSession, 'getAccessToken').mockReturnValue('mock_learner_token')
    vi.spyOn(curriculumService, 'checkQuestionAnswer').mockResolvedValue({
      questionId: 'q1',
      isCorrect: true,
      correctAnswer: 'A',
      explanation: 'Đúng',
      scoreEarned: 1.0,
      feedback: 'Chính xác',
    })
    vi.spyOn(apiClient, 'post').mockResolvedValue({ success: true, id: 'att-server-123' })

    const initialAttempt = startNewAttempt(dummyAssessment, 'chap-01', 'learner-1')
    initialAttempt.responses['q1'] = {
      questionId: 'q1',
      selectedOptionIds: ['opt-a'],
      firstAnsweredAt: new Date().toISOString(),
      lastAnsweredAt: new Date().toISOString(),
      changeCount: 1,
      timeSpentMs: 5000,
      isCorrect: false,
    }

    const result = await submitAttemptWithServerValidation(
      initialAttempt,
      dummyQuestions,
      60,
      5000,
      5
    )

    expect(result.isPassed).toBe(true)
    expect(result.scorePercentage).toBe(100)
    expect(result.attempt.status).toBe('completed')
    expect(result.attempt.completionStatus).toBe('completed')

    // Verify backend received Dictionary-shaped responses and completion metadata
    expect(apiClient.post).toHaveBeenCalledWith(
      '/api/v1/me/assessment-attempts',
      expect.objectContaining({
        id: initialAttempt.id,
        lessonId: 'les-math10-01',
        subjectId: 'sub_math10',
        completionStatus: 'completed',
        successStatus: 'passed',
        progressMeasure: 1.0,
        responses: expect.objectContaining({
          q1: expect.objectContaining({
            questionId: 'q1',
            selectedOptionIds: ['opt-a'],
            isCorrect: true,
          }),
        }),
      })
    )

    // Verify latest completed attempt exists
    const completedAttempt = getLatestCompletedAttempt('les-math10-01')
    expect(completedAttempt).not.toBeNull()
    expect(completedAttempt?.status).toBe('completed')
    expect(completedAttempt?.completionStatus).toBe('completed')

    // Verify lesson progress is marked completed
    const progress = getLessonProgress('les-math10-01')
    expect(progress).not.toBeNull()
    expect(progress?.assessmentStatus).toBe('completed')
  })
})

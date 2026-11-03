import { beforeEach, describe, expect, it } from 'vitest'
import type { AssessmentQuestion, LearningAttempt } from '@/types/assessment'
import {
  knowledgeGapsService,
} from './knowledgeGaps.service'

describe('knowledgeGaps.service', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  const mockQuestions: AssessmentQuestion[] = [
    {
      id: 'q-1',
      type: 'single-choice',
      prompt: 'Điểm uốn của hàm số y = ax^3 + bx^2 + cx + d là gì?',
      topic: 'Điểm uốn đồ thị hàm số',
      options: [
        { id: 'opt-a', label: 'A', text: "y'(x) = 0" },
        { id: 'opt-b', label: 'B', text: "y''(x) = 0 và đổi dấu" },
      ],
      correctOptionId: 'opt-b',
      explanation: "Điều kiện cần và đủ là y''(x) = 0 và đổi dấu.",
    },
    {
      id: 'q-2',
      type: 'single-choice',
      prompt: 'Tâm đối xứng của đồ thị hàm phân thức bậc 1 là?',
      topic: 'Tâm đối xứng hàm phân thức',
      options: [
        { id: 'opt-2a', label: 'A', text: 'Giao điểm 2 trục tọa độ' },
        { id: 'opt-2b', label: 'B', text: 'Giao điểm 2 đường tiệm cận' },
      ],
      correctOptionId: 'opt-2b',
      explanation: 'Là giao điểm của tiệm cận đứng và tiệm cận ngang.',
    },
  ]

  it('creates Knowledge Gaps exclusively from incorrect questions in an assessment attempt', () => {
    const attempt: LearningAttempt = {
      id: 'attempt-001',
      learnerId: 'student-1',
      subjectId: 'math',
      chapterId: 'math-chap-1',
      lessonId: 'lesson-math-08',
      assessmentId: 'assessment-math-08',
      attemptNumber: 1,
      startedAt: new Date().toISOString(),
      lastActivityAt: new Date().toISOString(),
      status: 'completed',
      progressMeasure: 1,
      completionStatus: 'completed',
      successStatus: 'failed',
      scoreRaw: 1,
      scoreMin: 0,
      scoreMax: 2,
      scoreScaled: 0.5,
      sessionTimeMs: 60000,
      currentQuestionId: 'q-2',
      responses: {
        'q-1': {
          questionId: 'q-1',
          selectedOptionIds: ['opt-a'], // WRONG ANSWER
          firstAnsweredAt: new Date().toISOString(),
          lastAnsweredAt: new Date().toISOString(),
          changeCount: 0,
          timeSpentMs: 30000,
          isCorrect: false,
        },
        'q-2': {
          questionId: 'q-2',
          selectedOptionIds: ['opt-2b'], // CORRECT ANSWER
          firstAnsweredAt: new Date().toISOString(),
          lastAnsweredAt: new Date().toISOString(),
          changeCount: 0,
          timeSpentMs: 30000,
          isCorrect: true,
        },
      },
      events: [],
    }

    const gaps = knowledgeGapsService.recordGapsFromAssessmentAttempt(
      attempt,
      mockQuestions,
      'Bài 08 · Khảo sát hàm số'
    )

    // Only q-1 is wrong, so only 1 gap should be generated
    expect(gaps.length).toBe(1)
    expect(gaps[0].title).toBe('Điểm uốn của đồ thị hàm số bậc 3')
    expect(gaps[0].sectionId).toBe('definitions')
    expect(gaps[0].sectionTitle).toBe('Khái niệm và Định nghĩa cơ bản')
    expect(gaps[0].wrongAttemptsCount).toBe(1)
    expect(gaps[0].status).toBe('needs-review')

    // Stored in localStorage
    const stored = knowledgeGapsService.getAllGaps()
    expect(stored.length).toBe(1)
    expect(stored[0].id).toBe(gaps[0].id)
  })

  it('guarantees idempotency and does not create duplicate gaps from the same attempt', () => {
    const attempt: LearningAttempt = {
      id: 'attempt-002',
      learnerId: 'student-1',
      subjectId: 'math',
      chapterId: 'math-chap-1',
      lessonId: 'lesson-math-08',
      assessmentId: 'assessment-math-08',
      attemptNumber: 1,
      startedAt: new Date().toISOString(),
      lastActivityAt: new Date().toISOString(),
      status: 'completed',
      progressMeasure: 1,
      completionStatus: 'completed',
      successStatus: 'failed',
      scoreRaw: 0,
      scoreMin: 0,
      scoreMax: 1,
      scoreScaled: 0,
      sessionTimeMs: 30000,
      currentQuestionId: 'q-1',
      responses: {
        'q-1': {
          questionId: 'q-1',
          selectedOptionIds: ['opt-a'],
          firstAnsweredAt: new Date().toISOString(),
          lastAnsweredAt: new Date().toISOString(),
          changeCount: 0,
          timeSpentMs: 30000,
          isCorrect: false,
        },
      },
      events: [],
    }

    // Call 1
    const gapsFirst = knowledgeGapsService.recordGapsFromAssessmentAttempt(
      attempt,
      mockQuestions,
      'Bài 08'
    )
    expect(gapsFirst.length).toBe(1)

    // Call 2 with identical attemptId
    const gapsSecond = knowledgeGapsService.recordGapsFromAssessmentAttempt(
      attempt,
      mockQuestions,
      'Bài 08'
    )
    expect(gapsSecond.length).toBe(1)

    // Total in store must remain exactly 1
    expect(knowledgeGapsService.getAllGaps().length).toBe(1)
  })

  it('increments wrongAttemptsCount and elevates severity if wrong again in a subsequent attempt', () => {
    const attempt1: LearningAttempt = {
      id: 'attempt-003a',
      learnerId: 'student-1',
      subjectId: 'math',
      chapterId: 'math-chap-1',
      lessonId: 'lesson-math-08',
      assessmentId: 'assessment-math-08',
      attemptNumber: 1,
      startedAt: new Date().toISOString(),
      lastActivityAt: new Date().toISOString(),
      status: 'completed',
      progressMeasure: 1,
      completionStatus: 'completed',
      successStatus: 'failed',
      scoreRaw: 0,
      scoreMin: 0,
      scoreMax: 1,
      scoreScaled: 0,
      sessionTimeMs: 30000,
      currentQuestionId: 'q-1',
      responses: {
        'q-1': {
          questionId: 'q-1',
          selectedOptionIds: ['opt-a'],
          firstAnsweredAt: new Date().toISOString(),
          lastAnsweredAt: new Date().toISOString(),
          changeCount: 0,
          timeSpentMs: 30000,
          isCorrect: false,
        },
      },
      events: [],
    }

    knowledgeGapsService.recordGapsFromAssessmentAttempt(attempt1, mockQuestions, 'Bài 08')
    let gaps = knowledgeGapsService.getAllGaps()
    expect(gaps[0].wrongAttemptsCount).toBe(1)
    expect(gaps[0].severity).toBe('medium')

    // Attempt 2 (Retake where student fails again)
    const attempt2: LearningAttempt = {
      ...attempt1,
      id: 'attempt-003b',
      attemptNumber: 2,
    }

    knowledgeGapsService.recordGapsFromAssessmentAttempt(attempt2, mockQuestions, 'Bài 08')
    gaps = knowledgeGapsService.getAllGaps()
    expect(gaps.length).toBe(1)
    expect(gaps[0].wrongAttemptsCount).toBe(2)

    // Attempt 3 (Student fails a 3rd time -> elevated to 'high' severity)
    const attempt3: LearningAttempt = {
      ...attempt1,
      id: 'attempt-003c',
      attemptNumber: 3,
    }

    knowledgeGapsService.recordGapsFromAssessmentAttempt(attempt3, mockQuestions, 'Bài 08')
    gaps = knowledgeGapsService.getAllGaps()
    expect(gaps[0].wrongAttemptsCount).toBe(3)
    expect(gaps[0].severity).toBe('high')
  })

  it('updates gap status and deletes a gap safely', () => {
    const attempt: LearningAttempt = {
      id: 'attempt-004',
      learnerId: 'student-1',
      subjectId: 'math',
      chapterId: 'math-chap-1',
      lessonId: 'lesson-math-08',
      assessmentId: 'assessment-math-08',
      attemptNumber: 1,
      startedAt: new Date().toISOString(),
      lastActivityAt: new Date().toISOString(),
      status: 'completed',
      progressMeasure: 1,
      completionStatus: 'completed',
      successStatus: 'failed',
      scoreRaw: 0,
      scoreMin: 0,
      scoreMax: 1,
      scoreScaled: 0,
      sessionTimeMs: 30000,
      currentQuestionId: 'q-1',
      responses: {
        'q-1': {
          questionId: 'q-1',
          selectedOptionIds: ['opt-a'],
          firstAnsweredAt: new Date().toISOString(),
          lastAnsweredAt: new Date().toISOString(),
          changeCount: 0,
          timeSpentMs: 30000,
          isCorrect: false,
        },
      },
      events: [],
    }

    const [gap] = knowledgeGapsService.recordGapsFromAssessmentAttempt(
      attempt,
      mockQuestions,
      'Bài 08'
    )

    const updated = knowledgeGapsService.updateGapStatus(gap.id, 'mastered')
    expect(updated?.status).toBe('mastered')

    const deleted = knowledgeGapsService.deleteGap(gap.id)
    expect(deleted).toBe(true)
    expect(knowledgeGapsService.getAllGaps().length).toBe(0)
  })
})

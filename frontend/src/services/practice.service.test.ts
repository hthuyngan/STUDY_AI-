import { describe, it, expect, vi, beforeEach } from 'vitest'
import { apiClient } from '@/lib/apiClient'
import { practiceService } from '@/services/practice.service'

vi.mock('@/lib/apiClient', () => ({
  apiClient: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
  },
}))

describe('PracticeService — Shared Predicate & Fail-Closed Question Count Suite', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('queries question count with all unified filters (subject, chapter, lesson, skill, type, difficulty, grade)', async () => {
    vi.mocked(apiClient.get).mockResolvedValueOnce({ count: 5 })

    const count = await practiceService.getQuestionCount({
      subjectId: 'sub_math10',
      chapterId: 'chp_math10_c1',
      lessonId: 'les_math10_c1_b1',
      difficulty: 'easy',
      skillId: 'SKILL-MATH-DERIV-SIGN',
      questionType: 'multiple_choice',
      grade: '10',
    })

    expect(count).toBe(5)
    expect(apiClient.get).toHaveBeenCalledTimes(1)
    const calledUrl = vi.mocked(apiClient.get).mock.calls[0][0]
    expect(calledUrl).toContain('/api/v1/practice/question-count')
    expect(calledUrl).toContain('subjectId=sub_math10')
    expect(calledUrl).toContain('chapterId=chp_math10_c1')
    expect(calledUrl).toContain('lessonId=les_math10_c1_b1')
    expect(calledUrl).toContain('difficulty=easy')
    expect(calledUrl).toContain('skillId=SKILL-MATH-DERIV-SIGN')
    expect(calledUrl).toContain('questionType=multiple_choice')
    expect(calledUrl).toContain('grade=10')
  })

  it('propagates typed error on server outage instead of masking with 0', async () => {
    vi.mocked(apiClient.get).mockRejectedValueOnce(new Error('Network error: 500 Internal Server Error'))

    await expect(
      practiceService.getQuestionCount({
        subjectId: 'sub_math12',
      })
    ).rejects.toThrow('Network error: 500 Internal Server Error')
  })

  it('returns exact count 0 when query succeeds with 0 matches', async () => {
    vi.mocked(apiClient.get).mockResolvedValueOnce({ count: 0 })

    const count = await practiceService.getQuestionCount({
      subjectId: 'sub_math11',
      questionType: 'short_answer',
    })

    expect(count).toBe(0)
  })
})

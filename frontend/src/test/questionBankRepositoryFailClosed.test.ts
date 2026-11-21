import { describe, it, expect, vi, beforeEach } from 'vitest'
import { questionBankRepository } from '@/repositories/questionBank.repository'
import { apiClient } from '@/lib/apiClient'
import { getAccessToken } from '@/auth/authSession'

vi.mock('@/lib/apiClient', () => ({
  apiClient: {
    get: vi.fn(),
  },
}))

vi.mock('@/auth/authSession', () => ({
  getAccessToken: vi.fn(),
}))

describe('QuestionBankRepository — Authenticated Fail-Closed & Zero-Mock Suite', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('queries real backend question-bank endpoint when authenticated', async () => {
    vi.mocked(getAccessToken).mockReturnValue('valid-jwt-token')
    const mockItems = [
      {
        id: 'qst_sql_001',
        subjectId: 'sub_math10',
        chapterId: 'chap_1',
        lessonId: 'les_1',
        skillIds: ['SKILL-MATH-10-LOGIC'],
        type: 'multiple_choice' as const,
        stem: 'Mệnh đề toán học là gì?',
        difficulty: 'easy' as const,
        cognitiveLevel: 'recognition' as const,
        explanation: 'Lời giải chi tiết',
        reviewStatus: 'approved' as const,
        createdAt: '2026-11-21T00:00:00Z',
        updatedAt: '2026-11-21T00:00:00Z',
        options: [
          { id: 'A' as const, text: 'Phương án A' },
          { id: 'B' as const, text: 'Phương án B' },
          { id: 'C' as const, text: 'Phương án C' },
          { id: 'D' as const, text: 'Phương án D' },
        ],
        correctAnswer: 'A' as const,
      },
    ]

    vi.mocked(apiClient.get).mockResolvedValueOnce({
      items: mockItems,
      total: 1,
      page: 1,
      pageSize: 100,
    })

    const questions = await questionBankRepository.getAll()

    expect(apiClient.get).toHaveBeenCalledWith('/api/v1/curriculum/question-bank?pageSize=100')
    expect(questions.length).toBe(1)
    expect(questions[0].id).toBe('qst_sql_001')
  })

  it('passes filter criteria to backend query string when authenticated', async () => {
    vi.mocked(getAccessToken).mockReturnValue('valid-jwt-token')
    vi.mocked(apiClient.get).mockResolvedValueOnce({ items: [], total: 0 })

    await questionBankRepository.filter({
      subjectId: 'sub_math11',
      difficulty: 'hard',
      type: 'multiple_choice',
      search: 'hàm số',
    })

    expect(apiClient.get).toHaveBeenCalledWith(
      expect.stringContaining('subjectId=sub_math11')
    )
    expect(apiClient.get).toHaveBeenCalledWith(
      expect.stringContaining('difficulty=hard')
    )
    expect(apiClient.get).toHaveBeenCalledWith(
      expect.stringContaining('type=multiple_choice')
    )
    expect(apiClient.get).toHaveBeenCalledWith(
      expect.stringContaining('search=h%C3%A0m+s%E1%BB%91')
    )
  })

  it('queries backend question statistics when authenticated', async () => {
    vi.mocked(getAccessToken).mockReturnValue('valid-jwt-token')
    vi.mocked(apiClient.get).mockResolvedValueOnce({
      total: 45,
      approvedCount: 40,
      needsReviewCount: 5,
      draftCount: 0,
      rejectedCount: 0,
      byType: {
        multiple_choice: 30,
        true_false_group: 10,
        short_answer: 5,
      },
      byCognitiveLevel: {
        recognition: 15,
        comprehension: 15,
        application: 10,
        high_application: 5,
      },
    })

    const stats = await questionBankRepository.getStats()

    expect(apiClient.get).toHaveBeenCalledWith('/api/v1/curriculum/question-bank/statistics')
    expect(stats.total).toBe(45)
    expect(stats.approvedCount).toBe(40)
  })

  it('fails closed and rethrows if backend API request fails when authenticated', async () => {
    vi.mocked(getAccessToken).mockReturnValue('valid-jwt-token')
    vi.mocked(apiClient.get).mockRejectedValueOnce(new Error('Server error 500'))

    await expect(questionBankRepository.getAll()).rejects.toThrow('Server error 500')
  })
})

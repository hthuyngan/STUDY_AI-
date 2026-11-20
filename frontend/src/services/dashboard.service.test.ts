import { describe, it, expect, vi, beforeEach } from 'vitest'
import { apiClient } from '@/lib/apiClient'
import { getAuthUser } from '@/auth/authSession'
import { fetchDashboardData } from '@/services/dashboard.service'

vi.mock('@/lib/apiClient', () => ({
  apiClient: {
    get: vi.fn(),
  },
}))

vi.mock('@/auth/authSession', () => ({
  getAuthUser: vi.fn(),
}))

describe('DashboardService — Authenticated Zero-Mock & Fail-Closed Suite', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('fails-closed with error when authenticated API request throws', async () => {
    vi.mocked(getAuthUser).mockReturnValue({
      id: 'usr_real_01',
      displayName: 'Nguyen Van Real',
      role: 'learner',
      grade: '12',
      createdAt: '2026-01-01T00:00:00Z',
    })
    vi.mocked(apiClient.get).mockRejectedValueOnce(new Error('Connection refused'))

    await expect(fetchDashboardData()).rejects.toThrow('Không thể tải dữ liệu bảng điều khiển từ máy chủ. Vui lòng thử lại.')
  })

  it('maps authoritative SQL server stats and recent activities when authenticated', async () => {
    vi.mocked(getAuthUser).mockReturnValue({
      id: 'usr_real_01',
      displayName: 'Nguyen Van Real',
      role: 'learner',
      grade: '12',
      createdAt: '2026-01-01T00:00:00Z',
    })

    vi.mocked(apiClient.get).mockResolvedValueOnce({
      completedLessons: 4,
      totalQuestionsPracticed: 20,
      totalCorrectAnswers: 18,
      accuracyRate: 90.0,
      streakDays: 5,
      totalMistakes: 2,
      dueReviewsCount: 1,
      subjectProgress: [
        {
          subjectId: 'sub_math12',
          subjectName: 'Toán 12',
          completedLessons: 4,
          totalLessons: 10,
          questionsPracticed: 20,
          accuracyRate: 90.0,
          progressPercent: 40.0,
        },
      ],
      recentAttempts: [
        {
          attemptId: 'att_01',
          subjectId: 'sub_math12',
          mode: 'practice',
          scoreScaled: 90.0,
          totalQuestions: 10,
          correctCount: 9,
          completedAt: '2026-11-20T10:00:00Z',
        },
      ],
    })

    const data = await fetchDashboardData()

    expect(data).not.toBeNull()
    expect(data!.stats.completedLessonsCount).toBe(4)
    expect(data!.stats.streakDays).toBe(5)
    expect(data!.subjects.length).toBe(1)
    expect(data!.subjects[0].id).toBe('sub_math12')
    expect(data!.subjects[0].progress).toBe(40)
    expect(data!.recentActivities.length).toBe(1)
    expect(data!.recentActivities[0].id).toBe('att_01')
  })
})

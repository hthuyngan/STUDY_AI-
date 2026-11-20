import { describe, it, expect, vi, beforeEach } from 'vitest'
import { educationService } from '@/services/education.service'
import { apiClient } from '@/lib/apiClient'
import * as authSession from '@/auth/authSession'

describe('Admin Reports Fail-Closed & Data Contract Alignment (Codex Review Issue 5 & 6)', () => {
  beforeEach(() => {
    localStorage.clear()
    vi.restoreAllMocks()
  })

  it('getReports throws error and does NOT return synthetic mock data when authenticated and API fails', async () => {
    vi.spyOn(authSession, 'getAccessToken').mockReturnValue('mock_admin_token')
    vi.spyOn(apiClient, 'get').mockRejectedValue(new Error('500 Internal Server Error'))

    await expect(educationService.getReports()).rejects.toThrow('500 Internal Server Error')
  })

  it('getReports correctly synchronizes both completedLessons and lessonsCompleted fields', async () => {
    vi.spyOn(authSession, 'getAccessToken').mockReturnValue('mock_admin_token')

    const mockApiResponse = {
      totalLearners: 1280,
      activeLearners: 890,
      completedLessons: 14250,
      completionRatePercent: 76.5,
      averageAssessmentScore: 8.2,
      activityTrend: [
        {
          date: '20/11',
          activeUsers: 450,
          completedLessons: 65,
          lessonsCompleted: 65,
        },
      ],
      subjectProgress: [],
      scoreDistribution: [],
    }

    vi.spyOn(apiClient, 'get').mockResolvedValue(mockApiResponse)

    const report = await educationService.getReports()
    expect(report.totalLearners).toBe(1280)
    expect(report.activityTrend).toHaveLength(1)
    expect(report.activityTrend[0].completedLessons).toBe(65)
    expect(report.activityTrend[0].lessonsCompleted).toBe(65)
  })

  it('getReports safely maps completedLessons when API returns lessonsCompleted only', async () => {
    vi.spyOn(authSession, 'getAccessToken').mockReturnValue('mock_admin_token')

    const mockApiResponse = {
      totalLearners: 1280,
      activeLearners: 890,
      completedLessons: 14250,
      completionRatePercent: 76.5,
      averageAssessmentScore: 8.2,
      activityTrend: [
        {
          date: '20/11',
          activeUsers: 450,
          lessonsCompleted: 42, // Only lessonsCompleted sent by backend
        },
      ],
      subjectProgress: [],
      scoreDistribution: [],
    }

    vi.spyOn(apiClient, 'get').mockResolvedValue(mockApiResponse)

    const report = await educationService.getReports()
    expect(report.activityTrend[0].completedLessons).toBe(42)
    expect(report.activityTrend[0].lessonsCompleted).toBe(42)
  })
})

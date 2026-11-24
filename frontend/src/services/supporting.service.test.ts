import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  getAchievements,
  getLibraryItems,
  getUserProfile,
  getUserSettings,
  updateUserSettings,
} from './supporting.service'
import { apiClient } from '@/lib/apiClient'
import * as authSession from '@/auth/authSession'

describe('Supporting Service — Fail-Closed & Data Safety Suite', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
    localStorage.clear()
  })

  describe('getLibraryItems', () => {
    it('returns materials array when API succeeds with data', async () => {
      const mockItems = [
        {
          id: 'mat-1',
          title: 'Công thức đạo hàm và bảng nguyên hàm',
          subjectId: 'sub_math12',
          category: 'Tài liệu tóm tắt',
          fileUrl: 'https://example.com/math12.pdf',
        },
      ]
      vi.spyOn(apiClient, 'get').mockResolvedValue(mockItems)

      const result = await getLibraryItems({ category: 'all', subjectId: 'sub_math12' })
      expect(result).toEqual(mockItems)
      expect(apiClient.get).toHaveBeenCalledWith(expect.stringContaining('subjectId=sub_math12'))
    })

    it('returns empty array when API returns empty list or null', async () => {
      vi.spyOn(apiClient, 'get').mockResolvedValue([])
      const result = await getLibraryItems()
      expect(result).toEqual([])
    })

    it('fails closed and propagates error on 401 Unauthorized', async () => {
      vi.spyOn(apiClient, 'get').mockRejectedValue(new Error('401 Unauthorized'))
      await expect(getLibraryItems()).rejects.toThrow('401 Unauthorized')
    })

    it('fails closed and propagates error on 403 Forbidden', async () => {
      vi.spyOn(apiClient, 'get').mockRejectedValue(new Error('403 Forbidden'))
      await expect(getLibraryItems()).rejects.toThrow('403 Forbidden')
    })

    it('fails closed and propagates error on 500 Internal Server Error', async () => {
      vi.spyOn(apiClient, 'get').mockRejectedValue(new Error('500 Internal Server Error'))
      await expect(getLibraryItems()).rejects.toThrow('500 Internal Server Error')
    })

    it('fails closed and propagates error on network timeout', async () => {
      vi.spyOn(apiClient, 'get').mockRejectedValue(new Error('Network timeout'))
      await expect(getLibraryItems()).rejects.toThrow('Network timeout')
    })
  })

  describe('getAchievements', () => {
    it('returns empty array for unauthenticated visitor without fabricated badges', async () => {
      vi.spyOn(authSession, 'getAuthUser').mockReturnValue(null)
      const result = await getAchievements()
      expect(result).toEqual([])
    })

    it('returns truthful empty array for authenticated user when backend does not persist achievements', async () => {
      vi.spyOn(authSession, 'getAuthUser').mockReturnValue({
        id: 'usr-student-01',
        email: 'student@studyai.edu.vn',
        displayName: 'Nguyễn Văn A',
        role: 'student',
      } as any)

      const result = await getAchievements()
      expect(result).toEqual([])
    })
  })

  describe('getUserProfile', () => {
    it('returns null when user is not authenticated', async () => {
      vi.spyOn(authSession, 'getAuthUser').mockReturnValue(null)
      const profile = await getUserProfile()
      expect(profile).toBeNull()
    })

    it('returns truthful profile when authenticated and dashboard-stats succeeds', async () => {
      vi.spyOn(authSession, 'getAuthUser').mockReturnValue({
        id: 'usr-student-01',
        email: 'student@studyai.edu.vn',
        displayName: 'Nguyễn Văn A',
        grade: '12',
        role: 'student',
      } as any)

      vi.spyOn(apiClient, 'get').mockResolvedValue({
        streakDays: 5,
        totalStudyMinutes: 120,
        completedLessons: 8,
        subjectProgress: [
          {
            subjectId: 'sub_math12',
            subjectName: 'Toán học 12',
            completedLessons: 8,
            totalLessons: 16,
            progressPercent: 50,
          },
        ],
      })

      const profile = await getUserProfile()
      expect(profile).not.toBeNull()
      expect(profile?.streakDays).toBe(5)
      expect(profile?.studyHours).toBe(2)
      expect(profile?.completedLessons).toBe(8)
      expect(profile?.subjectStats).toHaveLength(1)
    })

    it('fails closed and propagates error on 500 error instead of faking 0 statistics', async () => {
      vi.spyOn(authSession, 'getAuthUser').mockReturnValue({
        id: 'usr-student-01',
        email: 'student@studyai.edu.vn',
        displayName: 'Nguyễn Văn A',
        role: 'student',
      } as any)

      vi.spyOn(apiClient, 'get').mockRejectedValue(new Error('500 Server Error'))
      await expect(getUserProfile()).rejects.toThrow('500 Server Error')
    })
  })

  describe('getUserSettings & updateUserSettings', () => {
    it('reads default settings when nothing is in localStorage', async () => {
      const settings = await getUserSettings()
      expect(settings.theme).toBe('light')
      expect(settings.dailyGoalMinutes).toBe(30)
    })

    it('updates and persists user settings in light mode', async () => {
      const updated = await updateUserSettings({ dailyGoalMinutes: 45 })
      expect(updated.dailyGoalMinutes).toBe(45)
      expect(updated.theme).toBe('light')
    })
  })
})

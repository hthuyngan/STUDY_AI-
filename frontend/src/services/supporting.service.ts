import { apiClient } from '@/lib/apiClient'
import { getAuthUser } from '@/auth/authSession'
import { getStorageKey } from '@/repositories/storageKeys'
import {
  mockLibraryItems,
  mockUserSettings,
} from '@/data/supporting.mock'
import type {
  AchievementItem,
  ExerciseItem,
  LibraryItem,
  UserProfileData,
  UserSettingsData,
} from '@/types/supporting'

export async function getExercises(_filters?: {
  subjectId?: string
  status?: string
}): Promise<ExerciseItem[]> {
  return []
}

export async function getLibraryItems(filters?: {
  category?: string
  subjectId?: string
  search?: string
}): Promise<LibraryItem[]> {
  const authUser = getAuthUser()
  if (authUser) {
    try {
      const params = new URLSearchParams()
      if (filters?.category && filters.category !== 'all' && filters.category !== 'Đã lưu') {
        params.set('category', filters.category)
      }
      if (filters?.subjectId && filters.subjectId !== 'all') {
        params.set('subjectId', filters.subjectId)
      }
      if (filters?.search) {
        params.set('search', filters.search)
      }
      const materials = await apiClient.get<LibraryItem[]>(`/api/v1/curriculum/materials?${params.toString()}`)
      return materials || []
    } catch {
      throw new Error('Không thể tải danh sách tài liệu từ máy chủ. Vui lòng thử lại.')
    }
  }

  await new Promise((resolve) => setTimeout(resolve, 150))
  let list = [...mockLibraryItems]
  if (filters?.category && filters.category !== 'all') {
    if (filters.category === 'Đã lưu') {
      list = list.filter((item) => item.isSaved)
    } else {
      list = list.filter((item) => item.category === filters.category)
    }
  }
  if (filters?.subjectId && filters.subjectId !== 'all') {
    list = list.filter((item) => item.subjectId === filters.subjectId)
  }
  if (filters?.search) {
    const q = filters.search.toLowerCase()
    list = list.filter(
      (item) => item.title.toLowerCase().includes(q) || item.snippet.toLowerCase().includes(q)
    )
  }
  return list
}

export async function getAchievements(): Promise<AchievementItem[]> {
  const authUser = getAuthUser()
  if (!authUser) {
    return []
  }

  try {
    const stats = await apiClient.get<any>('/api/v1/practice/dashboard-stats')
    return [
      {
        id: 'ach-01',
        title: 'Khởi đầu nan',
        description: 'Hoàn thành bài luyện tập đầu tiên',
        icon: '🎯',
        progress: Math.min(1, stats?.totalQuestionsPracticed || 0),
        target: 1,
        isUnlocked: (stats?.totalQuestionsPracticed || 0) > 0,
        unlockedDate: stats?.recentAttempts?.[0]?.completedAt || undefined,
        xpReward: 50,
      },
      {
        id: 'ach-02',
        title: 'Chiến binh kiên trì',
        description: 'Học tập liên tục 3 ngày',
        icon: '🔥',
        progress: Math.min(3, stats?.streakDays || 0),
        target: 3,
        isUnlocked: (stats?.streakDays || 0) >= 3,
        unlockedDate: (stats?.streakDays || 0) >= 3 ? new Date().toISOString() : undefined,
        xpReward: 100,
      },
      {
        id: 'ach-03',
        title: 'Bách phát bách trúng',
        description: 'Đạt độ chính xác từ 80% trở lên',
        icon: '⭐',
        progress: Math.min(80, Math.round(stats?.accuracyRate || 0)),
        target: 80,
        isUnlocked: (stats?.accuracyRate || 0) >= 80 && (stats?.totalQuestionsPracticed || 0) >= 5,
        unlockedDate: (stats?.accuracyRate || 0) >= 80 && (stats?.totalQuestionsPracticed || 0) >= 5 ? new Date().toISOString() : undefined,
        xpReward: 150,
      },
      {
        id: 'ach-04',
        title: 'Chinh phục bài học',
        description: 'Hoàn thành 1 bài học lý thuyết hoặc chuyên đề',
        icon: '📚',
        progress: Math.min(1, stats?.completedLessons || 0),
        target: 1,
        isUnlocked: (stats?.completedLessons || 0) >= 1,
        unlockedDate: (stats?.completedLessons || 0) >= 1 ? new Date().toISOString() : undefined,
        xpReward: 80,
      },
    ]
  } catch {
    return []
  }
}

export async function getUserProfile(): Promise<UserProfileData | null> {
  const authUser = getAuthUser()
  if (!authUser) {
    return null
  }

  let stats: any = null
  try {
    stats = await apiClient.get<any>('/api/v1/practice/dashboard-stats')
  } catch {
    // ignore
  }

  return {
    id: authUser.id,
    name: authUser.displayName || 'Học viên',
    avatar: '',
    grade: authUser.grade ? `Lớp ${authUser.grade}` : 'Chưa cập nhật',
    school: 'THPT',
    studyGoal: 'Chinh phục kỳ thi THPT với điểm số mục tiêu',
    streakDays: stats?.streakDays ?? 0,
    totalXP: stats ? (stats.totalCorrectAnswers || 0) * 10 : 0,
    studyHours: stats ? Math.round(((stats.totalStudyMinutes || 0) / 60) * 10) / 10 : 0,
    completedLessons: stats?.completedLessons ?? 0,
    subjectStats: stats?.subjectProgress?.map((s: any) => ({
      subjectId: s.subjectId,
      subjectName: s.subjectName,
      completedLessons: s.completedLessons,
      totalLessons: s.totalLessons,
      progress: s.progressPercent,
    })) || [],
  }
}

export async function getUserSettings(): Promise<UserSettingsData> {
  await new Promise((resolve) => setTimeout(resolve, 150))
  const storageKey = getStorageKey('user_settings')
  const saved = typeof window !== 'undefined' ? localStorage.getItem(storageKey) : null
  if (saved) {
    try {
      return JSON.parse(saved)
    } catch {
      // fallback
    }
  }
  return { ...mockUserSettings }
}

export async function updateUserSettings(settings: Partial<UserSettingsData>): Promise<UserSettingsData> {
  await new Promise((resolve) => setTimeout(resolve, 150))
  const current = await getUserSettings()
  const updated = { ...current, ...settings }
  const storageKey = getStorageKey('user_settings')
  if (typeof window !== 'undefined') {
    localStorage.setItem(storageKey, JSON.stringify(updated))
    if (updated.theme) {
      document.documentElement.setAttribute('data-theme', updated.theme)
      localStorage.setItem('study_ai_theme', updated.theme)
    }
  }
  return updated
}

import { apiClient } from '@/lib/apiClient'
import { getAuthUser } from '@/auth/authSession'
import { getStorageKey } from '@/repositories/storageKeys'
import type {
  AchievementItem,
  LibraryItem,
  UserProfileData,
  UserSettingsData,
} from '@/types/supporting'

const DEFAULT_USER_SETTINGS: UserSettingsData = {
  theme: 'light',
  dailyGoalMinutes: 30,
  studyReminder: true,
  streakAlert: true,
  courseAlert: true,
  aiResponseStyle: 'balanced',
}

export async function getLibraryItems(filters?: {
  category?: string
  subjectId?: string
  search?: string
}): Promise<LibraryItem[]> {
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
}

export async function getAchievements(): Promise<AchievementItem[]> {
  const authUser = getAuthUser()
  if (!authUser) {
    return []
  }

  // The backend does not persist achievements yet. Return a truthful empty state
  // instead of manufacturing badges and unlock dates from unrelated statistics.
  return []
}

export async function getUserProfile(): Promise<UserProfileData | null> {
  const authUser = getAuthUser()
  if (!authUser) {
    return null
  }

  const stats = await apiClient.get<any>('/api/v1/practice/dashboard-stats')

  return {
    id: authUser.id,
    name: authUser.displayName || 'Học viên',
    avatar: '',
    grade: authUser.grade ? `Lớp ${authUser.grade}` : 'Chưa cập nhật',
    school: '',
    studyGoal: '',
    streakDays: stats?.streakDays ?? 0,
    totalXP: 0,
    studyHours: stats ? Math.round(((stats.totalStudyMinutes || 0) / 60) * 10) / 10 : 0,
    completedLessons: stats?.completedLessons ?? 0,
    subjectStats: stats?.subjectProgress?.map((s: any) => ({
      subjectId: s.subjectId,
      name: s.subjectName,
      completedLessons: s.completedLessons,
      totalLessons: s.totalLessons,
      progress: s.progressPercent,
    })) || [],
  }
}

export async function getUserSettings(): Promise<UserSettingsData> {
  const storageKey = getStorageKey('user_settings')
  const saved = typeof window !== 'undefined' ? localStorage.getItem(storageKey) : null
  if (saved) {
    try {
      return JSON.parse(saved)
    } catch {
      // fallback
    }
  }
  return { ...DEFAULT_USER_SETTINGS }
}

export async function updateUserSettings(settings: Partial<UserSettingsData>): Promise<UserSettingsData> {
  const current = await getUserSettings()
  const updated = { ...current, ...settings }
  const storageKey = getStorageKey('user_settings')
  if (typeof window !== 'undefined') {
    localStorage.setItem(storageKey, JSON.stringify(updated))
    document.documentElement.setAttribute('data-theme', 'light')
    localStorage.removeItem('study_ai_theme')
  }
  return updated
}

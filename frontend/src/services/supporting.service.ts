import { apiClient } from '@/lib/apiClient'
import { getAuthUser } from '@/auth/authSession'
import { getStorageKey } from '@/repositories/storageKeys'
import {
  mockAchievements,
  mockExercises,
  mockLibraryItems,
  mockUserProfile,
  mockUserSettings,
} from '@/data/supporting.mock'
import type {
  AchievementItem,
  ExerciseItem,
  LibraryItem,
  UserProfileData,
  UserSettingsData,
} from '@/types/supporting'

export async function getExercises(filters?: {
  subjectId?: string
  status?: string
}): Promise<ExerciseItem[]> {
  const authUser = getAuthUser()
  if (authUser) {
    try {
      const assignments = await apiClient.get<any[]>('/api/v1/assignments')
      const items: ExerciseItem[] = (assignments || []).map((a: any) => ({
        id: a.id,
        title: a.title,
        subjectId: a.classroomId || 'sub_math12',
        subjectName: a.classroomName || 'Toán học',
        difficulty: 'Thông hiểu' as const,
        totalQuestions: a.maxScore ? Math.round(a.maxScore) : 10,
        completedQuestions: a.mySubmission ? (a.mySubmission.status === 'graded' ? 10 : 5) : 0,
        durationMinutes: 45,
        quizId: a.id,
        status: a.mySubmission ? (a.mySubmission.status === 'graded' ? ('completed' as const) : ('in-progress' as const)) : ('not-started' as const),
      }))

      let list = items
      if (filters?.subjectId && filters.subjectId !== 'all') {
        list = list.filter((e) => e.subjectId === filters.subjectId)
      }
      if (filters?.status && filters.status !== 'all') {
        list = list.filter((e) => e.status === filters.status)
      }
      return list
    } catch (err: any) {
      throw new Error(`Không thể tải danh sách bài tập từ máy chủ: ${err?.message || 'Lỗi mạng'}`)
    }
  }

  await new Promise((resolve) => setTimeout(resolve, 150))
  let list = [...mockExercises]
  if (filters?.subjectId && filters.subjectId !== 'all') {
    list = list.filter((e) => e.subjectId === filters.subjectId)
  }
  if (filters?.status && filters.status !== 'all') {
    list = list.filter((e) => e.status === filters.status)
  }
  return list
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
  if (authUser) {
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
          unlockedDate: (stats?.streakDays || 0) >= 3 ? (stats?.recentAttempts?.[0]?.completedAt || new Date().toISOString()) : undefined,
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
          unlockedDate: (stats?.accuracyRate || 0) >= 80 && (stats?.totalQuestionsPracticed || 0) >= 5 ? (stats?.recentAttempts?.[0]?.completedAt || new Date().toISOString()) : undefined,
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
          unlockedDate: (stats?.completedLessons || 0) >= 1 ? (stats?.recentAttempts?.[0]?.completedAt || new Date().toISOString()) : undefined,
          xpReward: 80,
        },
      ]
    } catch (err: any) {
      throw new Error(`Không thể tải dữ liệu thành tích từ máy chủ: ${err?.message || 'Lỗi mạng'}`)
    }
  }

  await new Promise((resolve) => setTimeout(resolve, 150))
  return [...mockAchievements]
}

export async function getUserProfile(): Promise<UserProfileData> {
  await new Promise((resolve) => setTimeout(resolve, 50))
  const authUser = getAuthUser()
  if (authUser) {
    try {
      const stats = await apiClient.get<any>('/api/v1/practice/dashboard-stats')
      return {
        id: authUser.id,
        name: authUser.displayName || 'Học viên',
        avatar: '',
        grade: authUser.grade ? `Lớp ${authUser.grade}` : 'Lớp 12',
        school: 'THPT',
        studyGoal: 'Chinh phục kỳ thi THPT Quốc Gia với điểm số 8.5+',
        streakDays: stats?.streakDays ?? 0,
        totalXP: stats ? (stats.totalCorrectAnswers || 0) * 10 : 0,
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
    } catch (err: any) {
      throw new Error(`Không thể tải thông tin hồ sơ học viên từ máy chủ: ${err?.message || 'Lỗi mạng'}`)
    }
  }
  return { ...mockUserProfile }
}

export async function getUserSettings(): Promise<UserSettingsData> {
  const authUser = getAuthUser()
  if (authUser) {
    try {
      const serverPrefs = await apiClient.get<UserSettingsData>('/api/v1/me/preferences')
      if (serverPrefs) {
        return serverPrefs
      }
    } catch {
      throw new Error('Không thể tải cài đặt người dùng từ máy chủ. Vui lòng thử lại.')
    }
  }

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
  const authUser = getAuthUser()
  if (authUser) {
    const current = await getUserSettings()
    const updated = { ...current, ...settings }
    try {
      const saved = await apiClient.put<UserSettingsData>('/api/v1/me/preferences', updated)
      if (typeof window !== 'undefined' && saved.theme) {
        document.documentElement.setAttribute('data-theme', saved.theme)
        localStorage.setItem('study_ai_theme', saved.theme)
      }
      return saved
    } catch {
      throw new Error('Không thể lưu cài đặt người dùng lên máy chủ. Vui lòng thử lại.')
    }
  }

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

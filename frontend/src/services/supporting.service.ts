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
  await new Promise((resolve) => setTimeout(resolve, 150))
  return [...mockAchievements]
}

export async function getUserProfile(): Promise<UserProfileData> {
  await new Promise((resolve) => setTimeout(resolve, 150))
  return { ...mockUserProfile }
}

export async function getUserSettings(): Promise<UserSettingsData> {
  await new Promise((resolve) => setTimeout(resolve, 150))
  const saved = localStorage.getItem('study_ai_settings')
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
  localStorage.setItem('study_ai_settings', JSON.stringify(updated))
  if (updated.theme) {
    document.documentElement.setAttribute('data-theme', updated.theme)
    localStorage.setItem('study_ai_theme', updated.theme)
  }
  return updated
}

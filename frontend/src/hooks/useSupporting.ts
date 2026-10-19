import { useEffect, useState } from 'react'
import {
  getAchievements,
  getExercises,
  getLibraryItems,
  getUserProfile,
  getUserSettings,
  updateUserSettings,
} from '@/services/supporting.service'
import type {
  AchievementItem,
  ExerciseItem,
  LibraryItem,
  UserProfileData,
  UserSettingsData,
} from '@/types/supporting'

export function useExercises(filters?: { subjectId?: string; status?: string }) {
  const [exercises, setExercises] = useState<ExerciseItem[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchExercises = async () => {
    setIsLoading(true)
    setError(null)
    try {
      const data = await getExercises(filters)
      setExercises(data)
    } catch {
      setError('Lỗi khi tải danh sách bài tập.')
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchExercises()
  }, [filters?.subjectId, filters?.status])

  return { exercises, isLoading, error, reload: fetchExercises }
}

export function useLibrary(filters?: { category?: string; subjectId?: string; search?: string }) {
  const [items, setItems] = useState<LibraryItem[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchLibrary = async () => {
    setIsLoading(true)
    setError(null)
    try {
      const data = await getLibraryItems(filters)
      setItems(data)
    } catch {
      setError('Lỗi khi tải thư viện tài liệu.')
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchLibrary()
  }, [filters?.category, filters?.subjectId, filters?.search])

  return { items, isLoading, error, reload: fetchLibrary }
}

export function useAchievements() {
  const [achievements, setAchievements] = useState<AchievementItem[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchAchievements = async () => {
    setIsLoading(true)
    setError(null)
    try {
      const data = await getAchievements()
      setAchievements(data)
    } catch {
      setError('Lỗi khi tải danh sách thành tích.')
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchAchievements()
  }, [])

  return { achievements, isLoading, error, reload: fetchAchievements }
}

export function useUserProfile() {
  const [profile, setProfile] = useState<UserProfileData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchProfile = async () => {
    setIsLoading(true)
    setError(null)
    try {
      const data = await getUserProfile()
      setProfile(data)
    } catch {
      setError('Lỗi khi tải hồ sơ học sinh.')
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchProfile()
  }, [])

  return { profile, isLoading, error, reload: fetchProfile }
}

export function useUserSettings() {
  const [settings, setSettings] = useState<UserSettingsData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchSettings = async () => {
    setIsLoading(true)
    setError(null)
    try {
      const data = await getUserSettings()
      setSettings(data)
    } catch {
      setError('Lỗi khi tải cài đặt.')
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchSettings()
  }, [])

  const saveSettings = async (next: Partial<UserSettingsData>) => {
    try {
      const updated = await updateUserSettings(next)
      setSettings(updated)
    } catch {
      setError('Lỗi khi lưu cài đặt.')
    }
  }

  return { settings, isLoading, error, saveSettings, reload: fetchSettings }
}

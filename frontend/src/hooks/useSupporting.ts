import { useCallback, useEffect, useState } from 'react'
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

  const subjectFilter = filters?.subjectId
  const statusFilter = filters?.status

  const reload = useCallback(async () => {
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
  }, [filters])

  useEffect(() => {
    let isMounted = true

    getExercises({ subjectId: subjectFilter, status: statusFilter })
      .then((data) => {
        if (!isMounted) return
        setExercises(data)
        setIsLoading(false)
      })
      .catch(() => {
        if (!isMounted) return
        setError('Lỗi khi tải danh sách bài tập.')
        setIsLoading(false)
      })

    return () => {
      isMounted = false
    }
  }, [subjectFilter, statusFilter])

  return { exercises, isLoading, error, reload }
}

export function useLibrary(filters?: { category?: string; subjectId?: string; search?: string }) {
  const [items, setItems] = useState<LibraryItem[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const categoryFilter = filters?.category
  const subjectFilter = filters?.subjectId
  const searchFilter = filters?.search

  const reload = useCallback(async () => {
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
  }, [filters])

  useEffect(() => {
    let isMounted = true

    getLibraryItems({ category: categoryFilter, subjectId: subjectFilter, search: searchFilter })
      .then((data) => {
        if (!isMounted) return
        setItems(data)
        setIsLoading(false)
      })
      .catch(() => {
        if (!isMounted) return
        setError('Lỗi khi tải thư viện tài liệu.')
        setIsLoading(false)
      })

    return () => {
      isMounted = false
    }
  }, [categoryFilter, subjectFilter, searchFilter])

  return { items, isLoading, error, reload }
}

export function useAchievements() {
  const [achievements, setAchievements] = useState<AchievementItem[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const reload = useCallback(async () => {
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
  }, [])

  useEffect(() => {
    let isMounted = true

    getAchievements()
      .then((data) => {
        if (!isMounted) return
        setAchievements(data)
        setIsLoading(false)
      })
      .catch(() => {
        if (!isMounted) return
        setError('Lỗi khi tải danh sách thành tích.')
        setIsLoading(false)
      })

    return () => {
      isMounted = false
    }
  }, [])

  return { achievements, isLoading, error, reload }
}

export function useUserProfile() {
  const [profile, setProfile] = useState<UserProfileData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const reload = useCallback(async () => {
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
  }, [])

  useEffect(() => {
    let isMounted = true

    getUserProfile()
      .then((data) => {
        if (!isMounted) return
        setProfile(data)
        setIsLoading(false)
      })
      .catch(() => {
        if (!isMounted) return
        setError('Lỗi khi tải hồ sơ học sinh.')
        setIsLoading(false)
      })

    return () => {
      isMounted = false
    }
  }, [])

  return { profile, isLoading, error, reload }
}

export function useUserSettings() {
  const [settings, setSettings] = useState<UserSettingsData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const reload = useCallback(async () => {
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
  }, [])

  useEffect(() => {
    let isMounted = true

    getUserSettings()
      .then((data) => {
        if (!isMounted) return
        setSettings(data)
        setIsLoading(false)
      })
      .catch(() => {
        if (!isMounted) return
        setError('Lỗi khi tải cài đặt.')
        setIsLoading(false)
      })

    return () => {
      isMounted = false
    }
  }, [])

  const saveSettings = useCallback(async (next: Partial<UserSettingsData>) => {
    try {
      const updated = await updateUserSettings(next)
      setSettings(updated)
    } catch {
      setError('Lỗi khi lưu cài đặt.')
    }
  }, [])

  return { settings, isLoading, error, saveSettings, reload }
}

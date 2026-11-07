import { useCallback, useEffect, useState } from 'react'
import {
  personalizationService,
  type PersonalizationOverview,
} from '@/services/personalization.service'

export const PERSONALIZATION_CHANGED_EVENT = 'study_ai:personalization_changed'

export function usePersonalization() {
  const [data, setData] = useState<PersonalizationOverview | null>(null)
  const [loading, setLoading] = useState<boolean>(true)
  const [error, setError] = useState<string | null>(null)

  const reload = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      const overview = await personalizationService.getOverview()
      setData(overview)
    } catch (err: any) {
      setError(err?.message || 'Không thể tải dữ liệu phân tích cá nhân hóa.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    let isMounted = true

    const fetchInitial = async () => {
      try {
        const overview = await personalizationService.getOverview()
        if (isMounted) {
          setData(overview)
          setLoading(false)
        }
      } catch (err: any) {
        if (isMounted) {
          setError(err?.message || 'Lỗi khi tải dữ liệu cá nhân hóa.')
          setLoading(false)
        }
      }
    }

    fetchInitial()

    const handleStorage = (e: StorageEvent) => {
      if (
        e.key === 'study_ai_practice_results_v1' ||
        e.key === 'study_ai_practice_sessions_v1'
      ) {
        reload()
      }
    }

    const handleCustomChange = () => {
      reload()
    }

    if (typeof window !== 'undefined') {
      window.addEventListener('storage', handleStorage)
      window.addEventListener(PERSONALIZATION_CHANGED_EVENT, handleCustomChange)
    }

    return () => {
      isMounted = false
      if (typeof window !== 'undefined') {
        window.removeEventListener('storage', handleStorage)
        window.removeEventListener(PERSONALIZATION_CHANGED_EVENT, handleCustomChange)
      }
    }
  }, [reload])

  return {
    data,
    loading,
    error,
    reload,
  }
}

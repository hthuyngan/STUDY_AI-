import { useEffect, useState } from 'react'
import { useAuth } from '@/auth/useAuth'
import { type DashboardFetchOptions, fetchDashboardData } from '@/services/dashboard.service'
import type { DashboardData } from '@/types/dashboard'

export function useDashboard(options: DashboardFetchOptions = {}) {
  const { user, isAuthenticated, state } = useAuth()
  const [data, setData] = useState<DashboardData | null>(null)
  const [isLoading, setIsLoading] = useState<boolean>(true)
  const [error, setError] = useState<string | null>(null)
  const [reloadKey, setReloadKey] = useState(0)

  const { simulateEmpty, simulateError, delayMs } = options

  useEffect(() => {
    if (state === 'initializing') {
      return
    }

    let isMounted = true

    if (!isAuthenticated || !user) {
      setData(null)
      setIsLoading(false)
      return
    }

    setIsLoading(true)
    setError(null)

    fetchDashboardData({ simulateEmpty, simulateError, delayMs })
      .then((result) => {
        if (isMounted) {
          setData(result)
          setIsLoading(false)
        }
      })
      .catch((err: unknown) => {
        if (isMounted) {
          setError(err instanceof Error ? err.message : 'Đã có lỗi xảy ra.')
          setIsLoading(false)
        }
      })

    const handleLearningStateChanged = () => {
      fetchDashboardData({ simulateEmpty, simulateError, delayMs: 0 })
        .then((result) => {
          if (isMounted) {
            setData(result)
          }
        })
        .catch(() => {})
    }

    window.addEventListener('study_ai:learning_state_changed', handleLearningStateChanged)
    window.addEventListener('storage', handleLearningStateChanged)

    return () => {
      isMounted = false
      window.removeEventListener('study_ai:learning_state_changed', handleLearningStateChanged)
      window.removeEventListener('storage', handleLearningStateChanged)
    }
  }, [state, isAuthenticated, user, simulateEmpty, simulateError, delayMs, reloadKey])

  return {
    data,
    isLoading: state === 'initializing' || isLoading,
    error,
    reload: () => {
      setIsLoading(true)
      setReloadKey((k) => k + 1)
    },
  }
}

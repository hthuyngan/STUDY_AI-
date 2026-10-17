import { useEffect, useState } from 'react'
import { type DashboardFetchOptions, fetchDashboardData } from '@/services/dashboard.service'
import type { DashboardData } from '@/types/dashboard'

export function useDashboard(options: DashboardFetchOptions = {}) {
  const [data, setData] = useState<DashboardData | null>(null)
  const [isLoading, setIsLoading] = useState<boolean>(true)
  const [error, setError] = useState<string | null>(null)
  const [reloadKey, setReloadKey] = useState(0)

  const { simulateEmpty, simulateError, delayMs } = options

  useEffect(() => {
    let isMounted = true

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

    return () => {
      isMounted = false
    }
  }, [simulateEmpty, simulateError, delayMs, reloadKey])

  return {
    data,
    isLoading,
    error,
    reload: () => {
      setIsLoading(true)
      setReloadKey((k) => k + 1)
    },
  }
}

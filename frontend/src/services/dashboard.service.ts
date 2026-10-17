import { mockDashboardData } from '@/data/dashboard.mock'
import type { DashboardData } from '@/types/dashboard'

export interface DashboardFetchOptions {
  simulateEmpty?: boolean
  simulateError?: boolean
  delayMs?: number
}

export async function fetchDashboardData(options: DashboardFetchOptions = {}): Promise<DashboardData | null> {
  const { simulateEmpty = false, simulateError = false, delayMs = 300 } = options

  if (delayMs > 0) {
    await new Promise((resolve) => setTimeout(resolve, delayMs))
  }

  if (simulateError) {
    throw new Error('Không thể tải dữ liệu bảng điều khiển. Vui lòng thử lại.')
  }

  if (simulateEmpty) {
    return null
  }

  return mockDashboardData
}

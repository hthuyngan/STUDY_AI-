import { describe, it, expect, vi, beforeEach } from 'vitest'
import { adminService } from '@/services/admin.service'
import { apiClient } from '@/lib/apiClient'
import * as authSession from '@/auth/authSession'

describe('Admin System Health Fail-Closed & Database Storage Stats (Codex Review Issue 7)', () => {
  beforeEach(() => {
    localStorage.clear()
    vi.restoreAllMocks()
  })

  it('getSystemHealth throws and does NOT return synthetic health when authenticated and API fails', async () => {
    vi.spyOn(authSession, 'getAccessToken').mockReturnValue('mock_admin_token')
    vi.spyOn(apiClient, 'get').mockRejectedValue(new Error('502 Bad Gateway'))

    await expect(adminService.getSystemHealth()).rejects.toThrow('502 Bad Gateway')
  })

  it('getSystemHealth properly surfaces storageStats and operational status from backend response', async () => {
    vi.spyOn(authSession, 'getAccessToken').mockReturnValue('mock_admin_token')

    const mockHealthResponse = {
      apiStatus: 'operational',
      database: {
        status: 'connected',
        latencyMs: 12.5,
      },
      environment: 'development',
      backendVersion: '1.0.0',
      checkedAt: new Date().toISOString(),
      storageStats: {
        usersCount: 150,
        activitiesCount: 520,
        attentionCount: 3,
        isLocalStoragePersisted: false,
      },
    }

    vi.spyOn(apiClient, 'get').mockResolvedValue(mockHealthResponse)

    const health = await adminService.getSystemHealth()
    expect(health.apiStatus).toBe('ASP.NET Core 10 Web API (Operational)')
    expect(health.database.status).toBe('Microsoft SQL Server (Connected)')
    expect(health.storageStats).toBeDefined()
    expect(health.storageStats.usersCount).toBe(150)
    expect(health.storageStats.activitiesCount).toBe(520)
  })
})

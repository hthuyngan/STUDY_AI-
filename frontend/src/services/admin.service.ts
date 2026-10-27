import { apiClient } from '@/lib/apiClient'
import type {
  AdminActivityItem,
  AdminAttentionItem,
  AdminSystemMetrics,
  AdminUserItem,
} from '@/types/admin'

export const adminService = {
  async getMetrics(): Promise<AdminSystemMetrics> {
    const [dash, health] = await Promise.all([
      apiClient.get<{
        metrics: {
          totalUsers: number
          activeUsers: number
          staffCount: number
          learnersCount: number
          systemStatus: string
        }
      }>('/api/v1/admin/dashboard'),
      apiClient.get<{
        apiStatus: string
        database: { status: string; latencyMs: number }
        environment: string
        backendVersion: string
      }>('/api/v1/admin/system/health'),
    ])

    return {
      totalUsers: dash.metrics.totalUsers,
      activeLearners: dash.metrics.activeUsers,
      staffAccounts: dash.metrics.staffCount,
      openSupportTickets: 0,
      systemStatus: (dash.metrics.systemStatus as AdminSystemMetrics['systemStatus']) || 'healthy',
      apiLatencyMs: health.database.latencyMs > 0 ? health.database.latencyMs : 1,
      databaseStatus: (health.database.status as AdminSystemMetrics['databaseStatus']) || 'connected',
      frontendVersion: 'v2.1.0',
      backendVersion: health.backendVersion || 'v0.1.0',
      environment: health.environment || 'production',
    }
  },

  async getAttentionItems(): Promise<AdminAttentionItem[]> {
    // In production without mock fallback, return operational alerts
    return []
  },

  async getRecentActivities(): Promise<AdminActivityItem[]> {
    const dash = await apiClient.get<{
      recentActivities: Array<{
        id: string
        action: string
        actor: string
        targetType: string
        targetId: string
        timestamp: string
      }>
    }>('/api/v1/admin/dashboard')

    return (dash.recentActivities || []).map((a) => ({
      id: a.id,
      actorName: a.actor,
      action: a.action,
      target: `${a.targetType} (${a.targetId})`,
      timestamp: a.timestamp,
    }))
  },

  async getUsers(search = '', roleFilter = '', statusFilter = ''): Promise<AdminUserItem[]> {
    const params = new URLSearchParams()
    if (search.trim()) params.append('search', search.trim())
    if (roleFilter && roleFilter !== 'all') params.append('role', roleFilter)
    if (statusFilter && statusFilter !== 'all') params.append('status', statusFilter)
    params.append('page', '1')
    params.append('pageSize', '100')

    const res = await apiClient.get<{
      items: AdminUserItem[]
      page: number
      pageSize: number
      total: number
    }>(`/api/v1/admin/users?${params.toString()}`)

    return res.items || []
  },

  async getUserById(id: string): Promise<AdminUserItem | null> {
    try {
      return await apiClient.get<AdminUserItem>(`/api/v1/admin/users/${id}`)
    } catch {
      return null
    }
  },

  async updateUserRole(id: string, newRole: string): Promise<boolean> {
    await apiClient.patch(`/api/v1/admin/users/${id}/role`, { role: newRole })
    return true
  },

  async toggleUserStatus(id: string, currentStatus?: string): Promise<boolean> {
    const targetStatus = currentStatus === 'active' ? 'suspended' : 'active'
    await apiClient.patch(`/api/v1/admin/users/${id}/status`, { status: targetStatus })
    return true
  },

  async revokeUserSessions(id: string): Promise<boolean> {
    await apiClient.post(`/api/v1/admin/users/${id}/revoke-sessions`)
    return true
  },
}

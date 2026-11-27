import type {
  AccountStatus,
  AdminActivityItem,
  AdminAttentionItem,
  AdminSystemMetrics,
  AdminUserItem,
  AnalyticsTrendPoint,
  CreateDemoUserInput,
  PaginatedAdminUsers,
  ResetPasswordResult,
  TimeRangeFilter,
  UpdateUserInput,
  UserDistributionItem,
} from '@/types/admin'
import type { RolePermission } from '@/auth/permissions'
import { ROLE_PERMISSIONS } from '@/auth/permissions'
import type { UserRole } from '@/auth/auth.types'
import { apiClient } from '@/lib/apiClient'

import { getAccessToken } from '@/auth/authSession'

interface BackendUserDto {
  id: string
  email: string
  displayName: string
  grade?: string
  role: string
  status: string
  isDeleted?: boolean
  deletedAt?: string
  createdAt: string
  lastLoginAt?: string
}

interface BackendUsersResponse {
  items: BackendUserDto[]
  page: number
  pageSize: number
  total: number
  totalPages: number
}

interface BackendDashboardResponse {
  metrics: {
    totalUsers: number
    activeUsers: number
    suspendedUsers: number
    disabledUsers: number
    learnersCount: number
    teachersCount: number
    contentCount: number
    supportCount?: number
    adminsCount: number
    staffAccounts?: number
    recentNewUsersCount: number
    newUsersInRange?: number
    activeLearnersInRange?: number
    completedLessonsTotal?: number
    practiceSessionsInRange?: number
    assessmentAttemptsInRange?: number
    aiRequestsInRange?: number
    aiTotalTokensInRange?: number
    aiErrorCountInRange?: number
    aiErrorRatePercent?: number
    openSupportTicketsCount?: number | null
    subscriptionsModuleAvailable?: boolean
    activeSubscriptionsCount?: number | null
    actualRevenueVnd?: number | null
    timezone?: string
    systemStatus: string
  }
  recentActivities: Array<{
    id: string
    action: string
    actor: string
    targetType: string
    targetId: string
    payload?: string
    timestamp: string
  }>
  attentionItems?: AdminAttentionItem[]
}

interface BackendUserDetailDto extends BackendUserDto {
  totalCompletedLessons?: number
  averageScore?: number
  learningProgress?: {
    completedLessons: number
    totalLessons: number
    streakDays: number
    recentSubjects: Array<{ name: string; progress: number; lastStudied: string }>
  }
  assessments?: Array<{
    id: string
    subject: string
    title: string
    score: number
    maxScore: number
    completedAt: string
  }>
  activities?: Array<{
    id: string
    action: string
    timestamp: string
  }>
}

function mapBackendUser(u: BackendUserDetailDto): AdminUserItem {
  return {
    id: u.id,
    email: u.email || '',
    displayName: u.displayName || '',
    role: (u.role as UserRole) || 'learner',
    status: (u.status as AccountStatus) || 'active',
    className: u.grade,
    grade: u.grade,
    isDeleted: u.isDeleted,
    deletedAt: u.deletedAt,
    createdAt: u.createdAt,
    lastLoginAt: u.lastLoginAt,
    totalCompletedLessons: u.totalCompletedLessons ?? (u.role === 'learner' ? 0 : undefined),
    averageScore: u.averageScore ?? (u.role === 'learner' ? 0 : undefined),
    learningProgress: u.learningProgress,
    assessments: (u.assessments || []).map((a) => ({
      id: a.id,
      title: a.title,
      score: a.score,
      maxScore: a.maxScore,
      submittedAt: a.completedAt,
      status: (a.score >= a.maxScore * 0.5 ? 'passed' : 'failed') as 'passed' | 'failed',
    })),
    activities: u.activities || [],
  }
}

export const adminService = {
  async getMetrics(
    range: TimeRangeFilter = '7d',
    from?: string,
    to?: string
  ): Promise<AdminSystemMetrics> {
    const params = new URLSearchParams({ range })
    if (range === 'custom' && from && to) {
      params.set('from', from)
      params.set('to', to)
    }

    const [data, health] = await Promise.all([
      apiClient.get<BackendDashboardResponse>(`/api/v1/admin/dashboard?${params.toString()}`),
      apiClient.get<{
        database?: { status?: string; latencyMs?: number }
        environment?: string
        backendVersion?: string
      }>('/api/v1/admin/system/health'),
    ])

    const databaseConnected = health?.database?.status === 'connected'
    const totalUsers = data?.metrics?.totalUsers ?? 0
    const activeLearners = data?.metrics?.learnersCount ?? 0
    const staffAccounts = data?.metrics?.staffAccounts ?? Math.max(0, totalUsers - activeLearners)

    return {
      totalUsers,
      activeLearners,
      newUsersInRange: data?.metrics?.newUsersInRange ?? data?.metrics?.recentNewUsersCount ?? 0,
      activeLearnersInRange: data?.metrics?.activeLearnersInRange ?? 0,
      staffAccounts,
      completedLessonsTotal: data?.metrics?.completedLessonsTotal ?? 0,
      practiceSessionsInRange: data?.metrics?.practiceSessionsInRange ?? 0,
      assessmentAttemptsInRange: data?.metrics?.assessmentAttemptsInRange ?? 0,
      aiRequestsInRange: data?.metrics?.aiRequestsInRange ?? 0,
      aiTotalTokensInRange: data?.metrics?.aiTotalTokensInRange ?? 0,
      aiErrorCountInRange: data?.metrics?.aiErrorCountInRange ?? 0,
      aiErrorRatePercent: data?.metrics?.aiErrorRatePercent ?? 0,
      openSupportTicketsCount: data?.metrics?.openSupportTicketsCount ?? null,
      subscriptionsModuleAvailable: data?.metrics?.subscriptionsModuleAvailable ?? false,
      activeSubscriptionsCount: data?.metrics?.activeSubscriptionsCount ?? null,
      actualRevenueVnd: data?.metrics?.actualRevenueVnd ?? null,
      timezone: data?.metrics?.timezone ?? 'Asia/Bangkok',
      systemStatus: databaseConnected
        ? ((data?.metrics?.systemStatus as 'healthy' | 'degraded' | 'maintenance') || 'healthy')
        : 'degraded',
      apiLatencyMs: health?.database?.latencyMs ?? -1,
      databaseStatus: databaseConnected ? 'connected' : 'error',
      frontendVersion: import.meta.env.VITE_APP_VERSION || 'unknown',
      backendVersion: health?.backendVersion || 'unknown',
      environment: health?.environment || 'unknown',
      isPrototypeMode: false,
    }
  },

  async getAttentionItems(): Promise<AdminAttentionItem[]> {
    const data = await apiClient.get<BackendDashboardResponse>('/api/v1/admin/dashboard')
    if (data?.attentionItems && data.attentionItems.length > 0) {
      return data.attentionItems
    }
    return []
  },

  async getRecentActivities(): Promise<AdminActivityItem[]> {
    const data = await apiClient.get<BackendDashboardResponse>('/api/v1/admin/dashboard')
    if (data?.recentActivities) {
      return data.recentActivities.map((a) => ({
        id: a.id,
        actorName: a.actor || 'Quản trị viên',
        action: a.action,
        target: `${a.targetType} ${a.targetId}`,
        timestamp: a.timestamp,
      }))
    }
    return []
  },

  async getUsers(
    search = '',
    roleFilter = 'all',
    statusFilter = 'all',
    page = 1,
    pageSize = 50
  ): Promise<AdminUserItem[]> {
    const params = new URLSearchParams()
    if (search.trim()) params.set('search', search.trim())
    if (roleFilter && roleFilter !== 'all') params.set('role', roleFilter)
    if (statusFilter && statusFilter !== 'all') params.set('status', statusFilter)
    params.set('page', String(page))
    params.set('pageSize', String(pageSize))

    const res = await apiClient.get<BackendUsersResponse>(`/api/v1/admin/users?${params.toString()}`)
    if (res?.items) {
      return res.items.map(mapBackendUser)
    }
    return []
  },

  async getUsersPaginated(
    search = '',
    roleFilter = 'all',
    statusFilter = 'all',
    page = 1,
    pageSize = 10,
    sortBy = 'createdAt',
    sortOrder = 'desc'
  ): Promise<PaginatedAdminUsers> {
    const params = new URLSearchParams()
    if (search.trim()) params.set('search', search.trim())
    if (roleFilter && roleFilter !== 'all') params.set('role', roleFilter)
    if (statusFilter && statusFilter !== 'all') params.set('status', statusFilter)
    params.set('page', String(page))
    params.set('pageSize', String(pageSize))
    params.set('sortBy', sortBy)
    params.set('sortOrder', sortOrder)

    const res = await apiClient.get<BackendUsersResponse>(`/api/v1/admin/users?${params.toString()}`)
    if (res?.items) {
      return {
        items: res.items.map(mapBackendUser),
        page: res.page,
        pageSize: res.pageSize,
        total: res.total,
        totalPages: res.totalPages,
      }
    }
    return {
      items: [],
      page,
      pageSize,
      total: 0,
      totalPages: 0,
    }
  },

  async getUserById(userId: string): Promise<AdminUserItem | null> {
    try {
      const u = await apiClient.get<BackendUserDetailDto>(`/api/v1/admin/users/${userId}`)
      if (u) {
        return mapBackendUser(u)
      }
      return null
    } catch (err: any) {
      if (err?.status === 404 || err?.response?.status === 404) {
        return null
      }
      throw err
    }
  },

  async createUser(input: CreateDemoUserInput): Promise<AdminUserItem> {
    const payload = {
      email: input.email.trim(),
      displayName: input.displayName.trim(),
      role: input.role,
      status: input.status,
      grade: input.className || input.grade,
      password: input.password,
    }
    const res = await apiClient.post<{ user: BackendUserDto }>(
      '/api/v1/admin/users',
      payload
    )
    if (res?.user) {
      return mapBackendUser(res.user)
    }
    throw new Error('Không thể tạo người dùng trên hệ thống.')
  },

  async updateUser(userId: string, input: UpdateUserInput): Promise<AdminUserItem> {
    const res = await apiClient.patch<BackendUserDto>(`/api/v1/admin/users/${userId}`, input)
    if (res) {
      return mapBackendUser(res)
    }
    throw new Error('Không thể cập nhật thông tin người dùng.')
  },

  async updateUserRole(userId: string, newRole: string): Promise<boolean> {
    await apiClient.patch(`/api/v1/admin/users/${userId}/role`, { role: newRole })
    return true
  },

  async updateUserStatus(userId: string, newStatus: AccountStatus): Promise<boolean> {
    await apiClient.patch(`/api/v1/admin/users/${userId}/status`, { status: newStatus })
    return true
  },

  async toggleUserStatus(userId: string): Promise<boolean> {
    const user = await this.getUserById(userId)
    if (user) {
      const nextStatus = user.status === 'active' ? 'suspended' : 'active'
      return this.updateUserStatus(userId, nextStatus)
    }
    return false
  },

  async revokeUserSessions(userId: string): Promise<boolean> {
    await apiClient.post(`/api/v1/admin/users/${userId}/revoke-sessions`)
    return true
  },

  async resetPassword(userId: string, newPassword: string): Promise<ResetPasswordResult> {
    const res = await apiClient.post<ResetPasswordResult>(
      `/api/v1/admin/users/${userId}/reset-password`,
      { newPassword }
    )
    return res
  },

  async deleteUser(userId: string): Promise<boolean> {
    await apiClient.delete(`/api/v1/admin/users/${userId}`)
    return true
  },

  async bulkUpdateStatus(userIds: string[], newStatus: AccountStatus): Promise<{ updatedCount: number }> {
    let count = 0
    for (const id of userIds) {
      const ok = await this.updateUserStatus(id, newStatus)
      if (ok) count++
    }
    return { updatedCount: count }
  },

  async bulkUpdateRole(userIds: string[], newRole: UserRole): Promise<{ updatedCount: number }> {
    let count = 0
    for (const id of userIds) {
      const ok = await this.updateUserRole(id, newRole)
      if (ok) count++
    }
    return { updatedCount: count }
  },

  async bulkDeleteUsers(userIds: string[]): Promise<{ deletedCount: number }> {
    let count = 0
    for (const id of userIds) {
      const ok = await this.deleteUser(id)
      if (ok) count++
    }
    return { deletedCount: count }
  },

  async getAnalytics(
    range: TimeRangeFilter = '7d',
    from?: string,
    to?: string
  ): Promise<{
    trends: AnalyticsTrendPoint[]
    roleDistribution: UserDistributionItem[]
    statusDistribution: UserDistributionItem[]
  }> {
    const params = new URLSearchParams({ range })
    if (range === 'custom' && from && to) {
      params.set('from', from)
      params.set('to', to)
    }

    const data = await apiClient.get<{
      trends: Array<
        AnalyticsTrendPoint & {
          assessmentAttempts?: number
        }
      >
      roleDistribution: UserDistributionItem[]
      statusDistribution: UserDistributionItem[]
    }>(`/api/v1/admin/analytics?${params.toString()}`)

    return {
      trends: (data?.trends || []).map((t) => ({
        date: t.date,
        label: t.label || t.date,
        completedLessons: t.completedLessons ?? 0,
        activeUsers: t.activeUsers ?? 0,
        assessments: t.assessments ?? t.assessmentAttempts ?? 0,
        newUsers: t.newUsers ?? 0,
        practiceSessions: t.practiceSessions ?? 0,
        aiRequests: t.aiRequests ?? 0,
        aiTokens: t.aiTokens ?? 0,
        aiErrors: t.aiErrors ?? 0,
      })),
      roleDistribution: data?.roleDistribution || [],
      statusDistribution: data?.statusDistribution || [],
    }
  },

  async getRolePermissionsSimulation(): Promise<Record<UserRole, RolePermission[]>> {
    return JSON.parse(JSON.stringify(ROLE_PERMISSIONS))
  },

  async toggleRolePermissionSimulation(_role: UserRole, _permission: RolePermission): Promise<Record<UserRole, RolePermission[]>> {
    // RBAC is immutable and code-defined; returns authoritative permissions matrix
    return JSON.parse(JSON.stringify(ROLE_PERMISSIONS))
  },

  async resetRolePermissionsSimulation(): Promise<Record<UserRole, RolePermission[]>> {
    return JSON.parse(JSON.stringify(ROLE_PERMISSIONS))
  },

  exportUsersCSV(users: AdminUserItem[]): string {
    const headers = ['ID', 'Họ và tên', 'Email', 'Vai trò', 'Trạng thái', 'Khối lớp', 'Ngày tạo', 'Lần đăng nhập cuối']
    const rows = users.map((u) => [
      u.id,
      `"${u.displayName.replace(/"/g, '""')}"`,
      `"${u.email}"`,
      u.role,
      u.status,
      `"${u.className || ''}"`,
      u.createdAt,
      u.lastLoginAt || 'Chưa đăng nhập',
    ])
    return [headers.join(','), ...rows.map((r) => r.join(','))].join('\n')
  },

  downloadCSV(csvContent: string, filename = 'study_ai_users.csv'): void {
    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.setAttribute('href', url)
    link.setAttribute('download', filename)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  },

  async getSystemHealth(): Promise<{
    apiStatus: string
    database: { status: string; latencyMs: number }
    environment: string
    backendVersion: string
    checkedAt: string
    prototypeMode: boolean
    storageStats: {
      usersCount: number
      activitiesCount: number
      attentionCount: number
      isLocalStoragePersisted: boolean
    }
  }> {
    const token = getAccessToken()
    if (!token) {
      throw new Error('Cần đăng nhập bằng tài khoản quản trị để xem trạng thái hệ thống.')
    }

    const res = await apiClient.get<any>('/api/v1/admin/system/health')
    if (res) {
      return {
        apiStatus: res.apiStatus === 'operational' ? 'ASP.NET Core 10 Web API (Operational)' : res.apiStatus || 'Operational',
        database: {
          status: res.database?.status === 'connected' ? 'Microsoft SQL Server (Connected)' : 'Microsoft SQL Server (Disconnected)',
          latencyMs: res.database?.latencyMs ?? -1,
        },
        environment: res.environment || 'development',
        backendVersion: res.backendVersion ? `v${res.backendVersion} (ASP.NET Core 10)` : 'v1.0.0 (ASP.NET Core 10)',
        checkedAt: res.checkedAt || new Date().toISOString(),
        prototypeMode: false,
        storageStats: {
          usersCount: res.storageStats?.usersCount ?? 0,
          activitiesCount: res.storageStats?.activitiesCount ?? 0,
          attentionCount: res.storageStats?.attentionCount ?? 0,
          isLocalStoragePersisted: false,
        },
      }
    }
    throw new Error('Dữ liệu trạng thái hệ thống từ máy chủ không hợp lệ.')
  },

  _resetMockState(): void {
    // No-op in real backend architecture
  },
}

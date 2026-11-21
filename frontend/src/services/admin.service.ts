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
import {
  INITIAL_MOCK_ACTIVITIES,
  INITIAL_MOCK_ATTENTION_ITEMS,
  INITIAL_MOCK_METRICS,
  INITIAL_MOCK_USERS,
  MOCK_TRENDS_7D,
  MOCK_TRENDS_30D,
  MOCK_TRENDS_MONTH,
} from '@/data/staff/admin.mock'

const STORAGE_KEY_USERS = 'study_ai_admin_users_v2'
const STORAGE_KEY_ACTIVITIES = 'study_ai_admin_activities_v2'
const STORAGE_KEY_ATTENTION = 'study_ai_admin_attention_v2'
const STORAGE_KEY_ROLE_SIM = 'study_ai_admin_role_sim_v2'

function safeGetStorage<T>(key: string, fallback: T): T {
  try {
    if (typeof window === 'undefined' || !window.localStorage) return fallback
    const raw = window.localStorage.getItem(key)
    if (!raw) return fallback
    return JSON.parse(raw) as T
  } catch {
    return fallback
  }
}

function safeSetStorage<T>(key: string, value: T): void {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      window.localStorage.setItem(key, JSON.stringify(value))
    }
  } catch {
    // Ignore storage quota or disabled errors
  }
}

// In-memory state synchronized with localStorage (fallback for offline/mock test runs)
let mockUsers: AdminUserItem[] = safeGetStorage<AdminUserItem[]>(STORAGE_KEY_USERS, [...INITIAL_MOCK_USERS])
let mockActivities: AdminActivityItem[] = safeGetStorage<AdminActivityItem[]>(STORAGE_KEY_ACTIVITIES, [...INITIAL_MOCK_ACTIVITIES])
const mockAttentionItems: AdminAttentionItem[] = safeGetStorage<AdminAttentionItem[]>(STORAGE_KEY_ATTENTION, [...INITIAL_MOCK_ATTENTION_ITEMS])
let mockRoleSim: Record<UserRole, RolePermission[]> = safeGetStorage<Record<UserRole, RolePermission[]>>(
  STORAGE_KEY_ROLE_SIM,
  JSON.parse(JSON.stringify(ROLE_PERMISSIONS))
)

function persistAll() {
  safeSetStorage(STORAGE_KEY_USERS, mockUsers)
  safeSetStorage(STORAGE_KEY_ACTIVITIES, mockActivities)
  safeSetStorage(STORAGE_KEY_ATTENTION, mockAttentionItems)
  safeSetStorage(STORAGE_KEY_ROLE_SIM, mockRoleSim)
}

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
    completedLessonsTotal?: number
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
  async getMetrics(): Promise<AdminSystemMetrics> {
    const token = getAccessToken()
    if (token) {
      const [data, health] = await Promise.all([
        apiClient.get<BackendDashboardResponse>('/api/v1/admin/dashboard'),
        apiClient.get<{
          database?: { status?: string; latencyMs?: number }
          environment?: string
          backendVersion?: string
        }>('/api/v1/admin/system/health'),
      ])
      if (data?.metrics) {
        const databaseConnected = health?.database?.status === 'connected'
        return {
          totalUsers: data.metrics.totalUsers,
          activeLearners: data.metrics.learnersCount,
          staffAccounts: data.metrics.staffAccounts ?? (data.metrics.totalUsers - data.metrics.learnersCount),
          completedLessonsTotal: data.metrics.completedLessonsTotal ?? 0,
          systemStatus: databaseConnected
            ? ((data.metrics.systemStatus as 'healthy' | 'degraded' | 'maintenance') || 'healthy')
            : 'degraded',
          apiLatencyMs: health?.database?.latencyMs ?? -1,
          databaseStatus: databaseConnected ? 'connected' : 'error',
          frontendVersion: import.meta.env.VITE_APP_VERSION || 'unknown',
          backendVersion: health?.backendVersion || 'unknown',
          environment: health?.environment || 'unknown',
          isPrototypeMode: false,
        }
      }
    }

    const totalUsers = mockUsers.length
    const activeLearners = mockUsers.filter((u) => u.role === 'learner' && u.status === 'active').length
    const staffAccounts = mockUsers.filter((u) => u.role !== 'learner').length

    return {
      ...INITIAL_MOCK_METRICS,
      totalUsers,
      activeLearners,
      staffAccounts,
      isPrototypeMode: true,
    }
  },

  async getAttentionItems(): Promise<AdminAttentionItem[]> {
    const token = getAccessToken()
    if (token) {
      const data = await apiClient.get<BackendDashboardResponse>('/api/v1/admin/dashboard')
      if (data?.attentionItems && data.attentionItems.length > 0) {
        return data.attentionItems
      }
      return []
    }
    return [...mockAttentionItems]
  },

  async getRecentActivities(): Promise<AdminActivityItem[]> {
    const token = getAccessToken()
    if (token) {
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
    }
    return [...mockActivities]
  },

  async getUsers(
    search = '',
    roleFilter = 'all',
    statusFilter = 'all',
    page = 1,
    pageSize = 50
  ): Promise<AdminUserItem[]> {
    const token = getAccessToken()
    if (token) {
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
    }

    let result = [...mockUsers]
    if (search.trim()) {
      const q = search.trim().toLowerCase()
      result = result.filter(
        (u) =>
          u.displayName.toLowerCase().includes(q) ||
          u.email.toLowerCase().includes(q) ||
          (u.className && u.className.toLowerCase().includes(q))
      )
    }
    if (roleFilter && roleFilter !== 'all') {
      result = result.filter((u) => u.role === roleFilter)
    }
    if (statusFilter && statusFilter !== 'all') {
      result = result.filter((u) => u.status === statusFilter)
    }
    return result
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
    const token = getAccessToken()
    if (token) {
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
    }

    const all = await this.getUsers(search, roleFilter, statusFilter)
    const startIndex = (page - 1) * pageSize
    const paginated = all.slice(startIndex, startIndex + pageSize)
    return {
      items: paginated,
      page,
      pageSize,
      total: all.length,
      totalPages: Math.max(1, Math.ceil(all.length / pageSize)),
    }
  },

  async getUserById(userId: string): Promise<AdminUserItem | null> {
    const token = getAccessToken()
    if (token) {
      try {
        const u = await apiClient.get<BackendUserDetailDto>(`/api/v1/admin/users/${userId}`)
        if (u) {
          return mapBackendUser(u)
        }
      } catch (err: any) {
        if (err?.status === 404 || err?.response?.status === 404) {
          return null
        }
        throw err
      }
    }

    const user = mockUsers.find((u) => u.id === userId)
    return user ? JSON.parse(JSON.stringify(user)) : null
  },

  async createUser(input: CreateDemoUserInput): Promise<AdminUserItem> {
    const token = getAccessToken()
    if (token) {
      const payload = {
        email: input.email.trim(),
        displayName: input.displayName.trim(),
        role: input.role,
        status: input.status,
        grade: input.className || input.grade,
        password: input.password,
      }
      const res = await apiClient.post<{ user: BackendUserDto; temporaryPassword?: string }>(
        '/api/v1/admin/users',
        payload
      )
      if (res?.user) {
        return mapBackendUser(res.user)
      }
    }

    const newId = `usr-${Date.now().toString().slice(-4)}`
    const isLearner = input.role === 'learner'

    const newUser: AdminUserItem = {
      id: newId,
      email: input.email.trim(),
      displayName: input.displayName.trim(),
      role: input.role,
      status: input.status,
      className: input.className?.trim() || (isLearner ? 'Khối 12' : undefined),
      createdAt: new Date().toISOString(),
      lastLoginAt: undefined,
      totalCompletedLessons: isLearner ? 0 : undefined,
      averageScore: isLearner ? 0 : undefined,
      learningProgress: isLearner
        ? {
            completedLessons: 0,
            totalLessons: 32,
            streakDays: 0,
            recentSubjects: [{ name: 'Toán học 12', progress: 0, lastStudied: new Date().toISOString() }],
          }
        : undefined,
      assessments: [],
      activities: [
        {
          id: `uact-${Date.now()}`,
          action: 'Tài khoản được tạo thủ công bởi Quản trị viên',
          timestamp: new Date().toISOString(),
        },
      ],
    }

    mockUsers.unshift(newUser)
    mockActivities.unshift({
      id: `act-${Date.now()}`,
      actorName: 'Quản trị viên Hệ thống',
      action: 'thêm tài khoản mới',
      target: `${newUser.displayName} (${newUser.role})`,
      timestamp: new Date().toISOString(),
    })

    persistAll()
    return newUser
  },

  async updateUser(userId: string, input: UpdateUserInput): Promise<AdminUserItem> {
    const token = getAccessToken()
    if (token) {
      const res = await apiClient.patch<BackendUserDto>(`/api/v1/admin/users/${userId}`, input)
      if (res) {
        return mapBackendUser(res)
      }
    }

    const user = mockUsers.find((u) => u.id === userId)
    if (!user) throw new Error('Không tìm thấy người dùng')

    if (input.displayName) user.displayName = input.displayName.trim()
    if (input.role) user.role = input.role
    if (input.status) user.status = input.status
    if (input.grade) user.className = input.grade
    persistAll()
    return user
  },

  async updateUserRole(userId: string, newRole: string): Promise<boolean> {
    const token = getAccessToken()
    if (token) {
      await apiClient.patch(`/api/v1/admin/users/${userId}/role`, { role: newRole })
      return true
    }

    const user = mockUsers.find((u) => u.id === userId)
    if (user) {
      const oldRole = user.role
      user.role = newRole as UserRole

      if (!user.activities) user.activities = []
      user.activities.unshift({
        id: `uact-${Date.now()}`,
        action: `Vai trò được cập nhật từ ${oldRole} sang ${newRole}`,
        timestamp: new Date().toISOString(),
      })

      mockActivities.unshift({
        id: `act-${Date.now()}`,
        actorName: 'Quản trị viên Hệ thống',
        action: 'cập nhật vai trò thành công cho',
        target: `${user.displayName} (${user.role})`,
        timestamp: new Date().toISOString(),
      })
      persistAll()
      return true
    }
    return false
  },

  async updateUserStatus(userId: string, newStatus: AccountStatus): Promise<boolean> {
    const token = getAccessToken()
    if (token) {
      await apiClient.patch(`/api/v1/admin/users/${userId}/status`, { status: newStatus })
      return true
    }

    const user = mockUsers.find((u) => u.id === userId)
    if (user) {
      user.status = newStatus
      persistAll()
      return true
    }
    return false
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
    const token = getAccessToken()
    if (token) {
      await apiClient.post(`/api/v1/admin/users/${userId}/revoke-sessions`)
      return true
    }

    const user = mockUsers.find((u) => u.id === userId)
    if (user) {
      if (!user.activities) user.activities = []
      user.activities.unshift({
        id: `uact-${Date.now()}`,
        action: 'Thu hồi toàn bộ phiên đăng nhập của tài khoản',
        timestamp: new Date().toISOString(),
      })

      mockActivities.unshift({
        id: `act-${Date.now()}`,
        actorName: 'Quản trị viên Hệ thống',
        action: 'thu hồi phiên đăng nhập của',
        target: `${user.displayName}`,
        timestamp: new Date().toISOString(),
      })
      persistAll()
      return true
    }
    return false
  },

  async resetPassword(userId: string, newPassword?: string): Promise<ResetPasswordResult> {
    const token = getAccessToken()
    if (token) {
      const res = await apiClient.post<ResetPasswordResult>(
        `/api/v1/admin/users/${userId}/reset-password`,
        { newPassword }
      )
      return res
    }

    return {
      success: true,
      userId,
      temporaryPassword: newPassword || 'StudyAI@2026',
      message: 'Mật khẩu đã được đặt lại thành công (Mô phỏng).',
    }
  },

  async deleteUser(userId: string): Promise<boolean> {
    const token = getAccessToken()
    if (token) {
      await apiClient.delete(`/api/v1/admin/users/${userId}`)
      return true
    }

    const idx = mockUsers.findIndex((u) => u.id === userId)
    if (idx !== -1) {
      mockUsers.splice(idx, 1)
      persistAll()
      return true
    }
    return false
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

  async getAnalytics(range: TimeRangeFilter = '7d'): Promise<{
    trends: AnalyticsTrendPoint[]
    roleDistribution: UserDistributionItem[]
    statusDistribution: UserDistributionItem[]
  }> {
    const token = getAccessToken()
    if (token) {
      const data = await apiClient.get<{
        trends: AnalyticsTrendPoint[]
        roleDistribution: UserDistributionItem[]
        statusDistribution: UserDistributionItem[]
      }>(`/api/v1/admin/analytics?range=${range}`)
      if (data?.trends && data?.roleDistribution && data?.statusDistribution) {
        return data
      }
    }

    let trends = MOCK_TRENDS_7D
    if (range === '30d') trends = MOCK_TRENDS_30D
    else if (range === 'month') trends = MOCK_TRENDS_MONTH

    const total = mockUsers.length || 1
    const learnerCount = mockUsers.filter((u) => u.role === 'learner').length
    const teacherCount = mockUsers.filter((u) => u.role === 'teacher').length
    const contentCount = mockUsers.filter((u) => u.role === 'content').length
    const adminCount = mockUsers.filter((u) => u.role === 'admin').length

    const roleDistribution: UserDistributionItem[] = [
      { name: 'Học viên (Learner)', key: 'learner', count: learnerCount, percentage: Math.round((learnerCount / total) * 100), color: '#0284c7' },
      { name: 'Giáo viên (Teacher)', key: 'teacher', count: teacherCount, percentage: Math.round((teacherCount / total) * 100), color: '#8b5cf6' },
      { name: 'Nội dung (Content)', key: 'content', count: contentCount, percentage: Math.round((contentCount / total) * 100), color: '#f59e0b' },
      { name: 'Quản trị (Admin)', key: 'admin', count: adminCount, percentage: Math.round((adminCount / total) * 100), color: '#ef4444' },
    ]

    const activeCount = mockUsers.filter((u) => u.status === 'active').length
    const pendingCount = mockUsers.filter((u) => u.status === 'pending').length
    const suspendedCount = mockUsers.filter((u) => u.status === 'suspended').length
    const disabledCount = mockUsers.filter((u) => u.status === 'disabled').length

    const statusDistribution: UserDistributionItem[] = [
      { name: 'Đang hoạt động', key: 'active', count: activeCount, percentage: Math.round((activeCount / total) * 100), color: '#16a34a' },
      { name: 'Chờ duyệt', key: 'pending', count: pendingCount, percentage: Math.round((pendingCount / total) * 100), color: '#eab308' },
      { name: 'Tạm khóa', key: 'suspended', count: suspendedCount, percentage: Math.round((suspendedCount / total) * 100), color: '#f97316' },
      { name: 'Vô hiệu hóa', key: 'disabled', count: disabledCount, percentage: Math.round((disabledCount / total) * 100), color: '#dc2626' },
    ]

    return { trends, roleDistribution, statusDistribution }
  },

  async getRolePermissionsSimulation(): Promise<Record<UserRole, RolePermission[]>> {
    return JSON.parse(JSON.stringify(mockRoleSim))
  },

  async toggleRolePermissionSimulation(role: UserRole, permission: RolePermission): Promise<Record<UserRole, RolePermission[]>> {
    const current = mockRoleSim[role] || []
    if (current.includes(permission)) {
      mockRoleSim[role] = current.filter((p) => p !== permission)
    } else {
      mockRoleSim[role] = [...current, permission]
    }
    persistAll()
    return JSON.parse(JSON.stringify(mockRoleSim))
  },

  async resetRolePermissionsSimulation(): Promise<Record<UserRole, RolePermission[]>> {
    mockRoleSim = JSON.parse(JSON.stringify(ROLE_PERMISSIONS))
    persistAll()
    return JSON.parse(JSON.stringify(mockRoleSim))
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
    if (token) {
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
    }
    throw new Error('Cần đăng nhập bằng tài khoản quản trị để xem trạng thái hệ thống.')
  },

  _resetMockState(): void {
    mockUsers = [...INITIAL_MOCK_USERS]
    mockActivities = [...INITIAL_MOCK_ACTIVITIES]
    mockRoleSim = JSON.parse(JSON.stringify(ROLE_PERMISSIONS))
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.removeItem(STORAGE_KEY_USERS)
        window.localStorage.removeItem(STORAGE_KEY_ACTIVITIES)
        window.localStorage.removeItem(STORAGE_KEY_ATTENTION)
        window.localStorage.removeItem(STORAGE_KEY_ROLE_SIM)
      }
    } catch {
      // Ignore
    }
  },
}

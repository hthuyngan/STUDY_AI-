import { useCallback, useEffect, useMemo, useState } from 'react'
import { adminService } from '@/services/admin.service'
import type {
  AccountStatus,
  AdminActivityItem,
  AdminAttentionItem,
  AdminSystemMetrics,
  AdminUserItem,
  AnalyticsTrendPoint,
  CreateDemoUserInput,
  TimeRangeFilter,
  UserDistributionItem,
} from '@/types/admin'
import type { RolePermission } from '@/auth/permissions'
import type { UserRole } from '@/auth/auth.types'

export function useAdminDashboard(initialRange: TimeRangeFilter = '7d') {
  const [metrics, setMetrics] = useState<AdminSystemMetrics | null>(null)
  const [attentionItems, setAttentionItems] = useState<AdminAttentionItem[]>([])
  const [activities, setActivities] = useState<AdminActivityItem[]>([])
  const [timeRange, setTimeRange] = useState<TimeRangeFilter>(initialRange)
  const [trends, setTrends] = useState<AnalyticsTrendPoint[]>([])
  const [roleDistribution, setRoleDistribution] = useState<UserDistributionItem[]>([])
  const [statusDistribution, setStatusDistribution] = useState<UserDistributionItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const loadData = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const [m, att, act, analytics] = await Promise.all([
        adminService.getMetrics(),
        adminService.getAttentionItems(),
        adminService.getRecentActivities(),
        adminService.getAnalytics(timeRange),
      ])
      setMetrics(m)
      setAttentionItems(att)
      setActivities(act)
      setTrends(analytics.trends)
      setRoleDistribution(analytics.roleDistribution)
      setStatusDistribution(analytics.statusDistribution)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Không thể tải dữ liệu quản trị')
    } finally {
      setLoading(false)
    }
  }, [timeRange])

  useEffect(() => {
    let isMounted = true
    Promise.all([
      adminService.getMetrics(),
      adminService.getAttentionItems(),
      adminService.getRecentActivities(),
      adminService.getAnalytics(timeRange),
    ])
      .then(([m, att, act, analytics]) => {
        if (!isMounted) return
        setMetrics(m)
        setAttentionItems(att)
        setActivities(act)
        setTrends(analytics.trends)
        setRoleDistribution(analytics.roleDistribution)
        setStatusDistribution(analytics.statusDistribution)
        setLoading(false)
      })
      .catch((err: unknown) => {
        if (!isMounted) return
        setError(err instanceof Error ? err.message : 'Không thể tải dữ liệu quản trị')
        setLoading(false)
      })

    return () => {
      isMounted = false
    }
  }, [timeRange])

  return {
    metrics,
    attentionItems,
    activities,
    timeRange,
    setTimeRange,
    trends,
    roleDistribution,
    statusDistribution,
    loading,
    error,
    refresh: loadData,
  }
}

export function useAdminUsers(initialSearch = '', initialRole = 'all', initialStatus = 'all') {
  const [users, setUsers] = useState<AdminUserItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState(initialSearch)
  const [roleFilter, setRoleFilter] = useState(initialRole)
  const [statusFilter, setStatusFilter] = useState(initialStatus)

  // Pagination state
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)

  // Selection state
  const [selectedIds, setSelectedIds] = useState<string[]>([])

  const fetchUsers = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await adminService.getUsers(search, roleFilter, statusFilter)
      setUsers(data)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Không thể tải danh sách người dùng')
    } finally {
      setLoading(false)
    }
  }, [search, roleFilter, statusFilter])

  useEffect(() => {
    let isMounted = true
    adminService
      .getUsers(search, roleFilter, statusFilter)
      .then((data) => {
        if (!isMounted) return
        setUsers(data)
        setLoading(false)
      })
      .catch((err: unknown) => {
        if (!isMounted) return
        setError(err instanceof Error ? err.message : 'Không thể tải danh sách người dùng')
        setLoading(false)
      })

    return () => {
      isMounted = false
    }
  }, [search, roleFilter, statusFilter])

  // Handlers that update filter and reset page
  const handleSetSearch = useCallback((val: string) => {
    setSearch(val)
    setPage(1)
    setSelectedIds([])
  }, [])

  const handleSetRoleFilter = useCallback((val: string) => {
    setRoleFilter(val)
    setPage(1)
    setSelectedIds([])
  }, [])

  const handleSetStatusFilter = useCallback((val: string) => {
    setStatusFilter(val)
    setPage(1)
    setSelectedIds([])
  }, [])

  const handleSetPageSize = useCallback((val: number) => {
    setPageSize(val)
    setPage(1)
    setSelectedIds([])
  }, [])

  // Pagination calculations
  const totalCount = users.length
  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize))
  const paginatedUsers = useMemo(() => {
    const startIndex = (page - 1) * pageSize
    return users.slice(startIndex, startIndex + pageSize)
  }, [users, page, pageSize])

  // Selection handlers
  const toggleSelect = useCallback((userId: string) => {
    setSelectedIds((prev) =>
      prev.includes(userId) ? prev.filter((id) => id !== userId) : [...prev, userId]
    )
  }, [])

  const toggleSelectAll = useCallback(() => {
    const currentPageIds = paginatedUsers.map((u) => u.id)
    const isAllSelected = currentPageIds.length > 0 && currentPageIds.every((id) => selectedIds.includes(id))

    if (isAllSelected) {
      setSelectedIds((prev) => prev.filter((id) => !currentPageIds.includes(id)))
    } else {
      setSelectedIds((prev) => Array.from(new Set([...prev, ...currentPageIds])))
    }
  }, [paginatedUsers, selectedIds])

  const clearSelection = useCallback(() => {
    setSelectedIds([])
  }, [])

  const isSelectedAll = useMemo(() => {
    return paginatedUsers.length > 0 && paginatedUsers.every((u) => selectedIds.includes(u.id))
  }, [paginatedUsers, selectedIds])

  const createUser = async (input: CreateDemoUserInput) => {
    const newUser = await adminService.createUser(input)
    await fetchUsers()
    return newUser
  }

  const changeUserRole = async (userId: string, newRole: string) => {
    const ok = await adminService.updateUserRole(userId, newRole)
    if (ok) {
      void fetchUsers()
    }
    return ok
  }

  const toggleStatus = async (userId: string) => {
    const ok = await adminService.toggleUserStatus(userId)
    if (ok) {
      void fetchUsers()
    }
    return ok
  }

  const bulkUpdateStatus = async (newStatus: AccountStatus) => {
    if (selectedIds.length === 0) return { updatedCount: 0 }
    const res = await adminService.bulkUpdateStatus(selectedIds, newStatus)
    setSelectedIds([])
    await fetchUsers()
    return res
  }

  const bulkUpdateRole = async (newRole: UserRole) => {
    if (selectedIds.length === 0) return { updatedCount: 0 }
    const res = await adminService.bulkUpdateRole(selectedIds, newRole)
    setSelectedIds([])
    await fetchUsers()
    return res
  }

  const bulkDelete = async () => {
    if (selectedIds.length === 0) return { deletedCount: 0 }
    const res = await adminService.bulkDeleteUsers(selectedIds)
    setSelectedIds([])
    await fetchUsers()
    return res
  }

  const exportCSV = () => {
    const csvContent = adminService.exportUsersCSV(users)
    adminService.downloadCSV(csvContent, `study_ai_users_${new Date().toISOString().slice(0, 10)}.csv`)
  }

  return {
    users,
    paginatedUsers,
    totalCount,
    totalPages,
    page,
    setPage,
    pageSize,
    setPageSize: handleSetPageSize,
    selectedIds,
    isSelectedAll,
    toggleSelect,
    toggleSelectAll,
    clearSelection,
    loading,
    error,
    search,
    setSearch: handleSetSearch,
    roleFilter,
    setRoleFilter: handleSetRoleFilter,
    statusFilter,
    setStatusFilter: handleSetStatusFilter,
    createUser,
    changeUserRole,
    toggleStatus,
    bulkUpdateStatus,
    bulkUpdateRole,
    bulkDelete,
    exportCSV,
    refresh: fetchUsers,
  }
}

export function useAdminUserDetail(userId: string) {
  const [user, setUser] = useState<AdminUserItem | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<'overview' | 'progress' | 'assessments' | 'activities'>('overview')

  const loadUser = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await adminService.getUserById(userId)
      if (!data) {
        setError('Không tìm thấy người dùng')
      } else {
        setUser(data)
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Lỗi khi tải thông tin')
    } finally {
      setLoading(false)
    }
  }, [userId])

  useEffect(() => {
    let isMounted = true
    adminService
      .getUserById(userId)
      .then((data) => {
        if (!isMounted) return
        if (!data) {
          setError('Không tìm thấy người dùng')
        } else {
          setUser(data)
        }
        setLoading(false)
      })
      .catch((err: unknown) => {
        if (!isMounted) return
        setError(err instanceof Error ? err.message : 'Lỗi khi tải thông tin')
        setLoading(false)
      })

    return () => {
      isMounted = false
    }
  }, [userId])

  const updateRole = async (newRole: string) => {
    const ok = await adminService.updateUserRole(userId, newRole)
    if (ok) await loadUser()
    return ok
  }

  const toggleStatus = async () => {
    const ok = await adminService.toggleUserStatus(userId)
    if (ok) await loadUser()
    return ok
  }

  const revokeSessions = async () => {
    const ok = await adminService.revokeUserSessions(userId)
    if (ok) await loadUser()
    return ok
  }

  return {
    user,
    loading,
    error,
    activeTab,
    setActiveTab,
    updateRole,
    toggleStatus,
    revokeSessions,
    refresh: loadUser,
  }
}

export function useAdminRolesSimulation() {
  const [permissionsMap, setPermissionsMap] = useState<Record<UserRole, RolePermission[]> | null>(null)
  const [loading, setLoading] = useState(true)

  const loadPermissions = useCallback(async () => {
    setLoading(true)
    const data = await adminService.getRolePermissionsSimulation()
    setPermissionsMap(data)
    setLoading(false)
  }, [])

  useEffect(() => {
    let isMounted = true
    adminService.getRolePermissionsSimulation().then((data) => {
      if (!isMounted) return
      setPermissionsMap(data)
      setLoading(false)
    })
    return () => {
      isMounted = false
    }
  }, [])

  const togglePermission = async (role: UserRole, perm: RolePermission) => {
    const updated = await adminService.toggleRolePermissionSimulation(role, perm)
    setPermissionsMap(updated)
  }

  const resetDefaults = async () => {
    const res = await adminService.resetRolePermissionsSimulation()
    setPermissionsMap(res)
  }

  return { permissionsMap, loading, togglePermission, resetDefaults, refresh: loadPermissions }
}

export function useAdminSystemHealth() {
  const [health, setHealth] = useState<Awaited<ReturnType<typeof adminService.getSystemHealth>> | null>(null)
  const [loading, setLoading] = useState(true)

  const loadHealth = useCallback(async () => {
    setLoading(true)
    const data = await adminService.getSystemHealth()
    setHealth(data)
    setLoading(false)
  }, [])

  useEffect(() => {
    let isMounted = true
    adminService.getSystemHealth().then((data) => {
      if (!isMounted) return
      setHealth(data)
      setLoading(false)
    })
    return () => {
      isMounted = false
    }
  }, [])

  const resetDemoData = async () => {
    adminService._resetMockState()
    await loadHealth()
  }

  return { health, loading, resetDemoData, refresh: loadHealth }
}

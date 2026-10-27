import { useCallback, useEffect, useState } from 'react'
import { adminService } from '@/services/admin.service'
import type {
  AdminActivityItem,
  AdminAttentionItem,
  AdminSystemMetrics,
  AdminUserItem,
} from '@/types/admin'

export function useAdminDashboard() {
  const [metrics, setMetrics] = useState<AdminSystemMetrics | null>(null)
  const [attentionItems, setAttentionItems] = useState<AdminAttentionItem[]>([])
  const [activities, setActivities] = useState<AdminActivityItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const loadData = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const [m, att, act] = await Promise.all([
        adminService.getMetrics(),
        adminService.getAttentionItems(),
        adminService.getRecentActivities(),
      ])
      setMetrics(m)
      setAttentionItems(att)
      setActivities(act)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Không thể tải dữ liệu quản trị')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    let isMounted = true
    Promise.all([
      adminService.getMetrics(),
      adminService.getAttentionItems(),
      adminService.getRecentActivities(),
    ])
      .then(([m, att, act]) => {
        if (!isMounted) return
        setMetrics(m)
        setAttentionItems(att)
        setActivities(act)
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
  }, [])

  return { metrics, attentionItems, activities, loading, error, refresh: loadData }
}

export function useAdminUsers(initialSearch = '', initialRole = 'all', initialStatus = 'all') {
  const [users, setUsers] = useState<AdminUserItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState(initialSearch)
  const [roleFilter, setRoleFilter] = useState(initialRole)
  const [statusFilter, setStatusFilter] = useState(initialStatus)

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

  return {
    users,
    loading,
    error,
    search,
    setSearch,
    roleFilter,
    setRoleFilter,
    statusFilter,
    setStatusFilter,
    changeUserRole,
    toggleStatus,
    refresh: fetchUsers,
  }
}

export function useAdminUserDetail(userId: string) {
  const [user, setUser] = useState<AdminUserItem | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

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

  return { user, loading, error, refresh: loadUser }
}

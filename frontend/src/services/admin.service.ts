import type {
  AdminActivityItem,
  AdminAttentionItem,
  AdminSystemMetrics,
  AdminUserItem,
} from '@/types/admin'

const MOCK_USERS: AdminUserItem[] = [
  {
    id: 'usr-101',
    email: 'minh.anh@example.com',
    displayName: 'Nguyễn Minh Anh',
    role: 'learner',
    status: 'active',
    createdAt: '2026-09-01T08:00:00Z',
    lastLoginAt: '2026-10-27T10:30:00Z',
    totalCompletedLessons: 18,
    averageScore: 88,
  },
  {
    id: 'usr-102',
    email: 'gia.huy@example.com',
    displayName: 'Trần Gia Huy',
    role: 'learner',
    status: 'active',
    createdAt: '2026-09-05T09:15:00Z',
    lastLoginAt: '2026-10-26T15:20:00Z',
    totalCompletedLessons: 12,
    averageScore: 76,
  },
  {
    id: 'usr-103',
    email: 'thanh.thao@example.com',
    displayName: 'Lê Thanh Thảo',
    role: 'teacher',
    status: 'active',
    createdAt: '2026-08-15T11:00:00Z',
    lastLoginAt: '2026-10-27T08:45:00Z',
  },
  {
    id: 'usr-104',
    email: 'van.nam@example.com',
    displayName: 'Phạm Văn Nam',
    role: 'content',
    status: 'active',
    createdAt: '2026-08-20T14:00:00Z',
    lastLoginAt: '2026-10-27T09:10:00Z',
  },
  {
    id: 'usr-105',
    email: 'hoang.yen@example.com',
    displayName: 'Vũ Hoàng Yến',
    role: 'support',
    status: 'active',
    createdAt: '2026-09-10T10:00:00Z',
    lastLoginAt: '2026-10-27T11:00:00Z',
  },
  {
    id: 'usr-106',
    email: 'admin.studyai@example.com',
    displayName: 'Quản trị viên Hệ thống',
    role: 'admin',
    status: 'active',
    createdAt: '2026-08-01T00:00:00Z',
    lastLoginAt: '2026-10-27T12:00:00Z',
  },
  {
    id: 'usr-107',
    email: 'dinh.trong@example.com',
    displayName: 'Đinh Trọng Phúc',
    role: 'learner',
    status: 'suspended',
    createdAt: '2026-09-12T16:00:00Z',
    lastLoginAt: '2026-10-20T14:30:00Z',
    totalCompletedLessons: 4,
    averageScore: 45,
  },
]

const MOCK_ATTENTION_ITEMS: AdminAttentionItem[] = [
  {
    id: 'att-1',
    type: 'staff_pending',
    title: 'Tài khoản giáo viên mới chờ kích hoạt',
    description: 'Cô Nguyễn Thị Mai (Bộ môn Vật lý) đăng ký tài khoản giáo viên trường THPT Chuyên.',
    timestamp: '2026-10-27T09:30:00Z',
    severity: 'medium',
    actionUrl: '/admin/users',
  },
  {
    id: 'att-2',
    type: 'content_review',
    title: '3 bài học Toán 12 đang chờ duyệt xuất bản',
    description: 'Chương Khảo sát hàm số có 3 bài hoàn thiện biên soạn cần quản trị viên duyệt.',
    timestamp: '2026-10-27T08:00:00Z',
    severity: 'medium',
    actionUrl: '/content/review',
  },
  {
    id: 'att-3',
    type: 'support_escalated',
    title: 'Ticket hỗ trợ đồng bộ dữ liệu leo thang',
    description: 'Học viên báo tiến độ làm bài thi thử môn Hóa chưa đồng bộ sau khi đổi thiết bị.',
    timestamp: '2026-10-26T22:15:00Z',
    severity: 'high',
    actionUrl: '/support/tickets',
  },
]

const MOCK_ACTIVITIES: AdminActivityItem[] = [
  {
    id: 'act-1',
    actorName: 'Quản trị viên Hệ thống',
    action: 'cập nhật vai trò thành công cho',
    target: 'Lê Thanh Thảo (Giáo viên)',
    timestamp: '2026-10-27T08:45:00Z',
  },
  {
    id: 'act-2',
    actorName: 'Phạm Văn Nam (Nội dung)',
    action: 'gửi yêu cầu duyệt bài học',
    target: 'Cực trị của hàm số bậc ba',
    timestamp: '2026-10-27T08:15:00Z',
  },
  {
    id: 'act-3',
    actorName: 'Vũ Hoàng Yến (Hỗ trợ)',
    action: 'đóng ticket hỗ trợ kỹ thuật',
    target: '#TK-4821',
    timestamp: '2026-10-26T17:30:00Z',
  },
]

export const adminService = {
  async getMetrics(): Promise<AdminSystemMetrics> {
    return {
      totalUsers: 1420,
      activeLearners: 1180,
      staffAccounts: 48,
      openSupportTickets: 7,
      systemStatus: 'healthy',
      apiLatencyMs: 42,
      databaseStatus: 'connected',
      frontendVersion: 'v2.1.0',
      backendVersion: 'v1.4.0',
      environment: 'development',
    }
  },

  async getAttentionItems(): Promise<AdminAttentionItem[]> {
    return [...MOCK_ATTENTION_ITEMS]
  },

  async getRecentActivities(): Promise<AdminActivityItem[]> {
    return [...MOCK_ACTIVITIES]
  },

  async getUsers(search = '', roleFilter = '', statusFilter = ''): Promise<AdminUserItem[]> {
    let result = [...MOCK_USERS]
    if (search) {
      const q = search.toLowerCase()
      result = result.filter(
        (u) =>
          u.displayName.toLowerCase().includes(q) ||
          u.email.toLowerCase().includes(q)
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

  async getUserById(id: string): Promise<AdminUserItem | null> {
    const user = MOCK_USERS.find((u) => u.id === id)
    return user ? { ...user } : null
  },

  async updateUserRole(id: string, newRole: string): Promise<boolean> {
    const user = MOCK_USERS.find((u) => u.id === id)
    if (user) {
      user.role = newRole as AdminUserItem['role']
      return true
    }
    return false
  },

  async toggleUserStatus(id: string): Promise<boolean> {
    const user = MOCK_USERS.find((u) => u.id === id)
    if (user) {
      user.status = user.status === 'active' ? 'suspended' : 'active'
      return true
    }
    return false
  },
}

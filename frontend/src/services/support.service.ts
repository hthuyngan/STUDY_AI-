import type {
  SupportTicketItem,
  SupportTicketMessage,
  SupportUserProfile,
  TicketStatus,
} from '@/types/support'

const MOCK_TICKETS: SupportTicketItem[] = [
  {
    id: 'TK-4821',
    title: 'Tiến độ làm bài thu hoạch không đồng bộ sau khi mở máy tính khác',
    userId: 'usr-101',
    userName: 'Nguyễn Minh Anh',
    userEmail: 'minh.anh@example.com',
    category: 'sync',
    priority: 'high',
    status: 'in-progress',
    updatedAt: '2026-10-27T10:30:00Z',
    assignedTo: 'Vũ Hoàng Yến',
    messageCount: 3,
  },
  {
    id: 'TK-4822',
    title: 'Không hiển thị lời giải chi tiết cho câu hỏi trắc nghiệm số 3',
    userId: 'usr-102',
    userName: 'Trần Gia Huy',
    userEmail: 'gia.huy@example.com',
    category: 'content',
    priority: 'medium',
    status: 'open',
    updatedAt: '2026-10-27T09:15:00Z',
    messageCount: 1,
  },
  {
    id: 'TK-4819',
    title: 'Yêu cầu cập nhật lại thông tin khối lớp từ 11 sang 12',
    userId: 'usr-107',
    userName: 'Đinh Trọng Phúc',
    userEmail: 'dinh.trong@example.com',
    category: 'account',
    priority: 'low',
    status: 'waiting',
    updatedAt: '2026-10-26T14:00:00Z',
    assignedTo: 'Vũ Hoàng Yến',
    messageCount: 4,
  },
  {
    id: 'TK-4815',
    title: 'Báo lỗi giật lag khi mở đoạn video mô phỏng con lắc lò xo',
    userId: 'usr-108',
    userName: 'Võ Thảo My',
    userEmail: 'thao.my@example.com',
    category: 'other',
    priority: 'medium',
    status: 'resolved',
    updatedAt: '2026-10-25T11:20:00Z',
    assignedTo: 'Nguyễn Tuấn Kiệt',
    messageCount: 5,
  },
]

const MOCK_MESSAGES: Record<string, SupportTicketMessage[]> = {
  'TK-4821': [
    {
      id: 'msg-1',
      ticketId: 'TK-4821',
      senderId: 'usr-101',
      senderName: 'Nguyễn Minh Anh',
      senderRole: 'user',
      message: 'Chào ban hỗ trợ, tối qua em có làm bài thu hoạch Toán 12 trên điện thoại đạt 90%, sáng nay đăng nhập trên máy tính trường thì thấy bài học vẫn báo Chưa làm. Nhờ anh chị kiểm tra giúp em ạ.',
      timestamp: '2026-10-27T08:10:00Z',
    },
    {
      id: 'msg-2',
      ticketId: 'TK-4821',
      senderId: 'usr-105',
      senderName: 'Vũ Hoàng Yến (Hỗ trợ)',
      senderRole: 'support',
      message: 'Chào Minh Anh, hệ thống đã ghi nhận yêu cầu. Hiện tại tài khoản của bạn đang có 1 gói đồng bộ nền (Sync Queue) chưa hoàn tất từ thiết bị di động cũ do mất kết nối mạng. Bạn có thể mở lại ứng dụng trên điện thoại trong 10 giây để hoàn tất tải lên nhé.',
      timestamp: '2026-10-27T09:00:00Z',
    },
    {
      id: 'msg-3',
      ticketId: 'TK-4821',
      senderId: 'usr-101',
      senderName: 'Nguyễn Minh Anh',
      senderRole: 'user',
      message: 'Dạ em đã mở lại điện thoại và thấy hệ thống báo "Đã đồng bộ 0ms trước" rồi ạ. Em cảm ơn chị!',
      timestamp: '2026-10-27T10:30:00Z',
    },
  ],
}

export const supportService = {
  async getDashboardSummary() {
    return {
      openCount: 4,
      waitingCount: 2,
      escalatedCount: 1,
      resolvedTodayCount: 5,
      recentTickets: [...MOCK_TICKETS],
    }
  },

  async getTickets(
    category: string = 'all',
    priority: string = 'all',
    status: string = 'all',
    search: string = ''
  ): Promise<SupportTicketItem[]> {
    let list = [...MOCK_TICKETS]
    if (category && category !== 'all') {
      list = list.filter((t) => t.category === category)
    }
    if (priority && priority !== 'all') {
      list = list.filter((t) => t.priority === priority)
    }
    if (status && status !== 'all') {
      list = list.filter((t) => t.status === status)
    }
    if (search) {
      const q = search.toLowerCase()
      list = list.filter(
        (t) =>
          t.title.toLowerCase().includes(q) ||
          t.userName.toLowerCase().includes(q) ||
          t.userEmail.toLowerCase().includes(q) ||
          t.id.toLowerCase().includes(q)
      )
    }
    return list
  },

  async getTicketDetail(ticketId: string): Promise<{
    ticket: SupportTicketItem | null
    messages: SupportTicketMessage[]
    userProfile: SupportUserProfile | null
  }> {
    const ticket = MOCK_TICKETS.find((t) => t.id === ticketId) || null
    const messages = MOCK_MESSAGES[ticketId] || []
    const userProfile: SupportUserProfile | null = ticket
      ? {
          id: ticket.userId,
          email: ticket.userEmail,
          displayName: ticket.userName,
          role: 'learner',
          status: 'active',
          createdAt: '2026-09-01T08:00:00Z',
          lastLoginAt: '2026-10-27T10:30:00Z',
          syncState: 'synced',
          storageNamespace: `study_ai.${ticket.userId}.v2`,
          completedLessonsCount: 18,
          totalAttemptsCount: 22,
          recentTicketHistory: [
            {
              id: 'TK-4821',
              title: ticket.title,
              status: ticket.status,
              date: '2026-10-27',
            },
          ],
        }
      : null

    return { ticket, messages, userProfile }
  },

  async sendReply(ticketId: string, message: string): Promise<SupportTicketMessage> {
    const newMsg: SupportTicketMessage = {
      id: `msg-${Date.now()}`,
      ticketId,
      senderId: 'usr-support-me',
      senderName: 'Nhân viên Hỗ trợ',
      senderRole: 'support',
      message,
      timestamp: new Date().toISOString(),
    }
    if (!MOCK_MESSAGES[ticketId]) {
      MOCK_MESSAGES[ticketId] = []
    }
    MOCK_MESSAGES[ticketId].push(newMsg)
    return newMsg
  },

  async updateTicketStatus(ticketId: string, status: TicketStatus): Promise<boolean> {
    const ticket = MOCK_TICKETS.find((t) => t.id === ticketId)
    if (ticket) {
      ticket.status = status
      ticket.updatedAt = new Date().toISOString()
      return true
    }
    return false
  },

  async lookupUser(query: string): Promise<SupportUserProfile | null> {
    if (!query) return null
    const q = query.toLowerCase()
    const ticket = MOCK_TICKETS.find(
      (t) =>
        t.userEmail.toLowerCase().includes(q) ||
        t.userName.toLowerCase().includes(q) ||
        t.userId.toLowerCase().includes(q)
    )
    if (!ticket) return null

    return {
      id: ticket.userId,
      email: ticket.userEmail,
      displayName: ticket.userName,
      role: 'learner',
      status: 'active',
      createdAt: '2026-09-01T08:00:00Z',
      lastLoginAt: '2026-10-27T10:30:00Z',
      syncState: 'synced',
      storageNamespace: `study_ai.${ticket.userId}.v2`,
      completedLessonsCount: 18,
      totalAttemptsCount: 22,
      recentTicketHistory: [
        {
          id: ticket.id,
          title: ticket.title,
          status: ticket.status,
          date: '2026-10-27',
        },
      ],
    }
  },
}

import { apiClient } from '@/lib/apiClient'
import type {
  SupportTicketItem,
  SupportTicketMessage,
  SupportUserProfile,
  TicketStatus,
} from '@/types/support'

export const supportService = {
  async getDashboardSummary() {
    const res = await apiClient.get<{
      items: any[]
      total: number
    }>('/api/v1/support/tickets?pageSize=100')

    const tickets = res.items || []
    const openCount = tickets.filter((t) => t.status === 'open').length
    const inProgressCount = tickets.filter((t) => t.status === 'in_progress' || t.status === 'in-progress').length
    const resolvedTodayCount = tickets.filter((t) => t.status === 'resolved').length

    return {
      openCount,
      waitingCount: inProgressCount,
      escalatedCount: tickets.filter((t) => t.priority === 'urgent' || t.priority === 'high').length,
      resolvedTodayCount,
      recentTickets: tickets.slice(0, 5).map((t) => ({
        id: t.id,
        title: t.subject,
        userId: t.userId,
        userName: t.userName,
        userEmail: t.userEmail,
        category: (t.category as SupportTicketItem['category']) || 'sync',
        priority: (t.priority as SupportTicketItem['priority']) || 'medium',
        status: (t.status as SupportTicketItem['status']) || 'open',
        updatedAt: t.updatedAt,
        assignedTo: t.assigneeName || undefined,
        messageCount: t.messageCount || 0,
      })),
    }
  },

  async getTickets(
    categoryFilter = 'all',
    priorityFilter = 'all',
    statusFilter = 'all',
    search = ''
  ): Promise<SupportTicketItem[]> {
    const params = new URLSearchParams()
    if (categoryFilter && categoryFilter !== 'all') params.append('category', categoryFilter)
    if (statusFilter && statusFilter !== 'all') params.append('status', statusFilter)
    if (priorityFilter && priorityFilter !== 'all') params.append('priority', priorityFilter)
    params.append('pageSize', '100')

    const res = await apiClient.get<{
      items: Array<{
        id: string
        subject: string
        status: string
        priority: string
        category: string
        userId: string
        userName: string
        userEmail: string
        assignedTo: string | null
        assigneeName: string | null
        messageCount: number
        createdAt: string
        updatedAt: string
      }>
      total: number
    }>(`/api/v1/support/tickets?${params.toString()}`)

    let list: SupportTicketItem[] = (res.items || []).map((t) => ({
      id: t.id,
      title: t.subject,
      userId: t.userId,
      userName: t.userName,
      userEmail: t.userEmail,
      category: (t.category as SupportTicketItem['category']) || 'sync',
      priority: (t.priority as SupportTicketItem['priority']) || 'medium',
      status: (t.status === 'in_progress' ? 'in-progress' : t.status) as SupportTicketItem['status'],
      updatedAt: t.updatedAt,
      assignedTo: t.assigneeName || undefined,
      messageCount: t.messageCount || 0,
    }))

    if (search.trim()) {
      const q = search.trim().toLowerCase()
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
    try {
      const t = await apiClient.get<{
        id: string
        subject: string
        status: string
        priority: string
        category: string
        userId: string
        userName: string
        userEmail: string
        assignedTo: string | null
        assigneeName: string | null
        messages: Array<{
          id: string
          senderId: string
          senderName: string
          senderRole: string
          message: string
          isInternal: boolean
          createdAt: string
        }>
        updatedAt: string
      }>(`/api/v1/support/tickets/${ticketId}`)

      const ticketItem: SupportTicketItem = {
        id: t.id,
        title: t.subject,
        userId: t.userId,
        userName: t.userName,
        userEmail: t.userEmail,
        category: (t.category as SupportTicketItem['category']) || 'sync',
        priority: (t.priority as SupportTicketItem['priority']) || 'medium',
        status: (t.status === 'in_progress' ? 'in-progress' : t.status) as SupportTicketItem['status'],
        updatedAt: t.updatedAt,
        assignedTo: t.assigneeName || undefined,
        messageCount: t.messages.length,
      }

      const messages: SupportTicketMessage[] = t.messages.map((m) => ({
        id: m.id,
        ticketId: t.id,
        senderId: m.senderId,
        senderName: m.senderName,
        senderRole: (m.senderRole === 'support' ? 'support' : 'user') as SupportTicketMessage['senderRole'],
        message: m.message,
        timestamp: m.createdAt,
      }))

      let userProfile: SupportUserProfile | null = null
      try {
        const u = await apiClient.get<{
          id: string
          displayName: string
          email: string
          grade: string
          role: string
          status: string
          createdAt: string
          stats: { ticketCount: number; completedLessons: number }
          recentTickets: Array<{ id: string; subject: string; status: string; createdAt: string }>
        }>(`/api/v1/support/users/${t.userId}`)

        userProfile = {
          id: u.id,
          email: u.email,
          displayName: u.displayName,
          role: 'learner',
          status: (u.status as SupportUserProfile['status']) || 'active',
          createdAt: u.createdAt,
          lastLoginAt: undefined,
          syncState: 'synced',
          storageNamespace: `study_ai.${u.id}.v2`,
          completedLessonsCount: u.stats.completedLessons || 0,
          totalAttemptsCount: 0,
          recentTicketHistory: (u.recentTickets || []).map((rt) => ({
            id: rt.id,
            title: rt.subject,
            status: (rt.status as TicketStatus) || 'open',
            date: rt.createdAt,
          })),
        }
      } catch {
        // Fallback userProfile from ticket header
        userProfile = {
          id: t.userId,
          email: t.userEmail,
          displayName: t.userName,
          role: 'learner',
          status: 'active',
          createdAt: new Date().toISOString(),
          syncState: 'synced',
          storageNamespace: `study_ai.${t.userId}.v2`,
          completedLessonsCount: 0,
          totalAttemptsCount: 0,
          recentTicketHistory: [],
        }
      }

      return { ticket: ticketItem, messages, userProfile }
    } catch {
      return { ticket: null, messages: [], userProfile: null }
    }
  },

  async sendReply(ticketId: string, message: string): Promise<SupportTicketMessage> {
    const res = await apiClient.post<{
      id: string
      ticketId: string
      senderId: string
      senderName: string
      senderRole: string
      message: string
      createdAt: string
    }>(`/api/v1/support/tickets/${ticketId}/messages`, {
      message,
      isInternal: false,
    })

    return {
      id: res.id,
      ticketId,
      senderId: res.senderId,
      senderName: res.senderName,
      senderRole: 'support',
      message: res.message,
      timestamp: res.createdAt,
    }
  },

  async updateTicketStatus(ticketId: string, status: TicketStatus): Promise<boolean> {
    const backendStatus = status === 'in-progress' ? 'in_progress' : status
    await apiClient.patch(`/api/v1/support/tickets/${ticketId}`, { status: backendStatus })
    return true
  },

  async lookupUser(query: string): Promise<SupportUserProfile | null> {
    if (!query.trim()) return null
    try {
      const res = await apiClient.get<{
        items: Array<{
          id: string
          displayName: string
          email: string
          grade: string
          role: string
          status: string
          ticketCount: number
          createdAt: string
        }>
        total: number
      }>(`/api/v1/support/users?search=${encodeURIComponent(query.trim())}&pageSize=1`)

      const first = res.items?.[0]
      if (!first) return null

      return {
        id: first.id,
        email: first.email,
        displayName: first.displayName,
        role: 'learner',
        status: (first.status as SupportUserProfile['status']) || 'active',
        createdAt: first.createdAt,
        syncState: 'synced',
        storageNamespace: `study_ai.${first.id}.v2`,
        completedLessonsCount: 0,
        totalAttemptsCount: 0,
        recentTicketHistory: [],
      }
    } catch {
      return null
    }
  },
}

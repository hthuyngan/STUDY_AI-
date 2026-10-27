import type {
  SupportTicketItem,
  SupportTicketMessage,
  SupportUserProfile,
  TicketStatus,
} from '@/types/support'
import {
  INITIAL_MOCK_MESSAGES,
  INITIAL_MOCK_TICKETS,
  INITIAL_SUPPORT_PROFILES,
} from '@/data/staff/support.mock'

let mockTickets = [...INITIAL_MOCK_TICKETS]
const mockMessages: Record<string, SupportTicketMessage[]> = { ...INITIAL_MOCK_MESSAGES }
const mockProfiles: Record<string, SupportUserProfile> = { ...INITIAL_SUPPORT_PROFILES }

export const supportService = {
  async getDashboardSummary() {
    return {
      openCount: mockTickets.filter((t) => t.status === 'open').length,
      waitingCount: mockTickets.filter((t) => t.status === 'in-progress' || t.status === 'waiting').length,
      escalatedCount: mockTickets.filter((t) => t.priority === 'urgent' || t.priority === 'high').length,
      resolvedTodayCount: mockTickets.filter((t) => t.status === 'resolved').length,
      recentTickets: [...mockTickets],
    }
  },

  async getTickets(
    category = 'all',
    priority = 'all',
    status = 'all',
    search = ''
  ): Promise<SupportTicketItem[]> {
    let list = [...mockTickets]
    if (category && category !== 'all') {
      list = list.filter((t) => t.category === category)
    }
    if (priority && priority !== 'all') {
      list = list.filter((t) => t.priority === priority)
    }
    if (status && status !== 'all') {
      list = list.filter((t) => t.status === status)
    }
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
    const ticket = mockTickets.find((t) => t.id === ticketId) || null
    const messages = mockMessages[ticketId] || []
    const profile = ticket && mockProfiles[ticket.userId] ? mockProfiles[ticket.userId] : null

    const userProfile: SupportUserProfile | null = ticket
      ? profile || {
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
    if (!mockMessages[ticketId]) {
      mockMessages[ticketId] = []
    }
    mockMessages[ticketId].push(newMsg)

    // Update ticket message count & timestamp
    mockTickets = mockTickets.map((t) =>
      t.id === ticketId
        ? {
            ...t,
            messageCount: t.messageCount + 1,
            updatedAt: newMsg.timestamp,
          }
        : t
    )

    return newMsg
  },

  async updateTicketStatus(ticketId: string, status: TicketStatus): Promise<boolean> {
    const ticket = mockTickets.find((t) => t.id === ticketId)
    if (ticket) {
      ticket.status = status
      ticket.updatedAt = new Date().toISOString()
      return true
    }
    return false
  },

  async lookupUser(query: string): Promise<SupportUserProfile | null> {
    if (!query.trim()) return null
    const q = query.trim().toLowerCase()
    const ticket = mockTickets.find(
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

  _resetMockState(): void {
    mockTickets = [...INITIAL_MOCK_TICKETS]
  },
}

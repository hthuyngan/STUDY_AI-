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
import { operationsService } from './operations.service'

const STORAGE_KEYS = {
  TICKETS: 'study_ai_support_tickets_v5',
  MESSAGES: 'study_ai_support_messages_v5',
}

function loadTickets(): SupportTicketItem[] {
  if (typeof window === 'undefined' || !window.localStorage) {
    return JSON.parse(JSON.stringify(INITIAL_MOCK_TICKETS))
  }
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.TICKETS)
    return raw ? JSON.parse(raw) : JSON.parse(JSON.stringify(INITIAL_MOCK_TICKETS))
  } catch {
    return JSON.parse(JSON.stringify(INITIAL_MOCK_TICKETS))
  }
}

function saveTickets(data: SupportTicketItem[]): void {
  if (typeof window === 'undefined' || !window.localStorage) return
  try {
    localStorage.setItem(STORAGE_KEYS.TICKETS, JSON.stringify(data))
    window.dispatchEvent(new CustomEvent('study_ai_operations_change', { detail: { key: STORAGE_KEYS.TICKETS } }))
  } catch (e) {
    console.error('Failed to save tickets:', e)
  }
}

function loadMessages(): Record<string, SupportTicketMessage[]> {
  if (typeof window === 'undefined' || !window.localStorage) {
    return JSON.parse(JSON.stringify(INITIAL_MOCK_MESSAGES))
  }
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.MESSAGES)
    return raw ? JSON.parse(raw) : JSON.parse(JSON.stringify(INITIAL_MOCK_MESSAGES))
  } catch {
    return JSON.parse(JSON.stringify(INITIAL_MOCK_MESSAGES))
  }
}

function saveMessages(data: Record<string, SupportTicketMessage[]>): void {
  if (typeof window === 'undefined' || !window.localStorage) return
  try {
    localStorage.setItem(STORAGE_KEYS.MESSAGES, JSON.stringify(data))
  } catch (e) {
    console.error('Failed to save messages:', e)
  }
}

const mockProfiles: Record<string, SupportUserProfile> = { ...INITIAL_SUPPORT_PROFILES }

export const supportService = {
  async getDashboardSummary() {
    const tickets = loadTickets()
    return {
      openCount: tickets.filter((t) => t.status === 'open').length,
      waitingCount: tickets.filter((t) => t.status === 'in-progress' || t.status === 'waiting').length,
      escalatedCount: tickets.filter((t) => t.priority === 'urgent' || t.priority === 'high').length,
      resolvedTodayCount: tickets.filter((t) => t.status === 'resolved').length,
      recentTickets: [...tickets],
    }
  },

  async getTickets(
    category = 'all',
    priority = 'all',
    status = 'all',
    search = ''
  ): Promise<SupportTicketItem[]> {
    let list = loadTickets()
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
          t.id.toLowerCase().includes(q) ||
          (t.assignedTo && t.assignedTo.toLowerCase().includes(q))
      )
    }
    return list
  },

  async getTicketDetail(ticketId: string): Promise<{
    ticket: SupportTicketItem | null
    messages: SupportTicketMessage[]
    userProfile: SupportUserProfile | null
  }> {
    const tickets = loadTickets()
    const ticket = tickets.find((t) => t.id === ticketId) || null
    const allMessages = loadMessages()
    const messages = allMessages[ticketId] || []
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

  async sendReply(
    ticketId: string,
    message: string,
    senderName = 'Nhân viên Hỗ trợ',
    senderRole: 'user' | 'support' = 'support'
  ): Promise<SupportTicketMessage> {
    const newMsg: SupportTicketMessage = {
      id: `msg-${Date.now()}`,
      ticketId,
      senderId: 'usr-support-me',
      senderName,
      senderRole,
      message,
      timestamp: new Date().toISOString(),
    }
    const allMessages = loadMessages()
    if (!allMessages[ticketId]) {
      allMessages[ticketId] = []
    }
    allMessages[ticketId].push(newMsg)
    saveMessages(allMessages)

    // Update ticket message count & timestamp
    const tickets = loadTickets()
    const updated = tickets.map((t) =>
      t.id === ticketId
        ? {
            ...t,
            messageCount: t.messageCount + 1,
            updatedAt: newMsg.timestamp,
          }
        : t
    )
    saveTickets(updated)

    return newMsg
  },

  async updateTicketStatus(
    ticketId: string,
    status: TicketStatus,
    actor = 'Demo Admin'
  ): Promise<boolean> {
    const tickets = loadTickets()
    const idx = tickets.findIndex((t) => t.id === ticketId)
    if (idx !== -1) {
      const current = tickets[idx]
      tickets[idx] = {
        ...current,
        status,
        updatedAt: new Date().toISOString(),
      }
      saveTickets(tickets)

      await operationsService.recordAuditLog({
        actor,
        workspace: 'support',
        action: 'Cập nhật trạng thái ticket',
        target: current.title,
        targetId: current.id,
        result: 'success',
        details: `Trạng thái: ${status}`,
      })

      return true
    }
    return false
  },

  async assignTicket(
    ticketId: string,
    staffName: string,
    actor = 'Demo Admin'
  ): Promise<SupportTicketItem> {
    const tickets = loadTickets()
    const idx = tickets.findIndex((t) => t.id === ticketId)
    if (idx === -1) throw new Error('Không tìm thấy ticket')

    const current = tickets[idx]
    const updated: SupportTicketItem = {
      ...current,
      assignedTo: staffName,
      status: current.status === 'open' ? 'in-progress' : current.status,
      updatedAt: new Date().toISOString(),
    }
    tickets[idx] = updated
    saveTickets(tickets)

    await operationsService.recordAuditLog({
      actor,
      workspace: 'support',
      action: 'Phân công ticket hỗ trợ',
      target: current.title,
      targetId: current.id,
      result: 'success',
      details: `Phân công cho nhân viên: ${staffName}`,
    })

    return updated
  },

  async lookupUser(query: string): Promise<SupportUserProfile | null> {
    if (!query.trim()) return null
    const q = query.trim().toLowerCase()
    const tickets = loadTickets()
    const ticket = tickets.find(
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
    if (typeof window !== 'undefined' && window.localStorage) {
      localStorage.removeItem(STORAGE_KEYS.TICKETS)
      localStorage.removeItem(STORAGE_KEYS.MESSAGES)
    }
  },
}

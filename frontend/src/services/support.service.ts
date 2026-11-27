import { apiClient } from '@/lib/apiClient'

export type SupportTicketCategory =
  | 'ACCOUNT'
  | 'TECHNICAL'
  | 'AI_TUTOR'
  | 'LEARNING_CONTENT'
  | 'SUBSCRIPTION'
  | 'OTHER'

export type SupportTicketPriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT'

export type SupportTicketStatus =
  | 'OPEN'
  | 'IN_PROGRESS'
  | 'WAITING_FOR_USER'
  | 'RESOLVED'
  | 'CLOSED'

export interface SupportTicketMessage {
  id: string
  ticketId: string
  senderUserId: string
  senderName: string
  senderRole: string
  body: string
  createdAt: string
}

export interface SupportTicketSummary {
  id: string
  ticketCode: string
  userId: string
  userName: string
  userEmail: string
  subject: string
  category: SupportTicketCategory
  priority: SupportTicketPriority
  status: SupportTicketStatus
  assignedToUserId?: string | null
  assignedToName?: string | null
  messageCount: number
  createdAt: string
  updatedAt: string
  resolvedAt?: string | null
  closedAt?: string | null
}

export interface SupportTicketDetail extends SupportTicketSummary {
  messages: SupportTicketMessage[]
}

export interface SupportTicketsPage {
  items: SupportTicketSummary[]
  page: number
  pageSize: number
  total: number
  totalPages: number
}

export const SUPPORT_CATEGORY_LABELS: Record<SupportTicketCategory, string> = {
  ACCOUNT: 'Tài khoản & Đăng nhập',
  TECHNICAL: 'Lỗi kỹ thuật',
  AI_TUTOR: 'Gia sư AI',
  LEARNING_CONTENT: 'Nội dung học tập',
  SUBSCRIPTION: 'Gói đăng ký',
  OTHER: 'Khác',
}

export const supportService = {
  // User-facing APIs
  async listMyTickets(params?: {
    status?: string
    category?: string
    page?: number
    pageSize?: number
  }): Promise<SupportTicketsPage> {
    const query = new URLSearchParams()
    if (params?.status && params.status !== 'all') query.set('status', params.status)
    if (params?.category && params.category !== 'all') query.set('category', params.category)
    query.set('page', String(params?.page ?? 1))
    query.set('pageSize', String(params?.pageSize ?? 20))
    return apiClient.get<SupportTicketsPage>(`/api/v1/support/tickets?${query.toString()}`)
  },

  async getMyTicket(ticketId: string): Promise<SupportTicketDetail> {
    return apiClient.get<SupportTicketDetail>(`/api/v1/support/tickets/${ticketId}`)
  },

  async createTicket(input: {
    subject: string
    category: SupportTicketCategory
    message: string
  }): Promise<SupportTicketDetail> {
    return apiClient.post<SupportTicketDetail>('/api/v1/support/tickets', input)
  },

  async replyMyTicket(ticketId: string, body: string, clientMessageId?: string): Promise<SupportTicketDetail> {
    return apiClient.post<SupportTicketDetail>(`/api/v1/support/tickets/${ticketId}/messages`, {
      body,
      clientMessageId: clientMessageId ?? (typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : undefined),
    })
  },

  // Admin-facing APIs
  async listAdminTickets(params?: {
    status?: string
    category?: string
    priority?: string
    search?: string
    page?: number
    pageSize?: number
  }): Promise<SupportTicketsPage> {
    const query = new URLSearchParams()
    if (params?.status && params.status !== 'all') query.set('status', params.status)
    if (params?.category && params.category !== 'all') query.set('category', params.category)
    if (params?.priority && params.priority !== 'all') query.set('priority', params.priority)
    if (params?.search?.trim()) query.set('search', params.search.trim())
    query.set('page', String(params?.page ?? 1))
    query.set('pageSize', String(params?.pageSize ?? 20))
    return apiClient.get<SupportTicketsPage>(`/api/v1/admin/support/tickets?${query.toString()}`)
  },

  async getAdminTicket(ticketId: string): Promise<SupportTicketDetail> {
    return apiClient.get<SupportTicketDetail>(`/api/v1/admin/support/tickets/${ticketId}`)
  },

  async updateAdminTicket(
    ticketId: string,
    patch: {
      status?: SupportTicketStatus
      priority?: SupportTicketPriority
      category?: SupportTicketCategory
      assignedToUserId?: string
    }
  ): Promise<SupportTicketDetail> {
    return apiClient.patch<SupportTicketDetail>(`/api/v1/admin/support/tickets/${ticketId}`, patch)
  },

  async replyAdminTicket(
    ticketId: string,
    body: string,
    nextStatus?: SupportTicketStatus
  ): Promise<SupportTicketDetail> {
    return apiClient.post<SupportTicketDetail>(
      `/api/v1/admin/support/tickets/${ticketId}/messages`,
      { body, nextStatus }
    )
  },
}

export type TicketCategory = 'account' | 'sync' | 'billing' | 'content' | 'other'
export type TicketPriority = 'low' | 'medium' | 'high' | 'urgent'
export type TicketStatus = 'open' | 'in-progress' | 'waiting' | 'resolved'

export interface SupportTicketItem {
  id: string
  title: string
  userId: string
  userName: string
  userEmail: string
  category: TicketCategory
  priority: TicketPriority
  status: TicketStatus
  updatedAt: string
  assignedTo?: string
  messageCount: number
}

export interface SupportTicketMessage {
  id: string
  ticketId: string
  senderId: string
  senderName: string
  senderRole: 'user' | 'support'
  message: string
  timestamp: string
}

export interface SupportUserProfile {
  id: string
  email: string
  displayName: string
  role: string
  status: string
  createdAt: string
  lastLoginAt?: string
  syncState: 'synced' | 'pending' | 'offline' | 'error'
  storageNamespace: string
  completedLessonsCount: number
  totalAttemptsCount: number
  recentTicketHistory: Array<{
    id: string
    title: string
    status: TicketStatus
    date: string
  }>
}

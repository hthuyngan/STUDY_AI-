import type { UserRole } from '@/auth/auth.types'

export type AccountStatus = 'active' | 'suspended' | 'disabled' | 'pending'

export interface AdminUserItem {
  id: string
  email: string
  displayName: string
  role: UserRole
  status: AccountStatus
  createdAt: string
  lastLoginAt?: string
  totalCompletedLessons?: number
  averageScore?: number
}

export interface AdminSystemMetrics {
  totalUsers: number
  activeLearners: number
  staffAccounts: number
  openSupportTickets: number
  systemStatus: 'healthy' | 'degraded' | 'maintenance'
  apiLatencyMs: number
  databaseStatus: 'connected' | 'busy' | 'error'
  frontendVersion: string
  backendVersion: string
  environment: string
}

export interface AdminAttentionItem {
  id: string
  type: 'staff_pending' | 'content_review' | 'support_escalated' | 'system_warning'
  title: string
  description: string
  timestamp: string
  severity: 'low' | 'medium' | 'high'
  actionUrl: string
}

export interface AdminActivityItem {
  id: string
  actorName: string
  action: string
  target: string
  timestamp: string
}

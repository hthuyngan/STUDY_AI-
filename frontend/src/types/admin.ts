import type { UserRole } from '@/auth/auth.types'

export type AccountStatus = 'active' | 'suspended' | 'disabled' | 'pending'

export interface UserAssessmentSummary {
  id: string
  title: string
  score: number
  maxScore: number
  submittedAt: string
  status: 'passed' | 'failed' | 'reviewed'
  feedback?: string
}

export interface UserSubjectProgress {
  name: string
  progress: number
  lastStudied: string
}

export interface UserActivityHistoryItem {
  id: string
  action: string
  timestamp: string
  ipAddress?: string
  device?: string
}

export interface AdminUserItem {
  id: string
  email: string
  displayName: string
  role: UserRole
  status: AccountStatus
  createdAt: string
  lastLoginAt?: string
  className?: string
  totalCompletedLessons?: number
  averageScore?: number
  learningProgress?: {
    completedLessons: number
    totalLessons: number
    streakDays: number
    recentSubjects: UserSubjectProgress[]
  }
  assessments?: UserAssessmentSummary[]
  activities?: UserActivityHistoryItem[]
}

export interface AdminSystemMetrics {
  totalUsers: number
  activeLearners: number
  staffAccounts: number
  openSupportTickets: number
  completedLessonsTotal?: number
  systemStatus: 'healthy' | 'degraded' | 'maintenance'
  apiLatencyMs: number
  databaseStatus: 'connected' | 'busy' | 'error'
  frontendVersion: string
  backendVersion: string
  environment: string
  isPrototypeMode?: boolean
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

export interface AnalyticsTrendPoint {
  date: string
  label: string
  completedLessons: number
  activeUsers: number
  assessments: number
}

export interface UserDistributionItem {
  name: string
  key: string
  count: number
  percentage: number
  color: string
}

export type TimeRangeFilter = '7d' | '30d' | 'month' | 'all'

export interface CreateDemoUserInput {
  displayName: string
  email: string
  role: UserRole
  status: AccountStatus
  className?: string
}

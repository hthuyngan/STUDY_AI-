export type ApprovalStatus =
  | 'pending'
  | 'approved'
  | 'changes-requested'
  | 'rejected'
  | 'published'
  | 'archived'

export type ApprovalContentType = 'lesson' | 'assessment' | 'assignment'

export interface ApprovalHistoryItem {
  id: string
  action: string
  actor: string
  timestamp: string
  note?: string
}

export interface ApprovalItem {
  id: string
  title: string
  contentType: ApprovalContentType
  contentId: string
  subjectId: string
  subjectName: string
  chapterId?: string
  chapterName?: string
  authorName: string
  authorRole: string
  version: string
  status: ApprovalStatus
  submittedAt: string
  reviewedAt?: string
  reviewedBy?: string
  reviewNote?: string
  rejectionReason?: string
  contentPreview?: {
    introduction?: string
    definitions?: string
    formulas?: string
    examples?: string
    summary?: string
    questionCount?: number
    maxScore?: number
  }
  history: ApprovalHistoryItem[]
}

export interface PublicationRecord {
  id: string
  title: string
  contentType: ApprovalContentType
  contentId: string
  subjectName: string
  version: string
  publishedBy: string
  publishedAt: string
  status: 'active' | 'archived' | 'superseded'
  changelog?: string
}

export type AnnouncementAudience = 'all' | 'learners' | 'teachers' | 'staff' | 'class'
export type AnnouncementSeverity = 'info' | 'warning' | 'danger' | 'success'
export type AnnouncementStatus = 'draft' | 'scheduled' | 'published' | 'archived'

export interface AnnouncementItem {
  id: string
  title: string
  content: string
  audience: AnnouncementAudience
  targetClassId?: string
  targetClassName?: string
  severity: AnnouncementSeverity
  status: AnnouncementStatus
  scheduledPublishAt?: string
  publishedAt?: string
  expiresAt?: string
  createdBy: string
  createdAt: string
  updatedAt: string
}

export interface AuditLogEntry {
  id: string
  timestamp: string
  actor: string
  workspace: 'admin' | 'content' | 'teacher' | 'support'
  action: string
  target: string
  targetId?: string
  result: 'success' | 'failure' | 'warning'
  details?: string
}

export interface OperationalSettings {
  systemName: string
  systemDescription: string
  language: string
  passingScoreThreshold: number
  lowScoreAlertThreshold: number
  attentionProgressThreshold: number
  requireApprovalBeforePublish: boolean
  allowRevisionRequests: boolean
  showArchivedContent: boolean
  notificationDisplayDays: number
  enableDemoAlerts: boolean
  updatedAt: string
  updatedBy: string
}

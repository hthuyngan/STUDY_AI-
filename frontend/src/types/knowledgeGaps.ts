/**
 * Knowledge Gaps Type Definitions
 * Tracks learner weaknesses identified through harvest assessments and study practice.
 */

export type KnowledgeGapStatus =
  | 'needs-review' // Cần ôn (vừa làm sai hoặc chưa nhớ)
  | 'reinforcing' // Đang củng cố (đang trong chu trình ôn tập)
  | 'progressing' // Có tiến bộ (đã trả lời đúng trong các lần ôn gần đây)
  | 'mastered' // Đã nắm vững (vượt qua nhiều chu kỳ giãn cách)

export type KnowledgeGapSeverity = 'low' | 'medium' | 'high'

export interface KnowledgeGap {
  id: string
  subjectId: string
  subjectName: string
  lessonId: string
  lessonTitle: string
  sectionId?: string
  sectionTitle?: string
  knowledgePointId: string
  title: string // Tên kiến thức cụ thể
  description?: string
  questionPrompt?: string // Câu hỏi mà học sinh đã làm sai
  explanation?: string // Giải thích phương pháp giải
  severity: KnowledgeGapSeverity
  source: 'assessment_attempt' | 'manual_review'
  sourceAttemptId?: string
  wrongAttemptsCount: number // Số lần làm sai
  correctReviewCount: number // Số lần ôn tập thành công
  status: KnowledgeGapStatus
  lastDetectedAt: string // ISO 8601
  lastReviewedAt?: string // ISO 8601
  createdAt: string // ISO 8601
  updatedAt: string // ISO 8601
}

export interface KnowledgeGapsSummary {
  totalGaps: number
  needsReviewCount: number
  reinforcingCount: number
  progressingCount: number
  masteredCount: number
  highPriorityCount: number
}

export interface RecordAttemptInput {
  attemptId: string
  lessonId: string
  subjectId: string
  lessonTitle?: string
  subjectName?: string
  wrongQuestions: Array<{
    questionId: string
    prompt: string
    topic?: string
    explanation?: string
    sectionId?: string
    sectionTitle?: string
  }>
}


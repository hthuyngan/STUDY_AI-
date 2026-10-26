/**
 * Types for Lesson Embedded Assessment and SCORM-inspired Attempt Tracking
 */

export type AssessmentQuestionType = 'single-choice' | 'true-false'

export interface AssessmentOption {
  id: string
  label: string // e.g. "A", "B", "C", "D"
  text: string
  explanation?: string
}

export interface AssessmentQuestion {
  id: string
  type: AssessmentQuestionType
  prompt: string
  options: AssessmentOption[]
  correctOptionId: string
  explanation: string
  topic?: string
}

export interface LessonAssessment {
  id: string
  lessonId: string
  subjectId: string
  title: string
  description: string
  estimatedMinutes: number
  passingScorePercent: number // e.g. 60
  questions: AssessmentQuestion[]
}

export interface AssessmentResponse {
  questionId: string
  selectedOptionIds: string[]
  firstAnsweredAt: string // ISO 8601
  lastAnsweredAt: string // ISO 8601
  changeCount: number
  timeSpentMs: number
  isCorrect?: boolean
}

export type LearningEventType =
  | 'lesson_opened'
  | 'lesson_section_viewed'
  | 'lesson_section_completed'
  | 'assessment_opened'
  | 'assessment_started'
  | 'question_viewed'
  | 'answer_selected'
  | 'answer_changed'
  | 'question_completed'
  | 'assessment_paused'
  | 'attempt_resumed'
  | 'attempt_abandoned'
  | 'assessment_submitted'
  | 'assessment_completed'
  | 'window_blurred'
  | 'window_focused'

export interface LearningEvent {
  id: string
  attemptId?: string
  lessonId: string
  subjectId: string
  timestamp: string // ISO 8601
  type: LearningEventType
  payload?: Record<string, unknown>
  schemaVersion: number // 1
}

export interface LearningAttempt {
  id: string
  learnerId: string
  subjectId: string
  chapterId: string
  lessonId: string
  assessmentId: string
  attemptNumber: number
  startedAt: string // ISO 8601
  lastActivityAt: string // ISO 8601
  completedAt?: string // ISO 8601
  status: 'in-progress' | 'completed' | 'abandoned'
  progressMeasure: number // 0 -> 1 (SCORM-inspired)
  completionStatus: 'not-attempted' | 'incomplete' | 'completed'
  successStatus: 'unknown' | 'passed' | 'failed'
  scoreRaw: number // e.g. 4
  scoreMin: number // 0
  scoreMax: number // e.g. 5
  scoreScaled: number // 0 -> 1 (SCORM-inspired)
  sessionTimeMs: number
  currentQuestionId: string
  responses: Record<string, AssessmentResponse>
  events: LearningEvent[]
  suspendData?: string
  exitReason?: string
}

export interface LessonProgressState {
  lessonId: string
  subjectId: string
  completedSectionIds: string[]
  contentProgress: number // 0 -> 80
  assessmentStatus: 'not-attempted' | 'incomplete' | 'completed'
  assessmentAttemptId?: string
  assessmentScore?: number
  overallProgress: number // 0 -> 100
  updatedAt: string // ISO 8601
}

/**
 * Adapter utility that maps an internal attempt to SCORM-inspired data concepts.
 *
 * NOTE: SCORM-inspired tracking schema; not a full SCORM Runtime Environment implementation.
 * Does not initialize global window.API and does not claim certified SCORM conformance.
 */
export function toScormTrackingSnapshot(attempt: LearningAttempt) {
  const seconds = Math.round(attempt.sessionTimeMs / 1000)
  const hours = Math.floor(seconds / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)
  const secs = seconds % 60
  const sessionTimeIso = `PT${hours ? `${hours}H` : ''}${minutes ? `${minutes}M` : ''}${secs}S`

  return {
    completion_status: attempt.completionStatus,
    progress_measure: attempt.progressMeasure,
    success_status: attempt.successStatus,
    'score.raw': attempt.scoreRaw,
    'score.scaled': attempt.scoreScaled,
    'score.min': attempt.scoreMin,
    'score.max': attempt.scoreMax,
    session_time: sessionTimeIso || 'PT0S',
    suspend_data: attempt.suspendData || '',
  }
}

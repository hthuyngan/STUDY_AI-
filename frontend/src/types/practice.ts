/**
 * Practice & Assessment Engine Domain Types — STUDY_AI Phase 12
 * Standardized for Vietnam General Education Curriculum (GDPT 2018).
 * Real attempts, reliable scoring, auto-save persistence, and skill-level breakdown.
 */

import type { CognitiveLevel, QuestionDifficulty, QuestionType } from './questionBank'

export type PracticeSessionStatus = 'in_progress' | 'submitted' | 'abandoned'

export type PracticeSessionMode = 'lesson' | 'skill' | 'mixed' | 'custom'

/* -------------------------------------------------------------------------
 * Student Answers (Discriminated Union)
 * ------------------------------------------------------------------------- */

// 1. Trắc nghiệm 4 lựa chọn (chọn A/B/C/D hoặc chưa chọn)
export interface MultipleChoiceAnswer {
  questionType: 'multiple_choice'
  selectedOption: 'A' | 'B' | 'C' | 'D' | null
}

// 2. Trắc nghiệm Đúng / Sai theo cụm (4 ý a, b, c, d)
// Quan trọng: phân biệt rõ true (Đúng), false (Sai), null (Chưa trả lời)
export interface TrueFalseGroupAnswer {
  questionType: 'true_false_group'
  subItemAnswers: Record<'a' | 'b' | 'c' | 'd', boolean | null>
}

// 3. Trả lời ngắn số học (lưu nguyên văn chuỗi học sinh nhập)
export interface ShortAnswerAnswer {
  questionType: 'short_answer'
  rawInput: string
}

export type StudentAnswer = MultipleChoiceAnswer | TrueFalseGroupAnswer | ShortAnswerAnswer

/* -------------------------------------------------------------------------
 * Practice Session Entity
 * ------------------------------------------------------------------------- */
export interface PracticeSession {
  id: string // e.g. "sess-math-12-01-uuid"
  mode: PracticeSessionMode
  subjectId: string // "math"
  chapterId: string // "chap-math-12-01"
  lessonId?: string // "lesson-math-12-01"
  selectedSkillIds: string[]
  questionIds: string[] // Fixed list of question IDs for this session
  status: PracticeSessionStatus
  startedAt: string // ISO 8601
  updatedAt: string // ISO 8601
  submittedAt?: string // ISO 8601
  answers: Record<string, StudentAnswer> // Keyed by questionId
  resultId?: string // Linked result ID once submitted
  schemaVersion: number // e.g. 1
}

/* -------------------------------------------------------------------------
 * Scored Question Result
 * ------------------------------------------------------------------------- */
export interface ScoredQuestionResult {
  questionId: string
  questionType: QuestionType
  difficulty: QuestionDifficulty
  cognitiveLevel: CognitiveLevel
  skillIds: string[]
  stem: string
  explanation: string
  studentAnswer: StudentAnswer | null
  correctAnswerDisplay: string
  isFullyCorrect: boolean
  isPartiallyCorrect: boolean // Áp dụng cho TF Group có 1-3 ý đúng
  isUnanswered: boolean
  earnedPoints: number // e.g. 1, 0.5, 0.25, 0.1, 0
  maxPoints: number // 1 point per question unit
  // Chi tiết từng ý cho TF Group
  subItemDetails?: Array<{
    id: 'a' | 'b' | 'c' | 'd'
    statement: string
    studentChoice: boolean | null
    correctChoice: boolean
    isCorrect: boolean
    explanation?: string
  }>
}

/* -------------------------------------------------------------------------
 * Skill-Level Breakdown Entity
 * ------------------------------------------------------------------------- */
export interface SkillScoreBreakdown {
  skillId: string
  skillName: string
  totalQuestions: number
  fullyCorrectQuestions: number
  earnedPoints: number
  maxPoints: number
  percentage: number
}

/* -------------------------------------------------------------------------
 * Practice Result Entity
 * ------------------------------------------------------------------------- */
export interface PracticeResult {
  id: string // e.g. "res-sess-uuid"
  sessionId: string
  subjectId: string
  chapterId: string
  lessonId?: string
  questionResults: ScoredQuestionResult[]
  totalQuestions: number
  correctCount: number
  partialCount: number
  incorrectCount: number
  unansweredCount: number
  earnedPoints: number
  maxPoints: number
  percentage: number // earnedPoints / maxPoints * 100 (rounded to 1 decimal)
  startedAt?: string
  submittedAt: string
  durationSeconds: number
  skillBreakdown: SkillScoreBreakdown[]
  scoringVersion: string // e.g. "GDPT_2018_V1"
}

/* -------------------------------------------------------------------------
 * Setup Configuration
 * ------------------------------------------------------------------------- */
export interface PracticeSetupConfig {
  subjectId: string
  chapterId?: string
  lessonId?: string
  skillIds?: string[]
  questionType?: QuestionType
  difficulty?: QuestionDifficulty
  limit: number // e.g. 5, 10
}

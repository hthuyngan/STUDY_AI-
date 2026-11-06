/**
 * Question Bank Foundation & Verified Assessment Item Schema — STUDY_AI Phase 11
 * Standardized for Vietnam General Education Curriculum (GDPT 2018).
 * Supports three primary question formats:
 *  1. Multiple Choice (4 options: A, B, C, D with 1 correct option)
 *  2. True / False Group (Cluster of 4 sub-items: a, b, c, d evaluated independently)
 *  3. Short Answer (Constructed response: integer, decimal, fraction, or mathematical value)
 */

export type QuestionType = 'multiple_choice' | 'true_false_group' | 'short_answer'

export type CognitiveLevel = 'recognition' | 'comprehension' | 'application' | 'high_application'
// recognition: Nhận biết
// comprehension: Thông hiểu
// application: Vận dụng
// high_application: Vận dụng cao

export type QuestionDifficulty = 'easy' | 'medium' | 'hard' | 'very_hard'

export type QuestionReviewStatus = 'draft' | 'needs_review' | 'approved' | 'rejected'

export interface QuestionBase {
  id: string
  subjectId: string // e.g. "math"
  chapterId: string // e.g. "chap-math-12-01"
  lessonId: string // e.g. "lesson-math-12-01"
  skillIds: string[] // e.g. ["SKILL-MATH-12-DERIV-SIGN"]
  type: QuestionType
  stem: string // Nội dung câu hỏi (hỗ trợ KaTeX)
  difficulty: QuestionDifficulty
  cognitiveLevel: CognitiveLevel
  explanation: string // Lời giải chi tiết từng bước (hỗ trợ KaTeX)
  source?: string // Nguồn đề bài / tác giả
  reviewStatus: QuestionReviewStatus
  reviewerNote?: string
  createdAt: string
  updatedAt: string
}

/* -------------------------------------------------------------------------
 * 1. Multiple Choice (Trắc nghiệm 4 lựa chọn)
 * ------------------------------------------------------------------------- */
export interface MultipleChoiceOption {
  id: 'A' | 'B' | 'C' | 'D'
  text: string // Hỗ trợ KaTeX
}

export interface MultipleChoiceQuestion extends QuestionBase {
  type: 'multiple_choice'
  options: [MultipleChoiceOption, MultipleChoiceOption, MultipleChoiceOption, MultipleChoiceOption]
  correctAnswer: 'A' | 'B' | 'C' | 'D'
}

/* -------------------------------------------------------------------------
 * 2. True / False Group (Trắc nghiệm Đúng / Sai theo cụm 4 ý a, b, c, d)
 * ------------------------------------------------------------------------- */
export interface TrueFalseSubItem {
  id: 'a' | 'b' | 'c' | 'd'
  statement: string // Mệnh đề toán học (hỗ trợ KaTeX)
  isCorrect: boolean // true = Đúng, false = Sai
  explanation?: string // Lời giải riêng cho từng mệnh đề
}

export interface TrueFalseGroupQuestion extends QuestionBase {
  type: 'true_false_group'
  subItems: [TrueFalseSubItem, TrueFalseSubItem, TrueFalseSubItem, TrueFalseSubItem]
}

/* -------------------------------------------------------------------------
 * 3. Short Answer (Trả lời ngắn)
 * ------------------------------------------------------------------------- */
export type ShortAnswerAcceptableValue = string | number

export interface ShortAnswerQuestion extends QuestionBase {
  type: 'short_answer'
  // Giá trị chuẩn hoá được chấp nhận (ví dụ: ["3", "3.0"] hoặc ["-1/2", "-0.5"])
  acceptedAnswers: string[]
  displayAnswer: string // Chuỗi hiển thị đáp án mẫu chính thức (hỗ trợ KaTeX)
  unit?: string // Đơn vị đo nếu có (ví dụ: "cm", "m/s")
  tolerance?: number // Dung sai số thực nếu áp dụng
}

/* -------------------------------------------------------------------------
 * Discriminated Union
 * ------------------------------------------------------------------------- */
export type QuestionItem = MultipleChoiceQuestion | TrueFalseGroupQuestion | ShortAnswerQuestion

export interface QuestionFilterCriteria {
  subjectId?: string
  chapterId?: string
  lessonId?: string
  skillId?: string
  type?: QuestionType
  difficulty?: QuestionDifficulty
  cognitiveLevel?: CognitiveLevel
  reviewStatus?: QuestionReviewStatus | 'all'
  search?: string
}

export interface QuestionBankStats {
  total: number
  approvedCount: number
  needsReviewCount: number
  draftCount: number
  rejectedCount: number
  byType: Record<QuestionType, number>
  byCognitiveLevel: Record<CognitiveLevel, number>
}

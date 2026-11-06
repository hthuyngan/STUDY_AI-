import {
  questionBankRepository,
  type IQuestionBankRepository,
} from '@/repositories/questionBank.repository'
import { isMathAnswerCorrect, normalizeMathString } from './mathAnswerNormalizer'
import type {
  MultipleChoiceQuestion,
  QuestionBankStats,
  QuestionFilterCriteria,
  QuestionItem,
  ShortAnswerQuestion,
  TrueFalseGroupQuestion,
} from '@/types/questionBank'

export class QuestionBankService {
  private repo: IQuestionBankRepository

  constructor(repo: IQuestionBankRepository = questionBankRepository) {
    this.repo = repo
  }

  async getAllQuestions(): Promise<QuestionItem[]> {
    return this.repo.getAll()
  }

  /**
   * Retrieves single question with strict existence validation.
   * Throws or returns null if not found. Never swaps with another question.
   */
  async getQuestionById(id: string): Promise<QuestionItem | null> {
    return this.repo.getById(id)
  }

  async filterQuestions(criteria: QuestionFilterCriteria): Promise<QuestionItem[]> {
    return this.repo.filter(criteria)
  }

  async getApprovedQuestions(
    criteria?: Omit<QuestionFilterCriteria, 'reviewStatus'>
  ): Promise<QuestionItem[]> {
    return this.repo.getApprovedOnly(criteria)
  }

  async getStats(): Promise<QuestionBankStats> {
    return this.repo.getStats()
  }

  /**
   * Pure evaluation helper for multiple-choice questions
   */
  verifyMultipleChoiceAnswer(question: MultipleChoiceQuestion, selectedOption: string): boolean {
    return question.correctAnswer === selectedOption
  }

  /**
   * Pure evaluation helper for True/False group questions
   * Returns an array of booleans indicating correctness of each sub-item
   */
  verifyTrueFalseGroupAnswer(
    question: TrueFalseGroupQuestion,
    answers: Record<string, boolean>
  ): {
    results: Record<string, boolean>
    totalCorrect: number
    isAllCorrect: boolean
  } {
    const results: Record<string, boolean> = {}
    let totalCorrect = 0

    for (const sub of question.subItems) {
      const userAns = answers[sub.id]
      const isCorrect = userAns === sub.isCorrect
      results[sub.id] = isCorrect
      if (isCorrect) totalCorrect++
    }

    return {
      results,
      totalCorrect,
      isAllCorrect: totalCorrect === question.subItems.length,
    }
  }

  /**
   * Pure mathematical evaluation helper for short-answer questions
   */
  verifyShortAnswer(
    question: ShortAnswerQuestion,
    userInput: string
  ): {
    isCorrect: boolean
    normalizedInput: string
    displayExpected: string
  } {
    const isCorrect = isMathAnswerCorrect(
      userInput,
      question.acceptedAnswers,
      question.tolerance ?? 1e-6
    )

    return {
      isCorrect,
      normalizedInput: normalizeMathString(userInput),
      displayExpected: question.displayAnswer,
    }
  }

  /**
   * Schema structural validator: Ensures question integrity
   */
  validateQuestionSchema(q: QuestionItem): { valid: boolean; errors: string[] } {
    const errors: string[] = []

    if (!q.id || typeof q.id !== 'string') errors.push('ID câu hỏi không hợp lệ.')
    if (!q.stem || !q.stem.trim()) errors.push('Nội dung đề bài không được để trống.')
    if (!q.skillIds || q.skillIds.length === 0) errors.push('Câu hỏi phải gắn với ít nhất một kỹ năng (skillId).')
    if (!q.explanation || !q.explanation.trim()) errors.push('Lời giải chi tiết không được để trống.')

    if (q.type === 'multiple_choice') {
      if (!Array.isArray(q.options) || q.options.length !== 4) {
        errors.push('Câu trắc nghiệm MCQ bắt buộc phải có đúng 4 phương án A, B, C, D.')
      } else {
        const optionIds = q.options.map((o) => o.id)
        if (!['A', 'B', 'C', 'D'].every((id) => optionIds.includes(id as any))) {
          errors.push('Phương án MCQ phải đủ các nhãn A, B, C, D.')
        }
      }
      if (!['A', 'B', 'C', 'D'].includes(q.correctAnswer)) {
        errors.push('Đáp án đúng của MCQ phải là A, B, C hoặc D.')
      }
    } else if (q.type === 'true_false_group') {
      if (!Array.isArray(q.subItems) || q.subItems.length !== 4) {
        errors.push('Nhóm True/False bắt buộc phải gồm đúng 4 nhận định a, b, c, d.')
      } else {
        const subIds = q.subItems.map((s) => s.id)
        if (!['a', 'b', 'c', 'd'].every((id) => subIds.includes(id as any))) {
          errors.push('Nhóm True/False phải đủ các nhãn a, b, c, d.')
        }
      }
    } else if (q.type === 'short_answer') {
      if (!Array.isArray(q.acceptedAnswers) || q.acceptedAnswers.length === 0) {
        errors.push('Câu trả lời ngắn phải có ít nhất một giá trị được chấp nhận (acceptedAnswers).')
      }
      if (!q.displayAnswer || !q.displayAnswer.trim()) {
        errors.push('Câu trả lời ngắn phải có chuỗi hiển thị đáp án mẫu (displayAnswer).')
      }
    } else {
      errors.push(`Loại câu hỏi không được hỗ trợ: ${(q as any).type}`)
    }

    return {
      valid: errors.length === 0,
      errors,
    }
  }
}

export const questionBankService = new QuestionBankService()

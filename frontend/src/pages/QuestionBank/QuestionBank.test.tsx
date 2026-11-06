import { describe, it, expect, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { questionBankRepository } from '@/repositories/questionBank.repository'
import { questionBankService } from '@/services/questionBank.service'
import { isMathAnswerCorrect, normalizeMathString, parseMathValue } from '@/services/mathAnswerNormalizer'
import { mockQuestions } from '@/data/questionBank.data'
import { QuestionItemView } from '@/components/question-bank/QuestionItemView'
import { MultipleChoiceItem } from '@/components/question-bank/MultipleChoiceItem'
import { TrueFalseGroupItem } from '@/components/question-bank/TrueFalseGroupItem'
import { ShortAnswerItem } from '@/components/question-bank/ShortAnswerItem'
import type {
  MultipleChoiceQuestion,
  TrueFalseGroupQuestion,
  ShortAnswerQuestion,
} from '@/types/questionBank'

describe('Phase 11 — Question Bank Foundation & Math Assessment Items', () => {
  beforeEach(async () => {
    await questionBankRepository.resetToDefaults()
  })

  describe('1. Math Answer Normalizer & Equality Evaluator', () => {
    it('normalizes spaces, decimal commas, unicode minuses and fractions', () => {
      expect(normalizeMathString('  3,5  ')).toBe('3.5')
      expect(normalizeMathString('−5')).toBe('-5') // unicode minus
      expect(normalizeMathString('–1 / 2')).toBe('-1/2') // en-dash and fraction spacing
      expect(normalizeMathString('4.00')).toBe('4')
      expect(normalizeMathString('2.50')).toBe('2.5')
    })

    it('parses valid numeric integers, decimals and fractions without eval', () => {
      expect(parseMathValue('7')).toBe(7)
      expect(parseMathValue('-3.25')).toBe(-3.25)
      expect(parseMathValue('1/2')).toBe(0.5)
      expect(parseMathValue('-3/4')).toBe(-0.75)
      expect(parseMathValue('10/0')).toBeNull() // Division by zero returns null
      expect(parseMathValue('abc')).toBeNull()
      expect(parseMathValue('alert(1)')).toBeNull() // arbitrary expressions are safe
    })

    it('verifies mathematical equality within tolerance', () => {
      expect(isMathAnswerCorrect('0.5', ['1/2'])).toBe(true)
      expect(isMathAnswerCorrect('1/2', ['0.5'])).toBe(true)
      expect(isMathAnswerCorrect('-3,0', ['-3'])).toBe(true)
      expect(isMathAnswerCorrect(' 4 ', ['4', '4.0'])).toBe(true)
      expect(isMathAnswerCorrect('0.3333333', ['1/3'], 1e-5)).toBe(true)
      expect(isMathAnswerCorrect('5', ['4'])).toBe(false)
    })
  })

  describe('2. Question Bank Dataset & Schema Integrity', () => {
    it('contains exactly 22 initial verified questions for Chapter 1', async () => {
      const all = await questionBankRepository.getAll()
      expect(all.length).toBe(22)
    })

    it('has unique IDs across all items', async () => {
      const all = await questionBankRepository.getAll()
      const ids = all.map((q) => q.id)
      const uniqueIds = new Set(ids)
      expect(uniqueIds.size).toBe(all.length)
    })

    it('distributes 12 Multiple Choice, 4 True/False Group, and 6 Short Answer', async () => {
      const stats = await questionBankRepository.getStats()
      expect(stats.byType.multiple_choice).toBe(12)
      expect(stats.byType.true_false_group).toBe(4)
      expect(stats.byType.short_answer).toBe(6)
      expect(stats.approvedCount).toBe(20)
      expect(stats.needsReviewCount).toBe(2)
      expect(stats.total).toBe(22)
    })

    it('links only to standardized Phase 9-10 skill codes', async () => {
      const all = await questionBankRepository.getAll()
      const allowedPrefixes = ['SKILL-MATH-12-']

      for (const q of all) {
        expect(q.skillIds.length).toBeGreaterThan(0)
        for (const sk of q.skillIds) {
          expect(allowedPrefixes.some((p) => sk.startsWith(p))).toBe(true)
        }
      }
    })

    it('validates each question against the strict schema validator', async () => {
      const all = await questionBankRepository.getAll()
      for (const q of all) {
        const { valid, errors } = questionBankService.validateQuestionSchema(q)
        expect(valid).toBe(true)
        expect(errors).toEqual([])
      }
    })
  })

  describe('3. Question Bank Repository Invariants', () => {
    it('returns null when ID does not exist, NEVER falls back to another item', async () => {
      const nonExistent = await questionBankRepository.getById('qb-non-existent-id')
      expect(nonExistent).toBeNull()
    })

    it('filters strictly by review status (approved vs needs_review)', async () => {
      const approvedOnly = await questionBankRepository.getApprovedOnly()
      expect(approvedOnly.length).toBe(20)
      expect(approvedOnly.every((q) => q.reviewStatus === 'approved')).toBe(true)

      const reviewOnly = await questionBankRepository.filter({ reviewStatus: 'needs_review' })
      expect(reviewOnly.length).toBe(2)
      expect(reviewOnly.every((q) => q.reviewStatus === 'needs_review')).toBe(true)
    })

    it('filters by question type and difficulty', async () => {
      const mcqEasy = await questionBankRepository.filter({
        type: 'multiple_choice',
        difficulty: 'easy',
      })
      expect(mcqEasy.length).toBeGreaterThan(0)
      expect(mcqEasy.every((q) => q.type === 'multiple_choice' && q.difficulty === 'easy')).toBe(true)
    })

    it('searches by keyword in stem or skill code', async () => {
      const searchRes = await questionBankRepository.filter({ search: 'tiệm cận' })
      expect(searchRes.length).toBeGreaterThan(0)
    })
  })

  describe('4. Three Question Formats & UI Components', () => {
    it('renders Multiple Choice Item with 4 options and highlights correct answer on reveal', () => {
      const mcq = mockQuestions.find((q) => q.type === 'multiple_choice') as MultipleChoiceQuestion
      const { rerender } = render(<MultipleChoiceItem question={mcq} showAnswer={false} />)

      expect(screen.getByText('A')).toBeInTheDocument()
      expect(screen.getByText('B')).toBeInTheDocument()
      expect(screen.getByText('C')).toBeInTheDocument()
      expect(screen.getByText('D')).toBeInTheDocument()
      expect(screen.queryByText('Đáp án đúng')).not.toBeInTheDocument()

      rerender(<MultipleChoiceItem question={mcq} showAnswer={true} />)
      expect(screen.getByText('Đáp án đúng')).toBeInTheDocument()
    })

    it('renders True / False Group with exactly 4 statements a, b, c, d', () => {
      const tfg = mockQuestions.find((q) => q.type === 'true_false_group') as TrueFalseGroupQuestion
      render(<TrueFalseGroupItem question={tfg} showAnswer={false} />)

      expect(screen.getByText('a)')).toBeInTheDocument()
      expect(screen.getByText('b)')).toBeInTheDocument()
      expect(screen.getByText('c)')).toBeInTheDocument()
      expect(screen.getByText('d)')).toBeInTheDocument()

      const trueButtons = screen.getAllByRole('button', { name: 'Đúng' })
      const falseButtons = screen.getAllByRole('button', { name: 'Sai' })
      expect(trueButtons.length).toBe(4)
      expect(falseButtons.length).toBe(4)
    })

    it('renders Short Answer Item and allows typing math input', () => {
      const sa = mockQuestions.find((q) => q.type === 'short_answer') as ShortAnswerQuestion
      render(<ShortAnswerItem question={sa} showAnswer={false} />)

      const input = screen.getByRole('textbox')
      expect(input).toBeInTheDocument()

      fireEvent.change(input, { target: { value: '3' } })
      expect((input as HTMLInputElement).value).toBe('3')
    })

    it('renders QuestionItemView and toggles step-by-step explanation', () => {
      const q = mockQuestions[0]
      render(<QuestionItemView question={q} index={0} />)

      expect(screen.getByText('Câu 1')).toBeInTheDocument()
      expect(screen.getByText('Trắc nghiệm 4 lựa chọn')).toBeInTheDocument()
      expect(screen.queryByText('Hướng dẫn giải chi tiết (Từng bước)')).not.toBeInTheDocument()

      const toggleBtn = screen.getByRole('button', { name: /Xem lời giải/i })
      fireEvent.click(toggleBtn)

      expect(screen.getByText('Hướng dẫn giải chi tiết (Từng bước)')).toBeInTheDocument()
    })
  })
})

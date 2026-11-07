import { describe, it, expect, beforeEach } from 'vitest'
import {
  roundPoints,
  scoreMultipleChoice,
  scoreShortAnswer,
  scoreTrueFalseGroup,
} from '@/services/scoringEngine'
import { practiceRepository } from '@/repositories/practice.repository'
import { practiceService } from '@/services/practice.service'
import { questionBankRepository } from '@/repositories/questionBank.repository'
import type {
  MultipleChoiceQuestion,
  ShortAnswerQuestion,
  TrueFalseGroupQuestion,
} from '@/types/questionBank'
import type {
  MultipleChoiceAnswer,
  PracticeSession,
  TrueFalseGroupAnswer,
} from '@/types/practice'

describe('Phase 12 — Practice & Assessment Engine Suite', () => {
  beforeEach(async () => {
    await practiceRepository.clearAll()
    await questionBankRepository.resetToDefaults()
  })

  /* =========================================================================
   * 1. SCORING ENGINE DETERMINISTIC TESTS
   * ========================================================================= */
  describe('1. Scoring Engine: Deterministic Pure Scoring', () => {
    const sampleMcq: MultipleChoiceQuestion = {
      id: 'test-mcq-1',
      subjectId: 'math',
      chapterId: 'chap-1',
      lessonId: 'lesson-1',
      skillIds: ['SKILL-MATH-12-MONOTONICITY'],
      type: 'multiple_choice',
      stem: 'Câu hỏi trắc nghiệm',
      difficulty: 'easy',
      cognitiveLevel: 'recognition',
      options: [
        { id: 'A', text: 'Phương án A' },
        { id: 'B', text: 'Phương án B' },
        { id: 'C', text: 'Phương án C' },
        { id: 'D', text: 'Phương án D' },
      ],
      correctAnswer: 'A',
      explanation: 'Lời giải A',
      reviewStatus: 'approved',
      createdAt: '2026-11-07T00:00:00Z',
      updatedAt: '2026-11-07T00:00:00Z',
    }

    it('scores Multiple Choice: 1.0 if correct, 0.0 if incorrect or null', () => {
      // Correct
      const resCorrect = scoreMultipleChoice(sampleMcq, {
        questionType: 'multiple_choice',
        selectedOption: 'A',
      })
      expect(resCorrect.earnedPoints).toBe(1)
      expect(resCorrect.isFullyCorrect).toBe(true)

      // Incorrect
      const resWrong = scoreMultipleChoice(sampleMcq, {
        questionType: 'multiple_choice',
        selectedOption: 'B',
      })
      expect(resWrong.earnedPoints).toBe(0)
      expect(resWrong.isFullyCorrect).toBe(false)

      // Unanswered
      const resBlank = scoreMultipleChoice(sampleMcq, null)
      expect(resBlank.earnedPoints).toBe(0)
      expect(resBlank.isUnanswered).toBe(true)
    })

    const sampleTfg: TrueFalseGroupQuestion = {
      id: 'test-tfg-1',
      subjectId: 'math',
      chapterId: 'chap-1',
      lessonId: 'lesson-1',
      skillIds: ['SKILL-MATH-12-DERIV-SIGN', 'SKILL-MATH-12-MONOTONICITY'],
      type: 'true_false_group',
      stem: 'Xét tính đúng sai',
      difficulty: 'medium',
      cognitiveLevel: 'comprehension',
      explanation: 'Lời giải TF',
      reviewStatus: 'approved',
      createdAt: '2026-11-07T00:00:00Z',
      updatedAt: '2026-11-07T00:00:00Z',
      subItems: [
        { id: 'a', statement: 'Mệnh đề a', isCorrect: true },
        { id: 'b', statement: 'Mệnh đề b', isCorrect: false },
        { id: 'c', statement: 'Mệnh đề c', isCorrect: true },
        { id: 'd', statement: 'Mệnh đề d', isCorrect: false },
      ],
    }

    it('scores True / False Group across all 5 score tiers (0, 0.1, 0.25, 0.5, 1.0)', () => {
      // 0 correct -> 0đ
      const ans0: TrueFalseGroupAnswer = {
        questionType: 'true_false_group',
        subItemAnswers: { a: false, b: true, c: false, d: true },
      }
      expect(scoreTrueFalseGroup(sampleTfg, ans0).earnedPoints).toBe(0.0)

      // 1 correct -> 0.1đ
      const ans1: TrueFalseGroupAnswer = {
        questionType: 'true_false_group',
        subItemAnswers: { a: true, b: true, c: false, d: true },
      }
      expect(scoreTrueFalseGroup(sampleTfg, ans1).earnedPoints).toBe(0.1)

      // 2 correct -> 0.25đ
      const ans2: TrueFalseGroupAnswer = {
        questionType: 'true_false_group',
        subItemAnswers: { a: true, b: false, c: false, d: true },
      }
      expect(scoreTrueFalseGroup(sampleTfg, ans2).earnedPoints).toBe(0.25)

      // 3 correct -> 0.5đ
      const ans3: TrueFalseGroupAnswer = {
        questionType: 'true_false_group',
        subItemAnswers: { a: true, b: false, c: true, d: true },
      }
      expect(scoreTrueFalseGroup(sampleTfg, ans3).earnedPoints).toBe(0.5)

      // 4 correct -> 1.0đ
      const ans4: TrueFalseGroupAnswer = {
        questionType: 'true_false_group',
        subItemAnswers: { a: true, b: false, c: true, d: false },
      }
      const res4 = scoreTrueFalseGroup(sampleTfg, ans4)
      expect(res4.earnedPoints).toBe(1.0)
      expect(res4.isFullyCorrect).toBe(true)
    })

    it('strictly differentiates false from null (unanswered) in True / False Group', () => {
      // If student left everything null (unanswered)
      const blankAns: TrueFalseGroupAnswer = {
        questionType: 'true_false_group',
        subItemAnswers: { a: null, b: null, c: null, d: null },
      }
      const resBlank = scoreTrueFalseGroup(sampleTfg, blankAns)
      expect(resBlank.earnedPoints).toBe(0)
      expect(resBlank.isUnanswered).toBe(true)

      // Even if correct is false for item 'b', leaving it null must NOT count as choosing false
      expect(resBlank.subItemDetails?.find((s) => s.id === 'b')?.isCorrect).toBe(false)
    })

    const sampleSa: ShortAnswerQuestion = {
      id: 'test-sa-1',
      subjectId: 'math',
      chapterId: 'chap-1',
      lessonId: 'lesson-1',
      skillIds: ['SKILL-MATH-12-MINMAX-SEGMENT'],
      type: 'short_answer',
      stem: 'Tìm giá trị',
      difficulty: 'medium',
      cognitiveLevel: 'comprehension',
      acceptedAnswers: ['3', '3.0', '6/2'],
      displayAnswer: '3',
      explanation: 'Lời giải 3',
      reviewStatus: 'approved',
      createdAt: '2026-11-07T00:00:00Z',
      updatedAt: '2026-11-07T00:00:00Z',
    }

    it('scores Short Answer with math normalizer (integers, fractions, decimals)', () => {
      expect(scoreShortAnswer(sampleSa, { questionType: 'short_answer', rawInput: '3' }).earnedPoints).toBe(1)
      expect(scoreShortAnswer(sampleSa, { questionType: 'short_answer', rawInput: ' 3,0 ' }).earnedPoints).toBe(1)
      expect(scoreShortAnswer(sampleSa, { questionType: 'short_answer', rawInput: '6/2' }).earnedPoints).toBe(1)
      expect(scoreShortAnswer(sampleSa, { questionType: 'short_answer', rawInput: '4' }).earnedPoints).toBe(0)
      expect(scoreShortAnswer(sampleSa, null).earnedPoints).toBe(0)
    })

    it('avoids floating point arithmetic inaccuracy (e.g. 0.1 + 0.25 = 0.35)', () => {
      expect(roundPoints(0.1 + 0.25)).toBe(0.35)
      expect(roundPoints(0.1 + 0.2)).toBe(0.3)
    })
  })

  /* =========================================================================
   * 2. REPOSITORY & PERSISTENCE INVARIANTS
   * ========================================================================= */
  describe('2. Practice Repository & Session Persistence', () => {
    it('creates and retrieves a practice session without losing answers', async () => {
      const now = new Date().toISOString()
      const session: PracticeSession = {
        id: 'sess-test-1',
        mode: 'lesson',
        subjectId: 'math',
        chapterId: 'chap-math-12-01',
        lessonId: 'lesson-math-12-01',
        selectedSkillIds: [],
        questionIds: ['qb-math-12-mcq-01', 'qb-math-12-mcq-02'],
        status: 'in_progress',
        startedAt: now,
        updatedAt: now,
        answers: {
          'qb-math-12-mcq-01': { questionType: 'multiple_choice', selectedOption: 'A' },
        },
        schemaVersion: 1,
      }

      await practiceRepository.saveSession(session)
      const retrieved = await practiceRepository.getSessionById('sess-test-1')
      expect(retrieved).not.toBeNull()
      expect(retrieved?.id).toBe('sess-test-1')
      const ansObj = retrieved?.answers ? retrieved.answers['qb-math-12-mcq-01'] : null
      expect((ansObj as MultipleChoiceAnswer)?.selectedOption).toBe('A')
    })

    it('returns null when session ID does not exist, never falls back', async () => {
      const result = await practiceRepository.getSessionById('non-existent-session')
      expect(result).toBeNull()
    })

    it('prevents submitting an abandoned session', async () => {
      const config = { subjectId: 'math', limit: 2 }
      const session = await practiceService.startSession(config)
      await practiceService.abandonSession(session.id)

      await expect(practiceService.submitSession(session.id)).rejects.toThrow(
        'Không thể nộp bài cho phiên làm bài đã bị hủy (abandoned).'
      )
    })

    it('prevents modifying answers once session is submitted', async () => {
      const config = { subjectId: 'math', limit: 2 }
      const session = await practiceService.startSession(config)
      await practiceService.submitSession(session.id)

      const answer: MultipleChoiceAnswer = {
        questionType: 'multiple_choice',
        selectedOption: 'A',
      }

      await expect(
        practiceService.saveAnswer(session.id, session.questionIds[0], answer)
      ).rejects.toThrow('Không thể sửa câu trả lời cho phiên làm bài đã submitted.')
    })

    it('is idempotent on double submit (anti double-submit)', async () => {
      const config = { subjectId: 'math', limit: 2 }
      const session = await practiceService.startSession(config)

      const firstSubmit = await practiceService.submitSession(session.id)
      const secondSubmit = await practiceService.submitSession(session.id)

      expect(firstSubmit.id).toBe(secondSubmit.id)
      const allResults = await practiceRepository.getAllResults()
      expect(allResults.length).toBe(1)
    })
  })

  /* =========================================================================
   * 3. PRACTICE SERVICE & INTEGRATION FLOW
   * ========================================================================= */
  describe('3. Practice Service: Complete Evaluation & History', () => {
    it('creates session only with approved questions and fixed question list', async () => {
      const session = await practiceService.startSession({
        subjectId: 'math',
        chapterId: 'chap-math-12-01',
        limit: 5,
      })

      expect(session.questionIds.length).toBe(5)
      const uniqueIds = new Set(session.questionIds)
      expect(uniqueIds.size).toBe(5)

      // Ensure every question is approved
      for (const qId of session.questionIds) {
        const q = await questionBankRepository.getById(qId)
        expect(q?.reviewStatus).toBe('approved')
      }
    })

    it('generates real SkillScoreBreakdown where allocated points do not exceed total points', async () => {
      const session = await practiceService.startSession({
        subjectId: 'math',
        limit: 3,
      })

      // Answer first question
      await practiceService.saveAnswer(session.id, session.questionIds[0], {
        questionType: 'multiple_choice',
        selectedOption: 'A',
      })

      const result = await practiceService.submitSession(session.id)
      expect(result.skillBreakdown.length).toBeGreaterThan(0)

      const totalAllocatedEarned = roundPoints(
        result.skillBreakdown.reduce((sum, sk) => sum + sk.earnedPoints, 0)
      )
      expect(totalAllocatedEarned).toBeLessThanOrEqual(result.earnedPoints + 0.05) // within rounding bound
    })

    it('records real practice history and never produces fake stats', async () => {
      const initialHistory = await practiceService.getHistory()
      expect(initialHistory.length).toBe(0)

      const session = await practiceService.startSession({ subjectId: 'math', limit: 2 })
      await practiceService.submitSession(session.id)

      const updatedHistory = await practiceService.getHistory()
      expect(updatedHistory.length).toBe(1)
      expect(updatedHistory[0].sessionId).toBe(session.id)
      expect(typeof updatedHistory[0].percentage).toBe('number')
    })
  })
})

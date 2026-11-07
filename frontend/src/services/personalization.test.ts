import { describe, it, expect, beforeEach } from 'vitest'
import {
  aggregateSkillEvidence,
  validatePracticeResultIntegrity,
} from './evidenceAggregationEngine'
import {
  analyzeSkillPerformances,
  calculatePerformanceTrend,
  determineSkillStatus,
  evaluateConfidenceLevel,
} from './skillPerformanceEngine'
import { detectKnowledgeGaps } from './knowledgeGapDetectionEngine'
import { generateRecommendations } from './recommendationEngine'
import {
  calculateLearnerAnalyticsSummary,
  generateAdaptiveLearningPath,
} from './adaptiveLearningPathService'
import { personalizationService } from './personalization.service'
import { practiceRepository } from '@/repositories/practice.repository'
import { questionBankRepository } from '@/repositories/questionBank.repository'
import type { PracticeResult, ScoredQuestionResult } from '@/types/practice'
import type { QuestionItem } from '@/types/questionBank'
import type { SkillEvidence } from '@/types/personalization'

describe('Phase 13 — Personalized Learning Engine Suite', () => {
  beforeEach(async () => {
    await practiceRepository.clearAll()
    await questionBankRepository.resetToDefaults()
  })

  const createMockResult = (
    id: string,
    sessionId: string,
    questionResults: ScoredQuestionResult[],
    submittedAt = '2026-11-07T10:00:00Z',
    lessonId = 'lesson-math-12-01'
  ): PracticeResult => {
    const totalEarned = questionResults.reduce((sum, q) => sum + q.earnedPoints, 0)
    const totalMax = questionResults.reduce((sum, q) => sum + q.maxPoints, 0)
    return {
      id,
      sessionId,
      subjectId: 'math',
      chapterId: 'chap-math-12-01',
      lessonId,
      questionResults,
      totalQuestions: questionResults.length,
      correctCount: questionResults.filter((q) => q.isFullyCorrect).length,
      partialCount: questionResults.filter((q) => q.isPartiallyCorrect).length,
      incorrectCount: questionResults.filter((q) => !q.isFullyCorrect && !q.isUnanswered).length,
      unansweredCount: questionResults.filter((q) => q.isUnanswered).length,
      earnedPoints: totalEarned,
      maxPoints: totalMax,
      percentage: totalMax > 0 ? (totalEarned / totalMax) * 100 : 0,
      submittedAt,
      durationSeconds: 120,
      skillBreakdown: [],
      scoringVersion: 'GDPT_2018_V1',
    }
  }

  const createMockScoredQ = (
    qId: string,
    skillIds: string[],
    isCorrect: boolean,
    earned = isCorrect ? 1 : 0
  ): ScoredQuestionResult => ({
    questionId: qId,
    questionType: 'multiple_choice',
    difficulty: 'medium',
    cognitiveLevel: 'comprehension',
    skillIds,
    stem: 'Stem ' + qId,
    explanation: 'Explanation ' + qId,
    studentAnswer: null,
    correctAnswerDisplay: 'A',
    isFullyCorrect: isCorrect,
    isPartiallyCorrect: false,
    isUnanswered: false,
    earnedPoints: earned,
    maxPoints: 1,
  })

  /* =========================================================================
   * 1. EMPTY DATA & INITIAL STATES (Zero Fake Metrics)
   * ========================================================================= */
  it('1. Không có dữ liệu: returns empty structure without fabricating fake KPIs', () => {
    const evidence = aggregateSkillEvidence([])
    expect(Object.keys(evidence).length).toBe(0)

    const performances = analyzeSkillPerformances(evidence)
    expect(performances.length).toBe(0)

    const path = generateAdaptiveLearningPath([])
    expect(path.status).toBe('empty')
    expect(path.steps.length).toBe(0)
    expect(path.explanation).toContain('chưa có đủ kết quả đánh giá')

    const summary = calculateLearnerAnalyticsSummary([])
    expect(summary.totalSessions).toBe(0)
    expect(summary.uniqueQuestionsAnswered).toBe(0)
    expect(summary.overallScoreRatio).toBe(0)
    expect(summary.firstSessionAt).toBeNull()
  })

  /* =========================================================================
   * 2. SINGLE QUESTION CORRECT (Sparse Data Handling)
   * ========================================================================= */
  it('2. Một câu đúng: accurately measures 100% ratio but flags confidence as insufficient', () => {
    const q1 = createMockScoredQ('q1', ['skill-1'], true)
    const res = createMockResult('res-1', 'sess-1', [q1])

    const evidence = aggregateSkillEvidence([res])
    expect(evidence['skill-1']).toBeDefined()
    expect(evidence['skill-1'].fullyCorrectCount).toBe(1)
    expect(evidence['skill-1'].earnedPoints).toBe(1)

    const perfs = analyzeSkillPerformances(evidence)
    expect(perfs[0].scoreRatio).toBe(1)
    // Invariant: 1 single question cannot give sufficient confidence
    expect(perfs[0].confidenceLevel).toBe('insufficient')
    expect(perfs[0].status).toBe('insufficient_data')
  })

  /* =========================================================================
   * 3. SINGLE QUESTION WRONG (Sparse Data Handling)
   * ========================================================================= */
  it('3. Một câu sai: accurately measures 0% ratio but flags confidence as insufficient', () => {
    const q1 = createMockScoredQ('q1', ['skill-1'], false)
    const res = createMockResult('res-1', 'sess-1', [q1])

    const evidence = aggregateSkillEvidence([res])
    const perfs = analyzeSkillPerformances(evidence)
    expect(perfs[0].scoreRatio).toBe(0)
    expect(perfs[0].confidenceLevel).toBe('insufficient')
    expect(perfs[0].status).toBe('insufficient_data')
  })

  /* =========================================================================
   * 4. SINGLE SESSION & 5. MULTIPLE SESSIONS
   * ========================================================================= */
  it('4 & 5. Một lượt và nhiều lượt làm bài: correctly aggregates attempts and timestamps', () => {
    const q1 = createMockScoredQ('q1', ['skill-1'], true)
    const q2 = createMockScoredQ('q2', ['skill-1'], false)
    const res1 = createMockResult('res-1', 'sess-1', [q1], '2026-11-07T08:00:00Z')
    const res2 = createMockResult('res-2', 'sess-2', [q2], '2026-11-07T09:00:00Z')

    const evidence = aggregateSkillEvidence([res1, res2])
    const ev = evidence['skill-1']
    expect(ev.attemptCount).toBe(2)
    expect(ev.questionCount).toBe(2)
    expect(ev.firstAttemptAt).toBe('2026-11-07T08:00:00Z')
    expect(ev.lastAttemptAt).toBe('2026-11-07T09:00:00Z')
  })

  /* =========================================================================
   * 6. ANTI-DUPLICATE SESSION ID
   * ========================================================================= */
  it('6. Trùng sessionId: strictly deduplicates and never counts points twice', () => {
    const q1 = createMockScoredQ('q1', ['skill-1'], true)
    const res1 = createMockResult('res-1', 'sess-dup', [q1])
    const res2 = createMockResult('res-2', 'sess-dup', [q1]) // Duplicate sessionId

    const evidence = aggregateSkillEvidence([res1, res2])
    expect(evidence['skill-1'].attemptCount).toBe(1)
    expect(evidence['skill-1'].earnedPoints).toBe(1)
    expect(evidence['skill-1'].questionCount).toBe(1)
  })

  /* =========================================================================
   * 7. REPEATED IDENTICAL QUESTIONS PENALTY
   * ========================================================================= */
  it('7. Cùng một câu làm lại nhiều lần: does NOT count as independent evidence', () => {
    // Student repeats question 'q1' five times
    const q1 = createMockScoredQ('q1', ['skill-1'], true)
    const results = [1, 2, 3, 4, 5].map((i) =>
      createMockResult(`res-${i}`, `sess-${i}`, [q1], `2026-11-07T0${i}:00:00Z`)
    )

    const evidence = aggregateSkillEvidence(results)
    const ev = evidence['skill-1']
    expect(ev.questionCount).toBe(5)
    expect(ev.uniqueQuestionIds.length).toBe(1)
    expect(ev.repeatedQuestionCount).toBe(4)

    // Even with 5 attempts, confidence remains insufficient because unique questions = 1
    const confidence = evaluateConfidenceLevel(ev)
    expect(confidence).toBe('insufficient')
  })

  /* =========================================================================
   * 8. MULTI-SKILL FRACTIONAL WEIGHT ALLOCATION
   * ========================================================================= */
  it('8. Nhiều skillIds: divides points equally without score inflation or rounding loss', () => {
    const qMulti = createMockScoredQ('q-multi', ['skill-A', 'skill-B', 'skill-C'], true, 1)
    const res = createMockResult('res-1', 'sess-1', [qMulti])

    const evidence = aggregateSkillEvidence([res])
    expect(evidence['skill-A'].earnedPoints).toBeCloseTo(1 / 3, 5)
    expect(evidence['skill-B'].earnedPoints).toBeCloseTo(1 / 3, 5)
    expect(evidence['skill-C'].earnedPoints).toBeCloseTo(1 / 3, 5)

    const totalAllocated =
      evidence['skill-A'].earnedPoints +
      evidence['skill-B'].earnedPoints +
      evidence['skill-C'].earnedPoints
    expect(totalAllocated).toBeCloseTo(1.0, 5)
  })

  /* =========================================================================
   * 9 & 10. APPROVED STATUS FILTERING
   * ========================================================================= */
  it('9 & 10. Lọc câu hỏi approved: excludes needs_review or missing questions', () => {
    const approvedQ: QuestionItem = {
      id: 'q-app',
      type: 'multiple_choice',
      subjectId: 'math',
      chapterId: 'c1',
      lessonId: 'l1',
      skillIds: ['skill-1'],
      difficulty: 'medium',
      cognitiveLevel: 'comprehension',
      stem: 'Stem',
      explanation: 'Exp',
      options: [
        { id: 'A', text: '1' },
        { id: 'B', text: '2' },
        { id: 'C', text: '3' },
        { id: 'D', text: '4' },
      ],
      correctAnswer: 'A',
      reviewStatus: 'approved',
      createdAt: '',
      updatedAt: '',
    }

    const reviewQ: QuestionItem = {
      ...approvedQ,
      id: 'q-rev',
      reviewStatus: 'needs_review',
    }

    const qMap = new Map<string, QuestionItem>()
    qMap.set('q-app', approvedQ)
    qMap.set('q-rev', reviewQ)

    const q1 = createMockScoredQ('q-app', ['skill-1'], true)
    const q2 = createMockScoredQ('q-rev', ['skill-1'], false)
    const res = createMockResult('res-1', 'sess-1', [q1, q2])

    const evidence = aggregateSkillEvidence([res], { approvedQuestionMap: qMap })
    expect(evidence['skill-1'].questionCount).toBe(1)
    expect(evidence['skill-1'].uniqueQuestionIds).toEqual(['q-app'])
  })

  /* =========================================================================
   * 11 & 12. MALFORMED RESULT & LOCALSTORAGE CORRUPTION
   * ========================================================================= */
  it('11 & 12. Xử lý an toàn dữ liệu hỏng / thiếu metadata', () => {
    const corruptData: any = [
      null,
      undefined,
      {},
      { id: 'no-session' },
      { id: 'res-bad', sessionId: 's1', questionResults: 'not-an-array' },
      createMockResult('res-good', 'sess-good', [createMockScoredQ('q1', ['skill-1'], true)]),
    ]

    const evidence = aggregateSkillEvidence(corruptData)
    expect(Object.keys(evidence)).toEqual(['skill-1'])
  })

  /* =========================================================================
   * 13 & 14. THRESHOLDS (60% needs_review & 80% proficient)
   * ========================================================================= */
  it('13 & 14. Phân loại theo ngưỡng 60% và 80% khi có đủ dữ liệu', () => {
    // Low score: 0.50 -> needs_review
    expect(determineSkillStatus(0.5, 'low')).toBe('needs_review')
    expect(determineSkillStatus(0.59, 'moderate')).toBe('needs_review')

    // Mid score: 0.70 -> reinforcing
    expect(determineSkillStatus(0.6, 'low')).toBe('reinforcing')
    expect(determineSkillStatus(0.79, 'high')).toBe('reinforcing')

    // High score: 0.80 -> proficient
    expect(determineSkillStatus(0.8, 'low')).toBe('proficient')
    expect(determineSkillStatus(0.95, 'high')).toBe('proficient')

    // Insufficient confidence -> always insufficient_data regardless of score
    expect(determineSkillStatus(1.0, 'insufficient')).toBe('insufficient_data')
  })

  /* =========================================================================
   * 15 & 16. CONFIDENCE MODEL TIERS
   * ========================================================================= */
  it('15 & 16. Confidence Model: accurately assigns low, moderate, and high confidence', () => {
    const baseEv: SkillEvidence = {
      skillId: 's',
      attemptCount: 1,
      questionCount: 2,
      uniqueQuestionIds: ['q1', 'q2'],
      fullyCorrectCount: 2,
      earnedPoints: 2,
      maxPoints: 2,
      firstAttemptAt: '',
      lastAttemptAt: '',
      relatedQuestionIds: [],
      relatedSessionIds: [],
      relatedLessonIds: [],
      repeatedQuestionCount: 0,
      chronologicalAttempts: [],
    }

    // 2 unique questions, 1 attempt -> low
    expect(evaluateConfidenceLevel(baseEv)).toBe('low')

    // 4 unique questions, 2 attempts -> moderate
    const modEv = { ...baseEv, uniqueQuestionIds: ['q1', 'q2', 'q3', 'q4'], attemptCount: 2 }
    expect(evaluateConfidenceLevel(modEv)).toBe('moderate')

    // 6 unique questions, 3 attempts -> high
    const highEv = {
      ...baseEv,
      uniqueQuestionIds: ['q1', 'q2', 'q3', 'q4', 'q5', 'q6'],
      attemptCount: 3,
    }
    expect(evaluateConfidenceLevel(highEv)).toBe('high')
  })

  /* =========================================================================
   * 17, 18 & 19. LONGITUDINAL TREND
   * ========================================================================= */
  it('17, 18 & 19. Xu hướng năng lực: improving, declining và insufficient_data', () => {
    const evSingle: SkillEvidence = {
      skillId: 's',
      attemptCount: 1,
      questionCount: 1,
      uniqueQuestionIds: ['q1'],
      fullyCorrectCount: 1,
      earnedPoints: 1,
      maxPoints: 1,
      firstAttemptAt: '',
      lastAttemptAt: '',
      relatedQuestionIds: [],
      relatedSessionIds: [],
      relatedLessonIds: [],
      repeatedQuestionCount: 0,
      chronologicalAttempts: [{
        sessionId: 's1',
        questionId: 'q1',
        timestamp: '2026-11-07T10:00:00Z',
        isFullyCorrect: true,
        earnedPoints: 1,
        maxPoints: 1,
        skillWeight: 1,
      }],
    }

    // < 2 attempts -> insufficient_data
    expect(calculatePerformanceTrend(evSingle)).toBe('insufficient_data')

    // Improving trend: first half wrong (0/1), second half right (1/1)
    const evImproving: SkillEvidence = {
      ...evSingle,
      attemptCount: 2,
      chronologicalAttempts: [
        {
          sessionId: 's1',
          questionId: 'q1',
          timestamp: '2026-11-07T10:00:00Z',
          isFullyCorrect: false,
          earnedPoints: 0,
          maxPoints: 1,
          skillWeight: 1,
        },
        {
          sessionId: 's2',
          questionId: 'q2',
          timestamp: '2026-11-07T11:00:00Z',
          isFullyCorrect: true,
          earnedPoints: 1,
          maxPoints: 1,
          skillWeight: 1,
        },
      ],
    }
    expect(calculatePerformanceTrend(evImproving)).toBe('improving')

    // Declining trend: first half right (1/1), second half wrong (0/1)
    const evDeclining: SkillEvidence = {
      ...evSingle,
      attemptCount: 2,
      chronologicalAttempts: [
        {
          sessionId: 's1',
          questionId: 'q1',
          timestamp: '2026-11-07T10:00:00Z',
          isFullyCorrect: true,
          earnedPoints: 1,
          maxPoints: 1,
          skillWeight: 1,
        },
        {
          sessionId: 's2',
          questionId: 'q2',
          timestamp: '2026-11-07T11:00:00Z',
          isFullyCorrect: false,
          earnedPoints: 0,
          maxPoints: 1,
          skillWeight: 1,
        },
      ],
    }
    expect(calculatePerformanceTrend(evDeclining)).toBe('declining')
  })

  /* =========================================================================
   * 20. RECOMMENDATION RANKING
   * ========================================================================= */
  it('20. Xếp hạng khuyến nghị: high (critical gaps) > medium (diagnostic) > low (proficient)', () => {
    const q1 = createMockScoredQ('q1', ['skill-weak'], false)
    const q2 = createMockScoredQ('q2', ['skill-weak'], false)
    const q3 = createMockScoredQ('q3', ['skill-good'], true)
    const q4 = createMockScoredQ('q4', ['skill-good'], true)

    const res = createMockResult('res-1', 'sess-1', [q1, q2, q3, q4])
    const evidence = aggregateSkillEvidence([res])
    const perfs = analyzeSkillPerformances(evidence)
    const gaps = detectKnowledgeGaps(perfs, evidence)
    const recs = generateRecommendations(perfs, gaps, evidence)

    expect(recs.length).toBeGreaterThan(0)
    // First recommendation should be high priority
    expect(recs[0].priority).toBe('high')
  })

  /* =========================================================================
   * 21. LEARNING PATH SAFE FALLBACK
   * ========================================================================= */
  it('21. Learning path khi thiếu lesson ID: safely falls back to valid subject route', () => {
    const q1 = createMockScoredQ('q1', ['skill-unknown'], false)
    const res = createMockResult('res-1', 'sess-1', [q1], undefined, '') // Empty lesson ID

    const path = generateAdaptiveLearningPath([res])
    expect(path.status).toBe('active')
    expect(path.steps.length).toBeGreaterThan(0)
    expect(path.steps[0].targetRoute).toBeDefined()
  })

  /* =========================================================================
   * 22. LEARNING PATH DYNAMIC RECALCULATION
   * ========================================================================= */
  it('22. Learning path cập nhật linh hoạt khi có PracticeResult mới', () => {
    const q1 = createMockScoredQ('q1', ['skill-1'], false)
    const res1 = createMockResult('res-1', 'sess-1', [q1])

    const path1 = generateAdaptiveLearningPath([res1])
    expect(path1.sourceResultIds).toEqual(['res-1'])

    // New attempt with skill-2
    const q2 = createMockScoredQ('q2', ['skill-2'], false)
    const res2 = createMockResult('res-2', 'sess-2', [q2])

    const path2 = generateAdaptiveLearningPath([res1, res2])
    expect(path2.sourceResultIds).toEqual(['res-1', 'res-2'])
  })

  /* =========================================================================
   * 23. IMMUTABILITY OF SOURCE RESULTS
   * ========================================================================= */
  it('23. Không thay đổi PracticeResult gốc: engine processes data immutably', () => {
    const q1 = createMockScoredQ('q1', ['skill-1'], true)
    const res = createMockResult('res-1', 'sess-1', [q1])
    const originalEarned = res.earnedPoints
    const originalJson = JSON.stringify(res)

    aggregateSkillEvidence([res])
    generateAdaptiveLearningPath([res])

    expect(res.earnedPoints).toBe(originalEarned)
    expect(JSON.stringify(res)).toBe(originalJson)
  })

  /* =========================================================================
   * 24. ZERO FAKE MASTERY
   * ========================================================================= */
  it('24. Không fake mastery: never produces 100% mastery claims on small data', async () => {
    const overview = await personalizationService.getOverview()
    expect(overview.hasData).toBe(false)
    expect(overview.summary.totalSessions).toBe(0)
    expect(overview.learningPath.steps.length).toBe(0)
  })

  /* =========================================================================
   * 25. PHASE 14 INVARIANT: PRACTICE RESULT INTEGRITY VALIDATION
   * ========================================================================= */
  it('25. validatePracticeResultIntegrity kiểm tra toàn diện tính toàn vẹn của kết quả', () => {
    // Missing required fields
    const invalidRes1 = { sessionId: 'sess-1' }
    const val1 = validatePracticeResultIntegrity(invalidRes1)
    expect(val1.isValid).toBe(false)
    expect(val1.errors.some((e) => e.includes('id'))).toBe(true)

    // Negative points or earned > max
    const q1 = createMockScoredQ('q1', ['skill-1'], true)
    const invalidRes2 = {
      ...createMockResult('res-1', 'sess-1', [q1]),
      earnedPoints: 10,
      maxPoints: 5,
    }
    const val2 = validatePracticeResultIntegrity(invalidRes2)
    expect(val2.isValid).toBe(false)
    expect(val2.errors.some((e) => e.includes('vượt quá điểm tối đa'))).toBe(true)

    // Valid result
    const validRes = createMockResult('res-valid', 'sess-valid', [q1])
    const val3 = validatePracticeResultIntegrity(validRes)
    expect(val3.isValid).toBe(true)
    expect(val3.errors.length).toBe(0)
  })

  /* =========================================================================
   * 26. PHASE 14 INVARIANT: UNVERIFIED QUESTION REJECTION
   * ========================================================================= */
  it('26. validatePracticeResultIntegrity từ chối câu hỏi unapproved hoặc missing', () => {
    const qApproved = {
      id: 'q-app-1',
      reviewStatus: 'approved',
    } as QuestionItem
    const qReview = {
      id: 'q-rev-1',
      reviewStatus: 'needs_review',
    } as QuestionItem

    const approvedMap = new Map<string, QuestionItem>([
      ['q-app-1', qApproved],
      ['q-rev-1', qReview],
    ])

    const qScoredApproved = createMockScoredQ('q-app-1', ['skill-1'], true)
    const qScoredReview = createMockScoredQ('q-rev-1', ['skill-1'], true)
    const qScoredMissing = createMockScoredQ('q-missing', ['skill-1'], true)

    // Contains unapproved question
    const resWithReview = createMockResult('r-1', 's-1', [qScoredReview])
    const valReview = validatePracticeResultIntegrity(resWithReview, approvedMap, {
      strictAllQuestionsApproved: true,
    })
    expect(valReview.isValid).toBe(false)
    expect(valReview.errors.some((e) => e.includes('chưa được phê duyệt'))).toBe(true)

    // Contains question missing from bank
    const resWithMissing = createMockResult('r-2', 's-2', [qScoredMissing])
    const valMissing = validatePracticeResultIntegrity(resWithMissing, approvedMap, {
      strictAllQuestionsApproved: true,
    })
    expect(valMissing.isValid).toBe(false)
    expect(valMissing.errors.some((e) => e.includes('không tồn tại'))).toBe(true)

    // Contains only approved questions
    const resApproved = createMockResult('r-3', 's-3', [qScoredApproved])
    const valApproved = validatePracticeResultIntegrity(resApproved, approvedMap, {
      strictAllQuestionsApproved: true,
    })
    expect(valApproved.isValid).toBe(true)
  })

  /* =========================================================================
   * 27. PHASE 14 INVARIANT: REPEATED QUESTION TREND PROTECTION
   * ========================================================================= */
  it('27. calculatePerformanceTrend không tạo tiến bộ giả khi chỉ lặp lại 1 câu hỏi', () => {
    // A student answers question 'q1' 4 times in 2 different sessions (fails first, gets correct later)
    const evSingleQuestion: SkillEvidence = {
      skillId: 'skill-single',
      attemptCount: 2,
      questionCount: 4,
      uniqueQuestionIds: ['q1'], // Only 1 distinct question!
      fullyCorrectCount: 2,
      earnedPoints: 2,
      maxPoints: 4,
      firstAttemptAt: '2026-11-07T10:00:00Z',
      lastAttemptAt: '2026-11-07T10:30:00Z',
      relatedQuestionIds: ['q1'],
      relatedSessionIds: ['sess-1', 'sess-2'],
      relatedLessonIds: [],
      repeatedQuestionCount: 3,
      chronologicalAttempts: [
        {
          sessionId: 'sess-1',
          questionId: 'q1',
          timestamp: '2026-11-07T10:00:00Z',
          isFullyCorrect: false,
          earnedPoints: 0,
          maxPoints: 1,
          skillWeight: 1,
        },
        {
          sessionId: 'sess-1',
          questionId: 'q1',
          timestamp: '2026-11-07T10:05:00Z',
          isFullyCorrect: false,
          earnedPoints: 0,
          maxPoints: 1,
          skillWeight: 1,
        },
        {
          sessionId: 'sess-2',
          questionId: 'q1',
          timestamp: '2026-11-07T10:20:00Z',
          isFullyCorrect: true,
          earnedPoints: 1,
          maxPoints: 1,
          skillWeight: 1,
        },
        {
          sessionId: 'sess-2',
          questionId: 'q1',
          timestamp: '2026-11-07T10:25:00Z',
          isFullyCorrect: true,
          earnedPoints: 1,
          maxPoints: 1,
          skillWeight: 1,
        },
      ],
    }

    // Invariant: Must be 'insufficient_data' because memorizing a single question is not real skill progression
    const trend = calculatePerformanceTrend(evSingleQuestion)
    expect(trend).toBe('insufficient_data')

    // If there are at least 2 distinct questions and 2 attempts, trend is evaluated
    const evMultiQuestions: SkillEvidence = {
      ...evSingleQuestion,
      uniqueQuestionIds: ['q1', 'q2'],
    }
    const trendMulti = calculatePerformanceTrend(evMultiQuestions)
    expect(trendMulti).toBe('improving')
  })

  /* =========================================================================
   * 28. PHASE 14 INVARIANT: STRICT REQUIRE APPROVED QUESTIONS OPTION
   * ========================================================================= */
  it('28. aggregateSkillEvidence với requireApprovedQuestions từ chối khi thiếu approvedQuestionMap', () => {
    const q1 = createMockScoredQ('q1', ['skill-1'], true)
    const res = createMockResult('res-1', 'sess-1', [q1])

    // With requireApprovedQuestions but no map provided
    const evidenceEmpty = aggregateSkillEvidence([res], {
      requireApprovedQuestions: true,
    })
    expect(Object.keys(evidenceEmpty).length).toBe(0)
  })
})

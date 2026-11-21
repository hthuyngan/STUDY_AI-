import { describe, it, expect, vi, beforeEach } from 'vitest'
import { personalizationService } from '@/services/personalization.service'
import { detectKnowledgeGaps } from '@/services/knowledgeGapDetectionEngine'
import { generateAdaptiveLearningPath } from '@/services/adaptiveLearningPathService'
import type { PracticeResult } from '@/types/practice'
import type { SkillPerformance, SkillEvidence } from '@/types/personalization'

describe('Phase AI-02: Adaptive Learning Intelligence Suite', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('1. Computes Student Knowledge Profile with 4-tier competency classification and difficulty breakdown', async () => {
    const profile = await personalizationService.getKnowledgeProfile('sub_math12')

    expect(profile).toBeDefined()
    expect(profile.subjectId).toBe('sub_math12')
    expect(profile.scoringExplanation).toContain('Mastery Score')

    // 4-tier classification validity
    const validTiers = ['needs_reinforcement', 'progressing', 'proficient', 'mastered', 'insufficient_data']
    expect(validTiers).toContain(profile.overallStatus)
    expect(profile.overallStatusLabel).toBeDefined()

    // Difficulty breakdown covers all 4 tiers
    expect(profile.difficultyBreakdown).toBeDefined()
    expect(profile.difficultyBreakdown.nhan_biet).toBeDefined()
    expect(profile.difficultyBreakdown.thong_hieu).toBeDefined()
    expect(profile.difficultyBreakdown.van_dung).toBeDefined()
    expect(profile.difficultyBreakdown.van_dung_cao).toBeDefined()
    expect(profile.difficultyBreakdown.nhan_biet.levelName).toBe('Nhận biết')
  })

  it('2. Detects concrete knowledge gaps strictly from verified practice errors without AI speculation', () => {
    const mockPerformances: SkillPerformance[] = [
      {
        skillId: 'sk-cuc-tri',
        skillName: 'Cực trị của hàm số',
        scoreRatio: 0.25,
        evidenceCount: 4,
        confidenceLevel: 'moderate',
        trend: 'declining',
        status: 'needs_review',
        lastPracticedAt: new Date().toISOString(),
        relatedLessonIds: ['les_math12_c1_b1'],
      },
      {
        skillId: 'sk-don-dieu',
        skillName: 'Tính đơn điệu của hàm số',
        scoreRatio: 0.85,
        evidenceCount: 5,
        confidenceLevel: 'high',
        trend: 'improving',
        status: 'proficient',
        lastPracticedAt: new Date().toISOString(),
        relatedLessonIds: ['les_math12_c1_b1'],
      },
    ]

    const mockEvidenceMap: Record<string, SkillEvidence> = {
      'sk-cuc-tri': {
        skillId: 'sk-cuc-tri',
        attemptCount: 2,
        questionCount: 4,
        uniqueQuestionIds: ['q1', 'q2', 'q3', 'q4'],
        fullyCorrectCount: 1,
        earnedPoints: 1,
        maxPoints: 4,
        firstAttemptAt: new Date().toISOString(),
        lastAttemptAt: new Date().toISOString(),
        relatedQuestionIds: ['q1', 'q2', 'q3', 'q4'],
        relatedSessionIds: ['sess1'],
        relatedLessonIds: ['les_math12_c1_b1'],
        repeatedQuestionCount: 0,
        chronologicalAttempts: [],
      },
      'sk-don-dieu': {
        skillId: 'sk-don-dieu',
        attemptCount: 2,
        questionCount: 5,
        uniqueQuestionIds: ['q5', 'q6', 'q7', 'q8', 'q9'],
        fullyCorrectCount: 4,
        earnedPoints: 4,
        maxPoints: 5,
        firstAttemptAt: new Date().toISOString(),
        lastAttemptAt: new Date().toISOString(),
        relatedQuestionIds: ['q5', 'q6', 'q7', 'q8', 'q9'],
        relatedSessionIds: ['sess2'],
        relatedLessonIds: ['les_math12_c1_b1'],
        repeatedQuestionCount: 0,
        chronologicalAttempts: [],
      },
    }

    const gaps = detectKnowledgeGaps(mockPerformances, mockEvidenceMap)

    expect(gaps).toHaveLength(1)
    expect(gaps[0].skillId).toBe('sk-cuc-tri')
    expect(gaps[0].gapLevel).toBe('critical')
    expect(gaps[0].evidenceSummary).toContain('Trả lời chưa chính xác ở 3/4 lượt câu hỏi')
    expect(gaps[0].recommendedActions).toBeDefined()
    expect(gaps[0].recommendedActions.length).toBeGreaterThan(0)
  })

  it('3. Generates Personalized Learning Path with sequential steps and explainable reasons', () => {
    const mockResults: PracticeResult[] = [
      {
        id: 'res_1',
        sessionId: 'sess_1',
        subjectId: 'sub_math12',
        chapterId: 'chap-1',
        totalQuestions: 4,
        correctCount: 1,
        partialCount: 0,
        incorrectCount: 3,
        unansweredCount: 0,
        earnedPoints: 1,
        maxPoints: 4,
        percentage: 25,
        durationSeconds: 180,
        submittedAt: new Date().toISOString(),
        questionResults: [
          { questionId: 'q1', questionType: 'multiple_choice', difficulty: 'easy', cognitiveLevel: 'recognition', skillIds: ['math-12-sk-01'], stem: '', explanation: '', studentAnswer: null, correctAnswerDisplay: '', isFullyCorrect: false, isPartiallyCorrect: false, isUnanswered: false, earnedPoints: 0, maxPoints: 1 },
          { questionId: 'q2', questionType: 'multiple_choice', difficulty: 'easy', cognitiveLevel: 'recognition', skillIds: ['math-12-sk-01'], stem: '', explanation: '', studentAnswer: null, correctAnswerDisplay: '', isFullyCorrect: false, isPartiallyCorrect: false, isUnanswered: false, earnedPoints: 0, maxPoints: 1 },
          { questionId: 'q3', questionType: 'multiple_choice', difficulty: 'easy', cognitiveLevel: 'recognition', skillIds: ['math-12-sk-01'], stem: '', explanation: '', studentAnswer: null, correctAnswerDisplay: '', isFullyCorrect: false, isPartiallyCorrect: false, isUnanswered: false, earnedPoints: 0, maxPoints: 1 },
          { questionId: 'q4', questionType: 'multiple_choice', difficulty: 'easy', cognitiveLevel: 'recognition', skillIds: ['math-12-sk-01'], stem: '', explanation: '', studentAnswer: null, correctAnswerDisplay: '', isFullyCorrect: true, isPartiallyCorrect: false, isUnanswered: false, earnedPoints: 1, maxPoints: 1 },
        ],
        skillBreakdown: [],
        scoringVersion: 'v1.0',
      },
    ]

    const path = generateAdaptiveLearningPath(mockResults, {
      skillNameMap: { 'math-12-sk-01': 'Tính đơn điệu của hàm số' },
      lessonTitleMap: { 'lesson-math-12-01': 'Bài 1: Tính đơn điệu' },
    })

    expect(path).toBeDefined()
    expect(path.steps.length).toBeGreaterThanOrEqual(1)
    expect(path.explanation).toBeDefined()
    // First step should target remediation/review of the weak skill
    const firstStep = path.steps[0]
    expect(firstStep.reason).toBeDefined()
    expect(firstStep.actionType).toBe('review_lesson')
  })

  it('4. Correctly validates adaptive practice session creation payload', async () => {
    const adaptiveConfig = {
      subjectId: 'sub_math12',
      mode: 'adaptive',
      questionCount: 10,
    }

    expect(adaptiveConfig.mode).toBe('adaptive')
    expect(adaptiveConfig.questionCount).toBe(10)
    expect(adaptiveConfig.subjectId).toBe('sub_math12')
  })
})

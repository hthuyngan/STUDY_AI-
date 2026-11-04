import { describe, it, expect, beforeEach } from 'vitest'
import {
  selectAnalyticsSummary,
  selectDailyActivities,
  selectCompetencyProfile,
  selectSubjectAnalytics,
  selectLearningHistory,
  normalizeSubjectId,
} from '@/selectors/learningAnalytics.selectors'
import { learningAnalyticsService } from './learningAnalytics.service'
import type {
  LearningAttempt,
  LearningEvent,
  LessonProgressState,
} from '@/types/assessment'
import type { KnowledgeGap } from '@/types/knowledgeGaps'
import type { SmartReviewItem } from '@/types/smartReview'

describe('learningAnalytics.selectors & service', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('normalizes subject IDs correctly', () => {
    expect(normalizeSubjectId('toan-hoc')).toBe('math')
    expect(normalizeSubjectId('math')).toBe('math')
    expect(normalizeSubjectId('vat-ly')).toBe('physics')
    expect(normalizeSubjectId('physics')).toBe('physics')
    expect(normalizeSubjectId('hoa-hoc')).toBe('chemistry')
    expect(normalizeSubjectId('tieng-anh')).toBe('english')
  })

  it('computes summary with 0 attempts safely without NaN or division by zero', () => {
    const summary = selectAnalyticsSummary({}, [], [], [])
    expect(summary.totalLessonsCompleted).toBe(0)
    expect(summary.assessmentAttemptsCount).toBe(0)
    expect(summary.averageAssessmentScore).toBeNull()
    expect(summary.activeKnowledgeGapsCount).toBe(0)
    expect(summary.estimatedStudyTimeMinutes).toBe(0)
    expect(summary.overallCompletionPercent).toBe(0)
  })

  it('computes summary accurately with real progress, attempts, and review items', () => {
    const progressMap: Record<string, LessonProgressState> = {
      'lesson-math-01': {
        lessonId: 'lesson-math-01',
        subjectId: 'math',
        completedSectionIds: ['sec-1', 'sec-2'],
        contentProgress: 80,
        assessmentStatus: 'completed',
        overallProgress: 100,
        updatedAt: '2026-11-01T10:00:00Z',
      },
      'lesson-phys-01': {
        lessonId: 'lesson-phys-01',
        subjectId: 'physics',
        completedSectionIds: ['sec-1'],
        contentProgress: 40,
        assessmentStatus: 'not-attempted',
        overallProgress: 40,
        updatedAt: '2026-11-01T11:00:00Z',
      },
    }

    const attempts: LearningAttempt[] = [
      {
        id: 'att-1',
        learnerId: 'std-1',
        subjectId: 'math',
        chapterId: 'chap-1',
        lessonId: 'lesson-math-01',
        assessmentId: 'ass-1',
        attemptNumber: 1,
        startedAt: '2026-11-01T10:10:00Z',
        lastActivityAt: '2026-11-01T10:20:00Z',
        status: 'completed',
        progressMeasure: 1,
        completionStatus: 'completed',
        successStatus: 'passed',
        scoreRaw: 4,
        scoreMin: 0,
        scoreMax: 5,
        scoreScaled: 0.8,
        sessionTimeMs: 600000, // 10 minutes
        currentQuestionId: 'q-5',
        responses: {},
        events: [],
      },
    ]

    const gaps: KnowledgeGap[] = [
      {
        id: 'gap-1',
        subjectId: 'math',
        subjectName: 'Toán học',
        lessonId: 'lesson-math-01',
        lessonTitle: 'Đạo hàm',
        knowledgePointId: 'kp-chain',
        title: 'Đạo hàm hàm hợp',
        severity: 'medium',
        source: 'assessment_attempt',
        wrongAttemptsCount: 1,
        correctReviewCount: 0,
        status: 'needs-review',
        lastDetectedAt: '2026-11-01T10:20:00Z',
        createdAt: '2026-11-01T10:20:00Z',
        updatedAt: '2026-11-01T10:20:00Z',
      },
    ]

    const reviewItems: SmartReviewItem[] = [
      {
        id: 'rev-1',
        gapId: 'gap-1',
        knowledgePointId: 'kp-chain',
        subjectId: 'math',
        subjectName: 'Toán học',
        lessonId: 'lesson-math-01',
        lessonTitle: 'Đạo hàm',
        title: 'Đạo hàm hàm hợp',
        dueDate: '2026-11-02',
        reviewCount: 2,
        intervalDays: 3,
        status: 'due',
        history: [],
        createdAt: '2026-11-01T10:20:00Z',
        updatedAt: '2026-11-01T10:20:00Z',
      },
    ]

    const summary = selectAnalyticsSummary(progressMap, attempts, gaps, reviewItems)
    expect(summary.totalLessonsCompleted).toBe(1)
    expect(summary.assessmentAttemptsCount).toBe(1)
    expect(summary.averageAssessmentScore).toBe(80)
    expect(summary.activeKnowledgeGapsCount).toBe(1)
    expect(summary.totalReviewSessionsCompleted).toBe(2)
    // 10m assessment + (3 sections * 4m) + (2 reviews * 2m) = 10 + 12 + 4 = 26m
    expect(summary.estimatedStudyTimeMinutes).toBe(26)
  })

  it('aggregates daily activities over the 7-day window properly', () => {
    const today = new Date('2026-11-04T12:00:00Z')
    const events: LearningEvent[] = [
      {
        id: 'evt-1',
        lessonId: 'lesson-math-01',
        subjectId: 'math',
        timestamp: '2026-11-04T10:00:00Z',
        type: 'lesson_section_completed',
        schemaVersion: 1,
      },
    ]

    const daily = selectDailyActivities(events, [], today)
    expect(daily.length).toBe(7)
    // Today's entry is the last one (index 6)
    const todayEntry = daily[6]
    expect(todayEntry.date).toBe('2026-11-04')
    expect(todayEntry.hasActivity).toBe(true)
    expect(todayEntry.eventCount).toBe(1)
    expect(todayEntry.studyTimeMinutes).toBe(3)

    // Other days without events have hasActivity: false
    expect(daily[0].hasActivity).toBe(false)
    expect(daily[0].eventCount).toBe(0)
  })

  it('evaluates competency profile without conflating reading percentage with mastery', () => {
    const gaps: KnowledgeGap[] = [
      {
        id: 'gap-weak-1',
        subjectId: 'math',
        subjectName: 'Toán học',
        lessonId: 'lesson-math-01',
        lessonTitle: 'Đạo hàm',
        knowledgePointId: 'kp-inflection',
        title: 'Điểm uốn đồ thị bậc 3',
        severity: 'high',
        source: 'assessment_attempt',
        wrongAttemptsCount: 2,
        correctReviewCount: 0,
        status: 'needs-review',
        lastDetectedAt: '2026-11-01T10:00:00Z',
        createdAt: '2026-11-01T10:00:00Z',
        updatedAt: '2026-11-01T10:00:00Z',
      },
      {
        id: 'gap-mastered-1',
        subjectId: 'physics',
        subjectName: 'Vật lý',
        lessonId: 'lesson-phys-01',
        lessonTitle: 'Dao động cơ',
        knowledgePointId: 'kp-phase',
        title: 'Pha ban đầu dao động',
        severity: 'low',
        source: 'assessment_attempt',
        wrongAttemptsCount: 1,
        correctReviewCount: 3,
        status: 'mastered',
        lastDetectedAt: '2026-11-01T10:00:00Z',
        createdAt: '2026-11-01T10:00:00Z',
        updatedAt: '2026-11-04T10:00:00Z',
      },
    ]

    // In-progress reading (80%) without assessment
    const progressMap: Record<string, LessonProgressState> = {
      'lesson-chem-01': {
        lessonId: 'lesson-chem-01',
        subjectId: 'chemistry',
        completedSectionIds: ['intro'],
        contentProgress: 80,
        assessmentStatus: 'not-attempted',
        overallProgress: 80,
        updatedAt: '2026-11-02T10:00:00Z',
      },
    }

    const comps = selectCompetencyProfile(gaps, [], progressMap)
    expect(comps.length).toBe(3)

    const needsReview = comps.find((c) => c.title === 'Điểm uốn đồ thị bậc 3')
    expect(needsReview?.level).toBe('needs-review')

    const mastered = comps.find((c) => c.title === 'Pha ban đầu dao động')
    expect(mastered?.level).toBe('mastered')

    const chemPending = comps.find((c) => c.lessonId === 'lesson-chem-01')
    expect(chemPending?.level).toBe('insufficient-data')
    expect(chemPending?.evidence).toContain('chưa thực hiện bài tập thu hoạch')
  })

  it('aggregates subject analytics across all 4 subjects accurately', () => {
    const subjects = selectSubjectAnalytics({}, [], [])
    expect(subjects.length).toBe(4)
    expect(subjects.map((s) => s.subjectId)).toEqual(['math', 'physics', 'chemistry', 'english'])
    // All start with insufficient data
    subjects.forEach((s) => {
      expect(s.competencyLevel).toBe('insufficient-data')
      expect(s.assessmentAverageScore).toBeNull()
    })
  })

  it('selects and sorts learning history timeline chronologically descending', () => {
    const attempts: LearningAttempt[] = [
      {
        id: 'att-old',
        learnerId: 'std-1',
        subjectId: 'math',
        chapterId: 'chap-1',
        lessonId: 'lesson-math-01',
        assessmentId: 'ass-1',
        attemptNumber: 1,
        startedAt: '2026-11-01T08:00:00Z',
        lastActivityAt: '2026-11-01T08:15:00Z',
        status: 'completed',
        progressMeasure: 1,
        completionStatus: 'completed',
        successStatus: 'passed',
        scoreRaw: 5,
        scoreMin: 0,
        scoreMax: 5,
        scoreScaled: 1.0,
        sessionTimeMs: 900000,
        currentQuestionId: 'q-5',
        responses: {},
        events: [],
      },
      {
        id: 'att-new',
        learnerId: 'std-1',
        subjectId: 'physics',
        chapterId: 'chap-1',
        lessonId: 'lesson-phys-01',
        assessmentId: 'ass-2',
        attemptNumber: 1,
        startedAt: '2026-11-03T14:00:00Z',
        lastActivityAt: '2026-11-03T14:15:00Z',
        status: 'completed',
        progressMeasure: 1,
        completionStatus: 'completed',
        successStatus: 'failed',
        scoreRaw: 2,
        scoreMin: 0,
        scoreMax: 5,
        scoreScaled: 0.4,
        sessionTimeMs: 900000,
        currentQuestionId: 'q-5',
        responses: {},
        events: [],
      },
    ]

    const timeline = selectLearningHistory([], attempts, [], [])
    expect(timeline.length).toBe(2)
    expect(timeline[0].id).toBe('hist_att_att-new')
    expect(timeline[1].id).toBe('hist_att_att-old')
  })

  it('generates Teacher Student Analytics safely with demo attribution', () => {
    const teacherData = learningAnalyticsService.getTeacherStudentAnalytics('stu-001', 'Nguyễn Văn A')
    expect(teacherData.studentId).toBe('stu-001')
    expect(teacherData.isDemoProfile).toBe(true)
    expect(teacherData.disclaimer).toContain('Nguyễn Văn A')
    expect(teacherData.recommendedInterventions.length).toBeGreaterThan(0)
  })
})


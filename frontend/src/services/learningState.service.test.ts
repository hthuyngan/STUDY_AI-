import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import {
  ASSESSMENT_ATTEMPTS_STORAGE_KEY,
} from '@/services/assessment.service'
import {
  buildLearningStateSnapshot,
  getLocalDateKey,
  resetLearningStateForTests,
  selectChapterLearningState,
  selectContinueLearningLessons,
  selectLessonLearningState,
  selectRecentLearningActivities,
  selectStreakState,
  selectSubjectLearningState,
  selectWeeklyActivity,
} from '@/services/learningState.service'
import { LEARNING_EVENTS_STORAGE_KEY } from '@/services/learningTracking.service'
import { LESSON_PROGRESS_STORAGE_KEY } from '@/services/lessonProgress.service'
import type { LearningAttempt, LearningEvent, LessonProgressState } from '@/types/assessment'

describe('Learning State Engine — Single Source of Truth', () => {
  beforeEach(() => {
    resetLearningStateForTests()
  })

  afterEach(() => {
    resetLearningStateForTests()
  })

  describe('New User / Zero Progress Baseline', () => {
    it('returns intentional zeroed progress and empty active states for brand new learner', () => {
      const snapshot = buildLearningStateSnapshot()

      // Summary
      expect(snapshot.summary.completedLessons).toBe(0)
      expect(snapshot.summary.inProgressLessons).toBe(0)

      // Streak
      expect(snapshot.streak.current).toBe(0)
      expect(snapshot.streak.longest).toBe(0)
      expect(snapshot.streak.isTodayActive).toBe(false)

      // Continue learning & Recent activities
      expect(snapshot.continueLearning).toEqual([])
      expect(snapshot.recentActivities).toEqual([])

      // Weekly activity minutes
      expect(snapshot.weeklyActivity.totalMinutes).toBe(0)
      expect(snapshot.weeklyActivity.weeklyHours).toBe(0)
      expect(selectWeeklyActivity().totalMinutes).toBe(0)


      // Subject progress is zeroed without fake completed percentages
      const math = selectSubjectLearningState('math')
      expect(math?.progress).toBe(0)
      expect(math?.completedLessons).toBe(0)
      expect(math?.startedLessons).toBe(0)
    })
  })

  describe('Chapter and Subject Progress Aggregation (Arithmetic Mean)', () => {
    it('calculates chapter progress as arithmetic average of lessons (e.g. 100 + 60 + 0 = 53%)', () => {
      // Mock 3 lessons in a single chapter
      const now = new Date().toISOString()
      const progressMap: Record<string, LessonProgressState> = {
        'lesson-math-01': {
          lessonId: 'lesson-math-01',
          subjectId: 'math',
          completedSectionIds: ['sec-1', 'sec-2'],
          contentProgress: 80,
          overallProgress: 100,
          updatedAt: now,
          assessmentStatus: 'completed',
        },
        'lesson-math-02': {
          lessonId: 'lesson-math-02',
          subjectId: 'math',
          completedSectionIds: ['sec-1'],
          contentProgress: 60,
          overallProgress: 60,
          updatedAt: now,
          assessmentStatus: 'not-attempted',
        },
        // lesson-math-03 remains 0%
      }

      localStorage.setItem(LESSON_PROGRESS_STORAGE_KEY, JSON.stringify(progressMap))

      const chap1 = selectChapterLearningState('math-chap-1')
      expect(chap1).toBeDefined()
      // Math chapter 1 has 7 total lessons in mock.
      // (100 + 60 + 0 + 0 + 0 + 0 + 0) / 7 = 160 / 7 = 22.85 -> 23%
      expect(chap1?.completedLessons).toBe(1)
      expect(chap1?.startedLessons).toBe(2)
      expect(chap1?.progress).toBe(Math.round(160 / chap1!.lessonCount))
    })

    it('derives subject progress as average of all lessons across chapters', () => {
      const now = new Date().toISOString()
      const progressMap: Record<string, LessonProgressState> = {
        'lesson-math-01': {
          lessonId: 'lesson-math-01',
          subjectId: 'math',
          completedSectionIds: ['sec-1', 'sec-2'],
          contentProgress: 80,
          overallProgress: 100,
          updatedAt: now,
          assessmentStatus: 'completed',
        },
        'lesson-math-08': {
          lessonId: 'lesson-math-08',
          subjectId: 'math',
          completedSectionIds: ['sec-1'],
          contentProgress: 50,
          overallProgress: 50,
          updatedAt: now,
          assessmentStatus: 'not-attempted',
        },
      }

      localStorage.setItem(LESSON_PROGRESS_STORAGE_KEY, JSON.stringify(progressMap))

      const math = selectSubjectLearningState('math')
      expect(math).toBeDefined()
      expect(math?.completedLessons).toBe(1)
      expect(math?.startedLessons).toBe(2)
      // 150 / 12 total lessons in math chapters = 12.5 -> 13%
      expect(math?.progress).toBe(Math.round(150 / 12))
    })
  })

  describe('Continue Learning Selection', () => {
    it('selects top in-progress lessons (0 < progress < 100) sorted by lastActivityAt DESC, excluding completed', () => {
      const now = Date.now()
      const timeToday = new Date(now).toISOString()
      const timeYesterday = new Date(now - 86400000).toISOString()
      const timeTwoDaysAgo = new Date(now - 86400000 * 2).toISOString()

      const progressMap: Record<string, LessonProgressState> = {
        'lesson-math-01': {
          lessonId: 'lesson-math-01',
          subjectId: 'math',
          completedSectionIds: ['sec-1', 'sec-2'],
          contentProgress: 80,
          overallProgress: 100, // Completed - should NOT be in continue list
          updatedAt: timeToday,
          assessmentStatus: 'completed',
        },
        'lesson-math-02': {
          lessonId: 'lesson-math-02',
          subjectId: 'math',
          completedSectionIds: ['sec-1'],
          contentProgress: 20,
          overallProgress: 20,
          updatedAt: timeYesterday,
          assessmentStatus: 'not-attempted',
        },
        'lesson-math-08': {
          lessonId: 'lesson-math-08',
          subjectId: 'math',
          completedSectionIds: ['sec-1', 'sec-2'],
          contentProgress: 60,
          overallProgress: 60,
          updatedAt: timeToday, // More recent
          assessmentStatus: 'not-attempted',
        },
        'lesson-phy-01': {
          lessonId: 'lesson-phy-01',
          subjectId: 'physics',
          completedSectionIds: ['sec-1'],
          contentProgress: 35,
          overallProgress: 35,
          updatedAt: timeTwoDaysAgo,
          assessmentStatus: 'not-attempted',
        },
      }

      localStorage.setItem(LESSON_PROGRESS_STORAGE_KEY, JSON.stringify(progressMap))

      const continueLessons = selectContinueLearningLessons()
      // Must not contain completed lesson
      expect(continueLessons.some((l) => l.id === 'lesson-math-01')).toBe(false)

      // Expected sorted order: lesson-math-08 (today, 60%), then lesson-math-02 (yesterday, 20%), then lesson-phy-01 (2 days ago, 35%)
      expect(continueLessons.length).toBe(3)
      expect(continueLessons[0].id).toBe('lesson-math-08')
      expect(continueLessons[0].progress).toBe(60)
      expect(continueLessons[0].isPrimary).toBe(true)

      expect(continueLessons[1].id).toBe('lesson-math-02')
      expect(continueLessons[1].progress).toBe(20)

      expect(continueLessons[2].id).toBe('lesson-phy-01')
      expect(continueLessons[2].progress).toBe(35)
    })
  })

  describe('Streak Calculation (Local Calendar Dates)', () => {
    it('calculates 3-day streak when active today, yesterday, and 2 days ago', () => {
      const now = new Date()
      const d0 = new Date(now)
      const d1 = new Date(now.getTime() - 86400000)
      const d2 = new Date(now.getTime() - 86400000 * 2)

      const events: LearningEvent[] = [
        {
          id: 'ev-1',
          type: 'lesson_section_completed',
          lessonId: 'lesson-math-01',
          subjectId: 'math',
          timestamp: d2.toISOString(),
          schemaVersion: 1,
        },
        {
          id: 'ev-2',
          type: 'assessment_completed',
          lessonId: 'lesson-math-01',
          subjectId: 'math',
          timestamp: d1.toISOString(),
          schemaVersion: 1,
        },
        {
          id: 'ev-3',
          type: 'lesson_section_completed',
          lessonId: 'lesson-math-02',
          subjectId: 'math',
          timestamp: d0.toISOString(),
          schemaVersion: 1,
        },
      ]

      localStorage.setItem(LEARNING_EVENTS_STORAGE_KEY, JSON.stringify(events))

      const streak = selectStreakState()
      expect(streak.current).toBe(3)
      expect(streak.longest).toBe(3)
      expect(streak.isTodayActive).toBe(true)
    })

    it('maintains streak when yesterday was active even if today has not learned yet', () => {
      const now = new Date()
      const d1 = new Date(now.getTime() - 86400000)
      const d2 = new Date(now.getTime() - 86400000 * 2)

      const events: LearningEvent[] = [
        {
          id: 'ev-1',
          type: 'lesson_section_completed',
          lessonId: 'lesson-math-01',
          subjectId: 'math',
          timestamp: d2.toISOString(),
          schemaVersion: 1,
        },
        {
          id: 'ev-2',
          type: 'assessment_completed',
          lessonId: 'lesson-math-01',
          subjectId: 'math',
          timestamp: d1.toISOString(),
          schemaVersion: 1,
        },
      ]

      localStorage.setItem(LEARNING_EVENTS_STORAGE_KEY, JSON.stringify(events))

      const streak = selectStreakState()
      expect(streak.current).toBe(2)
      expect(streak.isTodayActive).toBe(false)
    })

    it('resets current streak upon gap day while tracking longest streak correctly', () => {
      const now = new Date()
      // History: 5 days active, then 2 days gap, then 2 days active
      const d0 = new Date(now.getTime())
      const d1 = new Date(now.getTime() - 86400000)
      // Gap at d2 and d3
      const d4 = new Date(now.getTime() - 86400000 * 4)
      const d5 = new Date(now.getTime() - 86400000 * 5)
      const d6 = new Date(now.getTime() - 86400000 * 6)
      const d7 = new Date(now.getTime() - 86400000 * 7)
      const d8 = new Date(now.getTime() - 86400000 * 8)

      const dates = [d0, d1, d4, d5, d6, d7, d8]
      const events: LearningEvent[] = dates.map((d, idx) => ({
        id: `ev-${idx}`,
        type: 'lesson_section_completed',
        lessonId: 'lesson-math-01',
        subjectId: 'math',
        timestamp: d.toISOString(),
        schemaVersion: 1,
      }))

      localStorage.setItem(LEARNING_EVENTS_STORAGE_KEY, JSON.stringify(events))

      const streak = selectStreakState()
      expect(streak.current).toBe(2)
      expect(streak.longest).toBe(5)
    })
  })

  describe('Recent Activity & Analytics Event Filtering', () => {
    it('filters out internal telemetry events and only includes meaningful user activities', () => {
      const now = new Date().toISOString()
      const events: LearningEvent[] = [
        {
          id: 'ev-telemetry-1',
          type: 'window_focused',
          lessonId: 'lesson-math-01',
          subjectId: 'math',
          timestamp: now,
          schemaVersion: 1,
        },
        {
          id: 'ev-telemetry-2',
          type: 'answer_selected',
          lessonId: 'lesson-math-01',
          subjectId: 'math',
          timestamp: now,
          schemaVersion: 1,
        },
        {
          id: 'ev-telemetry-3',
          type: 'question_viewed',
          lessonId: 'lesson-math-01',
          subjectId: 'math',
          timestamp: now,
          schemaVersion: 1,
        },
        {
          id: 'ev-meaningful-1',
          type: 'assessment_completed',
          lessonId: 'lesson-math-08',
          subjectId: 'math',
          timestamp: now,
          schemaVersion: 1,
        },
        {
          id: 'ev-meaningful-2',
          type: 'lesson_opened',
          lessonId: 'lesson-math-01',
          subjectId: 'math',
          timestamp: now,
          schemaVersion: 1,
        },
      ]

      localStorage.setItem(LEARNING_EVENTS_STORAGE_KEY, JSON.stringify(events))

      const activities = selectRecentLearningActivities()
      expect(activities.length).toBe(2)
      expect(activities.some((a) => a.action.includes('hoàn thành bài tập thu hoạch'))).toBe(true)
      expect(activities.some((a) => a.action.includes('bắt đầu học'))).toBe(true)
      // Telemetry must not appear
      expect(activities.some((a) => a.action.includes('window'))).toBe(false)
      expect(activities.some((a) => a.action.includes('answer'))).toBe(false)
    })
  })

  describe('Assessment Performance & Attempt Tracking', () => {
    it('computes latestScore, bestScore, and attemptCount correctly', () => {
      const attempts: LearningAttempt[] = [
        {
          id: 'atm-1',
          learnerId: 'stu-1',
          lessonId: 'lesson-math-08',
          subjectId: 'math',
          chapterId: 'math-chap-1',
          assessmentId: 'asm-math-08',
          attemptNumber: 1,
          status: 'completed',
          progressMeasure: 1,
          completionStatus: 'completed',
          successStatus: 'passed',
          scoreRaw: 2,
          scoreMin: 0,
          scoreMax: 3,
          scoreScaled: 0.67,
          sessionTimeMs: 120000,
          currentQuestionId: 'q-1',
          startedAt: new Date(Date.now() - 3600000).toISOString(),
          lastActivityAt: new Date(Date.now() - 3500000).toISOString(),
          responses: {},
          events: [],
        },
        {
          id: 'atm-2',
          learnerId: 'stu-1',
          lessonId: 'lesson-math-08',
          subjectId: 'math',
          chapterId: 'math-chap-1',
          assessmentId: 'asm-math-08',
          attemptNumber: 2,
          status: 'completed',
          progressMeasure: 1,
          completionStatus: 'completed',
          successStatus: 'passed',
          scoreRaw: 3,
          scoreMin: 0,
          scoreMax: 3,
          scoreScaled: 1.0,
          sessionTimeMs: 150000,
          currentQuestionId: 'q-1',
          startedAt: new Date(Date.now() - 1800000).toISOString(),
          lastActivityAt: new Date(Date.now() - 1700000).toISOString(),
          responses: {},
          events: [],
        },
      ]

      localStorage.setItem(ASSESSMENT_ATTEMPTS_STORAGE_KEY, JSON.stringify(attempts))

      const lesson = selectLessonLearningState('lesson-math-08')
      expect(lesson).toBeDefined()
      expect(lesson?.attemptCount).toBe(2)
      expect(lesson?.latestScore).toBe(100)
      expect(lesson?.bestScore).toBe(100)
      expect(lesson?.totalLearningTimeMs).toBe(270000)
    })
  })

  describe('Local Date Formatting Helper', () => {
    it('returns YYYY-MM-DD corresponding to browser local date', () => {
      const d = new Date(2026, 9, 26, 23, 45, 0) // Oct 26, 2026
      expect(getLocalDateKey(d)).toBe('2026-10-26')
    })
  })
})

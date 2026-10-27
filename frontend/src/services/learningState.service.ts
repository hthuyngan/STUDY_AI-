import { mockSubjectDetails, mockSubjectsSummary } from '@/data/subjects.mock'
import type { LearningAttempt, LearningEvent, LessonProgressState } from '@/types/assessment'
import type { ContinueLessonItem, RecentActivityItem } from '@/types/dashboard'
import type {
  ChapterLearningState,
  DailyActivityPoint,
  LearningStateSnapshot,
  LessonLearningState,
  StreakState,
  SubjectLearningState,
  WeeklyActivityState,
} from '@/types/learningState'

import { LEARNING_STATE_CHANGED_EVENT, notifyLearningStateChanged } from './learningStateEvents'
export { LEARNING_STATE_CHANGED_EVENT, notifyLearningStateChanged }



/**
 * Extract 'YYYY-MM-DD' formatted date string in local browser calendar timezone.
 */
export function getLocalDateKey(dateInput: Date | string | number): string {
  const d = new Date(dateInput)
  if (Number.isNaN(d.getTime())) {
    const today = new Date()
    return `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`
  }
  const year = d.getFullYear()
  const month = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

/**
 * Format timestamp into human-readable Vietnamese time-ago string.
 */
export function formatTimeAgo(dateInput: Date | string | number): string {
  const date = new Date(dateInput)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()

  if (diffMs < 0 || diffMs < 60000) return 'Vừa xong'

  const diffMins = Math.floor(diffMs / 60000)
  if (diffMins < 60) return `${diffMins} phút trước`

  const todayKey = getLocalDateKey(now)
  const dateKey = getLocalDateKey(date)

  if (todayKey === dateKey) {
    const hours = String(date.getHours()).padStart(2, '0')
    const mins = String(date.getMinutes()).padStart(2, '0')
    return `${hours}:${mins}`
  }

  const yesterday = new Date(now)
  yesterday.setDate(yesterday.getDate() - 1)
  if (getLocalDateKey(yesterday) === dateKey) {
    return 'Hôm qua'
  }

  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))
  if (diffDays > 1 && diffDays <= 7) {
    return `${diffDays} ngày trước`
  }

  const day = String(date.getDate()).padStart(2, '0')
  const month = String(date.getMonth() + 1).padStart(2, '0')
  return `${day}/${month}`
}

import {
  learningProgressRepository,
  assessmentAttemptRepository,
  learningEventsRepository,
} from '@/repositories'

function getStoredProgressMap(): Record<string, LessonProgressState> {
  return learningProgressRepository.getAll()
}

function getStoredAttemptsList(): LearningAttempt[] {
  return assessmentAttemptRepository.getAll()
}

function getStoredEventsList(): LearningEvent[] {
  return learningEventsRepository.getAll()
}

/**
 * Core engine builder: pure derivation function from existing storage & curriculum baseline.
 */
export function buildLearningStateSnapshot(): LearningStateSnapshot {
  const nowIso = new Date().toISOString()
  const progressMap = getStoredProgressMap()
  const attempts = getStoredAttemptsList()
  const events = getStoredEventsList()

  const lessons: Record<string, LessonLearningState> = {}
  const chapters: Record<string, ChapterLearningState> = {}
  const subjects: Record<string, SubjectLearningState> = {}

  let totalCompletedLessons = 0
  let totalInProgressLessons = 0
  let totalLessonsOverall = 0
  let globalLatestActivityAt: string | undefined
  let globalLatestLessonId: string | undefined
  let globalLatestSubjectId: string | undefined

  // Meaningful active dates set for Streak
  const activeDatesSet = new Set<string>()

  // 1. Process all subjects and chapters in curriculum
  const subjectIds = Object.keys(mockSubjectDetails)

  for (const subjectId of subjectIds) {
    const subjectDetail = mockSubjectDetails[subjectId]
    const summary = mockSubjectsSummary.find((s) => s.id === subjectId)

    const subjectLessonStates: LessonLearningState[] = []
    let subjectLatestActivity: string | undefined
    let subjectActiveLessonId: string | undefined
    let subjectActiveChapterId: string | undefined

    for (const chapter of subjectDetail.chapters) {
      const chapterLessons: LessonLearningState[] = []
      let chapterLatestActivity: string | undefined

      for (const curLesson of chapter.lessons) {
        totalLessonsOverall += 1
        const lessonProgress = progressMap[curLesson.id]
        const lessonAttempts = attempts.filter((a) => a.lessonId === curLesson.id)

        const overallProgress = lessonProgress?.overallProgress ?? 0
        const contentProgress = lessonProgress?.contentProgress ?? 0

        let status: 'not-started' | 'in-progress' | 'completed' | 'locked'
        if (overallProgress === 100) {
          status = 'completed'
          totalCompletedLessons += 1
        } else if (overallProgress > 0) {
          status = 'in-progress'
          totalInProgressLessons += 1
        } else if (curLesson.status === 'locked') {
          status = 'locked'
        } else {
          status = 'not-started'
        }

        // Attempt score statistics
        const completedAttempts = lessonAttempts.filter((a) => a.status === 'completed')
        const sortedCompleted = [...completedAttempts].sort(
          (a, b) => b.attemptNumber - a.attemptNumber
        )
        const latestAttempt = sortedCompleted[0]
        const latestScore = latestAttempt ? Math.round(latestAttempt.scoreScaled * 100) : undefined

        let bestScore: number | undefined
        if (completedAttempts.length > 0) {
          bestScore = Math.max(
            ...completedAttempts.map((a) => Math.round(a.scoreScaled * 100))
          )
        }

        const totalLearningTimeMs = lessonAttempts.reduce(
          (acc, a) => acc + (a.sessionTimeMs || 0),
          0
        )

        // Activity timestamps
        const lastActivityAt =
          lessonProgress?.updatedAt ||
          lessonAttempts[lessonAttempts.length - 1]?.lastActivityAt ||
          lessonAttempts[lessonAttempts.length - 1]?.startedAt ||
          nowIso

        if (overallProgress > 0 || lessonAttempts.length > 0) {
          activeDatesSet.add(getLocalDateKey(lastActivityAt))
        }

        if (
          !globalLatestActivityAt ||
          new Date(lastActivityAt).getTime() > new Date(globalLatestActivityAt).getTime()
        ) {
          if (overallProgress > 0) {
            globalLatestActivityAt = lastActivityAt
            globalLatestLessonId = curLesson.id
            globalLatestSubjectId = subjectId
          }
        }

        if (
          !chapterLatestActivity ||
          new Date(lastActivityAt).getTime() > new Date(chapterLatestActivity).getTime()
        ) {
          chapterLatestActivity = lastActivityAt
        }

        if (
          !subjectLatestActivity ||
          new Date(lastActivityAt).getTime() > new Date(subjectLatestActivity).getTime()
        ) {
          subjectLatestActivity = lastActivityAt
        }

        if (overallProgress > 0 && overallProgress < 100) {
          subjectActiveLessonId = curLesson.id
          subjectActiveChapterId = chapter.id
        }

        const lessonState: LessonLearningState = {
          lessonId: curLesson.id,
          subjectId,
          chapterId: chapter.id,
          title: curLesson.title,
          overallProgress,
          contentProgress,
          status,
          lastActivityAt,
          completedAt: overallProgress === 100 ? lastActivityAt : undefined,
          assessmentStatus: lessonProgress?.assessmentStatus || 'not-attempted',
          latestScore,
          bestScore,
          attemptCount: lessonAttempts.length,
          totalLearningTimeMs,
        }

        lessons[curLesson.id] = lessonState
        chapterLessons.push(lessonState)
        subjectLessonStates.push(lessonState)
      }

      // Calculate chapter state: arithmetic average of lessons in chapter
      const chapterTotal = chapterLessons.length
      const chapterSumProgress = chapterLessons.reduce((acc, l) => acc + l.overallProgress, 0)
      const chapterAvgProgress =
        chapterTotal > 0 ? Math.round(chapterSumProgress / chapterTotal) : 0
      const chapterStarted = chapterLessons.filter((l) => l.overallProgress > 0).length
      const chapterCompleted = chapterLessons.filter((l) => l.overallProgress === 100).length

      chapters[chapter.id] = {
        chapterId: chapter.id,
        subjectId,
        title: chapter.title,
        lessonCount: chapterTotal,
        startedLessons: chapterStarted,
        completedLessons: chapterCompleted,
        progress: chapterAvgProgress,
        lastActivityAt: chapterLatestActivity,
      }
    }

    // Calculate subject state: arithmetic average of all lessons across all chapters in subject
    const subjectTotalLessons = subjectLessonStates.length
    const subjectSumProgress = subjectLessonStates.reduce((acc, l) => acc + l.overallProgress, 0)
    const subjectAvgProgress =
      subjectTotalLessons > 0 ? Math.round(subjectSumProgress / subjectTotalLessons) : 0
    const subjectStartedLessons = subjectLessonStates.filter((l) => l.overallProgress > 0).length
    const subjectCompletedLessons = subjectLessonStates.filter(
      (l) => l.overallProgress === 100
    ).length

    subjects[subjectId] = {
      id: subjectId,
      name: summary?.name || subjectDetail.name,
      icon: summary?.icon || subjectDetail.icon || '📚',
      color: summary?.color || subjectDetail.color || 'var(--color-primary)',
      bgColor: summary?.bgColor || subjectDetail.bgColor || 'var(--color-primary-light)',
      progress: subjectAvgProgress,
      completedLessons: subjectCompletedLessons,
      totalLessons: subjectTotalLessons,
      startedLessons: subjectStartedLessons,
      lastActivityAt: subjectLatestActivity,
      currentLessonId: subjectActiveLessonId || subjectLessonStates[0]?.lessonId,
      currentChapterId: subjectActiveChapterId || subjectDetail.chapters[0]?.id,
    }
  }

  // 2. Add dates from learning events for streak
  for (const ev of events) {
    if (
      ev.type === 'lesson_section_completed' ||
      ev.type === 'assessment_started' ||
      ev.type === 'assessment_submitted' ||
      ev.type === 'assessment_completed'
    ) {
      activeDatesSet.add(getLocalDateKey(ev.timestamp))
    }
  }

  // 3. Derive Continue Learning (lessons in-progress 0 < progress < 100, sorted by lastActivityAt DESC, limit 3)
  const inProgressList = Object.values(lessons)
    .filter((l) => l.overallProgress > 0 && l.overallProgress < 100)
    .sort((a, b) => new Date(b.lastActivityAt).getTime() - new Date(a.lastActivityAt).getTime())
    .slice(0, 3)

  const continueLearning: ContinueLessonItem[] = inProgressList.map((l, index) => {
    const subj = subjects[l.subjectId]
    const chap = chapters[l.chapterId]
    return {
      id: l.lessonId,
      subjectId: l.subjectId,
      subjectName: subj?.name || 'Môn học',
      subjectColor: subj?.color || 'var(--color-primary)',
      subjectBg: subj?.bgColor || 'var(--color-primary-light)',
      subjectIcon: subj?.icon || '📖',
      chapter: chap?.title || 'Chương học',
      lessonTitle: l.title,
      progress: l.overallProgress,
      durationMinutes: 45,
      lastActive: formatTimeAgo(l.lastActivityAt),
      isPrimary: index === 0,
    }
  })

  // 4. Derive Streak
  const todayKey = getLocalDateKey(new Date())
  const yesterdayKey = getLocalDateKey(new Date(Date.now() - 86400000))
  const isTodayActive = activeDatesSet.has(todayKey)
  const isYesterdayActive = activeDatesSet.has(yesterdayKey)

  const sortedDates = Array.from(activeDatesSet).sort()
  let currentStreak = 0
  let longestStreak = 0

  if (isTodayActive || isYesterdayActive) {
    let checkDate = isTodayActive ? new Date() : new Date(Date.now() - 86400000)
    while (activeDatesSet.has(getLocalDateKey(checkDate))) {
      currentStreak += 1
      checkDate = new Date(checkDate.getTime() - 86400000)
    }
  }

  // Compute longest streak across all recorded history
  let tempStreak = 0
  let prevDateMs: number | null = null

  for (const dKey of sortedDates) {
    const [y, m, d] = dKey.split('-').map(Number)
    const currentMs = new Date(y, m - 1, d).getTime()

    if (prevDateMs === null) {
      tempStreak = 1
    } else {
      const diffDays = Math.round((currentMs - prevDateMs) / (1000 * 60 * 60 * 24))
      if (diffDays === 1) {
        tempStreak += 1
      } else if (diffDays > 1) {
        tempStreak = 1
      }
    }
    prevDateMs = currentMs
    if (tempStreak > longestStreak) {
      longestStreak = tempStreak
    }
  }

  if (currentStreak > longestStreak) {
    longestStreak = currentStreak
  }

  const streak: StreakState = {
    current: currentStreak,
    longest: longestStreak,
    activeDates: sortedDates,
    isTodayActive,
  }

  // 5. Derive Weekly Activity
  const dayNames = [
    { day: 'T2', fullDay: 'Thứ Hai' },
    { day: 'T3', fullDay: 'Thứ Ba' },
    { day: 'T4', fullDay: 'Thứ Tư' },
    { day: 'T5', fullDay: 'Thứ Năm' },
    { day: 'T6', fullDay: 'Thứ Sáu' },
    { day: 'T7', fullDay: 'Thứ Bảy' },
    { day: 'CN', fullDay: 'Chủ Nhật' },
  ]

  // Construct current week (Monday to Sunday)
  const today = new Date()
  const dayOfWeek = today.getDay() // 0 = Sun, 1 = Mon...
  const distanceToMonday = (dayOfWeek + 6) % 7
  const monday = new Date(today)
  monday.setDate(today.getDate() - distanceToMonday)
  monday.setHours(0, 0, 0, 0)

  let weeklyTotalMinutes = 0
  const points: DailyActivityPoint[] = dayNames.map((dInfo, idx) => {
    const d = new Date(monday)
    d.setDate(monday.getDate() + idx)
    const dateKey = getLocalDateKey(d)

    // Calculate active minutes on this day from attempts + lesson dwell events
    const dayAttempts = attempts.filter((a) => getLocalDateKey(a.lastActivityAt || a.startedAt) === dateKey)
    const attemptMins = dayAttempts.reduce((acc, a) => acc + Math.round((a.sessionTimeMs || 0) / 60000), 0)

    // Completed sections or events on this day
    const dayEvents = events.filter((e) => getLocalDateKey(e.timestamp) === dateKey)
    const sectionMins = dayEvents.filter((e) => e.type === 'lesson_section_completed').length * 4

    const totalDayMins = attemptMins + sectionMins
    weeklyTotalMinutes += totalDayMins

    const lessonsCount = Object.values(lessons).filter(
      (l) => getLocalDateKey(l.lastActivityAt) === dateKey && l.overallProgress > 0
    ).length

    return {
      day: dInfo.day,
      fullDay: dInfo.fullDay,
      date: dateKey,
      minutes: totalDayMins,
      lessons: lessonsCount,
    }
  })

  const weeklyHours = Math.round((weeklyTotalMinutes / 60) * 10) / 10

  const weeklyActivity: WeeklyActivityState = {
    points,
    totalMinutes: weeklyTotalMinutes,
    weeklyHours,
    increasePercent: weeklyTotalMinutes > 0 ? 12 : 0,
  }

  // 6. Derive Meaningful Recent Activities (filter out raw telemetry)
  const meaningfulEventTypes = new Set([
    'lesson_opened',
    'lesson_section_completed',
    'assessment_submitted',
    'assessment_completed',
  ])

  const meaningfulEvents = events
    .filter((e) => meaningfulEventTypes.has(e.type))
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
    .slice(0, 5)

  const recentActivities: RecentActivityItem[] = []

  if (meaningfulEvents.length > 0) {
    meaningfulEvents.forEach((ev) => {
      const lesson = lessons[ev.lessonId]
      const subj = subjects[ev.subjectId]

      let actionText = 'học bài'
      if (ev.type === 'lesson_opened') {
        actionText = 'bắt đầu học'
      } else if (ev.type === 'lesson_section_completed') {
        actionText = 'hoàn thành phần học'
      } else if (ev.type === 'assessment_submitted' || ev.type === 'assessment_completed') {
        actionText = 'hoàn thành bài tập thu hoạch'
      }

      recentActivities.push({
        id: ev.id,
        userAvatar:
          'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
        userName: 'Ngân',
        action: actionText,
        targetName: lesson?.title || 'Bài học',
        targetUrl: `/subjects/${ev.subjectId}/lessons/${ev.lessonId}`,
        subjectOrModule: subj?.name || 'Chương trình',
        timeAgo: formatTimeAgo(ev.timestamp),
      })
    })
  } else if (totalCompletedLessons > 0 || totalInProgressLessons > 0) {
    // If events were capped or empty, derive from active lessons
    const activeLessons = Object.values(lessons)
      .filter((l) => l.overallProgress > 0)
      .sort((a, b) => new Date(b.lastActivityAt).getTime() - new Date(a.lastActivityAt).getTime())
      .slice(0, 5)

    activeLessons.forEach((l) => {
      const subj = subjects[l.subjectId]
      recentActivities.push({
        id: `act_${l.lessonId}`,
        userAvatar:
          'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
        userName: 'Ngân',
        action: l.overallProgress === 100 ? 'hoàn thành bài học' : 'đang học bài',
        targetName: l.title,
        targetUrl: `/subjects/${l.subjectId}/lessons/${l.lessonId}`,
        subjectOrModule: subj?.name || 'Toán 12',
        timeAgo: formatTimeAgo(l.lastActivityAt),
      })
    })
  }

  // 7. Calculate XP and Summary
  const totalXP = totalCompletedLessons * 60 + totalInProgressLessons * 15

  const snapshot: LearningStateSnapshot = {
    generatedAt: nowIso,
    lessons,
    chapters,
    subjects,
    continueLearning,
    recentActivities,
    streak,
    weeklyActivity,
    summary: {
      totalLessons: totalLessonsOverall,
      completedLessons: totalCompletedLessons,
      inProgressLessons: totalInProgressLessons,
      totalXP,
      lastAccessedLessonId: globalLatestLessonId,
      lastAccessedSubjectId: globalLatestSubjectId,
    },
  }

  return snapshot
}

// ============================================================
// SELECTORS
// ============================================================

export function selectLessonLearningState(
  lessonId: string,
  snapshot = buildLearningStateSnapshot()
): LessonLearningState | null {
  return snapshot.lessons[lessonId] || null
}

export function selectChapterLearningState(
  chapterId: string,
  snapshot = buildLearningStateSnapshot()
): ChapterLearningState | null {
  return snapshot.chapters[chapterId] || null
}

export function selectSubjectLearningState(
  subjectId: string,
  snapshot = buildLearningStateSnapshot()
): SubjectLearningState | null {
  return snapshot.subjects[subjectId] || null
}

export function selectContinueLearningLessons(
  limit = 3,
  snapshot = buildLearningStateSnapshot()
): ContinueLessonItem[] {
  return snapshot.continueLearning.slice(0, limit)
}

export function selectRecentLearningActivities(
  limit = 5,
  snapshot = buildLearningStateSnapshot()
): RecentActivityItem[] {
  return snapshot.recentActivities.slice(0, limit)
}

export function selectStreakState(snapshot = buildLearningStateSnapshot()): StreakState {
  return snapshot.streak
}

export function selectWeeklyActivity(
  snapshot = buildLearningStateSnapshot()
): WeeklyActivityState {
  return snapshot.weeklyActivity
}

export function selectAssessmentPerformanceBySubject(
  subjectId: string,
  snapshot = buildLearningStateSnapshot()
): { completedCount: number; averageScore: number } {
  const subjectLessons = Object.values(snapshot.lessons).filter((l) => l.subjectId === subjectId)
  const withScore = subjectLessons.filter((l) => typeof l.latestScore === 'number')
  const sumScore = withScore.reduce((acc, l) => acc + (l.latestScore || 0), 0)
  return {
    completedCount: withScore.length,
    averageScore: withScore.length > 0 ? Math.round(sumScore / withScore.length) : 0,
  }
}

/**
 * Developer and testing utility to wipe all local learner state.
 */
export function resetLearningStateForTests(): void {
  if (typeof window !== 'undefined') {
    localStorage.clear()
    notifyLearningStateChanged()
  }
}

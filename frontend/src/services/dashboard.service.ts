import { apiClient } from '@/lib/apiClient'
import { getAuthUser } from '@/auth/authSession'
import { mockDashboardData } from '@/data/dashboard.mock'
import { buildLearningStateSnapshot } from '@/services/learningState.service'
import type { DailyGoalItem, DashboardData, SubjectProgressItemData } from '@/types/dashboard'

export interface DashboardFetchOptions {
  simulateEmpty?: boolean
  simulateError?: boolean
  delayMs?: number
}

interface ServerDashboardStats {
  completedLessons: number
  totalQuestionsPracticed: number
  totalCorrectAnswers: number
  accuracyRate: number
  streakDays: number
  totalMistakes: number
  dueReviewsCount: number
  subjectProgress: Array<{
    subjectId: string
    subjectName: string
    completedLessons: number
    totalLessons: number
    questionsPracticed: number
    accuracyRate: number
    progressPercent: number
  }>
  recentAttempts: Array<{
    attemptId: string
    subjectId: string
    mode: string
    scoreScaled: number
    totalQuestions: number
    correctCount: number
    completedAt: string
  }>
}

export async function fetchDashboardData(
  options: DashboardFetchOptions = {}
): Promise<DashboardData | null> {
  const { simulateEmpty = false, simulateError = false, delayMs = 0 } = options

  if (delayMs > 0) {
    await new Promise((resolve) => setTimeout(resolve, delayMs))
  }

  if (simulateError) {
    throw new Error('Không thể tải dữ liệu bảng điều khiển. Vui lòng thử lại.')
  }

  if (simulateEmpty) {
    return null
  }

  const base = mockDashboardData
  const learning = buildLearningStateSnapshot()

  let serverStats: ServerDashboardStats | null = null
  try {
    serverStats = await apiClient.get<ServerDashboardStats>('/api/v1/practice/dashboard-stats')
  } catch {
    // Graceful fallback to client-derived state when offline
    serverStats = null
  }

  // Map subjects with real derived learning progress or server stats
  const subjects: SubjectProgressItemData[] = (base.subjects || []).map(
    (baseSubj: SubjectProgressItemData) => {
      if (serverStats?.subjectProgress) {
        const serverSubj = serverStats.subjectProgress.find((s) => s.subjectId === baseSubj.id)
        if (serverSubj) {
          return {
            ...baseSubj,
            progress: Math.round(serverSubj.progressPercent),
            completedLessons: serverSubj.completedLessons,
            totalLessons: serverSubj.totalLessons || baseSubj.totalLessons,
          }
        }
      }

      const derived = learning.subjects[baseSubj.id]
      if (!derived) return baseSubj
      return {
        ...baseSubj,
        progress: derived.progress,
        completedLessons: derived.completedLessons,
        totalLessons: derived.totalLessons,
      }
    }
  )

  // Dynamic daily goal: "Học một bài học mới"
  const lastPoint = learning.weeklyActivity.points[learning.weeklyActivity.points.length - 1]
  const todayLessons = (serverStats ? serverStats.completedLessons : (lastPoint?.lessons || 0))
  const dailyGoals = {
    ...base.dailyGoals,
    items: base.dailyGoals.items.map((g: DailyGoalItem) => {
      if (g.id === 'goal-1') {
        const completed = todayLessons >= 1
        return {
          ...g,
          current: Math.min(g.target, todayLessons),
          completed,
        }
      }
      return g
    }),
  }

  const streakDays = serverStats ? serverStats.streakDays : learning.streak.current
  const completedLessonsCount = serverStats ? serverStats.completedLessons : learning.summary.completedLessons

  const authUser = getAuthUser()
  const user = authUser
    ? {
        id: authUser.id,
        name: authUser.displayName || 'Học viên',
        greetingName: (authUser.displayName || 'Bạn').split(' ').pop() || 'Bạn',
        avatar: base.user.avatar,
        grade: authUser.grade ? `Lớp ${authUser.grade}` : base.user.grade,
      }
    : base.user

  // Merge static demo base with real learner state
  return {
    ...base,
    user,
    stats: {
      ...base.stats,
      streakDays,
      longestStreak: Math.max(streakDays, learning.streak.longest),
      weeklyMinutes: learning.weeklyActivity.totalMinutes,
      completedLessonsCount,
    },
    activity: {
      ...base.activity,
      points: learning.weeklyActivity.points,
      weeklyHours: learning.weeklyActivity.weeklyHours,
      increasePercent: learning.weeklyActivity.increasePercent,
    },
    dailyGoals,
    continueLessons: learning.continueLearning,
    subjects,
    recentActivities: learning.recentActivities,
  }
}

import { mockDashboardData } from '@/data/dashboard.mock'
import { buildLearningStateSnapshot } from '@/services/learningState.service'
import type { DailyGoalItem, DashboardData, SubjectProgressItemData } from '@/types/dashboard'

export interface DashboardFetchOptions {
  simulateEmpty?: boolean
  simulateError?: boolean
  delayMs?: number
}

export async function fetchDashboardData(
  options: DashboardFetchOptions = {}
): Promise<DashboardData | null> {
  const { simulateEmpty = false, simulateError = false, delayMs = 300 } = options

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

  // Map subjects with real derived learning progress
  const subjects: SubjectProgressItemData[] = (base.subjects || []).map(
    (baseSubj: SubjectProgressItemData) => {
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
  // Check if today has completed any lesson
  const lastPoint = learning.weeklyActivity.points[learning.weeklyActivity.points.length - 1]
  const todayLessons = lastPoint?.lessons || 0
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

  // Merge static demo base with real derived learner state
  return {
    ...base,
    stats: {
      ...base.stats,
      streakDays: learning.streak.current,
      longestStreak: learning.streak.longest,
      weeklyMinutes: learning.weeklyActivity.totalMinutes,
      completedLessonsCount: learning.summary.completedLessons,
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

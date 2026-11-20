import { apiClient } from '@/lib/apiClient'
import { getAuthUser } from '@/auth/authSession'
import { mockDashboardData } from '@/data/dashboard.mock'
import { buildLearningStateSnapshot } from '@/services/learningState.service'
import type { DailyGoalItem, DashboardData, RecentActivityItem, SubjectProgressItemData } from '@/types/dashboard'

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
  const authUser = getAuthUser()

  let serverStats: ServerDashboardStats | null = null
  if (authUser) {
    try {
      serverStats = await apiClient.get<ServerDashboardStats>('/api/v1/practice/dashboard-stats')
    } catch {
      throw new Error('Không thể tải dữ liệu bảng điều khiển từ máy chủ. Vui lòng thử lại.')
    }
  }

  // Map subjects with authoritative server stats or fallback demo
  const subjects: SubjectProgressItemData[] = serverStats?.subjectProgress && serverStats.subjectProgress.length > 0
    ? serverStats.subjectProgress.map((sp) => ({
        id: sp.subjectId,
        name: sp.subjectName,
        icon: sp.subjectId.includes('math') ? '📐' : '📚',
        color: sp.subjectId.includes('math') ? '#3b82f6' : '#10b981',
        bgColor: sp.subjectId.includes('math') ? '#eff6ff' : '#ecfdf5',
        progress: Math.round(sp.progressPercent),
        completedLessons: sp.completedLessons,
        totalLessons: sp.totalLessons,
      }))
    : (base.subjects || []).map((baseSubj: SubjectProgressItemData) => {
        const derived = learning.subjects[baseSubj.id]
        if (!derived) return baseSubj
        return {
          ...baseSubj,
          progress: derived.progress,
          completedLessons: derived.completedLessons,
          totalLessons: derived.totalLessons,
        }
      })

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

  const user = authUser
    ? {
        id: authUser.id,
        name: authUser.displayName || 'Học viên',
        greetingName: (authUser.displayName || 'Bạn').split(' ').pop() || 'Bạn',
        avatar: base.user.avatar,
        grade: authUser.grade ? `Lớp ${authUser.grade}` : base.user.grade,
      }
    : base.user

  const recentActivities: RecentActivityItem[] = serverStats
    ? serverStats.recentAttempts.map((a) => ({
        id: a.attemptId,
        userAvatar: user.avatar,
        userName: user.name,
        action: a.mode === 'exam' ? 'tham gia thi thử' : 'hoàn thành luyện tập',
        targetName: a.subjectId === 'sub_math10' ? 'Toán 10' : a.subjectId === 'sub_math11' ? 'Toán 11' : 'Toán 12',
        targetUrl: `/practice/hub?subjectId=${a.subjectId}`,
        subjectOrModule: a.subjectId === 'sub_math10' ? 'Toán 10' : a.subjectId === 'sub_math11' ? 'Toán 11' : 'Toán 12',
        timeAgo: a.completedAt ? new Date(a.completedAt).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }) : 'Vừa xong',
      }))
    : (learning.recentActivities as RecentActivityItem[])

  // Merge authoritative data with layout base
  return {
    ...base,
    user,
    stats: {
      ...base.stats,
      streakDays,
      longestStreak: Math.max(streakDays, learning.streak.longest),
      weeklyMinutes: serverStats ? serverStats.totalQuestionsPracticed * 2 : learning.weeklyActivity.totalMinutes,
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
    recentActivities,
  }
}

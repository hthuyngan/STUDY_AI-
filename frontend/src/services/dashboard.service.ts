import { apiClient } from '@/lib/apiClient'
import { getAuthUser } from '@/auth/authSession'
import type {
  ActivityDataPoint,
  ContinueLessonItem,
  DailyGoalsData,
  DashboardData,
  LeaderboardUser,
  RecentActivityItem,
  SubjectProgressItemData,
} from '@/types/dashboard'

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
  totalStudyMinutes?: number
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

  const authUser = getAuthUser()

  if (!authUser) {
    return {
      user: {
        id: 'guest',
        name: 'Khách',
        greetingName: 'Bạn',
        avatar: '',
        grade: '',
      },
      stats: {
        streakDays: 0,
        longestStreak: 0,
        totalXP: 0,
        weeklyMinutes: 0,
        completedLessonsCount: 0,
      },
      activity: {
        points: [],
        weeklyHours: 0,
        increasePercent: 0,
      },
      dailyGoals: {
        bonusXP: 0,
        items: [],
      },
      continueLessons: [],
      subjects: [
        { id: 'sub_math10', name: 'Toán 10', icon: '📐', color: '#3b82f6', bgColor: '#eff6ff', progress: 0, completedLessons: 0, totalLessons: 0 },
        { id: 'sub_math11', name: 'Toán 11', icon: '📐', color: '#3b82f6', bgColor: '#eff6ff', progress: 0, completedLessons: 0, totalLessons: 0 },
        { id: 'sub_math12', name: 'Toán 12', icon: '📐', color: '#3b82f6', bgColor: '#eff6ff', progress: 0, completedLessons: 0, totalLessons: 0 },
      ],
      recentActivities: [],
      leaderboard: [],
    }
  }

  let serverStats: ServerDashboardStats | null = null
  try {
    serverStats = await apiClient.get<ServerDashboardStats>('/api/v1/practice/dashboard-stats')
  } catch {
    throw new Error('Không thể tải dữ liệu bảng điều khiển từ máy chủ. Vui lòng thử lại.')
  }

  // Map subjects with authoritative server stats or truthful empty state
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
    : []

  const dailyGoals: DailyGoalsData = {
    bonusXP: 0,
    items: [],
  }

  const streakDays = serverStats ? serverStats.streakDays : 0
  const completedLessonsCount = serverStats ? serverStats.completedLessons : 0
  const weeklyMinutes = serverStats?.totalStudyMinutes ?? 0

  const user = {
    id: authUser.id,
    name: authUser.displayName || 'Học viên',
    greetingName: (authUser.displayName || 'Bạn').split(' ').pop() || 'Bạn',
    avatar: '',
    grade: authUser.grade ? `Lớp ${authUser.grade}` : 'Chưa cập nhật',
  }

  const recentActivities: RecentActivityItem[] = serverStats?.recentAttempts
    ? serverStats.recentAttempts.map((a) => ({
        id: a.attemptId,
        userAvatar: user.avatar,
        userName: user.name,
        action: a.mode === 'Thi thử' ? 'tham gia thi thử' : 'hoàn thành luyện tập',
        targetName: a.subjectId === 'sub_math10' ? 'Toán 10' : a.subjectId === 'sub_math11' ? 'Toán 11' : 'Toán 12',
        targetUrl: `/practice/hub?subjectId=${a.subjectId}`,
        subjectOrModule: a.subjectId === 'sub_math10' ? 'Toán 10' : a.subjectId === 'sub_math11' ? 'Toán 11' : 'Toán 12',
        timeAgo: a.completedAt ? new Date(a.completedAt).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }) : 'Vừa xong',
      }))
    : []

  const activity = {
    points: (serverStats && serverStats.totalQuestionsPracticed > 0
      ? [{ day: 'Hôm nay', fullDay: 'Hôm nay', minutes: weeklyMinutes, lessons: completedLessonsCount }]
      : []) as ActivityDataPoint[],
    weeklyHours: Math.round((weeklyMinutes / 60) * 10) / 10,
    increasePercent: 0,
  }

  const continueLessons: ContinueLessonItem[] = []

  const totalXP = 0
  const leaderboard: LeaderboardUser[] = []

  return {
    user,
    stats: {
      streakDays,
      longestStreak: streakDays,
      totalXP,
      weeklyMinutes,
      completedLessonsCount,
    },
    activity,
    dailyGoals,
    continueLessons,
    subjects,
    recentActivities,
    leaderboard,
  }
}

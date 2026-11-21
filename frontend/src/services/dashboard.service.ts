import { apiClient } from '@/lib/apiClient'
import { getAuthUser } from '@/auth/authSession'
import { mockDashboardData } from '@/data/dashboard.mock'
import { buildLearningStateSnapshot } from '@/services/learningState.service'
import type {
  ActivityDataPoint,
  ContinueLessonItem,
  DailyGoalItem,
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
    : authUser
      ? [
          { id: 'sub_math10', name: 'Toán 10', icon: '📐', color: '#3b82f6', bgColor: '#eff6ff', progress: 0, completedLessons: 0, totalLessons: 1 },
          { id: 'sub_math11', name: 'Toán 11', icon: '📐', color: '#3b82f6', bgColor: '#eff6ff', progress: 0, completedLessons: 0, totalLessons: 1 },
          { id: 'sub_math12', name: 'Toán 12', icon: '📐', color: '#3b82f6', bgColor: '#eff6ff', progress: 0, completedLessons: 0, totalLessons: 3 },
        ]
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
  const dailyGoals: DailyGoalsData = authUser
    ? {
        bonusXP: 0,
        items: [
          {
            id: 'goal-1',
            title: 'Luyện tập bài học mới hôm nay',
            target: 1,
            current: serverStats ? Math.min(1, serverStats.completedLessons) : 0,
            unit: 'bài',
            completed: serverStats ? serverStats.completedLessons >= 1 : false,
          },
        ],
      }
    : {
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
  const weeklyMinutes = serverStats
    ? (serverStats.totalStudyMinutes ?? 0)
    : (authUser ? 0 : learning.weeklyActivity.totalMinutes)

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
        action: a.mode === 'Thi thử' ? 'tham gia thi thử' : 'hoàn thành luyện tập',
        targetName: a.subjectId === 'sub_math10' ? 'Toán 10' : a.subjectId === 'sub_math11' ? 'Toán 11' : 'Toán 12',
        targetUrl: `/practice/hub?subjectId=${a.subjectId}`,
        subjectOrModule: a.subjectId === 'sub_math10' ? 'Toán 10' : a.subjectId === 'sub_math11' ? 'Toán 11' : 'Toán 12',
        timeAgo: a.completedAt ? new Date(a.completedAt).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }) : 'Vừa xong',
      }))
    : (authUser ? [] : (learning.recentActivities as RecentActivityItem[]))

  const activity = authUser
    ? {
        points: (serverStats && serverStats.totalQuestionsPracticed > 0
          ? [{ day: 'Hôm nay', fullDay: 'Hôm nay', minutes: weeklyMinutes, lessons: completedLessonsCount }]
          : []) as ActivityDataPoint[],
        weeklyHours: Math.round((weeklyMinutes / 60) * 10) / 10,
        increasePercent: 0,
      }
    : {
        points: learning.weeklyActivity.points,
        weeklyHours: learning.weeklyActivity.weeklyHours,
        increasePercent: learning.weeklyActivity.increasePercent,
      }

  const continueLessons: ContinueLessonItem[] = authUser
    ? (serverStats?.recentAttempts && serverStats.recentAttempts.length > 0
        ? serverStats.recentAttempts.slice(0, 2).map((a, idx) => ({
            id: a.attemptId,
            subjectId: a.subjectId,
            subjectName: a.subjectId === 'sub_math10' ? 'Toán 10' : a.subjectId === 'sub_math11' ? 'Toán 11' : 'Toán 12',
            subjectColor: '#3b82f6',
            subjectBg: '#eff6ff',
            subjectIcon: 'BookOpen',
            chapter: 'Chương 1',
            lessonTitle: a.subjectId === 'sub_math10' ? 'Toán 10 - Mệnh đề toán học' : a.subjectId === 'sub_math11' ? 'Toán 11 - Giá trị lượng giác' : 'Toán 12 - Ứng dụng đạo hàm',
            progress: Math.round(a.scoreScaled * 10),
            durationMinutes: 15,
            lastActive: a.completedAt || 'Vừa xong',
            isPrimary: idx === 0,
          }))
        : [])
    : learning.continueLearning

  const totalXP = serverStats ? serverStats.totalCorrectAnswers * 10 : 0

  if (authUser && serverStats) {
    const leaderboard: LeaderboardUser[] = [
      {
        rank: 1,
        id: user.id,
        name: user.name,
        avatar: user.avatar,
        xp: totalXP,
        isCurrentUser: true,
      },
    ]

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

  // Fallback for unauthenticated guest demo preview
  return {
    ...base,
    user,
    stats: {
      ...base.stats,
      streakDays,
      longestStreak: Math.max(streakDays, learning.streak.longest),
      weeklyMinutes,
      completedLessonsCount,
    },
    activity,
    dailyGoals,
    continueLessons,
    subjects,
    recentActivities,
  }
}

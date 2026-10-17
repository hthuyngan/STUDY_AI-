// ============================================================
// DASHBOARD TYPES — STUDY_AI
// ============================================================

export interface DashboardStats {
  streakDays: number
  longestStreak: number
  totalXP: number
  weeklyMinutes: number
  completedLessonsCount: number
}

export interface DailyGoalItem {
  id: string
  title: string
  current: number
  target: number
  unit: string
  completed: boolean
  isOverdue?: boolean
}

export interface DailyGoalsData {
  items: DailyGoalItem[]
  bonusXP: number
}

export interface ActivityDataPoint {
  day: string          // 'T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'
  fullDay: string      // 'Thứ 2', 'Thứ 3'...
  minutes: number      // Số phút học
  lessons: number      // Số bài xong
}

export interface ContinueLessonItem {
  id: string
  subjectId: string
  subjectName: string
  subjectColor: string
  subjectBg: string
  subjectIcon: string
  chapter: string
  lessonTitle: string
  progress: number     // 0 - 100
  durationMinutes: number
  lastActive: string
  isPrimary?: boolean
}

export interface SubjectProgressItemData {
  id: string
  name: string
  icon: string
  color: string
  bgColor: string
  progress: number     // 0 - 100
  completedLessons: number
  totalLessons: number
}

export interface RecentActivityItem {
  id: string
  userAvatar: string
  userName: string
  action: string       // "hoàn thành", "đạt 80 XP từ", "hỏi AI về"
  targetName: string   // "Bài 8 · Khảo sát hàm số"
  targetUrl?: string
  subjectOrModule: string // "Toán 12", "Quiz Điện học", "AI Tutor"
  timeAgo: string      // "20:14", "18:42", "Hôm qua"
}

export interface LeaderboardUser {
  rank: number
  id: string
  name: string
  avatar: string
  xp: number
  isCurrentUser?: boolean
}

// ── Learning Home Redesign Types ──────────────────────────────
export interface DashboardSubject {
  id: string
  name: string
  slug: string
  lessonCount: number
  icon: 'calculator' | 'atom' | 'flask' | 'book'
  colorVar?: string
}

export interface RecommendedLesson {
  id: string
  title: string
  subject: string
  duration: string
  category: 'lesson' | 'quiz' | 'ai-practice'
  tag?: string
  url: string
}

export interface WeeklyGoalDay {
  dayLabel: string     // 'T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'
  completed: boolean
  isToday?: boolean
}

export interface WeeklyGoalData {
  completedDays: number
  totalDays: number
  days: WeeklyGoalDay[]
}

export interface DashboardProgressData {
  completedLessons: number
  streakDays: number
  totalXP: number
}

export interface CurrentLessonData {
  id: string
  subject: string
  grade: string
  title: string
  progress: number
  url: string
}

export interface DashboardData {
  user: {
    id: string
    name: string
    greetingName: string
    avatar: string
    grade: string
  }
  stats: DashboardStats
  activity: {
    points: ActivityDataPoint[]
    weeklyHours: number
    increasePercent: number
  }
  dailyGoals: DailyGoalsData
  continueLessons: ContinueLessonItem[]
  subjects: SubjectProgressItemData[]
  recentActivities: RecentActivityItem[]
  leaderboard: LeaderboardUser[]

  // Learning Home fields
  currentLesson?: CurrentLessonData
  exploreSubjects?: DashboardSubject[]
  learningProgress?: DashboardProgressData
  weeklyGoal?: WeeklyGoalData
  recommendations?: RecommendedLesson[]
}

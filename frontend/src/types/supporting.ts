export interface ExerciseItem {
  id: string
  title: string
  subjectId: string
  subjectName: string
  difficulty: 'Nhận biết' | 'Thông hiểu' | 'Vận dụng' | 'Vận dụng cao'
  totalQuestions: number
  completedQuestions: number
  durationMinutes: number
  quizId: string
  status: 'not-started' | 'in-progress' | 'completed'
}

export interface LibraryItem {
  id: string
  title: string
  category: 'Tài liệu' | 'Công thức' | 'Ghi chú' | 'Đã lưu'
  subjectId: string
  subjectName: string
  pagesCount: number
  updatedAt: string
  downloadUrl?: string
  snippet: string
  isSaved?: boolean
}

export interface AchievementItem {
  id: string
  title: string
  description: string
  icon: string
  progress: number
  target: number
  isUnlocked: boolean
  unlockedDate?: string
  xpReward: number
}

export interface UserProfileData {
  id: string
  name: string
  avatar: string
  grade: string
  school: string
  studyGoal: string
  streakDays: number
  totalXP: number
  studyHours: number
  completedLessons: number
  subjectStats: {
    subjectId: string
    name: string
    progress: number
    completedLessons: number
    totalLessons: number
  }[]
}

export interface UserSettingsData {
  theme: 'light' | 'dark' | 'system'
  dailyGoalMinutes: number
  studyReminder: boolean
  streakAlert: boolean
  courseAlert: boolean
  aiResponseStyle: 'concise' | 'balanced' | 'detailed'
}

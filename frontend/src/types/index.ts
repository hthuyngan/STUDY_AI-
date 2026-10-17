// ============================================================
// TYPES — Student & User
// ============================================================

export interface Student {
  id: string
  name: string
  avatar: string
  grade: string        // Lớp, VD: "10A1"
  school: string
  email: string
  joinedAt: string
}

export interface StudyStreak {
  current: number      // số ngày liên tiếp hiện tại
  longest: number      // chuỗi dài nhất từ trước đến nay
  lastStudiedAt: string
}

export interface DailyGoal {
  targetMinutes: number
  completedMinutes: number
  /** phần trăm 0–100 */
  percentage: number
}

// ============================================================
// TYPES — Subjects & Progress
// ============================================================

export type SubjectId =
  | 'math'
  | 'literature'
  | 'english'
  | 'physics'
  | 'chemistry'
  | 'biology'

export interface Subject {
  id: SubjectId
  name: string         // Tên tiếng Việt đầy đủ
  shortName: string    // Tên rút gọn
  icon: string         // emoji hoặc tên icon
  color: string        // CSS color token hoặc hex
  bgColor: string
}

export interface SubjectProgress {
  subjectId: SubjectId
  /** 0–100 */
  progress: number
  totalLessons: number
  completedLessons: number
  /** phút học trong tuần này */
  weeklyMinutes: number
  lastStudiedAt: string
  /** Điểm trung bình bài kiểm tra gần nhất (0–10) */
  avgScore: number | null
}

// ============================================================
// TYPES — Activity & Stats
// ============================================================

export interface DailyActivity {
  date: string         // ISO date "YYYY-MM-DD"
  minutes: number
}

export interface WeeklyStats {
  weekLabel: string    // "Tuần này", "Tuần trước"...
  totalMinutes: number
  avgMinutesPerDay: number
  daysStudied: number
  lessonsCompleted: number
  quizzesCompleted: number
  avgQuizScore: number
}

// ============================================================
// TYPES — Lesson & Topic
// ============================================================

export type LessonStatus = 'completed' | 'in-progress' | 'locked' | 'available'

export interface Lesson {
  id: string
  subjectId: SubjectId
  title: string
  description: string
  durationMinutes: number
  status: LessonStatus
  progress: number     // 0–100, dùng khi status = 'in-progress'
  difficulty: 1 | 2 | 3  // 1=dễ, 2=trung bình, 3=khó
  completedAt?: string
  xp: number
}

export interface Topic {
  id: string
  subjectId: SubjectId
  name: string
  lessons: Lesson[]
  /** 0–100 */
  progress: number
}

// ============================================================
// TYPES — Quiz & Adaptive Test
// ============================================================

export type QuestionType = 'multiple-choice' | 'true-false' | 'fill-blank'

export interface QuizQuestion {
  id: string
  type: QuestionType
  question: string
  options?: string[]
  correctAnswer: string | number
  explanation: string
  difficulty: 1 | 2 | 3
  subjectId: SubjectId
  topic: string
}

export interface QuizAttempt {
  id: string
  subjectId: SubjectId
  topicName: string
  questions: number
  correct: number
  score: number        // 0–10
  timeTakenSeconds: number
  completedAt: string
}

// ============================================================
// TYPES — Achievement
// ============================================================

export type AchievementCategory = 'streak' | 'progress' | 'quiz' | 'time' | 'social'

export interface Achievement {
  id: string
  category: AchievementCategory
  title: string
  description: string
  icon: string
  unlockedAt: string | null   // null = chưa mở khoá
  progress: number             // 0–100, cho loại chưa mở khoá
  xp: number
}

// ============================================================
// TYPES — AI Tutor Message
// ============================================================

export type MessageRole = 'user' | 'assistant'

export interface ChatMessage {
  id: string
  role: MessageRole
  content: string
  timestamp: string
  subjectId?: SubjectId
}

// ============================================================
// TYPES — Learning Path Node
// ============================================================

export type PathNodeStatus = 'completed' | 'current' | 'available' | 'locked'

export interface PathNode {
  id: string
  subjectId: SubjectId
  title: string
  type: 'lesson' | 'quiz' | 'review' | 'boss'
  status: PathNodeStatus
  xp: number
  estimatedMinutes: number
}

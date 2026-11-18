import type { ContentStatus } from './content'

export type { ContentStatus }

export interface CurriculumSubjectItem {
  id: string
  name: string
  code: string
  grade: string
  icon: string
  description: string
  chapterCount: number
  lessonCount: number
  assessmentCount: number
  publishedPercent: number
  status: ContentStatus
  updatedAt: string
}

export interface CurriculumChapterItem {
  id: string
  subjectId: string
  subjectName?: string
  title: string
  description?: string
  order: number
  lessonsCount: number
  status: ContentStatus
  updatedAt: string
}

export interface CurriculumLessonItem {
  id: string
  title: string
  subjectId: string
  subjectName: string
  chapterId: string
  chapterName: string
  topicId?: string
  topicTitle?: string
  status: ContentStatus
  authorName: string
  updatedAt: string
  hasAssessment: boolean
  order?: number
  videos?: CurriculumLessonVideoItem[]
  videoCount?: number
}

export interface CurriculumTopicItem {
  id: string
  chapterId: string
  chapterTitle?: string
  title: string
  description?: string
  orderIndex: number
  isActive: boolean
  lessonCount: number
  createdAt: string
  updatedAt: string
}

export interface CurriculumLessonVideoItem {
  id: string
  lessonId: string
  lessonTitle?: string
  title: string
  description?: string
  provider: string
  sourceUrl: string
  embedUrl?: string | null
  youTubeVideoId?: string | null
  language: string
  durationSeconds?: number | null
  thumbnailUrl?: string | null
  sortOrder: number
  embedAllowed: boolean
  verificationStatus: string
  verifiedAt?: string | null
  isPublished: boolean
  createdAt: string
  updatedAt: string
}

export interface AssessmentOptionItem {
  id: string
  label: string
  text: string
}

export interface AssessmentQuestionItem {
  id: string
  prompt: string
  topic?: string
  options: AssessmentOptionItem[]
  correctOptionId: string
  explanation: string
}

export interface CurriculumAssessmentItem {
  id: string
  lessonId: string
  lessonTitle: string
  subjectId: string
  subjectName: string
  chapterId?: string
  chapterName?: string
  questionCount: number
  passingScore: number
  durationMinutes: number
  status: ContentStatus
  updatedAt: string
  questions: AssessmentQuestionItem[]
}

export interface AdminTeacherItem {
  id: string
  name: string
  email: string
  phone?: string
  subject: string
  classes: string[]
  studentCount: number
  status: 'active' | 'pending' | 'inactive'
  joinedAt: string
  rating: number
  qualifications?: string
  experienceYears?: number
  bio?: string
  accountStatus?: 'ACTIVE' | 'LOCKED' | 'PENDING'
}

export interface LearningReportsData {
  totalLearners: number
  activeLearners: number
  completedLessons: number
  completionRatePercent: number
  averageAssessmentScore: number
  activityTrend: {
    date: string
    activeUsers: number
    lessonsCompleted: number
  }[]
  subjectProgress: {
    subject: string
    progress: number
    learnersCount: number
  }[]
  scoreDistribution: {
    range: string
    count: number
    percent: number
  }[]
}

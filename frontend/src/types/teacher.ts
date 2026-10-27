export interface TeacherClassItem {
  id: string
  name: string
  grade: string
  subject: string
  studentCount: number
  averageProgress: number
  activeAssignments: number
  latestActivity: string
}

export type StudentStatus = 'on-track' | 'needs-attention' | 'idle'

export interface ClassStudentItem {
  id: string
  name: string
  email: string
  progress: number
  lessonsCompleted: number
  latestScore: number
  lastActive: string
  status: StudentStatus
}

export interface StudentAcademicDetail {
  id: string
  name: string
  email: string
  grade: string
  className: string
  totalLearningMinutes: number
  overallProgress: number
  averageAssessmentScore: number
  recentLessons: Array<{
    id: string
    title: string
    progress: number
    lastActive: string
  }>
  assessmentAttempts: Array<{
    id: string
    title: string
    score: number
    passed: boolean
    date: string
  }>
  weakAreas: string[]
}

export interface TeacherAssignmentItem {
  id: string
  title: string
  classId: string
  className: string
  subject: string
  lessonIds: string[]
  assessmentId?: string
  instructions?: string
  dueDate: string
  submissionsCount: number
  totalStudents: number
  status: 'active' | 'scheduled' | 'closed'
}

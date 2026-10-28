export type ClassStatus = 'active' | 'completed'
export type StudentStatus = 'on-track' | 'needs-attention' | 'idle'
export type AssignmentStatus = 'active' | 'scheduled' | 'closed'
export type SubmissionStatus = 'graded' | 'pending' | 'missing' | 'late'
export type AlertSeverity = 'high' | 'medium' | 'low'
export type AlertType = 'slow_progress' | 'missing_assignments' | 'low_score' | 'inactive'
export type AlertStatus = 'unresolved' | 'investigating' | 'resolved'
export type GradeActivityType = 'assignment' | 'assessment' | 'midterm' | 'final'

export interface AdminClassItem {
  id: string
  code: string
  name: string
  grade: string
  homeroomTeacherId: string
  homeroomTeacherName: string
  room: string
  academicYear: string
  description?: string
  maxStudents: number
  studentCount: number
  averageProgress: number
  averageScore: number
  activeAssignments: number
  status: ClassStatus
  createdAt: string
  updatedAt: string
}

export interface AdminStudentItem {
  id: string
  code: string
  name: string
  email: string
  phone?: string
  classId: string
  className: string
  grade: string
  progress: number
  lessonsCompleted: number
  averageScore: number
  totalLearningMinutes: number
  lastActive: string
  status: StudentStatus
  weakAreas?: string[]
  strengths?: string[]
}

export interface AdminAssignmentItem {
  id: string
  title: string
  classId: string
  className: string
  subjectId: string
  subjectName: string
  lessonId?: string
  lessonTitle?: string
  assessmentId?: string
  description?: string
  instructions?: string
  dueDate: string
  maxScore: number
  submissionsCount: number
  totalStudents: number
  averageScore?: number
  status: AssignmentStatus
  createdAt: string
}

export interface AdminSubmissionItem {
  id: string
  assignmentId: string
  assignmentTitle: string
  studentId: string
  studentName: string
  studentEmail: string
  className: string
  submittedAt?: string
  status: SubmissionStatus
  score?: number
  maxScore: number
  feedback?: string
  gradedBy?: string
  content?: string
}

export interface AdminGradeRecord {
  id: string
  studentId: string
  studentName: string
  studentCode: string
  classId: string
  className: string
  subjectName: string
  activityTitle: string
  activityType: GradeActivityType
  score: number
  maxScore: number
  passed: boolean
  date: string
  feedback?: string
}

export interface AdminLearningAlert {
  id: string
  studentId: string
  studentName: string
  classId: string
  className: string
  severity: AlertSeverity
  type: AlertType
  reason: string
  indicator: string
  detectedAt: string
  status: AlertStatus
  resolutionNote?: string
}

export interface ClassActivityItem {
  id: string
  classId: string
  action: string
  detail: string
  timestamp: string
  actor: string
}

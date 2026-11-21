import type {
  ClassStudentItem,
  StudentAcademicDetail,
  TeacherAssignmentItem,
  TeacherClassItem,
} from '@/types/teacher'
import { classroomService } from '@/services/classroom.service'

export interface TeacherRecentSubmission {
  id: string
  studentName: string
  studentAvatar?: string
  assignmentTitle: string
  className: string
  submittedAt: string
  score?: number
  maxScore: number
  status: 'submitted' | 'graded' | 'late'
}

export interface TeacherAttentionStudent {
  id: string
  name: string
  avatar?: string
  className: string
  reason: string
  metricLabel: string
  metricValue: string
  urgency: 'high' | 'medium' | 'low'
}

export const teacherService = {
  async getDashboardSummary(): Promise<{
    classesCount: number
    studentsCount: number
    activeAssignmentsCount: number
    studentsNeedingAttentionCount: number
    recentSubmissions: TeacherRecentSubmission[]
    attentionStudents: TeacherAttentionStudent[]
  }> {
    const classes = await classroomService.getTeacherClasses()
    const students = await classroomService.getStudents()
    const assignments = await classroomService.getAssignments()
    const alerts = await classroomService.getAlerts()

    return {
      classesCount: classes.length,
      studentsCount: students.length,
      activeAssignmentsCount: assignments.filter((a) => a.status === 'active').length,
      studentsNeedingAttentionCount: alerts.filter((a) => a.status !== 'resolved').length,
      recentSubmissions: [],
      attentionStudents: [],
    }
  },

  async getClasses(): Promise<TeacherClassItem[]> {
    return classroomService.getTeacherClasses()
  },

  async getClassById(classId: string): Promise<TeacherClassItem | null> {
    const classes = await classroomService.getTeacherClasses()
    const c = classes.find((item) => item.id === classId)
    return c ? { ...c } : null
  },

  async getClassStudents(classId: string): Promise<ClassStudentItem[]> {
    return classroomService.getTeacherClassStudents(classId)
  },

  async getStudentAcademicDetail(studentId: string): Promise<StudentAcademicDetail | null> {
    return classroomService.getStudentAcademicDetail(studentId)
  },

  async getAssignments(): Promise<TeacherAssignmentItem[]> {
    return classroomService.getTeacherAssignments()
  },

  async createAssignment(
    assignment: Omit<TeacherAssignmentItem, 'id' | 'submissionsCount' | 'status'>
  ): Promise<TeacherAssignmentItem> {
    const created = await classroomService.saveAssignment({
      title: assignment.title,
      classId: assignment.classId,
      className: assignment.className,
      subjectName: assignment.subject,
      dueDate: assignment.dueDate,
      instructions: assignment.instructions,
      totalStudents: assignment.totalStudents || 35,
      status: 'active',
    })

    return {
      id: created.id,
      title: created.title,
      classId: created.classId,
      className: created.className,
      subject: created.subjectName,
      lessonIds: created.lessonId ? [created.lessonId] : [],
      dueDate: created.dueDate,
      submissionsCount: created.submissionsCount,
      totalStudents: created.totalStudents,
      status: created.status,
    }
  },

  // Reset helper for testing
  _resetMockState(): void {
    classroomService._resetMockState()
  },
}

import { apiClient } from '@/lib/apiClient'
import type {
  ClassStudentItem,
  StudentAcademicDetail,
  TeacherAssignmentItem,
  TeacherClassItem,
} from '@/types/teacher'

export interface TeacherRecentSubmission {
  id: string
  studentName: string
  className: string
  assignmentTitle: string
  score: number
  submittedAt: string
}

export interface TeacherAttentionStudent {
  id: string
  name: string
  className: string
  reason: string
  lastActive: string
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
    const dash = await apiClient.get<{
      metrics: {
        totalClasses: number
        totalStudents: number
        activeAssignments: number
        atRiskStudents: number
      }
      recentClasses: Array<{
        id: string
        name: string
        code: string
        grade: string
        subject: string
        academicYear: string
        studentCount: number
      }>
    }>('/api/v1/teacher/dashboard')

    return {
      classesCount: dash.metrics.totalClasses,
      studentsCount: dash.metrics.totalStudents,
      activeAssignmentsCount: dash.metrics.activeAssignments,
      studentsNeedingAttentionCount: dash.metrics.atRiskStudents,
      recentSubmissions: [] as TeacherRecentSubmission[],
      attentionStudents: [] as TeacherAttentionStudent[],
    }
  },

  async getClasses(): Promise<TeacherClassItem[]> {
    const res = await apiClient.get<{
      items: Array<{
        id: string
        name: string
        code: string
        grade: string
        subject: string
        academicYear: string
        description: string
        studentCount: number
        activeAssignments: number
        createdAt: string
      }>
      total: number
    }>('/api/v1/teacher/classes')

    return (res.items || []).map((c) => ({
      id: c.id,
      name: c.name,
      grade: c.grade,
      subject: c.subject,
      studentCount: c.studentCount || 0,
      averageProgress: 70,
      activeAssignments: c.activeAssignments || 0,
      latestActivity: c.createdAt,
    }))
  },

  async getClassById(classId: string): Promise<TeacherClassItem | null> {
    try {
      const c = await apiClient.get<{
        id: string
        name: string
        code: string
        grade: string
        subject: string
        academicYear: string
        description: string
        studentCount: number
        activeAssignments: number
        createdAt: string
      }>(`/api/v1/teacher/classes/${classId}`)

      return {
        id: c.id,
        name: c.name,
        grade: c.grade,
        subject: c.subject,
        studentCount: c.studentCount || 0,
        averageProgress: 70,
        activeAssignments: c.activeAssignments || 0,
        latestActivity: c.createdAt,
      }
    } catch {
      return null
    }
  },

  async getClassStudents(classId: string): Promise<ClassStudentItem[]> {
    const res = await apiClient.get<{
      items: Array<{
        id: string
        displayName: string
        email: string
        grade: string
        status: string
        joinedAt: string
        averageScore: number
        completedLessons: number
        isAtRisk: boolean
        riskReason: string | null
      }>
      total: number
    }>(`/api/v1/teacher/classes/${classId}/students`)

    return (res.items || []).map((s) => ({
      id: s.id,
      name: s.displayName,
      email: s.email,
      progress: s.completedLessons * 10,
      lessonsCompleted: s.completedLessons,
      latestScore: s.averageScore,
      lastActive: s.joinedAt,
      status: s.isAtRisk ? 'needs-attention' : 'on-track',
    }))
  },

  async getStudentAcademicDetail(studentId: string): Promise<StudentAcademicDetail | null> {
    try {
      const s = await apiClient.get<{
        id: string
        displayName: string
        email: string
        grade: string
        stats: {
          completedLessons: number
          inProgressLessons: number
          averageScore: number
          latestScore: number | null
          totalAssessments: number
        }
        riskAssessment: {
          isAtRisk: boolean
          reason: string | null
          evaluationType: string
        }
      }>(`/api/v1/teacher/students/${studentId}`)

      return {
        id: s.id,
        name: s.displayName,
        email: s.email,
        grade: s.grade,
        className: 'Lớp phụ trách',
        totalLearningMinutes: s.stats.completedLessons * 45,
        overallProgress: s.stats.completedLessons * 10,
        averageAssessmentScore: s.stats.averageScore,
        recentLessons: [],
        assessmentAttempts: [],
        weakAreas: s.riskAssessment.isAtRisk && s.riskAssessment.reason ? [s.riskAssessment.reason] : [],
      }
    } catch {
      return null
    }
  },

  async getAssignments(): Promise<TeacherAssignmentItem[]> {
    const res = await apiClient.get<{
      items: Array<{
        id: string
        classId: string
        className: string
        title: string
        description: string
        dueDate: string | null
        status: string
        itemCount: number
        createdAt: string
      }>
      total: number
    }>('/api/v1/teacher/assignments')

    return (res.items || []).map((a) => ({
      id: a.id,
      title: a.title,
      classId: a.classId,
      className: a.className,
      subject: 'Toán học',
      lessonIds: [] as string[],
      dueDate: a.dueDate || '',
      submissionsCount: 0,
      totalStudents: 35,
      status: (a.status === 'published' ? 'active' : a.status === 'closed' ? 'closed' : 'scheduled') as 'active' | 'scheduled' | 'closed',
    }))
  },

  async createAssignment(assignment: Omit<TeacherAssignmentItem, 'id' | 'submissionsCount' | 'status'>): Promise<TeacherAssignmentItem> {
    const res = await apiClient.post<{
      id: string
      classId: string
      title: string
      description: string | null
      dueDate: string | null
      status: string
      createdAt: string
    }>('/api/v1/teacher/assignments', {
      classId: assignment.classId,
      title: assignment.title,
      description: '',
      dueDate: assignment.dueDate || null,
      items: assignment.lessonIds.map((lId) => ({ lessonId: lId, title: lId })),
    })

    return {
      id: res.id,
      title: res.title,
      classId: res.classId,
      className: assignment.className,
      subject: assignment.subject,
      lessonIds: assignment.lessonIds,
      dueDate: res.dueDate || '',
      submissionsCount: 0,
      totalStudents: 35,
      status: 'active',
    }
  },
}

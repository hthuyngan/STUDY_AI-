import type {
  ClassStudentItem,
  StudentAcademicDetail,
  TeacherAssignmentItem,
  TeacherClassItem,
} from '@/types/teacher'
import {
  INITIAL_MOCK_ASSIGNMENTS,
  INITIAL_MOCK_CLASSES,
  INITIAL_MOCK_STUDENTS,
  INITIAL_STUDENT_ACADEMIC_DETAIL,
  INITIAL_TEACHER_DASHBOARD,
  type TeacherAttentionStudent,
  type TeacherRecentSubmission,
} from '@/data/staff/teacher.mock'

export type { TeacherRecentSubmission, TeacherAttentionStudent }

let mockClasses = [...INITIAL_MOCK_CLASSES]
let mockAssignments = [...INITIAL_MOCK_ASSIGNMENTS]
const mockStudents = { ...INITIAL_MOCK_STUDENTS }

export const teacherService = {
  async getDashboardSummary(): Promise<{
    classesCount: number
    studentsCount: number
    activeAssignmentsCount: number
    studentsNeedingAttentionCount: number
    recentSubmissions: TeacherRecentSubmission[]
    attentionStudents: TeacherAttentionStudent[]
  }> {
    return {
      ...INITIAL_TEACHER_DASHBOARD,
      classesCount: mockClasses.length,
      activeAssignmentsCount: mockAssignments.filter((a) => a.status === 'active').length,
    }
  },

  async getClasses(): Promise<TeacherClassItem[]> {
    return [...mockClasses]
  },

  async getClassById(classId: string): Promise<TeacherClassItem | null> {
    const c = mockClasses.find((item) => item.id === classId)
    return c ? { ...c } : null
  },

  async getClassStudents(classId: string): Promise<ClassStudentItem[]> {
    return mockStudents[classId] || mockStudents['cls-12a1'] || []
  },

  async getStudentAcademicDetail(studentId: string): Promise<StudentAcademicDetail | null> {
    return {
      ...INITIAL_STUDENT_ACADEMIC_DETAIL,
      id: studentId,
    }
  },

  async getAssignments(): Promise<TeacherAssignmentItem[]> {
    return [...mockAssignments]
  },

  async createAssignment(
    assignment: Omit<TeacherAssignmentItem, 'id' | 'submissionsCount' | 'status'>
  ): Promise<TeacherAssignmentItem> {
    const newAsg: TeacherAssignmentItem = {
      ...assignment,
      id: `asg-${Date.now()}`,
      submissionsCount: 0,
      status: 'active',
    }
    mockAssignments = [newAsg, ...mockAssignments]
    // Update active assignment count in class
    mockClasses = mockClasses.map((cls) =>
      cls.id === assignment.classId
        ? { ...cls, activeAssignments: cls.activeAssignments + 1 }
        : cls
    )
    return newAsg
  },

  // Reset helper for testing
  _resetMockState(): void {
    mockClasses = [...INITIAL_MOCK_CLASSES]
    mockAssignments = [...INITIAL_MOCK_ASSIGNMENTS]
  },
}

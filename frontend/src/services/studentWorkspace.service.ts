import { apiClient } from '@/lib/apiClient'

export interface StudentMistakeItem {
  responseId: string
  questionId: string
  prompt: string
  studentAnswer?: string | null
  correctAnswer?: string | null
  explanation?: string | null
  chapterTitle?: string | null
  wrongCount: number
  isResolved?: boolean
  lastAttemptAt: string
}

export interface LearnerClassroomSummary {
  id: string
  name: string
  code?: string | null
  teacherName?: string | null
  enrolledAt: string
  announcements: { id: string; title: string; body: string; isPinned: boolean; createdAt: string }[]
  materials: { id: string; title: string; fileName: string; storagePathOrUrl: string }[]
}

export const studentWorkspaceService = {
  getMistakes(): Promise<StudentMistakeItem[]> {
    return apiClient.get<StudentMistakeItem[]>('/api/v1/learner/workspace/mistakes')
  },
  resolveMistake(responseId: string): Promise<void> {
    return apiClient.patch<void>(`/api/v1/learner/workspace/mistakes/${encodeURIComponent(responseId)}/resolve`, {})
  },
  getMyClassrooms(): Promise<LearnerClassroomSummary[]> {
    return apiClient.get<LearnerClassroomSummary[]>('/api/v1/learner/workspace/classrooms')
  },
  joinClassroomByCode(code: string): Promise<LearnerClassroomSummary> {
    return apiClient.post<LearnerClassroomSummary>('/api/v1/learner/workspace/classrooms/join', { code })
  },
}

import { apiClient } from '@/lib/apiClient'

export interface TeacherExamItem {
  id: string
  classroomId: string
  sourceAssessmentId?: string | null
  title: string
  durationMinutes: number
  shuffleQuestions: boolean
  openAt?: string | null
  closeAt?: string | null
  publishResults: boolean
  status: string
  createdAt: string
}

export interface ClassroomMaterialItem {
  id: string
  classroomId: string
  title: string
  category: string
  fileName: string
  mimeType: string
  fileSizeBytes: number
  storagePathOrUrl: string
  isRevoked: boolean
  createdAt: string
}

export interface ClassroomAnnouncementItem {
  id: string
  classroomId: string
  title: string
  body: string
  isPinned: boolean
  attachmentUrl?: string | null
  createdAt: string
}

export interface TeacherScheduleItem {
  id: string
  kind: string
  title: string
  classroomId: string
  classroomName: string
  scheduledAt: string
  status: string
}

export interface TeacherAiAssistantResponse {
  content: string
  requiresTeacherConfirmation: boolean
  classroomName: string
  studentCount: number
  provider: string
  status?: string
  isAiGenerated?: boolean
}

export const teacherWorkspaceService = {
  getExams(classroomId?: string): Promise<TeacherExamItem[]> {
    const q = classroomId ? `?classroomId=${encodeURIComponent(classroomId)}` : ''
    return apiClient.get<TeacherExamItem[]>(`/api/v1/teacher/workspace/exams${q}`)
  },
  createExam(payload: {
    classroomId: string
    sourceAssessmentId?: string
    title: string
    durationMinutes: number
    shuffleQuestions: boolean
    openAt?: string
    closeAt?: string
  }): Promise<TeacherExamItem> {
    return apiClient.post<TeacherExamItem>('/api/v1/teacher/workspace/exams', payload)
  },
  updateExamStatus(examId: string, status: string, publishResults?: boolean): Promise<TeacherExamItem> {
    return apiClient.patch<TeacherExamItem>(`/api/v1/teacher/workspace/exams/${examId}/status`, {
      status,
      publishResults,
    })
  },
  getMaterials(classroomId?: string): Promise<ClassroomMaterialItem[]> {
    const q = classroomId ? `?classroomId=${encodeURIComponent(classroomId)}` : ''
    return apiClient.get<ClassroomMaterialItem[]>(`/api/v1/teacher/workspace/materials${q}`)
  },
  createMaterial(payload: {
    classroomId: string
    title: string
    category: string
    fileName: string
    mimeType: string
    fileSizeBytes: number
    storagePathOrUrl: string
  }): Promise<ClassroomMaterialItem> {
    return apiClient.post<ClassroomMaterialItem>('/api/v1/teacher/workspace/materials', payload)
  },
  uploadMaterial(formData: FormData): Promise<ClassroomMaterialItem> {
    return apiClient.postFormData<ClassroomMaterialItem>('/api/v1/teacher/workspace/materials/upload', formData)
  },
  revokeMaterial(materialId: string): Promise<ClassroomMaterialItem> {
    return apiClient.delete<ClassroomMaterialItem>(`/api/v1/teacher/workspace/materials/${materialId}`)
  },
  getAnnouncements(classroomId?: string): Promise<ClassroomAnnouncementItem[]> {
    const q = classroomId ? `?classroomId=${encodeURIComponent(classroomId)}` : ''
    return apiClient.get<ClassroomAnnouncementItem[]>(`/api/v1/teacher/workspace/announcements${q}`)
  },
  createAnnouncement(payload: {
    classroomId: string
    title: string
    body: string
    isPinned: boolean
    attachmentUrl?: string
  }): Promise<ClassroomAnnouncementItem> {
    return apiClient.post<ClassroomAnnouncementItem>('/api/v1/teacher/workspace/announcements', payload)
  },
  getSchedule(): Promise<TeacherScheduleItem[]> {
    return apiClient.get<TeacherScheduleItem[]>('/api/v1/teacher/workspace/schedule')
  },
  runAiAssistant(payload: {
    classroomId: string
    mode: 'lesson_plan' | 'generate_exercises' | 'exam_matrix' | 'feedback_draft'
    prompt: string
  }): Promise<TeacherAiAssistantResponse> {
    return apiClient.post<TeacherAiAssistantResponse>('/api/v1/teacher/workspace/ai-assistant', payload)
  },
}

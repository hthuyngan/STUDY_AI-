import type {
  ContentAssessmentSummary,
  ContentLessonItem,
  ContentReviewQueueItem,
  CurriculumSubjectItem,
  LessonEditorData,
} from '@/types/content'
import {
  INITIAL_MOCK_ASSESSMENTS,
  INITIAL_MOCK_LESSON_CONTENT,
  INITIAL_MOCK_LESSONS,
  INITIAL_MOCK_REVIEW_QUEUE,
  INITIAL_MOCK_SUBJECTS,
} from '@/data/staff/content.mock'

let mockSubjects = [...INITIAL_MOCK_SUBJECTS]
let mockLessons = [...INITIAL_MOCK_LESSONS]
let mockAssessments = [...INITIAL_MOCK_ASSESSMENTS]
let mockReviewQueue = [...INITIAL_MOCK_REVIEW_QUEUE]
const mockLessonContents: Record<string, LessonEditorData> = { ...INITIAL_MOCK_LESSON_CONTENT }

export const contentService = {
  async getDashboardSummary(): Promise<{
    draftCount: number
    needsReviewCount: number
    publishedThisWeek: number
    assessmentCoveragePercent: number
    reviewQueue: ContentReviewQueueItem[]
    recentLessons: ContentLessonItem[]
  }> {
    return {
      draftCount: mockLessons.filter((l) => l.status === 'draft').length,
      needsReviewCount: mockLessons.filter((l) => l.status === 'in-review').length,
      publishedThisWeek: mockLessons.filter((l) => l.status === 'published').length,
      assessmentCoveragePercent: 86,
      reviewQueue: [...mockReviewQueue],
      recentLessons: [...mockLessons.slice(0, 4)],
    }
  },

  async getSubjects(): Promise<CurriculumSubjectItem[]> {
    return [...mockSubjects]
  },

  async getLessons(
    subjectFilter = 'all',
    statusFilter = 'all',
    search = ''
  ): Promise<ContentLessonItem[]> {
    let list = [...mockLessons]
    if (subjectFilter && subjectFilter !== 'all') {
      list = list.filter((l) => l.subjectId === subjectFilter)
    }
    if (statusFilter && statusFilter !== 'all') {
      list = list.filter((l) => l.status === statusFilter)
    }
    if (search.trim()) {
      const q = search.trim().toLowerCase()
      list = list.filter(
        (l) =>
          l.title.toLowerCase().includes(q) ||
          l.authorName.toLowerCase().includes(q)
      )
    }
    return list
  },

  async getLessonEditor(lessonId: string): Promise<LessonEditorData> {
    if (mockLessonContents[lessonId]) {
      return { ...mockLessonContents[lessonId] }
    }
    const lesson = mockLessons.find((l) => l.id === lessonId)
    const editorData: LessonEditorData = {
      id: lessonId,
      title: lesson ? lesson.title : 'Bài học mới',
      subjectId: lesson ? lesson.subjectId : 'math',
      chapterId: lesson ? lesson.chapterId : 'ch-01',
      status: lesson ? lesson.status : 'draft',
      introduction: 'Giới thiệu tổng quan nội dung và mục tiêu cần đạt của bài học theo khung chương trình GDPT.',
      definitions: 'Các định nghĩa, khái niệm then chốt cần nắm vững trước khi đi vào giải bài tập.',
      formulas: 'Công thức toán học và biểu thức liên quan quan trọng cần ghi nhớ.',
      examples: 'Ví dụ mẫu minh họa phương pháp giải toán từng bước chi tiết và rõ ràng.',
      notes: 'Lưu ý những lỗi sai phổ biến học sinh thường gặp trong quá trình làm bài.',
      summary: 'Tóm tắt các kiến thức cốt lõi của bài học và dạng bài tập trọng tâm.',
      assessmentId: 'asm-math-08',
      lastSavedAt: new Date().toISOString(),
    }
    mockLessonContents[lessonId] = editorData
    return { ...editorData }
  },

  async saveLessonEditor(data: LessonEditorData): Promise<LessonEditorData> {
    const updated: LessonEditorData = {
      ...data,
      lastSavedAt: new Date().toISOString(),
    }
    mockLessonContents[data.id] = updated

    // Also update in lessons list
    mockLessons = mockLessons.map((l) =>
      l.id === data.id
        ? {
            ...l,
            title: data.title,
            status: data.status,
            updatedAt: updated.lastSavedAt || new Date().toISOString(),
          }
        : l
    )
    return updated
  },

  async getAssessments(): Promise<ContentAssessmentSummary[]> {
    return [...mockAssessments]
  },

  async getReviewQueue(): Promise<ContentReviewQueueItem[]> {
    return [...mockReviewQueue]
  },

  async reviewAction(id: string, action: 'approve' | 'request-changes'): Promise<boolean> {
    const item = mockReviewQueue.find((r) => r.id === id)
    if (item) {
      item.status = action === 'approve' ? 'approved' : 'changes-requested'
      // Update corresponding lesson status if applicable
      mockLessons = mockLessons.map((l) =>
        l.title === item.title
          ? { ...l, status: action === 'approve' ? 'published' : 'draft' }
          : l
      )
      return true
    }
    return false
  },

  _resetMockState(): void {
    mockSubjects = [...INITIAL_MOCK_SUBJECTS]
    mockLessons = [...INITIAL_MOCK_LESSONS]
    mockAssessments = [...INITIAL_MOCK_ASSESSMENTS]
    mockReviewQueue = [...INITIAL_MOCK_REVIEW_QUEUE]
  },
}

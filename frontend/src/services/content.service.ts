import type {
  ContentAssessmentSummary,
  ContentLessonItem,
  ContentReviewQueueItem,
  CurriculumSubjectItem,
  LessonEditorData,
} from '@/types/content'
import {
  INITIAL_MOCK_LESSON_CONTENT,
  INITIAL_MOCK_REVIEW_QUEUE,
} from '@/data/staff/content.mock'
import { educationService } from './education.service'

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
    const lessons = await educationService.getLessons()
    return {
      draftCount: lessons.filter((l) => l.status === 'draft').length,
      needsReviewCount: lessons.filter((l) => l.status === 'in-review').length,
      publishedThisWeek: lessons.filter((l) => l.status === 'published').length,
      assessmentCoveragePercent: 86,
      reviewQueue: [...mockReviewQueue],
      recentLessons: [...lessons.slice(0, 4)],
    }
  },

  async getSubjects(): Promise<CurriculumSubjectItem[]> {
    return educationService.getSubjects()
  },

  async getLessons(
    subjectFilter = 'all',
    statusFilter = 'all',
    search = ''
  ): Promise<ContentLessonItem[]> {
    return educationService.getLessons({
      subjectId: subjectFilter,
      status: statusFilter,
      search,
    })
  },

  async getLessonEditor(lessonId: string): Promise<LessonEditorData> {
    if (mockLessonContents[lessonId]) {
      return { ...mockLessonContents[lessonId] }
    }
    const lesson = await educationService.getLessonById(lessonId)
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

    // Update in shared education service
    await educationService.updateLesson(data.id, {
      title: data.title,
      status: data.status,
    })

    return updated
  },

  async getAssessments(): Promise<ContentAssessmentSummary[]> {
    const asm = await educationService.getAssessments()
    return asm.map((a) => ({
      id: a.id,
      lessonId: a.lessonId,
      lessonTitle: a.lessonTitle,
      questionCount: a.questionCount,
      passingScore: a.passingScore,
      status: a.status,
      updatedAt: a.updatedAt,
    }))
  },

  async getReviewQueue(): Promise<ContentReviewQueueItem[]> {
    return [...mockReviewQueue]
  },

  async reviewAction(id: string, action: 'approve' | 'request-changes'): Promise<boolean> {
    const item = mockReviewQueue.find((r) => r.id === id)
    if (item) {
      item.status = action === 'approve' ? 'approved' : 'changes-requested'
      const newStatus = action === 'approve' ? 'published' : 'draft'
      const lessons = await educationService.getLessons()
      const matched = lessons.find((l) => l.title === item.title)
      if (matched) {
        await educationService.changeLessonStatus(matched.id, newStatus)
      }
      return true
    }
    return false
  },

  _resetMockState(): void {
    educationService._resetEducationMockState()
    mockReviewQueue = [...INITIAL_MOCK_REVIEW_QUEUE]
  },
}

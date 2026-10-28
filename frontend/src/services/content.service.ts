import type {
  ContentAssessmentSummary,
  ContentLessonItem,
  ContentReviewQueueItem,
  CurriculumSubjectItem,
  LessonEditorData,
} from '@/types/content'
import {
  INITIAL_MOCK_LESSON_CONTENT,
} from '@/data/staff/content.mock'
import { educationService } from './education.service'
import { operationsService } from './operations.service'

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
    const reviewQueue = await this.getReviewQueue()
    return {
      draftCount: lessons.filter((l) => l.status === 'draft').length,
      needsReviewCount: lessons.filter((l) => l.status === 'in-review').length,
      publishedThisWeek: lessons.filter((l) => l.status === 'published').length,
      assessmentCoveragePercent: 86,
      reviewQueue,
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

    // If status is in-review, ensure an approval item exists in operationsService
    if (data.status === 'in-review') {
      const approvals = await operationsService.getApprovals()
      const existing = approvals.find((a) => a.contentId === data.id)
      if (!existing) {
        await operationsService.submitForApproval({
          title: data.title,
          contentType: 'lesson',
          contentId: data.id,
          subjectId: data.subjectId,
          subjectName: data.subjectId === 'math' ? 'Toán học 12' : 'Vật lý 12',
          authorName: 'Biên soạn nội dung',
          authorRole: 'Content Specialist',
          version: 'v1.0',
          contentPreview: {
            introduction: data.introduction,
            definitions: data.definitions,
            formulas: data.formulas,
            examples: data.examples,
            summary: data.summary,
          },
        })
      }
    }

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
    const approvals = await operationsService.getApprovals()
    return approvals.map((a) => ({
      id: a.id,
      title: a.title,
      type: a.contentType === 'assessment' ? 'assessment' : 'lesson',
      subject: a.subjectName,
      author: a.authorName,
      submittedAt: a.submittedAt,
      status:
        a.status === 'changes-requested'
          ? 'changes-requested'
          : a.status === 'approved' || a.status === 'published'
          ? 'approved'
          : 'pending',
      reviewer: a.reviewedBy,
      commentsCount: a.history.length,
    }))
  },

  async reviewAction(id: string, action: 'approve' | 'request-changes'): Promise<boolean> {
    try {
      if (action === 'approve') {
        await operationsService.approveContent(
          id,
          'Phê duyệt từ Content Workspace',
          'Ban Giám Định Chuyên Môn'
        )
      } else {
        await operationsService.requestChanges(
          id,
          'Yêu cầu chỉnh sửa từ Content Workspace',
          'Ban Giám Định Chuyên Môn'
        )
      }
      return true
    } catch {
      return false
    }
  },

  _resetMockState(): void {
    educationService._resetEducationMockState()
    operationsService._resetMockState()
  },
}

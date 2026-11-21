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
import { apiClient } from '@/lib/apiClient'
import { getAccessToken } from '@/auth/authSession'

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
    const totalLessons = lessons.length
    const coveredLessons = lessons.filter((l) => (l as any).assessmentId || (l as any).hasAssessment).length
    const assessmentCoveragePercent = totalLessons > 0 ? Math.round((coveredLessons / totalLessons) * 100) : 0
    return {
      draftCount: lessons.filter((l) => l.status === 'draft').length,
      needsReviewCount: lessons.filter((l) => l.status === 'in-review').length,
      publishedThisWeek: lessons.filter((l) => l.status === 'published').length,
      assessmentCoveragePercent,
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
    if (getAccessToken()) {
      const lesson = await apiClient.get<any>(`/api/v1/content/lessons/${lessonId}`)
      if (lesson) {
        return {
          id: lesson.id,
          title: lesson.title || 'Bài học mới',
          subjectId: lesson.subjectId || 'sub_math10',
          chapterId: lesson.chapterId || '',
          status: lesson.status || 'draft',
          introduction: lesson.introduction || '',
          definitions: Array.isArray(lesson.definitions) ? lesson.definitions.join('\n') : (lesson.definitions || ''),
          formulas: Array.isArray(lesson.formulas) ? lesson.formulas.join('\n') : (lesson.formulas || ''),
          examples: Array.isArray(lesson.examples) ? lesson.examples.join('\n') : (lesson.examples || ''),
          notes: Array.isArray(lesson.importantNotes) ? lesson.importantNotes.join('\n') : (lesson.importantNotes || ''),
          summary: Array.isArray(lesson.summaryPoints) ? lesson.summaryPoints.join('\n') : (lesson.summaryPoints || ''),
          assessmentId: lesson.questionsCount > 0 ? `asm-${lesson.id}` : undefined,
          lastSavedAt: lesson.updatedAt || new Date().toISOString(),
        }
      }
    }

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
    if (getAccessToken()) {
      const payload = {
        title: data.title,
        introduction: data.introduction,
        definitions: data.definitions ? data.definitions.split('\n').filter((s) => s.trim().length > 0) : [],
        formulas: data.formulas ? data.formulas.split('\n').filter((s) => s.trim().length > 0) : [],
        examples: data.examples ? data.examples.split('\n').filter((s) => s.trim().length > 0) : [],
        importantNotes: data.notes ? data.notes.split('\n').filter((s) => s.trim().length > 0) : [],
        summaryPoints: data.summary ? data.summary.split('\n').filter((s) => s.trim().length > 0) : [],
      }
      await apiClient.patch(`/api/v1/content/lessons/${data.id}`, payload)
      if (data.status === 'in-review') {
        try {
          await apiClient.post(`/api/v1/content/lessons/${data.id}/submit-review`)
        } catch {
          // If already submitted, ignore
        }
      }
      return {
        ...data,
        lastSavedAt: new Date().toISOString(),
      }
    }

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

import type {
  ContentAssessmentSummary,
  ContentLessonItem,
  ContentReviewQueueItem,
  ContentStatus,
  CurriculumSubjectItem,
  LessonEditorData,
  StructuredDefinitionItem,
  StructuredFormulaItem,
  StructuredExampleItem,
} from '@/types/content'
import { educationService } from './education.service'
import { operationsService } from './operations.service'
import { apiClient } from '@/lib/apiClient'
import { getAccessToken } from '@/auth/authSession'

function parseStructuredDefinitions(raw: unknown): StructuredDefinitionItem[] {
  if (!Array.isArray(raw)) return []
  return raw.map((item, idx) => {
    if (item && typeof item === 'object') {
      const obj = item as Record<string, unknown>
      return {
        id: obj.id ? String(obj.id) : undefined,
        term: String(obj.term || obj.title || `Khái niệm ${idx + 1}`),
        content: String(obj.content || obj.definition || obj.description || ''),
      }
    }
    if (typeof item === 'string') {
      const colonIdx = item.indexOf(':')
      if (colonIdx > 0) {
        return {
          term: item.substring(0, colonIdx).trim(),
          content: item.substring(colonIdx + 1).trim(),
        }
      }
      return {
        term: `Khái niệm ${idx + 1}`,
        content: item.trim(),
      }
    }
    return {
      term: `Khái niệm ${idx + 1}`,
      content: String(item),
    }
  })
}

function parseStructuredFormulas(raw: unknown): StructuredFormulaItem[] {
  if (!Array.isArray(raw)) return []
  return raw.map((item, idx) => {
    if (item && typeof item === 'object') {
      const obj = item as Record<string, unknown>
      return {
        id: obj.id ? String(obj.id) : undefined,
        label: String(obj.label || obj.title || `Công thức ${idx + 1}`),
        formula: String(obj.formula || obj.content || obj.latex || ''),
        note: obj.note ? String(obj.note) : undefined,
      }
    }
    if (typeof item === 'string') {
      return {
        label: `Công thức ${idx + 1}`,
        formula: item.trim(),
      }
    }
    return {
      label: `Công thức ${idx + 1}`,
      formula: String(item),
    }
  })
}

function parseStructuredExamples(raw: unknown): StructuredExampleItem[] {
  if (!Array.isArray(raw)) return []
  return raw.map((item, idx) => {
    if (item && typeof item === 'object') {
      const obj = item as Record<string, unknown>
      return {
        id: obj.id ? String(obj.id) : undefined,
        title: String(obj.title || `Ví dụ ${idx + 1}`),
        problem: String(obj.problem || obj.content || ''),
        solutionSteps: Array.isArray(obj.solutionSteps) ? obj.solutionSteps : [],
        conclusion: obj.conclusion ? String(obj.conclusion) : undefined,
      }
    }
    if (typeof item === 'string') {
      const colonIdx = item.indexOf(':')
      const title = colonIdx > 0 ? item.substring(0, colonIdx).trim() : `Ví dụ ${idx + 1}`
      const problem = colonIdx > 0 ? item.substring(colonIdx + 1).trim() : item.trim()
      return {
        title,
        problem,
      }
    }
    return {
      title: `Ví dụ ${idx + 1}`,
      problem: String(item),
    }
  })
}

function parseStringArray(raw: unknown): string[] {
  if (!Array.isArray(raw)) return []
  return raw
    .map((s) => (typeof s === 'string' ? s : typeof s === 'object' && s && 'note' in s ? String((s as any).note) : String(s)))
    .filter((s) => s.trim().length > 0)
}

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
    if (!lessonId) {
      throw new Error('Mã bài học không hợp lệ.')
    }
    if (getAccessToken()) {
      const lesson = await apiClient.get<any>(`/api/v1/content/lessons/${lessonId}`)
      if (lesson) {
        return {
          id: lesson.id,
          code: lesson.code || undefined,
          curriculumEditionId: lesson.curriculumEditionId || undefined,
          curriculumEditionName: lesson.curriculumEditionName || undefined,
          title: lesson.title || 'Bài học mới',
          subjectId: lesson.subjectId || '',
          subjectName: lesson.subjectName || '',
          chapterId: lesson.chapterId || '',
          chapterTitle: lesson.chapterTitle || '',
          status: lesson.status || 'draft',
          rowVersion: lesson.rowVersion || undefined,
          introduction: lesson.introduction || '',
          definitions: parseStructuredDefinitions(lesson.definitions),
          formulas: parseStructuredFormulas(lesson.formulas),
          examples: parseStructuredExamples(lesson.examples),
          notes: parseStringArray(lesson.importantNotes),
          summary: parseStringArray(lesson.summaryPoints),
          questionsCount: lesson.questionsCount || 0,
          assessmentId: lesson.assessmentId || undefined,
          assessmentTitle: lesson.assessmentTitle || undefined,
          lastSavedAt: lesson.updatedAt || new Date().toISOString(),
        }
      }
    }
    throw new Error(`Không tìm thấy bài học ${lessonId} hoặc phiên làm việc đã hết hạn.`)
  },

  async saveLessonContent(data: Partial<LessonEditorData> & { id: string }): Promise<LessonEditorData> {
    if (!getAccessToken()) {
      throw new Error('Yêu cầu đăng nhập chuyên viên nội dung để lưu bài học.')
    }
    const payload: Record<string, unknown> = {}
    if (data.rowVersion !== undefined) payload.rowVersion = data.rowVersion
    if (data.title !== undefined) payload.title = data.title
    if (data.introduction !== undefined) payload.introduction = data.introduction
    if (data.definitions !== undefined) {
      payload.definitions = (data.definitions || []).map((d) =>
        typeof d === 'string' ? { term: 'Khái niệm', content: d } : { id: d.id, term: d.term, content: d.content }
      )
    }
    if (data.formulas !== undefined) {
      payload.formulas = (data.formulas || []).map((f) =>
        typeof f === 'string' ? { label: 'Công thức', formula: f } : { id: f.id, label: f.label, formula: f.formula, note: f.note }
      )
    }
    if (data.examples !== undefined) {
      payload.examples = (data.examples || []).map((e) =>
        typeof e === 'string' ? { title: 'Ví dụ', problem: e } : { id: e.id, title: e.title, problem: e.problem, solutionSteps: e.solutionSteps, conclusion: e.conclusion }
      )
    }
    if (data.notes !== undefined) {
      payload.importantNotes = (data.notes || []).map((n) => String(n).trim()).filter((s) => s.length > 0)
    }
    if (data.summary !== undefined) {
      payload.summaryPoints = (data.summary || []).map((s) => String(s).trim()).filter((s) => s.length > 0)
    }

    const updated = await apiClient.patch<any>(`/api/v1/content/lessons/${data.id}`, payload)
    return {
      id: updated?.id || data.id,
      code: updated?.code ?? data.code,
      curriculumEditionId: updated?.curriculumEditionId ?? data.curriculumEditionId,
      curriculumEditionName: updated?.curriculumEditionName ?? data.curriculumEditionName,
      title: updated?.title || data.title || '',
      subjectId: updated?.subjectId || data.subjectId || '',
      subjectName: updated?.subjectName || data.subjectName,
      chapterId: updated?.chapterId || data.chapterId || '',
      chapterTitle: updated?.chapterTitle || data.chapterTitle,
      status: updated?.status || data.status || 'draft',
      rowVersion: updated?.rowVersion ?? data.rowVersion,
      introduction: updated?.introduction ?? (data.introduction || ''),
      definitions: updated?.definitions ? parseStructuredDefinitions(updated.definitions) : (data.definitions as StructuredDefinitionItem[]) || [],
      formulas: updated?.formulas ? parseStructuredFormulas(updated.formulas) : (data.formulas as StructuredFormulaItem[]) || [],
      examples: updated?.examples ? parseStructuredExamples(updated.examples) : (data.examples as StructuredExampleItem[]) || [],
      notes: updated?.importantNotes ? parseStringArray(updated.importantNotes) : (data.notes || []),
      summary: updated?.summaryPoints ? parseStringArray(updated.summaryPoints) : (data.summary || []),
      questionsCount: updated?.questionsCount ?? data.questionsCount,
      assessmentId: updated?.assessmentId ?? data.assessmentId,
      lastSavedAt: updated?.updatedAt || new Date().toISOString(),
    }
  },

  async saveLessonEditor(data: LessonEditorData): Promise<LessonEditorData> {
    return this.saveLessonContent(data)
  },

  async transitionLesson(
    lessonId: string,
    action: 'submit-review' | 'approve' | 'publish' | 'unpublish' | 'request-changes' | 'archive' | 'reactivate',
    rowVersion?: string,
    reason?: string
  ): Promise<{ status: ContentStatus; rowVersion?: string; updatedAt: string }> {
    if (!getAccessToken()) {
      throw new Error('Yêu cầu đăng nhập để thực hiện thao tác quy trình bài học.')
    }
    const res = await apiClient.post<any>(`/api/v1/content/lessons/${lessonId}/${action}`, {
      rowVersion,
      reason,
    })
    return {
      status: res?.status || 'draft',
      rowVersion: res?.rowVersion,
      updatedAt: res?.updatedAt || new Date().toISOString(),
    }
  },

  async submitLessonReview(lessonId: string, rowVersion?: string): Promise<{ status: ContentStatus; rowVersion?: string; updatedAt: string }> {
    return this.transitionLesson(lessonId, 'submit-review', rowVersion)
  },

  async approveLesson(lessonId: string, rowVersion?: string): Promise<{ status: ContentStatus; rowVersion?: string; updatedAt: string }> {
    return this.transitionLesson(lessonId, 'approve', rowVersion)
  },

  async publishLesson(lessonId: string, rowVersion?: string): Promise<{ status: ContentStatus; rowVersion?: string; updatedAt: string }> {
    return this.transitionLesson(lessonId, 'publish', rowVersion)
  },

  async unpublishLesson(lessonId: string, rowVersion?: string): Promise<{ status: ContentStatus; rowVersion?: string; updatedAt: string }> {
    return this.transitionLesson(lessonId, 'unpublish', rowVersion)
  },

  async requestLessonChanges(lessonId: string, rowVersion?: string, reason?: string): Promise<{ status: ContentStatus; rowVersion?: string; updatedAt: string }> {
    return this.transitionLesson(lessonId, 'request-changes', rowVersion, reason)
  },

  async archiveLesson(lessonId: string, rowVersion?: string, reason?: string): Promise<{ status: ContentStatus; rowVersion?: string; updatedAt: string }> {
    return this.transitionLesson(lessonId, 'archive', rowVersion, reason)
  },

  async reactivateLesson(lessonId: string, rowVersion?: string): Promise<{ status: ContentStatus; rowVersion?: string; updatedAt: string }> {
    return this.transitionLesson(lessonId, 'reactivate', rowVersion)
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
    operationsService._resetMockState()
  },

  async getLessonComposition(lessonId: string): Promise<import('@/types/content').LessonComposition> {
    return apiClient.get(`/api/v1/content/lessons/${lessonId}/composition`)
  },

  async replaceLessonComposition(
    lessonId: string,
    payload: {
      rowVersion?: string
      blocks: import('@/types/content').LessonContentBlock[]
      objectiveIds: string[]
      knowledgeUnitIds: string[]
      skillIds: string[]
      prerequisiteLessonIds: string[]
      reason?: string
    }
  ): Promise<import('@/types/content').LessonComposition> {
    return apiClient.put(`/api/v1/content/lessons/${lessonId}/composition`, payload)
  },

  async getLessonRevisions(lessonId: string, page = 1, pageSize = 20): Promise<import('@/types/content').LessonRevisionPage> {
    return apiClient.get(`/api/v1/content/lessons/${lessonId}/revisions?page=${page}&pageSize=${pageSize}`)
  },

  async rollbackLessonRevision(
    lessonId: string,
    revisionId: string,
    payload: { rowVersion?: string; reason?: string }
  ): Promise<import('@/types/content').LessonComposition> {
    return apiClient.post(`/api/v1/content/lessons/${lessonId}/revisions/${revisionId}/rollback`, payload)
  },

  async listCurriculumObjectives(curriculumId: string, search?: string): Promise<import('@/types/content').CurriculumNodeRef[]> {
    const q = search ? `?search=${encodeURIComponent(search)}` : ''
    return apiClient.get(`/api/v1/content/curricula/${curriculumId}/objectives${q}`)
  },

  async createCurriculumObjective(
    curriculumId: string,
    payload: { code: string; title: string; description?: string; cognitiveLevel?: string }
  ): Promise<import('@/types/content').CurriculumNodeRef> {
    return apiClient.post(`/api/v1/content/curricula/${curriculumId}/objectives`, payload)
  },

  async listCurriculumKnowledgeUnits(curriculumId: string, search?: string): Promise<import('@/types/content').CurriculumNodeRef[]> {
    const q = search ? `?search=${encodeURIComponent(search)}` : ''
    return apiClient.get(`/api/v1/content/curricula/${curriculumId}/knowledge-units${q}`)
  },

  async createCurriculumKnowledgeUnit(
    curriculumId: string,
    payload: { code: string; title: string; description?: string }
  ): Promise<import('@/types/content').CurriculumNodeRef> {
    return apiClient.post(`/api/v1/content/curricula/${curriculumId}/knowledge-units`, payload)
  },

  async listCurriculumSkills(curriculumId: string, search?: string): Promise<import('@/types/content').CurriculumNodeRef[]> {
    const q = search ? `?search=${encodeURIComponent(search)}` : ''
    return apiClient.get(`/api/v1/content/curricula/${curriculumId}/skills${q}`)
  },

  async createCurriculumSkill(
    curriculumId: string,
    payload: { code: string; title: string; description?: string }
  ): Promise<import('@/types/content').CurriculumNodeRef> {
    return apiClient.post(`/api/v1/content/curricula/${curriculumId}/skills`, payload)
  },

  async listCurriculumLessons(curriculumId: string, excludeLessonId?: string): Promise<import('@/types/content').PrerequisiteLessonRef[]> {
    const q = excludeLessonId ? `?excludeLessonId=${encodeURIComponent(excludeLessonId)}` : ''
    return apiClient.get(`/api/v1/content/curricula/${curriculumId}/lessons${q}`)
  },

  async publishCurriculumNode(
    curriculumId: string,
    nodeType: 'objectives' | 'knowledge-units' | 'skills',
    nodeId: string
  ): Promise<import('@/types/content').CurriculumNodeRef> {
    return apiClient.post(`/api/v1/content/curricula/${curriculumId}/${nodeType}/${nodeId}/publish`, {})
  },
}

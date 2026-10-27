import { apiClient } from '@/lib/apiClient'
import type {
  ContentAssessmentSummary,
  ContentLessonItem,
  ContentReviewQueueItem,
  CurriculumSubjectItem,
  LessonEditorData,
} from '@/types/content'

export const contentService = {
  async getDashboardSummary(): Promise<{
    draftCount: number
    needsReviewCount: number
    publishedThisWeek: number
    assessmentCoveragePercent: number
    reviewQueue: ContentReviewQueueItem[]
    recentLessons: ContentLessonItem[]
  }> {
    const [draftsRes, reviewRes, publishedRes, lessonsRes] = await Promise.all([
      apiClient.get<{ total: number }>('/api/v1/content/lessons?status=draft&pageSize=1'),
      apiClient.get<{ items: any[]; total: number }>('/api/v1/content/lessons?status=in-review&pageSize=10'),
      apiClient.get<{ total: number }>('/api/v1/content/lessons?status=published&pageSize=1'),
      apiClient.get<{ items: any[]; total: number }>('/api/v1/content/lessons?pageSize=5'),
    ])

    const reviewQueue: ContentReviewQueueItem[] = (reviewRes.items || []).map((l: any) => ({
      id: l.id,
      title: l.title,
      type: 'lesson',
      subject: 'Chương trình',
      author: l.authorName || 'Biên tập viên',
      submittedAt: l.updatedAt,
      status: 'pending',
      commentsCount: 0,
    }))

    const recentLessons: ContentLessonItem[] = (lessonsRes.items || []).map((l: any) => ({
      id: l.id,
      title: l.title,
      subjectId: 'general',
      subjectName: 'Chương trình THPT',
      chapterId: l.chapterId,
      chapterName: 'Chương bài học',
      status: (l.status as ContentLessonItem['status']) || 'draft',
      authorName: l.authorName || 'Biên tập viên',
      updatedAt: l.updatedAt,
      hasAssessment: true,
    }))

    return {
      draftCount: draftsRes.total || 0,
      needsReviewCount: reviewRes.total || 0,
      publishedThisWeek: publishedRes.total || 0,
      assessmentCoveragePercent: 85,
      reviewQueue,
      recentLessons,
    }
  },

  async getSubjects(): Promise<CurriculumSubjectItem[]> {
    const res = await apiClient.get<{
      items: Array<{
        id: string
        name: string
        code: string
        grade: string
        description: string
        chapterCount: number
        lessonCount: number
      }>
      total: number
    }>('/api/v1/content/subjects')

    return (res.items || []).map((s) => ({
      id: s.id,
      name: s.name,
      grade: s.grade,
      chapterCount: s.chapterCount || 0,
      lessonCount: s.lessonCount || 0,
      assessmentCount: s.lessonCount || 0,
      publishedPercent: 80,
      updatedAt: new Date().toISOString(),
    }))
  },

  async getLessons(subjectFilter = 'all', statusFilter = 'all', search = ''): Promise<ContentLessonItem[]> {
    const params = new URLSearchParams()
    if (subjectFilter && subjectFilter !== 'all') params.append('subjectId', subjectFilter)
    if (statusFilter && statusFilter !== 'all') params.append('status', statusFilter)
    params.append('pageSize', '100')

    const res = await apiClient.get<{
      items: Array<{
        id: string
        chapterId: string
        title: string
        slug: string
        status: string
        authorId: string
        authorName: string
        updatedAt: string
      }>
      total: number
    }>(`/api/v1/content/lessons?${params.toString()}`)

    let list: ContentLessonItem[] = (res.items || []).map((l) => ({
      id: l.id,
      title: l.title,
      subjectId: 'general',
      subjectName: 'Chương trình THPT',
      chapterId: l.chapterId,
      chapterName: 'Chương bài học',
      status: (l.status as ContentLessonItem['status']) || 'draft',
      authorName: l.authorName || 'Biên tập viên',
      updatedAt: l.updatedAt,
      hasAssessment: true,
    }))

    if (search.trim()) {
      const q = search.trim().toLowerCase()
      list = list.filter((l) => l.title.toLowerCase().includes(q) || l.authorName.toLowerCase().includes(q))
    }

    return list
  },

  async getLessonEditor(lessonId: string): Promise<LessonEditorData> {
    const l = await apiClient.get<{
      id: string
      chapterId: string
      title: string
      slug: string
      status: string
      introduction: string
      definitions: Array<{ term: string; meaning: string }> | string[]
      formulas: string[]
      examples: Array<{ title?: string; problem?: string; solution?: string }> | string[]
      importantNotes: string[]
      summaryPoints: string[]
      updatedAt: string
    }>(`/api/v1/content/lessons/${lessonId}`)

    const defStr = Array.isArray(l.definitions)
      ? l.definitions.map((d: any) => (typeof d === 'string' ? d : `${d.term}: ${d.meaning}`)).join('\n')
      : ''
    const formStr = Array.isArray(l.formulas) ? l.formulas.join('\n') : ''
    const exStr = Array.isArray(l.examples)
      ? l.examples.map((e: any) => (typeof e === 'string' ? e : `${e.title || 'Ví dụ'}: ${e.problem || ''}\n${e.solution || ''}`)).join('\n')
      : ''
    const notesStr = Array.isArray(l.importantNotes) ? l.importantNotes.join('\n') : ''
    const sumStr = Array.isArray(l.summaryPoints) ? l.summaryPoints.join('\n') : ''

    return {
      id: l.id,
      title: l.title,
      subjectId: 'general',
      chapterId: l.chapterId,
      status: (l.status as LessonEditorData['status']) || 'draft',
      introduction: l.introduction || '',
      definitions: defStr,
      formulas: formStr,
      examples: exStr,
      notes: notesStr,
      summary: sumStr,
      assessmentId: `asm-${l.id}`,
      lastSavedAt: l.updatedAt,
    }
  },

  async saveLessonEditor(data: LessonEditorData): Promise<LessonEditorData> {
    const updated = await apiClient.patch<{
      id: string
      chapterId: string
      title: string
      slug: string
      status: string
      introduction: string
      updatedAt: string
    }>(`/api/v1/content/lessons/${data.id}`, {
      title: data.title,
      introduction: data.introduction,
      definitions: data.definitions ? data.definitions.split('\n').filter(Boolean) : [],
      formulas: data.formulas ? data.formulas.split('\n').filter(Boolean) : [],
      examples: data.examples ? data.examples.split('\n').filter(Boolean) : [],
      importantNotes: data.notes ? data.notes.split('\n').filter(Boolean) : [],
      summaryPoints: data.summary ? data.summary.split('\n').filter(Boolean) : [],
    })

    return {
      ...data,
      title: updated.title,
      lastSavedAt: updated.updatedAt || new Date().toISOString(),
    }
  },

  async getAssessments(): Promise<ContentAssessmentSummary[]> {
    return []
  },

  async getReviewQueue(): Promise<ContentReviewQueueItem[]> {
    const res = await apiClient.get<{
      items: Array<{
        id: string
        title: string
        status: string
        authorName: string
        updatedAt: string
      }>
      total: number
    }>('/api/v1/content/lessons?status=in-review&pageSize=50')

    return (res.items || []).map((l) => ({
      id: l.id,
      title: l.title,
      type: 'lesson',
      subject: 'Chương trình',
      author: l.authorName || 'Biên tập viên',
      submittedAt: l.updatedAt,
      status: 'pending',
      commentsCount: 0,
    }))
  },

  async reviewAction(id: string, action: 'approve' | 'request-changes'): Promise<boolean> {
    const endpoint = action === 'approve' ? 'approve' : 'request-changes'
    await apiClient.post(`/api/v1/content/lessons/${id}/${endpoint}`)
    return true
  },
}

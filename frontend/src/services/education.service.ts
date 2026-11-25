import type {
  AdminTeacherItem,
  AssessmentQuestionItem,
  CurriculumAssessmentItem,
  CurriculumChapterItem,
  CurriculumLessonItem,
  CurriculumSubjectItem,
  CurriculumTopicItem,
  CurriculumLessonVideoItem,
  LearningReportsData,
} from '@/types/education'
import type { ContentStatus } from '@/types/content'
import { apiClient } from '@/lib/apiClient'
import { getAccessToken } from '@/auth/authSession'
import { resolveSubjectIcon } from '@/components/subjects/subjectIconUtils'

function assertAuthenticated(): void {
  if (!getAccessToken()) {
    throw new Error('Bạn cần đăng nhập tài khoản có thẩm quyền để truy cập dữ liệu này.')
  }
}

export const educationService = {
  // ── SUBJECTS ───────────────────────────────────────────────
  async getSubjects(): Promise<CurriculumSubjectItem[]> {
    assertAuthenticated()
    const res = await apiClient.get<{
      items: Array<{
        id: string
        name: string
        code: string
        grade: string
        description?: string
        isActive: boolean
        chapterCount: number
        lessonCount: number
        publishedLessonCount?: number
        publishedPercent?: number
        updatedAt: string
      }>
      total: number
    }>('/api/v1/content/subjects')

    if (res?.items && Array.isArray(res.items)) {
      return res.items.map((s) => ({
        id: s.id,
        name: s.name,
        code: s.code,
        grade: s.grade ? (s.grade.startsWith('Lớp') ? s.grade : `Lớp ${s.grade}`) : '',
        icon: resolveSubjectIcon(s.code, s.name, undefined, s.description),
        description: s.description || '',
        chapterCount: s.chapterCount || 0,
        lessonCount: s.lessonCount || 0,
        assessmentCount: 0,
        publishedPercent: typeof s.publishedPercent === 'number' ? s.publishedPercent : 0,
        status: s.isActive ? 'published' : 'draft',
        updatedAt: s.updatedAt,
      }))
    }
    throw new Error('API môn học trả dữ liệu không hợp lệ')
  },

  async getSubjectById(id: string): Promise<CurriculumSubjectItem | undefined> {
    assertAuthenticated()
    try {
      const s = await apiClient.get<{
        id: string
        name: string
        code: string
        grade: string
        description?: string
        isActive: boolean
        updatedAt: string
        chapters?: Array<{
          id: string
          lessons?: Array<{ id: string }>
        }>
      }>(`/api/v1/content/subjects/${id}`)

      if (s && s.id) {
        const chapterCount = s.chapters?.length || 0
        const lessonCount = s.chapters?.reduce((sum, ch) => sum + (ch.lessons?.length || 0), 0) || 0
        return {
          id: s.id,
          name: s.name,
          code: s.code,
          grade: s.grade ? (s.grade.startsWith('Lớp') ? s.grade : `Lớp ${s.grade}`) : '',
          icon: resolveSubjectIcon(s.code, s.name, undefined, s.description),
          description: s.description || '',
          chapterCount,
          lessonCount,
          assessmentCount: 0,
          publishedPercent: typeof (s as any).publishedPercent === 'number' ? (s as any).publishedPercent : 0,
          status: s.isActive ? 'published' : 'draft',
          updatedAt: s.updatedAt,
        }
      }
      return undefined
    } catch (err: any) {
      if (err?.response?.status === 404 || err?.status === 404) {
        return undefined
      }
      throw err
    }
  },

  async createSubject(
    input: Omit<CurriculumSubjectItem, 'id' | 'chapterCount' | 'lessonCount' | 'assessmentCount' | 'publishedPercent' | 'updatedAt'>
  ): Promise<CurriculumSubjectItem> {
    assertAuthenticated()
    const gradeNum = input.grade ? input.grade.replace(/[^0-9]/g, '') || '12' : '12'
    const created = await apiClient.post<{
      id: string
      name: string
      code: string
      grade: string
      description?: string
      isActive: boolean
      chapterCount: number
      lessonCount: number
      updatedAt: string
    }>('/api/v1/content/subjects', {
      name: input.name.trim(),
      code: input.code.trim().toUpperCase(),
      grade: gradeNum,
      description: input.description?.trim(),
      isActive: input.status === 'published',
    })

    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('study_ai_education_change'))
    }
    return {
      id: created.id,
      name: created.name,
      code: created.code,
      grade: created.grade ? (created.grade.startsWith('Lớp') ? created.grade : `Lớp ${created.grade}`) : '',
      icon: resolveSubjectIcon(created.code, created.name, input.icon, created.description),
      description: created.description || '',
      chapterCount: created.chapterCount || 0,
      lessonCount: created.lessonCount || 0,
      assessmentCount: 0,
      publishedPercent: typeof (created as any).publishedPercent === 'number' ? (created as any).publishedPercent : 0,
      status: created.isActive ? 'published' : 'draft',
      updatedAt: created.updatedAt,
    }
  },

  async updateSubject(
    id: string,
    updates: Partial<CurriculumSubjectItem>
  ): Promise<CurriculumSubjectItem | undefined> {
    assertAuthenticated()
    const body: Record<string, any> = {}
    if (updates.name !== undefined) body.name = updates.name.trim()
    if (updates.code !== undefined) body.code = updates.code.trim().toUpperCase()
    if (updates.grade !== undefined) body.grade = updates.grade.replace(/[^0-9]/g, '')
    if (updates.description !== undefined) body.description = updates.description.trim()
    if (updates.status !== undefined) body.isActive = updates.status === 'published'

    const updated = await apiClient.patch<{
      id: string
      name: string
      code: string
      grade: string
      description?: string
      isActive: boolean
      chapterCount: number
      lessonCount: number
      updatedAt: string
    }>(`/api/v1/content/subjects/${id}`, body)

    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('study_ai_education_change'))
    }
    return {
      id: updated.id,
      name: updated.name,
      code: updated.code,
      grade: updated.grade ? (updated.grade.startsWith('Lớp') ? updated.grade : `Lớp ${updated.grade}`) : '',
      icon: resolveSubjectIcon(updated.code, updated.name, updates.icon, updated.description),
      description: updated.description || '',
      chapterCount: updated.chapterCount || 0,
      lessonCount: updated.lessonCount || 0,
      assessmentCount: 0,
      publishedPercent: typeof (updated as any).publishedPercent === 'number' ? (updated as any).publishedPercent : 0,
      status: updated.isActive ? 'published' : 'draft',
      updatedAt: updated.updatedAt,
    }
  },

  async deleteSubject(id: string): Promise<boolean> {
    assertAuthenticated()
    await apiClient.delete(`/api/v1/content/subjects/${id}`)
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('study_ai_education_change'))
    }
    return true
  },

  // ── CHAPTERS ───────────────────────────────────────────────
  async getChapters(subjectId?: string): Promise<CurriculumChapterItem[]> {
    assertAuthenticated()
    const queryParams = new URLSearchParams()
    if (subjectId && subjectId !== 'all') {
      queryParams.set('subjectId', subjectId)
    }
    const qs = queryParams.toString() ? `?${queryParams.toString()}` : ''
    const res = await apiClient.get<{
      items: Array<{
        id: string
        subjectId: string
        subjectName: string
        title: string
        description?: string
        orderIndex: number
        isActive: boolean
        lessonCount: number
        createdAt: string
        updatedAt: string
      }>
      total: number
    }>(`/api/v1/content/chapters${qs}`)

    if (res?.items && Array.isArray(res.items)) {
      return res.items.map((c) => ({
        id: c.id,
        subjectId: c.subjectId,
        subjectName: c.subjectName,
        title: c.title,
        description: c.description || '',
        order: c.orderIndex,
        lessonsCount: c.lessonCount,
        status: c.isActive ? 'published' : 'draft',
        updatedAt: c.updatedAt,
      }))
    }
    return []
  },

  async getChapterById(id: string): Promise<CurriculumChapterItem | undefined> {
    assertAuthenticated()
    try {
      const c = await apiClient.get<{
        id: string
        subjectId: string
        subjectName: string
        title: string
        description?: string
        orderIndex: number
        isActive: boolean
        lessonCount: number
        createdAt: string
        updatedAt: string
      }>(`/api/v1/content/chapters/${id}`)

      if (c?.id) {
        return {
          id: c.id,
          subjectId: c.subjectId,
          subjectName: c.subjectName,
          title: c.title,
          description: c.description || '',
          order: c.orderIndex,
          lessonsCount: c.lessonCount,
          status: c.isActive ? 'published' : 'draft',
          updatedAt: c.updatedAt,
        }
      }
      return undefined
    } catch (err: any) {
      if (err?.response?.status === 404 || err?.status === 404) {
        return undefined
      }
      throw err
    }
  },

  async createChapter(
    input: Omit<CurriculumChapterItem, 'id' | 'lessonsCount' | 'updatedAt'>
  ): Promise<CurriculumChapterItem> {
    assertAuthenticated()
    const res = await apiClient.post<{
      id: string
      subjectId: string
      subjectName: string
      title: string
      description?: string
      orderIndex: number
      isActive: boolean
      lessonCount: number
      createdAt: string
      updatedAt: string
    }>('/api/v1/content/chapters', {
      subjectId: input.subjectId,
      title: input.title,
      description: input.description ?? '',
      orderIndex: input.order || 1,
      isActive: input.status === 'published',
    })
    if (res?.id) {
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('study_ai_education_change'))
      }
      return {
        id: res.id,
        subjectId: res.subjectId,
        subjectName: res.subjectName,
        title: res.title,
        description: res.description ?? '',
        order: res.orderIndex,
        lessonsCount: res.lessonCount,
        status: res.isActive ? 'published' : 'draft',
        updatedAt: res.updatedAt,
      }
    }
    throw new Error('API tạo chương học không trả về kết quả hợp lệ.')
  },

  async updateChapter(
    id: string,
    updates: Partial<CurriculumChapterItem>
  ): Promise<CurriculumChapterItem | undefined> {
    assertAuthenticated()
    const payload: Record<string, any> = {}
    if (updates.title !== undefined) payload.title = updates.title
    if (updates.description !== undefined) payload.description = updates.description
    if (updates.order !== undefined) payload.orderIndex = updates.order
    if (updates.status !== undefined) payload.isActive = updates.status === 'published'

    const res = await apiClient.patch<{
      id: string
      subjectId: string
      subjectName: string
      title: string
      description?: string
      orderIndex: number
      isActive: boolean
      lessonCount: number
      createdAt: string
      updatedAt: string
    }>(`/api/v1/content/chapters/${id}`, payload)
    if (res?.id) {
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('study_ai_education_change'))
      }
      return {
        id: res.id,
        subjectId: res.subjectId,
        subjectName: res.subjectName,
        title: res.title,
        description: res.description ?? '',
        order: res.orderIndex,
        lessonsCount: res.lessonCount,
        status: res.isActive ? 'published' : 'draft',
        updatedAt: res.updatedAt,
      }
    }
    throw new Error('API cập nhật chương học không trả về kết quả hợp lệ.')
  },

  async deleteChapter(id: string): Promise<boolean> {
    assertAuthenticated()
    await apiClient.delete(`/api/v1/content/chapters/${id}`)
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('study_ai_education_change'))
    }
    return true
  },

  async reorderChapters(subjectId: string, orderedIds: string[]): Promise<CurriculumChapterItem[]> {
    assertAuthenticated()
    await apiClient.post('/api/v1/content/chapters/reorder', {
      subjectId,
      chapterIds: orderedIds,
    })
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('study_ai_education_change'))
    }
    return this.getChapters(subjectId)
  },

  // ── TOPICS ─────────────────────────────────────────────────
  async getTopics(chapterId?: string, search?: string): Promise<CurriculumTopicItem[]> {
    assertAuthenticated()
    const params = new URLSearchParams()
    if (chapterId && chapterId !== 'all') params.set('chapterId', chapterId)
    if (search?.trim()) params.set('search', search.trim())
    const qs = params.toString() ? `?${params.toString()}` : ''
    const res = await apiClient.get<{
      items: CurriculumTopicItem[]
      total: number
    }>(`/api/v1/content/topics${qs}`)
    if (res?.items && Array.isArray(res.items)) {
      return res.items
    }
    return []
  },

  async createTopic(input: {
    chapterId: string
    title: string
    description?: string
    orderIndex?: number
    isActive?: boolean
  }): Promise<CurriculumTopicItem | null> {
    assertAuthenticated()
    const res = await apiClient.post<CurriculumTopicItem>('/api/v1/content/topics', {
      chapterId: input.chapterId,
      title: input.title,
      description: input.description || '',
      orderIndex: input.orderIndex || 1,
      isActive: input.isActive ?? true,
    })
    return res
  },

  async updateTopic(
    id: string,
    updates: {
      title?: string
      description?: string
      orderIndex?: number
      isActive?: boolean
    }
  ): Promise<CurriculumTopicItem | null> {
    assertAuthenticated()
    const res = await apiClient.patch<CurriculumTopicItem>(`/api/v1/content/topics/${id}`, updates)
    return res
  },

  async deleteTopic(id: string): Promise<boolean> {
    assertAuthenticated()
    await apiClient.delete(`/api/v1/content/topics/${id}`)
    return true
  },

  // ── LESSON VIDEOS ──────────────────────────────────────────
  async getLessonVideos(lessonId: string): Promise<CurriculumLessonVideoItem[]> {
    assertAuthenticated()
    const res = await apiClient.get<{
      items: CurriculumLessonVideoItem[]
      total: number
    }>(`/api/v1/content/lessons/${lessonId}/videos`)
    if (res?.items && Array.isArray(res.items)) {
      return res.items
    }
    return []
  },

  async addLessonVideo(
    lessonId: string,
    data: {
      title: string
      sourceUrl: string
      description?: string
      provider?: string
      sortOrder?: number
      isPublished?: boolean
      embedAllowed?: boolean
      language?: string
    }
  ): Promise<CurriculumLessonVideoItem | null> {
    assertAuthenticated()
    const res = await apiClient.post<CurriculumLessonVideoItem>(
      `/api/v1/content/lessons/${lessonId}/videos`,
      {
        title: data.title,
        sourceUrl: data.sourceUrl,
        description: data.description,
        provider: data.provider,
        sortOrder: data.sortOrder || 1,
        isPublished: data.isPublished ?? true,
        embedAllowed: data.embedAllowed ?? true,
        language: data.language || 'vi',
      }
    )
    return res
  },

  async updateLessonVideo(
    videoId: string,
    data: Partial<{
      title: string
      sourceUrl: string
      description?: string
      provider?: string
      sortOrder?: number
      isPublished?: boolean
      embedAllowed?: boolean
      language?: string
    }>
  ): Promise<CurriculumLessonVideoItem | null> {
    assertAuthenticated()
    const res = await apiClient.patch<CurriculumLessonVideoItem>(
      `/api/v1/content/videos/${videoId}`,
      data
    )
    return res
  },

  async deleteLessonVideo(videoId: string): Promise<boolean> {
    assertAuthenticated()
    await apiClient.delete(`/api/v1/content/videos/${videoId}`)
    return true
  },

  // ── LESSONS ────────────────────────────────────────────────
  async getLessons(filter?: {
    subjectId?: string
    chapterId?: string
    topicId?: string
    status?: string
    search?: string
    page?: number
    pageSize?: number
  }): Promise<CurriculumLessonItem[]> {
    assertAuthenticated()
    const params = new URLSearchParams()
    if (filter?.subjectId && filter.subjectId !== 'all') params.set('subjectId', filter.subjectId)
    if (filter?.chapterId && filter.chapterId !== 'all') params.set('chapterId', filter.chapterId)
    if (filter?.topicId && filter.topicId !== 'all') params.set('topicId', filter.topicId)
    if (filter?.status && filter.status !== 'all') params.set('status', filter.status)
    if (filter?.search?.trim()) params.set('search', filter.search.trim())
    params.set('page', String(filter?.page || 1))
    params.set('pageSize', String(filter?.pageSize || 100))

    const res = await apiClient.get<{
      items: Array<{
        id: string
        subjectId: string
        subjectName: string
        chapterId: string
        chapterTitle: string
        topicId?: string | null
        topicTitle?: string | null
        title: string
        slug: string
        orderIndex: number
        status: ContentStatus
        difficulty?: string
        estimatedMinutes?: number
        authorName?: string
        questionCount: number
        videoCount?: number
        createdAt: string
        updatedAt: string
      }>
      total: number
    }>(`/api/v1/content/lessons?${params.toString()}`)

    if (res?.items && Array.isArray(res.items)) {
      return res.items.map((l) => ({
        id: l.id,
        title: l.title,
        subjectId: l.subjectId,
        subjectName: l.subjectName,
        chapterId: l.chapterId,
        chapterName: l.chapterTitle,
        topicId: l.topicId || undefined,
        topicTitle: l.topicTitle || undefined,
        status: l.status,
        authorName: l.authorName || 'Quản trị viên',
        updatedAt: l.updatedAt,
        hasAssessment: l.questionCount > 0,
        order: l.orderIndex,
        videos: (l as any).videos || [],
        videoCount: (l as any).videos?.length ?? (l as any).videoCount ?? 0,
      }))
    }
    return []
  },

  async getLessonById(id: string): Promise<CurriculumLessonItem | undefined> {
    assertAuthenticated()
    try {
      const res = await apiClient.get<{
        id: string
        chapterId: string
        chapterTitle: string
        subjectId: string
        subjectName: string
        topicId?: string | null
        topicTitle?: string | null
        title: string
        slug: string
        orderIndex: number
        status: ContentStatus
        authorName?: string
        updatedAt: string
        questions?: any[]
      }>(`/api/v1/content/lessons/${id}`)

      if (res?.id) {
        return {
          id: res.id,
          title: res.title,
          subjectId: res.subjectId,
          subjectName: res.subjectName,
          chapterId: res.chapterId,
          chapterName: res.chapterTitle,
          topicId: res.topicId || undefined,
          topicTitle: res.topicTitle || undefined,
          status: res.status,
          authorName: res.authorName || 'Quản trị viên',
          updatedAt: res.updatedAt,
          hasAssessment: (res.questions?.length ?? 0) > 0,
          order: res.orderIndex,
        }
      }
      return undefined
    } catch (err: any) {
      if (err?.response?.status === 404 || err?.status === 404) {
        return undefined
      }
      throw err
    }
  },

  async createLesson(
    input: Omit<CurriculumLessonItem, 'id' | 'updatedAt'>
  ): Promise<CurriculumLessonItem> {
    assertAuthenticated()
    const res = await apiClient.post<{
      id: string
      chapterId: string
      chapterTitle: string
      subjectId: string
      subjectName: string
      topicId?: string | null
      topicTitle?: string | null
      title: string
      slug: string
      orderIndex: number
      status: ContentStatus
      authorName?: string
      updatedAt: string
    }>('/api/v1/content/lessons', {
      chapterId: input.chapterId,
      topicId: input.topicId || null,
      title: input.title,
      slug: input.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').slice(0, 40),
      orderIndex: input.order || 1,
      introduction: '',
    })

    if (res?.id) {
      return {
        id: res.id,
        title: res.title,
        subjectId: res.subjectId,
        subjectName: res.subjectName,
        chapterId: res.chapterId,
        chapterName: res.chapterTitle,
        topicId: res.topicId || undefined,
        topicTitle: res.topicTitle || undefined,
        status: res.status,
        authorName: res.authorName || 'Quản trị viên',
        updatedAt: res.updatedAt,
        hasAssessment: false,
        order: res.orderIndex,
      }
    }
    throw new Error('API tạo bài học không trả về kết quả hợp lệ.')
  },

  async updateLesson(
    id: string,
    updates: Partial<CurriculumLessonItem>
  ): Promise<CurriculumLessonItem | undefined> {
    assertAuthenticated()
    const res = await apiClient.patch<{
      id: string
      chapterId: string
      chapterTitle: string
      subjectId: string
      subjectName: string
      topicId?: string | null
      topicTitle?: string | null
      title: string
      slug: string
      orderIndex: number
      status: ContentStatus
      authorName?: string
      updatedAt: string
    }>(`/api/v1/content/lessons/${id}`, {
      title: updates.title,
      chapterId: updates.chapterId,
      topicId: updates.topicId,
      orderIndex: updates.order,
      status: updates.status,
    })

    if (res?.id) {
      return {
        id: res.id,
        title: res.title,
        subjectId: res.subjectId,
        subjectName: res.subjectName,
        chapterId: res.chapterId,
        chapterName: res.chapterTitle,
        topicId: res.topicId || undefined,
        topicTitle: res.topicTitle || undefined,
        status: res.status,
        authorName: res.authorName || 'Quản trị viên',
        updatedAt: res.updatedAt,
        hasAssessment: updates.hasAssessment ?? false,
        order: res.orderIndex,
      }
    }
    throw new Error('API cập nhật bài học không trả về kết quả hợp lệ.')
  },

  async deleteLesson(id: string): Promise<boolean> {
    assertAuthenticated()
    await apiClient.delete(`/api/v1/content/lessons/${id}`)
    return true
  },

  async changeLessonStatus(id: string, status: ContentStatus): Promise<CurriculumLessonItem | undefined> {
    return this.updateLesson(id, { status })
  },

  // ── ASSESSMENTS ────────────────────────────────────────────
  async getAssessments(filter?: {
    subjectId?: string
    status?: string
    search?: string
    lessonId?: string
  }): Promise<CurriculumAssessmentItem[]> {
    assertAuthenticated()
    const query = new URLSearchParams()
    if (filter?.subjectId && filter.subjectId !== 'all') query.set('subjectId', filter.subjectId)
    if (filter?.status && filter.status !== 'all') query.set('status', filter.status)
    if (filter?.search?.trim()) query.set('search', filter.search.trim())
    if (filter?.lessonId) query.set('lessonId', filter.lessonId)
    const res = await apiClient.get<CurriculumAssessmentItem[]>(`/api/v1/content/assessments?${query.toString()}`)
    return res || []
  },

  async getAssessmentById(id: string): Promise<CurriculumAssessmentItem | undefined> {
    assertAuthenticated()
    const res = await apiClient.get<CurriculumAssessmentItem>(`/api/v1/content/assessments/${id}`)
    return res || undefined
  },

  async createAssessment(
    input: Omit<CurriculumAssessmentItem, 'id' | 'updatedAt'>
  ): Promise<CurriculumAssessmentItem> {
    assertAuthenticated()
    const payload = {
      lessonId: input.lessonId,
      title: input.lessonTitle ? `Bài kiểm tra: ${input.lessonTitle}` : undefined,
      passingScore: input.passingScore,
      durationMinutes: input.durationMinutes,
      status: input.status,
    }
    return apiClient.post<CurriculumAssessmentItem>('/api/v1/content/assessments', payload)
  },

  async updateAssessment(
    id: string,
    updates: Partial<CurriculumAssessmentItem>
  ): Promise<CurriculumAssessmentItem | undefined> {
    assertAuthenticated()
    const payload = {
      title: updates.lessonTitle,
      passingScore: updates.passingScore,
      durationMinutes: updates.durationMinutes,
      status: updates.status,
    }
    return apiClient.put<CurriculumAssessmentItem>(`/api/v1/content/assessments/${id}`, payload)
  },

  async deleteAssessment(id: string): Promise<boolean> {
    assertAuthenticated()
    await apiClient.delete(`/api/v1/content/assessments/${id}`)
    return true
  },

  async changeAssessmentStatus(id: string, status: ContentStatus): Promise<CurriculumAssessmentItem | undefined> {
    assertAuthenticated()
    return apiClient.put<CurriculumAssessmentItem>(`/api/v1/content/assessments/${id}/status`, { status })
  },

  async addQuestionToAssessment(
    assessmentId: string,
    question: Omit<AssessmentQuestionItem, 'id'>
  ): Promise<CurriculumAssessmentItem | undefined> {
    assertAuthenticated()
    return apiClient.post<CurriculumAssessmentItem>(`/api/v1/content/assessments/${assessmentId}/questions`, question)
  },

  // ── TEACHERS ───────────────────────────────────────────────
  async getTeachers(filter?: {
    subject?: string
    status?: string
    search?: string
  }): Promise<AdminTeacherItem[]> {
    assertAuthenticated()
    const queryParams = new URLSearchParams()
    if (filter?.search?.trim()) queryParams.set('search', filter.search.trim())
    if (filter?.status && filter.status !== 'all') queryParams.set('status', filter.status)
    if (filter?.subject && filter.subject !== 'all') queryParams.set('subject', filter.subject)

    const res = await apiClient.get<AdminTeacherItem[]>(`/api/v1/admin/teachers?${queryParams.toString()}`)
    if (Array.isArray(res)) {
      return res
    }
    return []
  },

  async getTeacherById(id: string): Promise<AdminTeacherItem | undefined> {
    const teachers = await this.getTeachers()
    return teachers.find((t) => t.id === id)
  },

  async saveTeacher(data: {
    name: string
    email: string
    phone?: string
    subject: string
    classes?: string[]
    status?: 'active' | 'pending' | 'inactive'
    qualifications?: string
    experienceYears?: number
    bio?: string
    password?: string
  }): Promise<AdminTeacherItem & { _persistedLocally?: boolean }> {
    assertAuthenticated()
    const res = await apiClient.post<AdminTeacherItem>('/api/v1/admin/teachers', data)
    if (res?.id) {
      return { ...res, _persistedLocally: false }
    }
    throw new Error('Máy chủ không thể tạo tài khoản giáo viên.')
  },

  async updateTeacher(id: string, updates: Partial<AdminTeacherItem>): Promise<AdminTeacherItem> {
    assertAuthenticated()
    const res = await apiClient.patch<AdminTeacherItem>(`/api/v1/admin/teachers/${id}`, updates)
    if (res?.id) {
      return res
    }
    throw new Error('Cập nhật thông tin giáo viên không thành công.')
  },

  async setTeacherStatus(id: string, status: 'active' | 'pending' | 'inactive'): Promise<AdminTeacherItem> {
    return this.updateTeacher(id, { status })
  },

  async toggleTeacherLock(id: string): Promise<AdminTeacherItem> {
    const teacher = await this.getTeacherById(id)
    if (!teacher) throw new Error(`Teacher with id ${id} not found`)
    const nextAccountStatus = teacher.accountStatus === 'LOCKED' ? 'ACTIVE' : 'LOCKED'
    const nextStatus = nextAccountStatus === 'LOCKED' ? 'suspended' : 'active'
    return this.updateTeacher(id, { accountStatus: nextAccountStatus, status: nextStatus as any })
  },

  async deleteTeacher(id: string): Promise<boolean> {
    assertAuthenticated()
    await apiClient.delete(`/api/v1/admin/teachers/${id}`)
    return true
  },

  async getTeacherKPIs(): Promise<{
    totalTeachers: number
    activeTeaching: number
    pendingOrLeave: number
    newTeachers: number
  }> {
    assertAuthenticated()
    const res = await apiClient.get<{
      totalTeachers: number
      activeTeaching: number
      pendingOrLeave: number
      newTeachers: number
    }>('/api/v1/admin/teachers/kpis')
    if (res) return res
    throw new Error('Không thể tải KPI giáo viên từ máy chủ.')
  },

  // ── LEARNING REPORTS ───────────────────────────────────────
  async getReports(filter?: {
    timeframe?: string
    subjectId?: string
    classId?: string
  }): Promise<LearningReportsData> {
    assertAuthenticated()
    const queryParams = new URLSearchParams()
    if (filter?.timeframe) queryParams.set('timeframe', filter.timeframe)
    if (filter?.subjectId) queryParams.set('subjectId', filter.subjectId)
    if (filter?.classId) queryParams.set('classId', filter.classId)

    const res = await apiClient.get<any>(`/api/v1/admin/reports?${queryParams.toString()}`)
    if (res && res.totalLearners !== undefined) {
      return {
        ...res,
        activityTrend: (res.activityTrend || []).map((item: any) => ({
          ...item,
          lessonsCompleted: item.lessonsCompleted ?? item.completedLessons ?? 0,
          completedLessons: item.completedLessons ?? item.lessonsCompleted ?? 0,
        })),
      }
    }
    throw new Error('Dữ liệu báo cáo học tập trả về từ máy chủ không hợp lệ.')
  },
}

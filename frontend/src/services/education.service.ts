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
import {
  INITIAL_SUBJECTS,
  INITIAL_CHAPTERS,
  INITIAL_LESSONS,
  INITIAL_ASSESSMENTS,
  INITIAL_TEACHERS,
} from '@/data/mock/education.mock'

declare const process: { env?: { NODE_ENV?: string } } | undefined

const isTestEnvironment = (): boolean =>
  typeof process !== 'undefined' && process.env?.NODE_ENV === 'test' && !getAccessToken()

export const isEducationDemoMode = (): boolean => !getAccessToken()

const STORAGE_KEYS = {
  SUBJECTS: 'study_ai_education_subjects',
  CHAPTERS: 'study_ai_education_chapters',
  LESSONS: 'study_ai_education_lessons',
  ASSESSMENTS: 'study_ai_education_assessments',
  TEACHERS: 'study_ai_education_teachers',
}

function readStorage<T>(key: string, fallback: T): T {
  if (!isTestEnvironment()) {
    throw new Error('Bạn cần đăng nhập tài khoản quản trị nội dung để truy cập dữ liệu này.')
  }
  try {
    const raw = localStorage.getItem(key)
    if (!raw) return fallback
    return JSON.parse(raw) as T
  } catch {
    return fallback
  }
}

function writeStorage<T>(key: string, data: T): void {
  if (!isTestEnvironment()) {
    throw new Error('Không thể ghi dữ liệu quản trị vào bộ nhớ trình duyệt.')
  }
  try {
    localStorage.setItem(key, JSON.stringify(data))
  } catch {
    // ignore
  }
}

export const educationService = {
  // ── SUBJECTS ───────────────────────────────────────────────
  async getSubjects(): Promise<CurriculumSubjectItem[]> {
    if (getAccessToken()) {
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
          updatedAt: string
        }>
        total: number
      }>('/api/v1/content/subjects')

      if (res?.items && Array.isArray(res.items)) {
        return res.items.map((s) => ({
          id: s.id,
          name: s.name,
          code: s.code,
          grade: s.grade ? (s.grade.startsWith('Lớp') ? s.grade : `Lớp ${s.grade}`) : 'Lớp 12',
          icon: resolveSubjectIcon(s.code, s.name, undefined, s.description),
          description: s.description || '',
          chapterCount: s.chapterCount || 0,
          lessonCount: s.lessonCount || 0,
          assessmentCount: 0,
          publishedPercent: s.isActive ? 100 : 0,
          status: s.isActive ? 'published' : 'draft',
          updatedAt: s.updatedAt,
        }))
      }
      throw new Error('API môn học trả dữ liệu không hợp lệ')
    }
    return readStorage<CurriculumSubjectItem[]>(STORAGE_KEYS.SUBJECTS, INITIAL_SUBJECTS)
  },

  async getSubjectById(id: string): Promise<CurriculumSubjectItem | undefined> {
    if (getAccessToken()) {
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
            grade: s.grade ? (s.grade.startsWith('Lớp') ? s.grade : `Lớp ${s.grade}`) : 'Lớp 12',
            icon: resolveSubjectIcon(s.code, s.name, undefined, s.description),
            description: s.description || '',
            chapterCount,
            lessonCount,
            assessmentCount: 0,
            publishedPercent: s.isActive ? 100 : 0,
            status: s.isActive ? 'published' : 'draft',
            updatedAt: s.updatedAt,
          }
        }
      } catch (err: any) {
        if (err?.response?.status === 404 || err?.status === 404) {
          return undefined
        }
        throw err
      }
    }
    const subjects = await this.getSubjects()
    return subjects.find((s) => s.id === id)
  },

  async createSubject(
    input: Omit<CurriculumSubjectItem, 'id' | 'chapterCount' | 'lessonCount' | 'assessmentCount' | 'publishedPercent' | 'updatedAt'>
  ): Promise<CurriculumSubjectItem> {
    if (getAccessToken()) {
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

      window.dispatchEvent(new CustomEvent('study_ai_education_change'))
      return {
        id: created.id,
        name: created.name,
        code: created.code,
        grade: created.grade ? (created.grade.startsWith('Lớp') ? created.grade : `Lớp ${created.grade}`) : 'Lớp 12',
        icon: resolveSubjectIcon(created.code, created.name, input.icon, created.description),
        description: created.description || '',
        chapterCount: created.chapterCount || 0,
        lessonCount: created.lessonCount || 0,
        assessmentCount: 0,
        publishedPercent: created.isActive ? 100 : 0,
        status: created.isActive ? 'published' : 'draft',
        updatedAt: created.updatedAt,
      }
    }

    const subjects = await this.getSubjects()
    const id = `subj-${Date.now().toString(36)}`
    const newSubject: CurriculumSubjectItem = {
      ...input,
      id,
      chapterCount: 0,
      lessonCount: 0,
      assessmentCount: 0,
      publishedPercent: input.status === 'published' ? 100 : 0,
      updatedAt: new Date().toISOString(),
    }
    const updated = [newSubject, ...subjects]
    writeStorage(STORAGE_KEYS.SUBJECTS, updated)
    return newSubject
  },

  async updateSubject(
    id: string,
    updates: Partial<CurriculumSubjectItem>
  ): Promise<CurriculumSubjectItem | undefined> {
    if (getAccessToken()) {
      const body: Record<string, any> = {}
      if (updates.name !== undefined) body.name = updates.name.trim()
      if (updates.code !== undefined) body.code = updates.code.trim().toUpperCase()
      if (updates.grade !== undefined) body.grade = updates.grade.replace(/[^0-9]/g, '') || '12'
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

      window.dispatchEvent(new CustomEvent('study_ai_education_change'))
      return {
        id: updated.id,
        name: updated.name,
        code: updated.code,
        grade: updated.grade ? (updated.grade.startsWith('Lớp') ? updated.grade : `Lớp ${updated.grade}`) : 'Lớp 12',
        icon: resolveSubjectIcon(updated.code, updated.name, updates.icon, updated.description),
        description: updated.description || '',
        chapterCount: updated.chapterCount || 0,
        lessonCount: updated.lessonCount || 0,
        assessmentCount: 0,
        publishedPercent: updated.isActive ? 100 : 0,
        status: updated.isActive ? 'published' : 'draft',
        updatedAt: updated.updatedAt,
      }
    }

    const subjects = await this.getSubjects()
    let found: CurriculumSubjectItem | undefined
    const updated = subjects.map((s) => {
      if (s.id === id) {
        found = {
          ...s,
          ...updates,
          updatedAt: new Date().toISOString(),
        }
        return found
      }
      return s
    })
    writeStorage(STORAGE_KEYS.SUBJECTS, updated)
    return found
  },

  async deleteSubject(id: string): Promise<boolean> {
    if (getAccessToken()) {
      await apiClient.delete(`/api/v1/content/subjects/${id}`)
      window.dispatchEvent(new CustomEvent('study_ai_education_change'))
      return true
    }

    const subjects = await this.getSubjects()
    const filtered = subjects.filter((s) => s.id !== id)
    if (filtered.length !== subjects.length) {
      writeStorage(STORAGE_KEYS.SUBJECTS, filtered)
      return true
    }
    return false
  },

  // ── CHAPTERS ───────────────────────────────────────────────
  async getChapters(subjectId?: string): Promise<CurriculumChapterItem[]> {
    if (getAccessToken()) {
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
    }

    let chapters = readStorage<CurriculumChapterItem[]>(STORAGE_KEYS.CHAPTERS, INITIAL_CHAPTERS)
    if (subjectId && subjectId !== 'all') {
      chapters = chapters.filter((c) => c.subjectId === subjectId)
    }
    return chapters.sort((a, b) => a.order - b.order)
  },

  async getChapterById(id: string): Promise<CurriculumChapterItem | undefined> {
    if (getAccessToken()) {
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
    }

    const chapters = await this.getChapters()
    return chapters.find((c) => c.id === id)
  },

  async createChapter(
    input: Omit<CurriculumChapterItem, 'id' | 'lessonsCount' | 'updatedAt'>
  ): Promise<CurriculumChapterItem> {
    if (getAccessToken()) {
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
        window.dispatchEvent(new CustomEvent('study_ai_education_change'))
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
    }

    const chapters = await this.getChapters()
    const id = `ch-${Date.now().toString(36)}`
    const newChapter: CurriculumChapterItem = {
      ...input,
      id,
      lessonsCount: 0,
      updatedAt: new Date().toISOString(),
    }
    const updated = [...chapters, newChapter]
    writeStorage(STORAGE_KEYS.CHAPTERS, updated)

    // Update subject chapterCount
    const subjects = await this.getSubjects()
    const subj = subjects.find((s) => s.id === input.subjectId)
    if (subj) {
      await this.updateSubject(subj.id, { chapterCount: (subj.chapterCount || 0) + 1 })
    }

    return newChapter
  },

  async updateChapter(
    id: string,
    updates: Partial<CurriculumChapterItem>
  ): Promise<CurriculumChapterItem | undefined> {
    if (getAccessToken()) {
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
        window.dispatchEvent(new CustomEvent('study_ai_education_change'))
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
    }

    const chapters = await this.getChapters()
    let found: CurriculumChapterItem | undefined
    const updated = chapters.map((c) => {
      if (c.id === id) {
        found = {
          ...c,
          ...updates,
          updatedAt: new Date().toISOString(),
        }
        return found
      }
      return c
    })
    writeStorage(STORAGE_KEYS.CHAPTERS, updated)
    return found
  },

  async deleteChapter(id: string): Promise<boolean> {
    if (getAccessToken()) {
      await apiClient.delete(`/api/v1/content/chapters/${id}`)
      window.dispatchEvent(new CustomEvent('study_ai_education_change'))
      return true
    }

    const chapters = await this.getChapters()
    const toDelete = chapters.find((c) => c.id === id)
    const filtered = chapters.filter((c) => c.id !== id)
    if (filtered.length !== chapters.length) {
      writeStorage(STORAGE_KEYS.CHAPTERS, filtered)
      if (toDelete) {
        const subjects = await this.getSubjects()
        const subj = subjects.find((s) => s.id === toDelete.subjectId)
        if (subj && subj.chapterCount > 0) {
          await this.updateSubject(subj.id, { chapterCount: subj.chapterCount - 1 })
        }
      }
      return true
    }
    return false
  },

  async reorderChapters(subjectId: string, orderedIds: string[]): Promise<CurriculumChapterItem[]> {
    if (getAccessToken()) {
      await apiClient.post('/api/v1/content/chapters/reorder', {
        subjectId,
        chapterIds: orderedIds,
      })
      window.dispatchEvent(new CustomEvent('study_ai_education_change'))
      return this.getChapters(subjectId)
    }

    const allChapters = await this.getChapters()
    const updated = allChapters.map((c) => {
      if (c.subjectId === subjectId) {
        const newOrder = orderedIds.indexOf(c.id) + 1
        if (newOrder > 0) {
          return { ...c, order: newOrder, updatedAt: new Date().toISOString() }
        }
      }
      return c
    })
    writeStorage(STORAGE_KEYS.CHAPTERS, updated)
    return updated.filter((c) => c.subjectId === subjectId).sort((a, b) => a.order - b.order)
  },

  // ── TOPICS ─────────────────────────────────────────────────
  async getTopics(chapterId?: string, search?: string): Promise<CurriculumTopicItem[]> {
    if (getAccessToken()) {
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
    if (getAccessToken()) {
      const res = await apiClient.post<CurriculumTopicItem>('/api/v1/content/topics', {
        chapterId: input.chapterId,
        title: input.title,
        description: input.description || '',
        orderIndex: input.orderIndex || 1,
        isActive: input.isActive ?? true,
      })
      return res
    }
    return null
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
    if (getAccessToken()) {
      const res = await apiClient.patch<CurriculumTopicItem>(`/api/v1/content/topics/${id}`, updates)
      return res
    }
    return null
  },

  async deleteTopic(id: string): Promise<boolean> {
    if (getAccessToken()) {
      await apiClient.delete(`/api/v1/content/topics/${id}`)
      return true
    }
    return false
  },

  // ── LESSON VIDEOS ──────────────────────────────────────────
  async getLessonVideos(lessonId: string): Promise<CurriculumLessonVideoItem[]> {
    if (getAccessToken()) {
      const res = await apiClient.get<{
        items: CurriculumLessonVideoItem[]
        total: number
      }>(`/api/v1/content/lessons/${lessonId}/videos`)
      if (res?.items && Array.isArray(res.items)) {
        return res.items
      }
      return []
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
    if (getAccessToken()) {
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
    }
    return null
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
    if (getAccessToken()) {
      const res = await apiClient.patch<CurriculumLessonVideoItem>(
        `/api/v1/content/videos/${videoId}`,
        data
      )
      return res
    }
    return null
  },

  async deleteLessonVideo(videoId: string): Promise<boolean> {
    if (getAccessToken()) {
      await apiClient.delete(`/api/v1/content/videos/${videoId}`)
      return true
    }
    return false
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
    if (getAccessToken()) {
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
    }

    let lessons = readStorage<CurriculumLessonItem[]>(STORAGE_KEYS.LESSONS, INITIAL_LESSONS)

    if (filter?.subjectId && filter.subjectId !== 'all') {
      lessons = lessons.filter((l) => l.subjectId === filter.subjectId)
    }
    if (filter?.chapterId && filter.chapterId !== 'all') {
      lessons = lessons.filter((l) => l.chapterId === filter.chapterId)
    }
    if (filter?.status && filter.status !== 'all') {
      lessons = lessons.filter((l) => l.status === filter.status)
    }
    if (filter?.search?.trim()) {
      const q = filter.search.trim().toLowerCase()
      lessons = lessons.filter(
        (l) =>
          l.title.toLowerCase().includes(q) ||
          l.authorName.toLowerCase().includes(q) ||
          l.chapterName.toLowerCase().includes(q)
      )
    }

    return lessons
  },

  async getLessonById(id: string): Promise<CurriculumLessonItem | undefined> {
    if (getAccessToken()) {
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
    }

    const lessons = await this.getLessons()
    return lessons.find((l) => l.id === id)
  },

  async createLesson(
    input: Omit<CurriculumLessonItem, 'id' | 'updatedAt'>
  ): Promise<CurriculumLessonItem> {
    if (getAccessToken()) {
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
    }

    const lessons = await this.getLessons()
    const id = `lesson-${Date.now().toString(36)}`
    const newLesson: CurriculumLessonItem = {
      ...input,
      id,
      updatedAt: new Date().toISOString(),
    }
    const updated = [newLesson, ...lessons]
    writeStorage(STORAGE_KEYS.LESSONS, updated)

    // Update subject lessonCount
    const subjects = await this.getSubjects()
    const subj = subjects.find((s) => s.id === input.subjectId)
    if (subj) {
      await this.updateSubject(subj.id, { lessonCount: (subj.lessonCount || 0) + 1 })
    }

    // Update chapter lessonCount
    const chapters = await this.getChapters()
    const ch = chapters.find((c) => c.id === input.chapterId)
    if (ch) {
      await this.updateChapter(ch.id, { lessonsCount: (ch.lessonsCount || 0) + 1 })
    }

    return newLesson
  },

  async updateLesson(
    id: string,
    updates: Partial<CurriculumLessonItem>
  ): Promise<CurriculumLessonItem | undefined> {
    if (getAccessToken()) {
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
    }

    const lessons = await this.getLessons()
    let found: CurriculumLessonItem | undefined
    const updated = lessons.map((l) => {
      if (l.id === id) {
        found = {
          ...l,
          ...updates,
          updatedAt: new Date().toISOString(),
        }
        return found
      }
      return l
    })
    writeStorage(STORAGE_KEYS.LESSONS, updated)
    return found
  },

  async deleteLesson(id: string): Promise<boolean> {
    if (getAccessToken()) {
      await apiClient.delete(`/api/v1/content/lessons/${id}`)
      return true
    }

    const lessons = await this.getLessons()
    const toDelete = lessons.find((l) => l.id === id)
    const filtered = lessons.filter((l) => l.id !== id)
    if (filtered.length !== lessons.length) {
      writeStorage(STORAGE_KEYS.LESSONS, filtered)
      if (toDelete) {
        const subjects = await this.getSubjects()
        const subj = subjects.find((s) => s.id === toDelete.subjectId)
        if (subj && subj.lessonCount > 0) {
          await this.updateSubject(subj.id, { lessonCount: subj.lessonCount - 1 })
        }
        const chapters = await this.getChapters()
        const ch = chapters.find((c) => c.id === toDelete.chapterId)
        if (ch && ch.lessonsCount > 0) {
          await this.updateChapter(ch.id, { lessonsCount: ch.lessonsCount - 1 })
        }
      }
      return true
    }
    return false
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
    if (getAccessToken()) {
      const query = new URLSearchParams()
      if (filter?.subjectId && filter.subjectId !== 'all') query.set('subjectId', filter.subjectId)
      if (filter?.status && filter.status !== 'all') query.set('status', filter.status)
      if (filter?.search?.trim()) query.set('search', filter.search.trim())
      if (filter?.lessonId) query.set('lessonId', filter.lessonId)
      const res = await apiClient.get<CurriculumAssessmentItem[]>(`/api/v1/content/assessments?${query.toString()}`)
      return res || []
    }

    let assessments = readStorage<CurriculumAssessmentItem[]>(STORAGE_KEYS.ASSESSMENTS, isTestEnvironment() ? INITIAL_ASSESSMENTS : [])

    if (filter?.subjectId && filter.subjectId !== 'all') {
      assessments = assessments.filter((a) => a.subjectId === filter.subjectId)
    }
    if (filter?.status && filter.status !== 'all') {
      assessments = assessments.filter((a) => a.status === filter.status)
    }
    if (filter?.search?.trim()) {
      const q = filter.search.trim().toLowerCase()
      assessments = assessments.filter((a) => a.lessonTitle.toLowerCase().includes(q))
    }

    return assessments
  },

  async getAssessmentById(id: string): Promise<CurriculumAssessmentItem | undefined> {
    if (getAccessToken()) {
      const res = await apiClient.get<CurriculumAssessmentItem>(`/api/v1/content/assessments/${id}`)
      return res || undefined
    }
    const assessments = await this.getAssessments()
    return assessments.find((a) => a.id === id)
  },

  async createAssessment(
    input: Omit<CurriculumAssessmentItem, 'id' | 'updatedAt'>
  ): Promise<CurriculumAssessmentItem> {
    if (getAccessToken()) {
      const payload = {
        lessonId: input.lessonId,
        title: input.lessonTitle ? `Bài kiểm tra: ${input.lessonTitle}` : undefined,
        passingScore: input.passingScore,
        durationMinutes: input.durationMinutes,
        status: input.status,
      }
      return apiClient.post<CurriculumAssessmentItem>('/api/v1/content/assessments', payload)
    }

    const assessments = await this.getAssessments()
    const id = `asm-${Date.now().toString(36)}`
    const newAssessment: CurriculumAssessmentItem = {
      ...input,
      id,
      updatedAt: new Date().toISOString(),
    }
    const updated = [newAssessment, ...assessments]
    writeStorage(STORAGE_KEYS.ASSESSMENTS, updated)

    // Mark corresponding lesson hasAssessment = true
    await this.updateLesson(input.lessonId, { hasAssessment: true })

    // Update subject assessmentCount
    const subjects = await this.getSubjects()
    const subj = subjects.find((s) => s.id === input.subjectId)
    if (subj) {
      await this.updateSubject(subj.id, { assessmentCount: (subj.assessmentCount || 0) + 1 })
    }

    return newAssessment
  },

  async updateAssessment(
    id: string,
    updates: Partial<CurriculumAssessmentItem>
  ): Promise<CurriculumAssessmentItem | undefined> {
    if (getAccessToken()) {
      const payload = {
        title: updates.lessonTitle,
        passingScore: updates.passingScore,
        durationMinutes: updates.durationMinutes,
        status: updates.status,
      }
      return apiClient.put<CurriculumAssessmentItem>(`/api/v1/content/assessments/${id}`, payload)
    }

    const assessments = await this.getAssessments()
    let found: CurriculumAssessmentItem | undefined
    const updated = assessments.map((a) => {
      if (a.id === id) {
        found = {
          ...a,
          ...updates,
          questionCount: updates.questions ? updates.questions.length : a.questionCount,
          updatedAt: new Date().toISOString(),
        }
        return found
      }
      return a
    })
    writeStorage(STORAGE_KEYS.ASSESSMENTS, updated)
    return found
  },

  async deleteAssessment(id: string): Promise<boolean> {
    if (getAccessToken()) {
      await apiClient.delete(`/api/v1/content/assessments/${id}`)
      return true
    }

    const assessments = await this.getAssessments()
    const filtered = assessments.filter((a) => a.id !== id)
    if (filtered.length !== assessments.length) {
      writeStorage(STORAGE_KEYS.ASSESSMENTS, filtered)
      return true
    }
    return false
  },

  async changeAssessmentStatus(id: string, status: ContentStatus): Promise<CurriculumAssessmentItem | undefined> {
    if (getAccessToken()) {
      return apiClient.put<CurriculumAssessmentItem>(`/api/v1/content/assessments/${id}/status`, { status })
    }
    return this.updateAssessment(id, { status })
  },

  async addQuestionToAssessment(
    assessmentId: string,
    question: Omit<AssessmentQuestionItem, 'id'>
  ): Promise<CurriculumAssessmentItem | undefined> {
    if (getAccessToken()) {
      return apiClient.post<CurriculumAssessmentItem>(`/api/v1/content/assessments/${assessmentId}/questions`, question)
    }

    const assessment = await this.getAssessmentById(assessmentId)
    if (!assessment) return undefined

    const newQ: AssessmentQuestionItem = {
      ...question,
      id: `q-${Date.now().toString(36)}`,
    }

    const updatedQuestions = [...assessment.questions, newQ]
    return this.updateAssessment(assessmentId, {
      questions: updatedQuestions,
      questionCount: updatedQuestions.length,
    })
  },

  // ── TEACHERS ───────────────────────────────────────────────
  async getTeachers(filter?: {
    subject?: string
    status?: string
    search?: string
  }): Promise<AdminTeacherItem[]> {
    if (getAccessToken()) {
      const queryParams = new URLSearchParams()
      if (filter?.search?.trim()) queryParams.set('search', filter.search.trim())
      if (filter?.status && filter.status !== 'all') queryParams.set('status', filter.status)
      if (filter?.subject && filter.subject !== 'all') queryParams.set('subject', filter.subject)

      const res = await apiClient.get<AdminTeacherItem[]>(`/api/v1/admin/teachers?${queryParams.toString()}`)
      if (Array.isArray(res)) {
        return res
      }
      return []
    }

    let teachers = readStorage<AdminTeacherItem[]>(STORAGE_KEYS.TEACHERS, isTestEnvironment() ? INITIAL_TEACHERS : [])

    if (filter?.subject && filter.subject !== 'all') {
      teachers = teachers.filter((t) => t.subject.toLowerCase().includes(filter.subject!.toLowerCase()))
    }
    if (filter?.status && filter.status !== 'all') {
      teachers = teachers.filter((t) => t.status === filter.status)
    }
    if (filter?.search?.trim()) {
      const q = filter.search.trim().toLowerCase()
      teachers = teachers.filter(
        (t) => t.name.toLowerCase().includes(q) || t.email.toLowerCase().includes(q)
      )
    }

    return teachers
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
  }): Promise<AdminTeacherItem & { _persistedLocally?: boolean }> {
    if (getAccessToken()) {
      const res = await apiClient.post<AdminTeacherItem>('/api/v1/admin/teachers', data)
      if (res?.id) {
        return { ...res, _persistedLocally: false }
      }
      throw new Error('Máy chủ không thể tạo tài khoản giáo viên.')
    }

    const teachers = readStorage<AdminTeacherItem[]>(STORAGE_KEYS.TEACHERS, isTestEnvironment() ? INITIAL_TEACHERS : [])
    const newTeacher: AdminTeacherItem & { _persistedLocally?: boolean } = {
      id: `tch-${Date.now().toString(36)}`,
      name: data.name,
      email: data.email,
      phone: data.phone || '0901 234 567',
      subject: data.subject,
      classes: data.classes || ['12A1'],
      studentCount: 35,
      status: data.status || 'active',
      joinedAt: new Date().toISOString(),
      rating: 5.0,
      qualifications: data.qualifications || 'Cử nhân Sư phạm',
      experienceYears: data.experienceYears || 3,
      bio: data.bio || 'Giáo viên bộ môn tâm huyết với học sinh.',
      accountStatus: 'ACTIVE',
      _persistedLocally: true,
    }
    const updated = [newTeacher, ...teachers]
    writeStorage(STORAGE_KEYS.TEACHERS, updated)
    return newTeacher
  },

  async updateTeacher(id: string, updates: Partial<AdminTeacherItem>): Promise<AdminTeacherItem> {
    if (getAccessToken()) {
      const res = await apiClient.patch<AdminTeacherItem>(`/api/v1/admin/teachers/${id}`, updates)
      if (res?.id) {
        return res
      }
      throw new Error('Cập nhật thông tin giáo viên không thành công.')
    }

    const teachers = readStorage<AdminTeacherItem[]>(STORAGE_KEYS.TEACHERS, isTestEnvironment() ? INITIAL_TEACHERS : [])
    const idx = teachers.findIndex((t) => t.id === id)
    if (idx === -1) throw new Error(`Teacher with id ${id} not found`)
    const updatedTeacher = { ...teachers[idx], ...updates }
    teachers[idx] = updatedTeacher
    writeStorage(STORAGE_KEYS.TEACHERS, teachers)
    return updatedTeacher
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
    if (getAccessToken()) {
      await apiClient.delete(`/api/v1/admin/teachers/${id}`)
      return true
    }

    const teachers = readStorage<AdminTeacherItem[]>(STORAGE_KEYS.TEACHERS, isTestEnvironment() ? INITIAL_TEACHERS : [])
    const filtered = teachers.filter((t) => t.id !== id)
    writeStorage(STORAGE_KEYS.TEACHERS, filtered)
    return true
  },

  async getTeacherKPIs(): Promise<{
    totalTeachers: number
    activeTeaching: number
    pendingOrLeave: number
    newTeachers: number
  }> {
    if (getAccessToken()) {
      const res = await apiClient.get<{
        totalTeachers: number
        activeTeaching: number
        pendingOrLeave: number
        newTeachers: number
      }>('/api/v1/admin/teachers/kpis')
      if (res) return res
      throw new Error('Không thể tải KPI giáo viên từ máy chủ.')
    }

    const teachers = readStorage<AdminTeacherItem[]>(STORAGE_KEYS.TEACHERS, isTestEnvironment() ? INITIAL_TEACHERS : [])
    const totalTeachers = teachers.length
    const activeTeaching = teachers.filter((t) => t.status === 'active').length
    const pendingOrLeave = teachers.filter((t) => t.status !== 'active').length
    const thirtyDaysAgo = Date.now() - 30 * 24 * 60 * 60 * 1000
    const newTeachers = teachers.filter((t) => new Date(t.joinedAt).getTime() > thirtyDaysAgo).length
    return {
      totalTeachers,
      activeTeaching,
      pendingOrLeave,
      newTeachers: Math.max(newTeachers, 1),
    }
  },

  // ── LEARNING REPORTS ───────────────────────────────────────
  async getReports(filter?: {
    timeframe?: string
    subjectId?: string
    classId?: string
  }): Promise<LearningReportsData> {
    if (getAccessToken()) {
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
    }

    if (isTestEnvironment()) {
      return {
        totalLearners: 120,
        activeLearners: 85,
        completedLessons: 420,
        completionRatePercent: 75.0,
        averageAssessmentScore: 7.8,
        activityTrend: [
          { date: '20/11', activeUsers: 45, completedLessons: 15, lessonsCompleted: 15 },
        ],
        subjectProgress: [],
        scoreDistribution: [],
      }
    }

    throw new Error('Chưa đăng nhập hoặc không có quyền xem báo cáo học tập.')
  },

  _resetEducationMockState(): void {
    if (isTestEnvironment()) {
      writeStorage(STORAGE_KEYS.SUBJECTS, INITIAL_SUBJECTS)
      writeStorage(STORAGE_KEYS.CHAPTERS, INITIAL_CHAPTERS)
      writeStorage(STORAGE_KEYS.LESSONS, INITIAL_LESSONS)
      writeStorage(STORAGE_KEYS.ASSESSMENTS, INITIAL_ASSESSMENTS)
      writeStorage(STORAGE_KEYS.TEACHERS, INITIAL_TEACHERS)
    }
  },
}

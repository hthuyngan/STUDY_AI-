import { useCallback, useEffect, useState } from 'react'
import { contentService } from '@/services/content.service'
import type {
  ContentAssessmentSummary,
  ContentLessonItem,
  ContentReviewQueueItem,
  CurriculumSubjectItem,
  LessonEditorData,
} from '@/types/content'

export function useContentDashboard() {
  const [data, setData] = useState<Awaited<ReturnType<typeof contentService.getDashboardSummary>> | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await contentService.getDashboardSummary()
      setData(res)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Lỗi khi tải bảng điều khiển nội dung')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    let isMounted = true
    contentService
      .getDashboardSummary()
      .then((res) => {
        if (!isMounted) return
        setData(res)
        setLoading(false)
      })
      .catch((err: unknown) => {
        if (!isMounted) return
        setError(err instanceof Error ? err.message : 'Lỗi khi tải bảng điều khiển nội dung')
        setLoading(false)
      })

    return () => {
      isMounted = false
    }
  }, [])

  return { data, loading, error, refresh: load }
}

export function useContentSubjects() {
  const [subjects, setSubjects] = useState<CurriculumSubjectItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await contentService.getSubjects()
      setSubjects(res)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Lỗi khi tải danh sách môn học')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    let isMounted = true
    contentService
      .getSubjects()
      .then((res) => {
        if (!isMounted) return
        setSubjects(res)
        setLoading(false)
      })
      .catch((err: unknown) => {
        if (!isMounted) return
        setError(err instanceof Error ? err.message : 'Lỗi khi tải danh sách môn học')
        setLoading(false)
      })

    return () => {
      isMounted = false
    }
  }, [])

  return { subjects, loading, error, refresh: load }
}

export function useContentLessons(initialSubject = 'all', initialStatus = 'all', initialSearch = '') {
  const [lessons, setLessons] = useState<ContentLessonItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [subjectFilter, setSubjectFilter] = useState(initialSubject)
  const [statusFilter, setStatusFilter] = useState(initialStatus)
  const [search, setSearch] = useState(initialSearch)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await contentService.getLessons(subjectFilter, statusFilter, search)
      setLessons(res)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Lỗi khi tải danh sách bài học')
    } finally {
      setLoading(false)
    }
  }, [subjectFilter, statusFilter, search])

  useEffect(() => {
    let isMounted = true
    contentService
      .getLessons(subjectFilter, statusFilter, search)
      .then((res) => {
        if (!isMounted) return
        setLessons(res)
        setLoading(false)
      })
      .catch((err: unknown) => {
        if (!isMounted) return
        setError(err instanceof Error ? err.message : 'Lỗi khi tải danh sách bài học')
        setLoading(false)
      })

    return () => {
      isMounted = false
    }
  }, [subjectFilter, statusFilter, search])

  return {
    lessons,
    loading,
    error,
    subjectFilter,
    setSubjectFilter,
    statusFilter,
    setStatusFilter,
    search,
    setSearch,
    refresh: load,
  }
}

export function useLessonEditor(lessonId: string) {
  const [lessonData, setLessonData] = useState<LessonEditorData | null>(null)
  const [loading, setLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    if (!lessonId) {
      setError('Mã bài học không hợp lệ.')
      setLoading(false)
      return
    }
    setLoading(true)
    setError(null)
    try {
      const res = await contentService.getLessonEditor(lessonId)
      setLessonData(res)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Lỗi khi tải bài học')
    } finally {
      setLoading(false)
    }
  }, [lessonId])

  useEffect(() => {
    if (!lessonId) {
      setError('Mã bài học không hợp lệ.')
      setLoading(false)
      return
    }
    let isMounted = true
    contentService
      .getLessonEditor(lessonId)
      .then((res) => {
        if (!isMounted) return
        setLessonData(res)
        setLoading(false)
      })
      .catch((err: unknown) => {
        if (!isMounted) return
        setError(err instanceof Error ? err.message : 'Lỗi khi tải bài học')
        setLoading(false)
      })

    return () => {
      isMounted = false
    }
  }, [lessonId])

  const saveDraft = async (updates: Partial<LessonEditorData>) => {
    if (!lessonData) return
    setIsSaving(true)
    try {
      const { status: _baseStatus, ...baseData } = lessonData
      const { status: _updateStatus, ...cleanUpdates } = updates
      const saved = await contentService.saveLessonContent({
        ...baseData,
        ...cleanUpdates,
        rowVersion: updates.rowVersion ?? lessonData.rowVersion,
        id: lessonData.id,
      })
      setLessonData(saved)
      return saved
    } finally {
      setIsSaving(false)
    }
  }

  const runTransition = async (
    action: (id: string, rowVersion?: string, reason?: string) => Promise<{ status: LessonEditorData['status']; rowVersion?: string; updatedAt: string }>,
    overrideRowVersion?: string,
    reason?: string
  ) => {
    if (!lessonData) return
    setIsSaving(true)
    try {
      const res = await action(lessonData.id, overrideRowVersion ?? lessonData.rowVersion, reason)
      setLessonData((prev) =>
        prev
          ? {
              ...prev,
              status: res.status,
              rowVersion: res.rowVersion ?? prev.rowVersion,
              lastSavedAt: res.updatedAt,
            }
          : prev
      )
      return res
    } finally {
      setIsSaving(false)
    }
  }

  const submitReview = (rowVersion?: string) => runTransition((id, rv) => contentService.submitLessonReview(id, rv), rowVersion)
  const approve = (rowVersion?: string) => runTransition((id, rv) => contentService.approveLesson(id, rv), rowVersion)
  const publish = (rowVersion?: string) => runTransition((id, rv) => contentService.publishLesson(id, rv), rowVersion)
  const unpublish = (rowVersion?: string) => runTransition((id, rv) => contentService.unpublishLesson(id, rv), rowVersion)
  const requestChanges = (reason?: string, rowVersion?: string) =>
    runTransition((id, rv, r) => contentService.requestLessonChanges(id, rv, r), rowVersion, reason)
  const archive = (reason?: string, rowVersion?: string) =>
    runTransition((id, rv, r) => contentService.archiveLesson(id, rv, r), rowVersion, reason)
  const reactivate = (rowVersion?: string) => runTransition((id, rv) => contentService.reactivateLesson(id, rv), rowVersion)

  return {
    lessonData,
    loading,
    isSaving,
    error,
    save: saveDraft,
    saveDraft,
    submitReview,
    approve,
    publish,
    unpublish,
    requestChanges,
    archive,
    reactivate,
    refresh: load,
  }
}

export function useContentAssessments() {
  const [assessments, setAssessments] = useState<ContentAssessmentSummary[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await contentService.getAssessments()
      setAssessments(res)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Lỗi khi tải danh sách bài thu hoạch')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    let isMounted = true
    contentService
      .getAssessments()
      .then((res) => {
        if (!isMounted) return
        setAssessments(res)
        setLoading(false)
      })
      .catch((err: unknown) => {
        if (!isMounted) return
        setError(err instanceof Error ? err.message : 'Lỗi khi tải danh sách bài thu hoạch')
        setLoading(false)
      })

    return () => {
      isMounted = false
    }
  }, [])

  return { assessments, loading, error, refresh: load }
}

export function useContentReviewQueue() {
  const [queue, setQueue] = useState<ContentReviewQueueItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await contentService.getReviewQueue()
      setQueue(res)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Lỗi khi tải hàng đợi kiểm duyệt')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    let isMounted = true
    contentService
      .getReviewQueue()
      .then((res) => {
        if (!isMounted) return
        setQueue(res)
        setLoading(false)
      })
      .catch((err: unknown) => {
        if (!isMounted) return
        setError(err instanceof Error ? err.message : 'Lỗi khi tải hàng đợi kiểm duyệt')
        setLoading(false)
      })

    return () => {
      isMounted = false
    }
  }, [])

  const processReview = async (id: string, action: 'approve' | 'request-changes') => {
    const ok = await contentService.reviewAction(id, action)
    if (ok) {
      void load()
    }
    return ok
  }

  return { queue, loading, error, processReview, refresh: load }
}

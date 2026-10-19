import { useCallback, useEffect, useState } from 'react'
import { getSubjectById, getSubjects } from '@/services/subjects.service'
import type { SubjectDetail, SubjectSummary } from '@/types/subject'

export function useSubjects() {
  const [subjects, setSubjects] = useState<SubjectSummary[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const reload = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    try {
      const data = await getSubjects()
      setSubjects(data)
    } catch {
      setError('Không thể tải danh sách môn học.')
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    let isMounted = true
    getSubjects()
      .then((data) => {
        if (!isMounted) return
        setSubjects(data)
        setIsLoading(false)
      })
      .catch(() => {
        if (!isMounted) return
        setError('Không thể tải danh sách môn học.')
        setIsLoading(false)
      })

    return () => {
      isMounted = false
    }
  }, [])

  return { subjects, isLoading, error, reload }
}

export function useSubjectDetail(subjectId: string | undefined) {
  const [subject, setSubject] = useState<SubjectDetail | null>(null)
  const [isLoading, setIsLoading] = useState(Boolean(subjectId))
  const [error, setError] = useState<string | null>(null)

  const reload = useCallback(async () => {
    if (!subjectId) return
    setIsLoading(true)
    setError(null)
    try {
      const data = await getSubjectById(subjectId)
      if (!data) {
        setError('Không tìm thấy thông tin môn học.')
      } else {
        setSubject(data)
      }
    } catch {
      setError('Không thể tải chi tiết môn học.')
    } finally {
      setIsLoading(false)
    }
  }, [subjectId])

  useEffect(() => {
    if (!subjectId) return
    let isMounted = true
    getSubjectById(subjectId)
      .then((data) => {
        if (!isMounted) return
        if (!data) {
          setError('Không tìm thấy thông tin môn học.')
        } else {
          setSubject(data)
        }
        setIsLoading(false)
      })
      .catch(() => {
        if (!isMounted) return
        setError('Không thể tải chi tiết môn học.')
        setIsLoading(false)
      })

    return () => {
      isMounted = false
    }
  }, [subjectId])

  return { subject, isLoading, error, reload }
}

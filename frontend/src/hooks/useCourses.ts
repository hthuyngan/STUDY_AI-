import { useCallback, useEffect, useState } from 'react'
import { getCourseById, getCourses } from '@/services/courses.service'
import type { CourseDetail, CourseSummary } from '@/types/course'

export function useCourses(filters?: { subjectId?: string; status?: string }) {
  const [courses, setCourses] = useState<CourseSummary[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const subjectFilter = filters?.subjectId
  const statusFilter = filters?.status

  const reload = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    try {
      const data = await getCourses(filters)
      setCourses(data)
    } catch {
      setError('Không thể tải danh sách khóa học.')
    } finally {
      setIsLoading(false)
    }
  }, [filters])

  useEffect(() => {
    let isMounted = true
    getCourses({ subjectId: subjectFilter, status: statusFilter })
      .then((data) => {
        if (!isMounted) return
        setCourses(data)
        setIsLoading(false)
      })
      .catch(() => {
        if (!isMounted) return
        setError('Không thể tải danh sách khóa học.')
        setIsLoading(false)
      })

    return () => {
      isMounted = false
    }
  }, [subjectFilter, statusFilter])

  return { courses, isLoading, error, reload }
}

export function useCourseDetail(courseId: string | undefined) {
  const [course, setCourse] = useState<CourseDetail | null>(null)
  const [isLoading, setIsLoading] = useState(Boolean(courseId))
  const [error, setError] = useState<string | null>(null)

  const reload = useCallback(async () => {
    if (!courseId) return
    setIsLoading(true)
    setError(null)
    try {
      const data = await getCourseById(courseId)
      if (!data) {
        setError('Không tìm thấy khóa học.')
      } else {
        setCourse(data)
      }
    } catch {
      setError('Không thể tải chi tiết khóa học.')
    } finally {
      setIsLoading(false)
    }
  }, [courseId])

  useEffect(() => {
    if (!courseId) return
    let isMounted = true
    getCourseById(courseId)
      .then((data) => {
        if (!isMounted) return
        if (!data) {
          setError('Không tìm thấy khóa học.')
        } else {
          setCourse(data)
        }
        setIsLoading(false)
      })
      .catch(() => {
        if (!isMounted) return
        setError('Không thể tải chi tiết khóa học.')
        setIsLoading(false)
      })

    return () => {
      isMounted = false
    }
  }, [courseId])

  return { course, isLoading, error, reload }
}

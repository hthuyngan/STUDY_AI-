import { useEffect, useState } from 'react'
import { getCourseById, getCourses } from '@/services/courses.service'
import type { CourseDetail, CourseSummary } from '@/types/course'

export function useCourses(filters?: { subjectId?: string; status?: string }) {
  const [courses, setCourses] = useState<CourseSummary[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchCourses = async () => {
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
  }

  useEffect(() => {
    fetchCourses()
  }, [filters?.subjectId, filters?.status])

  return { courses, isLoading, error, reload: fetchCourses }
}

export function useCourseDetail(courseId: string | undefined) {
  const [course, setCourse] = useState<CourseDetail | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchCourse = async () => {
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
  }

  useEffect(() => {
    fetchCourse()
  }, [courseId])

  return { course, isLoading, error, reload: fetchCourse }
}

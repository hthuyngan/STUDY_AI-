import { useEffect, useState } from 'react'
import {
  getCourseOutline,
  getLesson,
  markLessonComplete,
  toggleLessonBookmark,
} from '@/services/lesson.service'
import type { CourseOutlineChapter, LessonDetail } from '@/types/lesson'

export function useLesson(courseId: string | undefined, lessonId: string | undefined) {
  const [lesson, setLesson] = useState<LessonDetail | null>(null)
  const [outline, setOutline] = useState<CourseOutlineChapter[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isCompleted, setIsCompleted] = useState(false)
  const [isBookmarked, setIsBookmarked] = useState(false)

  const fetchLesson = async () => {
    if (!courseId || !lessonId) return
    setIsLoading(true)
    setError(null)
    try {
      const [lessonData, outlineData] = await Promise.all([
        getLesson(courseId, lessonId),
        getCourseOutline(courseId),
      ])
      if (!lessonData) {
        setError('Không tìm thấy bài học.')
      } else {
        setLesson(lessonData)
        setIsCompleted(lessonData.isCompleted)
        setIsBookmarked(!!lessonData.isBookmarked)
        setOutline(outlineData)
      }
    } catch {
      setError('Lỗi khi tải nội dung bài học.')
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchLesson()
  }, [courseId, lessonId])

  const handleToggleBookmark = async () => {
    if (!lessonId) return
    const nextVal = !isBookmarked
    setIsBookmarked(nextVal)
    await toggleLessonBookmark(lessonId)
  }

  const handleCompleteLesson = async () => {
    if (!lessonId) return
    setIsCompleted(true)
    await markLessonComplete(lessonId)
  }

  return {
    lesson,
    outline,
    isLoading,
    error,
    isCompleted,
    isBookmarked,
    toggleBookmark: handleToggleBookmark,
    completeLesson: handleCompleteLesson,
    reload: fetchLesson,
  }
}

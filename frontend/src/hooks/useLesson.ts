import { useCallback, useEffect, useState } from 'react'
import {
  getCourseOutline,
  getLesson,
  markLessonComplete,
  toggleLessonBookmark,
} from '@/services/lesson.service'
import type { CourseOutlineChapter, LessonDetail } from '@/types/lesson'

function enrichLessonNavigation(lesson: LessonDetail, outline: CourseOutlineChapter[]): LessonDetail {
  if (lesson.previousLessonId && lesson.nextLessonId) {
    return lesson
  }

  // Flatten all published lessons in order from curriculum outline
  const allLessons = outline.flatMap((ch) => ch.lessons || [])
  const currentIndex = allLessons.findIndex((l) => l.id === lesson.id)

  let prevId = lesson.previousLessonId
  let nextId = lesson.nextLessonId

  if (currentIndex !== -1) {
    if (!prevId && currentIndex > 0) {
      prevId = allLessons[currentIndex - 1].id
    }
    if (!nextId && currentIndex < allLessons.length - 1) {
      nextId = allLessons[currentIndex + 1].id
    }
  }

  return {
    ...lesson,
    previousLessonId: prevId,
    nextLessonId: nextId,
  }
}

export function useLesson(courseId: string | undefined, lessonId: string | undefined) {
  const [lesson, setLesson] = useState<LessonDetail | null>(null)
  const [outline, setOutline] = useState<CourseOutlineChapter[]>([])
  const [isLoading, setIsLoading] = useState(Boolean(courseId && lessonId))
  const [error, setError] = useState<string | null>(null)
  const [isCompleted, setIsCompleted] = useState(false)
  const [isBookmarked, setIsBookmarked] = useState(false)

  const reload = useCallback(async () => {
    if (!courseId || !lessonId) return
    setIsLoading(true)
    setError(null)
    try {
      const [lessonData, outlineData] = await Promise.all([
        getLesson(courseId, lessonId),
        getCourseOutline(courseId).catch((outlineErr) => {
          console.warn('Could not load course outline, continuing with empty outline:', outlineErr)
          return []
        }),
      ])
      if (!lessonData) {
        setError('Không tìm thấy bài học.')
      } else {
        const enriched = enrichLessonNavigation(lessonData, outlineData)
        setLesson(enriched)
        setIsCompleted(enriched.isCompleted)
        setIsBookmarked(!!enriched.isBookmarked)
        setOutline(outlineData)
      }
    } catch {
      setError('Lỗi khi tải nội dung bài học.')
    } finally {
      setIsLoading(false)
    }
  }, [courseId, lessonId])

  useEffect(() => {
    if (!courseId || !lessonId) return
    let isMounted = true

    Promise.all([
      getLesson(courseId, lessonId),
      getCourseOutline(courseId).catch((outlineErr) => {
        console.warn('Could not load course outline, continuing with empty outline:', outlineErr)
        return []
      }),
    ])
      .then(([lessonData, outlineData]) => {
        if (!isMounted) return
        if (!lessonData) {
          setError('Không tìm thấy bài học.')
        } else {
          const enriched = enrichLessonNavigation(lessonData, outlineData)
          setLesson(enriched)
          setIsCompleted(enriched.isCompleted)
          setIsBookmarked(!!enriched.isBookmarked)
          setOutline(outlineData)
        }
        setIsLoading(false)
      })
      .catch(() => {
        if (!isMounted) return
        setError('Lỗi khi tải nội dung bài học.')
        setIsLoading(false)
      })

    return () => {
      isMounted = false
    }
  }, [courseId, lessonId])

  const handleToggleBookmark = useCallback(async () => {
    if (!lessonId) return
    setIsBookmarked((prev) => !prev)
    await toggleLessonBookmark(lessonId)
  }, [lessonId])

  const handleCompleteLesson = useCallback(async () => {
    if (!lessonId) return
    setIsCompleted(true)
    await markLessonComplete(lessonId)
  }, [lessonId])

  return {
    lesson,
    outline,
    isLoading,
    error,
    isCompleted,
    isBookmarked,
    toggleBookmark: handleToggleBookmark,
    completeLesson: handleCompleteLesson,
    reload,
  }
}

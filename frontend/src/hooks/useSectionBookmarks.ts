import { useCallback, useEffect, useState } from 'react'
import {
  fetchBookmarksFromApi,
  getBookmarks,
  getBookmarksByLesson,
  isAuthenticated,
  removeBookmarkOnApi,
  removeSectionBookmark,
  SECTION_BOOKMARKS_CHANGED_EVENT,
  toggleBookmarkOnApi,
  toggleSectionBookmark,
} from '@/services/sectionBookmarks.service'
import type { SectionBookmark, ToggleBookmarkInput } from '@/types/studyNotes'

export function useSectionBookmarks(lessonId?: string) {
  const [bookmarks, setBookmarks] = useState<SectionBookmark[]>(() =>
    lessonId ? getBookmarksByLesson(lessonId) : getBookmarks()
  )
  const [loading, setLoading] = useState<boolean>(false)
  const [error, setError] = useState<string | null>(null)

  const refresh = useCallback(async () => {
    if (isAuthenticated()) {
      setLoading(true)
      setError(null)
      try {
        const remoteBookmarks = await fetchBookmarksFromApi(lessonId ? { lessonId } : undefined)
        setBookmarks(remoteBookmarks)
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : 'Không thể tải đánh dấu từ máy chủ.'
        setError(msg)
        setBookmarks(lessonId ? getBookmarksByLesson(lessonId) : getBookmarks())
      } finally {
        setLoading(false)
      }
    } else {
      setBookmarks(lessonId ? getBookmarksByLesson(lessonId) : getBookmarks())
    }
  }, [lessonId])

  useEffect(() => {
    refresh()
  }, [refresh])

  useEffect(() => {
    const handleBookmarksChanged = () => {
      setBookmarks(lessonId ? getBookmarksByLesson(lessonId) : getBookmarks())
    }

    if (typeof window !== 'undefined') {
      window.addEventListener(SECTION_BOOKMARKS_CHANGED_EVENT, handleBookmarksChanged)
    }

    return () => {
      if (typeof window !== 'undefined') {
        window.removeEventListener(SECTION_BOOKMARKS_CHANGED_EVENT, handleBookmarksChanged)
      }
    }
  }, [lessonId])

  const isBookmarked = useCallback(
    (lesId: string, secId: string) => {
      return bookmarks.some((b) => b.lessonId === lesId && b.sectionId === secId)
    },
    [bookmarks]
  )

  const toggle = useCallback(async (input: ToggleBookmarkInput) => {
    if (isAuthenticated()) {
      setLoading(true)
      setError(null)
      try {
        const isNowBookmarked = await toggleBookmarkOnApi(input)
        await refresh()
        return isNowBookmarked
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : 'Lỗi khi cập nhật đánh dấu trên máy chủ.'
        setError(msg)
        throw err
      } finally {
        setLoading(false)
      }
    }
    const isNowBookmarked = toggleSectionBookmark(input)
    setBookmarks(lessonId ? getBookmarksByLesson(lessonId) : getBookmarks())
    return isNowBookmarked
  }, [lessonId, refresh])

  const remove = useCallback(async (lesId: string, secId: string) => {
    if (isAuthenticated()) {
      setLoading(true)
      setError(null)
      try {
        await removeBookmarkOnApi(lesId, secId)
        await refresh()
        return true
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : 'Lỗi khi xóa đánh dấu trên máy chủ.'
        setError(msg)
        throw err
      } finally {
        setLoading(false)
      }
    }
    const success = removeSectionBookmark(lesId, secId)
    setBookmarks(lessonId ? getBookmarksByLesson(lessonId) : getBookmarks())
    return success
  }, [lessonId, refresh])

  return {
    bookmarks,
    loading,
    error,
    refresh,
    isBookmarked,
    toggleBookmark: toggle,
    removeBookmark: remove,
  }
}

import { useCallback, useEffect, useState } from 'react'
import {
  getBookmarks,
  getBookmarksByLesson,
  isSectionBookmarked,
  removeSectionBookmark,
  SECTION_BOOKMARKS_CHANGED_EVENT,
  toggleSectionBookmark,
} from '@/services/sectionBookmarks.service'
import type { SectionBookmark, ToggleBookmarkInput } from '@/types/studyNotes'

export function useSectionBookmarks(lessonId?: string) {
  const [bookmarks, setBookmarks] = useState<SectionBookmark[]>(() =>
    lessonId ? getBookmarksByLesson(lessonId) : getBookmarks()
  )

  const refresh = useCallback(() => {
    if (lessonId) {
      setBookmarks(getBookmarksByLesson(lessonId))
    } else {
      setBookmarks(getBookmarks())
    }
  }, [lessonId])

  useEffect(() => {
    const handleBookmarksChanged = () => {
      refresh()
    }

    if (typeof window !== 'undefined') {
      window.addEventListener(SECTION_BOOKMARKS_CHANGED_EVENT, handleBookmarksChanged)
    }

    return () => {
      if (typeof window !== 'undefined') {
        window.removeEventListener(SECTION_BOOKMARKS_CHANGED_EVENT, handleBookmarksChanged)
      }
    }
  }, [refresh])

  const isBookmarked = useCallback((lesId: string, secId: string) => {
    return isSectionBookmarked(lesId, secId)
  }, [])

  const toggle = useCallback((input: ToggleBookmarkInput) => {
    const isNowBookmarked = toggleSectionBookmark(input)
    refresh()
    return isNowBookmarked
  }, [refresh])

  const remove = useCallback((lesId: string, secId: string) => {
    const success = removeSectionBookmark(lesId, secId)
    refresh()
    return success
  }, [refresh])

  return {
    bookmarks,
    refresh,
    isBookmarked,
    toggleBookmark: toggle,
    removeBookmark: remove,
  }
}

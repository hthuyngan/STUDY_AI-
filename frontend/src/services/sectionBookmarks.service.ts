import type { SectionBookmark, ToggleBookmarkInput } from '@/types/studyNotes'

export const SECTION_BOOKMARKS_STORAGE_KEY = 'study_ai.section_bookmarks.v1'
export const BOOKMARKS_CHANGED_EVENT = 'study_ai:bookmarks_changed'

interface StoredBookmarksSchema {
  version: number
  bookmarks: SectionBookmark[]
}

function generateBookmarkId(lessonId: string, sectionId: string): string {
  return `bm_${lessonId}_${sectionId}`
}

function loadStoredData(): SectionBookmark[] {
  if (typeof window === 'undefined') return []
  try {
    const raw = localStorage.getItem(SECTION_BOOKMARKS_STORAGE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw) as StoredBookmarksSchema | SectionBookmark[]

    if (Array.isArray(parsed)) {
      return parsed
    }
    if (parsed && Array.isArray(parsed.bookmarks)) {
      return parsed.bookmarks
    }
    return []
  } catch (err) {
    console.error('Failed to load section bookmarks from localStorage', err)
    return []
  }
}

function persistBookmarks(bookmarks: SectionBookmark[]): void {
  if (typeof window === 'undefined') return
  try {
    const data: StoredBookmarksSchema = {
      version: 1,
      bookmarks,
    }
    localStorage.setItem(SECTION_BOOKMARKS_STORAGE_KEY, JSON.stringify(data))
    window.dispatchEvent(
      new CustomEvent(BOOKMARKS_CHANGED_EVENT, { detail: { count: bookmarks.length } })
    )
  } catch (err) {
    console.error('Failed to persist section bookmarks to localStorage', err)
  }
}

export const sectionBookmarksService = {
  getBookmarks(filter?: { lessonId?: string; subjectId?: string; search?: string }): SectionBookmark[] {
    const all = loadStoredData()
    let result = [...all]

    if (filter?.lessonId) {
      result = result.filter((b) => b.lessonId === filter.lessonId)
    }

    if (filter?.subjectId) {
      result = result.filter((b) => b.subjectId === filter.subjectId)
    }

    if (filter?.search) {
      const q = filter.search.trim().toLowerCase()
      result = result.filter(
        (b) =>
          b.sectionTitle.toLowerCase().includes(q) ||
          b.lessonTitle.toLowerCase().includes(q) ||
          b.subjectName.toLowerCase().includes(q)
      )
    }

    return result.sort(
      (a, b) => new Date(b.bookmarkedAt).getTime() - new Date(a.bookmarkedAt).getTime()
    )
  },

  isSectionBookmarked(lessonId: string, sectionId: string): boolean {
    const all = loadStoredData()
    return all.some((b) => b.lessonId === lessonId && b.sectionId === sectionId)
  },

  toggleSectionBookmark(input: ToggleBookmarkInput): boolean {
    const all = loadStoredData()
    const existingIndex = all.findIndex(
      (b) => b.lessonId === input.lessonId && b.sectionId === input.sectionId
    )

    if (existingIndex >= 0) {
      // Remove
      all.splice(existingIndex, 1)
      persistBookmarks(all)
      return false
    }

    // Add
    const newBookmark: SectionBookmark = {
      id: generateBookmarkId(input.lessonId, input.sectionId),
      lessonId: input.lessonId,
      subjectId: input.subjectId,
      lessonTitle: input.lessonTitle,
      subjectName: input.subjectName,
      sectionId: input.sectionId,
      sectionTitle: input.sectionTitle,
      bookmarkedAt: new Date().toISOString(),
    }

    persistBookmarks([newBookmark, ...all])
    return true
  },

  removeBookmark(lessonId: string, sectionId: string): boolean {
    const all = loadStoredData()
    const filtered = all.filter((b) => !(b.lessonId === lessonId && b.sectionId === sectionId))
    if (filtered.length !== all.length) {
      persistBookmarks(filtered)
      return true
    }
    return false
  },

  getBookmarksCount(filter?: { lessonId?: string; subjectId?: string }): number {
    return this.getBookmarks(filter).length
  },
}

export const SECTION_BOOKMARKS_CHANGED_EVENT = BOOKMARKS_CHANGED_EVENT

export const getBookmarks = (filter?: { lessonId?: string; subjectId?: string; search?: string }) =>
  sectionBookmarksService.getBookmarks(filter)

export const getBookmarksByLesson = (lessonId: string) =>
  sectionBookmarksService.getBookmarks({ lessonId })

export const isSectionBookmarked = (lessonId: string, sectionId: string) =>
  sectionBookmarksService.isSectionBookmarked(lessonId, sectionId)

export const toggleSectionBookmark = (input: ToggleBookmarkInput) =>
  sectionBookmarksService.toggleSectionBookmark(input)

export const removeSectionBookmark = (lessonId: string, sectionId: string) =>
  sectionBookmarksService.removeBookmark(lessonId, sectionId)



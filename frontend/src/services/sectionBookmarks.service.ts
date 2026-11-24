import { apiClient } from '@/lib/apiClient'
import { getAccessToken } from '@/auth/authSession'
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

export function isAuthenticated(): boolean {
  return typeof window !== 'undefined' && Boolean(getAccessToken())
}

export async function fetchBookmarksFromApi(filter?: {
  lessonId?: string
  subjectId?: string
  search?: string
}): Promise<SectionBookmark[]> {
  const params = new URLSearchParams()
  if (filter?.lessonId) params.append('lessonId', filter.lessonId)
  if (filter?.subjectId) params.append('subjectId', filter.subjectId)
  if (filter?.search) params.append('search', filter.search)

  const query = params.toString() ? `?${params.toString()}` : ''
  const bookmarks = await apiClient.get<SectionBookmark[]>(`/api/v1/me/bookmarks${query}`)
  if (Array.isArray(bookmarks)) {
    persistBookmarks(bookmarks)
    return bookmarks
  }
  return []
}

export async function toggleBookmarkOnApi(input: ToggleBookmarkInput): Promise<boolean> {
  const res = await apiClient.post<{ bookmarked: boolean; bookmark?: SectionBookmark }>(
    '/api/v1/me/bookmarks',
    input
  )
  const current = loadStoredData()
  if (res.bookmarked && res.bookmark) {
    persistBookmarks([res.bookmark, ...current.filter((b) => b.id !== res.bookmark!.id)])
  } else {
    persistBookmarks(
      current.filter((b) => !(b.lessonId === input.lessonId && b.sectionId === input.sectionId))
    )
  }
  return res.bookmarked
}

export async function removeBookmarkOnApi(lessonId: string, sectionId?: string): Promise<boolean> {
  const query = sectionId ? `?sectionId=${encodeURIComponent(sectionId)}` : ''
  await apiClient.delete(`/api/v1/me/bookmarks/${encodeURIComponent(lessonId)}${query}`)
  const current = loadStoredData()
  persistBookmarks(
    current.filter(
      (b) => !(b.lessonId === lessonId && (!sectionId || b.sectionId === sectionId))
    )
  )
  return true
}

export async function checkBookmarkOnApi(lessonId: string, sectionId: string): Promise<boolean> {
  const res = await apiClient.get<{ bookmarked: boolean }>(
    `/api/v1/me/bookmarks/check?lessonId=${encodeURIComponent(lessonId)}&sectionId=${encodeURIComponent(sectionId)}`
  )
  return res.bookmarked
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
      all.splice(existingIndex, 1)
      persistBookmarks(all)

      if (isAuthenticated()) {
        toggleBookmarkOnApi(input).catch((err) => {
          console.error('Failed to sync bookmark toggle to backend', err)
        })
      }
      return false
    }

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

    all.unshift(newBookmark)
    persistBookmarks(all)

    if (isAuthenticated()) {
      toggleBookmarkOnApi(input).catch((err) => {
        console.error('Failed to sync bookmark toggle to backend', err)
      })
    }
    return true
  },

  removeSectionBookmark(lessonId: string, sectionId: string): boolean {
    const all = loadStoredData()
    const initialLen = all.length
    const remaining = all.filter(
      (b) => !(b.lessonId === lessonId && b.sectionId === sectionId)
    )

    if (remaining.length !== initialLen) {
      persistBookmarks(remaining)
      if (isAuthenticated()) {
        removeBookmarkOnApi(lessonId, sectionId).catch((err) => {
          console.error('Failed to sync remove bookmark to backend', err)
        })
      }
      return true
    }
    return false
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
  sectionBookmarksService.removeSectionBookmark(lessonId, sectionId)

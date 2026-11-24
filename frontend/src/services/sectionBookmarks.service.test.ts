import { beforeEach, describe, expect, it, vi } from 'vitest'
import {
  getBookmarks,
  getBookmarksByLesson,
  isSectionBookmarked,
  removeSectionBookmark,
  SECTION_BOOKMARKS_STORAGE_KEY,
  toggleSectionBookmark,
} from './sectionBookmarks.service'

describe('sectionBookmarks.service', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('toggles bookmark on and off for a specific lesson section', () => {
    const input = {
      lessonId: 'lesson-math-01',
      subjectId: 'math',
      lessonTitle: 'Bài 01 · Sự đồng biến, nghịch biến',
      subjectName: 'Toán học',
      sectionId: 'formulas',
      sectionTitle: 'Công thức trọng tâm',
    }

    expect(isSectionBookmarked('lesson-math-01', 'formulas')).toBe(false)

    // Toggle ON
    const added = toggleSectionBookmark(input)
    expect(added).toBe(true)
    expect(isSectionBookmarked('lesson-math-01', 'formulas')).toBe(true)

    const storedRaw = localStorage.getItem(SECTION_BOOKMARKS_STORAGE_KEY)
    expect(storedRaw).toBeTruthy()
    const parsed = JSON.parse(storedRaw!)
    expect(parsed.version).toBe(1)
    expect(parsed.bookmarks.length).toBe(1)
    expect(parsed.bookmarks[0].sectionId).toBe('formulas')

    // Toggle OFF
    const removed = toggleSectionBookmark(input)
    expect(removed).toBe(false)
    expect(isSectionBookmarked('lesson-math-01', 'formulas')).toBe(false)
    expect(getBookmarks().length).toBe(0)
  })

  it('retrieves bookmarks by lesson', () => {
    toggleSectionBookmark({
      lessonId: 'lesson-math-01',
      subjectId: 'math',
      lessonTitle: 'Bài 01',
      subjectName: 'Toán học',
      sectionId: 'definitions',
      sectionTitle: 'Khái niệm',
    })

    toggleSectionBookmark({
      lessonId: 'lesson-math-01',
      subjectId: 'math',
      lessonTitle: 'Bài 01',
      subjectName: 'Toán học',
      sectionId: 'formulas',
      sectionTitle: 'Công thức',
    })

    toggleSectionBookmark({
      lessonId: 'lesson-phy-01',
      subjectId: 'physics',
      lessonTitle: 'Bài Lý 01',
      subjectName: 'Vật lý',
      sectionId: 'intro',
      sectionTitle: 'Mở đầu',
    })

    const mathBm = getBookmarksByLesson('lesson-math-01')
    expect(mathBm.length).toBe(2)

    const phyBm = getBookmarksByLesson('lesson-phy-01')
    expect(phyBm.length).toBe(1)
  })

  it('removes bookmark directly via removeSectionBookmark', () => {
    toggleSectionBookmark({
      lessonId: 'lesson-math-01',
      subjectId: 'math',
      lessonTitle: 'Bài 01',
      subjectName: 'Toán học',
      sectionId: 'examples',
      sectionTitle: 'Ví dụ mẫu',
    })

    expect(isSectionBookmarked('lesson-math-01', 'examples')).toBe(true)
    const res = removeSectionBookmark('lesson-math-01', 'examples')
    expect(res).toBe(true)
    expect(isSectionBookmarked('lesson-math-01', 'examples')).toBe(false)
  })

  describe('API integration', () => {
    it('fetches bookmarks from API and persists to local cache', async () => {
      const mockBookmarks = [
        {
          id: 'bm_les_sec',
          lessonId: 'les_1',
          subjectId: 'sub_math10',
          lessonTitle: 'Toán 10',
          subjectName: 'Toán học 10',
          sectionId: 'sec_1',
          sectionTitle: 'Phần 1',
          bookmarkedAt: new Date().toISOString(),
        },
      ]
      const { apiClient } = await import('@/lib/apiClient')
      const { fetchBookmarksFromApi } = await import('./sectionBookmarks.service')
      vi.spyOn(apiClient, 'get').mockResolvedValueOnce(mockBookmarks)

      const result = await fetchBookmarksFromApi({ lessonId: 'les_1' })
      expect(result).toEqual(mockBookmarks)
      expect(apiClient.get).toHaveBeenCalledWith('/api/v1/me/bookmarks?lessonId=les_1')
      expect(getBookmarks().length).toBe(1)
    })

    it('propagates API error when toggle fails', async () => {
      const { apiClient } = await import('@/lib/apiClient')
      const { toggleBookmarkOnApi } = await import('./sectionBookmarks.service')
      vi.spyOn(apiClient, 'post').mockRejectedValueOnce(new Error('Network error 500'))

      await expect(
        toggleBookmarkOnApi({
          lessonId: 'les_1',
          subjectId: 'sub_math10',
          lessonTitle: 'Toán 10',
          subjectName: 'Toán học 10',
          sectionId: 'sec_1',
          sectionTitle: 'Phần 1',
        })
      ).rejects.toThrow('Network error 500')
    })
  })
})


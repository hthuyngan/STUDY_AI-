import { beforeEach, describe, expect, it } from 'vitest'
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
})


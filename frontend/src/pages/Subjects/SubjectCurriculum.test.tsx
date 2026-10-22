import { describe, expect, it } from 'vitest'
import { mockSubjectDetails } from '@/data/subjects.mock'
import { getSubjectOutline } from '@/services/lesson.service'
import { getSubjectById, getSubjects } from '@/services/subjects.service'

describe('Subject Curriculum and Filtering Logic', () => {
  it('loads subjects with textbook curriculum metadata', async () => {
    const subjects = await getSubjects()
    expect(subjects.length).toBeGreaterThan(0)

    const math = subjects.find((s) => s.id === 'math')
    expect(math).toBeDefined()
    expect(math?.curriculumLabel).toBe('Giáo trình SGK')
    expect(math?.totalLessons).toBe(32)
    expect(math?.completedLessons).toBe(23)
  })

  it('loads math detail with structured chapters and lessons', async () => {
    const mathDetail = await getSubjectById('math')
    expect(mathDetail).not.toBeNull()
    expect(mathDetail?.chapters.length).toBeGreaterThanOrEqual(3)

    const allLessons = mathDetail!.chapters.flatMap((ch) => ch.lessons)
    expect(allLessons.length).toBeGreaterThan(0)

    // Check in-progress lessons count
    const inProgressLessons = allLessons.filter((l) => l.status === 'in-progress')
    expect(inProgressLessons.length).toBe(2)
    expect(inProgressLessons.map((l) => l.id)).toContain('lesson-math-08')
  })

  it('computes chapter statistics accurately for two-column chapter navigator', () => {
    const math = mockSubjectDetails.math
    const chap1 = math.chapters[0]
    const completed = chap1.lessons.filter((l) => l.status === 'completed').length
    const inProgress = chap1.lessons.filter((l) => l.status === 'in-progress').length
    const total = chap1.lessons.length

    expect(total).toBe(7)
    expect(completed).toBe(4)
    expect(inProgress).toBe(1)
    const percent = Math.round((completed / total) * 100)
    expect(percent).toBe(57)
  })

  it('filters chapters for In-Progress tab to only chapters with in-progress lessons', () => {
    const math = mockSubjectDetails.math
    const chaptersWithInProgress = math.chapters.filter((ch) =>
      ch.lessons.some((l) => l.status === 'in-progress')
    )

    // Chapter 1 has lesson-math-08 and Chapter 2 has lesson-math-203
    expect(chaptersWithInProgress.length).toBe(2)
    expect(chaptersWithInProgress.map((c) => c.id)).toEqual(['math-chap-1', 'math-chap-2'])
  })

  it('auto-selects chapter containing in-progress lesson', () => {
    const math = mockSubjectDetails.math
    const firstInProgressChap = math.chapters.find((ch) =>
      ch.lessons.some((l) => l.status === 'in-progress')
    )
    expect(firstInProgressChap).toBeDefined()
    expect(firstInProgressChap?.id).toBe('math-chap-1')
  })

  it('filters lessons by search query matching lesson title or chapter title', () => {
    const math = mockSubjectDetails.math
    const query = 'đạo hàm'

    const matchedLessons = math.chapters.flatMap((ch) =>
      ch.lessons.filter(
        (l) =>
          l.title.toLowerCase().includes(query) ||
          ch.title.toLowerCase().includes(query)
      )
    )

    expect(matchedLessons.length).toBeGreaterThan(0)
    expect(matchedLessons.some((l) => l.id === 'lesson-math-08')).toBe(true)
  })

  it('filters only in-progress lessons in In-Progress tab', () => {
    const math = mockSubjectDetails.math
    const allLessons = math.chapters.flatMap((ch) => ch.lessons)
    const inProgress = allLessons.filter((l) => l.status === 'in-progress')

    expect(inProgress.every((l) => l.status === 'in-progress')).toBe(true)
    expect(inProgress.some((l) => l.status === 'completed')).toBe(false)
    expect(inProgress.some((l) => l.status === 'available')).toBe(false)
    expect(inProgress.some((l) => l.status === 'locked')).toBe(false)
  })

  it('generates subject outline from subject curriculum for lesson view', async () => {
    const outline = await getSubjectOutline('math')
    expect(outline.length).toBeGreaterThan(0)
    expect(outline[0].lessons.length).toBeGreaterThan(0)
    expect(outline[0].lessons[0].id).toBe('lesson-math-01')
  })
})

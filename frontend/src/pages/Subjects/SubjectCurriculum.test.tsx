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

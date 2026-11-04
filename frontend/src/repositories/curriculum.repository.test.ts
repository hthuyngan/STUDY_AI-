import { describe, expect, it } from 'vitest'
import { curriculumRepository } from './curriculum.repository'

describe('CurriculumRepository (GDPT 2018 Foundation)', () => {
  it('loads all 9 GDPT 2018 standard subjects', async () => {
    const subjects = await curriculumRepository.getAllSubjects()
    expect(subjects).toHaveLength(9)

    const subjectIds = subjects.map((s) => s.id)
    expect(subjectIds).toContain('math')
    expect(subjectIds).toContain('literature')
    expect(subjectIds).toContain('english')
    expect(subjectIds).toContain('physics')
    expect(subjectIds).toContain('chemistry')
    expect(subjectIds).toContain('biology')
    expect(subjectIds).toContain('history')
    expect(subjectIds).toContain('geography')
    expect(subjectIds).toContain('economic-law')
  })

  it('correctly filters available vs coming_soon subjects', async () => {
    const available = await curriculumRepository.getSubjects({ availability: 'available' })
    expect(available).toHaveLength(1)
    expect(available[0].id).toBe('math')

    const comingSoon = await curriculumRepository.getSubjects({ availability: 'coming_soon' })
    expect(comingSoon).toHaveLength(8)
  })

  it('filters subjects by search query keyword', async () => {
    const resultMath = await curriculumRepository.getSubjects({ searchQuery: 'Toán' })
    expect(resultMath.some((s) => s.id === 'math')).toBe(true)

    const resultHistory = await curriculumRepository.getSubjects({ searchQuery: 'Lịch sử' })
    expect(resultHistory.some((s) => s.id === 'history')).toBe(true)

    const resultKeyword = await curriculumRepository.getSubjects({ searchQuery: 'đạo hàm' })
    expect(resultKeyword.some((s) => s.id === 'math')).toBe(true)
  })

  it('retrieves Math 12 Chapter 1 with 3 lessons', async () => {
    const math = await curriculumRepository.getSubjectById('math')
    expect(math).not.toBeNull()
    expect(math?.metadata.curriculumVersion).toBe('GDPT_2018')

    const grade12 = math?.grades.find((g) => g.grade === '12')
    expect(grade12).toBeDefined()
    expect(grade12?.chapters.length).toBeGreaterThanOrEqual(1)

    const chapter1 = grade12?.chapters[0]
    expect(chapter1?.id).toBe('math-chap-1')
    expect(chapter1?.lessons).toHaveLength(3)
  })

  it('retrieves Math 12 lessons with full pedagogy: objectives, skills, formulas, examples', async () => {
    const lesson1 = await curriculumRepository.getLessonById('lesson-math-12-01')
    expect(lesson1).not.toBeNull()
    expect(lesson1?.title).toBe('Tính đơn điệu và cực trị của hàm số')
    expect(lesson1?.learningObjectives.length).toBeGreaterThanOrEqual(3)
    expect(lesson1?.skills.length).toBeGreaterThanOrEqual(3)
    expect(lesson1?.content?.formulas.length).toBeGreaterThanOrEqual(2)
    expect(lesson1?.content?.examples.length).toBeGreaterThanOrEqual(2)
  })

  it('resolves legacy and alternate lesson IDs via alias mapping', async () => {
    const fromAlias01 = await curriculumRepository.getLessonById('lesson-math-01')
    expect(fromAlias01).not.toBeNull()
    expect(fromAlias01?.id).toBe('lesson-math-12-01')

    const fromAlias02 = await curriculumRepository.getLessonById('lesson-math-02')
    expect(fromAlias02).not.toBeNull()
    expect(fromAlias02?.id).toBe('lesson-math-12-02')

    const fromAlias08 = await curriculumRepository.getLessonById('lesson-math-08')
    expect(fromAlias08).not.toBeNull()
    expect(fromAlias08?.id).toBe('lesson-math-12-03')

    const fromAliasLes = await curriculumRepository.getLessonById('les-math-12-01')
    expect(fromAliasLes).not.toBeNull()
    expect(fromAliasLes?.id).toBe('lesson-math-12-03')
  })

  it('manages standard GDPT 2018 skills with unique codes', async () => {
    const skills = await curriculumRepository.getSkills('math', '12')
    expect(skills.length).toBeGreaterThanOrEqual(8)

    const monoSkill = await curriculumRepository.getSkillByCode('SKILL-MATH-12-MONOTONICITY')
    expect(monoSkill).not.toBeNull()
    expect(monoSkill?.name).toBe('Xét dấu đạo hàm xác định khoảng đơn điệu')
  })

  it('returns null for non-existent subject, chapter, or lesson', async () => {
    expect(await curriculumRepository.getSubjectById('non-existent')).toBeNull()
    expect(await curriculumRepository.getChapterById('fake-chapter')).toBeNull()
    expect(await curriculumRepository.getLessonById('fake-lesson')).toBeNull()
    expect(await curriculumRepository.getSkillByCode('FAKE-SKILL-CODE')).toBeNull()
  })
})

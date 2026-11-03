import { beforeEach, describe, expect, it } from 'vitest'
import { learningProgressRepository } from '@/repositories/learningProgress.repository'
import {
  getContinueLearningTarget,
  getSubjectLearningPath,
} from './learningPath.service'

describe('learningPath.service', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('builds a sequential subject learning path with chapters and lessons', () => {
    const path = getSubjectLearningPath('math')
    expect(path.subjectId).toBe('math')
    expect(path.subjectName).toBe('Toán học')
    expect(path.chapters.length).toBeGreaterThan(0)
    expect(path.totalLessons).toBeGreaterThan(0)

    const firstChap = path.chapters[0]
    expect(firstChap.lessons.length).toBeGreaterThan(0)
    expect(firstChap.order).toBe(1)
  })

  it('recommends an in-progress lesson as Priority 1', () => {
    // Save progress for lesson-math-04: in-progress (60%)
    learningProgressRepository.save({
      lessonId: 'lesson-math-04',
      subjectId: 'math',
      completedSectionIds: ['intro'],
      contentProgress: 60,
      assessmentScore: 0,
      assessmentStatus: 'not-attempted',
      overallProgress: 60,
      lastActiveSectionId: 'formulas',
      lastActiveSectionTitle: 'Công thức trọng tâm',
      updatedAt: new Date().toISOString(),
    })

    const path = getSubjectLearningPath('math')
    expect(path.recommendedLesson).not.toBeNull()
    expect(path.recommendedLesson!.id).toBe('lesson-math-04')
    expect(path.recommendedLesson!.status).toBe('in-progress')
    expect(path.recommendedLesson!.isRecommendedNext).toBe(true)
    expect(path.recommendedLesson!.lastActiveSectionId).toBe('formulas')
  })

  it('recommends next unstarted lesson in syllabus if none is in progress (Priority 2)', () => {
    const path = getSubjectLearningPath('math')
    expect(path.recommendedLesson).not.toBeNull()
    // It should pick a valid lesson in syllabus
    expect(path.recommendedLesson!.isRecommendedNext).toBe(true)
  })

  it('calculates ContinueLearningTarget across subjects correctly', () => {
    learningProgressRepository.save({
      lessonId: 'lesson-phy-02',
      subjectId: 'physics',
      completedSectionIds: ['intro'],
      contentProgress: 40,
      assessmentScore: 0,
      assessmentStatus: 'not-attempted',
      overallProgress: 40,
      lastActiveSectionId: 'definitions',
      lastActiveSectionTitle: 'Định nghĩa dao động điều hòa',
      updatedAt: new Date().toISOString(),
    })

    const target = getContinueLearningTarget()
    expect(target).not.toBeNull()
    expect(target!.lessonId).toBe('lesson-phy-02')
    expect(target!.subjectId).toBe('physics')
    expect(target!.progress).toBe(40)
    expect(target!.sectionId).toBe('definitions')
    expect(target!.sectionTitle).toBe('Định nghĩa dao động điều hòa')
  })
})


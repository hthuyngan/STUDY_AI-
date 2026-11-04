/**
 * Curriculum Repository — STUDY_AI Phase 9
 * Standardized GDPT 2018 repository providing stateless curriculum content,
 * lessons, skills, and availability filtering.
 */

import { MASTER_CURRICULUM_SUBJECTS, MASTER_SKILLS } from '@/data/curriculum.data'
import type {
  ContentAvailability,
  CurriculumChapter,
  CurriculumLesson,
  CurriculumSubject,
  GradeLevel,
  Skill,
} from '@/types/curriculum'

export interface CurriculumFilterOptions {
  grade?: GradeLevel
  availability?: ContentAvailability
  searchQuery?: string
}

export interface ICurriculumRepository {
  getAllSubjects(): Promise<CurriculumSubject[]>
  getSubjects(filters?: CurriculumFilterOptions): Promise<CurriculumSubject[]>
  getSubjectById(id: string): Promise<CurriculumSubject | null>
  getChapterById(chapterId: string): Promise<CurriculumChapter | null>
  getLessonById(lessonId: string): Promise<CurriculumLesson | null>
  getSkills(subjectId?: string, grade?: GradeLevel): Promise<Skill[]>
  getSkillByCode(code: string): Promise<Skill | null>
}

/**
 * Backward compatibility alias mapping for legacy and alternate lesson IDs.
 */
const LESSON_ID_ALIASES: Record<string, string> = {
  'lesson-math-01': 'lesson-math-12-01',
  'lesson-math-02': 'lesson-math-12-02',
  'lesson-math-08': 'lesson-math-12-03',
  'les-math-12-01': 'lesson-math-12-03',
}

export class MockCurriculumAdapter implements ICurriculumRepository {
  private subjects: CurriculumSubject[]
  private skills: Skill[]

  constructor(subjects: CurriculumSubject[] = MASTER_CURRICULUM_SUBJECTS, skills: Skill[] = MASTER_SKILLS) {
    this.subjects = subjects
    this.skills = skills
  }

  async getAllSubjects(): Promise<CurriculumSubject[]> {
    return [...this.subjects]
  }

  async getSubjects(filters?: CurriculumFilterOptions): Promise<CurriculumSubject[]> {
    let result = [...this.subjects]

    if (filters?.availability) {
      result = result.filter((s) => s.availability === filters.availability)
    }

    if (filters?.grade) {
      result = result.filter((s) => s.grades.some((g) => g.grade === filters.grade))
    }

    if (filters?.searchQuery && filters.searchQuery.trim() !== '') {
      const q = filters.searchQuery.toLowerCase().trim()
      result = result.filter(
        (s) =>
          s.name.toLowerCase().includes(q) ||
          s.shortName.toLowerCase().includes(q) ||
          s.description.toLowerCase().includes(q) ||
          (s.plannedTopics && s.plannedTopics.some((t) => t.toLowerCase().includes(q))) ||
          s.grades.some((g) =>
            g.chapters.some(
              (c) =>
                c.title.toLowerCase().includes(q) ||
                c.lessons.some((l) => l.title.toLowerCase().includes(q))
            )
          )
      )
    }

    return result
  }

  async getSubjectById(id: string): Promise<CurriculumSubject | null> {
    const normalized = id.toLowerCase().trim()
    const found = this.subjects.find((s) => s.id.toLowerCase() === normalized)
    return found ? { ...found } : null
  }

  async getChapterById(chapterId: string): Promise<CurriculumChapter | null> {
    for (const sub of this.subjects) {
      for (const gr of sub.grades) {
        const chapter = gr.chapters.find((c) => c.id === chapterId)
        if (chapter) return { ...chapter }
      }
    }
    return null
  }

  async getLessonById(lessonId: string): Promise<CurriculumLesson | null> {
    const resolvedId = LESSON_ID_ALIASES[lessonId] || lessonId
    for (const sub of this.subjects) {
      for (const gr of sub.grades) {
        for (const ch of gr.chapters) {
          const lesson = ch.lessons.find((l) => l.id === resolvedId || l.id === lessonId)
          if (lesson) return { ...lesson }
        }
      }
    }
    return null
  }

  async getSkills(subjectId?: string, grade?: GradeLevel): Promise<Skill[]> {
    let result = [...this.skills]
    if (subjectId) {
      result = result.filter((sk) => sk.subjectId.toLowerCase() === subjectId.toLowerCase())
    }
    if (grade) {
      result = result.filter((sk) => sk.grade === grade)
    }
    return result
  }

  async getSkillByCode(code: string): Promise<Skill | null> {
    const normalized = code.trim().toUpperCase()
    const found = this.skills.find((sk) => sk.code.toUpperCase() === normalized)
    return found ? { ...found } : null
  }
}

export const curriculumRepository = new MockCurriculumAdapter()

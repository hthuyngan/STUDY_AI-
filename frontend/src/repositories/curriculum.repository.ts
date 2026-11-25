/**
 * Curriculum Repository Contract
 * Production code must use authenticated backend curriculum APIs (services/curriculum.service.ts).
 * MockCurriculumAdapter was removed from runtime registration in Phase P00 (CURR-007).
 */

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
  getChaptersBySubjectId(subjectId: string, grade?: GradeLevel): Promise<CurriculumChapter[]>
  getChapterById(chapterId: string): Promise<CurriculumChapter | null>
  getLessonById(lessonId: string): Promise<CurriculumLesson | null>
  getSkills(subjectId?: string, grade?: GradeLevel): Promise<Skill[]>
  getSkillsByLessonId(lessonId: string): Promise<Skill[]>
  getSkillByCode(code: string): Promise<Skill | null>
}

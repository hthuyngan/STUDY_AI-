/**
 * Curriculum & Learning Content Foundation Types — STUDY_AI Phase 9
 * Standardized according to Vietnam General Education Curriculum (GDPT 2018).
 */

export type GradeLevel = '10' | '11' | '12'

export type CurriculumVersion = 'GDPT_2018'

export type TextbookAlignment =
  | 'ket_noi_tri_thuc'
  | 'canh_dieu'
  | 'chan_troi_sang_tao'
  | 'general_standard'

export type ContentAvailability = 'available' | 'preview' | 'coming_soon' | 'unavailable'

export type ReviewStatus = 'published' | 'draft' | 'under_review'

export interface ContentSourceMetadata {
  curriculumVersion: CurriculumVersion
  textbookAlignment?: TextbookAlignment
  textbookLabel?: string
  authorName?: string
  reviewStatus: ReviewStatus
  reviewedAt?: string
  lastUpdatedAt?: string
  licenseNotice?: string
}

export type SkillCategory = 'conceptual' | 'procedural' | 'application' | 'evaluative'

export interface Skill {
  id: string
  code: string // e.g. "SKILL-MATH-12-MONOTONICITY"
  name: string
  subjectId: string
  grade: GradeLevel
  description: string
  category: SkillCategory
}

export interface LessonSkill {
  skillId: string
  skillCode: string
  skillName: string
  level: 'core' | 'supporting' | 'advanced'
}

export interface LearningContentBlock {
  id: string
  type: 'introduction' | 'definition' | 'formula' | 'example' | 'important_note' | 'summary'
  title?: string
  content?: string
  math?: string
  note?: string
  steps?: {
    step: number
    explanation: string
    math?: string
  }[]
}

export interface CurriculumLessonContent {
  introduction: string
  definitions: Array<{ term: string; content: string }>
  formulas: Array<{ id: string; label: string; formula: string; note?: string }>
  examples: Array<{
    id: string
    title: string
    problem: string
    solutionSteps: Array<{ step: number; explanation: string; math?: string }>
    conclusion: string
  }>
  importantNotes: string[]
  summaryPoints: string[]
}

export interface CurriculumLesson {
  id: string
  chapterId: string
  subjectId: string
  grade: GradeLevel
  lessonNumber: number
  title: string
  description?: string
  durationMinutes: number
  xp: number
  availability: ContentAvailability
  learningObjectives: string[]
  skills: LessonSkill[]
  quizId?: string
  assessmentId?: string
  previousLessonId?: string
  nextLessonId?: string
  metadata: ContentSourceMetadata
  content?: CurriculumLessonContent
}

export interface CurriculumChapter {
  id: string
  subjectId: string
  grade: GradeLevel
  chapterNumber: number
  title: string
  description: string
  availability: ContentAvailability
  estimatedHours: number
  totalLessons: number
  lessons: CurriculumLesson[]
}

export interface CurriculumGrade {
  grade: GradeLevel
  label: string
  availability: ContentAvailability
  chapters: CurriculumChapter[]
}

export interface CurriculumSubject {
  id: string // 'math', 'literature', 'english', 'physics', 'chemistry', 'biology', 'history', 'geography', 'economic-law'
  name: string
  shortName: string
  icon: string
  color: string
  bgColor: string
  borderColor?: string
  description: string
  availability: ContentAvailability
  metadata: ContentSourceMetadata
  plannedTopics?: string[]
  grades: CurriculumGrade[]
}

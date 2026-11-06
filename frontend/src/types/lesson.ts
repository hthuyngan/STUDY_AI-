import type { LessonSkill } from './curriculum'

export interface FormulaItem {
  id: string
  label: string
  formula: string
  note?: string
}

export interface ExampleStep {
  step: number
  explanation: string
  math?: string
}

export interface ExampleItem {
  id: string
  title: string
  problem: string
  solutionSteps: ExampleStep[]
  conclusion: string
}

export interface LessonContent {
  introduction: string
  definitions: {
    term: string
    content: string
  }[]
  formulas: FormulaItem[]
  examples: ExampleItem[]
  variationTables?: Array<{
    id?: string
    title: string
    functionMath?: string
    columns: Array<{
      x: string
      yPrime: string
      y: {
        value: string
        position?: 'top' | 'middle' | 'bottom'
        arrow?: 'up' | 'down' | 'none'
      }
    }>
    note?: string
  }>
  functionGraphs?: Array<{
    id?: string
    title: string
    functionFormula: string
    functionType: 'cubic' | 'rational' | 'custom'
    domain?: [number, number]
    range?: [number, number]
    keyPoints?: Array<{
      x: number
      y: number
      label: string
      type: 'max' | 'min' | 'inflection' | 'intercept' | 'asymptote_center'
    }>
    asymptotes?: Array<{
      type: 'vertical' | 'horizontal'
      value: number
      label: string
    }>
    note?: string
  }>
  commonMistakes?: Array<{
    title: string
    mistake: string
    correctExplanation: string
  }>
  importantNotes: string[]
  summaryPoints: string[]
}

export interface LessonDetail {
  id: string
  courseId: string
  courseTitle: string
  subjectId: string
  subjectName: string
  chapterId: string
  chapterTitle: string
  lessonNumber: number
  title: string
  durationMinutes: number
  xp: number
  isCompleted: boolean
  isBookmarked?: boolean
  quizId?: string
  assessmentId?: string
  content: LessonContent
  previousLessonId?: string
  nextLessonId?: string
  learningObjectives?: string[]
  skills?: LessonSkill[]
  curriculumVersion?: string
  textbookAlignment?: string
}

export interface LessonOutlineItem {
  id: string
  lessonNumber: number
  title: string
  status: 'completed' | 'in-progress' | 'available' | 'locked'
  durationMinutes: number
}

export interface CourseOutlineChapter {
  id: string
  title: string
  lessons: LessonOutlineItem[]
}

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
  content: LessonContent
  previousLessonId?: string
  nextLessonId?: string
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

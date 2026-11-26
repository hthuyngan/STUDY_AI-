export type ContentStatus = 'draft' | 'in-review' | 'changes-requested' | 'approved' | 'published' | 'archived'

export interface CurriculumSubjectItem {
  id: string
  name: string
  grade: string
  chapterCount: number
  lessonCount: number
  assessmentCount: number
  publishedPercent: number
  updatedAt: string
}

export interface ContentLessonItem {
  id: string
  title: string
  subjectId: string
  subjectName: string
  chapterId: string
  chapterName: string
  status: ContentStatus
  authorName: string
  updatedAt: string
  hasAssessment: boolean
}

export interface StructuredDefinitionItem {
  id?: string
  term: string
  content: string
}

export interface StructuredFormulaItem {
  id?: string
  label: string
  formula: string
  note?: string
}

export interface StructuredExampleStep {
  step: number
  explanation: string
  math?: string
}

export interface StructuredExampleItem {
  id?: string
  title: string
  problem: string
  solutionSteps?: StructuredExampleStep[]
  conclusion?: string
}

export interface StructuredLearningObjective {
  id?: string
  code?: string
  description: string
  bloomLevel?: string
}

export interface LessonEditorData {
  id: string
  code?: string
  curriculumEditionId?: string
  curriculumEditionName?: string
  title: string
  subjectId: string
  subjectName?: string
  chapterId: string
  chapterTitle?: string
  status: ContentStatus
  rowVersion?: string
  introduction: string
  learningObjectives?: Array<string | StructuredLearningObjective>
  definitions: StructuredDefinitionItem[]
  formulas: StructuredFormulaItem[]
  examples: StructuredExampleItem[]
  notes: string[]
  summary: string[]
  questionsCount?: number
  assessmentId?: string
  assessmentTitle?: string
  lastSavedAt?: string
}

export interface ContentAssessmentSummary {
  id: string
  lessonId: string
  lessonTitle: string
  questionCount: number
  passingScore: number
  status: ContentStatus
  updatedAt: string
}

export interface ContentReviewQueueItem {
  id: string
  title: string
  type: 'lesson' | 'assessment'
  subject: string
  author: string
  submittedAt: string
  status: 'pending' | 'changes-requested' | 'approved'
  reviewer?: string
  commentsCount: number
}

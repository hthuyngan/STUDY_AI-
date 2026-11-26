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

export type LessonBlockType =
  | 'text'
  | 'markdown'
  | 'formula'
  | 'image'
  | 'video'
  | 'example'
  | 'exercise'
  | 'table'
  | 'diagram'
  | 'timeline'
  | 'summary'
  | 'reference'

export type LessonContentBlock =
  | { id?: string; blockType: 'text'; schemaVersion: 1; orderIndex: number; payload: { content: string } }
  | { id?: string; blockType: 'markdown'; schemaVersion: 1; orderIndex: number; payload: { content: string } }
  | { id?: string; blockType: 'formula'; schemaVersion: 1; orderIndex: number; payload: { latex: string; displayMode?: boolean; caption?: string } }
  | { id?: string; blockType: 'image'; schemaVersion: 1; orderIndex: number; payload: { url: string; alt: string; caption?: string } }
  | { id?: string; blockType: 'video'; schemaVersion: 1; orderIndex: number; payload: { url: string; title: string; provider?: string; durationSeconds?: number } }
  | { id?: string; blockType: 'example'; schemaVersion: 1; orderIndex: number; payload: { title: string; prompt: string; solution?: string } }
  | { id?: string; blockType: 'exercise'; schemaVersion: 1; orderIndex: number; payload: { prompt: string; hint?: string; solution?: string; answerKey?: string } }
  | { id?: string; blockType: 'table'; schemaVersion: 1; orderIndex: number; payload: { headers: string[]; rows: string[][]; caption?: string } }
  | { id?: string; blockType: 'diagram'; schemaVersion: 1; orderIndex: number; payload: { format: 'mermaid' | 'svg-ref' | 'structured'; source: string; alt: string; caption?: string } }
  | { id?: string; blockType: 'timeline'; schemaVersion: 1; orderIndex: number; payload: { events: Array<{ date: string; title: string; description?: string }>; caption?: string } }
  | { id?: string; blockType: 'summary'; schemaVersion: 1; orderIndex: number; payload: { title?: string; points: string[] } }
  | { id?: string; blockType: 'reference'; schemaVersion: 1; orderIndex: number; payload: { label: string; url?: string; citation?: string } }

export interface CurriculumNodeRef {
  id: string
  curriculumId: string
  code: string
  title: string
  description?: string | null
  cognitiveLevel?: string | null
  status: string
}

export interface PrerequisiteLessonRef {
  lessonId: string
  code?: string | null
  title: string
  chapterId: string
  status: string
}

export interface LessonComposition {
  lessonId: string
  title: string
  status: ContentStatus
  curriculumId?: string | null
  rowVersion: string
  blocks: LessonContentBlock[]
  objectives: CurriculumNodeRef[]
  knowledgeUnits: CurriculumNodeRef[]
  skills: CurriculumNodeRef[]
  prerequisites: PrerequisiteLessonRef[]
}

export interface LessonRevision {
  id: string
  contentId: string
  version: number
  status: string
  title: string
  snapshotSchemaVersion: number
  authorId?: string | null
  createdBy?: string | null
  reason?: string | null
  sourceRevisionId?: string | null
  createdAt: string
}

export interface LessonRevisionPage {
  items: LessonRevision[]
  page: number
  pageSize: number
  totalCount: number
}

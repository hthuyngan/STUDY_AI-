// ============================================================
// AI TUTOR TYPES — STUDY_AI (PHASE 8: CONTEXTUAL LEARNING ASSISTANCE)
// ============================================================

export type ChatRole = 'user' | 'assistant' | 'system'

export type MessageStatus = 'sending' | 'streaming' | 'done' | 'error'

export type TutorContextSource =
  | 'lesson'
  | 'lesson-section'
  | 'assessment-question'
  | 'knowledge-gap'
  | 'study-note'
  | 'smart-review'

export interface TutorLearningContext {
  source: TutorContextSource
  subjectId?: string
  subjectName?: string
  chapterId?: string
  chapterTitle?: string
  lessonId?: string
  lessonTitle?: string
  sectionId?: string
  sectionTitle?: string
  questionId?: string
  questionPrompt?: string
  selectedAnswer?: string
  correctAnswer?: string
  explanation?: string
  knowledgeGapId?: string
  studyNoteId?: string
  title: string
  excerpt?: string
  returnUrl?: string
}

export type LearningAssistanceMode =
  | 'explain'
  | 'hint'
  | 'step-by-step'
  | 'practice'
  | 'summarize'

export interface LearningAssistanceModeConfig {
  id: LearningAssistanceMode
  label: string
  shortLabel: string
  description: string
  icon: string
  promptPrefix: string
}

export interface ChatMessage {
  id: string
  role: ChatRole
  content: string
  createdAt: string
  status?: MessageStatus
  suggestedActions?: string[]
  subjectContext?: string
  learningContextSnapshot?: TutorLearningContext
  assistanceMode?: LearningAssistanceMode
}

export interface ChatConversation {
  id: string
  title: string
  subject?: string
  createdAt: string
  updatedAt: string
  messages: ChatMessage[]
  learningContext?: TutorLearningContext
  assistanceMode?: LearningAssistanceMode
}

export interface SendMessagePayload {
  conversationId: string
  message: string
  subject?: string
  learningContext?: TutorLearningContext
  mode?: LearningAssistanceMode
}

export interface SuggestedPrompt {
  id: string
  title: string
  subject: string
  subjectLabel?: string
  prompt: string
  icon?: string
}

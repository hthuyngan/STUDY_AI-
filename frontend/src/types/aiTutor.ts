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

// ============================================================
// PHASE AI-01: INTELLIGENT LEARNING ENGINE TYPES
// ============================================================

export interface HintResponse {
  questionId: string
  hintLevel: number
  hintLevelName: string
  hintText: string
  mathFormulas: string[]
  suggestedNextSteps: string[]
  provider?: string
  isFallback?: boolean
}

export interface QuestionErrorDetail {
  questionId: string
  stem: string
  questionType: string
  difficulty: string
  studentAnswerDisplay?: string
  correctAnswerDisplay?: string
  errorClassification: 'deducible' | 'hypothesized' | 'verified' | string
  likelyCause: string
  prerequisiteConcept: string
  correctMethod: string
  recommendedLessonId?: string
  recommendedLessonTitle?: string
}

export interface AiErrorAnalysisResult {
  sessionId: string
  userId: string
  totalQuestions: number
  correctCount: number
  incorrectCount: number
  score: number
  overallAssessment: string
  analyzedErrors: QuestionErrorDetail[]
  keyConceptsToReview: string[]
  nextPracticeSuggestions: string[]
  analyzedAt: string
}

export interface CognitiveBreakdown {
  total: number
  correct: number
  accuracyPercent: number
}

export interface SkillMasteryItem {
  skillId: string
  skillName: string
  subjectId: string
  masteryScore: number
  status: 'insufficient_data' | 'needs_reinforcement' | 'progressing' | 'proficient' | 'mastered' | string
  totalAttempted: number
  totalCorrect: number
  cognitiveBreakdown?: Record<string, CognitiveBreakdown>
  lastAttemptAt?: string
}

export interface SkillMasteryResponse {
  userId: string
  overallMasteryScore: number
  skillsEvaluated: number
  skillsMastered: number
  skills: SkillMasteryItem[]
}

export interface AdaptiveStep {
  stepNumber: number
  title: string
  objective: string
  actionType: 'review_lesson' | 'practice_skill' | 'diagnostic_practice' | 'next_lesson' | string
  targetRoute: string
  lessonId?: string
  skillId?: string
  priority: 'high' | 'medium' | 'standard' | string
  isCompleted: boolean
}

export interface AdaptiveLearningPath {
  id: string
  userId: string
  subjectId: string
  currentStage: string
  stageDescription: string
  steps: AdaptiveStep[]
  generatedAt: string
}

export interface AiLearningRecommendation {
  id: string
  userId: string
  lessonId: string
  lessonTitle: string
  chapterTitle?: string
  topicName?: string
  reason: string
  priority: string
  status: string
  createdAt: string
}

export interface AiUsageStats {
  totalRequests: number
  totalInputTokens: number
  totalOutputTokens: number
  estimatedTotalCostUsd: number
  averageLatencyMs: number
  successCount: number
  errorCount: number
  fallbackCount?: number
  rateLimitCount?: number
  timeoutCount?: number
  budgetWarning?: boolean
  dailyBudgetUsd?: number
  featureBreakdown: Record<string, number>
  modelBreakdown: Record<string, number>
  dailyCostBreakdown?: Record<string, number>
}

export interface AiUsageLogItem {
  id: string
  userId: string
  feature: string
  provider: string
  model: string
  inputTokens: number
  outputTokens: number
  estimatedCostUsd: number
  latencyMs: number
  status: string
  errorMessage?: string
  createdAt: string
}

export interface AiFeatureConfig {
  enableTutor: boolean
  enableHints: boolean
  enableErrorAnalysis: boolean
  enableLearningPath: boolean
  providerName: string
  modelName: string
  reasoningModelName?: string
  fallbackModelName?: string
  isConfigured: boolean
  maxDailyTokensPerUser: number
}

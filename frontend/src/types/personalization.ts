/**
 * Phase 13 — Personalized Learning Engine Domain Model
 * Strictly evidence-based, derived solely from verified PracticeResult records.
 * Zero fake KPIs, zero fake mastery, zero simulated activity.
 */

export type ConfidenceLevel = 'insufficient' | 'low' | 'moderate' | 'high'

export type PerformanceStatus =
  | 'no_data'
  | 'insufficient_data'
  | 'needs_review'
  | 'reinforcing'
  | 'proficient'

export type PerformanceTrend =
  | 'improving'
  | 'declining'
  | 'stable'
  | 'insufficient_data'

export type GapSeverity = 'critical' | 'moderate' | 'minor'

export type RecommendationActionType =
  | 'review_lesson'
  | 'practice_skill'
  | 'reinforcement'
  | 'diagnostic_practice'
  | 'continue_learning'

export interface QuestionAttemptEvidence {
  sessionId: string
  questionId: string
  lessonId?: string
  timestamp: string
  isFullyCorrect: boolean
  earnedPoints: number
  maxPoints: number
  skillWeight: number
}

/**
 * 1. SkillEvidence: Aggregated raw factual evidence from valid practice results
 */
export interface SkillEvidence {
  skillId: string
  attemptCount: number // Number of practice sessions involving this skill
  questionCount: number // Total times questions for this skill were answered
  uniqueQuestionIds: string[] // Unique question items encountered
  fullyCorrectCount: number
  earnedPoints: number // Fractional points allocated
  maxPoints: number
  firstAttemptAt: string
  lastAttemptAt: string
  relatedQuestionIds: string[]
  relatedSessionIds: string[]
  relatedLessonIds: string[]
  repeatedQuestionCount: number // How many times same questions were retaken
  chronologicalAttempts: QuestionAttemptEvidence[]
}

/**
 * 2. SkillPerformance: Evaluated capability indicator with confidence & trend
 */
export interface SkillPerformance {
  skillId: string
  skillName: string
  scoreRatio: number // earnedPoints / maxPoints (0.0 to 1.0)
  evidenceCount: number // Number of distinct questions evaluated
  confidenceLevel: ConfidenceLevel
  trend: PerformanceTrend
  status: PerformanceStatus
  lastPracticedAt: string
  relatedLessonIds: string[]
}

/**
 * 3. KnowledgeGapItem: Actionable learning weakness identified from real errors
 */
export interface KnowledgeGapItem {
  id: string
  skillId: string
  skillName: string
  gapLevel: GapSeverity
  scoreRatio: number
  evidenceSummary: string // E.g.: "Chưa chính xác ở 2/3 câu hỏi về tiệm cận đứng"
  confidenceLevel: ConfidenceLevel
  relatedLessonIds: string[]
  recommendedActions: string[]
  detectedAt: string
}

/**
 * 4. LearningRecommendation: Explainable pedagogical recommendation
 */
export interface LearningRecommendation {
  id: string
  skillId: string
  skillName: string
  title: string
  reason: string
  evidence: string
  actionType: RecommendationActionType
  targetLessonId?: string
  targetSubjectId?: string
  targetChapterId?: string
  practiceConfig?: {
    skillId: string
    limit: number
    subjectId: string
    chapterId?: string
  }
  priority: 'high' | 'medium' | 'low'
  createdAt: string
}

/**
 * 5. LearningPathStep: Specific sequential action step in adaptive roadmap
 */
export interface LearningPathStep {
  id: string
  stepNumber: number
  title: string
  objective: string
  reason: string
  actionType: 'review_lesson' | 'practice_skill' | 'diagnostic_practice'
  targetRoute: string
  targetParams?: Record<string, string | number>
  skillId?: string
  lessonId?: string
  isCompleted: boolean
  badgeText?: string
}

/**
 * 6. PersonalizedLearningPath: Concise 3-5 step adaptive learning path
 */
export interface PersonalizedLearningPath {
  id: string
  generatedAt: string
  sourceResultIds: string[]
  steps: LearningPathStep[]
  explanation: string
  status: 'active' | 'empty' | 'completed'
}

/**
 * 7. LearnerAnalyticsSummary: High-level evidence overview (Zero fake KPIs)
 */
export interface LearnerAnalyticsSummary {
  totalSessions: number
  totalQuestionsAnswered: number
  uniqueQuestionsAnswered: number
  overallScoreRatio: number // 0 to 1
  skillsEvaluatedCount: number
  skillsWithSufficientDataCount: number
  skillsNeedingDataCount: number
  knowledgeGapsCount: number
  firstSessionAt: string | null
  lastSessionAt: string | null
}

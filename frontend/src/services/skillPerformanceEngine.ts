/**
 * Skill Performance Engine & Confidence Model
 * Computes observed score ratios, evidence sufficiency, and longitudinal trends.
 * Rejects premature conclusions on sparse data (single questions, repeated identical items).
 * Note: Confidence levels represent "Evidence Sufficiency" (Mức độ đầy đủ của bằng chứng quan sát),
 * not calibrated statistical population probabilities.
 */

import type {
  ConfidenceLevel,
  PerformanceStatus,
  PerformanceTrend,
  SkillEvidence,
  SkillPerformance,
} from '@/types/personalization'

export interface PerformanceEngineConfig {
  needsReviewThreshold?: number // default 0.60
  reinforcingThreshold?: number // default 0.80
  minUniqueQuestionsForConfidence?: number // default 2
}

const DEFAULT_CONFIG: Required<PerformanceEngineConfig> = {
  needsReviewThreshold: 0.6,
  reinforcingThreshold: 0.8,
  minUniqueQuestionsForConfidence: 2,
}

/**
 * Computes observed evidence sufficiency (Mức độ đầy đủ của bằng chứng) based on question diversity and repeated attempts.
 * Invariant: Retaking the same question multiple times does NOT increase evidence sufficiency!
 */
export function evaluateConfidenceLevel(ev: SkillEvidence): ConfidenceLevel {
  const uniqueCount = ev.uniqueQuestionIds.length

  // Sparse data rule: 0 or 1 unique question provides insufficient evidence
  if (uniqueCount < 2) {
    return 'insufficient'
  }

  // High evidence sufficiency requires substantial evidence breadth and multiple sessions
  if (uniqueCount >= 6 && ev.attemptCount >= 3) {
    return 'high'
  }

  // Moderate evidence sufficiency
  if (uniqueCount >= 4 && ev.attemptCount >= 2) {
    return 'moderate'
  }

  // Low evidence sufficiency for 2-3 questions
  return 'low'
}

/**
 * Calculates temporal performance trend by comparing chronological attempts across distinct questions.
 * Invariant: Returns 'insufficient_data' if fewer than 2 distinct questions or fewer than 2 attempts exist.
 * Repeated attempts on the same single question NEVER fabricate an improving trend.
 */
export function calculatePerformanceTrend(ev: SkillEvidence): PerformanceTrend {
  if (ev.chronologicalAttempts.length < 2 || ev.attemptCount < 2) {
    return 'insufficient_data'
  }

  // Verify question diversity: at least 2 distinct questions are strictly required
  const distinctQuestions = new Set(ev.chronologicalAttempts.map((a) => a.questionId))
  const uniqueCount = Math.max(ev.uniqueQuestionIds?.length || 0, distinctQuestions.size)
  if (uniqueCount < 2) {
    return 'insufficient_data'
  }

  const attempts = [...ev.chronologicalAttempts].sort(
    (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
  )

  const midpoint = Math.floor(attempts.length / 2)
  const firstHalf = attempts.slice(0, midpoint)
  const secondHalf = attempts.slice(midpoint)

  if (firstHalf.length === 0 || secondHalf.length === 0) {
    return 'insufficient_data'
  }

  const firstEarned = firstHalf.reduce((sum, a) => sum + a.earnedPoints, 0)
  const firstMax = firstHalf.reduce((sum, a) => sum + a.maxPoints, 0)
  const firstRatio = firstMax > 0 ? firstEarned / firstMax : 0

  const secondEarned = secondHalf.reduce((sum, a) => sum + a.earnedPoints, 0)
  const secondMax = secondHalf.reduce((sum, a) => sum + a.maxPoints, 0)
  const secondRatio = secondMax > 0 ? secondEarned / secondMax : 0

  const delta = secondRatio - firstRatio

  if (delta > 0.1) return 'improving'
  if (delta < -0.1) return 'declining'
  return 'stable'
}

/**
 * Determines skill status based on score ratio and confidence.
 * When confidence is insufficient, status is ALWAYS 'insufficient_data'.
 */
export function determineSkillStatus(
  scoreRatio: number,
  confidence: ConfidenceLevel,
  config: Required<PerformanceEngineConfig> = DEFAULT_CONFIG
): PerformanceStatus {
  if (confidence === 'insufficient') {
    return 'insufficient_data'
  }

  if (scoreRatio < config.needsReviewThreshold) {
    return 'needs_review'
  }
  if (scoreRatio < config.reinforcingThreshold) {
    return 'reinforcing'
  }
  return 'proficient'
}

/**
 * Analyzes performance for all skills with available evidence.
 */
export function analyzeSkillPerformances(
  evidenceMap: Record<string, SkillEvidence>,
  skillNameMap: Record<string, string> = {},
  userConfig: PerformanceEngineConfig = {}
): SkillPerformance[] {
  const config = { ...DEFAULT_CONFIG, ...userConfig }
  const performances: SkillPerformance[] = []

  for (const skillId of Object.keys(evidenceMap)) {
    const ev = evidenceMap[skillId]
    const scoreRatio = ev.maxPoints > 0 ? ev.earnedPoints / ev.maxPoints : 0
    const confidenceLevel = evaluateConfidenceLevel(ev)
    const trend = calculatePerformanceTrend(ev)
    const status = determineSkillStatus(scoreRatio, confidenceLevel, config)

    performances.push({
      skillId,
      skillName: skillNameMap[skillId] || skillId,
      scoreRatio: Math.round(scoreRatio * 1000) / 1000,
      evidenceCount: ev.uniqueQuestionIds.length,
      confidenceLevel,
      trend,
      status,
      lastPracticedAt: ev.lastAttemptAt,
      relatedLessonIds: ev.relatedLessonIds,
    })
  }

  // Sort: Needs review first, then by lowest score ratio, then by skillId
  return performances.sort((a, b) => {
    const statusPriority: Record<PerformanceStatus, number> = {
      needs_review: 0,
      reinforcing: 1,
      insufficient_data: 2,
      no_data: 3,
      proficient: 4,
    }
    const diff = statusPriority[a.status] - statusPriority[b.status]
    if (diff !== 0) return diff
    return a.scoreRatio - b.scoreRatio || a.skillId.localeCompare(b.skillId)
  })
}

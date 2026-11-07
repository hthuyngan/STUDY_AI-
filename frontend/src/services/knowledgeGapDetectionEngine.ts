/**
 * Knowledge Gap Detection Engine
 * Identifies measured knowledge weaknesses strictly from authentic question errors.
 * Never speculates cognitive causes; formats objective, evidence-based descriptions.
 */

import type {
  GapSeverity,
  KnowledgeGapItem,
  SkillEvidence,
  SkillPerformance,
} from '@/types/personalization'

export interface GapDetectionOptions {
  criticalRatioThreshold?: number // default 0.40
  moderateRatioThreshold?: number // default 0.60
}

/**
 * Detects concrete knowledge gaps from verified performance and evidence.
 */
export function detectKnowledgeGaps(
  performances: SkillPerformance[],
  evidenceMap: Record<string, SkillEvidence>,
  options: GapDetectionOptions = {}
): KnowledgeGapItem[] {
  const criticalThreshold = options.criticalRatioThreshold ?? 0.4
  const moderateThreshold = options.moderateRatioThreshold ?? 0.6

  const gaps: KnowledgeGapItem[] = []

  for (const perf of performances) {
    const ev = evidenceMap[perf.skillId]
    if (!ev || ev.questionCount === 0) continue

    const incorrectCount = ev.questionCount - ev.fullyCorrectCount

    // Require at least 1 actual incorrect answer to declare a knowledge gap
    if (incorrectCount <= 0) continue

    // Detect if scoreRatio is below moderate threshold, or if status is needs_review
    const isWeak = perf.scoreRatio < moderateThreshold || perf.status === 'needs_review'
    if (!isWeak && perf.scoreRatio >= 0.75) continue

    let gapLevel: GapSeverity = 'minor'
    if (perf.scoreRatio < criticalThreshold && incorrectCount >= 2) {
      gapLevel = 'critical'
    } else if (perf.scoreRatio < moderateThreshold) {
      gapLevel = 'moderate'
    }

    const percentageDisplay = Math.round(perf.scoreRatio * 100)
    const evidenceSummary = `Trả lời chưa chính xác ở ${incorrectCount}/${ev.questionCount} lượt câu hỏi liên quan đến ${perf.skillName} (tỷ lệ điểm đạt ${percentageDisplay}%).`

    const recommendedActions = [
      `Ôn lại nội dung lý thuyết và các ví dụ mẫu thuộc bài học liên quan.`,
      `Luyện tập thêm câu hỏi có phản hồi từng bước để củng cố kỹ năng ${perf.skillName}.`,
    ]

    gaps.push({
      id: `gap-${perf.skillId}`,
      skillId: perf.skillId,
      skillName: perf.skillName,
      gapLevel,
      scoreRatio: perf.scoreRatio,
      evidenceSummary,
      confidenceLevel: perf.confidenceLevel,
      relatedLessonIds: perf.relatedLessonIds,
      recommendedActions,
      detectedAt: ev.lastAttemptAt,
    })
  }

  // Sort by severity (critical > moderate > minor), then lowest scoreRatio
  return gaps.sort((a, b) => {
    const severityRank: Record<GapSeverity, number> = {
      critical: 0,
      moderate: 1,
      minor: 2,
    }
    const diff = severityRank[a.gapLevel] - severityRank[b.gapLevel]
    if (diff !== 0) return diff
    return a.scoreRatio - b.scoreRatio || a.skillId.localeCompare(b.skillId)
  })
}

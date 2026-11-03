/**
 * Knowledge Gaps Service
 * Tracks learner knowledge weaknesses, updates gaps from assessment attempts, and syncs with Smart Review.
 */

import { mockSubjectDetails, mockSubjectsSummary } from '@/data/subjects.mock'
import { resolveKnowledgeMapping } from '@/data/knowledgeMapping'
import { getStorageKey } from '@/repositories/storageKeys'
import { smartReviewService } from '@/services/smartReview.service'
import type { AssessmentQuestion, LearningAttempt } from '@/types/assessment'
import type {
  KnowledgeGap,
  KnowledgeGapsSummary,
  KnowledgeGapStatus,
} from '@/types/knowledgeGaps'

export const KNOWLEDGE_GAPS_STORAGE_KEY = 'study_ai.knowledge_gaps.v1'
export const PROCESSED_ATTEMPTS_STORAGE_KEY = 'study_ai.processed_attempts.v1'
export const KNOWLEDGE_GAPS_CHANGED_EVENT = 'study_ai:knowledge_gaps_changed'

interface StoredGapsSchema {
  version: number
  gaps: KnowledgeGap[]
}

function loadStoredGaps(): KnowledgeGap[] {
  if (typeof window === 'undefined') return []
  try {
    const key = getStorageKey('knowledge_gaps')
    let raw = localStorage.getItem(key)
    if (!raw) {
      raw = localStorage.getItem(KNOWLEDGE_GAPS_STORAGE_KEY)
    }
    if (!raw) return []

    const parsed = JSON.parse(raw) as StoredGapsSchema | KnowledgeGap[]
    if (Array.isArray(parsed)) return parsed
    if (parsed && Array.isArray(parsed.gaps)) return parsed.gaps
    return []
  } catch (err) {
    console.error('Failed to load knowledge gaps from storage', err)
    return []
  }
}

function persistGaps(gaps: KnowledgeGap[]): void {
  if (typeof window === 'undefined') return
  try {
    const key = getStorageKey('knowledge_gaps')
    const data: StoredGapsSchema = {
      version: 1,
      gaps,
    }
    localStorage.setItem(key, JSON.stringify(data))
    window.dispatchEvent(
      new CustomEvent(KNOWLEDGE_GAPS_CHANGED_EVENT, { detail: { count: gaps.length } })
    )
  } catch (err) {
    console.error('Failed to persist knowledge gaps', err)
  }
}

function getProcessedAttempts(): Set<string> {
  if (typeof window === 'undefined') return new Set()
  try {
    const key = getStorageKey('processed_attempts')
    const raw = localStorage.getItem(key) || localStorage.getItem(PROCESSED_ATTEMPTS_STORAGE_KEY)
    if (!raw) return new Set()
    return new Set(JSON.parse(raw))
  } catch {
    return new Set()
  }
}

function markAttemptProcessed(attemptId: string): void {
  if (typeof window === 'undefined') return
  try {
    const key = getStorageKey('processed_attempts')
    const current = getProcessedAttempts()
    current.add(attemptId)
    localStorage.setItem(key, JSON.stringify(Array.from(current)))
  } catch {
    // ignore
  }
}

export const knowledgeGapsService = {
  getAllGaps(filter?: {
    subjectId?: string
    status?: string
    search?: string
  }): KnowledgeGap[] {
    const all = loadStoredGaps()
    let result = [...all]

    if (filter?.subjectId && filter.subjectId !== 'all') {
      result = result.filter((g) => g.subjectId === filter.subjectId)
    }

    if (filter?.status && filter.status !== 'all') {
      result = result.filter((g) => g.status === filter.status)
    }

    if (filter?.search) {
      const q = filter.search.trim().toLowerCase()
      result = result.filter(
        (g) =>
          g.title.toLowerCase().includes(q) ||
          g.lessonTitle.toLowerCase().includes(q) ||
          g.subjectName.toLowerCase().includes(q) ||
          (g.sectionTitle && g.sectionTitle.toLowerCase().includes(q))
      )
    }

    // Sort by: needs-review first, then highest wrongAttemptsCount, then newest
    return result.sort((a, b) => {
      if (a.status === 'needs-review' && b.status !== 'needs-review') return -1
      if (b.status === 'needs-review' && a.status !== 'needs-review') return 1
      if (b.wrongAttemptsCount !== a.wrongAttemptsCount) {
        return b.wrongAttemptsCount - a.wrongAttemptsCount
      }
      return new Date(b.lastDetectedAt).getTime() - new Date(a.lastDetectedAt).getTime()
    })
  },

  getGapById(id: string): KnowledgeGap | null {
    const all = loadStoredGaps()
    return all.find((g) => g.id === id) || null
  },

  getSummary(): KnowledgeGapsSummary {
    const all = loadStoredGaps()
    let needsReview = 0
    let reinforcing = 0
    let progressing = 0
    let mastered = 0
    let highPriority = 0

    all.forEach((g) => {
      if (g.status === 'needs-review') needsReview++
      else if (g.status === 'reinforcing') reinforcing++
      else if (g.status === 'progressing') progressing++
      else if (g.status === 'mastered') mastered++

      if (g.severity === 'high') highPriority++
    })

    return {
      totalGaps: all.length,
      needsReviewCount: needsReview,
      reinforcingCount: reinforcing,
      progressingCount: progressing,
      masteredCount: mastered,
      highPriorityCount: highPriority,
    }
  },

  recordGapsFromAssessmentAttempt(
    attempt: LearningAttempt,
    questions: AssessmentQuestion[],
    lessonTitle?: string
  ): KnowledgeGap[] {
    if (!attempt || !attempt.responses) return []

    // 1. Idempotency check: don't process the same attempt twice
    const processedSet = getProcessedAttempts()
    if (processedSet.has(attempt.id)) {
      return loadStoredGaps().filter((g) => g.sourceAttemptId === attempt.id)
    }

    const currentGaps = loadStoredGaps()
    const nowIso = new Date().toISOString()
    const subject =
      mockSubjectDetails[attempt.subjectId] ||
      mockSubjectsSummary.find((s) => s.id === attempt.subjectId)
    const subjectName = subject?.name || 'Môn học'

    const affectedGaps: KnowledgeGap[] = []

    // 2. Identify wrong questions
    questions.forEach((q) => {
      const resp = attempt.responses[q.id]
      if (!resp) return
      const isCorrect = resp.isCorrect ?? false

      // Only wrong questions generate knowledge gaps
      if (!isCorrect) {
        const mapping = resolveKnowledgeMapping(q.topic, q.prompt)
        const gapId = `gap_${attempt.lessonId}_${mapping.knowledgePointId}`

        const existingIdx = currentGaps.findIndex((g) => g.id === gapId)

        if (existingIdx >= 0) {
          // Update existing gap
          const existing = currentGaps[existingIdx]
          const newWrongCount = existing.wrongAttemptsCount + 1
          const updated: KnowledgeGap = {
            ...existing,
            title: mapping.title,
            sectionId: mapping.sectionId,
            sectionTitle: mapping.sectionTitle,
            questionPrompt: q.prompt,
            explanation: q.explanation,
            wrongAttemptsCount: newWrongCount,
            severity: newWrongCount >= 3 ? 'high' : 'medium',
            status: 'needs-review',
            sourceAttemptId: attempt.id,
            lastDetectedAt: nowIso,
            updatedAt: nowIso,
          }
          currentGaps[existingIdx] = updated
          affectedGaps.push(updated)
          smartReviewService.scheduleReviewForGap(updated)
        } else {
          // Create new knowledge gap
          const newGap: KnowledgeGap = {
            id: gapId,
            subjectId: attempt.subjectId,
            subjectName,
            lessonId: attempt.lessonId,
            lessonTitle: lessonTitle || `Bài ${attempt.lessonId}`,
            sectionId: mapping.sectionId,
            sectionTitle: mapping.sectionTitle,
            knowledgePointId: mapping.knowledgePointId,
            title: mapping.title,
            questionPrompt: q.prompt,
            explanation: q.explanation,
            severity: 'medium',
            source: 'assessment_attempt',
            sourceAttemptId: attempt.id,
            wrongAttemptsCount: 1,
            correctReviewCount: 0,
            status: 'needs-review',
            lastDetectedAt: nowIso,
            createdAt: nowIso,
            updatedAt: nowIso,
          }
          currentGaps.unshift(newGap)
          affectedGaps.push(newGap)
          smartReviewService.scheduleReviewForGap(newGap)
        }
      }
    })

    persistGaps(currentGaps)
    markAttemptProcessed(attempt.id)
    return affectedGaps
  },

  updateGapStatus(id: string, status: KnowledgeGapStatus): KnowledgeGap | null {
    const all = loadStoredGaps()
    const idx = all.findIndex((g) => g.id === id)
    if (idx === -1) return null

    const updated: KnowledgeGap = {
      ...all[idx],
      status,
      updatedAt: new Date().toISOString(),
    }
    all[idx] = updated
    persistGaps(all)
    return updated
  },

  saveGap(gap: KnowledgeGap): void {
    const all = loadStoredGaps()
    const idx = all.findIndex((g) => g.id === gap.id)
    if (idx >= 0) {
      all[idx] = gap
    } else {
      all.unshift(gap)
    }
    persistGaps(all)
    smartReviewService.scheduleReviewForGap(gap)
  },

  saveGaps(gaps: KnowledgeGap[]): void {
    persistGaps(gaps)
    gaps.forEach((g) => smartReviewService.scheduleReviewForGap(g))
  },

  deleteGap(id: string): boolean {
    const all = loadStoredGaps()
    const filtered = all.filter((g) => g.id !== id)
    if (filtered.length !== all.length) {
      persistGaps(filtered)
      return true
    }
    return false
  },
}


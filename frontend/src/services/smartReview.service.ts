/**
 * Smart Review Service
 * Implements rule-based Spaced Repetition scheduling, session persistence, and progress evaluation.
 */

import { getStorageKey } from '@/repositories/storageKeys'
import type { KnowledgeGap } from '@/types/knowledgeGaps'
import type {
  ReviewHistoryEntry,
  ReviewItemStatus,
  ReviewRating,
  ReviewSessionItem,
  SmartReviewItem,
  SmartReviewSession,
  SmartReviewSummary,
} from '@/types/smartReview'

export const SMART_REVIEW_STORAGE_KEY = 'study_ai.smart_review.v1'
export const ACTIVE_SESSION_STORAGE_KEY = 'study_ai.active_review_session.v1'
export const SMART_REVIEW_CHANGED_EVENT = 'study_ai:smart_review_changed'

const STANDARD_INTERVALS = [1, 3, 7, 14, 30]

interface StoredSmartReviewSchema {
  version: number
  items: SmartReviewItem[]
}

/**
 * Returns today's local date string normalized as YYYY-MM-DD.
 */
export function getNormalizedTodayDate(): string {
  const d = new Date()
  const year = d.getFullYear()
  const month = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

/**
 * Adds N days to a base date string (YYYY-MM-DD) and returns YYYY-MM-DD.
 */
export function addDaysToDate(baseDateStr: string, days: number): string {
  const [year, month, day] = baseDateStr.split('-').map(Number)
  const d = new Date(year, month - 1, day)
  d.setDate(d.getDate() + days)

  const resYear = d.getFullYear()
  const resMonth = String(d.getMonth() + 1).padStart(2, '0')
  const resDay = String(d.getDate()).padStart(2, '0')
  return `${resYear}-${resMonth}-${resDay}`
}

function loadStoredItems(): SmartReviewItem[] {
  if (typeof window === 'undefined') return []
  try {
    const key = getStorageKey('smart_review')
    let raw = localStorage.getItem(key)
    if (!raw) {
      raw = localStorage.getItem(SMART_REVIEW_STORAGE_KEY)
    }
    if (!raw) return []

    const parsed = JSON.parse(raw) as StoredSmartReviewSchema | SmartReviewItem[]
    if (Array.isArray(parsed)) return parsed
    if (parsed && Array.isArray(parsed.items)) return parsed.items
    return []
  } catch (err) {
    console.error('Failed to load smart review items', err)
    return []
  }
}

function persistItems(items: SmartReviewItem[]): void {
  if (typeof window === 'undefined') return
  try {
    const key = getStorageKey('smart_review')
    const data: StoredSmartReviewSchema = {
      version: 1,
      items,
    }
    localStorage.setItem(key, JSON.stringify(data))
    window.dispatchEvent(
      new CustomEvent(SMART_REVIEW_CHANGED_EVENT, { detail: { count: items.length } })
    )
  } catch (err) {
    console.error('Failed to persist smart review items', err)
  }
}

/**
 * Evaluates the status of an item relative to today's date.
 */
export function computeItemStatus(dueDate: string, today: string = getNormalizedTodayDate()): ReviewItemStatus {
  if (dueDate < today) return 'overdue'
  if (dueDate === today) return 'due'
  return 'upcoming'
}

export const smartReviewService = {
  getAllItems(): SmartReviewItem[] {
    const today = getNormalizedTodayDate()
    return loadStoredItems().map((item) => ({
      ...item,
      status: computeItemStatus(item.dueDate, today),
    }))
  },

  getDueItems(): SmartReviewItem[] {
    const all = this.getAllItems()
    return all.filter((item) => item.status === 'due' || item.status === 'overdue')
  },

  getSummary(): SmartReviewSummary {
    const all = this.getAllItems()
    let dueToday = 0
    let overdue = 0
    let upcoming = 0

    all.forEach((item) => {
      if (item.status === 'overdue') overdue++
      else if (item.status === 'due') dueToday++
      else upcoming++
    })

    return {
      dueTodayCount: dueToday,
      overdueCount: overdue,
      upcomingCount: upcoming,
      totalItems: all.length,
    }
  },

  scheduleReviewForGap(gap: KnowledgeGap): SmartReviewItem {
    const all = loadStoredItems()
    const today = getNormalizedTodayDate()
    const existingIndex = all.findIndex((i) => i.gapId === gap.id)

    if (existingIndex >= 0) {
      // Update existing schedule: keep interval if already set, but ensure due date is prompt
      const existing = all[existingIndex]
      const updated: SmartReviewItem = {
        ...existing,
        title: gap.title,
        prompt: gap.questionPrompt || existing.prompt,
        explanation: gap.explanation || existing.explanation,
        dueDate: today, // Schedule immediately for review
        status: 'due',
        updatedAt: new Date().toISOString(),
      }
      all[existingIndex] = updated
      persistItems(all)
      return updated
    }

    // Create new review item
    const newItem: SmartReviewItem = {
      id: `rev_${gap.id}`,
      gapId: gap.id,
      knowledgePointId: gap.knowledgePointId,
      subjectId: gap.subjectId,
      subjectName: gap.subjectName,
      lessonId: gap.lessonId,
      lessonTitle: gap.lessonTitle,
      sectionId: gap.sectionId,
      sectionTitle: gap.sectionTitle,
      title: gap.title,
      prompt: gap.questionPrompt,
      explanation: gap.explanation,
      dueDate: today,
      reviewCount: 0,
      intervalDays: 1,
      status: 'due',
      history: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }

    persistItems([newItem, ...all])
    return newItem
  },

  recordReviewRating(itemId: string, rating: ReviewRating): { item: SmartReviewItem; nextGapStatus: 'reinforcing' | 'progressing' | 'mastered' | 'needs-review' } | null {
    const all = loadStoredItems()
    const idx = all.findIndex((i) => i.id === itemId)
    if (idx === -1) return null

    const current = all[idx]
    const today = getNormalizedTodayDate()
    const nowIso = new Date().toISOString()
    const prevInterval = current.intervalDays

    let nextInterval = 1
    if (rating === 'unremembered') {
      nextInterval = 1
    } else if (rating === 'partially-remembered') {
      // Advance conservatively
      nextInterval = Math.max(2, Math.round(prevInterval * 1.5))
    } else if (rating === 'well-remembered') {
      // Find standard schedule step
      const stepIdx = STANDARD_INTERVALS.findIndex((val) => val > prevInterval)
      if (stepIdx !== -1) {
        nextInterval = STANDARD_INTERVALS[stepIdx]
      } else {
        nextInterval = Math.min(60, prevInterval * 2)
      }
    }

    const nextDueDate = addDaysToDate(today, nextInterval)
    const newHistoryEntry: ReviewHistoryEntry = {
      reviewedAt: nowIso,
      rating,
      previousIntervalDays: prevInterval,
      nextIntervalDays: nextInterval,
    }

    const updatedItem: SmartReviewItem = {
      ...current,
      lastReviewedAt: nowIso,
      reviewCount: current.reviewCount + 1,
      intervalDays: nextInterval,
      dueDate: nextDueDate,
      status: 'upcoming',
      history: [...current.history, newHistoryEntry],
      updatedAt: nowIso,
    }

    all[idx] = updatedItem
    persistItems(all)

    // Determine Knowledge Gap evolution
    let nextGapStatus: 'reinforcing' | 'progressing' | 'mastered' | 'needs-review' = 'needs-review'
    const wellRememberedCount = updatedItem.history.filter((h) => h.rating === 'well-remembered').length

    if (rating === 'unremembered') {
      nextGapStatus = 'needs-review'
    } else if (wellRememberedCount >= 3 && nextInterval >= 14) {
      nextGapStatus = 'mastered'
    } else if (wellRememberedCount >= 1 || updatedItem.reviewCount >= 2) {
      nextGapStatus = 'progressing'
    } else {
      nextGapStatus = 'reinforcing'
    }

    return { item: updatedItem, nextGapStatus }
  },

  // Session Management
  getActiveSession(): SmartReviewSession | null {
    if (typeof window === 'undefined') return null
    try {
      const key = getStorageKey('active_review_session')
      const raw = localStorage.getItem(key) || localStorage.getItem(ACTIVE_SESSION_STORAGE_KEY)
      if (!raw) return null
      return JSON.parse(raw)
    } catch {
      return null
    }
  },

  startSession(gapIdFilter?: string): SmartReviewSession {
    const due = this.getDueItems()
    let candidates = due.length > 0 ? due : this.getAllItems()

    if (gapIdFilter) {
      const match = candidates.find((c) => c.gapId === gapIdFilter)
      if (match) {
        candidates = [match, ...candidates.filter((c) => c.gapId !== gapIdFilter)]
      }
    }

    // Limit session to 10 items max for optimal micro-learning
    const sessionCandidates = candidates.slice(0, 10)

    const sessionItems: ReviewSessionItem[] = sessionCandidates.map((c) => ({
      reviewItemId: c.id,
      gapId: c.gapId,
      knowledgePointId: c.knowledgePointId,
      subjectId: c.subjectId,
      subjectName: c.subjectName,
      lessonId: c.lessonId,
      lessonTitle: c.lessonTitle,
      sectionId: c.sectionId,
      sectionTitle: c.sectionTitle,
      title: c.title,
      prompt: c.prompt || `Giải thích và nêu các điểm cần nhớ về: ${c.title}`,
      explanation: c.explanation || `Phương pháp ghi nhớ và củng cố: Hãy đọc lại mục ${c.sectionTitle || 'bài giảng'} trong bài ${c.lessonTitle}.`,
      isRevealed: false,
    }))

    const newSession: SmartReviewSession = {
      id: `session_${Date.now()}`,
      status: 'active',
      currentIndex: 0,
      items: sessionItems,
      startedAt: new Date().toISOString(),
    }

    if (typeof window !== 'undefined') {
      const key = getStorageKey('active_review_session')
      localStorage.setItem(key, JSON.stringify(newSession))
    }

    return newSession
  },

  saveSession(session: SmartReviewSession): void {
    if (typeof window === 'undefined') return
    const key = getStorageKey('active_review_session')
    localStorage.setItem(key, JSON.stringify(session))
  },

  clearActiveSession(): void {
    if (typeof window === 'undefined') return
    const key = getStorageKey('active_review_session')
    localStorage.removeItem(key)
    localStorage.removeItem(ACTIVE_SESSION_STORAGE_KEY)
  },
}


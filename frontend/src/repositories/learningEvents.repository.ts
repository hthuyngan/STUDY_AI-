/**
 * Learning Events Repository Layer (Local, Remote, Hybrid with Batch Buffering)
 */

import { isRemoteApiConfigured } from '@/config/learner'
import { enqueueSyncItem } from '@/repositories/syncQueue'
import type { LearningEvent } from '@/types/assessment'

export const LEARNING_EVENTS_STORAGE_KEY = 'study_ai.learning_events.v1'
export const MAX_STORED_EVENTS = 500
const EVENT_BATCH_FLUSH_SIZE = 10
const EVENT_FLUSH_DEBOUNCE_MS = 2500

export interface ILearningEventsRepository {
  getAll(lessonId?: string): LearningEvent[]
  append(event: LearningEvent): void
  appendBatch(events: LearningEvent[]): void
  flushPendingEvents(): Promise<void>
}

export class LocalLearningEventsRepository implements ILearningEventsRepository {
  getAll(lessonId?: string): LearningEvent[] {
    if (typeof window === 'undefined') return []
    try {
      const raw = localStorage.getItem(LEARNING_EVENTS_STORAGE_KEY)
      const list: LearningEvent[] = raw ? JSON.parse(raw) : []
      if (lessonId) {
        return list.filter((e) => e.lessonId === lessonId)
      }
      return list
    } catch {
      return []
    }
  }

  append(event: LearningEvent): void {
    this.appendBatch([event])
  }

  appendBatch(events: LearningEvent[]): void {
    if (typeof window === 'undefined' || events.length === 0) return
    try {
      const list = this.getAll()
      list.push(...events)
      const trimmed = list.slice(-MAX_STORED_EVENTS)
      localStorage.setItem(
        LEARNING_EVENTS_STORAGE_KEY,
        JSON.stringify(trimmed)
      )
    } catch (err) {
      console.error('Failed to append learning events to localStorage', err)
    }
  }

  async flushPendingEvents(): Promise<void> {
    // Local storage is synchronous, no pending buffer
  }
}

export class HybridLearningEventsRepository implements ILearningEventsRepository {
  private local = new LocalLearningEventsRepository()
  private pendingBuffer: LearningEvent[] = []
  private debounceTimer: ReturnType<typeof setTimeout> | null = null

  getAll(lessonId?: string): LearningEvent[] {
    return this.local.getAll(lessonId)
  }

  append(event: LearningEvent): void {
    // 1. Local append immediately
    this.local.append(event)

    // 2. Buffer for remote batch upload
    if (isRemoteApiConfigured()) {
      this.pendingBuffer.push(event)

      // Immediate flush for important milestone events
      if (
        event.type === 'assessment_completed' ||
        event.type === 'assessment_submitted' ||
        this.pendingBuffer.length >= EVENT_BATCH_FLUSH_SIZE
      ) {
        this.flushPendingEvents().catch(() => {})
      } else {
        this.scheduleDebouncedFlush()
      }
    }
  }

  appendBatch(events: LearningEvent[]): void {
    this.local.appendBatch(events)
    if (isRemoteApiConfigured() && events.length > 0) {
      this.pendingBuffer.push(...events)
      this.flushPendingEvents().catch(() => {})
    }
  }

  private scheduleDebouncedFlush(): void {
    if (this.debounceTimer) clearTimeout(this.debounceTimer)
    this.debounceTimer = setTimeout(() => {
      this.flushPendingEvents().catch(() => {})
    }, EVENT_FLUSH_DEBOUNCE_MS)
  }

  async flushPendingEvents(): Promise<void> {
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer)
      this.debounceTimer = null
    }

    if (!isRemoteApiConfigured() || this.pendingBuffer.length === 0) {
      return
    }

    const batchToSend = [...this.pendingBuffer]
    this.pendingBuffer = []

    const batchId = `ev_batch_${Date.now()}`
    enqueueSyncItem('event-batch', batchId, {
      events: batchToSend as unknown as Record<string, unknown>[],
    })
  }
}

export const learningEventsRepository = new HybridLearningEventsRepository()

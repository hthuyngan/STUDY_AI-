/**
 * Learning Events Repository Layer (Local, Remote, Hybrid with Batch Buffering)
 * Fully identity-aware with canonical /me remote endpoints.
 */

import { getAuthUser } from '@/auth/authSession'
import { isRemoteApiConfigured } from '@/config/learner'
import { getStorageKey, migrateLegacyStorageToGuest } from '@/repositories/storageKeys'
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
    migrateLegacyStorageToGuest()
    try {
      const storageKey = getStorageKey('learning_events')
      let raw = localStorage.getItem(storageKey)
      if (!raw) {
        const legacy = localStorage.getItem(LEARNING_EVENTS_STORAGE_KEY)
        if (legacy) {
          raw = legacy
          localStorage.setItem(storageKey, legacy)
        }
      }
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
      const storageKey = getStorageKey('learning_events')
      const list = this.getAll()
      list.push(...events)
      const trimmed = list.slice(-MAX_STORED_EVENTS)
      localStorage.setItem(storageKey, JSON.stringify(trimmed))
    } catch (err) {
      console.error('Failed to append learning events to localStorage', err)
    }
  }

  async flushPendingEvents(): Promise<void> {
    // Local storage is synchronous
  }
}

export class HybridLearningEventsRepository implements ILearningEventsRepository {
  private local: LocalLearningEventsRepository
  private pendingBatch: LearningEvent[] = []
  private debounceTimer: ReturnType<typeof setTimeout> | null = null

  constructor(local?: LocalLearningEventsRepository) {
    this.local = local || new LocalLearningEventsRepository()
  }

  getAll(lessonId?: string): LearningEvent[] {
    return this.local.getAll(lessonId)
  }

  append(event: LearningEvent): void {
    this.appendBatch([event])
  }

  appendBatch(events: LearningEvent[]): void {
    if (events.length === 0) return

    // 1. Immediately write to local storage
    this.local.appendBatch(events)

    // 2. If remote API configured AND user is authenticated, buffer for dispatch
    if (isRemoteApiConfigured() && getAuthUser() !== null) {
      this.pendingBatch.push(...events)

      if (this.pendingBatch.length >= EVENT_BATCH_FLUSH_SIZE) {
        void this.flushPendingEvents()
      } else {
        if (this.debounceTimer) clearTimeout(this.debounceTimer)
        this.debounceTimer = setTimeout(() => {
          void this.flushPendingEvents()
        }, EVENT_FLUSH_DEBOUNCE_MS)
      }
    }
  }

  async flushPendingEvents(): Promise<void> {
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer)
      this.debounceTimer = null
    }

    if (this.pendingBatch.length === 0) return

    // Only queue if authenticated
    if (!isRemoteApiConfigured() || !getAuthUser()) {
      this.pendingBatch = []
      return
    }

    const eventsToFlush = [...this.pendingBatch]
    this.pendingBatch = []

    enqueueSyncItem(
      'event-batch',
      `events_${Date.now()}`,
      { events: eventsToFlush } as Record<string, unknown>
    )
  }
}

export const learningEventsRepository = new HybridLearningEventsRepository()

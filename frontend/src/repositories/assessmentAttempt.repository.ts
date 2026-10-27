/**
 * Assessment Attempt Repository Layer (Local, Remote, Hybrid)
 * Fully identity-aware with canonical /me remote endpoints.
 */

import { getAuthUser } from '@/auth/authSession'
import { isRemoteApiConfigured } from '@/config/learner'
import { requestJson } from '@/lib/apiClient'
import { getStorageKey, migrateLegacyStorageToGuest } from '@/repositories/storageKeys'
import { enqueueSyncItem } from '@/repositories/syncQueue'
import { notifyLearningStateChanged } from '@/services/learningStateEvents'
import type { LearningAttempt } from '@/types/assessment'

export const ASSESSMENT_ATTEMPTS_STORAGE_KEY =
  'study_ai.assessment_attempts.v1'
export const LEGACY_ATTEMPTS_STORAGE_KEY = 'study_ai.learning_attempts.v1'

export interface IAssessmentAttemptRepository {
  getAll(lessonId?: string): LearningAttempt[]
  getById(attemptId: string): LearningAttempt | null
  save(attempt: LearningAttempt): void
  fetchRemoteAll?(lessonId?: string): Promise<LearningAttempt[] | null>
}

export class LocalAssessmentAttemptRepository implements IAssessmentAttemptRepository {
  getAll(lessonId?: string): LearningAttempt[] {
    if (typeof window === 'undefined') return []
    migrateLegacyStorageToGuest()
    try {
      const storageKey = getStorageKey('assessment_attempts')
      let raw = localStorage.getItem(storageKey)
      if (!raw) {
        const legacy =
          localStorage.getItem(ASSESSMENT_ATTEMPTS_STORAGE_KEY) ||
          localStorage.getItem(LEGACY_ATTEMPTS_STORAGE_KEY)
        if (legacy) {
          raw = legacy
          localStorage.setItem(storageKey, legacy)
        }
      }
      const list: LearningAttempt[] = raw ? JSON.parse(raw) : []
      if (lessonId) {
        return list.filter((a) => a.lessonId === lessonId)
      }
      return list
    } catch {
      return []
    }
  }

  getById(attemptId: string): LearningAttempt | null {
    const list = this.getAll()
    return list.find((a) => a.id === attemptId) || null
  }

  save(attempt: LearningAttempt): void {
    if (typeof window === 'undefined') return
    try {
      const storageKey = getStorageKey('assessment_attempts')
      const list = this.getAll()
      const index = list.findIndex((a) => a.id === attempt.id)
      if (index >= 0) {
        list[index] = attempt
      } else {
        list.push(attempt)
      }
      localStorage.setItem(storageKey, JSON.stringify(list))
    } catch (err) {
      console.error('Failed to save assessment attempt to localStorage', err)
    }
  }
}

export class RemoteAssessmentAttemptRepository {
  async fetchAll(lessonId?: string): Promise<LearningAttempt[]> {
    const query = lessonId ? `?lessonId=${encodeURIComponent(lessonId)}` : ''
    return requestJson<LearningAttempt[]>(
      `/api/v1/me/assessment-attempts${query}`
    )
  }

  async fetchById(attemptId: string): Promise<LearningAttempt> {
    return requestJson<LearningAttempt>(
      `/api/v1/me/assessment-attempts/${attemptId}`
    )
  }

  async save(attempt: LearningAttempt): Promise<LearningAttempt> {
    return requestJson<LearningAttempt>(
      `/api/v1/me/assessment-attempts/${attempt.id}`,
      {
        method: 'PUT',
        body: JSON.stringify(attempt),
      }
    )
  }
}

export class HybridAssessmentAttemptRepository implements IAssessmentAttemptRepository {
  private local: LocalAssessmentAttemptRepository
  private remote: RemoteAssessmentAttemptRepository
  private queue: { enqueue: typeof enqueueSyncItem }

  constructor(
    local?: LocalAssessmentAttemptRepository,
    remote?: RemoteAssessmentAttemptRepository,
    queue?: { enqueue: typeof enqueueSyncItem }
  ) {
    this.local = local || new LocalAssessmentAttemptRepository()
    this.remote = remote || new RemoteAssessmentAttemptRepository()
    this.queue = queue || { enqueue: enqueueSyncItem }
  }

  getAll(lessonId?: string): LearningAttempt[] {
    return this.local.getAll(lessonId)
  }

  getById(attemptId: string): LearningAttempt | null {
    return this.local.getById(attemptId)
  }

  save(attempt: LearningAttempt): void {
    // 1. Write local immediately
    this.local.save(attempt)

    // 2. Notify reactive UI
    notifyLearningStateChanged()

    // 3. Queue sync only if API configured AND user is authenticated
    if (isRemoteApiConfigured() && getAuthUser() !== null) {
      this.queue.enqueue(
        'attempt-upsert',
        attempt.id,
        attempt as unknown as Record<string, unknown>
      )
    }
  }

  async fetchRemoteAll(lessonId?: string): Promise<LearningAttempt[] | null> {
    if (!isRemoteApiConfigured() || !getAuthUser()) return null
    try {
      const remoteList = await this.remote.fetchAll(lessonId)
      const localList = this.local.getAll()

      const map = new Map<string, LearningAttempt>()
      // Seed with local attempts
      for (const att of localList) {
        map.set(att.id, att)
      }

      // Merge server attempts
      let hasChanges = false
      for (const serverAtt of remoteList) {
        const existing = map.get(serverAtt.id)
        if (!existing) {
          map.set(serverAtt.id, serverAtt)
          hasChanges = true
        } else {
          const sTime = new Date(
            serverAtt.completedAt || serverAtt.lastActivityAt || 0
          ).getTime()
          const lTime = new Date(
            existing.completedAt || existing.lastActivityAt || 0
          ).getTime()
          if (sTime > lTime && existing.status !== 'completed') {
            map.set(serverAtt.id, serverAtt)
            hasChanges = true
          }
        }
      }

      if (hasChanges) {
        const mergedList = Array.from(map.values())
        const storageKey = getStorageKey('assessment_attempts')
        localStorage.setItem(storageKey, JSON.stringify(mergedList))
        notifyLearningStateChanged()
        return lessonId ? mergedList.filter((a) => a.lessonId === lessonId) : mergedList
      }

      return this.local.getAll(lessonId)
    } catch {
      return null
    }
  }
}

export const assessmentAttemptRepository = new HybridAssessmentAttemptRepository()

/**
 * Assessment Attempt Repository Layer (Local, Remote, Hybrid)
 */

import { getCurrentLearnerId, isRemoteApiConfigured } from '@/config/learner'
import { requestJson } from '@/lib/apiClient'
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
    try {
      const raw =
        localStorage.getItem(ASSESSMENT_ATTEMPTS_STORAGE_KEY) ||
        localStorage.getItem(LEGACY_ATTEMPTS_STORAGE_KEY)
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
      const list = this.getAll()
      const index = list.findIndex((a) => a.id === attempt.id)
      if (index >= 0) {
        list[index] = attempt
      } else {
        list.push(attempt)
      }
      localStorage.setItem(
        ASSESSMENT_ATTEMPTS_STORAGE_KEY,
        JSON.stringify(list)
      )
    } catch (err) {
      console.error('Failed to save assessment attempt to localStorage', err)
    }
  }
}

export class RemoteAssessmentAttemptRepository {
  async fetchAll(
    userId: string,
    lessonId?: string
  ): Promise<LearningAttempt[]> {
    const query = lessonId ? `?lessonId=${encodeURIComponent(lessonId)}` : ''
    return requestJson<LearningAttempt[]>(
      `/users/${userId}/assessment-attempts${query}`
    )
  }

  async fetchById(userId: string, attemptId: string): Promise<LearningAttempt> {
    return requestJson<LearningAttempt>(
      `/users/${userId}/assessment-attempts/${attemptId}`
    )
  }

  async save(
    userId: string,
    attempt: LearningAttempt
  ): Promise<LearningAttempt> {
    return requestJson<LearningAttempt>(
      `/users/${userId}/assessment-attempts/${attempt.id}`,
      {
        method: 'PUT',
        body: JSON.stringify(attempt),
      }
    )
  }
}

export class HybridAssessmentAttemptRepository implements IAssessmentAttemptRepository {
  private local = new LocalAssessmentAttemptRepository()
  private remote = new RemoteAssessmentAttemptRepository()

  getAll(lessonId?: string): LearningAttempt[] {
    return this.local.getAll(lessonId)
  }

  getById(attemptId: string): LearningAttempt | null {
    return this.local.getById(attemptId)
  }

  save(attempt: LearningAttempt): void {
    // 1. Write local immediately
    this.local.save(attempt)

    // 2. Notify system
    notifyLearningStateChanged()

    // 3. Remote async dispatch
    if (isRemoteApiConfigured()) {
      enqueueSyncItem(
        'attempt-upsert',
        attempt.id,
        attempt as unknown as Record<string, unknown>
      )
    }
  }

  async fetchRemoteAll(lessonId?: string): Promise<LearningAttempt[] | null> {
    if (!isRemoteApiConfigured()) return null
    try {
      const userId = getCurrentLearnerId()
      const remoteList = await this.remote.fetchAll(userId, lessonId)
      const localList = this.local.getAll()
      const localMap = new Map(localList.map((a) => [a.id, a]))

      let hasChanges = false
      for (const rAttempt of remoteList) {
        const local = localMap.get(rAttempt.id)
        if (!local) {
          localList.push(rAttempt)
          hasChanges = true
        } else {
          const remoteTime = new Date(rAttempt.lastActivityAt).getTime()
          const localTime = new Date(local.lastActivityAt).getTime()
          if (remoteTime > localTime && local.completionStatus !== 'completed') {
            const idx = localList.findIndex((a) => a.id === rAttempt.id)
            if (idx >= 0) {
              localList[idx] = rAttempt
              hasChanges = true
            }
          }
        }
      }

      if (hasChanges) {
        localStorage.setItem(
          ASSESSMENT_ATTEMPTS_STORAGE_KEY,
          JSON.stringify(localList)
        )
        notifyLearningStateChanged()
      }

      return localList
    } catch {
      return null
    }
  }
}

export const assessmentAttemptRepository = new HybridAssessmentAttemptRepository()

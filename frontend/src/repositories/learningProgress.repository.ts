/**
 * Learning Progress Repository Layer (Local, Remote, Hybrid)
 */

import { getCurrentLearnerId, isRemoteApiConfigured } from '@/config/learner'
import { requestJson } from '@/lib/apiClient'
import { enqueueSyncItem, syncQueue } from '@/repositories/syncQueue'
import { notifyLearningStateChanged } from '@/services/learningStateEvents'
import type { LessonProgressState } from '@/types/assessment'

export const LESSON_PROGRESS_STORAGE_KEY = 'study_ai.lesson_progress.v1'

export interface ILearningProgressRepository {
  getAll(): Record<string, LessonProgressState>
  getByLessonId(lessonId: string): LessonProgressState | null
  save(progress: LessonProgressState): void
  fetchRemoteAll?(): Promise<Record<string, LessonProgressState> | null>
}

export class LocalLearningProgressRepository implements ILearningProgressRepository {
  getAll(): Record<string, LessonProgressState> {
    if (typeof window === 'undefined') return {}
    try {
      const raw = localStorage.getItem(LESSON_PROGRESS_STORAGE_KEY)
      return raw ? JSON.parse(raw) : {}
    } catch {
      return {}
    }
  }

  getByLessonId(lessonId: string): LessonProgressState | null {
    const map = this.getAll()
    return map[lessonId] || null
  }

  save(progress: LessonProgressState): void {
    if (typeof window === 'undefined') return
    try {
      const map = this.getAll()
      map[progress.lessonId] = progress
      localStorage.setItem(LESSON_PROGRESS_STORAGE_KEY, JSON.stringify(map))
    } catch (err) {
      console.error('Failed to save lesson progress to localStorage', err)
    }
  }
}

export class RemoteLearningProgressRepository {
  async fetchAll(userId: string): Promise<LessonProgressState[]> {
    return requestJson<LessonProgressState[]>(`/users/${userId}/lesson-progress`)
  }

  async fetchByLessonId(
    userId: string,
    lessonId: string
  ): Promise<LessonProgressState> {
    return requestJson<LessonProgressState>(
      `/users/${userId}/lesson-progress/${lessonId}`
    )
  }

  async save(
    userId: string,
    progress: LessonProgressState
  ): Promise<LessonProgressState> {
    return requestJson<LessonProgressState>(
      `/users/${userId}/lesson-progress/${progress.lessonId}`,
      {
        method: 'PUT',
        body: JSON.stringify(progress),
      }
    )
  }
}

export class HybridLearningProgressRepository implements ILearningProgressRepository {
  private local: LocalLearningProgressRepository
  private remote: RemoteLearningProgressRepository
  private queue: { enqueue: typeof enqueueSyncItem }

  constructor(
    local?: LocalLearningProgressRepository,
    remote?: RemoteLearningProgressRepository,
    queue?: { enqueue: typeof enqueueSyncItem }
  ) {
    this.local = local || new LocalLearningProgressRepository()
    this.remote = remote || new RemoteLearningProgressRepository()
    this.queue = queue || syncQueue
  }

  getAll(): Record<string, LessonProgressState> {
    return this.local.getAll()
  }

  getByLessonId(lessonId: string): LessonProgressState | null {
    return this.local.getByLessonId(lessonId)
  }

  save(progress: LessonProgressState): void {
    // 1. Write local immediately (Zero UI latency)
    this.local.save(progress)

    // 2. Notify system-wide listeners for reactive UI update
    notifyLearningStateChanged()

    // 3. If remote API is configured, enqueue async sync
    if (isRemoteApiConfigured()) {
      this.queue.enqueue(
        'progress-upsert',
        progress.lessonId,
        progress as unknown as Record<string, unknown>
      )
    }
  }

  async fetchRemoteAll(): Promise<Record<string, LessonProgressState> | null> {
    if (!isRemoteApiConfigured()) return null
    try {
      const userId = getCurrentLearnerId()
      const remoteList = await this.remote.fetchAll(userId)
      const localMap = this.local.getAll()

      let hasChanges = false
      for (const item of remoteList) {
        const localItem = localMap[item.lessonId]
        if (!localItem) {
          localMap[item.lessonId] = item
          hasChanges = true
        } else {
          const remoteTime = new Date(item.updatedAt).getTime()
          const localTime = new Date(localItem.updatedAt).getTime()
          // Server newer wins, preserving 100% completed progress
          if (remoteTime > localTime && localItem.overallProgress < 100) {
            localMap[item.lessonId] = item
            hasChanges = true
          }
        }
      }

      if (hasChanges) {
        localStorage.setItem(
          LESSON_PROGRESS_STORAGE_KEY,
          JSON.stringify(localMap)
        )
        notifyLearningStateChanged()
      }

      return localMap
    } catch {
      return null
    }
  }
}

export const learningProgressRepository = new HybridLearningProgressRepository()

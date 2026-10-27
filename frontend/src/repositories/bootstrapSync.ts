/**
 * Identity-aware bootstrap synchronization utility from learner data to backend.
 * Supports both normal account initialization and explicit guest -> account data migration.
 */

import { getAuthUser } from '@/auth/authSession'
import { isRemoteApiConfigured } from '@/config/learner'
import { apiClient } from '@/lib/apiClient'
import { assessmentAttemptRepository } from '@/repositories/assessmentAttempt.repository'
import { learningEventsRepository } from '@/repositories/learningEvents.repository'
import { learningProgressRepository } from '@/repositories/learningProgress.repository'
import { getStorageKey } from '@/repositories/storageKeys'
import { notifyLearningStateChanged } from '@/services/learningStateEvents'
import type { LearningAttempt, LearningEvent, LessonProgressState } from '@/types/assessment'
import type { BootstrapSyncResponse } from '@/types/sync'

export const BACKEND_BOOTSTRAP_MARKER_KEY = 'study_ai.backend_bootstrap.v1'

export function isBootstrapCompleted(identity?: string): boolean {
  if (typeof window === 'undefined') return false
  if (localStorage.getItem(BACKEND_BOOTSTRAP_MARKER_KEY) === 'true') {
    return true
  }
  const key = getStorageKey('backend_bootstrap', identity)
  return localStorage.getItem(key) === 'true'
}

export function markBootstrapCompleted(identity?: string): void {
  if (typeof window === 'undefined') return
  localStorage.setItem(BACKEND_BOOTSTRAP_MARKER_KEY, 'true')
  const key = getStorageKey('backend_bootstrap', identity)
  localStorage.setItem(key, 'true')
}

export async function performAuthenticatedBootstrapSync(guestDataBundle?: {
  lessonProgress: Record<string, LessonProgressState>
  assessmentAttempts: LearningAttempt[]
  learningEvents: LearningEvent[]
}): Promise<BootstrapSyncResponse | null> {
  const authUser = getAuthUser()
  if (!isRemoteApiConfigured() || !authUser) {
    return null
  }

  // Use guest data bundle if provided, otherwise account local data
  const progressMap = guestDataBundle
    ? guestDataBundle.lessonProgress
    : learningProgressRepository.getAll()
  const attemptsList = guestDataBundle
    ? guestDataBundle.assessmentAttempts
    : assessmentAttemptRepository.getAll()
  const eventsList = guestDataBundle
    ? guestDataBundle.learningEvents
    : learningEventsRepository.getAll()

  const hasAnyData =
    Object.keys(progressMap).length > 0 ||
    attemptsList.length > 0 ||
    eventsList.length > 0

  if (!hasAnyData) {
    markBootstrapCompleted(authUser.id)
    return {
      status: 'ok',
      progressSynced: 0,
      attemptsSynced: 0,
      eventsSynced: 0,
      message: 'No local data to bootstrap',
    }
  }

  try {
    const payload = {
      lessonProgress: progressMap,
      assessmentAttempts: attemptsList,
      learningEvents: eventsList,
    }

    const response = await apiClient.post<BootstrapSyncResponse>(
      '/api/v1/me/sync/bootstrap',
      payload
    )

    if (response && response.status === 'ok') {
      markBootstrapCompleted(authUser.id)

      // If guest data was migrated, merge progress into the authenticated user's local cache
      if (guestDataBundle) {
        for (const progress of Object.values(guestDataBundle.lessonProgress)) {
          learningProgressRepository.save(progress)
        }
        for (const attempt of guestDataBundle.assessmentAttempts) {
          assessmentAttemptRepository.save(attempt)
        }
        if (guestDataBundle.learningEvents.length > 0) {
          learningEventsRepository.appendBatch(guestDataBundle.learningEvents)
        }
        notifyLearningStateChanged()
      }

      return response
    }
    return null
  } catch (err) {
    console.warn('Authenticated bootstrap sync deferred', err)
    return null
  }
}

export async function performBootstrapSyncIfAvailable(): Promise<BootstrapSyncResponse | null> {
  if (!isRemoteApiConfigured()) {
    return null
  }

  const authUser = getAuthUser()
  const identity = authUser?.id

  if (isBootstrapCompleted(identity)) {
    return null
  }

  const progressMap = learningProgressRepository.getAll()
  const attemptsList = assessmentAttemptRepository.getAll()
  const eventsList = learningEventsRepository.getAll()

  const hasAnyData =
    Object.keys(progressMap).length > 0 ||
    attemptsList.length > 0 ||
    eventsList.length > 0

  if (!hasAnyData) {
    markBootstrapCompleted(identity)
    return {
      status: 'ok',
      progressSynced: 0,
      attemptsSynced: 0,
      eventsSynced: 0,
      message: 'No local data to bootstrap',
    }
  }

  try {
    const payload = {
      lessonProgress: progressMap,
      assessmentAttempts: attemptsList,
      learningEvents: eventsList,
    }

    const endpoint = authUser
      ? '/api/v1/me/sync/bootstrap'
      : '/users/stu-001/sync/bootstrap'

    const response = await apiClient.post<BootstrapSyncResponse>(
      endpoint,
      payload
    )

    if (response && response.status === 'ok') {
      markBootstrapCompleted(identity)
      return response
    }
    return null
  } catch (err) {
    console.warn('Bootstrap sync deferred', err)
    return null
  }
}

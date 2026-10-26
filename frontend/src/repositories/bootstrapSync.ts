/**
 * One-time bootstrap synchronization utility from existing localStorage learner data to backend.
 */

import { getCurrentLearnerId, isRemoteApiConfigured } from '@/config/learner'
import { apiClient } from '@/lib/apiClient'
import { assessmentAttemptRepository } from '@/repositories/assessmentAttempt.repository'
import { learningEventsRepository } from '@/repositories/learningEvents.repository'
import { learningProgressRepository } from '@/repositories/learningProgress.repository'
import type { BootstrapSyncResponse } from '@/types/sync'

export const BACKEND_BOOTSTRAP_MARKER_KEY = 'study_ai.backend_bootstrap.v1'

export function isBootstrapCompleted(): boolean {
  if (typeof window === 'undefined') return false
  return localStorage.getItem(BACKEND_BOOTSTRAP_MARKER_KEY) === 'true'
}

export async function performBootstrapSyncIfAvailable(): Promise<BootstrapSyncResponse | null> {
  if (!isRemoteApiConfigured()) {
    return null
  }

  if (isBootstrapCompleted()) {
    return null
  }

  const userId = getCurrentLearnerId()
  const progressMap = learningProgressRepository.getAll()
  const attemptsList = assessmentAttemptRepository.getAll()
  const eventsList = learningEventsRepository.getAll()

  const hasAnyData =
    Object.keys(progressMap).length > 0 ||
    attemptsList.length > 0 ||
    eventsList.length > 0

  if (!hasAnyData) {
    // New user with no prior local data - mark complete
    localStorage.setItem(BACKEND_BOOTSTRAP_MARKER_KEY, 'true')
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
      `/users/${userId}/sync/bootstrap`,
      payload
    )

    if (response && response.status === 'ok') {
      localStorage.setItem(BACKEND_BOOTSTRAP_MARKER_KEY, 'true')
      return response
    }
    return null
  } catch (err) {
    console.warn('Bootstrap sync deferred (backend offline or unavailable)', err)
    return null
  }
}

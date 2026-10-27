import { getAuthUser } from '@/auth/authSession'
import type { LearningAttempt, LearningEvent, LessonProgressState } from '@/types/assessment'

export const GUEST_IDENTITY_STORAGE_KEY = 'study_ai.guest_identity'

export const LEGACY_PROGRESS_KEY = 'study_ai.lesson_progress.v1'
export const LEGACY_ATTEMPTS_KEY = 'study_ai.assessment_attempts.v1'
export const LEGACY_OLD_ATTEMPTS_KEY = 'study_ai.learning_attempts.v1'
export const LEGACY_EVENTS_KEY = 'study_ai.learning_events.v1'
export const LEGACY_QUEUE_KEY = 'study_ai.sync_queue.v1'
export const LEGACY_BOOTSTRAP_KEY = 'study_ai.backend_bootstrap.v1'

/**
 * Returns a stable guest identity for this browser device.
 */
export function getGuestIdentity(): string {
  if (typeof window === 'undefined') return 'guest_default'
  let id = localStorage.getItem(GUEST_IDENTITY_STORAGE_KEY)
  if (!id) {
    id = `guest_${Math.random().toString(36).substring(2, 9)}_${Date.now().toString(36)}`
    try {
      localStorage.setItem(GUEST_IDENTITY_STORAGE_KEY, id)
    } catch {
      // Ignore localStorage write errors in private mode
    }
  }
  return id
}

/**
 * Resolves current learner identity (real authenticated user ID or stable guest ID).
 */
export function getCurrentIdentity(): string {
  const authUser = getAuthUser()
  if (authUser?.id) {
    return authUser.id
  }
  return getGuestIdentity()
}

/**
 * Generates an identity-scoped storage key.
 */
export function getStorageKey(baseKey: string, identity?: string): string {
  const targetId = identity || getCurrentIdentity()
  return `study_ai.${targetId}.${baseKey}.v2`
}

/**
 * Idempotently migrates existing v1 legacy global learner data into the guest namespace.
 */
export function migrateLegacyStorageToGuest(): void {
  if (typeof window === 'undefined') return
  const guestId = getGuestIdentity()

  // 1. Lesson Progress
  const guestProgressKey = getStorageKey('lesson_progress', guestId)
  if (!localStorage.getItem(guestProgressKey)) {
    const rawLegacy = localStorage.getItem(LEGACY_PROGRESS_KEY)
    if (rawLegacy) {
      try {
        localStorage.setItem(guestProgressKey, rawLegacy)
      } catch (err) {
        console.error('Failed to migrate legacy lesson progress to guest', err)
      }
    }
  }

  // 2. Assessment Attempts
  const guestAttemptsKey = getStorageKey('assessment_attempts', guestId)
  if (!localStorage.getItem(guestAttemptsKey)) {
    const rawLegacy =
      localStorage.getItem(LEGACY_ATTEMPTS_KEY) ||
      localStorage.getItem(LEGACY_OLD_ATTEMPTS_KEY)
    if (rawLegacy) {
      try {
        localStorage.setItem(guestAttemptsKey, rawLegacy)
      } catch (err) {
        console.error('Failed to migrate legacy assessment attempts to guest', err)
      }
    }
  }

  // 3. Learning Events
  const guestEventsKey = getStorageKey('learning_events', guestId)
  if (!localStorage.getItem(guestEventsKey)) {
    const rawLegacy = localStorage.getItem(LEGACY_EVENTS_KEY)
    if (rawLegacy) {
      try {
        localStorage.setItem(guestEventsKey, rawLegacy)
      } catch (err) {
        console.error('Failed to migrate legacy learning events to guest', err)
      }
    }
  }
}

/**
 * Checks if guest namespace contains any active learning progress, attempts, or events.
 */
export function hasGuestLearningData(): boolean {
  if (typeof window === 'undefined') return false
  migrateLegacyStorageToGuest()
  const guestId = getGuestIdentity()

  try {
    const rawProgress = localStorage.getItem(getStorageKey('lesson_progress', guestId))
    if (rawProgress) {
      const map = JSON.parse(rawProgress) as Record<string, LessonProgressState>
      if (Object.keys(map).length > 0) return true
    }

    const rawAttempts = localStorage.getItem(getStorageKey('assessment_attempts', guestId))
    if (rawAttempts) {
      const list = JSON.parse(rawAttempts) as LearningAttempt[]
      if (list.length > 0) return true
    }

    const rawEvents = localStorage.getItem(getStorageKey('learning_events', guestId))
    if (rawEvents) {
      const list = JSON.parse(rawEvents) as LearningEvent[]
      if (list.length > 0) return true
    }
  } catch {
    return false
  }

  return false
}

/**
 * Bundles all guest learning data for account migration.
 */
export function getGuestLearningDataBundle(): {
  lessonProgress: Record<string, LessonProgressState>
  assessmentAttempts: LearningAttempt[]
  learningEvents: LearningEvent[]
} {
  migrateLegacyStorageToGuest()
  const guestId = getGuestIdentity()

  let lessonProgress: Record<string, LessonProgressState> = {}
  let assessmentAttempts: LearningAttempt[] = []
  let learningEvents: LearningEvent[] = []

  if (typeof window !== 'undefined') {
    try {
      const rawProgress = localStorage.getItem(getStorageKey('lesson_progress', guestId))
      if (rawProgress) lessonProgress = JSON.parse(rawProgress)

      const rawAttempts = localStorage.getItem(getStorageKey('assessment_attempts', guestId))
      if (rawAttempts) assessmentAttempts = JSON.parse(rawAttempts)

      const rawEvents = localStorage.getItem(getStorageKey('learning_events', guestId))
      if (rawEvents) learningEvents = JSON.parse(rawEvents)
    } catch (err) {
      console.error('Error bundling guest learning data', err)
    }
  }

  return { lessonProgress, assessmentAttempts, learningEvents }
}

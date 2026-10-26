/**
 * Lightweight event bus for StudyAI Learning State synchronization across components and hooks.
 */

export const LEARNING_STATE_CHANGED_EVENT = 'study_ai:learning_state_changed'

/**
 * Dispatch an event when learner state is updated to allow real-time reactivity in hooks.
 */
export function notifyLearningStateChanged(): void {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent(LEARNING_STATE_CHANGED_EVENT))
  }
}

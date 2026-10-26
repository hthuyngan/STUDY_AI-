import type { LearningEvent, LearningEventType } from '@/types/assessment'

export const LEARNING_EVENTS_STORAGE_KEY = 'study_ai.learning_events.v1'
const MAX_STORED_EVENTS = 500

export function generateEventId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID()
  }
  return `evt_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`
}

export function getStoredLearningEvents(lessonId?: string): LearningEvent[] {
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

export function recordLearningEvent(event: LearningEvent): void {
  if (typeof window === 'undefined') return
  try {
    const list = getStoredLearningEvents()
    list.push(event)
    // Keep most recent events to prevent quota overflow
    const trimmed = list.slice(-MAX_STORED_EVENTS)
    localStorage.setItem(LEARNING_EVENTS_STORAGE_KEY, JSON.stringify(trimmed))
  } catch (err) {
    console.error('Failed to save learning event to localStorage', err)
  }
}

export interface CreateLearningEventParams {
  type: LearningEventType
  lessonId: string
  subjectId: string
  attemptId?: string
  payload?: Record<string, unknown>
}

export function createLearningEvent(
  paramsOrAttemptId: CreateLearningEventParams | string,
  legacyType?: LearningEventType,
  legacyPayload?: Record<string, unknown>
): LearningEvent {
  let event: LearningEvent

  if (typeof paramsOrAttemptId === 'string') {
    // Legacy signature: (attemptId, type, payload)
    event = {
      id: generateEventId(),
      attemptId: paramsOrAttemptId,
      lessonId: 'lesson-unknown',
      subjectId: 'subject-unknown',
      timestamp: new Date().toISOString(),
      type: legacyType || 'lesson_opened',
      payload: legacyPayload,
      schemaVersion: 1,
    }
  } else {
    event = {
      id: generateEventId(),
      attemptId: paramsOrAttemptId.attemptId,
      lessonId: paramsOrAttemptId.lessonId,
      subjectId: paramsOrAttemptId.subjectId,
      timestamp: new Date().toISOString(),
      type: paramsOrAttemptId.type,
      payload: paramsOrAttemptId.payload,
      schemaVersion: 1,
    }
  }

  recordLearningEvent(event)
  return event
}

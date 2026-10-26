import {
  learningEventsRepository,
  LEARNING_EVENTS_STORAGE_KEY,
} from '@/repositories/learningEvents.repository'
import type { LearningEvent, LearningEventType } from '@/types/assessment'

export { LEARNING_EVENTS_STORAGE_KEY }

export function generateEventId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID()
  }
  return `evt_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`
}

export function getStoredLearningEvents(lessonId?: string): LearningEvent[] {
  return learningEventsRepository.getAll(lessonId)
}

export function recordLearningEvent(event: LearningEvent): void {
  learningEventsRepository.append(event)
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

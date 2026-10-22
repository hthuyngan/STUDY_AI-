import type { LearningEvent, LearningEventType } from '@/types/assessment'

export function generateEventId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID()
  }
  return `evt_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`
}

export function createLearningEvent(
  attemptId: string,
  type: LearningEventType,
  payload?: Record<string, unknown>
): LearningEvent {
  return {
    id: generateEventId(),
    attemptId,
    timestamp: new Date().toISOString(),
    type,
    payload,
    schemaVersion: 1,
  }
}

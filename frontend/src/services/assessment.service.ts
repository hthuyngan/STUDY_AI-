import {
  assessmentAttemptRepository,
  ASSESSMENT_ATTEMPTS_STORAGE_KEY,
  LEGACY_ATTEMPTS_STORAGE_KEY,
} from '@/repositories/assessmentAttempt.repository'
import { createLearningEvent } from './learningTracking.service'
import { markAssessmentCompleted } from './lessonProgress.service'
import type {
  AssessmentQuestion,
  AssessmentResponse,
  LearningAttempt,
  LessonAssessment,
} from '@/types/assessment'

export { ASSESSMENT_ATTEMPTS_STORAGE_KEY, LEGACY_ATTEMPTS_STORAGE_KEY }
export const LEARNING_ATTEMPTS_STORAGE_KEY = ASSESSMENT_ATTEMPTS_STORAGE_KEY

function generateId(prefix = 'atm'): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return `${prefix}_${crypto.randomUUID()}`
  }
  return `${prefix}_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`
}

function getStoredAttempts(): LearningAttempt[] {
  return assessmentAttemptRepository.getAll()
}

function saveStoredAttempts(attempts: LearningAttempt[]): void {
  attempts.forEach((a) => assessmentAttemptRepository.save(a))
}


export function getAllAttemptsForLesson(lessonId: string): LearningAttempt[] {
  const attempts = getStoredAttempts()
  return attempts.filter((a) => a.lessonId === lessonId)
}

export function getActiveUnfinishedAttempt(lessonId: string): LearningAttempt | null {
  const attempts = getAllAttemptsForLesson(lessonId)
  return attempts.find((a) => a.status === 'in-progress') || null
}

export function getLatestCompletedAttempt(lessonId: string): LearningAttempt | null {
  const attempts = getAllAttemptsForLesson(lessonId)
  const completed = attempts.filter((a) => a.status === 'completed')
  if (completed.length === 0) return null
  return completed.sort((a, b) => b.attemptNumber - a.attemptNumber)[0]
}

export function startNewAttempt(
  assessment: LessonAssessment,
  chapterId = 'chap-default',
  learnerId = 'learner-guest-01'
): LearningAttempt {
  const existingAttempts = getAllAttemptsForLesson(assessment.lessonId)

  // If there was an active attempt left in-progress, mark it abandoned
  const updatedAttempts = existingAttempts.map((att) => {
    if (att.status === 'in-progress') {
      const abandonedEvent = createLearningEvent({
        attemptId: att.id,
        lessonId: att.lessonId,
        subjectId: att.subjectId,
        type: 'attempt_abandoned',
        payload: { reason: 'started_new_attempt' },
      })
      return {
        ...att,
        status: 'abandoned' as const,
        exitReason: 'user_restarted',
        events: [...att.events, abandonedEvent],
        lastActivityAt: new Date().toISOString(),
      }
    }
    return att
  })

  const attemptNumber = existingAttempts.length + 1
  const attemptId = generateId('atm')
  const now = new Date().toISOString()

  const startEvent = createLearningEvent({
    attemptId,
    lessonId: assessment.lessonId,
    subjectId: assessment.subjectId,
    type: 'assessment_started',
    payload: {
      assessmentId: assessment.id,
      questionCount: assessment.questions.length,
      attemptNumber,
    },
  })

  const newAttempt: LearningAttempt = {
    id: attemptId,
    learnerId,
    subjectId: assessment.subjectId,
    chapterId,
    lessonId: assessment.lessonId,
    assessmentId: assessment.id,
    attemptNumber,
    startedAt: now,
    lastActivityAt: now,
    status: 'in-progress',
    progressMeasure: 0,
    completionStatus: 'incomplete',
    successStatus: 'unknown',
    scoreRaw: 0,
    scoreMin: 0,
    scoreMax: assessment.questions.length,
    scoreScaled: 0,
    sessionTimeMs: 0,
    currentQuestionId: assessment.questions[0]?.id || '',
    responses: {},
    events: [startEvent],
  }

  const allAttempts = getStoredAttempts().filter((a) => a.lessonId !== assessment.lessonId)
  saveStoredAttempts([...allAttempts, ...updatedAttempts, newAttempt])

  return newAttempt
}

export function updateAttempt(attempt: LearningAttempt): void {
  attempt.lastActivityAt = new Date().toISOString()
  const allAttempts = getStoredAttempts()
  const idx = allAttempts.findIndex((a) => a.id === attempt.id)
  if (idx >= 0) {
    allAttempts[idx] = attempt
  } else {
    allAttempts.push(attempt)
  }
  saveStoredAttempts(allAttempts)
}

export function recordAnswerSelection(
  attempt: LearningAttempt,
  questionId: string,
  selectedOptionId: string,
  timeSpentOnQuestionMs: number
): LearningAttempt {
  const now = new Date().toISOString()
  const existingResp = attempt.responses[questionId]
  const isChanging = existingResp && !existingResp.selectedOptionIds.includes(selectedOptionId)

  const response: AssessmentResponse = {
    questionId,
    selectedOptionIds: [selectedOptionId],
    firstAnsweredAt: existingResp ? existingResp.firstAnsweredAt : now,
    lastAnsweredAt: now,
    changeCount: existingResp ? existingResp.changeCount + (isChanging ? 1 : 0) : 0,
    timeSpentMs: (existingResp?.timeSpentMs || 0) + timeSpentOnQuestionMs,
  }

  const eventType = isChanging ? 'answer_changed' : 'answer_selected'
  const event = createLearningEvent({
    attemptId: attempt.id,
    lessonId: attempt.lessonId,
    subjectId: attempt.subjectId,
    type: eventType,
    payload: {
      questionId,
      selectedOptionId,
      previousSelection: existingResp?.selectedOptionIds || [],
    },
  })

  const questionDoneEvent = createLearningEvent({
    attemptId: attempt.id,
    lessonId: attempt.lessonId,
    subjectId: attempt.subjectId,
    type: 'question_completed',
    payload: {
      questionId,
      timeSpentMs: response.timeSpentMs,
    },
  })

  const updatedResponses = {
    ...attempt.responses,
    [questionId]: response,
  }

  const answeredCount = Object.keys(updatedResponses).length
  const progressMeasure = Number((answeredCount / Math.max(1, attempt.scoreMax)).toFixed(2))

  const updatedAttempt: LearningAttempt = {
    ...attempt,
    responses: updatedResponses,
    progressMeasure,
    events: [...attempt.events, event, questionDoneEvent],
    lastActivityAt: now,
  }

  updateAttempt(updatedAttempt)
  return updatedAttempt
}

export function pauseAttempt(
  attempt: LearningAttempt,
  additionalSessionTimeMs: number
): LearningAttempt {
  const now = new Date().toISOString()
  const event = createLearningEvent({
    attemptId: attempt.id,
    lessonId: attempt.lessonId,
    subjectId: attempt.subjectId,
    type: 'assessment_paused',
    payload: {
      reason: 'paused_by_learner',
    },
  })

  const updatedAttempt: LearningAttempt = {
    ...attempt,
    sessionTimeMs: attempt.sessionTimeMs + additionalSessionTimeMs,
    events: [...attempt.events, event],
    lastActivityAt: now,
    exitReason: 'paused',
  }

  updateAttempt(updatedAttempt)
  return updatedAttempt
}

export function resumeAttempt(attempt: LearningAttempt): LearningAttempt {
  const now = new Date().toISOString()
  const event = createLearningEvent({
    attemptId: attempt.id,
    lessonId: attempt.lessonId,
    subjectId: attempt.subjectId,
    type: 'attempt_resumed',
  })

  const updatedAttempt: LearningAttempt = {
    ...attempt,
    events: [...attempt.events, event],
    lastActivityAt: now,
  }

  updateAttempt(updatedAttempt)
  return updatedAttempt
}

export function submitAttempt(
  attempt: LearningAttempt,
  questions: AssessmentQuestion[],
  passingScorePercent = 60,
  additionalSessionTimeMs = 0,
  totalActualSections = 5
): { attempt: LearningAttempt; scorePercentage: number; isPassed: boolean } {
  const now = new Date().toISOString()
  let correctCount = 0

  const verifiedResponses: Record<string, AssessmentResponse> = {}

  for (const q of questions) {
    const resp = attempt.responses[q.id]
    const isCorrect = resp?.selectedOptionIds?.includes(q.correctOptionId) || false
    if (isCorrect) {
      correctCount += 1
    }
    if (resp) {
      verifiedResponses[q.id] = {
        ...resp,
        isCorrect,
      }
    } else {
      verifiedResponses[q.id] = {
        questionId: q.id,
        selectedOptionIds: [],
        firstAnsweredAt: now,
        lastAnsweredAt: now,
        changeCount: 0,
        timeSpentMs: 0,
        isCorrect: false,
      }
    }
  }

  const scoreRaw = correctCount
  const scoreMax = questions.length
  const scoreScaled = scoreMax > 0 ? Number((scoreRaw / scoreMax).toFixed(2)) : 0
  const scorePercentage = Math.round(scoreScaled * 100)
  const isPassed = scorePercentage >= passingScorePercent

  const submitEvent = createLearningEvent({
    attemptId: attempt.id,
    lessonId: attempt.lessonId,
    subjectId: attempt.subjectId,
    type: 'assessment_submitted',
    payload: {
      scoreRaw,
      scoreMax,
      scorePercentage,
    },
  })

  const completeEvent = createLearningEvent({
    attemptId: attempt.id,
    lessonId: attempt.lessonId,
    subjectId: attempt.subjectId,
    type: 'assessment_completed',
    payload: {
      scoreRaw,
      scoreMax,
      isPassed,
    },
  })

  const finalAttempt: LearningAttempt = {
    ...attempt,
    completedAt: now,
    status: 'completed',
    completionStatus: 'completed',
    successStatus: isPassed ? 'passed' : 'failed',
    scoreRaw,
    scoreMax,
    scoreScaled,
    progressMeasure: 1,
    sessionTimeMs: attempt.sessionTimeMs + additionalSessionTimeMs,
    responses: verifiedResponses,
    events: [...attempt.events, submitEvent, completeEvent],
    lastActivityAt: now,
  }

  updateAttempt(finalAttempt)

  // Mark lesson progress to EXACT 100%
  markAssessmentCompleted(
    attempt.lessonId,
    attempt.subjectId,
    attempt.id,
    scoreScaled,
    totalActualSections
  )

  return {
    attempt: finalAttempt,
    scorePercentage,
    isPassed,
  }
}

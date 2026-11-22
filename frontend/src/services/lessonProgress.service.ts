import { learningProgressRepository, LESSON_PROGRESS_STORAGE_KEY } from '@/repositories/learningProgress.repository'
import type { LessonProgressState } from '@/types/assessment'

export { LESSON_PROGRESS_STORAGE_KEY }

export function getLessonProgress(lessonId: string): LessonProgressState | null {
  return learningProgressRepository.getByLessonId(lessonId)
}

export function saveLessonProgress(progress: LessonProgressState): void {
  learningProgressRepository.save(progress)
}


/**
 * Compute progress based on 70% content/video + 30% assessment model.
 * Formula: Content = (completedSections / totalSections) * 70%
 *          Overall = Content + (isAssessmentCompleted ? 30% : 0%)
 */
export function computeProgressValues(
  answeredCount: number,
  totalQuestions: number,
  isAssessmentCompleted: boolean = false,
  hasAssessment: boolean = true
): { answerProgress: number; overallProgress: number; isCompleted: boolean; contentProgress: number } {
  if (totalQuestions <= 0) {
    return {
      answerProgress: 0,
      overallProgress: isAssessmentCompleted ? 100 : 0,
      contentProgress: 0,
      isCompleted: isAssessmentCompleted,
    }
  }

  const fraction = Math.min(1, Math.max(0, answeredCount / totalQuestions))
  if (hasAssessment) {
    const contentProgress = Math.round(fraction * 70)
    const overallProgress = contentProgress + (isAssessmentCompleted ? 30 : 0)
    return {
      answerProgress: Math.round(fraction * 100),
      overallProgress: Math.min(100, overallProgress),
      contentProgress,
      isCompleted: isAssessmentCompleted && contentProgress >= 70,
    }
  } else {
    const contentProgress = Math.round(fraction * 100)
    return {
      answerProgress: contentProgress,
      overallProgress: contentProgress,
      contentProgress,
      isCompleted: contentProgress >= 100,
    }
  }
}

export function markQuestionsProgress(
  lessonId: string,
  subjectId: string,
  answeredCount: number,
  totalQuestions: number
): LessonProgressState {
  const existing = getLessonProgress(lessonId)
  const isDone = existing?.assessmentStatus === 'completed'
  const { overallProgress } = computeProgressValues(
    answeredCount,
    totalQuestions,
    isDone
  )

  const updated: LessonProgressState = {
    lessonId,
    subjectId,
    completedSectionIds: existing?.completedSectionIds || [],
    contentProgress: overallProgress,
    assessmentStatus: isDone ? 'completed' : answeredCount > 0 ? 'incomplete' : 'not-attempted',
    assessmentAttemptId: existing?.assessmentAttemptId,
    assessmentScore: existing?.assessmentScore,
    overallProgress,
    updatedAt: new Date().toISOString(),
  }

  saveLessonProgress(updated)
  return updated
}

export function markSectionCompleted(
  lessonId: string,
  subjectId: string,
  sectionId: string,
  totalActualSections: number
): LessonProgressState {
  const existing = getLessonProgress(lessonId)
  const currentSections = existing ? [...existing.completedSectionIds] : []

  if (!currentSections.includes(sectionId)) {
    currentSections.push(sectionId)
  }

  const isAssessmentDone = existing?.assessmentStatus === 'completed'
  const { overallProgress } = computeProgressValues(
    currentSections.length,
    totalActualSections,
    isAssessmentDone
  )

  const updated: LessonProgressState = {
    lessonId,
    subjectId,
    completedSectionIds: currentSections,
    contentProgress: overallProgress,
    assessmentStatus: existing?.assessmentStatus || 'not-attempted',
    assessmentAttemptId: existing?.assessmentAttemptId,
    assessmentScore: existing?.assessmentScore,
    overallProgress,
    updatedAt: new Date().toISOString(),
    lastActiveSectionId: sectionId,
  }

  saveLessonProgress(updated)
  return updated
}

export function setLastActiveSection(
  lessonId: string,
  subjectId: string,
  sectionId: string,
  sectionTitle?: string
): void {
  const existing = getLessonProgress(lessonId)
  if (!existing) {
    const initial: LessonProgressState = {
      lessonId,
      subjectId,
      completedSectionIds: [],
      contentProgress: 0,
      assessmentStatus: 'not-attempted',
      overallProgress: 0,
      updatedAt: new Date().toISOString(),
      lastActiveSectionId: sectionId,
      lastActiveSectionTitle: sectionTitle,
    }
    saveLessonProgress(initial)
    return
  }

  const updated: LessonProgressState = {
    ...existing,
    lastActiveSectionId: sectionId,
    lastActiveSectionTitle: sectionTitle || existing.lastActiveSectionTitle,
    updatedAt: new Date().toISOString(),
  }
  saveLessonProgress(updated)
}

export function markAssessmentCompleted(
  lessonId: string,
  subjectId: string,
  attemptId: string,
  scoreScaled: number,
  totalActualSections: number
): LessonProgressState {
  const existing = getLessonProgress(lessonId)
  const currentSections = existing ? existing.completedSectionIds : []

  const { contentProgress, overallProgress } = computeProgressValues(
    currentSections.length,
    totalActualSections,
    true
  )

  const updated: LessonProgressState = {
    lessonId,
    subjectId,
    completedSectionIds: currentSections,
    contentProgress,
    assessmentStatus: 'completed',
    assessmentAttemptId: attemptId,
    assessmentScore: Math.round(scoreScaled * 100),
    overallProgress, // exact 100
    updatedAt: new Date().toISOString(),
  }

  saveLessonProgress(updated)
  return updated
}

export const lessonProgressService = {
  getLessonProgress,
  saveLessonProgress,
  computeProgressValues,
  markSectionCompleted,
  setLastActiveSection,
  markAssessmentCompleted,
}


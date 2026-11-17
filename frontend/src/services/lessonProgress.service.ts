import { learningProgressRepository, LESSON_PROGRESS_STORAGE_KEY } from '@/repositories/learningProgress.repository'
import { mockLessonsDetail } from '@/data/lessons.mock'
import { mockSubjectDetails } from '@/data/subjects.mock'
import type { LessonProgressState } from '@/types/assessment'

export { LESSON_PROGRESS_STORAGE_KEY }

export function getLessonProgress(lessonId: string): LessonProgressState | null {
  return learningProgressRepository.getByLessonId(lessonId)
}

export function saveLessonProgress(progress: LessonProgressState): void {
  learningProgressRepository.save(progress)

  // Sync with mockSubjectDetails so Curriculum panels & lesson rows reflect progress
  syncProgressToSubject(progress)
}


/**
 * Compute progress based strictly on required questions answered.
 * Formula: Progress = (AnsweredRequiredQuestions / TotalRequiredQuestions) * 100
 *
 * NOTE: Progress (0-100%) measures questions answered.
 * Lesson Completion is only true when the student submits a valid attempt and passes.
 */
export function computeProgressValues(
  answeredCount: number,
  totalQuestions: number,
  isAssessmentCompleted: boolean = false,
  _hasAssessment?: boolean
): { answerProgress: number; overallProgress: number; isCompleted: boolean; contentProgress: number } {
  if (totalQuestions <= 0) {
    return {
      answerProgress: 0,
      overallProgress: 0,
      contentProgress: 0,
      isCompleted: isAssessmentCompleted,
    }
  }

  const fraction = Math.min(1, Math.max(0, answeredCount / totalQuestions))
  const answerProgress = Math.round(fraction * 100)

  return {
    answerProgress,
    overallProgress: answerProgress,
    contentProgress: answerProgress,
    isCompleted: isAssessmentCompleted,
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

/**
 * Synchronize lesson progress to mockSubjectDetails in memory
 * to keep CurriculumLessonRow and SubjectDetailPage in sync.
 */
function syncProgressToSubject(progress: LessonProgressState): void {
  // Update mockLessonsDetail isCompleted
  if (mockLessonsDetail[progress.lessonId]) {
    mockLessonsDetail[progress.lessonId].isCompleted = progress.overallProgress === 100
  }

  // Update in subject chapters
  const subject = mockSubjectDetails[progress.subjectId]
  if (!subject) return

  for (const chapter of subject.chapters) {
    const found = chapter.lessons.find((l) => l.id === progress.lessonId)
    if (found) {
      found.progress = progress.overallProgress
      if (progress.overallProgress === 100) {
        found.status = 'completed'
      } else if (progress.overallProgress > 0) {
        found.status = 'in-progress'
      } else {
        found.status = 'available'
      }
      break
    }
  }
}

export const lessonProgressService = {
  getLessonProgress,
  saveLessonProgress,
  computeProgressValues,
  markSectionCompleted,
  setLastActiveSection,
  markAssessmentCompleted,
}


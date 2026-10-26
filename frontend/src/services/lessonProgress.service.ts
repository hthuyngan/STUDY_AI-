import { notifyLearningStateChanged } from './learningStateEvents'
import { mockLessonsDetail } from '@/data/lessons.mock'
import { mockSubjectDetails } from '@/data/subjects.mock'
import type { LessonProgressState } from '@/types/assessment'

export const LESSON_PROGRESS_STORAGE_KEY = 'study_ai.lesson_progress.v1'

function getStorageMap(): Record<string, LessonProgressState> {
  if (typeof window === 'undefined') return {}
  try {
    const raw = localStorage.getItem(LESSON_PROGRESS_STORAGE_KEY)
    return raw ? JSON.parse(raw) : {}
  } catch {
    return {}
  }
}

function setStorageMap(map: Record<string, LessonProgressState>): void {
  if (typeof window === 'undefined') return
  try {
    localStorage.setItem(LESSON_PROGRESS_STORAGE_KEY, JSON.stringify(map))
  } catch (err) {
    console.error('Failed to save lesson progress to localStorage', err)
  }
}

export function getLessonProgress(lessonId: string): LessonProgressState | null {
  const map = getStorageMap()
  return map[lessonId] || null
}

export function saveLessonProgress(progress: LessonProgressState): void {
  const map = getStorageMap()
  map[progress.lessonId] = progress
  setStorageMap(map)

  // Sync with mockSubjectDetails so Curriculum panels & lesson rows reflect progress
  syncProgressToSubject(progress)

  // Notify system-wide learning state listeners (Dashboard, etc.)
  notifyLearningStateChanged()
}

export function computeProgressValues(
  completedSectionCount: number,
  totalActualSections: number,
  isAssessmentCompleted: boolean
): { contentProgress: number; overallProgress: number } {
  if (totalActualSections <= 0) {
    return {
      contentProgress: isAssessmentCompleted ? 80 : 0,
      overallProgress: isAssessmentCompleted ? 100 : 0,
    }
  }

  const fraction = Math.min(1, Math.max(0, completedSectionCount / totalActualSections))
  const contentProgress = Math.round(fraction * 80)

  if (isAssessmentCompleted) {
    // When assessment is completed, guarantee EXACT 100%
    return {
      contentProgress: 80,
      overallProgress: 100,
    }
  }

  const overallProgress = Math.min(80, contentProgress)
  return {
    contentProgress,
    overallProgress,
  }
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
  const { contentProgress, overallProgress } = computeProgressValues(
    currentSections.length,
    totalActualSections,
    isAssessmentDone
  )

  const updated: LessonProgressState = {
    lessonId,
    subjectId,
    completedSectionIds: currentSections,
    contentProgress,
    assessmentStatus: existing?.assessmentStatus || 'not-attempted',
    assessmentAttemptId: existing?.assessmentAttemptId,
    assessmentScore: existing?.assessmentScore,
    overallProgress,
    updatedAt: new Date().toISOString(),
  }

  saveLessonProgress(updated)
  return updated
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

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  computeProgressValues,
  getLessonProgress,
  markSectionCompleted,
} from '@/services/lessonProgress.service'
import type { LessonProgressState } from '@/types/assessment'

export interface UseLessonProgressOptions {
  lessonId: string
  subjectId: string
  actualSectionIds: string[]
}

export function useLessonProgress({
  lessonId,
  subjectId,
  actualSectionIds,
}: UseLessonProgressOptions) {
  const [progressState, setProgressState] = useState<LessonProgressState | null>(() =>
    getLessonProgress(lessonId)
  )

  const sectionElementsRef = useRef<Map<string, HTMLElement>>(new Map())
  const timersRef = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map())

  const totalActualSections = actualSectionIds.length

  const [trackedLessonId, setTrackedLessonId] = useState(lessonId)
  if (trackedLessonId !== lessonId) {
    setTrackedLessonId(lessonId)
    setProgressState(getLessonProgress(lessonId))
  }

  const completedSectionIds = useMemo(() => {
    return progressState?.completedSectionIds || []
  }, [progressState])

  const isAssessmentCompleted = progressState?.assessmentStatus === 'completed'

  const { contentProgress, overallProgress } = useMemo(() => {
    return computeProgressValues(
      completedSectionIds.length,
      totalActualSections,
      isAssessmentCompleted
    )
  }, [completedSectionIds.length, totalActualSections, isAssessmentCompleted])

  // Register section element callback
  const registerSection = useCallback(
    (sectionId: string, el: HTMLElement | null) => {
      if (!el) {
        sectionElementsRef.current.delete(sectionId)
        const timer = timersRef.current.get(sectionId)
        if (timer) {
          clearTimeout(timer)
          timersRef.current.delete(sectionId)
        }
      } else {
        sectionElementsRef.current.set(sectionId, el)
      }
    },
    []
  )

  // Setup IntersectionObserver with 60% visibility + 2s dwell time
  useEffect(() => {
    if (typeof window === 'undefined' || !('IntersectionObserver' in window)) return

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          const sectionId = entry.target.getAttribute('data-section-id')
          if (!sectionId) return

          // If already completed, nothing to do
          const currentSaved = getLessonProgress(lessonId)
          if (currentSaved?.completedSectionIds.includes(sectionId)) {
            return
          }

          if (entry.isIntersecting && entry.intersectionRatio >= 0.55) {
            // Held in viewport: start 2-second dwell timer
            if (!timersRef.current.has(sectionId)) {
              const timer = setTimeout(() => {
                const updated = markSectionCompleted(
                  lessonId,
                  subjectId,
                  sectionId,
                  totalActualSections
                )
                setProgressState(updated)
                timersRef.current.delete(sectionId)
              }, 2000)
              timersRef.current.set(sectionId, timer)
            }
          } else {
            // Scrolled away: cancel dwell timer if not yet completed
            const activeTimer = timersRef.current.get(sectionId)
            if (activeTimer) {
              clearTimeout(activeTimer)
              timersRef.current.delete(sectionId)
            }
          }
        })
      },
      {
        threshold: [0, 0.55, 0.6, 0.8, 1.0],
      }
    )

    // Observe all registered elements
    sectionElementsRef.current.forEach((el) => {
      observer.observe(el)
    })

    const currentTimers = timersRef.current
    return () => {
      observer.disconnect()
      currentTimers.forEach((timer) => clearTimeout(timer))
      currentTimers.clear()
    }
  }, [lessonId, subjectId, totalActualSections])

  /**
   * Calculate accumulated progress for a specific section position in the lesson.
   * e.g. section index 0 of 5 -> 16%, section 1 of 5 -> 32%
   */
  const getSectionProgress = useCallback(
    (sectionId: string): number => {
      const idx = actualSectionIds.indexOf(sectionId)
      if (idx === -1 || totalActualSections === 0) return 0
      const fraction = (idx + 1) / totalActualSections
      return Math.round(fraction * 80)
    },
    [actualSectionIds, totalActualSections]
  )

  const isSectionCompleted = useCallback(
    (sectionId: string): boolean => {
      return completedSectionIds.includes(sectionId)
    },
    [completedSectionIds]
  )

  const reloadProgress = useCallback(() => {
    setProgressState(getLessonProgress(lessonId))
  }, [lessonId])

  return {
    progressState,
    completedSectionIds,
    contentProgress,
    overallProgress,
    isAssessmentCompleted,
    registerSection,
    getSectionProgress,
    isSectionCompleted,
    reloadProgress,
  }
}

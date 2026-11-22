import { useCallback, useEffect, useState } from 'react'
import { getSubjectLearningPath } from '@/services/learningPath.service'
import { LEARNING_STATE_CHANGED_EVENT } from '@/services/learningStateEvents'
import type { SubjectLearningPath } from '@/types/learningPath'

export function useSubjectLearningPath(subjectId: string) {
  const [path, setPath] = useState<SubjectLearningPath>(() => ({
    subjectId,
    subjectName: '',
    grade: '',
    totalLessons: 0,
    completedLessons: 0,
    overallProgress: 0,
    recommendedLesson: null,
    chapters: [],
    allCompleted: false,
  }))

  const reload = useCallback(() => {
    void getSubjectLearningPath(subjectId).then(setPath).catch(() => {
      setPath({
        subjectId,
        subjectName: '',
        grade: '',
        totalLessons: 0,
        completedLessons: 0,
        overallProgress: 0,
        recommendedLesson: null,
        chapters: [],
        allCompleted: false,
      })
    })
  }, [subjectId])

  // Sync state if subjectId changes
  useEffect(() => {
    reload()

    const handleStateChange = () => {
      reload()
    }

    if (typeof window !== 'undefined') {
      window.addEventListener(LEARNING_STATE_CHANGED_EVENT, handleStateChange)
    }

    return () => {
      if (typeof window !== 'undefined') {
        window.removeEventListener(LEARNING_STATE_CHANGED_EVENT, handleStateChange)
      }
    }
  }, [reload])

  return {
    path,
    reload,
  }
}

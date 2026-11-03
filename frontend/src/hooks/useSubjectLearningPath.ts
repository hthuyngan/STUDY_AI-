import { useCallback, useEffect, useState } from 'react'
import { getSubjectLearningPath } from '@/services/learningPath.service'
import { LEARNING_STATE_CHANGED_EVENT } from '@/services/learningStateEvents'
import type { SubjectLearningPath } from '@/types/learningPath'

export function useSubjectLearningPath(subjectId: string) {
  const [path, setPath] = useState<SubjectLearningPath>(() => getSubjectLearningPath(subjectId))

  const reload = useCallback(() => {
    setPath(getSubjectLearningPath(subjectId))
  }, [subjectId])

  // Sync state if subjectId changes
  useEffect(() => {
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

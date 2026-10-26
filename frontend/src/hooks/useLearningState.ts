import { useCallback, useEffect, useState } from 'react'
import {
  buildLearningStateSnapshot,
  LEARNING_STATE_CHANGED_EVENT,
} from '@/services/learningState.service'
import type { LearningStateSnapshot } from '@/types/learningState'

export function useLearningState() {
  const [snapshot, setSnapshot] = useState<LearningStateSnapshot>(() =>
    buildLearningStateSnapshot()
  )
  const [isReady] = useState(true)

  const refresh = useCallback(() => {
    setSnapshot(buildLearningStateSnapshot())
  }, [])

  useEffect(() => {
    const handleStateChange = () => {
      refresh()
    }

    if (typeof window !== 'undefined') {
      window.addEventListener(LEARNING_STATE_CHANGED_EVENT, handleStateChange)
      window.addEventListener('storage', handleStateChange)
    }

    return () => {
      if (typeof window !== 'undefined') {
        window.removeEventListener(LEARNING_STATE_CHANGED_EVENT, handleStateChange)
        window.removeEventListener('storage', handleStateChange)
      }
    }
  }, [refresh])

  return {
    snapshot,
    refresh,
    isReady,
  }
}

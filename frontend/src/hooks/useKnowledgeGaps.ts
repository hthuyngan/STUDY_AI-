import { useCallback, useEffect, useState } from 'react'
import {
  KNOWLEDGE_GAPS_CHANGED_EVENT,
  knowledgeGapsService,
} from '@/services/knowledgeGaps.service'
import type {
  KnowledgeGap,
  KnowledgeGapsSummary,
} from '@/types/knowledgeGaps'

export function useKnowledgeGaps() {
  const [gaps, setGaps] = useState<KnowledgeGap[]>(() =>
    knowledgeGapsService.getAllGaps()
  )
  const [summary, setSummary] = useState<KnowledgeGapsSummary>(() =>
    knowledgeGapsService.getSummary()
  )

  const refresh = useCallback(() => {
    setGaps(knowledgeGapsService.getAllGaps())
    setSummary(knowledgeGapsService.getSummary())
  }, [])

  useEffect(() => {
    const handleGapsChanged = () => {
      refresh()
    }

    if (typeof window !== 'undefined') {
      window.addEventListener(KNOWLEDGE_GAPS_CHANGED_EVENT, handleGapsChanged)
    }

    return () => {
      if (typeof window !== 'undefined') {
        window.removeEventListener(KNOWLEDGE_GAPS_CHANGED_EVENT, handleGapsChanged)
      }
    }
  }, [refresh])

  const removeGap = useCallback(
    (id: string) => {
      const success = knowledgeGapsService.deleteGap(id)
      refresh()
      return success
    },
    [refresh]
  )

  return {
    gaps,
    summary,
    refresh,
    removeGap,
  }
}

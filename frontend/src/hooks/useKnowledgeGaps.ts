import { useCallback, useEffect, useState } from 'react'
import {
  KNOWLEDGE_GAPS_CHANGED_EVENT,
  knowledgeGapsService,
} from '@/services/knowledgeGaps.service'
import { getAccessToken } from '@/auth/authSession'
import type {
  KnowledgeGap,
  KnowledgeGapsSummary,
} from '@/types/knowledgeGaps'

export function useKnowledgeGaps(subjectId?: string) {
  const [gaps, setGaps] = useState<KnowledgeGap[]>(() =>
    knowledgeGapsService.getAllGaps(subjectId ? { subjectId } : undefined)
  )
  const [summary, setSummary] = useState<KnowledgeGapsSummary>(() =>
    knowledgeGapsService.getSummary()
  )

  const refresh = useCallback(() => {
    setGaps(knowledgeGapsService.getAllGaps(subjectId ? { subjectId } : undefined))
    setSummary(knowledgeGapsService.getSummary())
  }, [subjectId])

  useEffect(() => {
    let active = true
    if (getAccessToken()) {
      knowledgeGapsService.syncFromBackend(subjectId).then(() => {
        if (active) {
          refresh()
        }
      })
    }
    return () => {
      active = false
    }
  }, [subjectId, refresh])

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


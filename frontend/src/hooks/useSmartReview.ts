import { useCallback, useEffect, useState } from 'react'
import { knowledgeGapsService } from '@/services/knowledgeGaps.service'
import {
  SMART_REVIEW_CHANGED_EVENT,
  smartReviewService,
} from '@/services/smartReview.service'
import type {
  ReviewRating,
  SmartReviewItem,
  SmartReviewSession,
  SmartReviewSummary,
} from '@/types/smartReview'

export function useSmartReview() {
  const [items, setItems] = useState<SmartReviewItem[]>(() =>
    smartReviewService.getAllItems()
  )
  const [dueItems, setDueItems] = useState<SmartReviewItem[]>(() =>
    smartReviewService.getDueItems()
  )
  const [summary, setSummary] = useState<SmartReviewSummary>(() =>
    smartReviewService.getSummary()
  )
  const [activeSession, setActiveSession] = useState<SmartReviewSession | null>(
    () => smartReviewService.getActiveSession()
  )

  const refresh = useCallback(() => {
    setItems(smartReviewService.getAllItems())
    setDueItems(smartReviewService.getDueItems())
    setSummary(smartReviewService.getSummary())
    setActiveSession(smartReviewService.getActiveSession())
  }, [])

  useEffect(() => {
    const handleChanged = () => {
      refresh()
    }

    if (typeof window !== 'undefined') {
      window.addEventListener(SMART_REVIEW_CHANGED_EVENT, handleChanged)
    }

    return () => {
      if (typeof window !== 'undefined') {
        window.removeEventListener(SMART_REVIEW_CHANGED_EVENT, handleChanged)
      }
    }
  }, [refresh])

  const startSession = useCallback(
    (gapIdFilter?: string) => {
      const session = smartReviewService.startSession(gapIdFilter)
      setActiveSession(session)
      return session
    },
    []
  )

  const rateItem = useCallback(
    (itemId: string, rating: ReviewRating) => {
      const result = smartReviewService.recordReviewRating(itemId, rating)
      if (result) {
        // Also update associated Knowledge Gap status
        knowledgeGapsService.updateGapStatus(result.item.gapId, result.nextGapStatus)
      }

      // Update active session progress
      const current = smartReviewService.getActiveSession()
      if (current) {
        const itemIdx = current.items.findIndex((i) => i.reviewItemId === itemId)
        if (itemIdx !== -1) {
          current.items[itemIdx].userRating = rating
        }
        if (current.currentIndex < current.items.length - 1) {
          current.currentIndex += 1
        }
        smartReviewService.saveSession(current)
        setActiveSession({ ...current })
      }

      refresh()
    },
    [refresh]
  )

  const completeSession = useCallback(() => {
    const current = smartReviewService.getActiveSession()
    if (current) {
      current.status = 'completed'
      current.completedAt = new Date().toISOString()
      smartReviewService.saveSession(current)
      setActiveSession({ ...current })
    }
  }, [])

  const exitSession = useCallback(() => {
    smartReviewService.clearActiveSession()
    setActiveSession(null)
    refresh()
  }, [refresh])

  return {
    items,
    dueItems,
    summary,
    activeSession,
    refresh,
    startSession,
    rateItem,
    completeSession,
    exitSession,
  }
}


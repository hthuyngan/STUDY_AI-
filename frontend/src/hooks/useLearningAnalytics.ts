/**
 * useLearningAnalytics Hook
 * Reactive state and filters for Student Learning Analytics & Competency Profiles.
 */

import { useCallback, useEffect, useState } from 'react'
import {
  learningAnalyticsService,
  LEARNING_ANALYTICS_CHANGED_EVENT,
} from '@/services/learningAnalytics.service'
import { KNOWLEDGE_GAPS_CHANGED_EVENT } from '@/services/knowledgeGaps.service'
import { SMART_REVIEW_CHANGED_EVENT } from '@/services/smartReview.service'
import { LEARNING_STATE_CHANGED_EVENT } from '@/services/learningStateEvents'
import type { StudentLearningAnalyticsData } from '@/types/analytics'

export function useLearningAnalytics() {
  const [data, setData] = useState<StudentLearningAnalyticsData>(() =>
    learningAnalyticsService.getAnalyticsData()
  )
  const [selectedSubject, setSelectedSubject] = useState<string>('all')
  const [selectedCompetencyLevel, setSelectedCompetencyLevel] = useState<string>('all')
  const [selectedHistoryCategory, setSelectedHistoryCategory] = useState<string>('all')
  const [loading, setLoading] = useState<boolean>(false)

  const refresh = useCallback(() => {
    setLoading(true)
    try {
      const updated = learningAnalyticsService.getAnalyticsData()
      setData(updated)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    const handleStorageOrChange = () => {
      refresh()
    }

    window.addEventListener(LEARNING_ANALYTICS_CHANGED_EVENT, handleStorageOrChange)
    window.addEventListener(KNOWLEDGE_GAPS_CHANGED_EVENT, handleStorageOrChange)
    window.addEventListener(SMART_REVIEW_CHANGED_EVENT, handleStorageOrChange)
    window.addEventListener(LEARNING_STATE_CHANGED_EVENT, handleStorageOrChange)
    window.addEventListener('storage', handleStorageOrChange)

    return () => {
      window.removeEventListener(LEARNING_ANALYTICS_CHANGED_EVENT, handleStorageOrChange)
      window.removeEventListener(KNOWLEDGE_GAPS_CHANGED_EVENT, handleStorageOrChange)
      window.removeEventListener(SMART_REVIEW_CHANGED_EVENT, handleStorageOrChange)
      window.removeEventListener(LEARNING_STATE_CHANGED_EVENT, handleStorageOrChange)
      window.removeEventListener('storage', handleStorageOrChange)
    }
  }, [refresh])

  // Filtered views
  const filteredCompetencies = data.competencies.filter((item) => {
    if (selectedSubject !== 'all' && item.subjectId !== selectedSubject) return false
    if (selectedCompetencyLevel !== 'all' && item.level !== selectedCompetencyLevel) return false
    return true
  })

  const filteredHistory = data.historyTimeline.filter((item) => {
    if (selectedSubject !== 'all' && item.subjectId !== selectedSubject) return false
    if (selectedHistoryCategory !== 'all' && item.category !== selectedHistoryCategory) return false
    return true
  })

  const selectedSubjectAnalytics =
    selectedSubject !== 'all'
      ? data.subjectAnalytics.find((s) => s.subjectId === selectedSubject) || null
      : null

  return {
    data,
    loading,
    refresh,
    selectedSubject,
    setSelectedSubject,
    selectedCompetencyLevel,
    setSelectedCompetencyLevel,
    selectedHistoryCategory,
    setSelectedHistoryCategory,
    filteredCompetencies,
    filteredHistory,
    selectedSubjectAnalytics,
  }
}


import { useCallback, useEffect, useRef, useState } from 'react'
import {
  getActiveUnfinishedAttempt,
  getLatestCompletedAttempt,
  pauseAttempt,
  recordAnswerSelection,
  resumeAttempt,
  startNewAttempt,
  submitAttempt,
  updateAttempt,
} from '@/services/assessment.service'
import { createLearningEvent } from '@/services/learningTracking.service'
import type {
  AssessmentQuestion,
  LearningAttempt,
  LessonAssessment,
} from '@/types/assessment'

export interface UseLessonAssessmentOptions {
  assessment: LessonAssessment
  totalActualSections?: number
  onAssessmentCompleted?: (scorePercent: number) => void
}

export function useLessonAssessment({
  assessment,
  totalActualSections = 5,
  onAssessmentCompleted,
}: UseLessonAssessmentOptions) {
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [activeAttempt, setActiveAttempt] = useState<LearningAttempt | null>(() =>
    getActiveUnfinishedAttempt(assessment.lessonId)
  )
  const [latestCompletedAttempt, setLatestCompletedAttempt] = useState<LearningAttempt | null>(
    () => getLatestCompletedAttempt(assessment.lessonId)
  )

  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0)
  const [showPauseConfirm, setShowPauseConfirm] = useState(false)
  const [showSubmitConfirm, setShowSubmitConfirm] = useState(false)
  const [showResultView, setShowResultView] = useState(false)

  // Question & Session Timing
  const questionStartTimeRef = useRef<number>(0)
  const sessionStartTimeRef = useRef<number>(0)
  const isHiddenRef = useRef<boolean>(false)

  const questions = assessment.questions
  const currentQuestion: AssessmentQuestion | undefined = questions[currentQuestionIndex]

  // Sync state on lesson change
  const [trackedLessonId, setTrackedLessonId] = useState(assessment.lessonId)
  if (trackedLessonId !== assessment.lessonId) {
    setTrackedLessonId(assessment.lessonId)
    setActiveAttempt(getActiveUnfinishedAttempt(assessment.lessonId))
    setLatestCompletedAttempt(getLatestCompletedAttempt(assessment.lessonId))
  }

  // Accumulate time spent on current question
  const flushCurrentQuestionTime = useCallback(() => {
    if (!activeAttempt || !currentQuestion) return 0
    const now = Date.now()
    const elapsed =
      questionStartTimeRef.current === 0
        ? 0
        : Math.max(0, now - questionStartTimeRef.current)
    questionStartTimeRef.current = now
    return elapsed
  }, [activeAttempt, currentQuestion])

  // Start new attempt or resume
  const handleStartAttempt = useCallback(() => {
    const unfinished = getActiveUnfinishedAttempt(assessment.lessonId)
    if (unfinished) {
      const resumed = resumeAttempt(unfinished)
      setActiveAttempt(resumed)
      // Restore question index if saved
      const qIdx = questions.findIndex((q) => q.id === resumed.currentQuestionId)
      setCurrentQuestionIndex(qIdx >= 0 ? qIdx : 0)
    } else {
      const brandNew = startNewAttempt(assessment)
      setActiveAttempt(brandNew)
      setCurrentQuestionIndex(0)
    }
    setShowResultView(false)
    setShowPauseConfirm(false)
    setShowSubmitConfirm(false)
    sessionStartTimeRef.current = Date.now()
    questionStartTimeRef.current = Date.now()
    setIsModalOpen(true)
  }, [assessment, questions])

  // Start brand new attempt explicitly (retry)
  const handleRestartAttempt = useCallback(() => {
    const brandNew = startNewAttempt(assessment)
    setActiveAttempt(brandNew)
    setCurrentQuestionIndex(0)
    setShowResultView(false)
    setShowPauseConfirm(false)
    setShowSubmitConfirm(false)
    sessionStartTimeRef.current = Date.now()
    questionStartTimeRef.current = Date.now()
    setIsModalOpen(true)
  }, [assessment])

  // View latest result
  const handleViewLatestResult = useCallback(() => {
    const latest = getLatestCompletedAttempt(assessment.lessonId)
    if (latest) {
      setActiveAttempt(latest)
      setShowResultView(true)
      setIsModalOpen(true)
    }
  }, [assessment.lessonId])

  // Navigate to question
  const goToQuestion = useCallback(
    (index: number) => {
      if (index < 0 || index >= questions.length || !activeAttempt) return
      const elapsed = flushCurrentQuestionTime()

      const targetQ = questions[index]
      const viewEvent = createLearningEvent(activeAttempt.id, 'question_viewed', {
        fromQuestionId: currentQuestion?.id,
        toQuestionId: targetQ.id,
        questionIndex: index,
        timeSpentOnPrevMs: elapsed,
      })

      const updated = {
        ...activeAttempt,
        currentQuestionId: targetQ.id,
        events: [...activeAttempt.events, viewEvent],
      }
      setActiveAttempt(updated)
      updateAttempt(updated)
      setCurrentQuestionIndex(index)
      questionStartTimeRef.current = Date.now()
    },
    [activeAttempt, currentQuestion?.id, flushCurrentQuestionTime, questions]
  )

  const nextQuestion = useCallback(() => {
    if (currentQuestionIndex < questions.length - 1) {
      goToQuestion(currentQuestionIndex + 1)
    }
  }, [currentQuestionIndex, goToQuestion, questions.length])

  const previousQuestion = useCallback(() => {
    if (currentQuestionIndex > 0) {
      goToQuestion(currentQuestionIndex - 1)
    }
  }, [currentQuestionIndex, goToQuestion])

  // Select Option with Autosave
  const selectOption = useCallback(
    (optionId: string) => {
      if (!activeAttempt || !currentQuestion || activeAttempt.status === 'completed') return
      const elapsed = flushCurrentQuestionTime()
      const updated = recordAnswerSelection(
        activeAttempt,
        currentQuestion.id,
        optionId,
        elapsed
      )
      setActiveAttempt(updated)
      questionStartTimeRef.current = Date.now()
    },
    [activeAttempt, currentQuestion, flushCurrentQuestionTime]
  )

  // Pause Attempt
  const confirmPause = useCallback(() => {
    if (!activeAttempt) return
    const elapsedSession = Math.max(0, Date.now() - sessionStartTimeRef.current)
    const updated = pauseAttempt(activeAttempt, elapsedSession)
    setActiveAttempt(updated)
    setShowPauseConfirm(false)
    setIsModalOpen(false)
  }, [activeAttempt])

  // Submit Attempt
  const confirmSubmit = useCallback(() => {
    if (!activeAttempt) return
    const elapsedSession = Math.max(0, Date.now() - sessionStartTimeRef.current)
    const { attempt: submitted, scorePercentage } = submitAttempt(
      activeAttempt,
      questions,
      assessment.passingScorePercent,
      elapsedSession,
      totalActualSections
    )
    setActiveAttempt(submitted)
    setLatestCompletedAttempt(submitted)
    setShowSubmitConfirm(false)
    setShowResultView(true)
    onAssessmentCompleted?.(scorePercentage)
  }, [
    activeAttempt,
    assessment.passingScorePercent,
    onAssessmentCompleted,
    questions,
    totalActualSections,
  ])

  // Close modal after viewing result
  const closeModal = useCallback(() => {
    setIsModalOpen(false)
    setShowResultView(false)
    setShowPauseConfirm(false)
    setShowSubmitConfirm(false)
  }, [])

  // Visibility and BeforeUnload Listeners
  useEffect(() => {
    if (!isModalOpen || !activeAttempt || activeAttempt.status === 'completed') return

    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault()
      e.returnValue = 'Bạn đang làm bài tập thu hoạch. Tiến độ chưa nộp sẽ được lưu tạm thời.'
      return e.returnValue
    }

    const handleVisibilityChange = () => {
      if (document.hidden) {
        isHiddenRef.current = true
        const elapsed = flushCurrentQuestionTime()
        const blurEvent = createLearningEvent(activeAttempt.id, 'window_blurred', {
          timeSpentOnQuestionMs: elapsed,
        })
        const updated = {
          ...activeAttempt,
          events: [...activeAttempt.events, blurEvent],
        }
        setActiveAttempt(updated)
        updateAttempt(updated)
      } else {
        isHiddenRef.current = false
        questionStartTimeRef.current = Date.now()
        const focusEvent = createLearningEvent(activeAttempt.id, 'window_focused', {})
        const updated = {
          ...activeAttempt,
          events: [...activeAttempt.events, focusEvent],
        }
        setActiveAttempt(updated)
        updateAttempt(updated)
      }
    }

    window.addEventListener('beforeunload', handleBeforeUnload)
    document.addEventListener('visibilitychange', handleVisibilityChange)

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload)
      document.removeEventListener('visibilitychange', handleVisibilityChange)
    }
  }, [activeAttempt, flushCurrentQuestionTime, isModalOpen])

  // Calculate answered count
  const answeredCount = activeAttempt ? Object.keys(activeAttempt.responses).length : 0
  const isAllAnswered = questions.length > 0 && answeredCount >= questions.length
  const hasUnfinishedAttempt = activeAttempt?.status === 'in-progress'

  return {
    isModalOpen,
    activeAttempt,
    latestCompletedAttempt,
    currentQuestionIndex,
    currentQuestion,
    questions,
    answeredCount,
    isAllAnswered,
    hasUnfinishedAttempt,
    showPauseConfirm,
    showSubmitConfirm,
    showResultView,
    setShowPauseConfirm,
    setShowSubmitConfirm,
    handleStartAttempt,
    handleRestartAttempt,
    handleViewLatestResult,
    goToQuestion,
    nextQuestion,
    previousQuestion,
    selectOption,
    confirmPause,
    confirmSubmit,
    closeModal,
  }
}

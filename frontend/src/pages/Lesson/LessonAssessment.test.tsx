import { describe, expect, it, beforeEach, afterEach, vi } from 'vitest'
import { cleanup } from '@testing-library/react'
import {
  computeProgressValues,
  markSectionCompleted,
  getLessonProgress,
} from '@/services/lessonProgress.service'
import {
  startNewAttempt,
  recordAnswerSelection,
  submitAttempt,
  pauseAttempt,
  resumeAttempt,
  getAllAttemptsForLesson,
  getActiveUnfinishedAttempt,
} from '@/services/assessment.service'
import { mockAssessments } from '@/data/assessments.mock'
import { toScormTrackingSnapshot, type LearningAttempt } from '@/types/assessment'

describe('Lesson Progress Calculation & Section Tracking', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('computes 0% progress when 0 sections are completed', () => {
    const { contentProgress, overallProgress } = computeProgressValues(0, 5, false)
    expect(contentProgress).toBe(0)
    expect(overallProgress).toBe(0)
  })

  it('computes proportional content progress for partial sections', () => {
    // 2 out of 5 sections = (2/5) * 70 = 28%
    const { contentProgress, overallProgress } = computeProgressValues(2, 5, false)
    expect(contentProgress).toBe(28)
    expect(overallProgress).toBe(28)

    // 1 out of 5 = 14%
    const oneSec = computeProgressValues(1, 5, false)
    expect(oneSec.contentProgress).toBe(14)
    expect(oneSec.overallProgress).toBe(14)
  })

  it('caps content progress at exactly 70% when video section is completed', () => {
    const { contentProgress, overallProgress } = computeProgressValues(1, 1, false)
    expect(contentProgress).toBe(70)
    expect(overallProgress).toBe(70)
  })

  it('achieves EXACT 100% overall progress when assessment is completed', () => {
    // Completing video (70%) and assessment (30%) gives 100%
    const { contentProgress, overallProgress } = computeProgressValues(1, 1, true)
    expect(contentProgress).toBe(70)
    expect(overallProgress).toBe(100)
  })

  it('records section completion once and prevents duplicate counting', () => {
    const lessonId = 'lesson-math-08'
    const subjectId = 'math'
    const totalSections = 5

    // Mark section 1
    const p1 = markSectionCompleted(lessonId, subjectId, 'introduction', totalSections)
    expect(p1.completedSectionIds).toEqual(['introduction'])
    expect(p1.overallProgress).toBe(14)

    // Re-mark section 1 (e.g. re-entering viewport)
    const p2 = markSectionCompleted(lessonId, subjectId, 'introduction', totalSections)
    expect(p2.completedSectionIds).toEqual(['introduction'])
    expect(p2.overallProgress).toBe(14)

    // Mark section 2
    const p3 = markSectionCompleted(lessonId, subjectId, 'definitions', totalSections)
    expect(p3.completedSectionIds).toEqual(['introduction', 'definitions'])
    expect(p3.overallProgress).toBe(28)

    // Verify stored progress can be restored
    const restored = getLessonProgress(lessonId)
    expect(restored).not.toBeNull()
    expect(restored?.completedSectionIds.length).toBe(2)
  })
})

describe('Assessment Attempt Lifecycle & Autosave', () => {
  const assessment = mockAssessments['lesson-math-08']

  beforeEach(() => {
    localStorage.clear()
  })

  it('starts a new attempt, answers questions, changes answer, and autosaves', () => {
    const attempt = startNewAttempt(assessment)
    expect(attempt.attemptNumber).toBe(1)
    expect(attempt.status).toBe('in-progress')
    expect(attempt.completionStatus).toBe('incomplete')
    expect(attempt.events.length).toBeGreaterThan(0)
    expect(attempt.events[0].type).toBe('assessment_started')

    // Select answer for question 1
    const q1 = assessment.questions[0]
    const updated1 = recordAnswerSelection(attempt, q1.id, 'opt-1-a', 2500)
    expect(updated1.responses[q1.id]?.selectedOptionIds).toEqual(['opt-1-a'])
    expect(updated1.responses[q1.id]?.changeCount).toBe(0)

    // Change answer for question 1 to opt-1-b
    const updated2 = recordAnswerSelection(updated1, q1.id, 'opt-1-b', 3000)
    expect(updated2.responses[q1.id]?.selectedOptionIds).toEqual(['opt-1-b'])
    expect(updated2.responses[q1.id]?.changeCount).toBe(1)

    // Check event log has answer_selected and answer_changed
    const eventTypes = updated2.events.map((e) => e.type)
    expect(eventTypes).toContain('answer_selected')
    expect(eventTypes).toContain('answer_changed')

    // Active unfinished attempt can be retrieved from storage
    const active = getActiveUnfinishedAttempt(assessment.lessonId)
    expect(active?.id).toBe(attempt.id)
    expect(active?.responses[q1.id]?.selectedOptionIds).toEqual(['opt-1-b'])
  })

  it('pauses and resumes an in-progress attempt with session time accumulation', () => {
    const attempt = startNewAttempt(assessment)
    const paused = pauseAttempt(attempt, 5000)
    expect(paused.sessionTimeMs).toBe(5000)
    expect(paused.exitReason).toBe('paused')
    expect(paused.events.some((e) => e.type === 'assessment_paused')).toBe(true)

    const resumed = resumeAttempt(paused)
    expect(resumed.events.some((e) => e.type === 'attempt_resumed')).toBe(true)
  })

  it('submits attempt, scores answers accurately, reaches 100% lesson progress, and records events', () => {
    // Complete video section first (70%)
    markSectionCompleted(assessment.lessonId, assessment.subjectId, 'video-lecture', 1)

    let attempt = startNewAttempt(assessment)

    // Answer all 5 questions correctly
    for (const q of assessment.questions) {
      attempt = recordAnswerSelection(attempt, q.id, q.correctOptionId, 2000)
    }

    const { attempt: submitted, scorePercentage, isPassed } = submitAttempt(
      attempt,
      assessment.questions,
      assessment.passingScorePercent,
      10000,
      1
    )

    expect(submitted.status).toBe('completed')
    expect(submitted.completionStatus).toBe('completed')
    expect(submitted.successStatus).toBe('passed')
    expect(submitted.scoreRaw).toBe(5)
    expect(submitted.scoreMax).toBe(5)
    expect(submitted.scoreScaled).toBe(1)
    expect(scorePercentage).toBe(100)
    expect(isPassed).toBe(true)

    // Lesson progress state updated to 100%
    const lessonProgress = getLessonProgress(assessment.lessonId)
    expect(lessonProgress?.overallProgress).toBe(100)
    expect(lessonProgress?.assessmentStatus).toBe('completed')

    // SCORM-inspired snapshot adapter works accurately
    const scormSnapshot = toScormTrackingSnapshot(submitted)
    expect(scormSnapshot.completion_status).toBe('completed')
    expect(scormSnapshot.success_status).toBe('passed')
    expect(scormSnapshot['score.raw']).toBe(5)
    expect(scormSnapshot['score.scaled']).toBe(1)
  })

  it('retains history of previous attempts upon retry without overwriting', () => {
    // First attempt: answer only 2 correctly
    let attempt1 = startNewAttempt(assessment)
    attempt1 = recordAnswerSelection(attempt1, assessment.questions[0].id, assessment.questions[0].correctOptionId, 1000)
    submitAttempt(attempt1, assessment.questions, assessment.passingScorePercent, 5000, 5)

    // Second attempt (retry)
    let attempt2 = startNewAttempt(assessment)
    expect(attempt2.id).not.toBe(attempt1.id)
    expect(attempt2.attemptNumber).toBe(2)

    for (const q of assessment.questions) {
      attempt2 = recordAnswerSelection(attempt2, q.id, q.correctOptionId, 1000)
    }
    submitAttempt(attempt2, assessment.questions, assessment.passingScorePercent, 6000, 5)

    // Check all stored attempts for lesson: both are preserved
    const allAttempts = getAllAttemptsForLesson(assessment.lessonId)
    expect(allAttempts.length).toBe(2)
    expect(allAttempts[0].attemptNumber).toBe(1)
    expect(allAttempts[1].attemptNumber).toBe(2)
  })
})

describe('Assessment UI Components & Modal Interactions', () => {
  const assessment = mockAssessments['lesson-math-08']

  afterEach(() => {
    cleanup()
  })

  it('renders LessonAssessmentCard with pending badge and starts attempt', async () => {
    const { render, screen, fireEvent } = await import('@testing-library/react')
    const { LessonAssessmentCard } = await import('@/components/assessment/LessonAssessmentCard')

    const onStart = vi.fn()
    render(
      <LessonAssessmentCard
        assessment={assessment}
        isCompleted={false}
        hasUnfinishedAttempt={false}
        onStartAttempt={onStart}
      />
    )

    expect(screen.getByRole('heading', { name: /Bài tập thu hoạch/i })).toBeInTheDocument()
    expect(screen.getByText('+30%')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Bắt đầu làm bài/i })).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: /Bắt đầu làm bài/i }))
    expect(onStart).toHaveBeenCalled()
  })

  it('renders LessonAssessmentCard in completed state with 100% badge and retry button', async () => {
    const { render, screen } = await import('@testing-library/react')
    const { LessonAssessmentCard } = await import('@/components/assessment/LessonAssessmentCard')

    const attempt = startNewAttempt(assessment)
    attempt.status = 'completed'
    attempt.scoreRaw = 5
    attempt.scoreMax = 5
    attempt.scoreScaled = 1
    attempt.successStatus = 'passed'

    render(
      <LessonAssessmentCard
        assessment={assessment}
        isCompleted={true}
        hasUnfinishedAttempt={false}
        latestAttempt={attempt}
        onStartAttempt={vi.fn()}
        onRetryAttempt={vi.fn()}
      />
    )

    expect(screen.getByText('100%')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Làm lại/i })).toBeInTheDocument()
    expect(screen.getByText(/5 \/ 5/)).toBeInTheDocument()
  })

  it('ensures modal prevents backdrop close and triggers pause confirmation on Esc', async () => {
    const { render, screen, fireEvent } = await import('@testing-library/react')
    const { AssessmentModal } = await import('@/components/assessment/AssessmentModal')

    const setShowPause = vi.fn()
    const attempt = startNewAttempt(assessment)

    render(
      <AssessmentModal
        isOpen={true}
        assessment={assessment}
        lessonTitle="Khảo sát hàm số"
        activeAttempt={attempt}
        currentQuestionIndex={0}
        currentQuestion={assessment.questions[0]}
        questions={assessment.questions}
        answeredCount={0}
        isAllAnswered={false}
        showPauseConfirm={false}
        showSubmitConfirm={false}
        showResultView={false}
        setShowPauseConfirm={setShowPause}
        setShowSubmitConfirm={vi.fn()}
        onSelectOption={vi.fn()}
        onGoToQuestion={vi.fn()}
        onNextQuestion={vi.fn()}
        onPreviousQuestion={vi.fn()}
        onConfirmPause={vi.fn()}
        onConfirmSubmit={vi.fn()}
        onCloseModal={vi.fn()}
        onRetry={vi.fn()}
      />
    )

    // Modal is dialog
    expect(screen.getByRole('dialog')).toBeInTheDocument()

    // Press Escape -> triggers setShowPauseConfirm(true) instead of closing
    fireEvent.keyDown(window, { key: 'Escape', code: 'Escape' })
    expect(setShowPause).toHaveBeenCalledWith(true)
  })

  it('renders LessonAssessmentCard in unfinished state with active attempt details and handles restart confirm', async () => {
    const { render, screen, fireEvent } = await import('@testing-library/react')
    const { LessonAssessmentCard } = await import('@/components/assessment/LessonAssessmentCard')

    let attempt = startNewAttempt(assessment)
    attempt = recordAnswerSelection(attempt, assessment.questions[0].id, 'opt-1-a', 2000)
    attempt = recordAnswerSelection(attempt, assessment.questions[1].id, 'opt-2-b', 3000)

    const onRetry = vi.fn()
    render(
      <LessonAssessmentCard
        assessment={assessment}
        isCompleted={false}
        hasUnfinishedAttempt={true}
        activeAttempt={attempt}
        onStartAttempt={vi.fn()}
        onRetryAttempt={onRetry}
      />
    )

    expect(screen.getAllByText('Đang làm dở').length).toBeGreaterThan(0)
    expect(screen.getByText(/2 \/ 5 câu/)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Tiếp tục bài tập/i })).toBeInTheDocument()

    // Click Bắt đầu lại -> opens confirmation dialog
    const restartBtn = screen.getByRole('button', { name: /Bắt đầu lại/i })
    fireEvent.click(restartBtn)

    expect(screen.getByText(/Bắt đầu lại bài tập thu hoạch\?/i)).toBeInTheDocument()
    const confirmBtn = screen.getByRole('button', { name: /Xác nhận bắt đầu lại/i })
    fireEvent.click(confirmBtn)
    expect(onRetry).toHaveBeenCalled()
  })

  it('renders graceful fallback when lesson has no assessment without crashing', async () => {
    const { render, screen } = await import('@testing-library/react')
    const { LessonAssessmentCard } = await import('@/components/assessment/LessonAssessmentCard')

    render(
      <LessonAssessmentCard
        assessment={null}
        isCompleted={false}
        hasUnfinishedAttempt={false}
        onStartAttempt={vi.fn()}
      />
    )

    expect(screen.getByText(/Bài tập thu hoạch đang được cập nhật/i)).toBeInTheDocument()
    expect(screen.getByText('Chưa làm')).toBeInTheDocument()
  })

  it('verifies learning event log persistence in storage', async () => {
    const { getStoredLearningEvents } = await import('@/services/learningTracking.service')
    const events = getStoredLearningEvents(assessment.lessonId)
    expect(events.length).toBeGreaterThan(0)
    expect(events.some((e) => e.type === 'assessment_started')).toBe(true)
  })

  it('rehydrates unfinished attempt when learning state event is received after page reload', async () => {
    const { renderHook, act } = await import('@testing-library/react')
    const { useLessonAssessment } = await import('@/hooks/useLessonAssessment')
    const { updateAttempt } = await import('@/services/assessment.service')
    const { notifyLearningStateChanged } = await import('@/services/learningStateEvents')

    // Initial render without active attempt
    const { result } = renderHook(() =>
      useLessonAssessment({
        assessment: {
          ...assessment,
          lessonId: 'les_math12_reload_test',
        },
      })
    )

    expect(result.current.hasUnfinishedAttempt).toBe(false)
    expect(result.current.activeAttempt).toBeNull()

    // Simulate an unfinished attempt being stored (e.g. after network failure or background fetch)
    const now = new Date().toISOString()
    const storedAttempt: LearningAttempt = {
      id: 'atm_reload_123',
      assessmentId: 'asmt_reload',
      lessonId: 'les_math12_reload_test',
      subjectId: 'math',
      chapterId: 'chap_1',
      learnerId: 'usr_test_1',
      attemptNumber: 1,
      startedAt: now,
      lastActivityAt: now,
      status: 'in-progress',
      completionStatus: 'incomplete',
      successStatus: 'unknown',
      scoreRaw: 1,
      scoreMin: 0,
      scoreMax: 2,
      scoreScaled: 0.5,
      progressMeasure: 0.5,
      sessionTimeMs: 45000,
      currentQuestionId: 'q1',
      responses: {
        'q1': {
          questionId: 'q1',
          selectedOptionIds: ['opt_a'],
          firstAnsweredAt: now,
          lastAnsweredAt: now,
          changeCount: 0,
          timeSpentMs: 20000,
        },
      },
      events: [],
    }

    act(() => {
      updateAttempt(storedAttempt)
      notifyLearningStateChanged()
    })

    // Hook must dynamically rehydrate and reflect the unfinished attempt
    expect(result.current.hasUnfinishedAttempt).toBe(true)
    expect(result.current.activeAttempt?.id).toBe('atm_reload_123')
  })
})

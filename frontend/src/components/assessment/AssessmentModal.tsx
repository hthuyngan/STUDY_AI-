import { useEffect, useId, useRef, useState } from 'react'
import {
  AlertCircle,
  Award,
  ChevronLeft,
  ChevronRight,
  Clock,
  Pause,
  Send,
} from 'lucide-react'
import { AssessmentQuestionNav } from './AssessmentQuestionNav'
import { AssessmentResultView } from './AssessmentResultView'
import { Button } from '@/components/ui/Button'
import type {
  AssessmentQuestion,
  LearningAttempt,
  LessonAssessment,
} from '@/types/assessment'
import './AssessmentModal.css'

export interface AssessmentModalProps {
  isOpen: boolean
  assessment: LessonAssessment
  lessonTitle: string
  activeAttempt: LearningAttempt | null
  currentQuestionIndex: number
  currentQuestion: AssessmentQuestion | undefined
  questions: AssessmentQuestion[]
  answeredCount: number
  isAllAnswered: boolean
  showPauseConfirm: boolean
  showSubmitConfirm: boolean
  showResultView: boolean
  setShowPauseConfirm: (show: boolean) => void
  setShowSubmitConfirm: (show: boolean) => void
  onSelectOption: (optionId: string) => void
  onGoToQuestion: (index: number) => void
  onNextQuestion: () => void
  onPreviousQuestion: () => void
  onConfirmPause: () => void
  onConfirmSubmit: () => void
  onCloseModal: () => void
  onRetry: () => void
}

function formatSessionTime(ms: number): string {
  const totalSeconds = Math.round(ms / 1000)
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = totalSeconds % 60
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
}

export function AssessmentModal({
  isOpen,
  assessment,
  lessonTitle,
  activeAttempt,
  currentQuestionIndex,
  currentQuestion,
  questions,
  answeredCount,
  isAllAnswered,
  showPauseConfirm,
  showSubmitConfirm,
  showResultView,
  setShowPauseConfirm,
  setShowSubmitConfirm,
  onSelectOption,
  onGoToQuestion,
  onNextQuestion,
  onPreviousQuestion,
  onConfirmPause,
  onConfirmSubmit,
  onCloseModal,
  onRetry,
}: AssessmentModalProps) {
  const titleId = useId()
  const modalRef = useRef<HTMLDivElement>(null)
  const [elapsedTime, setElapsedTime] = useState(0)

  // Timer interval for session clock
  useEffect(() => {
    if (!isOpen || showResultView || !activeAttempt) return
    const interval = setInterval(() => {
      setElapsedTime((prev) => prev + 1000)
    }, 1000)
    return () => clearInterval(interval)
  }, [isOpen, showResultView, activeAttempt])

  // Body scroll lock & focus trap
  useEffect(() => {
    if (isOpen) {
      const originalOverflow = document.body.style.overflow
      document.body.style.overflow = 'hidden'

      // Focus modal container
      if (modalRef.current) {
        modalRef.current.focus()
      }

      return () => {
        document.body.style.overflow = originalOverflow
      }
    }
  }, [isOpen])

  // ESC Key handler: Does NOT close active modal; triggers pause confirmation instead
  useEffect(() => {
    if (!isOpen) return

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault()
        e.stopPropagation()
        if (showResultView) {
          onCloseModal()
        } else if (!showPauseConfirm && !showSubmitConfirm) {
          setShowPauseConfirm(true)
        }
      }
    }

    window.addEventListener('keydown', handleKeyDown, true)
    return () => window.removeEventListener('keydown', handleKeyDown, true)
  }, [
    isOpen,
    showResultView,
    showPauseConfirm,
    showSubmitConfirm,
    setShowPauseConfirm,
    onCloseModal,
  ])

  if (!isOpen) return null

  // Collect answered indices for question navigator map
  const answeredIndices: number[] = []
  if (activeAttempt) {
    questions.forEach((q, idx) => {
      if (activeAttempt.responses[q.id]?.selectedOptionIds?.length) {
        answeredIndices.push(idx)
      }
    })
  }

  const selectedOptionId =
    currentQuestion && activeAttempt
      ? activeAttempt.responses[currentQuestion.id]?.selectedOptionIds?.[0]
      : undefined

  const isLastQuestion = currentQuestionIndex === questions.length - 1
  const displaySessionTime = (activeAttempt?.sessionTimeMs || 0) + elapsedTime

  return (
    <div
      className="assessment-modal-overlay"
      role="presentation"
      onClick={(e) => {
        // Prevent closing on backdrop click
        e.stopPropagation()
      }}
    >
      <div
        ref={modalRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        className="assessment-modal-container"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <header className="assessment-modal-header">
          <div className="header-left">
            <div className="header-badge" aria-hidden>
              <Award size={18} />
            </div>
            <div>
              <h1 id={titleId} className="modal-title">
                Bài tập thu hoạch
              </h1>
              <span className="modal-subtitle">{lessonTitle}</span>
            </div>
          </div>

          {!showResultView && (
            <div className="header-center">
              <span className="question-count-indicator">
                Câu {currentQuestionIndex + 1} / {questions.length}
              </span>
              <div
                className="header-progress-bar"
                role="progressbar"
                aria-valuenow={answeredCount}
                aria-valuemin={0}
                aria-valuemax={questions.length}
              >
                <div
                  className="header-progress-fill"
                  style={{
                    width: `${questions.length > 0 ? (answeredCount / questions.length) * 100 : 0}%`,
                  }}
                />
              </div>
            </div>
          )}

          <div className="header-right">
            {!showResultView ? (
              <>
                <div className="session-time-display" aria-label="Thời gian đã làm bài">
                  <Clock size={15} aria-hidden />
                  <span>{formatSessionTime(displaySessionTime)}</span>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  icon={Pause}
                  onClick={() => setShowPauseConfirm(true)}
                  aria-label="Tạm dừng bài làm"
                >
                  Tạm dừng
                </Button>
              </>
            ) : (
              <Button variant="outline" size="sm" onClick={onCloseModal}>
                Đóng
              </Button>
            )}
          </div>
        </header>

        {/* Modal Main Body */}
        <div className="assessment-modal-content">
          {showResultView && activeAttempt ? (
            <AssessmentResultView
              attempt={activeAttempt}
              questions={questions}
              passingScorePercent={assessment.passingScorePercent}
              onClose={onCloseModal}
              onRetry={onRetry}
            />
          ) : currentQuestion ? (
            <div className="question-working-area">
              {/* Question Map */}
              <AssessmentQuestionNav
                totalQuestions={questions.length}
                currentIndex={currentQuestionIndex}
                answeredIndices={answeredIndices}
                onSelectIndex={onGoToQuestion}
              />

              {/* Question Card */}
              <div className="question-content-box">
                <div className="question-meta-row">
                  <span className="question-idx-label">Câu {currentQuestionIndex + 1}</span>
                  {currentQuestion.topic && (
                    <span className="question-topic-badge">{currentQuestion.topic}</span>
                  )}
                </div>

                <h2 className="question-prompt-text">{currentQuestion.prompt}</h2>

                {/* Options List */}
                <div
                  className="question-options-group"
                  role="radiogroup"
                  aria-label={`Các lựa chọn cho câu ${currentQuestionIndex + 1}`}
                >
                  {currentQuestion.options.map((opt) => {
                    const isSelected = opt.id === selectedOptionId
                    return (
                      <button
                        key={opt.id}
                        type="button"
                        role="radio"
                        aria-checked={isSelected}
                        className={`assessment-option-item ${isSelected ? 'is-selected' : ''}`}
                        onClick={() => onSelectOption(opt.id)}
                      >
                        <span className="option-radio-dot" aria-hidden>
                          {isSelected && <span className="radio-inner-dot" />}
                        </span>
                        <span className="option-label-badge">{opt.label}</span>
                        <span className="option-text-content">{opt.text}</span>
                      </button>
                    )
                  })}
                </div>
              </div>
            </div>
          ) : (
            <div className="question-empty-state">
              <p>Không tìm thấy dữ liệu câu hỏi.</p>
            </div>
          )}
        </div>

        {/* Modal Footer (only during working state) */}
        {!showResultView && (
          <footer className="assessment-modal-footer">
            <div className="footer-left">
              <Button
                variant="outline"
                icon={ChevronLeft}
                disabled={currentQuestionIndex === 0}
                onClick={onPreviousQuestion}
              >
                Câu trước
              </Button>
            </div>

            <div className="footer-center">
              <span className="answered-summary-text">
                Đã trả lời <strong>{answeredCount}</strong> / {questions.length} câu
              </span>
            </div>

            <div className="footer-right">
              {isLastQuestion ? (
                <Button
                  variant="primary"
                  icon={Send}
                  disabled={!isAllAnswered}
                  onClick={() => setShowSubmitConfirm(true)}
                  className="submit-assessment-btn"
                >
                  Nộp bài
                </Button>
              ) : (
                <Button
                  variant="primary"
                  onClick={onNextQuestion}
                  className="next-question-btn"
                >
                  <span>Câu tiếp</span>
                  <ChevronRight size={16} aria-hidden />
                </Button>
              )}
            </div>
          </footer>
        )}

        {/* Pause Confirmation Overlay */}
        {showPauseConfirm && (
          <div className="modal-sub-dialog-backdrop" role="presentation">
            <div
              className="modal-sub-dialog"
              role="alertdialog"
              aria-modal="true"
              aria-labelledby="pause-dialog-title"
            >
              <div className="sub-dialog-icon pause" aria-hidden>
                <Pause size={24} />
              </div>
              <h3 id="pause-dialog-title" className="sub-dialog-title">
                Tạm dừng bài làm?
              </h3>
              <p className="sub-dialog-desc">
                Tiến độ làm bài và các câu trả lời của bạn sẽ được lưu an toàn. Bạn có thể quay lại tiếp tục làm bài bất kỳ lúc nào.
              </p>
              <div className="sub-dialog-actions">
                <Button variant="outline" onClick={() => setShowPauseConfirm(false)}>
                  Tiếp tục làm
                </Button>
                <Button variant="primary" onClick={onConfirmPause}>
                  Tạm dừng & Thoát
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Submit Confirmation Overlay */}
        {showSubmitConfirm && (
          <div className="modal-sub-dialog-backdrop" role="presentation">
            <div
              className="modal-sub-dialog"
              role="alertdialog"
              aria-modal="true"
              aria-labelledby="submit-dialog-title"
            >
              <div className="sub-dialog-icon submit" aria-hidden>
                <AlertCircle size={24} />
              </div>
              <h3 id="submit-dialog-title" className="sub-dialog-title">
                Xác nhận nộp bài thu hoạch
              </h3>
              <p className="sub-dialog-desc">
                Bạn đã trả lời {answeredCount}/{questions.length} câu. Sau khi nộp bài, kết quả lần làm này sẽ được lưu và hoàn thành bài học (100% tiến độ).
              </p>
              <div className="sub-dialog-actions">
                <Button variant="outline" onClick={() => setShowSubmitConfirm(false)}>
                  Quay lại kiểm tra
                </Button>
                <Button variant="primary" icon={Send} onClick={onConfirmSubmit}>
                  Xác nhận nộp bài
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

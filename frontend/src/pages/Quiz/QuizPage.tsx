import { useState } from 'react'
import {
  AlertCircle,
  Bot,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  XCircle,
} from 'lucide-react'
import { useNavigate, useParams } from 'react-router-dom'
import { Breadcrumb } from '@/components/ui/Breadcrumb'
import { Button } from '@/components/ui/Button'
import { PageErrorState } from '@/components/ui/PageErrorState'
import { Progress } from '@/components/ui/Progress'
import { Skeleton } from '@/components/ui/Skeleton'
import { useQuiz } from '@/hooks/useQuiz'
import type { QuizSubmissionAnswer } from '@/types/quiz'
import './QuizPage.css'

export function QuizPage() {
  const { quizId } = useParams<{ quizId: string }>()
  const navigate = useNavigate()
  const { quiz, isLoading, error, isSubmitting, submitAnswers, reload } = useQuiz(quizId)

  const [currentIndex, setCurrentIndex] = useState(0)
  const [selectedAnswers, setSelectedAnswers] = useState<Record<string, string>>({})
  const [checkedQuestions, setCheckedQuestions] = useState<Record<string, boolean>>({})

  if (isLoading) {
    return (
      <div className="quiz-page-root">
        <Skeleton variant="text" width={220} height={16} />
        <Skeleton variant="rect" width="100%" height={120} />
        <Skeleton variant="rect" width="100%" height={280} />
      </div>
    )
  }

  if (error || !quiz) {
    return (
      <div className="quiz-page-root">
        <Breadcrumb items={[{ label: 'Bài kiểm tra' }]} />
        <PageErrorState description={error || 'Không tìm thấy bài trắc nghiệm'} onRetry={reload} />
      </div>
    )
  }

  const currentQ = quiz.questions[currentIndex]
  const isLastQuestion = currentIndex === quiz.questions.length - 1
  const selectedOption = currentQ ? selectedAnswers[currentQ.id] : undefined
  const isChecked = currentQ ? !!checkedQuestions[currentQ.id] : false
  const isCorrect = isChecked && selectedOption === currentQ.correctOptionId

  const handleSelectOption = (optionId: string) => {
    if (isChecked) return // lock after check
    setSelectedAnswers((prev) => ({ ...prev, [currentQ.id]: optionId }))
  }

  const handleCheckAnswer = () => {
    if (!selectedOption) return
    setCheckedQuestions((prev) => ({ ...prev, [currentQ.id]: true }))
  }

  const handleNext = async () => {
    if (isLastQuestion) {
      // Build submission answers
      const submission: QuizSubmissionAnswer[] = quiz.questions.map((q) => ({
        questionId: q.id,
        selectedOptionId: selectedAnswers[q.id] || '',
      }))
      await submitAnswers(submission)
      navigate(`/quiz/${quiz.id}/result`)
    } else {
      setCurrentIndex((prev) => prev + 1)
    }
  }

  const handlePrevious = () => {
    if (currentIndex > 0) {
      setCurrentIndex((prev) => prev - 1)
    }
  }

  const handleAskAIAboutQuestion = () => {
    const promptText = `Giải thích chi tiết câu trắc nghiệm: "${currentQ.question}". Đáp án đúng là gì và vì sao?`
    navigate(`/ai-tutor?prompt=${encodeURIComponent(promptText)}&subject=${quiz.subjectId}`)
  }

  return (
    <div className="quiz-page-root">
      {/* Breadcrumb */}
      <Breadcrumb
        items={[
          quiz.courseId ? { label: 'Khóa học', to: `/courses/${quiz.courseId}` } : { label: 'Bài tập', to: '/exercises' },
          { label: quiz.title },
        ]}
      />

      {/* Quiz Top Header */}
      <header className="quiz-header-card">
        <div className="quiz-header-info">
          <span className="quiz-subject-badge">{quiz.subjectName}</span>
          <h1 className="quiz-main-title">{quiz.title}</h1>
        </div>

        <div className="quiz-progress-section">
          <div className="quiz-counter-text">
            <span>
              Câu {currentIndex + 1} / {quiz.totalQuestions}
            </span>
            <span className="answered-count">
              Đã làm: {Object.keys(checkedQuestions).length} câu
            </span>
          </div>
          <Progress
            value={((currentIndex + 1) / quiz.totalQuestions) * 100}
            height={6}
          />
        </div>
      </header>

      {/* Question Card */}
      <div className="quiz-question-card">
        <div className="question-prompt-header">
          <span className="question-number-badge">Câu {currentQ.number}</span>
          <p className="question-text">{currentQ.question}</p>
        </div>

        {/* Options List */}
        <div className="quiz-options-list" role="radiogroup" aria-label="Các phương án trả lời">
          {currentQ.options.map((option) => {
            const isSelected = selectedOption === option.id
            const isOptionCorrect = option.id === currentQ.correctOptionId

            let stateClass = ''
            if (isChecked) {
              if (isOptionCorrect) {
                stateClass = 'option-correct'
              } else if (isSelected && !isOptionCorrect) {
                stateClass = 'option-incorrect'
              } else {
                stateClass = 'option-disabled'
              }
            } else if (isSelected) {
              stateClass = 'option-selected'
            }

            return (
              <button
                key={option.id}
                type="button"
                role="radio"
                aria-checked={isSelected}
                disabled={isChecked}
                className={`quiz-option-item ${stateClass}`}
                onClick={() => handleSelectOption(option.id)}
              >
                <span className="option-label-circle">{option.label}</span>
                <span className="option-text">{option.text}</span>

                {isChecked && isOptionCorrect && (
                  <CheckCircle2 size={18} className="option-feedback-icon text-success" aria-label="Đáp án đúng" />
                )}
                {isChecked && isSelected && !isOptionCorrect && (
                  <XCircle size={18} className="option-feedback-icon text-danger" aria-label="Đáp án sai" />
                )}
              </button>
            )
          })}
        </div>

        {/* Explanation & Feedback Block (Visible after check) */}
        {isChecked && (
          <div className={`quiz-feedback-box ${isCorrect ? 'is-correct' : 'is-wrong'}`} role="status">
            <div className="feedback-header">
              {isCorrect ? (
                <>
                  <CheckCircle2 size={18} className="text-success" aria-hidden />
                  <span className="feedback-title text-success">Chính xác! Làm rất tốt.</span>
                </>
              ) : (
                <>
                  <AlertCircle size={18} className="text-danger" aria-hidden />
                  <span className="feedback-title text-danger">
                    Chưa chính xác. Đáp án đúng là:{' '}
                    <strong>
                      {currentQ.options.find((o) => o.id === currentQ.correctOptionId)?.label}
                    </strong>
                  </span>
                </>
              )}
            </div>

            <div className="feedback-explanation">
              <strong>Giải thích: </strong>
              {currentQ.explanation}
            </div>

            <div className="feedback-action-row">
              <Button
                variant="outline"
                size="sm"
                icon={Bot}
                onClick={handleAskAIAboutQuestion}
              >
                Hỏi AI giải thích thêm
              </Button>
            </div>
          </div>
        )}

        {/* Actions Row */}
        <div className="quiz-bottom-actions">
          <Button
            variant="outline"
            icon={ChevronLeft}
            disabled={currentIndex === 0}
            onClick={handlePrevious}
          >
            Câu trước
          </Button>

          <div className="quiz-center-action">
            {!isChecked ? (
              <Button
                variant="primary"
                disabled={!selectedOption}
                onClick={handleCheckAnswer}
              >
                Kiểm tra
              </Button>
            ) : (
              <Button
                variant="primary"
                disabled={isSubmitting}
                onClick={handleNext}
              >
                <span>{isLastQuestion ? 'Hoàn thành bài thi' : 'Câu tiếp theo'}</span>
                <ChevronRight size={16} aria-hidden />
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export default QuizPage

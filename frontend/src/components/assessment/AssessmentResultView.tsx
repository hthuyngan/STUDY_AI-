import { AlertCircle, Bot, CheckCircle2, RotateCcw, XCircle } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/Button'
import type { AssessmentQuestion, LearningAttempt } from '@/types/assessment'
import './AssessmentResultView.css'

export interface AssessmentResultViewProps {
  attempt: LearningAttempt
  questions: AssessmentQuestion[]
  passingScorePercent: number
  onClose: () => void
  onRetry: () => void
}

function formatDuration(ms: number): string {
  const totalSeconds = Math.round(ms / 1000)
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = totalSeconds % 60
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
}

export function AssessmentResultView({
  attempt,
  questions,
  passingScorePercent,
  onClose,
  onRetry,
}: AssessmentResultViewProps) {
  const navigate = useNavigate()
  const scorePercent = Math.round(attempt.scoreScaled * 100)
  const isPassed = attempt.successStatus === 'passed'

  const handleAskAIAboutQuestion = (q: AssessmentQuestion) => {
    const userResp = attempt.responses[q.id]
    const chosenOpt = q.options.find((o) => userResp?.selectedOptionIds?.includes(o.id))
    const correctOpt = q.options.find((o) => o.id === q.correctOptionId)
    const promptSummary = `Em làm sai câu hỏi: "${q.prompt}". Em đã chọn: "${chosenOpt?.label}. ${chosenOpt?.text}", nhưng đáp án đúng là "${correctOpt?.label}. ${correctOpt?.text}". Nhờ AI giải thích chi tiết giúp em phương pháp và bản chất câu hỏi này.`
    navigate(`/ai-tutor?prompt=${encodeURIComponent(promptSummary)}`)
  }

  return (
    <div className="assessment-result-view">
      {/* Top Banner / Summary */}
      <div className={`result-summary-card ${isPassed ? 'is-passed' : 'is-failed'}`}>
        <div className="summary-status-icon" aria-hidden>
          {isPassed ? <CheckCircle2 size={32} /> : <AlertCircle size={32} />}
        </div>
        <div className="summary-content">
          <h2 className="summary-title">
            {isPassed ? 'Hoàn thành bài tập thu hoạch!' : 'Bài tập đã được ghi nhận'}
          </h2>
          <p className="summary-description">
            {isPassed
              ? `Chúc mừng bạn đã đạt ${scorePercent}% điểm (tiêu chuẩn: ${passingScorePercent}%). Tiến độ bài học đã đạt 100%.`
              : `Bạn đạt ${scorePercent}% điểm (tiêu chuẩn: ${passingScorePercent}%). Bạn đã hoàn thành bài học, nhưng có thể làm lại để cải thiện điểm số.`}
          </p>

          <div className="summary-stats-grid">
            <div className="stat-box">
              <span className="stat-label">Điểm số</span>
              <span className="stat-val">
                {attempt.scoreRaw} / {attempt.scoreMax}
              </span>
            </div>
            <div className="stat-box">
              <span className="stat-label">Tỷ lệ chính xác</span>
              <span className="stat-val">{scorePercent}%</span>
            </div>
            <div className="stat-box">
              <span className="stat-label">Thời gian làm</span>
              <span className="stat-val">{formatDuration(attempt.sessionTimeMs)}</span>
            </div>
            <div className="stat-box">
              <span className="stat-label">Lần làm thứ</span>
              <span className="stat-val">{attempt.attemptNumber}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Questions Detailed Review */}
      <div className="result-questions-section">
        <h3 className="review-section-title">Chi tiết lời giải từng câu</h3>

        <div className="review-questions-list">
          {questions.map((q, idx) => {
            const resp = attempt.responses[q.id]
            const isCorrect = resp?.isCorrect ?? resp?.selectedOptionIds?.includes(q.correctOptionId)
            const selectedOptId = resp?.selectedOptionIds?.[0]

            return (
              <div
                key={q.id}
                className={`review-question-card ${isCorrect ? 'is-correct' : 'is-incorrect'}`}
              >
                <div className="review-card-header">
                  <div className="review-header-left">
                    <span className="review-question-num">Câu {idx + 1}</span>
                    {q.topic && <span className="review-question-topic">{q.topic}</span>}
                  </div>
                  <div className="review-header-right">
                    {isCorrect ? (
                      <span className="answer-status-pill correct">
                        <CheckCircle2 size={14} aria-hidden /> Đúng
                      </span>
                    ) : (
                      <span className="answer-status-pill incorrect">
                        <XCircle size={14} aria-hidden /> Sai
                      </span>
                    )}
                  </div>
                </div>

                <p className="review-prompt">{q.prompt}</p>

                {/* Options representation */}
                <div className="review-options-list">
                  {q.options.map((opt) => {
                    const isSelectedByUser = opt.id === selectedOptId
                    const isCorrectOption = opt.id === q.correctOptionId

                    let optClass = 'neutral'
                    if (isCorrectOption) optClass = 'correct-choice'
                    else if (isSelectedByUser && !isCorrectOption) optClass = 'wrong-choice'

                    return (
                      <div key={opt.id} className={`review-option-item ${optClass}`}>
                        <span className="option-label-circle">{opt.label}</span>
                        <span className="option-text">{opt.text}</span>
                        {isCorrectOption && (
                          <span className="option-tag-correct">Đáp án đúng</span>
                        )}
                        {isSelectedByUser && !isCorrectOption && (
                          <span className="option-tag-wrong">Bạn đã chọn</span>
                        )}
                      </div>
                    )
                  })}
                </div>

                {/* Explanation */}
                {q.explanation && (
                  <div className="review-explanation-box">
                    <strong>Giải thích chi tiết:</strong>
                    <p>{q.explanation}</p>
                  </div>
                )}

                {/* Ask AI about wrong answer button */}
                {!isCorrect && (
                  <div className="review-action-row">
                    <Button
                      variant="outline"
                      size="sm"
                      icon={Bot}
                      onClick={() => handleAskAIAboutQuestion(q)}
                    >
                      Hỏi AI về câu sai này
                    </Button>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>

      {/* Result Actions */}
      <div className="result-view-footer">
        <Button variant="outline" onClick={onClose}>
          Đóng & Quay lại bài học
        </Button>
        <Button variant="primary" icon={RotateCcw} onClick={onRetry}>
          Làm lại bài tập
        </Button>
      </div>
    </div>
  )
}

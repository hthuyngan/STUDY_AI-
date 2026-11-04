import { AlertCircle, Bot, CheckCircle2, RotateCcw, XCircle } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/Button'
import { learningContextService } from '@/services/learningContext.service'
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

    learningContextService.setContext({
      source: 'assessment-question',
      questionId: q.id,
      questionPrompt: q.prompt,
      selectedAnswer: chosenOpt ? `${chosenOpt.label}. ${chosenOpt.text}` : undefined,
      correctAnswer: correctOpt ? `${correctOpt.label}. ${correctOpt.text}` : undefined,
      explanation: q.explanation,
      lessonId: attempt.lessonId,
      title: q.topic || `Câu hỏi: ${q.prompt.slice(0, 32)}...`,
      excerpt: q.prompt,
      returnUrl: window.location.pathname,
    })

    navigate('/ai-tutor')
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
                      <span className="badge-correct">
                        <CheckCircle2 size={14} aria-hidden /> Chính xác
                      </span>
                    ) : (
                      <span className="badge-incorrect">
                        <XCircle size={14} aria-hidden /> Chưa đúng
                      </span>
                    )}
                  </div>
                </div>

                <p className="review-question-prompt">{q.prompt}</p>

                {/* Options List */}
                <div className="review-options-list">
                  {q.options.map((opt) => {
                    const isSelected = selectedOptId === opt.id
                    const isTheCorrectOpt = opt.id === q.correctOptionId
                    let optClass = 'review-option-item'

                    if (isTheCorrectOpt) optClass += ' is-correct-answer'
                    if (isSelected && !isTheCorrectOpt) optClass += ' is-user-wrong-answer'

                    return (
                      <div key={opt.id} className={optClass}>
                        <span className="option-label">{opt.label}.</span>
                        <span className="option-text">{opt.text}</span>
                        {isTheCorrectOpt && <span className="option-tag tag-correct">Đáp án đúng</span>}
                        {isSelected && !isTheCorrectOpt && (
                          <span className="option-tag tag-wrong">Bạn đã chọn</span>
                        )}
                      </div>
                    )
                  })}
                </div>

                {/* Explanation */}
                {q.explanation && (
                  <div className="review-explanation-box">
                    <span className="explanation-title">Giải thích:</span>
                    <p className="explanation-text">{q.explanation}</p>
                  </div>
                )}

                {/* AI Tutor Contextual Help Button */}
                {!isCorrect && (
                  <div className="review-ai-action-row">
                    <Button
                      variant="outline"
                      size="sm"
                      icon={Bot}
                      onClick={() => handleAskAIAboutQuestion(q)}
                      className="ask-ai-review-btn"
                    >
                      Nhờ AI giải thích chi tiết câu này
                    </Button>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>

      {/* Modal Bottom Footer Actions */}
      <div className="result-footer-actions">
        <Button variant="outline" icon={RotateCcw} onClick={onRetry}>
          Làm lại bài này
        </Button>
        <Button variant="primary" onClick={onClose}>
          Hoàn tất & Đóng
        </Button>
      </div>
    </div>
  )
}

import { useState } from 'react'
import {
  AlertCircle,
  Award,
  Check,
  Clock,
  HelpCircle,
  Play,
  RotateCcw,
} from 'lucide-react'
import { Button } from '@/components/ui/Button'
import type { LearningAttempt, LessonAssessment } from '@/types/assessment'
import './LessonAssessmentCard.css'

export interface LessonAssessmentCardProps {
  assessment?: LessonAssessment | null
  isCompleted: boolean
  hasUnfinishedAttempt: boolean
  activeAttempt?: LearningAttempt | null
  latestAttempt?: LearningAttempt | null
  onStartAttempt: () => void
  onViewResult?: () => void
  onRetryAttempt?: () => void
}

function formatSessionTime(ms: number): string {
  const totalSeconds = Math.round(ms / 1000)
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = totalSeconds % 60
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
}

export function LessonAssessmentCard({
  assessment,
  isCompleted,
  hasUnfinishedAttempt,
  activeAttempt,
  latestAttempt,
  onStartAttempt,
  onViewResult,
  onRetryAttempt,
}: LessonAssessmentCardProps) {
  const [showRestartConfirm, setShowRestartConfirm] = useState(false)

  // Fallback state if lesson has no assessment configured yet
  if (!assessment) {
    return (
      <section
        className="lesson-assessment-card is-pending"
        aria-labelledby="harvest-assessment-heading"
      >
        <div className="assessment-card-header">
          <div className="assessment-card-title-group">
            <div className="assessment-badge-icon" aria-hidden>
              <Award size={18} />
            </div>
            <div>
              <h2 id="harvest-assessment-heading" className="assessment-card-title">
                Bài tập thu hoạch
              </h2>
              <p className="assessment-card-subtitle">
                Bài tập thu hoạch đang được cập nhật cho bài học này.
              </p>
            </div>
          </div>
          <div className="assessment-completion-badge is-pending" aria-label="Tiến độ tối đa phần lý thuyết: 80%">
            <span>80%</span>
          </div>
        </div>
      </section>
    )
  }

  const questionCount = assessment.questions.length
  const estimatedMins = assessment.estimatedMinutes
  const unfinishedAnsweredCount = activeAttempt ? Object.keys(activeAttempt.responses).length : 0

  const handleConfirmRestart = () => {
    setShowRestartConfirm(false)
    onRetryAttempt?.()
  }

  return (
    <section
      className={`lesson-assessment-card ${isCompleted ? 'is-completed' : ''}`}
      aria-labelledby="harvest-assessment-heading"
    >
      <div className="assessment-card-header">
        <div className="assessment-card-title-group">
          <div className="assessment-badge-icon" aria-hidden>
            <Award size={18} />
          </div>
          <div>
            <h2 id="harvest-assessment-heading" className="assessment-card-title">
              Bài tập thu hoạch
            </h2>
            <p className="assessment-card-subtitle">
              {isCompleted
                ? 'Bạn đã hoàn thành bài tập thu hoạch của bài học này.'
                : hasUnfinishedAttempt
                  ? 'Bạn đang có một bài tập chưa hoàn thành.'
                  : 'Hoàn thành bài tập để kết thúc bài học và đạt 100% tiến độ.'}
            </p>
          </div>
        </div>

        {/* Right side badge */}
        <div
          className={`assessment-completion-badge ${
            isCompleted ? 'is-completed' : hasUnfinishedAttempt ? 'is-in-progress' : 'is-pending'
          }`}
          aria-label={
            isCompleted
              ? 'Tiến độ sau bài tập thu hoạch: 100% đã hoàn thành'
              : hasUnfinishedAttempt
                ? 'Đang làm dở bài tập thu hoạch'
                : 'Tiến độ hiện tại: 80%'
          }
        >
          {isCompleted ? (
            <>
              <Check size={14} className="badge-check-icon" aria-hidden />
              <span>100%</span>
            </>
          ) : hasUnfinishedAttempt ? (
            <span>Đang làm dở</span>
          ) : (
            <span>80%</span>
          )}
        </div>
      </div>

      {/* State 1: Chưa bắt đầu */}
      {!isCompleted && !hasUnfinishedAttempt && (
        <div className="assessment-card-meta-list">
          <span className="meta-item">
            <HelpCircle size={14} aria-hidden /> {questionCount} câu hỏi
          </span>
          <span className="meta-dot">·</span>
          <span className="meta-item">
            <Clock size={14} aria-hidden /> Khoảng {estimatedMins} phút
          </span>
          <span className="meta-dot">·</span>
          <span className="meta-item meta-note">
            Chưa bắt đầu
          </span>
        </div>
      )}

      {/* State 2: Đang làm dở */}
      {!isCompleted && hasUnfinishedAttempt && (
        <div className="assessment-previous-results unfinished-state">
          <div className="result-metric">
            <span className="metric-label">Trạng thái:</span>
            <span className="metric-badge is-in-progress">Đang làm dở</span>
          </div>
          <div className="result-metric">
            <span className="metric-label">Tiến độ:</span>
            <span className="metric-value">
              {unfinishedAnsweredCount} / {questionCount} câu
            </span>
          </div>
          <div className="result-metric">
            <span className="metric-label">Thời gian:</span>
            <span className="metric-value">
              {formatSessionTime(activeAttempt?.sessionTimeMs || 0)}
            </span>
          </div>
        </div>
      )}

      {/* State 3: Đã hoàn thành */}
      {isCompleted && latestAttempt && (
        <div className="assessment-previous-results">
          <div className="result-metric">
            <span className="metric-label">Trạng thái:</span>
            <span className="metric-badge is-passed">Đã hoàn thành</span>
          </div>
          <div className="result-metric">
            <span className="metric-label">Điểm số:</span>
            <span className="metric-value">
              {latestAttempt.scoreRaw} / {latestAttempt.scoreMax} ({Math.round(latestAttempt.scoreScaled * 100)}%)
            </span>
          </div>
          <div className="result-metric">
            <span className="metric-label">Thời gian:</span>
            <span className="metric-value">
              {formatSessionTime(latestAttempt.sessionTimeMs)}
            </span>
          </div>
          <div className="result-metric">
            <span className="metric-label">Lần làm:</span>
            <span className="metric-value">{latestAttempt.attemptNumber}</span>
          </div>
        </div>
      )}

      {/* Card Actions */}
      <div className="assessment-card-actions">
        {isCompleted ? (
          <>
            {onViewResult && (
              <Button
                variant="outline"
                onClick={onViewResult}
                className="view-result-btn"
              >
                Xem kết quả
              </Button>
            )}
            {onRetryAttempt && (
              <Button
                variant="primary"
                icon={RotateCcw}
                onClick={onRetryAttempt}
                className="retry-assessment-btn"
              >
                Làm lại
              </Button>
            )}
          </>
        ) : hasUnfinishedAttempt ? (
          <>
            <Button
              variant="primary"
              icon={Play}
              onClick={onStartAttempt}
              className="start-assessment-btn"
            >
              Tiếp tục bài tập
            </Button>
            {onRetryAttempt && (
              <Button
                variant="outline"
                icon={RotateCcw}
                onClick={() => setShowRestartConfirm(true)}
                className="restart-assessment-btn"
              >
                Bắt đầu lại
              </Button>
            )}
          </>
        ) : (
          <Button
            variant="primary"
            icon={Play}
            onClick={onStartAttempt}
            className="start-assessment-btn"
          >
            Bắt đầu làm bài
          </Button>
        )}
      </div>

      {/* Confirmation Dialog for restarting an unfinished attempt */}
      {showRestartConfirm && (
        <div className="modal-sub-dialog-backdrop" role="presentation">
          <div
            className="modal-sub-dialog"
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="restart-dialog-title"
          >
            <div className="sub-dialog-icon submit" aria-hidden>
              <AlertCircle size={24} />
            </div>
            <h3 id="restart-dialog-title" className="sub-dialog-title">
              Bắt đầu lại bài tập thu hoạch?
            </h3>
            <p className="sub-dialog-desc">
              Tiến độ và các câu trả lời của lần làm dở hiện tại sẽ được khởi tạo lại từ đầu.
            </p>
            <div className="sub-dialog-actions">
              <Button variant="outline" onClick={() => setShowRestartConfirm(false)}>
                Huỷ
              </Button>
              <Button variant="primary" icon={RotateCcw} onClick={handleConfirmRestart}>
                Xác nhận bắt đầu lại
              </Button>
            </div>
          </div>
        </div>
      )}
    </section>
  )
}

import { Award, Check, Clock, HelpCircle, Play, RotateCcw } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import type { LearningAttempt, LessonAssessment } from '@/types/assessment'
import './LessonAssessmentCard.css'

export interface LessonAssessmentCardProps {
  assessment: LessonAssessment
  isCompleted: boolean
  hasUnfinishedAttempt: boolean
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
  latestAttempt,
  onStartAttempt,
  onViewResult,
  onRetryAttempt,
}: LessonAssessmentCardProps) {
  const questionCount = assessment.questions.length
  const estimatedMins = assessment.estimatedMinutes

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
                : 'Hoàn thành bài tập để kết thúc bài học và đạt 100% tiến độ.'}
            </p>
          </div>
        </div>

        {/* Right side badge: 80% when incomplete, ✓ 100% when completed */}
        <div
          className={`assessment-completion-badge ${
            isCompleted ? 'is-completed' : 'is-pending'
          }`}
          aria-label={
            isCompleted
              ? 'Tiến độ sau bài tập thu hoạch: 100% đã hoàn thành'
              : 'Tiến độ hiện tại: 80%'
          }
        >
          {isCompleted ? (
            <>
              <Check size={14} className="badge-check-icon" aria-hidden />
              <span>100%</span>
            </>
          ) : (
            <span>80%</span>
          )}
        </div>
      </div>

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
          Kết quả được lưu vào tiến độ học tập.
        </span>
      </div>

      {/* Completion info if already completed */}
      {isCompleted && latestAttempt && (
        <div className="assessment-previous-results">
          <div className="result-metric">
            <span className="metric-label">Điểm số:</span>
            <span className="metric-value">
              {latestAttempt.scoreRaw}/{latestAttempt.scoreMax} ({Math.round(latestAttempt.scoreScaled * 100)}%)
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
          <div className="result-metric">
            <span className="metric-label">Kết quả:</span>
            <span
              className={`metric-badge ${
                latestAttempt.successStatus === 'passed' ? 'is-passed' : 'is-failed'
              }`}
            >
              {latestAttempt.successStatus === 'passed' ? 'Đạt' : 'Chưa đạt'}
            </span>
          </div>
        </div>
      )}

      {/* Unfinished notice */}
      {!isCompleted && hasUnfinishedAttempt && (
        <div className="assessment-unfinished-alert" role="status">
          <span>Bạn có một bài tập chưa hoàn thành. Bạn có thể tiếp tục làm từ câu đã dừng lại.</span>
        </div>
      )}

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
          <Button
            variant="primary"
            icon={Play}
            onClick={onStartAttempt}
            className="start-assessment-btn"
          >
            Tiếp tục bài tập
          </Button>
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
    </section>
  )
}

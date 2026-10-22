import './LessonProgressBar.css'

export interface LessonProgressBarProps {
  progressPercent: number
  className?: string
}

export function LessonProgressBar({
  progressPercent,
  className = '',
}: LessonProgressBarProps) {
  const clamped = Math.min(100, Math.max(0, Math.round(progressPercent)))

  return (
    <div
      className={`lesson-global-progress ${className}`}
      role="progressbar"
      aria-label="Tiến độ toàn bộ bài học"
      aria-valuenow={clamped}
      aria-valuemin={0}
      aria-valuemax={100}
    >
      <div className="lesson-global-progress-label">
        <span className="progress-title">Tiến độ bài học</span>
        <span className="progress-number">{clamped}%</span>
      </div>
      <div className="lesson-global-progress-track">
        <div
          className="lesson-global-progress-fill"
          style={{ width: `${clamped}%` }}
        />
      </div>
    </div>
  )
}

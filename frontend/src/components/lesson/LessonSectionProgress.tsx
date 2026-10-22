import { Check } from 'lucide-react'
import './LessonSectionProgress.css'

export interface LessonSectionProgressProps {
  progressPercent: number
  isCompleted: boolean
  className?: string
}

export function LessonSectionProgress({
  progressPercent,
  isCompleted,
  className = '',
}: LessonSectionProgressProps) {
  return (
    <span
      className={`lesson-section-badge ${isCompleted ? 'is-completed' : 'is-pending'} ${className}`}
      aria-label={`Tiến độ phần học: ${progressPercent}%, ${isCompleted ? 'đã hoàn thành' : 'chưa hoàn thành'}`}
    >
      {isCompleted ? (
        <>
          <Check size={13} className="badge-check-icon" aria-hidden />
          <span className="badge-percent">{progressPercent}%</span>
        </>
      ) : (
        <span className="badge-percent">{progressPercent}%</span>
      )}
    </span>
  )
}

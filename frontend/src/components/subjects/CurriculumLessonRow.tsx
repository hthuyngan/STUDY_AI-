import { CheckCircle2, ChevronRight, HelpCircle, Lock, Play } from 'lucide-react'
import { Link } from 'react-router-dom'
import type { SubjectLessonItem } from '@/types/subject'

export interface CurriculumLessonRowProps {
  lesson: SubjectLessonItem
  indexInChapter: number
  subjectId: string
}

export function CurriculumLessonRow({
  lesson,
  indexInChapter,
  subjectId,
}: CurriculumLessonRowProps) {
  const isLocked = lesson.status === 'locked'
  const isCompleted = lesson.status === 'completed'
  const isInProgress = lesson.status === 'in-progress'
  const lessonUrl = `/subjects/${subjectId}/lessons/${lesson.id}`
  const formattedIndex = String(indexInChapter + 1).padStart(2, '0')

  return (
    <div
      className={`curriculum-lesson-row ${isLocked ? 'is-locked' : ''} ${
        isInProgress ? 'is-in-progress' : ''
      }`}
    >
      {/* 1. Lesson Index Visual */}
      <div className="lesson-row-index-col" aria-hidden>
        <span className="lesson-index-circle">{formattedIndex}</span>
      </div>

      {/* 2. Status Icon */}
      <div className="lesson-row-status-col" aria-hidden>
        {isCompleted && <CheckCircle2 size={18} className="status-icon completed" />}
        {isInProgress && <Play size={14} className="status-icon in-progress" />}
        {lesson.status === 'available' && <div className="status-dot available" />}
        {isLocked && <Lock size={15} className="status-icon locked" />}
      </div>

      {/* 3. Lesson Main Info (Title & Metadata) */}
      <div className="lesson-row-info-col">
        {isLocked ? (
          <span className="lesson-row-title is-locked">{lesson.title}</span>
        ) : (
          <Link to={lessonUrl} className="lesson-row-title-link">
            {lesson.title}
          </Link>
        )}

        <div className="lesson-row-meta">
          <span className="lesson-meta-duration">{lesson.durationMinutes} phút</span>

          {lesson.quizId && (
            <span className="lesson-meta-quiz-badge">
              <HelpCircle size={12} aria-hidden /> Trắc nghiệm
            </span>
          )}

          {isInProgress && typeof lesson.progress === 'number' && (
            <span className="lesson-meta-progress-badge">
              Đã học {lesson.progress}%
            </span>
          )}
        </div>
      </div>

      {/* 4. Action CTA */}
      <div className="lesson-row-action-col">
        {isLocked ? (
          <span className="lesson-locked-label">Chưa mở</span>
        ) : isInProgress ? (
          <Link
            to={lessonUrl}
            className="lesson-cta-btn in-progress"
            aria-label={`Học tiếp: ${lesson.title}`}
          >
            <Play size={13} aria-hidden />
            <span>Học tiếp</span>
          </Link>
        ) : isCompleted ? (
          <Link
            to={lessonUrl}
            className="lesson-cta-link completed"
            aria-label={`Ôn lại: ${lesson.title}`}
          >
            <span>Ôn lại</span>
            <ChevronRight size={15} aria-hidden />
          </Link>
        ) : (
          <Link
            to={lessonUrl}
            className="lesson-cta-link available"
            aria-label={`Bắt đầu học: ${lesson.title}`}
          >
            <span>Bắt đầu</span>
            <ChevronRight size={15} aria-hidden />
          </Link>
        )}
      </div>
    </div>
  )
}

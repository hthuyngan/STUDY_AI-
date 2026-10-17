import { ArrowRight, BookOpen } from 'lucide-react'
import { Link } from 'react-router-dom'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Progress } from '@/components/ui/Progress'
import type { CurrentLessonData } from '@/types/dashboard'

interface PrimaryLearningCardProps {
  lesson: CurrentLessonData
  onContinue?: () => void
}

export function PrimaryLearningCard({ lesson, onContinue }: PrimaryLearningCardProps) {
  return (
    <section className="primary-learning-card" aria-labelledby="primary-learning-heading">
      <div className="primary-learning-content">
        <div className="primary-learning-meta-header">
          <span id="primary-learning-heading" className="primary-learning-tag">
            TIẾP TỤC HỌC
          </span>
          <Badge variant="primary" size="sm">
            {lesson.subject}
          </Badge>
        </div>

        <div className="primary-learning-body">
          <h2 className="primary-lesson-title" title={lesson.title}>
            {lesson.title}
          </h2>
          <p className="primary-lesson-progress-text">
            Bạn đã hoàn thành <strong className="font-semibold text-text">{lesson.progress}%</strong> bài học
          </p>

          <div className="primary-lesson-progress-bar">
            <Progress value={lesson.progress} height={8} />
          </div>
        </div>

        <div className="primary-learning-footer">
          <Link to={lesson.url || '/courses'} className="primary-learning-cta-link">
            <Button
              variant="primary"
              icon={ArrowRight}
              onClick={onContinue}
              className="primary-learning-btn"
            >
              Tiếp tục bài học
            </Button>
          </Link>
        </div>
      </div>

      {/* Abstract geometric learning visual decoration (no cartoon mascot) */}
      <div className="primary-learning-graphic" aria-hidden="true">
        <svg
          viewBox="0 0 200 160"
          className="primary-learning-svg"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <circle cx="150" cy="80" r="60" className="svg-circle-bg" />
          <path
            d="M50 110C80 50 120 130 160 70"
            stroke="currentColor"
            strokeWidth="3.5"
            strokeLinecap="round"
            className="svg-curve-primary"
          />
          <circle cx="95" cy="85" r="5" className="svg-dot" />
          <circle cx="160" cy="70" r="5" className="svg-dot" />
        </svg>
        <div className="primary-learning-badge-chip">
          <BookOpen size={16} />
        </div>
      </div>
    </section>
  )
}

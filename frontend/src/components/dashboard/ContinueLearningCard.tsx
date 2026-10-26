import { ArrowRight, Play } from 'lucide-react'
import { Link } from 'react-router-dom'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { Progress } from '@/components/ui/Progress'
import type { ContinueLessonItem } from '@/types/dashboard'

export interface ContinueLearningCardProps {
  lessons: ContinueLessonItem[]
  onContinueLesson?: (lessonId: string) => void
}

export function ContinueLearningCard({
  lessons,
  onContinueLesson,
}: ContinueLearningCardProps) {
  const viewAllAction = (
    <Link to="/subjects" className="card-link-action">
      <span>Xem tất cả</span>
      <ArrowRight size={14} aria-hidden />
    </Link>
  )

  return (
    <Card
      title="Tiếp tục học"
      subtitle="Bài học gần nhất đang dang dở"
      action={viewAllAction}
      isFlushList
      className="continue-learning-card"
    >
      {lessons.length === 0 ? (
        <div className="continue-learning-empty" style={{ padding: '36px 20px', textAlign: 'center' }}>
          <p style={{ margin: '0 0 16px', color: 'var(--text-secondary, #627D98)', fontSize: '0.9375rem' }}>
            Bạn chưa bắt đầu bài học nào.
          </p>
          <Link to="/subjects" style={{ textDecoration: 'none', display: 'inline-block' }}>
            <Button variant="primary" icon={ArrowRight}>
              Khám phá môn học
            </Button>
          </Link>
        </div>
      ) : (
        <div className="continue-learning-list">
          {lessons.map((lesson) => {
            return (
              <div key={lesson.id} className="continue-lesson-row">
                {/* Subject icon badge */}
                <div
                  className="lesson-subject-badge"
                  style={{
                    backgroundColor: lesson.subjectBg,
                    color: lesson.subjectColor,
                  }}
                  aria-hidden
                >
                  <span>{lesson.subjectIcon}</span>
                </div>

                {/* Lesson main details */}
                <div className="lesson-details">
                  <div className="lesson-meta-top">
                    <span className="lesson-subject-name">{lesson.subjectName}</span>
                    <span className="lesson-dot" aria-hidden>·</span>
                    <span className="lesson-chapter">{lesson.chapter}</span>
                  </div>
                  <h3 className="lesson-title">{lesson.lessonTitle}</h3>

                  {/* Progress bar */}
                  <div className="lesson-progress-row">
                    <Progress value={lesson.progress} height={6} />
                    <span className="lesson-progress-percent">{lesson.progress}%</span>
                  </div>
                </div>

                {/* Action */}
                <div className="lesson-action">
                  <Button
                    variant={lesson.isPrimary ? 'primary' : 'outline'}
                    icon={Play}
                    onClick={() => onContinueLesson?.(lesson.id)}
                    className="lesson-continue-btn"
                  >
                    Tiếp tục
                  </Button>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </Card>
  )
}

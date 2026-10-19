import { ArrowRight, Play } from 'lucide-react'
import { Link } from 'react-router-dom'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { Progress } from '@/components/ui/Progress'
import { StickerIllustration } from '@/components/ui/StickerIllustration'
import type { ContinueLessonItem } from '@/types/dashboard'

export interface ContinueLearningCardProps {
  lessons: ContinueLessonItem[]
  onContinueLesson?: (lessonId: string) => void
}

export function ContinueLearningCard({
  lessons,
  onContinueLesson,
}: ContinueLearningCardProps) {
  const primaryLesson = lessons[0]
  const secondaryLessons = lessons.slice(1, 3)

  const cardAction = (
    <div className="card-header-action-wrap">
      <Link to="/courses" className="card-link-action">
        <span>Xem tất cả</span>
        <ArrowRight size={14} aria-hidden="true" />
      </Link>
      <StickerIllustration name="study" size="sm" decorative className="header-sticker" />
    </div>
  )

  return (
    <Card
      title="Bài học gợi ý"
      subtitle="Tiếp tục bài học gần nhất đang dang dở"
      action={cardAction}
      className="suggested-learning-card"
    >
      {primaryLesson ? (
        <div className="primary-focus-widget">
          <div className="focus-header-meta">
            <span className="focus-subject-tag">{primaryLesson.subjectName}</span>
            <span className="focus-chapter-text">{primaryLesson.chapter}</span>
          </div>

          <h3 className="focus-lesson-title">{primaryLesson.lessonTitle}</h3>

          <div className="focus-progress-wrapper">
            <div className="focus-progress-labels">
              <span className="focus-progress-count">
                {Math.round((primaryLesson.progress / 100) * 12)} / 12 bài hoàn thành
              </span>
              <span className="focus-progress-percent">{primaryLesson.progress}%</span>
            </div>
            {/* Long progress bar */}
            <Progress value={primaryLesson.progress} height={9} />
          </div>

          <div className="focus-action-row">
            <Button
              variant="primary"
              icon={Play}
              onClick={() => onContinueLesson?.(primaryLesson.id)}
              className="focus-continue-btn"
            >
              Tiếp tục bài học
            </Button>
          </div>
        </div>
      ) : (
        <p className="suggested-empty-text">Chưa có bài học nào đang dở dang.</p>
      )}

      {secondaryLessons.length > 0 && (
        <div className="secondary-suggested-list">
          {secondaryLessons.map((lesson) => (
            <div key={lesson.id} className="secondary-lesson-row">
              <div className="secondary-lesson-info">
                <span className="secondary-subject">{lesson.subjectName}</span>
                <span className="secondary-title">{lesson.lessonTitle}</span>
              </div>
              <div className="secondary-lesson-meta">
                <span className="secondary-percent">{lesson.progress}%</span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onContinueLesson?.(lesson.id)}
                >
                  Học
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </Card>
  )
}

export default ContinueLearningCard

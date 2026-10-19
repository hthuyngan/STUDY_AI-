import { ArrowRight } from 'lucide-react'
import { Link } from 'react-router-dom'
import { Card } from '@/components/ui/Card'
import { StickerIllustration } from '@/components/ui/StickerIllustration'
import type { SubjectProgressItemData } from '@/types/dashboard'

export interface LearningProgressOverviewProps {
  subjects: SubjectProgressItemData[]
}

// Subject color mapping adhering to quiet, muted, non-neon guidelines
const SUBJECT_ACCENT_STYLES: Record<
  string,
  { barColor: string; trackBg: string }
> = {
  math: {
    barColor: 'var(--navy-primary, #102A43)',
    trackBg: 'rgba(16, 42, 67, 0.08)',
  },
  physics: {
    barColor: '#D97706', // warm amber/gold
    trackBg: 'rgba(217, 119, 6, 0.1)',
  },
  chemistry: {
    barColor: '#0D9488', // muted teal
    trackBg: 'rgba(13, 148, 136, 0.1)',
  },
  english: {
    barColor: '#2563EB', // muted blue
    trackBg: 'rgba(37, 99, 235, 0.1)',
  },
}

export function LearningProgressOverview({
  subjects,
}: LearningProgressOverviewProps) {
  const headerAction = (
    <StickerIllustration
      name="progress"
      size="sm"
      decorative
      className="progress-overview-sticker"
    />
  )

  return (
    <Card
      title="Tiến độ học tập"
      subtitle="Tiếp tục duy trì nhịp học đều mỗi ngày."
      action={headerAction}
      className="learning-progress-overview-card"
    >
      <div className="progress-bars-container">
        {subjects.map((sub) => {
          const accent = SUBJECT_ACCENT_STYLES[sub.id] || {
            barColor: 'var(--navy-primary, #102A43)',
            trackBg: 'rgba(16, 42, 67, 0.08)',
          }

          return (
            <div key={sub.id} className="subject-progress-row-block">
              {/* Top metadata line */}
              <div className="progress-row-header">
                <span className="progress-subject-name">{sub.name}</span>
                <span className="progress-percent-value">{sub.progress}%</span>
              </div>

              <div className="progress-subtext-line">
                <span className="progress-lesson-count">
                  {sub.completedLessons} / {sub.totalLessons} bài hoàn thành
                </span>
              </div>

              {/* Long full-width progress bar */}
              <div
                className="full-width-progress-track"
                style={{ backgroundColor: accent.trackBg }}
                role="progressbar"
                aria-valuenow={sub.progress}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-label={`Tiến độ môn ${sub.name}: ${sub.progress}%`}
              >
                <div
                  className="full-width-progress-fill"
                  style={{
                    width: `${Math.min(Math.max(sub.progress, 0), 100)}%`,
                    backgroundColor: accent.barColor,
                  }}
                />
              </div>
            </div>
          )
        })}
      </div>

      <div className="progress-card-bottom-link">
        <Link to="/subjects" className="card-link-action">
          <span>Xem chi tiết môn học</span>
          <ArrowRight size={14} aria-hidden="true" />
        </Link>
      </div>
    </Card>
  )
}

export default LearningProgressOverview

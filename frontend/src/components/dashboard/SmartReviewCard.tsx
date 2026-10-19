import { ArrowRight, BookOpen } from 'lucide-react'
import { Link, useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { StickerIllustration } from '@/components/ui/StickerIllustration'
import type { SmartReviewItem } from '@/types/dashboard'

export interface SmartReviewCardProps {
  items?: SmartReviewItem[]
}

const DEFAULT_REVIEWS: SmartReviewItem[] = [
  {
    id: 'sr-1',
    title: 'Tiệm cận của đồ thị hàm số',
    subject: 'Toán',
    note: 'Cần ôn lại theo chu kỳ lặp lại ngắt quãng',
    actionLabel: 'Ôn ngay',
    actionUrl: '/learn/math-12/lesson-math-04',
  },
  {
    id: 'sr-2',
    title: 'Dao động điều hòa & con lắc lò xo',
    subject: 'Vật lý',
    note: '3 câu sai trong bài kiểm tra gần nhất',
    actionLabel: 'Làm 5 câu',
    actionUrl: '/quiz/physics-quiz-01',
  },
  {
    id: 'sr-3',
    title: 'Vocabulary · Environment & Education',
    subject: 'Tiếng Anh',
    note: 'Đến hạn ôn tập 15 từ vựng trọng tâm',
    actionLabel: 'Ôn từ vựng',
    actionUrl: '/learn/eng-12/lesson-eng-03',
  },
]

export function SmartReviewCard({ items = DEFAULT_REVIEWS }: SmartReviewCardProps) {
  const navigate = useNavigate()

  const headerAction = (
    <div className="card-header-action-wrap">
      <Link to="/exercises" className="card-link-action">
        <span>Ngân hàng bài tập</span>
        <ArrowRight size={14} aria-hidden="true" />
      </Link>
      <StickerIllustration name="review" size="sm" decorative className="header-sticker" />
    </div>
  )

  return (
    <Card
      title="Ôn tập thông minh"
      subtitle="Đề xuất dựa trên tiến độ và các phần kiến thức cần củng cố"
      action={headerAction}
      className="smart-review-card"
    >
      <div className="smart-review-list">
        {items.slice(0, 3).map((item, index) => {
          return (
            <div key={item.id} className="smart-review-row">
              <div className="review-index-badge" aria-hidden="true">
                <span>{index + 1}</span>
              </div>

              <div className="review-info-body">
                <div className="review-meta-line">
                  <span className="review-subject-tag">{item.subject}</span>
                  <span className="review-dot" aria-hidden="true">·</span>
                  <span className="review-note-text">{item.note}</span>
                </div>
                <h4 className="review-item-title">{item.title}</h4>
              </div>

              <div className="review-action-wrap">
                <Button
                  variant="outline"
                  size="sm"
                  icon={BookOpen}
                  onClick={() => navigate(item.actionUrl)}
                  className="review-cta-btn"
                >
                  {item.actionLabel}
                </Button>
              </div>
            </div>
          )
        })}
      </div>
    </Card>
  )
}

export default SmartReviewCard

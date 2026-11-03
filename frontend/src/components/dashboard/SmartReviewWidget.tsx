import { AlertTriangle, ArrowRight, Sparkles } from 'lucide-react'
import { Link, useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { useSmartReview } from '@/hooks/useSmartReview'
import './SmartReviewWidget.css'

export function SmartReviewWidget() {
  const navigate = useNavigate()
  const { dueItems } = useSmartReview()

  // If no items are due today or overdue, hide or show a gentle checkmark
  if (dueItems.length === 0) {
    return null
  }

  const previewItems = dueItems.slice(0, 3)

  return (
    <Card
      title="Cần ôn hôm nay"
      subtitle={`Lặp lại ngắt quãng · ${dueItems.length} mục đến hạn`}
      action={
        <Link to="/review" className="card-link-action">
          <span>Xem tất cả</span>
          <ArrowRight size={14} aria-hidden />
        </Link>
      }
      isFlushList
      className="smart-review-widget"
    >
      <div className="review-widget-content">
        <div className="review-widget-list">
          {previewItems.map((item) => (
            <div key={item.id} className="review-widget-row">
              <div className="widget-row-left">
                <div className="widget-badge-row">
                  <span className="widget-subject-tag">{item.subjectName}</span>
                  {item.status === 'overdue' && (
                    <span className="widget-status-badge overdue">
                      <AlertTriangle size={11} aria-hidden /> Quá hạn
                    </span>
                  )}
                  {item.status === 'due' && (
                    <span className="widget-status-badge due">Hôm nay</span>
                  )}
                </div>
                <h4 className="widget-item-title">{item.title}</h4>
              </div>

              <div className="widget-row-right">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => navigate(`/review?gapId=${encodeURIComponent(item.gapId)}`)}
                >
                  Ôn ngay
                </Button>
              </div>
            </div>
          ))}
        </div>

        <div className="review-widget-footer">
          <Button
            variant="primary"
            fullWidth
            icon={Sparkles}
            onClick={() => navigate('/review')}
          >
            Bắt đầu phiên ôn ({dueItems.length} mục)
          </Button>
        </div>
      </div>
    </Card>
  )
}

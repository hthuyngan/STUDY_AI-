import { Clock, ChevronRight, Sparkles, BookOpen } from 'lucide-react'
import { Link } from 'react-router-dom'
import { Badge } from '@/components/ui/Badge'
import type { RecommendedLesson } from '@/types/dashboard'

interface RecommendedSectionProps {
  recommendations: RecommendedLesson[]
}

export function RecommendedSection({ recommendations }: RecommendedSectionProps) {
  return (
    <section className="recommended-section-root" aria-labelledby="recommended-heading">
      <div className="section-header-row">
        <h2 id="recommended-heading" className="section-heading-title">
          Đề xuất cho bạn
        </h2>
        <Link to="/courses" className="section-see-all-link">
          <span>Xem tất cả</span>
          <ChevronRight size={14} aria-hidden />
        </Link>
      </div>

      <div className="recommended-grid" role="list">
        {recommendations.map((item) => {
          const isAI = item.category === 'ai-practice'
          return (
            <Link
              key={item.id}
              to={item.url}
              className={`recommendation-card-item ${isAI ? 'is-ai-tile' : ''}`}
              role="listitem"
            >
              <div className="recommendation-thumbnail-zone" aria-hidden="true">
                {isAI ? (
                  <div className="ai-thumbnail-badge">
                    <Sparkles size={18} className="text-primary" />
                    <span className="font-medium text-xs text-primary">✦ Trợ lý AI</span>
                  </div>
                ) : (
                  <div className="lesson-thumbnail-badge">
                    <BookOpen size={16} className="text-secondary" />
                    <span className="text-xs text-secondary font-medium">{item.subject}</span>
                  </div>
                )}
                {item.tag && (
                  <Badge variant="primary" size="sm" className="recommendation-tag">
                    {item.tag}
                  </Badge>
                )}
              </div>

              <div className="recommendation-body">
                <h3 className="recommendation-title" title={item.title}>
                  {item.title}
                </h3>
                <div className="recommendation-meta-row">
                  <span className="recommendation-subject">{item.subject}</span>
                  <span className="recommendation-meta-divider" aria-hidden="true">·</span>
                  <div className="recommendation-duration">
                    <Clock size={12} aria-hidden />
                    <span>{item.duration}</span>
                  </div>
                </div>
              </div>
            </Link>
          )
        })}
      </div>
    </section>
  )
}

import { ArrowRight, Bot, Check, Trophy, Zap } from 'lucide-react'
import { Link } from 'react-router-dom'
import { Card } from '@/components/ui/Card'
import { StickerIllustration } from '@/components/ui/StickerIllustration'
import type { RecentActivityItem } from '@/types/dashboard'

export interface RecentActivityCardProps {
  activities?: RecentActivityItem[]
}

// Fallback formatted activities if none passed
const DEFAULT_ACTIVITIES: Array<{
  id: string
  type: 'complete' | 'xp' | 'ai' | 'achievement'
  title: string
  subtitle: string
  timeAgo: string
  url?: string
}> = [
  {
    id: 'act-1',
    type: 'complete',
    title: 'Bạn hoàn thành bài học',
    subtitle: 'Khảo sát hàm số & sự biến thiên đồ thị',
    timeAgo: '2 giờ trước',
    url: '/courses/math-12/lesson-math-08',
  },
  {
    id: 'act-2',
    type: 'xp',
    title: 'Bạn nhận được +80 XP',
    subtitle: 'Quiz trắc nghiệm · Dao động cơ',
    timeAgo: '5 giờ trước',
    url: '/quiz/physics-quiz-01',
  },
  {
    id: 'act-3',
    type: 'ai',
    title: 'Bạn hỏi AI Tutor',
    subtitle: '"Vì sao f\'(x) = 0 chưa chắc là điểm cực trị?"',
    timeAgo: 'Hôm qua',
    url: '/ai-tutor?prompt=vi-sao-dao-ham-bang-0-chua-chac-la-cuc-tri',
  },
  {
    id: 'act-4',
    type: 'achievement',
    title: 'Bạn đạt huy hiệu thành tích',
    subtitle: 'Học liên tục 7 ngày trong tuần',
    timeAgo: '2 ngày trước',
    url: '/achievements',
  },
]

export function RecentActivityCard({ activities }: RecentActivityCardProps) {
  // Map passed activities if available or use standard formatted set
  const displayItems = activities && activities.length >= 4
    ? activities.slice(0, 4).map((a, i) => {
        const types: Array<'complete' | 'xp' | 'ai' | 'achievement'> = [
          'complete',
          'xp',
          'ai',
          'achievement',
        ]
        return {
          id: a.id,
          type: types[i % 4],
          title: `Bạn ${a.action}`,
          subtitle: a.targetName,
          timeAgo: a.timeAgo,
          url: a.targetUrl,
        }
      })
    : DEFAULT_ACTIVITIES

  const renderActivityIcon = (type: string) => {
    switch (type) {
      case 'complete':
        return (
          <div className="activity-icon-box type-complete" aria-hidden="true">
            <Check size={18} />
          </div>
        )
      case 'xp':
        return (
          <div className="activity-icon-box type-xp" aria-hidden="true">
            <Zap size={18} />
          </div>
        )
      case 'ai':
        return (
          <div className="activity-icon-box type-ai" aria-hidden="true">
            <Bot size={18} />
          </div>
        )
      case 'achievement':
      default:
        return (
          <div className="activity-icon-box type-achievement" aria-hidden="true">
            <Trophy size={18} />
          </div>
        )
    }
  }

  const headerAction = (
    <StickerIllustration
      name="achievement"
      size="sm"
      decorative
      className="recent-activity-sticker"
    />
  )

  return (
    <Card
      title="Hoạt động gần đây"
      subtitle="Nhật ký các thao tác và tiến trình học mới nhất"
      action={headerAction}
      className="recent-activity-feed-card"
    >
      <div className="activity-feed-list" role="feed" aria-label="Danh sách hoạt động gần đây">
        {displayItems.map((item) => {
          const content = (
            <div className="activity-feed-row" key={item.id}>
              {/* 40px icon container */}
              {renderActivityIcon(item.type)}

              {/* Text content */}
              <div className="activity-feed-content">
                <div className="activity-feed-title-line">
                  <span className="activity-main-action">{item.title}</span>
                  <span className="activity-timestamp">{item.timeAgo}</span>
                </div>
                <p className="activity-feed-subtext">{item.subtitle}</p>
              </div>
            </div>
          )

          if (item.url) {
            return (
              <Link
                key={item.id}
                to={item.url}
                className="activity-feed-link-wrapper"
              >
                {content}
              </Link>
            )
          }

          return <div key={item.id}>{content}</div>
        })}
      </div>

      <div className="activity-card-bottom-link">
        <Link to="/achievements" className="card-link-action">
          <span>Xem tất cả hoạt động</span>
          <ArrowRight size={14} aria-hidden="true" />
        </Link>
      </div>
    </Card>
  )
}

export default RecentActivityCard

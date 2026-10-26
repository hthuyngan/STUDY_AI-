import { ArrowRight } from 'lucide-react'
import { Link } from 'react-router-dom'
import { Avatar } from '@/components/ui/Avatar'
import { Card } from '@/components/ui/Card'
import type { RecentActivityItem } from '@/types/dashboard'

export interface RecentActivityCardProps {
  activities: RecentActivityItem[]
}

export function RecentActivityCard({ activities }: RecentActivityCardProps) {
  const viewAllAction = (
    <Link to="/activities" className="card-link-action">
      <span>Xem tất cả</span>
      <ArrowRight size={14} aria-hidden />
    </Link>
  )

  return (
    <Card
      title="Hoạt động gần đây"
      subtitle="Nhật ký học tập và tương tác mới nhất"
      action={viewAllAction}
      isFlushList
      className="recent-activity-card"
    >
      {activities.length === 0 ? (
        <div className="recent-activity-empty" style={{ padding: '36px 20px', textAlign: 'center' }}>
          <p style={{ margin: 0, color: 'var(--text-secondary, #627D98)', fontSize: '0.9375rem' }}>
            Hoạt động học tập của bạn sẽ xuất hiện ở đây.
          </p>
        </div>
      ) : (
        <div className="recent-activity-list">
          {activities.slice(0, 5).map((act) => {
            return (
              <div key={act.id} className="recent-activity-row">
                <Avatar
                  src={act.userAvatar}
                  alt={act.userName}
                  size="sm"
                  className="activity-avatar"
                />

                <div className="activity-body">
                  <p className="activity-sentence">
                    <span className="activity-user">{act.userName}</span>{' '}
                    <span className="activity-action">{act.action}</span>{' '}
                    {act.targetUrl ? (
                      <Link to={act.targetUrl} className="activity-target-link">
                        {act.targetName}
                      </Link>
                    ) : (
                      <span className="activity-target">{act.targetName}</span>
                    )}
                  </p>

                  <div className="activity-meta">
                    <span className="activity-tag">{act.subjectOrModule}</span>
                    <span className="activity-dot" aria-hidden>·</span>
                    <span className="activity-time">{act.timeAgo}</span>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </Card>
  )
}

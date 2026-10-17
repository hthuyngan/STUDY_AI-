import { Trophy } from 'lucide-react'
import { Link } from 'react-router-dom'
import { Avatar } from '@/components/ui/Avatar'
import { Card } from '@/components/ui/Card'
import type { LeaderboardUser } from '@/types/dashboard'

export interface LeaderboardCardProps {
  entries: LeaderboardUser[]
}

export function LeaderboardCard({ entries }: LeaderboardCardProps) {
  const getRankBadge = (rank: number) => {
    switch (rank) {
      case 1:
        return <span className="rank-medal gold" title="Hạng 1">🥇</span>
      case 2:
        return <span className="rank-medal silver" title="Hạng 2">🥈</span>
      case 3:
        return <span className="rank-medal bronze" title="Hạng 3">🥉</span>
      default:
        return <span className="rank-number">{rank}</span>
    }
  }

  const footerAction = (
    <Link to="/leaderboard" className="card-footer-link">
      <Trophy size={14} aria-hidden />
      <span>Xem toàn bộ bảng xếp hạng</span>
    </Link>
  )

  return (
    <Card
      title="Bảng xếp hạng"
      subtitle="Top học sinh tích cực tuần này"
      footer={footerAction}
      isFlushList
      className="leaderboard-card"
    >
      <div className="leaderboard-list">
        {entries.map((entry) => {
          return (
            <div
              key={entry.id}
              className={`leaderboard-row ${entry.isCurrentUser ? 'current-user' : ''}`}
            >
              <div className="rank-badge-box">
                {getRankBadge(entry.rank)}
              </div>

              <Avatar
                src={entry.avatar}
                alt={entry.name}
                size="sm"
                className="leaderboard-avatar"
              />

              <div className="leaderboard-name-box">
                <span className="leaderboard-user-name">
                  {entry.name}
                </span>
              </div>

              <div className="leaderboard-xp-box">
                <span className="leaderboard-xp-value">
                  {entry.xp.toLocaleString('vi-VN')}
                </span>
                <span className="leaderboard-xp-unit">XP</span>
              </div>
            </div>
          )
        })}
      </div>
    </Card>
  )
}

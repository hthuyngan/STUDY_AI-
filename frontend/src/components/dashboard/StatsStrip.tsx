import { CheckCircle2, Clock, Flame, Zap } from 'lucide-react'
import type { DashboardStats } from '@/types/dashboard'

export interface StatsStripProps {
  stats: DashboardStats
}

export function StatsStrip({ stats }: StatsStripProps) {
  const statItems = [
    {
      id: 'streak',
      icon: Flame,
      value: `${stats.streakDays} ngày`,
      label: 'Streak học tập',
      subtext: `Kỷ lục: ${stats.longestStreak} ngày`,
      iconClassName: 'stat-icon-flame',
    },
    {
      id: 'xp',
      icon: Zap,
      value: `${stats.totalXP.toLocaleString('vi-VN')} XP`,
      label: 'Tổng kinh nghiệm',
      subtext: '+240 XP tuần này',
      iconClassName: 'stat-icon-zap',
    },
    {
      id: 'study-time',
      icon: Clock,
      value: `${(stats.weeklyMinutes / 60).toFixed(1)} giờ`,
      label: 'Thời gian tuần này',
      subtext: 'Mục tiêu: 10 giờ',
      iconClassName: 'stat-icon-clock',
    },
    {
      id: 'completed',
      icon: CheckCircle2,
      value: `${stats.completedLessonsCount} bài`,
      label: 'Bài hoàn thành',
      subtext: 'Đạt 85% mục tiêu tháng',
      iconClassName: 'stat-icon-check',
    },
  ]

  return (
    <section className="stats-strip-container" aria-label="Thống kê học tập nhanh">
      <div className="stats-strip-grid">
        {statItems.map((item, index) => {
          const Icon = item.icon
          return (
            <div key={item.id} className="stats-strip-item">
              <div className="stats-strip-icon-box">
                <Icon size={20} className={item.iconClassName} aria-hidden />
              </div>
              <div className="stats-strip-content">
                <div className="stats-strip-value">{item.value}</div>
                <div className="stats-strip-label">{item.label}</div>
                <div className="stats-strip-subtext">{item.subtext}</div>
              </div>
              {/* Divider for desktop */}
              {index < statItems.length - 1 && (
                <div className="stats-strip-divider" aria-hidden />
              )}
            </div>
          )
        })}
      </div>
    </section>
  )
}

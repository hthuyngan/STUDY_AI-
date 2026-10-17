import { CheckCircle2, Flame, Zap } from 'lucide-react'
import type { DashboardProgressData } from '@/types/dashboard'

interface ProgressOverviewProps {
  progress: DashboardProgressData
}

export function ProgressOverview({ progress }: ProgressOverviewProps) {
  return (
    <section className="progress-overview-root" aria-labelledby="progress-overview-heading">
      <h2 id="progress-overview-heading" className="section-heading-title">
        Tiến độ của tôi
      </h2>

      <div className="progress-overview-card" role="group" aria-label="Thống kê học tập">
        <div className="progress-metric-cell">
          <div className="metric-icon-wrap text-success">
            <CheckCircle2 size={18} aria-hidden />
          </div>
          <div className="metric-text-wrap">
            <span className="metric-value">{progress.completedLessons} bài</span>
            <span className="metric-label">Hoàn thành</span>
          </div>
        </div>

        <div className="progress-divider" aria-hidden="true" />

        <div className="progress-metric-cell">
          <div className="metric-icon-wrap text-warning">
            <Flame size={18} aria-hidden />
          </div>
          <div className="metric-text-wrap">
            <span className="metric-value">{progress.streakDays} ngày</span>
            <span className="metric-label">Streak liên tục</span>
          </div>
        </div>

        <div className="progress-divider" aria-hidden="true" />

        <div className="progress-metric-cell">
          <div className="metric-icon-wrap text-primary">
            <Zap size={18} aria-hidden />
          </div>
          <div className="metric-text-wrap">
            <span className="metric-value">{progress.totalXP.toLocaleString()} XP</span>
            <span className="metric-label">Tổng tích lũy</span>
          </div>
        </div>
      </div>
    </section>
  )
}

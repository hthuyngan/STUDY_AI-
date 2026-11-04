import { BarChart3, BookOpen } from 'lucide-react'
import { Button } from '@/components/ui/Button'

export interface DashboardHeaderProps {
  userName: string
  onStartLearning?: () => void
  onViewAnalytics?: () => void
}

export function DashboardHeader({
  userName,
  onStartLearning,
  onViewAnalytics,
}: DashboardHeaderProps) {
  return (
    <div className="dashboard-header">
      <div className="dashboard-header-text">
        <h1 className="dashboard-title">
          Chào buổi sáng, {userName} <span className="greeting-wave" aria-hidden>👋</span>
        </h1>
        <p className="dashboard-subtitle">
          Hôm nay bạn muốn chinh phục kiến thức gì? Tiếp tục hành trình học tập nào.
        </p>
      </div>

      <div className="dashboard-header-actions" style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
        {onViewAnalytics && (
          <Button
            variant="outline"
            icon={BarChart3}
            onClick={onViewAnalytics}
            className="dashboard-analytics-cta"
          >
            Phân tích học tập
          </Button>
        )}
        {/* The single primary CTA of the dashboard according to evondev discipline */}
        <Button
          variant="primary"
          icon={BookOpen}
          onClick={onStartLearning}
          className="dashboard-primary-cta"
        >
          Học ngay
        </Button>
      </div>
    </div>
  )
}

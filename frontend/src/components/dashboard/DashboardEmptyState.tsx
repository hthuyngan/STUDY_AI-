import { Compass, Sparkles } from 'lucide-react'
import { Link } from 'react-router-dom'
import { Button } from '@/components/ui/Button'

interface DashboardEmptyStateProps {
  onExplore?: () => void
}

export function DashboardEmptyState({ onExplore }: DashboardEmptyStateProps) {
  return (
    <div className="dashboard-empty-root" role="region" aria-label="Khởi động học tập">
      <div className="dashboard-empty-card">
        <div className="dashboard-empty-badge" aria-hidden="true">
          <Sparkles size={20} className="text-primary" />
        </div>
        <h2 className="dashboard-empty-title">Bắt đầu hành trình học tập</h2>
        <p className="dashboard-empty-desc">
          Chọn môn học đầu tiên để STUDY_AI tạo lộ trình cá nhân hóa và đề xuất bài học tối ưu cho bạn.
        </p>
        <Link to="/courses" className="dashboard-empty-cta">
          <Button variant="primary" icon={Compass} onClick={onExplore}>
            Khám phá môn học ngay
          </Button>
        </Link>
      </div>
    </div>
  )
}

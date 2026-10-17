import { ArrowRight, Sparkles } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'

export interface DashboardOnboardingProps {
  onSetupRoadmap?: () => void
}

export function DashboardOnboarding({ onSetupRoadmap }: DashboardOnboardingProps) {
  return (
    <Card className="dashboard-onboarding-card">
      <div className="onboarding-wrapper">
        <div className="onboarding-icon-pill" aria-hidden>
          <Sparkles size={24} className="onboarding-sparkle" />
          <span className="onboarding-brand-tag">STUDY AI</span>
        </div>

        <h2 className="onboarding-heading">Bắt đầu hành trình học tập của bạn</h2>

        <p className="onboarding-description">
          AI Tutor sẽ phân tích mục tiêu thi cử, sở thích và trình độ hiện tại để thiết kế lộ trình học tập cá nhân hóa từng ngày cho riêng bạn.
        </p>

        <div className="onboarding-features">
          <div className="onboarding-feature-item">
            <span className="feature-check" aria-hidden>✓</span>
            <span>Đánh giá năng lực ban đầu miễn phí</span>
          </div>
          <div className="onboarding-feature-item">
            <span className="feature-check" aria-hidden>✓</span>
            <span>Gợi ý bài học theo điểm yếu thực tế</span>
          </div>
          <div className="onboarding-feature-item">
            <span className="feature-check" aria-hidden>✓</span>
            <span>Trợ lý AI giải đáp 24/7 mọi thắc mắc</span>
          </div>
        </div>

        <div className="onboarding-action">
          <Button
            variant="primary"
            icon={ArrowRight}
            onClick={onSetupRoadmap}
            className="onboarding-cta-btn"
          >
            Thiết lập lộ trình học ngay
          </Button>
        </div>
      </div>
    </Card>
  )
}

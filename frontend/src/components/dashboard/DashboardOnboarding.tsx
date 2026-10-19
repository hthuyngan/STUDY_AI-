import { BookOpen } from 'lucide-react'
import { Link } from 'react-router-dom'
import { Button } from '@/components/ui/Button'
import { StickerIllustration } from '@/components/ui/StickerIllustration'

export interface DashboardOnboardingProps {
  onSetupRoadmap?: () => void
}

export function DashboardOnboarding({ onSetupRoadmap }: DashboardOnboardingProps) {
  return (
    <div className="dashboard-onboarding-notebook">
      <div className="onboarding-sticker-wrap" aria-hidden="true">
        <StickerIllustration name="welcome" size="xl" decorative />
      </div>

      <div className="onboarding-text-wrap">
        <h2 className="onboarding-headline">Bắt đầu hành trình học đầu tiên</h2>
        <p className="onboarding-subtext">
          Bạn chưa có dữ liệu học tập nào. Hãy chọn một môn học hoặc khóa học đầu tiên để kích hoạt lộ trình học tập thông minh và chuỗi streak nhé!
        </p>
      </div>

      <div className="onboarding-cta-wrap">
        <Link to="/courses">
          <Button
            variant="primary"
            icon={BookOpen}
            onClick={onSetupRoadmap}
            className="onboarding-primary-btn"
          >
            Khám phá khóa học
          </Button>
        </Link>
      </div>
    </div>
  )
}

export default DashboardOnboarding

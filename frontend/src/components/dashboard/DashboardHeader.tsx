import { useState } from 'react'
import { BookOpen } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { StickerIllustration } from '@/components/ui/StickerIllustration'

export interface DashboardHeaderProps {
  userName: string
  streakDays?: number
  totalXP?: number
  onStartLearning?: () => void
}

export function DashboardHeader({
  userName,
  streakDays = 12,
  totalXP = 2450,
  onStartLearning,
}: DashboardHeaderProps) {
  // Determine greeting via pure state initializer
  const [greetingTime] = useState(() => {
    const hour = new Date().getHours()
    return hour < 12 ? 'buổi sáng' : hour < 18 ? 'buổi chiều' : 'buổi tối'
  })

  return (
    <header className="dashboard-hero-card" aria-label="Lời chào và tổng quan học tập">
      <div className="hero-content-left">
        <div className="hero-text-wrap">
          <h1 className="dashboard-hero-title">
            Chào {greetingTime}, {userName} <span className="greeting-wave" aria-hidden="true">👋</span>
          </h1>
          <p className="dashboard-hero-subtitle">
            Sẵn sàng tiếp tục hành trình học hôm nay? Duy trì nhịp độ để đạt kết quả tốt nhất.
          </p>
        </div>

        <div className="hero-meta-bar" role="status">
          <span className="hero-meta-item">
            🔥 <strong>{streakDays} ngày</strong> streak liên tục
          </span>
          <span className="hero-meta-dot" aria-hidden="true">•</span>
          <span className="hero-meta-item">
            ⚡ <strong>{totalXP.toLocaleString()} XP</strong> tích lũy
          </span>
        </div>

        <div className="hero-actions">
          <Button
            variant="primary"
            icon={BookOpen}
            onClick={onStartLearning}
            className="hero-primary-btn"
          >
            Tiếp tục học bài
          </Button>
        </div>
      </div>

      <div className="hero-illustration-slot" aria-hidden="true">
        <StickerIllustration
          name="welcome"
          size="xl"
          decorative
          className="hero-sticker-graphic"
        />
      </div>
    </header>
  )
}

export default DashboardHeader

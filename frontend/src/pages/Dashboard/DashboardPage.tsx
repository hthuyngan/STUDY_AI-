import { useState } from 'react'
import { AlertCircle, RotateCcw } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/Button'
import { AITutorCard } from '@/components/dashboard/AITutorCard'
import { CalendarStreakCard } from '@/components/dashboard/CalendarStreakCard'
import { ContinueLearningCard } from '@/components/dashboard/ContinueLearningCard'
import { DashboardHeader } from '@/components/dashboard/DashboardHeader'
import { DashboardOnboarding } from '@/components/dashboard/DashboardOnboarding'
import { DashboardSkeleton } from '@/components/dashboard/DashboardSkeleton'
import { LearningProgressOverview } from '@/components/dashboard/LearningProgressOverview'
import { RecentActivityCard } from '@/components/dashboard/RecentActivityCard'
import { SmartReviewCard } from '@/components/dashboard/SmartReviewCard'
import { WeeklyPlanCard } from '@/components/dashboard/WeeklyPlanCard'
import { useDashboard } from '@/hooks/useDashboard'
import './DashboardPage.css'

export function DashboardPage() {
  const navigate = useNavigate()
  const [showEmptyPreview, setShowEmptyPreview] = useState(false)
  const { data, isLoading, error, reload } = useDashboard({
    simulateEmpty: showEmptyPreview,
    delayMs: 250,
  })

  // 1. Loading State
  if (isLoading) {
    return <DashboardSkeleton />
  }

  // 2. Error State
  if (error || !data) {
    if (showEmptyPreview) {
      return (
        <div className="dashboard-root is-empty-preview">
          <div className="empty-preview-toggle-bar">
            <Button
              variant="outline"
              icon={RotateCcw}
              onClick={() => setShowEmptyPreview(false)}
            >
              Xem giao diện có dữ liệu
            </Button>
          </div>
          <DashboardOnboarding onSetupRoadmap={() => setShowEmptyPreview(false)} />
        </div>
      )
    }

    return (
      <div className="dashboard-error-banner" role="alert">
        <AlertCircle size={28} className="text-danger" aria-hidden="true" />
        <h2 className="error-title">Không thể tải dữ liệu bảng điều khiển</h2>
        <p className="error-desc">{error || 'Vui lòng kiểm tra lại kết nối mạng của bạn.'}</p>
        <Button variant="outline" icon={RotateCcw} onClick={reload}>
          Thử tải lại
        </Button>
      </div>
    )
  }

  // Handle continuing first or specific lesson
  const handleContinueLesson = (lessonId?: string) => {
    const target = lessonId
      ? data.continueLessons.find((l) => l.id === lessonId)
      : data.continueLessons[0]

    if (target) {
      const courseId =
        target.subjectId === 'math'
          ? 'math-12'
          : target.subjectId === 'physics'
            ? 'phy-12'
            : 'eng-12'
      navigate(`/learn/${courseId}/${target.id}`)
    } else {
      navigate('/courses')
    }
  }

  // 3. Normal Dashboard State with 5-Tier Architecture
  return (
    <div className="dashboard-root notebook-paper-theme">
      {/* 1. HERO GREETING + LARGE STICKER */}
      <DashboardHeader
        userName={data.user.greetingName}
        streakDays={data.stats.streakDays}
        totalXP={data.stats.totalXP}
        onStartLearning={() => handleContinueLesson()}
      />

      {/* 2. BÀI HỌC GỢI Ý (2/3) + CALENDAR/STREAK (1/3) */}
      <section className="dashboard-grid-2-1" aria-label="Bài học gợi ý và lịch học cá nhân">
        <div className="grid-col-suggested">
          <ContinueLearningCard
            lessons={data.continueLessons}
            onContinueLesson={(lessonId) => handleContinueLesson(lessonId)}
          />
        </div>
        <div className="grid-col-calendar">
          <CalendarStreakCard
            streakDays={data.stats.streakDays}
            learnedDaysCount={5}
          />
        </div>
      </section>

      {/* 3. LỘ TRÌNH TUẦN NÀY (Full width notebook planning) */}
      <section className="dashboard-full-width-section" aria-label="Lộ trình học tập tuần này">
        <WeeklyPlanCard plan={data.weeklyPlan} />
      </section>

      {/* 4. ÔN TẬP THÔNG MINH (2/3) + AI TUTOR (1/3) */}
      <section className="dashboard-grid-2-1" aria-label="Ôn tập thông minh và trợ lý học tập AI">
        <div className="grid-col-review">
          <SmartReviewCard items={data.smartReviews} />
        </div>
        <div className="grid-col-ai">
          <AITutorCard onOpenChat={() => navigate('/ai-tutor')} />
        </div>
      </section>

      {/* 5. TIẾN ĐỘ HỌC TẬP (1/2) + HOẠT ĐỘNG GẦN ĐÂY (1/2) */}
      <section className="dashboard-grid-1-1" aria-label="Tiến độ học tập và hoạt động gần đây">
        <div className="grid-col-half">
          <LearningProgressOverview subjects={data.subjects} />
        </div>
        <div className="grid-col-half">
          <RecentActivityCard activities={data.recentActivities} />
        </div>
      </section>
    </div>
  )
}

export default DashboardPage

import { useState } from 'react'
import { AlertCircle, RotateCcw } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/Button'
import { AITutorCard } from '@/components/dashboard/AITutorCard'
import { ContinueLearningCard } from '@/components/dashboard/ContinueLearningCard'
import { DailyGoalsCard } from '@/components/dashboard/DailyGoalsCard'
import { DashboardHeader } from '@/components/dashboard/DashboardHeader'
import { DashboardOnboarding } from '@/components/dashboard/DashboardOnboarding'
import { DashboardSkeleton } from '@/components/dashboard/DashboardSkeleton'
import { RecentActivityCard } from '@/components/dashboard/RecentActivityCard'
import { StatsStrip } from '@/components/dashboard/StatsStrip'
import { StudyActivityCard } from '@/components/dashboard/StudyActivityCard'
import { SubjectProgressCard } from '@/components/dashboard/SubjectProgressCard'
import { SmartReviewWidget } from '@/components/dashboard/SmartReviewWidget'
import { KnowledgeGapsWidget } from '@/components/dashboard/KnowledgeGapsWidget'
import { AdaptiveLearningWidget } from '@/components/dashboard/AdaptiveLearningWidget'
import { useAuth } from '@/auth/useAuth'
import { useDashboard } from '@/hooks/useDashboard'
import { resolveSubjectId } from '@/lib/subjectResolver'
import './DashboardPage.css'

export function DashboardPage() {
  const navigate = useNavigate()
  const { user, isAuthenticated } = useAuth()
  const [showEmptyPreview, setShowEmptyPreview] = useState(false)
  const { data, isLoading, error, reload } = useDashboard({
    simulateEmpty: showEmptyPreview,
    delayMs: 250,
  })


  // 1. Loading State
  if (isLoading) {
    return <DashboardSkeleton />
  }

  // 2. Guest State: Show clean landing / public overview with login CTA (no personal metrics)
  if (!isAuthenticated || !user) {
    return (
      <div className="dashboard-root" data-testid="guest-dashboard">
        <div className="guest-hero-card">
          <div className="guest-hero-badge">
            <span>HỆ THỐNG HỌC TẬP TOÁN THPT GDPT 2018</span>
          </div>
          <h1 className="guest-hero-title">Chào mừng bạn đến với STUDY_AI</h1>
          <p className="guest-hero-desc">
            Nền tảng học tập cá nhân hóa, luyện thi Toán 10, 11 và 12 chuẩn ma trận Bộ Giáo dục & Đào tạo.
            Đăng nhập để theo dõi lộ trình năng lực thực tế, nhận diện lỗ hổng kiến thức và luyện tập cùng AI Tutor.
          </p>
          <div className="guest-hero-actions">
            <Button variant="primary" onClick={() => navigate('/login')}>
              Đăng nhập để theo dõi học tập
            </Button>
            <Button variant="outline" onClick={() => navigate('/register')}>
              Đăng ký tài khoản
            </Button>
          </div>
        </div>

        {/* Public Subjects Exploration — Math 12 only */}
        <div className="guest-subjects-section">
          <h2 className="guest-section-title">Chương trình Toán lớp 12</h2>
          <div className="guest-subjects-grid">
            <div className="guest-subject-card" onClick={() => navigate('/subjects/math')}>
              <h3>Chương 1–3: Giải tích & Vectơ không gian</h3>
              <p>Ứng dụng đạo hàm khảo sát hàm số, vectơ Oxyz và mẫu số liệu ghép nhóm.</p>
              <span className="guest-explore-link">Khám phá chương trình →</span>
            </div>
            <div className="guest-subject-card" onClick={() => navigate('/subjects/math')}>
              <h3>Chương 4–6: Tích phân, Oxyz & Xác suất</h3>
              <p>Nguyên hàm, tích phân, phương trình mặt phẳng/đường thẳng/mặt cầu và xác suất có điều kiện.</p>
              <span className="guest-explore-link">Khám phá chương trình →</span>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // 3. Error State
  if (error || !data) {
    if (showEmptyPreview) {
      return (
        <div className="dashboard-root">
          <div className="flex justify-end mb-2">
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
        <AlertCircle size={28} className="text-danger" aria-hidden />
        <h2 className="error-title">Không thể tải dữ liệu bảng điều khiển</h2>
        <p className="error-desc">{error || 'Vui lòng kiểm tra lại kết nối mạng của bạn.'}</p>
        <Button variant="outline" icon={RotateCcw} onClick={reload}>
          Thử tải lại
        </Button>
      </div>
    )
  }

  // 3. Normal Dashboard State
  const displayGreetingName =
    isAuthenticated && user ? user.displayName : data.user.greetingName

  return (
    <div className="dashboard-root">
      {/* Header */}
      <DashboardHeader
        userName={displayGreetingName}
        onStartLearning={() => {

          const firstLesson = data.continueLessons[0]
          if (firstLesson) {
            navigate(`/subjects/${firstLesson.subjectId}/lessons/${firstLesson.id}`)
          } else {
            navigate('/subjects')
          }
        }}
        onViewAnalytics={() => navigate('/learning-analytics')}
      />

      {/* Row 1: Adaptive Learning Next Step + Continue Learning (8 cols) + AI Tutor & Review (4 cols) */}
      <div className="dashboard-row-grid">
        <div className="col-span-8" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4, 16px)' }}>
          <AdaptiveLearningWidget />
          <ContinueLearningCard
            lessons={data.continueLessons}
            onContinueLesson={(lessonId, sectionId) => {
              const lesson = data.continueLessons.find((l) => l.id === lessonId)
              const defaultSubjectId = resolveSubjectId({ grade: '12' }) || 'sub_math12'
              const subjectId = lesson?.subjectId || defaultSubjectId
              const hash = sectionId ? `#${sectionId}` : ''
              navigate(`/subjects/${subjectId}/lessons/${lessonId}${hash}`)
            }}
          />
        </div>
        <div className="col-span-4" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4, 16px)' }}>
          <SmartReviewWidget />
          <KnowledgeGapsWidget />
          <AITutorCard />
        </div>
      </div>

      {/* Row 2: Stats Strip — Compact learning metrics */}
      <StatsStrip stats={data.stats} />

      {/* Row 3: Study Activity (8 cols) + Daily Goals (4 cols) */}
      <div className="dashboard-row-grid">
        <div className="col-span-8">
          <StudyActivityCard
            points={data.activity.points}
            weeklyHours={data.activity.weeklyHours}
            increasePercent={data.activity.increasePercent}
          />
        </div>
        <div className="col-span-4">
          <DailyGoalsCard data={data.dailyGoals} />
        </div>
      </div>

      {/* Row 3: Subject Progress (Full width container with 4 cols) */}
      <SubjectProgressCard subjects={data.subjects} />

      {/* Row 4: Recent Activity (12 cols) */}
      <div className="dashboard-row-grid">
        <div className="col-span-12">
          <RecentActivityCard activities={data.recentActivities} />
        </div>
      </div>
    </div>
  )
}

export default DashboardPage

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
import { LeaderboardCard } from '@/components/dashboard/LeaderboardCard'
import { RecentActivityCard } from '@/components/dashboard/RecentActivityCard'
import { StatsStrip } from '@/components/dashboard/StatsStrip'
import { StudyActivityCard } from '@/components/dashboard/StudyActivityCard'
import { SubjectProgressCard } from '@/components/dashboard/SubjectProgressCard'
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
  return (
    <div className="dashboard-root">
      {/* Header */}
      <DashboardHeader
        userName={data.user.greetingName}
        onStartLearning={() => {
          const firstLesson = data.continueLessons[0]
          if (firstLesson) {
            navigate(`/subjects/${firstLesson.subjectId}/lessons/${firstLesson.id}`)
          } else {
            navigate('/subjects')
          }
        }}
      />

      {/* Stats Strip — 1 unified container with dividers */}
      <StatsStrip stats={data.stats} />

      {/* Row 1: Study Activity (8 cols) + Daily Goals (4 cols) */}
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

      {/* Row 2: Continue Learning (8 cols) + AI Tutor (4 cols) */}
      <div className="dashboard-row-grid">
        <div className="col-span-8">
          <ContinueLearningCard
            lessons={data.continueLessons}
            onContinueLesson={(lessonId) => {
              const lesson = data.continueLessons.find((l) => l.id === lessonId)
              const subjectId = lesson?.subjectId || 'math'
              navigate(`/subjects/${subjectId}/lessons/${lessonId}`)
            }}
          />
        </div>
        <div className="col-span-4">
          <AITutorCard />
        </div>
      </div>

      {/* Row 3: Subject Progress (Full width container with 4 cols) */}
      <SubjectProgressCard subjects={data.subjects} />

      {/* Row 4: Recent Activity (8 cols) + Leaderboard (4 cols) */}
      <div className="dashboard-row-grid">
        <div className="col-span-8">
          <RecentActivityCard activities={data.recentActivities} />
        </div>
        <div className="col-span-4">
          <LeaderboardCard entries={data.leaderboard} />
        </div>
      </div>
    </div>
  )
}

export default DashboardPage

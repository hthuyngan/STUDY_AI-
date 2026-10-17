import { useState } from 'react'
import { AlertCircle, RotateCcw } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { DashboardTopHeader } from '@/components/dashboard/DashboardTopHeader'
import { PrimaryLearningCard } from '@/components/dashboard/PrimaryLearningCard'
import { ExploreSubjects } from '@/components/dashboard/ExploreSubjects'
import { ProgressOverview } from '@/components/dashboard/ProgressOverview'
import { WeeklyGoalCard } from '@/components/dashboard/WeeklyGoalCard'
import { RecommendedSection } from '@/components/dashboard/RecommendedSection'
import { DashboardBottomNav } from '@/components/dashboard/DashboardBottomNav'
import { DashboardSkeleton } from '@/components/dashboard/DashboardSkeleton'
import { DashboardEmptyState } from '@/components/dashboard/DashboardEmptyState'
import { useDashboard } from '@/hooks/useDashboard'
import './DashboardPage.css'

export function DashboardPage() {
  const [showEmptyPreview, setShowEmptyPreview] = useState(false)
  const { data, isLoading, error, reload } = useDashboard({
    simulateEmpty: showEmptyPreview,
    delayMs: 200,
  })

  // 1. Loading State
  if (isLoading) {
    return (
      <div className="learning-dashboard-root">
        <DashboardSkeleton />
        <DashboardBottomNav />
      </div>
    )
  }

  // 2. Empty State simulation or no lesson state
  if (showEmptyPreview || (data && !data.currentLesson)) {
    return (
      <div className="learning-dashboard-root">
        <div className="learning-dashboard-container">
          <DashboardTopHeader
            userName={data?.user.greetingName || 'Bạn'}
            avatarUrl={data?.user.avatar}
          />
          <div className="flex justify-end">
            <Button
              variant="outline"
              icon={RotateCcw}
              onClick={() => setShowEmptyPreview(false)}
            >
              Xem giao diện có dữ liệu
            </Button>
          </div>
          <DashboardEmptyState onExplore={() => setShowEmptyPreview(false)} />
        </div>
        <DashboardBottomNav />
      </div>
    )
  }

  // 3. Error State
  if (error || !data) {
    return (
      <div className="learning-dashboard-root">
        <div className="learning-dashboard-container">
          <div className="dashboard-error-banner" role="alert">
            <AlertCircle size={28} className="text-danger" aria-hidden />
            <h2 className="error-title">Không thể tải dữ liệu bảng điều khiển</h2>
            <p className="error-desc">{error || 'Vui lòng kiểm tra lại kết nối mạng của bạn.'}</p>
            <Button variant="outline" icon={RotateCcw} onClick={reload}>
              Thử tải lại
            </Button>
          </div>
        </div>
        <DashboardBottomNav />
      </div>
    )
  }

  // Fallbacks for Learning Home data
  const currentLesson = data.currentLesson || {
    id: 'default-lesson',
    subject: 'Toán 12',
    grade: 'Lớp 12',
    title: 'Khảo sát sự biến thiên & Vẽ đồ thị hàm số',
    progress: 75,
    url: '/courses/toan-12',
  }

  const exploreSubjects = data.exploreSubjects || [
    { id: 'sub-toan', name: 'Toán', slug: 'toan-12', lessonCount: 24, icon: 'calculator' as const },
    { id: 'sub-ly', name: 'Vật lý', slug: 'vat-ly-12', lessonCount: 18, icon: 'atom' as const },
    { id: 'sub-hoa', name: 'Hóa học', slug: 'hoa-hoc-12', lessonCount: 20, icon: 'flask' as const },
    { id: 'sub-anh', name: 'Tiếng Anh', slug: 'tieng-anh', lessonCount: 16, icon: 'book' as const },
  ]

  const learningProgress = data.learningProgress || {
    completedLessons: data.stats.completedLessonsCount || 68,
    streakDays: data.stats.streakDays || 12,
    totalXP: data.stats.totalXP || 2450,
  }

  const weeklyGoal = data.weeklyGoal || {
    completedDays: 5,
    totalDays: 7,
    days: [
      { dayLabel: 'T2', completed: true },
      { dayLabel: 'T3', completed: true },
      { dayLabel: 'T4', completed: true },
      { dayLabel: 'T5', completed: true },
      { dayLabel: 'T6', completed: true },
      { dayLabel: 'T7', completed: false, isToday: true },
      { dayLabel: 'CN', completed: false },
    ],
  }

  const recommendations = data.recommendations || [
    {
      id: 'rec-1',
      title: 'Hệ Mặt Trời & Chuyển động thiên thể',
      subject: 'Vật lý',
      duration: '20 phút',
      category: 'lesson' as const,
      url: '/courses/vat-ly-12',
    },
    {
      id: 'rec-2',
      title: 'Phản ứng Este hóa & Ứng dụng thực tế',
      subject: 'Hóa học',
      duration: '15 phút',
      category: 'lesson' as const,
      url: '/courses/hoa-hoc-12',
    },
    {
      id: 'rec-3',
      title: 'IELTS Academic Vocabulary: Environment',
      subject: 'Tiếng Anh',
      duration: '25 phút',
      category: 'lesson' as const,
      url: '/courses/tieng-anh',
    },
    {
      id: 'rec-ai',
      title: 'Luyện tập giải bài khó cùng AI Tutor',
      subject: 'AI Tutor',
      duration: '5 phút luyện đề',
      category: 'ai-practice' as const,
      tag: 'Cá nhân hóa',
      url: '/ai-tutor?prompt=giai-thich-toan-12',
    },
  ]

  return (
    <div className="learning-dashboard-root">
      <div className="learning-dashboard-container">
        {/* Top Header */}
        <DashboardTopHeader
          userName={data.user.greetingName || data.user.name}
          avatarUrl={data.user.avatar}
          greetingLabel="Chào buổi sáng"
        />

        {/* Top Area: Primary Learning (38%) + Explore Topics (62%) */}
        <div className="learning-row-top">
          <PrimaryLearningCard lesson={currentLesson} />
          <ExploreSubjects subjects={exploreSubjects} />
        </div>

        {/* Bottom Area: Progress & Goal (38%) + Recommended (62%) */}
        <div className="learning-row-bottom">
          <div className="learning-col-left">
            <ProgressOverview progress={learningProgress} />
            <WeeklyGoalCard goal={weeklyGoal} />
          </div>

          <div className="learning-col-right">
            <RecommendedSection recommendations={recommendations} />
          </div>
        </div>
      </div>

      {/* Fixed Learning Bottom Navigation */}
      <DashboardBottomNav />
    </div>
  )
}

export default DashboardPage

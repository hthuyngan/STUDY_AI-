import { BookOpen, Clock, Flame, GraduationCap, Sparkles } from 'lucide-react'
import { Link } from 'react-router-dom'
import { Avatar } from '@/components/ui/Avatar'
import { Breadcrumb } from '@/components/ui/Breadcrumb'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { PageErrorState } from '@/components/ui/PageErrorState'
import { Progress } from '@/components/ui/Progress'
import { Skeleton } from '@/components/ui/Skeleton'
import { useUserProfile } from '@/hooks/useSupporting'
import './ProfilePage.css'

export function ProfilePage() {
  const { profile, isLoading, error, reload } = useUserProfile()

  if (isLoading) {
    return (
      <div className="profile-page-root">
        <Skeleton variant="text" width={200} height={28} />
        <Skeleton variant="rect" width="100%" height={160} />
      </div>
    )
  }

  if (error || !profile) {
    return (
      <div className="profile-page-root">
        <Breadcrumb items={[{ label: 'Hồ sơ cá nhân' }]} />
        <PageErrorState description={error || 'Không tìm thấy hồ sơ'} onRetry={reload} />
      </div>
    )
  }

  return (
    <div className="profile-page-root">
      <Breadcrumb items={[{ label: 'Hồ sơ học sinh' }]} />

      {/* User Header Profile Card */}
      <div className="profile-header-card">
        <div className="profile-avatar-wrap">
          <Avatar src={profile.avatar} alt={profile.name} size="lg" />
        </div>

        <div className="profile-main-info">
          <h1 className="profile-student-name">{profile.name}</h1>
          <div className="profile-school-tags">
            <span className="profile-grade-tag">{profile.grade}</span>
            <span className="profile-school-name">
              <GraduationCap size={14} aria-hidden /> {profile.school}
            </span>
          </div>
          <p className="profile-goal-desc">{profile.studyGoal}</p>
        </div>

        <div className="profile-actions-wrap">
          <Button
            variant="outline"
            onClick={() => alert('Chức năng cập nhật hồ sơ sẽ sớm hỗ trợ lưu trữ đám mây.')}
          >
            Chỉnh sửa hồ sơ
          </Button>
        </div>
      </div>

      {/* Stats Summary Grid */}
      <div className="profile-stats-grid">
        <Card className="profile-stat-box">
          <div className="stat-icon-wrap xp" aria-hidden>
            <Sparkles size={20} />
          </div>
          <span className="stat-title">Điểm tích lũy</span>
          <span className="stat-number">{profile.totalXP} XP</span>
        </Card>

        <Card className="profile-stat-box">
          <div className="stat-icon-wrap streak" aria-hidden>
            <Flame size={20} />
          </div>
          <span className="stat-title">Chuỗi học tập</span>
          <span className="stat-number">{profile.streakDays} ngày</span>
        </Card>

        <Card className="profile-stat-box">
          <div className="stat-icon-wrap hours" aria-hidden>
            <Clock size={20} />
          </div>
          <span className="stat-title">Thời lượng học</span>
          <span className="stat-number">{profile.studyHours} giờ</span>
        </Card>

        <Card className="profile-stat-box">
          <div className="stat-icon-wrap lessons" aria-hidden>
            <BookOpen size={20} />
          </div>
          <span className="stat-title">Bài học hoàn thành</span>
          <span className="stat-number">{profile.completedLessons} bài</span>
        </Card>
      </div>

      {/* Subject Progress Overview */}
      <div className="profile-subjects-section">
        <h2 className="section-title">Tiến độ theo phân môn</h2>

        <div className="profile-subjects-grid">
          {profile.subjectStats.map((sub) => (
            <Card key={sub.subjectId} className="profile-subject-item">
              <div className="sub-top-row">
                <span className="sub-name">{sub.name}</span>
                <span className="sub-percent">{sub.progress}%</span>
              </div>

              <Progress value={sub.progress} height={6} />

              <div className="sub-bottom-row">
                <span className="sub-lessons-count">
                  {sub.completedLessons} / {sub.totalLessons} bài học
                </span>
                <Link to={`/subjects/${sub.subjectId}`} className="sub-view-link">
                  Xem chi tiết
                </Link>
              </div>
            </Card>
          ))}
        </div>
      </div>
    </div>
  )
}

export default ProfilePage

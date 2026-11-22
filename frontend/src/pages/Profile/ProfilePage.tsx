import { BookOpen, Clock, Flame, Sparkles } from 'lucide-react'
import { Link, useNavigate } from 'react-router-dom'
import { Avatar } from '@/components/ui/Avatar'
import { Breadcrumb } from '@/components/ui/Breadcrumb'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { PageErrorState } from '@/components/ui/PageErrorState'
import { Progress } from '@/components/ui/Progress'
import { Skeleton } from '@/components/ui/Skeleton'
import { useAuth } from '@/auth/useAuth'
import { useUserProfile } from '@/hooks/useSupporting'
import './ProfilePage.css'

export function ProfilePage() {
  const navigate = useNavigate()
  const { user, isAuthenticated, state } = useAuth()
  const { profile, isLoading, error, reload } = useUserProfile()

  if (state === 'initializing' || isLoading) {
    return (
      <div className="profile-page-root">
        <Skeleton variant="text" width={200} height={28} />
        <Skeleton variant="rect" width="100%" height={160} />
      </div>
    )
  }

  if (!isAuthenticated || !user) {
    return (
      <div className="profile-page-root" data-testid="guest-profile-gate">
        <Breadcrumb items={[{ label: 'Hồ sơ cá nhân' }]} />
        <div style={{ textAlign: 'center', padding: '48px 24px', background: 'var(--surface-card, #ffffff)', border: '1px solid var(--border-default, #e2e8f0)', borderRadius: '12px' }}>
          <h2 style={{ fontSize: '20px', fontWeight: 600, marginBottom: '8px' }}>Vui lòng đăng nhập</h2>
          <p style={{ color: 'var(--text-secondary, #64748b)', marginBottom: '24px' }}>Bạn cần đăng nhập tài khoản học viên để xem và quản lý hồ sơ cá nhân.</p>
          <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
            <Button variant="primary" onClick={() => navigate('/login')}>
              Đăng nhập
            </Button>
            <Button variant="outline" onClick={() => navigate('/register')}>
              Đăng ký tài khoản
            </Button>
          </div>
        </div>
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

  const currentName = profile.name
  const currentGrade = profile.grade

  return (
    <div className="profile-page-root">
      <Breadcrumb items={[{ label: 'Hồ sơ học sinh' }]} />

      {/* User Header Profile Card */}
      <div className="profile-header-card">
        <div className="profile-avatar-wrap">
          <Avatar src={profile.avatar} alt={currentName} size="lg" />
        </div>

        <div className="profile-main-info">
          <h1 className="profile-student-name">{currentName}</h1>
          <div className="profile-school-tags">
            <span className="profile-grade-tag">{currentGrade}</span>
          </div>
        </div>
      </div>

      {/* Stats Unified Container with Dividers */}
      <div className="profile-stats-container">
        <div className="profile-stat-unit">
          <div className="profile-stat-icon-wrap" aria-hidden>
            <BookOpen size={18} />
          </div>
          <div className="profile-stat-details">
            <span className="profile-stat-val">{profile.completedLessons} bài</span>
            <span className="profile-stat-lbl">Hoàn thành</span>
          </div>
        </div>

        <div className="profile-stat-divider" aria-hidden />

        <div className="profile-stat-unit">
          <div className="profile-stat-icon-wrap" aria-hidden>
            <Flame size={18} />
          </div>
          <div className="profile-stat-details">
            <span className="profile-stat-val">{profile.streakDays} ngày</span>
            <span className="profile-stat-lbl">Chuỗi Streak</span>
          </div>
        </div>

        <div className="profile-stat-divider" aria-hidden />

        <div className="profile-stat-unit">
          <div className="profile-stat-icon-wrap" aria-hidden>
            <Sparkles size={18} />
          </div>
          <div className="profile-stat-details">
            <span className="profile-stat-val">{profile.totalXP} XP</span>
            <span className="profile-stat-lbl">Tổng điểm</span>
          </div>
        </div>

        <div className="profile-stat-divider" aria-hidden />

        <div className="profile-stat-unit">
          <div className="profile-stat-icon-wrap" aria-hidden>
            <Clock size={18} />
          </div>
          <div className="profile-stat-details">
            <span className="profile-stat-val">{profile.studyHours} giờ</span>
            <span className="profile-stat-lbl">Thời lượng học</span>
          </div>
        </div>
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

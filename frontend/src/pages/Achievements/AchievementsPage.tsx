import { CheckCircle2, Flame, Lock, Sparkles, Trophy } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { Breadcrumb } from '@/components/ui/Breadcrumb'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { PageErrorState } from '@/components/ui/PageErrorState'
import { Progress } from '@/components/ui/Progress'
import { Skeleton } from '@/components/ui/Skeleton'
import { useAuth } from '@/auth/useAuth'
import { useAchievements, useUserProfile } from '@/hooks/useSupporting'
import './AchievementsPage.css'

export function AchievementsPage() {
  const navigate = useNavigate()
  const { user, isAuthenticated, state } = useAuth()
  const { achievements, isLoading: loadingAch, error: errorAch, reload } = useAchievements()
  const { profile, isLoading: loadingProf } = useUserProfile()

  if (state === 'initializing' || loadingAch || loadingProf) {
    return (
      <div className="achievements-page-root">
        <Skeleton variant="text" width={220} height={28} />
        <Skeleton variant="rect" width="100%" height={120} />
        <div className="badges-grid">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <Skeleton key={i} variant="rect" width="100%" height={160} />
          ))}
        </div>
      </div>
    )
  }

  if (!isAuthenticated || !user) {
    return (
      <div className="achievements-page-root" data-testid="guest-achievements-gate">
        <Breadcrumb items={[{ label: 'Thành tích' }]} />
        <div style={{ textAlign: 'center', padding: '48px 24px', background: 'var(--surface-card, #ffffff)', border: '1px solid var(--border-default, #e2e8f0)', borderRadius: '12px' }}>
          <h2 style={{ fontSize: '20px', fontWeight: 600, marginBottom: '8px' }}>Vui lòng đăng nhập</h2>
          <p style={{ color: 'var(--text-secondary, #64748b)', marginBottom: '24px' }}>Bạn cần đăng nhập tài khoản học viên để xem huy hiệu và thành tích học tập cá nhân.</p>
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

  if (errorAch) {
    return (
      <div className="achievements-page-root">
        <Breadcrumb items={[{ label: 'Thành tích' }]} />
        <PageErrorState description={errorAch} onRetry={reload} />
      </div>
    )
  }

  return (
    <div className="achievements-page-root">
      <Breadcrumb items={[{ label: 'Thành tích' }]} />

      <div className="page-header-row">
        <div>
          <h1 className="page-title">Huy hiệu & Thành tích học tập</h1>
          <p className="page-subtitle">Ghi nhận sự kiên trì và tiến bộ học tập mỗi ngày của bạn</p>
        </div>
      </div>

      {/* Top Metrics Strip */}
      <div className="achievements-metrics-strip">
        <div className="metric-box">
          <div className="metric-icon streak" aria-hidden>
            <Flame size={20} />
          </div>
          <div className="metric-text-wrap">
            <span className="metric-label">Chuỗi ngày học</span>
            <span className="metric-value">{profile?.streakDays ?? 0} ngày liên tục</span>
          </div>
        </div>

        <div className="metric-divider" aria-hidden />

        <div className="metric-box">
          <div className="metric-icon xp" aria-hidden>
            <Sparkles size={20} />
          </div>
          <div className="metric-text-wrap">
            <span className="metric-label">Tổng điểm kinh nghiệm</span>
            <span className="metric-value">{profile?.totalXP ?? 0} XP</span>
          </div>
        </div>

        <div className="metric-divider" aria-hidden />

        <div className="metric-box">
          <div className="metric-icon lessons" aria-hidden>
            <Trophy size={20} />
          </div>
          <div className="metric-text-wrap">
            <span className="metric-label">Bài học hoàn thành</span>
            <span className="metric-value">{profile?.completedLessons ?? 0} bài học</span>
          </div>
        </div>
      </div>

      {/* Badges Grid */}
      <div className="badges-section">
        <h2 className="badges-section-title">Huy hiệu đạt được</h2>

        {achievements.length === 0 ? (
          <div
            className="achievements-unavailable-state"
            data-testid="achievements-unavailable-card"
            style={{
              padding: '32px 24px',
              textAlign: 'center',
              background: 'var(--surface-card, #ffffff)',
              border: '1px solid var(--border-default, #e2e8f0)',
              borderRadius: '12px',
            }}
          >
            <div
              style={{
                display: 'inline-flex',
                padding: '12px',
                borderRadius: '50%',
                background: 'var(--color-primary-50, #eff6ff)',
                color: 'var(--color-primary-600, #2563eb)',
                marginBottom: '16px',
              }}
            >
              <Trophy size={36} aria-hidden />
            </div>
            <h3
              style={{
                fontSize: '18px',
                fontWeight: 600,
                marginBottom: '8px',
                color: 'var(--text-primary, #0f172a)',
              }}
            >
              Tính năng Huy hiệu & Thành tích đang kết nối hệ thống
            </h3>
            <p
              style={{
                color: 'var(--text-secondary, #64748b)',
                maxWidth: '520px',
                margin: '0 auto 20px',
                fontSize: '14px',
                lineHeight: 1.6,
              }}
            >
              Dữ liệu huy hiệu học tập và bảng xếp hạng đang được đồng bộ hóa với cơ sở dữ liệu học tập Toán THPT. Hệ thống không tạo huy hiệu mẫu và sẽ hiển thị thành tích chính thức khi tính năng ghi nhận hoàn tất.
            </p>
            <Button variant="primary" onClick={() => navigate('/practice')}>
              Luyện tập ngay
            </Button>
          </div>
        ) : (
          <div className="badges-grid">
            {achievements.map((ach) => {
            const isUnlocked = ach.isUnlocked
            return (
              <Card
                key={ach.id}
                className={`badge-card-item ${isUnlocked ? 'unlocked' : 'locked'}`}
              >
                <div className="badge-card-top">
                  <div className="badge-emoji-box" aria-hidden>
                    <span>{ach.icon}</span>
                  </div>
                  <div className="badge-status-tag">
                    {isUnlocked ? (
                      <span className="unlocked-text">
                        <CheckCircle2 size={13} aria-hidden /> Đã đạt
                      </span>
                    ) : (
                      <span className="locked-text">
                        <Lock size={13} aria-hidden /> Chưa mở
                      </span>
                    )}
                  </div>
                </div>

                <h3 className="badge-title">{ach.title}</h3>
                <p className="badge-desc">{ach.description}</p>

                <div className="badge-progress-wrap">
                  <div className="badge-progress-header">
                    <span className="badge-progress-label">Tiến độ</span>
                    <span className="badge-progress-val">
                      {ach.progress} / {ach.target}
                    </span>
                  </div>
                  <Progress
                    value={Math.min(100, Math.round((ach.progress / ach.target) * 100))}
                    height={5}
                  />
                </div>

                <div className="badge-card-footer">
                  <span className="badge-xp-reward">+{ach.xpReward} XP</span>
                  {ach.unlockedDate && (
                    <span className="badge-date-text">Đạt ngày {ach.unlockedDate}</span>
                  )}
                </div>
              </Card>
            )
            })}
          </div>
        )}
      </div>
    </div>
  )
}

export default AchievementsPage

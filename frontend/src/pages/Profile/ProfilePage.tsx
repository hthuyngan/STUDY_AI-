import { useState } from 'react'
import { BookOpen, Clock, Flame, GraduationCap, Sparkles, X } from 'lucide-react'
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

  const [isEditing, setIsEditing] = useState(false)
  const [editedName, setEditedName] = useState('')
  const [editedGrade, setEditedGrade] = useState('')
  const [editedGoal, setEditedGoal] = useState('')
  const [customProfile, setCustomProfile] = useState<{
    name?: string
    grade?: string
    studyGoal?: string
  }>({})

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

  const currentName = customProfile.name || profile.name
  const currentGrade = customProfile.grade || profile.grade
  const currentGoal = customProfile.studyGoal || profile.studyGoal

  const handleOpenEdit = () => {
    setEditedName(currentName)
    setEditedGrade(currentGrade)
    setEditedGoal(currentGoal)
    setIsEditing(true)
  }

  const handleSaveEdit = (e: React.FormEvent) => {
    e.preventDefault()
    setCustomProfile({
      name: editedName.trim() || currentName,
      grade: editedGrade.trim() || currentGrade,
      studyGoal: editedGoal.trim() || currentGoal,
    })
    setIsEditing(false)
  }

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
            <span className="profile-school-name">
              <GraduationCap size={14} aria-hidden /> {profile.school}
            </span>
          </div>
          <p className="profile-goal-desc">{currentGoal}</p>
        </div>

        <div className="profile-actions-wrap">
          <Button variant="outline" onClick={handleOpenEdit}>
            Chỉnh sửa hồ sơ
          </Button>
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

      {/* Profile Edit Dialog Modal */}
      {isEditing && (
        <div className="profile-modal-backdrop" onClick={() => setIsEditing(false)}>
          <div
            className="profile-modal-content"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-labelledby="edit-profile-title"
          >
            <div className="profile-modal-header">
              <h2 id="edit-profile-title" className="profile-modal-title">
                Chỉnh sửa hồ sơ học sinh
              </h2>
              <button
                type="button"
                className="profile-modal-close"
                onClick={() => setIsEditing(false)}
                aria-label="Đóng cửa sổ"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSaveEdit} className="profile-modal-form">
              <div className="profile-form-group">
                <label htmlFor="edit-name" className="profile-form-label">
                  Họ và tên
                </label>
                <input
                  id="edit-name"
                  type="text"
                  value={editedName}
                  onChange={(e) => setEditedName(e.target.value)}
                  className="profile-form-input"
                  required
                />
              </div>

              <div className="profile-form-group">
                <label htmlFor="edit-grade" className="profile-form-label">
                  Lớp / Khối học
                </label>
                <input
                  id="edit-grade"
                  type="text"
                  value={editedGrade}
                  onChange={(e) => setEditedGrade(e.target.value)}
                  className="profile-form-input"
                  required
                />
              </div>

              <div className="profile-form-group">
                <label htmlFor="edit-goal" className="profile-form-label">
                  Mục tiêu ôn tập
                </label>
                <textarea
                  id="edit-goal"
                  rows={3}
                  value={editedGoal}
                  onChange={(e) => setEditedGoal(e.target.value)}
                  className="profile-form-textarea"
                />
              </div>

              <div className="profile-modal-actions">
                <Button type="button" variant="outline" onClick={() => setIsEditing(false)}>
                  Hủy
                </Button>
                <Button type="submit" variant="primary">
                  Lưu thay đổi
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

export default ProfilePage

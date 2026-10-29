import React from 'react'
import {
  Eye,
  Edit2,
  CalendarCheck,
  Lock,
  Unlock,
  Star,
  ExternalLink,
} from 'lucide-react'
import { Link } from 'react-router-dom'
import type { AdminTeacherItem } from '@/types/education'
import { StatusBadge } from '@/components/ui/StatusBadge'

export interface TeacherCardListProps {
  teachers: AdminTeacherItem[]
  onSelectTeacher: (teacher: AdminTeacherItem) => void
  onEditTeacher: (teacher: AdminTeacherItem) => void
  onChangeTeachingStatus: (teacher: AdminTeacherItem) => void
  onToggleLockAccount: (teacher: AdminTeacherItem) => void
}

export const TeacherCardList: React.FC<TeacherCardListProps> = ({
  teachers,
  onSelectTeacher,
  onEditTeacher,
  onChangeTeachingStatus,
  onToggleLockAccount,
}) => {
  return (
    <div className="teacher-mobile-card-list" role="region" aria-label="Danh sách giáo viên di động">
      {teachers.map((tch) => {
        const isLocked = tch.accountStatus === 'LOCKED'

        return (
          <div key={tch.id} className="teacher-mobile-card">
            {/* Header */}
            <div className="teacher-mobile-header">
              <div className="teacher-mobile-id-wrap">
                <div className="teacher-avatar" aria-hidden="true">
                  {tch.name.charAt(0).toUpperCase()}
                </div>
                <div className="teacher-info">
                  <button
                    type="button"
                    className="teacher-name-link"
                    onClick={() => onSelectTeacher(tch)}
                  >
                    GV. {tch.name}
                  </button>
                  <span className="teacher-email">{tch.email}</span>
                </div>
              </div>
              <div className="teacher-mobile-status-wrap">
                <StatusBadge status={tch.status} />
                {isLocked && (
                  <span className="teacher-locked-badge">
                    <Lock size={10} aria-hidden="true" />
                    <span>Khóa</span>
                  </span>
                )}
              </div>
            </div>

            {/* Meta Row */}
            <div className="teacher-mobile-meta-row">
              <span className="teacher-subject-pill">{tch.subject}</span>
              <div className="teacher-rating-pill">
                <Star size={11} fill="#f59e0b" color="#f59e0b" aria-hidden="true" />
                <span>{tch.rating.toFixed(1)}</span>
              </div>
            </div>

            {/* Stats Grid */}
            <div className="teacher-mobile-stats-grid">
              <div className="teacher-mobile-stat-box">
                <span className="teacher-stat-label">Lớp phụ trách</span>
                <span className="teacher-stat-value">
                  {tch.classes && tch.classes.length > 0 ? tch.classes.join(', ') : 'Chưa có'}
                </span>
              </div>
              <div className="teacher-mobile-stat-box">
                <span className="teacher-stat-label">Học sinh</span>
                <span className="teacher-stat-value">{tch.studentCount} em</span>
              </div>
              <div className="teacher-mobile-stat-box">
                <span className="teacher-stat-label">Kinh nghiệm</span>
                <span className="teacher-stat-value">{tch.experienceYears || 3} năm</span>
              </div>
            </div>

            {/* Footer Actions */}
            <div className="teacher-mobile-actions">
              <button
                type="button"
                className="btn btn-secondary btn-sm teacher-mobile-action-btn"
                onClick={() => onSelectTeacher(tch)}
                aria-label={`Hồ sơ di động ${tch.name}`}
              >
                <Eye size={13} />
                <span>Hồ sơ</span>
              </button>
              <button
                type="button"
                className="btn btn-secondary btn-sm teacher-mobile-action-btn"
                onClick={() => onEditTeacher(tch)}
                aria-label={`Sửa di động ${tch.name}`}
              >
                <Edit2 size={13} />
                <span>Sửa</span>
              </button>
              <button
                type="button"
                className="btn btn-secondary btn-sm teacher-mobile-action-btn"
                onClick={() => onChangeTeachingStatus(tch)}
                aria-label={`Đổi trạng thái di động ${tch.name}`}
              >
                <CalendarCheck size={13} />
                <span>Trạng thái</span>
              </button>
              <button
                type="button"
                className={`btn btn-secondary btn-sm teacher-mobile-action-btn ${isLocked ? 'text-success' : 'text-danger'}`}
                onClick={() => onToggleLockAccount(tch)}
                aria-label={isLocked ? `Mở khóa di động ${tch.name}` : `Khóa di động ${tch.name}`}
              >
                {isLocked ? <Unlock size={13} /> : <Lock size={13} />}
                <span>{isLocked ? 'Mở khóa' : 'Khóa'}</span>
              </button>
              <Link
                to="/teacher"
                className="btn btn-secondary btn-sm teacher-mobile-action-btn"
                title="Đến Teacher Workspace"
                aria-label={`Teacher Workspace di động ${tch.name}`}
              >
                <ExternalLink size={13} />
              </Link>
            </div>
          </div>
        )
      })}
    </div>
  )
}

import React, { useState, useEffect, useRef } from 'react'
import {
  X,
  Edit2,
  CalendarCheck,
  Lock,
  Unlock,
  Mail,
  Phone,
  Calendar,
  Award,
  BookOpen,
  Users,
  Star,
  ExternalLink,
  Save,
  RotateCcw,
} from 'lucide-react'
import { Link } from 'react-router-dom'
import type { AdminTeacherItem } from '@/types/education'
import { StatusBadge } from '@/components/ui/StatusBadge'

export interface TeacherDetailDrawerProps {
  isOpen: boolean
  teacher: AdminTeacherItem | null
  onClose: () => void
  onSaveEdit: (id: string, updates: Partial<AdminTeacherItem>) => Promise<void>
  onChangeTeachingStatus: (teacher: AdminTeacherItem) => void
  onToggleLockAccount: (teacher: AdminTeacherItem) => void
}

interface EditFormProps {
  teacher: AdminTeacherItem
  onCancel: () => void
  onSave: (id: string, updates: Partial<AdminTeacherItem>) => Promise<void>
}

const TeacherDrawerEditForm: React.FC<EditFormProps> = ({ teacher, onCancel, onSave }) => {
  const [editName, setEditName] = useState(teacher.name)
  const [editEmail, setEditEmail] = useState(teacher.email)
  const [editPhone, setEditPhone] = useState(teacher.phone || '0901 234 567')
  const [editSubject, setEditSubject] = useState(teacher.subject)
  const [editQualifications, setEditQualifications] = useState(teacher.qualifications || 'Cử nhân Sư phạm')
  const [editExperienceYears, setEditExperienceYears] = useState(teacher.experienceYears || 3)
  const [editBio, setEditBio] = useState(teacher.bio || 'Giáo viên bộ môn tâm huyết với học sinh.')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)
    try {
      await onSave(teacher.id, {
        name: editName.trim(),
        email: editEmail.trim(),
        phone: editPhone.trim(),
        subject: editSubject,
        qualifications: editQualifications.trim(),
        experienceYears: Number(editExperienceYears),
        bio: editBio.trim(),
      })
      onCancel()
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSave} className="teacher-drawer-form">
      <div className="form-group">
        <label className="form-label" htmlFor="edit-tch-name">Họ và tên</label>
        <input
          id="edit-tch-name"
          type="text"
          className="form-input"
          value={editName}
          onChange={(e) => setEditName(e.target.value)}
          required
        />
      </div>

      <div className="form-row-2">
        <div className="form-group">
          <label className="form-label" htmlFor="edit-tch-email">Email</label>
          <input
            id="edit-tch-email"
            type="email"
            className="form-input"
            value={editEmail}
            onChange={(e) => setEditEmail(e.target.value)}
            required
          />
        </div>
        <div className="form-group">
          <label className="form-label" htmlFor="edit-tch-phone">Số điện thoại</label>
          <input
            id="edit-tch-phone"
            type="text"
            className="form-input"
            value={editPhone}
            onChange={(e) => setEditPhone(e.target.value)}
          />
        </div>
      </div>

      <div className="form-row-2">
        <div className="form-group">
          <label className="form-label" htmlFor="edit-tch-subject">Bộ môn phụ trách</label>
          <select
            id="edit-tch-subject"
            className="form-select"
            value={editSubject}
            onChange={(e) => setEditSubject(e.target.value)}
          >
            <option value="Toán học 12">Toán học 12</option>
            <option value="Vật lý 12">Vật lý 12</option>
            <option value="Hóa học 12">Hóa học 12</option>
            <option value="Ngữ văn 12">Ngữ văn 12</option>
            <option value="Tiếng Anh 12">Tiếng Anh 12</option>
          </select>
        </div>
        <div className="form-group">
          <label className="form-label" htmlFor="edit-tch-exp">Số năm kinh nghiệm</label>
          <input
            id="edit-tch-exp"
            type="number"
            min="0"
            max="45"
            className="form-input"
            value={editExperienceYears}
            onChange={(e) => setEditExperienceYears(Number(e.target.value))}
          />
        </div>
      </div>

      <div className="form-group">
        <label className="form-label" htmlFor="edit-tch-qual">Bằng cấp & Học vị</label>
        <input
          id="edit-tch-qual"
          type="text"
          className="form-input"
          value={editQualifications}
          onChange={(e) => setEditQualifications(e.target.value)}
        />
      </div>

      <div className="form-group">
        <label className="form-label" htmlFor="edit-tch-bio">Giới thiệu ngắn / Tiểu sử</label>
        <textarea
          id="edit-tch-bio"
          rows={3}
          className="form-textarea"
          value={editBio}
          onChange={(e) => setEditBio(e.target.value)}
        />
      </div>

      <div className="teacher-drawer-form-actions">
        <button
          type="button"
          className="btn btn-secondary"
          onClick={onCancel}
          disabled={isSubmitting}
        >
          <RotateCcw size={14} />
          <span>Hủy bỏ</span>
        </button>
        <button
          type="submit"
          className="btn btn-primary"
          disabled={isSubmitting}
        >
          <Save size={14} />
          <span>{isSubmitting ? 'Đang lưu...' : 'Lưu thay đổi'}</span>
        </button>
      </div>
    </form>
  )
}

export const TeacherDetailDrawer: React.FC<TeacherDetailDrawerProps> = ({
  isOpen,
  teacher,
  onClose,
  onSaveEdit,
  onChangeTeachingStatus,
  onToggleLockAccount,
}) => {
  const [isEditing, setIsEditing] = useState(false)
  const [activeTab, setActiveTab] = useState<'profile' | 'teaching' | 'account'>('profile')
  const drawerRef = useRef<HTMLDivElement>(null)

  // ESC key to close drawer
  useEffect(() => {
    if (!isOpen) return
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (isEditing) {
          setIsEditing(false)
        } else {
          onClose()
        }
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, isEditing, onClose])

  if (!isOpen || !teacher) return null

  const isLocked = teacher.accountStatus === 'LOCKED'

  return (
    <>
      {/* Backdrop Overlay */}
      <div
        className="teacher-drawer-backdrop"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Sliding Drawer Container */}
      <aside
        className="teacher-detail-drawer"
        ref={drawerRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="teacher-drawer-name"
      >
        {/* Drawer Header */}
        <div className="teacher-drawer-header">
          <div className="teacher-drawer-header-left">
            <div className="teacher-avatar-lg" aria-hidden="true">
              {teacher.name.charAt(0).toUpperCase()}
            </div>
            <div className="teacher-drawer-header-meta">
              <span className="teacher-drawer-eyebrow" style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted, #627d98)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                Hồ sơ giáo viên
              </span>
              <h2 id="teacher-drawer-name" className="teacher-drawer-title">
                {teacher.name}
              </h2>
              <div className="teacher-drawer-tags">
                <span className="teacher-subject-pill">{teacher.subject}</span>
                <StatusBadge status={teacher.status} />
                {isLocked && (
                  <span className="teacher-locked-badge">
                    <Lock size={10} aria-hidden="true" />
                    <span>Đã khóa</span>
                  </span>
                )}
              </div>
            </div>
          </div>

          <button
            type="button"
            className="teacher-drawer-close-btn"
            onClick={onClose}
            aria-label="Đóng bảng thông tin giáo viên"
          >
            <X size={18} />
          </button>
        </div>

        {/* Drawer Navigation Tabs */}
        <div className="teacher-drawer-tabs">
          <button
            type="button"
            className={`teacher-drawer-tab ${activeTab === 'profile' ? 'active' : ''}`}
            onClick={() => setActiveTab('profile')}
          >
            Hồ sơ & Chuyên môn
          </button>
          <button
            type="button"
            className={`teacher-drawer-tab ${activeTab === 'teaching' ? 'active' : ''}`}
            onClick={() => setActiveTab('teaching')}
          >
            Lớp học & Đánh giá
          </button>
          <button
            type="button"
            className={`teacher-drawer-tab ${activeTab === 'account' ? 'active' : ''}`}
            onClick={() => setActiveTab('account')}
          >
            Tài khoản & Thao tác
          </button>
        </div>

        {/* Drawer Content */}
        <div className="teacher-drawer-body">
          {isEditing ? (
            <TeacherDrawerEditForm
              key={teacher.id}
              teacher={teacher}
              onCancel={() => setIsEditing(false)}
              onSave={onSaveEdit}
            />
          ) : (
            /* View Details Mode */
            <>
              {activeTab === 'profile' && (
                <div className="teacher-drawer-tab-pane">
                  <div className="teacher-section-card">
                    <h3 className="teacher-section-title">Thông tin liên hệ & Cơ bản</h3>
                    <div className="teacher-field-list">
                      <div className="teacher-field-item">
                        <span className="teacher-field-label">
                          <Mail size={13} aria-hidden="true" /> Email:
                        </span>
                        <strong className="teacher-field-val">{teacher.email}</strong>
                      </div>
                      <div className="teacher-field-item">
                        <span className="teacher-field-label">
                          <Phone size={13} aria-hidden="true" /> Điện thoại:
                        </span>
                        <strong className="teacher-field-val">{teacher.phone || '0901 234 567'}</strong>
                      </div>
                      <div className="teacher-field-item">
                        <span className="teacher-field-label">
                          <Calendar size={13} aria-hidden="true" /> Ngày gia nhập:
                        </span>
                        <span className="teacher-field-val">
                          {new Date(teacher.joinedAt).toLocaleDateString('vi-VN')}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="teacher-section-card">
                    <h3 className="teacher-section-title">Học vị & Kinh nghiệm</h3>
                    <div className="teacher-field-list">
                      <div className="teacher-field-item">
                        <span className="teacher-field-label">
                          <Award size={13} aria-hidden="true" /> Bằng cấp chuyên môn:
                        </span>
                        <strong className="teacher-field-val">
                          {teacher.qualifications || 'Thạc sĩ Sư phạm'}
                        </strong>
                      </div>
                      <div className="teacher-field-item">
                        <span className="teacher-field-label">
                          <BookOpen size={13} aria-hidden="true" /> Kinh nghiệm giảng dạy:
                        </span>
                        <span className="teacher-field-val">{teacher.experienceYears || 3} năm</span>
                      </div>
                    </div>
                    {teacher.bio && (
                      <div className="teacher-bio-box">
                        <span className="teacher-bio-label">Tiểu sử tóm tắt:</span>
                        <p className="teacher-bio-text">{teacher.bio}</p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {activeTab === 'teaching' && (
                <div className="teacher-drawer-tab-pane">
                  <div className="teacher-section-card">
                    <h3 className="teacher-section-title">Lớp học phân công</h3>
                    <div className="teacher-classes-grid">
                      {teacher.classes && teacher.classes.length > 0 ? (
                        teacher.classes.map((cls) => (
                          <div key={cls} className="teacher-class-card">
                            <span className="class-code">{cls}</span>
                            <span className="class-meta">Khối 12 · Chuẩn</span>
                          </div>
                        ))
                      ) : (
                        <span className="teacher-class-empty">Chưa có phân công lớp học.</span>
                      )}
                    </div>
                  </div>

                  <div className="teacher-section-card">
                    <h3 className="teacher-section-title">Chỉ số quy mô & Đánh giá</h3>
                    <div className="teacher-stats-duo">
                      <div className="teacher-stat-cell">
                        <div className="stat-icon-wrap" style={{ background: 'rgba(16, 42, 67, 0.06)' }}>
                          <Users size={16} />
                        </div>
                        <div>
                          <span className="stat-val">{teacher.studentCount}</span>
                          <span className="stat-lbl">Học sinh theo học</span>
                        </div>
                      </div>
                      <div className="teacher-stat-cell">
                        <div className="stat-icon-wrap" style={{ background: 'rgba(245, 158, 11, 0.1)', color: '#d97706' }}>
                          <Star size={16} fill="#f59e0b" />
                        </div>
                        <div>
                          <span className="stat-val">{teacher.rating.toFixed(2)} / 5.0</span>
                          <span className="stat-lbl">Đánh giá trung bình</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'account' && (
                <div className="teacher-drawer-tab-pane">
                  <div className="teacher-section-card">
                    <h3 className="teacher-section-title">Tình trạng tài khoản</h3>
                    <div className="teacher-field-list">
                      <div className="teacher-field-item">
                        <span className="teacher-field-label">Trạng thái đăng nhập:</span>
                        <span className="teacher-field-val">
                          {isLocked ? (
                            <span style={{ color: '#dc2626', fontWeight: 600 }}>Tài khoản đang bị khóa</span>
                          ) : (
                            <span style={{ color: '#16a34a', fontWeight: 600 }}>Hoạt động bình thường</span>
                          )}
                        </span>
                      </div>
                      <div className="teacher-field-item">
                        <span className="teacher-field-label">Trạng thái giảng dạy:</span>
                        <StatusBadge status={teacher.status} />
                      </div>
                    </div>
                  </div>

                  <div className="teacher-section-card">
                    <h3 className="teacher-section-title">Thao tác tài khoản</h3>
                    <div className="teacher-account-actions-list">
                      <button
                        type="button"
                        className="btn btn-secondary btn-full"
                        onClick={() => onChangeTeachingStatus(teacher)}
                      >
                        <CalendarCheck size={14} />
                        <span>Đổi trạng thái giảng dạy</span>
                      </button>
                      <button
                        type="button"
                        className={`btn ${isLocked ? 'btn-secondary text-success' : 'btn-danger'} btn-full`}
                        onClick={() => onToggleLockAccount(teacher)}
                      >
                        {isLocked ? <Unlock size={14} /> : <Lock size={14} />}
                        <span>{isLocked ? 'Mở khóa tài khoản' : 'Khóa tài khoản giáo viên'}</span>
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* Drawer Footer Actions */}
        <div className="teacher-drawer-footer">
          {!isEditing ? (
            <>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => setIsEditing(true)}
              >
                <Edit2 size={14} />
                <span>Chỉnh sửa hồ sơ</span>
              </button>
              <Link
                to="/teacher"
                className="btn btn-primary"
                title="Truy cập Teacher Workspace"
              >
                <span>Teacher Workspace</span>
                <ExternalLink size={14} />
              </Link>
            </>
          ) : (
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => setIsEditing(false)}
            >
              Hủy chỉnh sửa
            </button>
          )}
        </div>
      </aside>
    </>
  )
}

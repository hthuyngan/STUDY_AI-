import React, { useState, useEffect, useCallback } from 'react'
import { X, UserPlus, AlertCircle } from 'lucide-react'

export interface CreateTeacherModalProps {
  isOpen: boolean
  onClose: () => void
  onSubmit: (data: {
    name: string
    email: string
    phone: string
    subject: string
    classes: string[]
    qualifications: string
    experienceYears: number
    status: 'active' | 'pending' | 'inactive'
    bio: string
  }) => Promise<void>
}

export const CreateTeacherModal: React.FC<CreateTeacherModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
}) => {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [subject, setSubject] = useState('Toán học 12')
  const [classesInput, setClassesInput] = useState('12A1, 12A2')
  const [qualifications, setQualifications] = useState('Cử nhân Sư phạm')
  const [experienceYears, setExperienceYears] = useState(3)
  const [status, setStatus] = useState<'active' | 'pending' | 'inactive'>('active')
  const [bio, setBio] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleModalClose = useCallback(() => {
    if (isSubmitting) return
    setName('')
    setEmail('')
    setPhone('')
    setError(null)
    onClose()
  }, [isSubmitting, onClose])

  // ESC key to close modal
  useEffect(() => {
    if (!isOpen) return
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !isSubmitting) {
        handleModalClose()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, isSubmitting, handleModalClose])

  if (!isOpen) return null

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (!name.trim()) {
      setError('Vui lòng nhập họ và tên giáo viên.')
      return
    }
    if (!email.trim() || !email.includes('@')) {
      setError('Vui lòng nhập địa chỉ email hợp lệ.')
      return
    }

    const classes = classesInput
      .split(',')
      .map((c) => c.trim())
      .filter(Boolean)

    setIsSubmitting(true)
    try {
      await onSubmit({
        name: name.trim(),
        email: email.trim(),
        phone: phone.trim() || '0901 234 567',
        subject,
        classes: classes.length > 0 ? classes : ['12A1'],
        qualifications: qualifications.trim(),
        experienceYears: Math.max(0, Number(experienceYears) || 0),
        status,
        bio: bio.trim(),
      })
      handleModalClose()
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Lỗi khi tạo giáo viên mới.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="admin-dialog-backdrop" onClick={handleModalClose} role="presentation">
      <div
        className="admin-dialog-card teacher-modal-card"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="create-teacher-title"
      >
        {/* Modal Header */}
        <div className="admin-dialog-header">
          <div className="admin-dialog-title-wrap">
            <span className="admin-form-icon-wrap" aria-hidden="true">
              <UserPlus size={16} />
            </span>
            <h2 id="create-teacher-title" className="admin-dialog-title">
              Thêm giáo viên mới
            </h2>
          </div>
          <button
            type="button"
            className="admin-dialog-close"
            onClick={handleModalClose}
            aria-label="Đóng hộp thoại"
            disabled={isSubmitting}
          >
            <X size={16} />
          </button>
        </div>

        {/* Modal Form Body */}
        <form onSubmit={handleSubmit} noValidate>
          <div className="admin-dialog-body teacher-modal-body">
            {error && (
              <div className="teacher-form-error" role="alert">
                <AlertCircle size={16} aria-hidden="true" style={{ flexShrink: 0 }} />
                <span>{error}</span>
              </div>
            )}

            <div className="teacher-form-grid">
              {/* Họ và tên giáo viên — full width */}
              <div className="teacher-form-field teacher-form-field--full">
                <label className="teacher-form-label" htmlFor="create-tch-name">
                  Họ và tên giáo viên
                  <span className="teacher-required-star" aria-hidden="true">*</span>
                </label>
                <input
                  id="create-tch-name"
                  name="name"
                  type="text"
                  className="teacher-form-input"
                  placeholder="Ví dụ: ThS. Nguyễn Hoàng Nam"
                  value={name}
                  onChange={(e) => {
                    setName(e.target.value)
                    if (error) setError(null)
                  }}
                  required
                  autoFocus
                />
              </div>

              {/* Địa chỉ Email — Cột 1 */}
              <div className="teacher-form-field">
                <label className="teacher-form-label" htmlFor="create-tch-email">
                  Địa chỉ Email
                  <span className="teacher-required-star" aria-hidden="true">*</span>
                </label>
                <input
                  id="create-tch-email"
                  name="email"
                  type="email"
                  className="teacher-form-input"
                  placeholder="giaovien@studyai.edu.vn"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value)
                    if (error) setError(null)
                  }}
                  required
                />
              </div>

              {/* Số điện thoại — Cột 2 */}
              <div className="teacher-form-field">
                <label className="teacher-form-label" htmlFor="create-tch-phone">
                  Số điện thoại
                </label>
                <input
                  id="create-tch-phone"
                  name="phone"
                  type="tel"
                  className="teacher-form-input"
                  placeholder="0912 345 678"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                />
              </div>

              {/* Bộ môn phụ trách — Cột 1 */}
              <div className="teacher-form-field">
                <label className="teacher-form-label" htmlFor="create-tch-subject">
                  Bộ môn phụ trách
                </label>
                <select
                  id="create-tch-subject"
                  name="subject"
                  className="teacher-form-select"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                >
                  <option value="Toán học 12">Toán học 12</option>
                  <option value="Vật lý 12">Vật lý 12</option>
                  <option value="Hóa học 12">Hóa học 12</option>
                  <option value="Ngữ văn 12">Ngữ văn 12</option>
                  <option value="Tiếng Anh 12">Tiếng Anh 12</option>
                </select>
              </div>

              {/* Trạng thái giảng dạy — Cột 2 */}
              <div className="teacher-form-field">
                <label className="teacher-form-label" htmlFor="create-tch-status">
                  Trạng thái giảng dạy
                </label>
                <select
                  id="create-tch-status"
                  name="status"
                  className="teacher-form-select"
                  value={status}
                  onChange={(e) => setStatus(e.target.value as 'active' | 'pending' | 'inactive')}
                >
                  <option value="active">Đang giảng dạy (Active)</option>
                  <option value="pending">Chờ phê duyệt hồ sơ</option>
                  <option value="inactive">Tạm ngừng</option>
                </select>
              </div>

              {/* Lớp phụ trách — Cột 1 (với helper text bên dưới) */}
              <div className="teacher-form-field">
                <label className="teacher-form-label" htmlFor="create-tch-classes">
                  Lớp phụ trách
                </label>
                <input
                  id="create-tch-classes"
                  name="classes"
                  type="text"
                  className="teacher-form-input"
                  placeholder="12A1, 12A2"
                  value={classesInput}
                  onChange={(e) => setClassesInput(e.target.value)}
                  aria-describedby="create-tch-classes-helper"
                />
                <span id="create-tch-classes-helper" className="teacher-form-helper">
                  Nhập nhiều lớp, ngăn cách bằng dấu phẩy. Ví dụ: 12A1, 12A2.
                </span>
              </div>

              {/* Kinh nghiệm (năm) — Cột 2 */}
              <div className="teacher-form-field">
                <label className="teacher-form-label" htmlFor="create-tch-exp">
                  Kinh nghiệm (năm)
                </label>
                <input
                  id="create-tch-exp"
                  name="experienceYears"
                  type="number"
                  min="0"
                  max="45"
                  className="teacher-form-input"
                  value={experienceYears}
                  onChange={(e) => setExperienceYears(Math.max(0, Number(e.target.value) || 0))}
                />
              </div>

              {/* Bằng cấp / Học vị — full width */}
              <div className="teacher-form-field teacher-form-field--full">
                <label className="teacher-form-label" htmlFor="create-tch-qual">
                  Bằng cấp / Học vị
                </label>
                <input
                  id="create-tch-qual"
                  name="qualifications"
                  type="text"
                  className="teacher-form-input"
                  placeholder="Ví dụ: ThS. Phương pháp Giảng dạy Toán"
                  value={qualifications}
                  onChange={(e) => setQualifications(e.target.value)}
                />
              </div>

              {/* Giới thiệu ngắn / Tiểu sử — full width */}
              <div className="teacher-form-field teacher-form-field--full">
                <label className="teacher-form-label" htmlFor="create-tch-bio">
                  Giới thiệu ngắn / Tiểu sử
                </label>
                <textarea
                  id="create-tch-bio"
                  name="bio"
                  rows={3}
                  className="teacher-form-textarea"
                  placeholder="Mô tả kinh nghiệm, phương pháp giảng dạy..."
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                />
              </div>
            </div>
          </div>

          {/* Modal Footer */}
          <div className="admin-dialog-footer">
            <button
              type="button"
              className="btn btn-secondary"
              onClick={handleModalClose}
              disabled={isSubmitting}
            >
              Hủy bỏ
            </button>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Đang tạo...' : 'Tạo giáo viên'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

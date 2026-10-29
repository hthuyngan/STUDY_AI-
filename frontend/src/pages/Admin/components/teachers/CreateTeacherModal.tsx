import React, { useState, useEffect } from 'react'
import { X, UserPlus } from 'lucide-react'

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

  // ESC key to close modal
  useEffect(() => {
    if (!isOpen) return
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !isSubmitting) {
        onClose()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, isSubmitting, onClose])

  if (!isOpen) return null

  const handleModalClose = () => {
    setName('')
    setEmail('')
    setPhone('')
    setError(null)
    onClose()
  }

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
        experienceYears: Number(experienceYears) || 0,
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
    <div className="admin-dialog-backdrop" onClick={onClose} role="presentation">
      <div
        className="admin-dialog-card teacher-modal-card"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="create-teacher-title"
      >
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
            onClick={onClose}
            aria-label="Đóng hộp thoại"
            disabled={isSubmitting}
          >
            <X size={16} />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="admin-dialog-body">
            {error && (
              <div className="teacher-form-error" role="alert">
                {error}
              </div>
            )}

            <div className="form-group">
              <label className="form-label" htmlFor="create-tch-name">
                Họ và tên giáo viên <span className="text-danger">*</span>
              </label>
              <input
                id="create-tch-name"
                type="text"
                className="form-input"
                placeholder="Ví dụ: ThS. Nguyễn Hoàng Nam"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </div>

            <div className="form-row-2">
              <div className="form-group">
                <label className="form-label" htmlFor="create-tch-email">
                  Địa chỉ Email <span className="text-danger">*</span>
                </label>
                <input
                  id="create-tch-email"
                  type="email"
                  className="form-input"
                  placeholder="giaovien@studyai.edu.vn"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label" htmlFor="create-tch-phone">
                  Số điện thoại
                </label>
                <input
                  id="create-tch-phone"
                  type="text"
                  className="form-input"
                  placeholder="0912 345 678"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                />
              </div>
            </div>

            <div className="form-row-2">
              <div className="form-group">
                <label className="form-label" htmlFor="create-tch-subject">
                  Bộ môn phụ trách
                </label>
                <select
                  id="create-tch-subject"
                  className="form-select"
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

              <div className="form-group">
                <label className="form-label" htmlFor="create-tch-status">
                  Trạng thái giảng dạy
                </label>
                <select
                  id="create-tch-status"
                  className="form-select"
                  value={status}
                  onChange={(e) => setStatus(e.target.value as 'active' | 'pending' | 'inactive')}
                >
                  <option value="active">Đang giảng dạy (Active)</option>
                  <option value="pending">Chờ phê duyệt hồ sơ</option>
                  <option value="inactive">Tạm ngừng</option>
                </select>
              </div>
            </div>

            <div className="form-row-2">
              <div className="form-group">
                <label className="form-label" htmlFor="create-tch-classes">
                  Lớp phụ trách (ngăn cách bởi dấu phẩy)
                </label>
                <input
                  id="create-tch-classes"
                  type="text"
                  className="form-input"
                  placeholder="12A1, 12A2"
                  value={classesInput}
                  onChange={(e) => setClassesInput(e.target.value)}
                />
              </div>

              <div className="form-group">
                <label className="form-label" htmlFor="create-tch-exp">
                  Kinh nghiệm (năm)
                </label>
                <input
                  id="create-tch-exp"
                  type="number"
                  min="0"
                  max="45"
                  className="form-input"
                  value={experienceYears}
                  onChange={(e) => setExperienceYears(Number(e.target.value))}
                />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="create-tch-qual">
                Bằng cấp / Học vị
              </label>
              <input
                id="create-tch-qual"
                type="text"
                className="form-input"
                placeholder="Ví dụ: Thạc sĩ Phương pháp Giảng dạy Toán"
                value={qualifications}
                onChange={(e) => setQualifications(e.target.value)}
              />
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="create-tch-bio">
                Giới thiệu ngắn / Tiểu sử
              </label>
              <textarea
                id="create-tch-bio"
                rows={2}
                className="form-textarea"
                placeholder="Mô tả kinh nghiệm, phương pháp giảng dạy..."
                value={bio}
                onChange={(e) => setBio(e.target.value)}
              />
            </div>
          </div>

          <div className="admin-dialog-footer">
            <button
              type="button"
              className="btn btn-secondary"
              onClick={onClose}
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

import React, { useState, useEffect } from 'react'
import { X, CalendarCheck, CheckCircle2, Clock, AlertCircle } from 'lucide-react'
import type { AdminTeacherItem } from '@/types/education'

export interface ChangeTeachingStatusModalProps {
  isOpen: boolean
  teacher: AdminTeacherItem | null
  onClose: () => void
  onConfirm: (teacherId: string, newStatus: 'active' | 'pending' | 'inactive') => Promise<void>
}

interface FormProps {
  teacher: AdminTeacherItem
  onClose: () => void
  onConfirm: (teacherId: string, newStatus: 'active' | 'pending' | 'inactive') => Promise<void>
}

const ChangeTeachingStatusForm: React.FC<FormProps> = ({ teacher, onClose, onConfirm }) => {
  const [selectedStatus, setSelectedStatus] = useState<'active' | 'pending' | 'inactive'>(teacher.status)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)
    try {
      await onConfirm(teacher.id, selectedStatus)
      onClose()
    } finally {
      setIsSubmitting(false)
    }
  }

  const statusOptions = [
    {
      value: 'active' as const,
      label: 'Đang giảng dạy (Active)',
      description: 'Giáo viên phụ trách các lớp bình thường, có thể chấm bài và giao bài tập.',
      icon: CheckCircle2,
      color: '#16a34a',
    },
    {
      value: 'pending' as const,
      label: 'Chờ phê duyệt / Tạm nghỉ (Pending)',
      description: 'Tạm dừng nhận phân công lớp mới; các lớp hiện tại được bảo lưu.',
      icon: Clock,
      color: '#d97706',
    },
    {
      value: 'inactive' as const,
      label: 'Tạm ngừng giảng dạy (Inactive)',
      description: 'Dừng hoạt động giảng dạy trên hệ thống cho đến khi được kích hoạt lại.',
      icon: AlertCircle,
      color: '#dc2626',
    },
  ]

  return (
    <form onSubmit={handleSubmit}>
      <div className="admin-dialog-body">
        {/* Teacher Preview Pill */}
        <div className="teacher-status-preview-box">
          <div className="teacher-avatar-sm" aria-hidden="true">
            {teacher.name.charAt(0).toUpperCase()}
          </div>
          <div>
            <span className="teacher-status-name">{teacher.name}</span>
            <span className="teacher-status-subject">{teacher.subject} • {teacher.email}</span>
          </div>
        </div>

        {/* Options List */}
        <div className="teacher-status-options-list">
          {statusOptions.map((opt) => {
            const Icon = opt.icon
            const isSelected = selectedStatus === opt.value

            return (
              <label
                key={opt.value}
                className={`teacher-status-option ${isSelected ? 'selected' : ''}`}
              >
                <input
                  type="radio"
                  name="teachingStatus"
                  value={opt.value}
                  checked={isSelected}
                  onChange={() => setSelectedStatus(opt.value)}
                  className="sr-only"
                />
                <div className="status-opt-icon" style={{ color: opt.color }}>
                  <Icon size={18} />
                </div>
                <div className="status-opt-content">
                  <span className="status-opt-label">{opt.label}</span>
                  <span className="status-opt-desc">{opt.description}</span>
                </div>
              </label>
            )
          })}
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
          {isSubmitting ? 'Đang cập nhật...' : 'Cập nhật trạng thái'}
        </button>
      </div>
    </form>
  )
}

export const ChangeTeachingStatusModal: React.FC<ChangeTeachingStatusModalProps> = ({
  isOpen,
  teacher,
  onClose,
  onConfirm,
}) => {
  useEffect(() => {
    if (!isOpen) return
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, onClose])

  if (!isOpen || !teacher) return null

  return (
    <div className="admin-dialog-backdrop" onClick={onClose} role="presentation">
      <div
        className="admin-dialog-card teacher-status-modal-card"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="change-status-title"
      >
        <div className="admin-dialog-header">
          <div className="admin-dialog-title-wrap">
            <span className="admin-form-icon-wrap" aria-hidden="true">
              <CalendarCheck size={16} />
            </span>
            <h2 id="change-status-title" className="admin-dialog-title">
              Đổi trạng thái giảng dạy
            </h2>
          </div>
          <button
            type="button"
            className="admin-dialog-close"
            onClick={onClose}
            aria-label="Đóng hộp thoại"
          >
            <X size={16} />
          </button>
        </div>

        <ChangeTeachingStatusForm
          key={teacher.id}
          teacher={teacher}
          onClose={onClose}
          onConfirm={onConfirm}
        />
      </div>
    </div>
  )
}

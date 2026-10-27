import React from 'react'
import {
  AlertCircle,
  AlertTriangle,
  CheckCircle2,
  Clock,
  HelpCircle,
} from 'lucide-react'
import './StatusBadge.css'

export type StatusVariant =
  | 'active'
  | 'success'
  | 'warning'
  | 'danger'
  | 'info'
  | 'neutral'

export interface StatusBadgeProps {
  status: string
  label?: string
  variant?: StatusVariant
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({
  status,
  label,
  variant,
}) => {
  // Infer variant and icon based on standard status keys
  let inferredVariant: StatusVariant = variant || 'neutral'
  let IconComponent = HelpCircle
  let displayLabel = label || status

  const s = status.toLowerCase()

  if (s === 'active' || s === 'published' || s === 'approved' || s === 'on-track' || s === 'resolved') {
    inferredVariant = variant || 'success'
    IconComponent = CheckCircle2
    if (!label) {
      if (s === 'active') displayLabel = 'Hoạt động'
      if (s === 'published') displayLabel = 'Đã xuất bản'
      if (s === 'approved') displayLabel = 'Đã duyệt'
      if (s === 'on-track') displayLabel = 'Đạt tiến độ'
      if (s === 'resolved') displayLabel = 'Đã giải quyết'
    }
  } else if (s === 'in-progress' || s === 'in-review' || s === 'waiting') {
    inferredVariant = variant || 'info'
    IconComponent = Clock
    if (!label) {
      if (s === 'in-progress') displayLabel = 'Đang xử lý'
      if (s === 'in-review') displayLabel = 'Chờ duyệt'
      if (s === 'waiting') displayLabel = 'Chờ phản hồi'
    }
  } else if (s === 'draft' || s === 'scheduled' || s === 'pending') {
    inferredVariant = variant || 'neutral'
    IconComponent = Clock
    if (!label) {
      if (s === 'draft') displayLabel = 'Bản nháp'
      if (s === 'scheduled') displayLabel = 'Đã lên lịch'
      if (s === 'pending') displayLabel = 'Chờ xử lý'
    }
  } else if (s === 'needs-attention' || s === 'changes-requested' || s === 'open') {
    inferredVariant = variant || 'warning'
    IconComponent = AlertTriangle
    if (!label) {
      if (s === 'needs-attention') displayLabel = 'Cần chú ý'
      if (s === 'changes-requested') displayLabel = 'Yêu cầu sửa'
      if (s === 'open') displayLabel = 'Mới tạo'
    }
  } else if (s === 'suspended' || s === 'archived' || s === 'closed' || s === 'urgent') {
    inferredVariant = variant || 'danger'
    IconComponent = AlertCircle
    if (!label) {
      if (s === 'suspended') displayLabel = 'Tạm khóa'
      if (s === 'archived') displayLabel = 'Đã lưu trữ'
      if (s === 'closed') displayLabel = 'Đã đóng'
      if (s === 'urgent') displayLabel = 'Khẩn cấp'
    }
  }

  return (
    <span className={`status-badge status-variant-${inferredVariant}`}>
      <IconComponent size={12} className="status-badge-icon" aria-hidden="true" />
      <span className="status-badge-text">{displayLabel}</span>
    </span>
  )
}

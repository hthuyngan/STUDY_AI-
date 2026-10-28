import React from 'react'
import {
  CheckCircle2,
  Clock,
  AlertTriangle,
  AlertCircle,
  HelpCircle,
} from 'lucide-react'
import './staff-shared.css'

export interface StaffStatusBadgeProps {
  status: string
  label?: string
}

export const StaffStatusBadge: React.FC<StaffStatusBadgeProps> = ({
  status,
  label,
}) => {
  const s = status.toLowerCase()
  let className = 'status-pending'
  let Icon = Clock
  let text = label || status

  if (
    s === 'active' ||
    s === 'published' ||
    s === 'approved' ||
    s === 'resolved' ||
    s === 'completed'
  ) {
    className = 'status-active'
    Icon = CheckCircle2
    if (!label) {
      if (s === 'active') text = 'Hoạt động'
      if (s === 'published') text = 'Đã xuất bản'
      if (s === 'approved') text = 'Đã duyệt'
      if (s === 'resolved') text = 'Đã xử lý'
      if (s === 'completed') text = 'Hoàn thành'
    }
  } else if (
    s === 'in-progress' ||
    s === 'in-review' ||
    s === 'waiting' ||
    s === 'review'
  ) {
    className = 'status-in-progress'
    Icon = Clock
    if (!label) {
      if (s === 'in-progress') text = 'Đang xử lý'
      if (s === 'in-review' || s === 'review') text = 'Chờ duyệt'
      if (s === 'waiting') text = 'Chờ phản hồi'
    }
  } else if (
    s === 'needs-attention' ||
    s === 'changes-requested' ||
    s === 'open' ||
    s === 'warning'
  ) {
    className = 'status-needs-attention'
    Icon = AlertTriangle
    if (!label) {
      if (s === 'needs-attention') text = 'Cần chú ý'
      if (s === 'changes-requested') text = 'Yêu cầu sửa'
      if (s === 'open') text = 'Mới tạo'
    }
  } else if (
    s === 'suspended' ||
    s === 'archived' ||
    s === 'urgent' ||
    s === 'closed'
  ) {
    className = 'status-suspended'
    Icon = AlertCircle
    if (!label) {
      if (s === 'suspended') text = 'Tạm khóa'
      if (s === 'archived') text = 'Đã lưu trữ'
      if (s === 'urgent') text = 'Khẩn cấp'
      if (s === 'closed') text = 'Đã đóng'
    }
  } else if (s === 'draft' || s === 'scheduled') {
    className = 'status-draft'
    Icon = Clock
    if (!label) {
      if (s === 'draft') text = 'Bản nháp'
      if (s === 'scheduled') text = 'Đã lên lịch'
    }
  } else {
    Icon = HelpCircle
  }

  return (
    <span className={`staff-status-badge ${className}`}>
      <Icon size={12} aria-hidden="true" />
      <span>{text}</span>
    </span>
  )
}

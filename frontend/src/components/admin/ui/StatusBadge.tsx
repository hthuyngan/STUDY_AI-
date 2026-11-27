import React from 'react'
import { AdminBadge } from './AdminBadge'
import type { AdminBadgeProps } from './AdminBadge'

export interface StatusBadgeProps {
  status: string
  showDot?: boolean
  className?: string
}

const STATUS_MAP: Record<string, { label: string; variant: AdminBadgeProps['variant'] }> = {
  active: { label: 'Hoạt động', variant: 'success' },
  suspended: { label: 'Tạm khóa', variant: 'warning' },
  disabled: { label: 'Vô hiệu hóa', variant: 'danger' },
  pending: { label: 'Chờ duyệt', variant: 'warning' },
  published: { label: 'Đã xuất bản', variant: 'success' },
  draft: { label: 'Bản nháp', variant: 'neutral' },
  in_review: { label: 'Chờ kiểm duyệt', variant: 'warning' },
  archived: { label: 'Lưu trữ', variant: 'neutral' },
  OPEN: { label: 'Mới tạo', variant: 'primary' },
  IN_PROGRESS: { label: 'Đang xử lý', variant: 'warning' },
  WAITING_FOR_USER: { label: 'Chờ phản hồi', variant: 'warning' },
  RESOLVED: { label: 'Đã giải quyết', variant: 'success' },
  CLOSED: { label: 'Đã đóng', variant: 'neutral' },
  LOW: { label: 'Thấp', variant: 'neutral' },
  MEDIUM: { label: 'Trung bình', variant: 'primary' },
  HIGH: { label: 'Cao', variant: 'warning' },
  URGENT: { label: 'Khẩn cấp', variant: 'danger' },
  healthy: { label: 'Ổn định', variant: 'success' },
  degraded: { label: 'Suy giảm', variant: 'warning' },
  unhealthy: { label: 'Lỗi', variant: 'danger' },
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({
  status,
  showDot = true,
  className = '',
}) => {
  const normalized = STATUS_MAP[status] || STATUS_MAP[status.toLowerCase()]
  return (
    <AdminBadge
      variant={normalized?.variant ?? 'neutral'}
      showDot={showDot}
      className={className}
    >
      {normalized?.label ?? status}
    </AdminBadge>
  )
}

import React from 'react'
import { SummaryStrip, type SummaryStripItem } from '@/components/ui/SummaryStrip'

export type AdminSummaryStripItem = SummaryStripItem

export interface AdminSummaryStripProps {
  items: AdminSummaryStripItem[]
  ariaLabel?: string
  className?: string
}

export const AdminSummaryStrip: React.FC<AdminSummaryStripProps> = ({
  items,
  ariaLabel = 'Thống kê tổng quan nhanh',
  className = '',
}) => {
  return <SummaryStrip items={items} ariaLabel={ariaLabel} className={className} />
}

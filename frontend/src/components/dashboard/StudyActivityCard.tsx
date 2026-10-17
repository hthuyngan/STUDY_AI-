import { useState } from 'react'
import { TrendingUp } from 'lucide-react'
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { Card } from '@/components/ui/Card'
import type { ActivityDataPoint } from '@/types/dashboard'

export interface StudyActivityCardProps {
  points: ActivityDataPoint[]
  weeklyHours: number
  increasePercent: number
}

interface CustomTooltipProps {
  active?: boolean
  payload?: Array<{ value: number; payload: ActivityDataPoint }>
}

function CustomBarTooltip({ active, payload }: CustomTooltipProps) {
  if (active && payload && payload.length) {
    const data = payload[0].payload
    return (
      <div className="chart-tooltip-box">
        <div className="chart-tooltip-title">{data.fullDay}</div>
        <div className="chart-tooltip-value">
          <strong>{data.minutes}</strong> phút học · <strong>{data.lessons}</strong> bài
        </div>
      </div>
    )
  }
  return null
}

export function StudyActivityCard({
  points,
  weeklyHours,
  increasePercent,
}: StudyActivityCardProps) {
  const [period, setPeriod] = useState<'week' | 'month'>('week')

  const actionSelect = (
    <div className="chart-select-wrapper">
      <select
        value={period}
        onChange={(e) => setPeriod(e.target.value as 'week' | 'month')}
        className="chart-period-select"
        aria-label="Chọn kỳ báo cáo"
      >
        <option value="week">Tuần này</option>
        <option value="month">Tháng này</option>
      </select>
    </div>
  )

  const footerContent = (
    <div className="chart-card-footer">
      <div className="chart-stat-highlight">
        <span className="chart-stat-number">{weeklyHours} giờ</span>
        <span className="chart-stat-label">học tập tích lũy</span>
      </div>
      <div className="chart-trend-badge">
        <TrendingUp size={14} aria-hidden />
        <span>↑ {increasePercent}% so với tuần trước</span>
      </div>
    </div>
  )

  return (
    <Card
      title="Tiến độ học tập"
      subtitle="Thời gian học và số bài hoàn thành theo ngày"
      action={actionSelect}
      footer={footerContent}
      className="study-activity-card"
    >
      <div className="chart-canvas-wrapper" style={{ width: '100%', height: 220 }}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={points}
            margin={{ top: 12, right: 12, left: -20, bottom: 0 }}
          >
            <CartesianGrid
              vertical={false}
              stroke="var(--border-default)"
              strokeDasharray="0"
            />
            <XAxis
              dataKey="day"
              axisLine={false}
              tickLine={false}
              tick={{ fill: 'var(--text-secondary)', fontSize: 12 }}
            />
            <YAxis
              axisLine={false}
              tickLine={false}
              tickCount={4}
              tick={{ fill: 'var(--text-tertiary)', fontSize: 11 }}
              unit="p"
            />
            <Tooltip
              content={<CustomBarTooltip />}
              cursor={{ fill: 'var(--surface-sunken)', opacity: 0.6 }}
            />
            <Bar
              dataKey="minutes"
              fill="var(--color-primary)"
              radius={[6, 6, 0, 0]}
              maxBarSize={36}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </Card>
  )
}

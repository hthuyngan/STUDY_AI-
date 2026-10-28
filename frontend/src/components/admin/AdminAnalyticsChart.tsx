import React, { useState } from 'react'
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from 'recharts'
import type {
  AnalyticsTrendPoint,
  TimeRangeFilter,
  UserDistributionItem,
} from '@/types/admin'
import './AdminComponents.css'

export interface AdminAnalyticsChartProps {
  trends: AnalyticsTrendPoint[]
  timeRange: TimeRangeFilter
  onTimeRangeChange: (range: TimeRangeFilter) => void
  roleDistribution: UserDistributionItem[]
  statusDistribution: UserDistributionItem[]
}

interface CustomTooltipProps {
  active?: boolean
  payload?: Array<{
    name: string
    value: number
    color: string
    dataKey: string
  }>
  label?: string
}

const CustomChartTooltip: React.FC<CustomTooltipProps> = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    return (
      <div className="admin-chart-tooltip" role="tooltip">
        <div className="admin-chart-tooltip-title">{label}</div>
        <div className="admin-chart-tooltip-items">
          {payload.map((entry) => (
            <div key={entry.dataKey} className="admin-chart-tooltip-row">
              <span
                className="admin-chart-tooltip-dot"
                style={{ backgroundColor: entry.color }}
              />
              <span className="admin-chart-tooltip-label">
                {entry.name === 'completedLessons'
                  ? 'Bài học hoàn thành'
                  : entry.name === 'activeUsers'
                    ? 'Học viên trực tuyến'
                    : 'Bài thu hoạch'}
                :
              </span>
              <span className="admin-chart-tooltip-val">
                {entry.value.toLocaleString('vi-VN')}
              </span>
            </div>
          ))}
        </div>
      </div>
    )
  }
  return null
}

export const AdminAnalyticsChart: React.FC<AdminAnalyticsChartProps> = ({
  trends,
  timeRange,
  onTimeRangeChange,
  roleDistribution,
  statusDistribution,
}) => {
  const [distMode, setDistMode] = useState<'role' | 'status'>('role')
  const currentDistribution = distMode === 'role' ? roleDistribution : statusDistribution

  return (
    <div className="admin-analytics-grid">
      {/* Left 2/3: Learning Activity Chart */}
      <div className="staff-card admin-analytics-main-card">
        <div className="staff-card-header admin-analytics-card-header">
          <div>
            <h2 className="staff-card-title">Hoạt động học tập hệ thống</h2>
            <p className="admin-card-subtitle">
              Tần suất hoàn thành bài học, làm bài thu hoạch và lượng học viên tích cực
            </p>
          </div>
          <div className="admin-time-pill-group" role="group" aria-label="Khoảng thời gian thống kê">
            <button
              type="button"
              className={`admin-time-pill ${timeRange === '7d' ? 'active' : ''}`}
              onClick={() => onTimeRangeChange('7d')}
              aria-pressed={timeRange === '7d'}
            >
              7 ngày
            </button>
            <button
              type="button"
              className={`admin-time-pill ${timeRange === '30d' ? 'active' : ''}`}
              onClick={() => onTimeRangeChange('30d')}
              aria-pressed={timeRange === '30d'}
            >
              30 ngày
            </button>
            <button
              type="button"
              className={`admin-time-pill ${timeRange === 'month' ? 'active' : ''}`}
              onClick={() => onTimeRangeChange('month')}
              aria-pressed={timeRange === 'month'}
            >
              Theo tháng
            </button>
          </div>
        </div>

        <div className="staff-card-body admin-analytics-body">
          <div className="admin-chart-legend-top">
            <span className="legend-indicator">
              <span className="indicator-line lessons" />
              <span>Bài học hoàn thành</span>
            </span>
            <span className="legend-indicator">
              <span className="indicator-line users" />
              <span>Học viên hoạt động</span>
            </span>
            <span className="legend-indicator">
              <span className="indicator-line assessments" />
              <span>Bài thu hoạch đã nộp</span>
            </span>
          </div>

          <div className="admin-recharts-container" style={{ width: '100%', height: 280 }}>
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={trends} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorLessons" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#102A43" stopOpacity={0.25} />
                    <stop offset="95%" stopColor="#102A43" stopOpacity={0.0} />
                  </linearGradient>
                  <linearGradient id="colorUsers" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#2563eb" stopOpacity={0.2} />
                    <stop offset="95%" stopColor="#2563eb" stopOpacity={0.0} />
                  </linearGradient>
                  <linearGradient id="colorAssessments" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.2} />
                    <stop offset="95%" stopColor="#f59e0b" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border-subtle, #e2e8f0)" vertical={false} />
                <XAxis
                  dataKey="date"
                  tick={{ fontSize: 12, fill: 'var(--text-muted, #627d98)' }}
                  tickLine={false}
                  axisLine={{ stroke: 'var(--border-subtle, #e2e8f0)' }}
                />
                <YAxis
                  tick={{ fontSize: 12, fill: 'var(--text-muted, #627d98)' }}
                  tickLine={false}
                  axisLine={false}
                />
                <Tooltip content={<CustomChartTooltip />} />
                <Area
                  type="monotone"
                  dataKey="completedLessons"
                  name="completedLessons"
                  stroke="#102A43"
                  strokeWidth={2}
                  fillOpacity={1}
                  fill="url(#colorLessons)"
                />
                <Area
                  type="monotone"
                  dataKey="activeUsers"
                  name="activeUsers"
                  stroke="#2563eb"
                  strokeWidth={2}
                  fillOpacity={1}
                  fill="url(#colorUsers)"
                />
                <Area
                  type="monotone"
                  dataKey="assessments"
                  name="assessments"
                  stroke="#f59e0b"
                  strokeWidth={1.5}
                  strokeDasharray="4 2"
                  fillOpacity={1}
                  fill="url(#colorAssessments)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Right 1/3: Distribution breakdown */}
      <div className="staff-card admin-analytics-sub-card">
        <div className="staff-card-header admin-analytics-card-header">
          <div>
            <h2 className="staff-card-title">Phân bổ người dùng</h2>
            <p className="admin-card-subtitle">Tỷ lệ theo vai trò và trạng thái tài khoản</p>
          </div>
          <div className="admin-dist-toggle">
            <button
              type="button"
              className={`admin-dist-btn ${distMode === 'role' ? 'active' : ''}`}
              onClick={() => setDistMode('role')}
              aria-label="Xem phân bổ theo vai trò"
            >
              Vai trò
            </button>
            <button
              type="button"
              className={`admin-dist-btn ${distMode === 'status' ? 'active' : ''}`}
              onClick={() => setDistMode('status')}
              aria-label="Xem phân bổ theo trạng thái"
            >
              Trạng thái
            </button>
          </div>
        </div>

        <div className="staff-card-body admin-dist-body">
          <div style={{ width: '100%', height: 160 }}>
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={currentDistribution}
                  dataKey="count"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  innerRadius={38}
                  outerRadius={65}
                  paddingAngle={3}
                >
                  {currentDistribution.map((entry) => (
                    <Cell key={entry.key} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(val) => [
                    `${Number(val ?? 0).toLocaleString('vi-VN')} tài khoản`,
                    'Số lượng',
                  ]}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>

          <div className="admin-dist-list">
            {currentDistribution.map((item) => (
              <div key={item.key} className="admin-dist-row">
                <div className="admin-dist-label-wrap">
                  <span className="admin-dist-bullet" style={{ backgroundColor: item.color }} />
                  <span className="admin-dist-name">{item.name}</span>
                </div>
                <div className="admin-dist-num-wrap">
                  <span className="admin-dist-count">{item.count}</span>
                  <span className="admin-dist-percent">({item.percentage}%)</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

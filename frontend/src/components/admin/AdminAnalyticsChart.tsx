import React, { useState } from 'react'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
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

const SERIES_LABELS: Record<string, string> = {
  completedLessons: 'Bài học hoàn thành',
  practiceSessions: 'Lượt luyện tập',
  assessments: 'Lượt kiểm tra',
  activeUsers: 'Người dùng hoạt động',
  newUsers: 'Người dùng mới',
  aiRequests: 'Lượt sử dụng AI',
  aiErrors: 'Lỗi AI',
}

const CustomChartTooltip: React.FC<CustomTooltipProps> = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    return (
      <div className="admin-chart-tooltip" role="tooltip">
        <div className="admin-chart-tooltip-title">Ngày {label}</div>
        <div className="admin-chart-tooltip-items">
          {payload.map((entry) => (
            <div key={entry.dataKey} className="admin-chart-tooltip-row">
              <span
                className="admin-chart-tooltip-dot"
                style={{ backgroundColor: entry.color }}
              />
              <span className="admin-chart-tooltip-label">
                {SERIES_LABELS[entry.dataKey] || entry.name}:
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
  const [chartMode, setChartMode] = useState<'learning' | 'ai'>('learning')
  const [distMode, setDistMode] = useState<'role' | 'status'>('role')
  const currentDistribution = distMode === 'role' ? roleDistribution : statusDistribution

  return (
    <div className="admin-analytics-grid">
      <div className="staff-card admin-analytics-main-card">
        <div className="staff-card-header admin-analytics-card-header">
          <div>
            <h2 className="staff-card-title">
              {chartMode === 'learning' ? 'Hoạt động học tập theo ngày' : 'Lưu lượng & lỗi AI theo ngày'}
            </h2>
            <p className="admin-card-subtitle">
              {chartMode === 'learning'
                ? 'Biểu đồ cột tổng hợp bài học hoàn thành, lượt luyện tập và bài kiểm tra'
                : 'Biểu đồ cột tổng hợp lượt gọi AI và số lỗi phát sinh theo ngày'}
            </p>
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', alignItems: 'center' }}>
            <div className="admin-time-pill-group" role="group" aria-label="Chế độ biểu đồ">
              <button
                type="button"
                className={`admin-time-pill ${chartMode === 'learning' ? 'active' : ''}`}
                onClick={() => setChartMode('learning')}
                aria-pressed={chartMode === 'learning'}
              >
                Học tập
              </button>
              <button
                type="button"
                className={`admin-time-pill ${chartMode === 'ai' ? 'active' : ''}`}
                onClick={() => setChartMode('ai')}
                aria-pressed={chartMode === 'ai'}
              >
                AI Tutor
              </button>
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
                className={`admin-time-pill ${timeRange === '90d' ? 'active' : ''}`}
                onClick={() => onTimeRangeChange('90d')}
                aria-pressed={timeRange === '90d'}
              >
                90 ngày
              </button>
            </div>
          </div>
        </div>

        <div className="staff-card-body admin-chart-body">
          {trends.length === 0 ? (
            <div style={{ padding: '48px 16px', textAlign: 'center', color: 'var(--admin-text-muted)', fontSize: '13px' }}>
              Chưa có dữ liệu thống kê trong khoảng thời gian đã chọn.
            </div>
          ) : (
            <>
              <div style={{ width: '100%', height: 280 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={trends} margin={{ top: 10, right: 12, left: -16, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" vertical={false} />
                    <XAxis
                      dataKey="date"
                      tick={{ fontSize: 11, fill: '#64748B' }}
                      axisLine={{ stroke: '#E2E8F0' }}
                      tickLine={false}
                    />
                    <YAxis
                      tick={{ fontSize: 11, fill: '#64748B' }}
                      axisLine={false}
                      tickLine={false}
                      allowDecimals={false}
                    />
                    <Tooltip content={<CustomChartTooltip />} />
                    {chartMode === 'learning' ? (
                      <>
                        <Bar dataKey="completedLessons" name="completedLessons" fill="#1D4ED8" radius={[4, 4, 0, 0]} />
                        <Bar dataKey="practiceSessions" name="practiceSessions" fill="#0284C7" radius={[4, 4, 0, 0]} />
                        <Bar dataKey="assessments" name="assessments" fill="#16A34A" radius={[4, 4, 0, 0]} />
                      </>
                    ) : (
                      <>
                        <Bar dataKey="aiRequests" name="aiRequests" fill="#1D4ED8" radius={[4, 4, 0, 0]} />
                        <Bar dataKey="aiErrors" name="aiErrors" fill="#DC2626" radius={[4, 4, 0, 0]} />
                      </>
                    )}
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <div className="admin-chart-legend" style={{ marginTop: '12px', display: 'flex', gap: '16px', flexWrap: 'wrap', fontSize: '12px', color: '#475569' }}>
                {chartMode === 'learning' ? (
                  <>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                      <span style={{ width: 10, height: 10, borderRadius: 2, background: '#1D4ED8', display: 'inline-block' }} />
                      Bài học hoàn thành
                    </span>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                      <span style={{ width: 10, height: 10, borderRadius: 2, background: '#0284C7', display: 'inline-block' }} />
                      Lượt luyện tập
                    </span>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                      <span style={{ width: 10, height: 10, borderRadius: 2, background: '#16A34A', display: 'inline-block' }} />
                      Lượt kiểm tra
                    </span>
                  </>
                ) : (
                  <>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                      <span style={{ width: 10, height: 10, borderRadius: 2, background: '#1D4ED8', display: 'inline-block' }} />
                      Lượt gọi AI
                    </span>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                      <span style={{ width: 10, height: 10, borderRadius: 2, background: '#DC2626', display: 'inline-block' }} />
                      Lỗi AI
                    </span>
                  </>
                )}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Right 1/3: Distribution Bars */}
      <div className="staff-card admin-analytics-dist-card">
        <div className="staff-card-header admin-analytics-card-header">
          <div>
            <h2 className="staff-card-title">Phân bố tài khoản</h2>
            <p className="admin-card-subtitle">Tỷ lệ theo vai trò hoặc trạng thái</p>
          </div>
          <div className="admin-time-pill-group">
            <button
              type="button"
              className={`admin-time-pill ${distMode === 'role' ? 'active' : ''}`}
              onClick={() => setDistMode('role')}
              aria-pressed={distMode === 'role'}
            >
              Vai trò
            </button>
            <button
              type="button"
              className={`admin-time-pill ${distMode === 'status' ? 'active' : ''}`}
              onClick={() => setDistMode('status')}
              aria-pressed={distMode === 'status'}
            >
              Trạng thái
            </button>
          </div>
        </div>
        <div className="staff-card-body">
          {currentDistribution.length === 0 ? (
            <div style={{ padding: '24px 0', textAlign: 'center', color: 'var(--admin-text-muted)', fontSize: '13px' }}>
              Chưa có dữ liệu phân bố.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              {currentDistribution.map((item) => (
                <div key={item.key} style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', color: '#0F172A' }}>
                    <span>{item.name}</span>
                    <span style={{ fontWeight: 600, fontVariantNumeric: 'tabular-nums' }}>
                      {item.count.toLocaleString('vi-VN')} ({item.percentage}%)
                    </span>
                  </div>
                  <div style={{ height: '8px', borderRadius: '4px', background: '#F1F5F9', overflow: 'hidden' }}>
                    <div
                      style={{
                        height: '100%',
                        width: `${Math.min(100, Math.max(0, item.percentage))}%`,
                        backgroundColor: item.color || '#1D4ED8',
                        borderRadius: '4px',
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

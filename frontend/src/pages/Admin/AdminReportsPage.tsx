import React, { useEffect, useState, useCallback } from 'react'
import {
  Users,
  CheckCircle2,
  Calendar,
  Percent,
  Award,
  Filter,
} from 'lucide-react'
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from 'recharts'
import { educationService } from '@/services/education.service'
import type { LearningReportsData } from '@/types/education'
import { Skeleton } from '@/components/ui/Skeleton'
import './AdminPages.css'
import '@/components/admin/AdminComponents.css'

export const AdminReportsPage: React.FC = () => {
  const [data, setData] = useState<LearningReportsData | null>(null)
  const [loading, setLoading] = useState(true)

  // Filters
  const [timeframe, setTimeframe] = useState('30d')
  const [subjectFilter, setSubjectFilter] = useState('all')
  const [classFilter, setClassFilter] = useState('all')

  const loadReports = useCallback(() => {
    setLoading(true)
    educationService
      .getReports({
        timeframe,
        subjectId: subjectFilter,
        classId: classFilter,
      })
      .then((res) => {
        setData(res)
        setLoading(false)
      })
  }, [timeframe, subjectFilter, classFilter])

  useEffect(() => {
    let active = true
    educationService
      .getReports({
        timeframe,
        subjectId: subjectFilter,
        classId: classFilter,
      })
      .then((res) => {
        if (active) {
          setData(res)
          setLoading(false)
        }
      })
    return () => {
      active = false
    }
  }, [timeframe, subjectFilter, classFilter])

  return (
    <div className="staff-page">
      {/* Page Header */}
      <div className="staff-page-header">
        <div className="admin-header-row">
          <div>
            <div className="admin-prototype-badge">
              <span className="prototype-dot" />
              <span>Dữ liệu mô phỏng · Học tập THPT</span>
            </div>
            <h1 className="staff-page-title">Báo cáo học tập</h1>
            <p className="staff-page-desc">
              Thống kê chuyên sâu về mức độ tương tác, tiến độ hoàn thành bài học và phổ điểm bài thu hoạch toàn hệ thống.
            </p>
          </div>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="admin-report-filter-bar">
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--navy-primary, #102a43)', fontWeight: 600 }}>
          <Filter size={16} />
          <span>Bộ lọc báo cáo:</span>
        </div>

        {/* Timeframe */}
        <select
          value={timeframe}
          onChange={(e) => setTimeframe(e.target.value)}
          className="admin-select"
          aria-label="Chọn khoảng thời gian"
        >
          <option value="7d">7 ngày qua</option>
          <option value="30d">30 ngày qua</option>
          <option value="term">Học kỳ 1 (90 ngày)</option>
        </select>

        {/* Subject */}
        <select
          value={subjectFilter}
          onChange={(e) => setSubjectFilter(e.target.value)}
          className="admin-select"
          aria-label="Chọn môn học"
        >
          <option value="all">Tất cả môn học</option>
          <option value="Toán">Toán học 12</option>
          <option value="Vật lý">Vật lý 12</option>
          <option value="Hóa học">Hóa học 12</option>
          <option value="Ngữ văn">Ngữ văn 12</option>
          <option value="Tiếng Anh">Tiếng Anh 12</option>
        </select>

        {/* Class */}
        <select
          value={classFilter}
          onChange={(e) => setClassFilter(e.target.value)}
          className="admin-select"
          aria-label="Chọn lớp học"
        >
          <option value="all">Tất cả các lớp</option>
          <option value="12A1">Lớp 12A1</option>
          <option value="12A2">Lớp 12A2</option>
          <option value="11B1">Lớp 11B1</option>
        </select>

        <button
          type="button"
          className="admin-btn-outline"
          onClick={loadReports}
          style={{ marginLeft: 'auto' }}
        >
          Làm mới số liệu
        </button>
      </div>

      {/* Row 1 — 5 KPI Cards */}
      {loading || !data ? (
        <div className="admin-education-summary-grid">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="admin-kpi-card">
              <Skeleton width="100%" height="80px" />
            </div>
          ))}
        </div>
      ) : (
        <div className="admin-education-summary-grid">
          <div className="admin-kpi-card">
            <div className="admin-kpi-header">
              <span className="admin-kpi-label">Tổng học viên</span>
              <Users size={18} className="admin-kpi-icon" />
            </div>
            <div className="admin-kpi-value">{data.totalLearners.toLocaleString()}</div>
            <div className="admin-kpi-comparison">Quy mô học viên ghi danh</div>
          </div>

          <div className="admin-kpi-card">
            <div className="admin-kpi-header">
              <span className="admin-kpi-label">Học viên hoạt động</span>
              <Calendar size={18} className="admin-kpi-icon" />
            </div>
            <div className="admin-kpi-value">{data.activeLearners.toLocaleString()}</div>
            <div className="admin-kpi-comparison">Trong kỳ báo cáo đã chọn</div>
          </div>

          <div className="admin-kpi-card">
            <div className="admin-kpi-header">
              <span className="admin-kpi-label">Bài học hoàn thành</span>
              <CheckCircle2 size={18} className="admin-kpi-icon" style={{ color: '#047857' }} />
            </div>
            <div className="admin-kpi-value">{data.completedLessons.toLocaleString()}</div>
            <div className="admin-kpi-comparison">+8.5% so với kỳ trước</div>
          </div>

          <div className="admin-kpi-card">
            <div className="admin-kpi-header">
              <span className="admin-kpi-label">Tỷ lệ hoàn thành</span>
              <Percent size={18} className="admin-kpi-icon" />
            </div>
            <div className="admin-kpi-value">{data.completionRatePercent}%</div>
            <div className="admin-kpi-comparison">Đạt chuẩn mục tiêu học tập</div>
          </div>

          <div className="admin-kpi-card">
            <div className="admin-kpi-header">
              <span className="admin-kpi-label">Điểm thu hoạch TB</span>
              <Award size={18} className="admin-kpi-icon" style={{ color: '#f59e0b' }} />
            </div>
            <div className="admin-kpi-value">{data.averageAssessmentScore} / 10</div>
            <div className="admin-kpi-comparison">Thang điểm 10 THPT</div>
          </div>
        </div>
      )}

      {/* Row 2 — Charts (2/3 and 1/3) */}
      <div className="admin-analytics-grid" style={{ marginTop: '24px' }}>
        {/* Chart 1: Hoạt động học tập theo thời gian */}
        <div className="admin-card">
          <div className="admin-analytics-card-header">
            <div>
              <h2 className="admin-card-title">Hoạt động học tập theo thời gian</h2>
              <p className="admin-card-subtitle">
                Số lượt học viên truy cập và số lượng bài học hoàn thành mỗi ngày
              </p>
            </div>
          </div>

          {loading || !data ? (
            <Skeleton width="100%" height="280px" />
          ) : (
            <div style={{ width: '100%', height: 280, marginTop: '16px' }}>
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={data.activityTrend} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorUsers" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#102A43" stopOpacity={0.25} />
                      <stop offset="95%" stopColor="#102A43" stopOpacity={0.0} />
                    </linearGradient>
                    <linearGradient id="colorLessons" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#F4B942" stopOpacity={0.35} />
                      <stop offset="95%" stopColor="#F4B942" stopOpacity={0.0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                  <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#627D98' }} tickLine={false} />
                  <YAxis tick={{ fontSize: 11, fill: '#627D98' }} tickLine={false} />
                  <Tooltip
                    contentStyle={{
                      background: '#102A43',
                      border: 'none',
                      borderRadius: '8px',
                      color: '#FFFFFF',
                      fontSize: '12px',
                    }}
                  />
                  <Area
                    type="monotone"
                    dataKey="activeUsers"
                    name="Học viên hoạt động"
                    stroke="#102A43"
                    strokeWidth={2}
                    fillOpacity={1}
                    fill="url(#colorUsers)"
                  />
                  <Area
                    type="monotone"
                    dataKey="lessonsCompleted"
                    name="Bài học hoàn thành"
                    stroke="#F4B942"
                    strokeWidth={2}
                    fillOpacity={1}
                    fill="url(#colorLessons)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>

        {/* Chart 2: Phân bố kết quả bài thu hoạch */}
        <div className="admin-card">
          <div className="admin-analytics-card-header">
            <div>
              <h2 className="admin-card-title">Phân bố kết quả thu hoạch</h2>
              <p className="admin-card-subtitle">Tỷ lệ xếp loại điểm số học sinh</p>
            </div>
          </div>

          {loading || !data ? (
            <Skeleton width="100%" height="280px" />
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', marginTop: '20px' }}>
              {data.scoreDistribution.map((item, idx) => {
                const colors = ['#10b981', '#0284c7', '#f59e0b', '#ef4444']
                const color = colors[idx % colors.length]
                return (
                  <div key={item.range} style={{ fontSize: '0.85rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                      <span style={{ fontWeight: 500, color: 'var(--text-main, #102a43)' }}>
                        {item.range}
                      </span>
                      <strong style={{ color }}>{item.percent}% ({item.count} em)</strong>
                    </div>
                    <div
                      style={{
                        height: '8px',
                        borderRadius: '9999px',
                        background: 'var(--surface-sunken, #f1f5f9)',
                        overflow: 'hidden',
                      }}
                    >
                      <div
                        style={{
                          height: '100%',
                          width: `${item.percent}%`,
                          background: color,
                          borderRadius: '9999px',
                          transition: 'width 0.3s ease',
                        }}
                      />
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>

      {/* Row 3 — Subject Progress Horizontal Bar Chart */}
      <div className="admin-card" style={{ marginTop: '24px' }}>
        <div className="admin-analytics-card-header">
          <div>
            <h2 className="admin-card-title">Tiến độ hoàn thành theo từng môn học</h2>
            <p className="admin-card-subtitle">
              Mức độ bao phủ chương trình và tỷ lệ hoàn thành trung bình của từng bộ môn
            </p>
          </div>
        </div>

        {loading || !data ? (
          <Skeleton width="100%" height="220px" />
        ) : (
          <div style={{ width: '100%', height: 240, marginTop: '16px' }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={data.subjectProgress}
                layout="vertical"
                margin={{ top: 10, right: 30, left: 40, bottom: 0 }}
              >
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#E2E8F0" />
                <XAxis type="number" domain={[0, 100]} tick={{ fontSize: 11, fill: '#627D98' }} unit="%" />
                <YAxis dataKey="subject" type="category" tick={{ fontSize: 12, fill: '#102A43', fontWeight: 600 }} />
                <Tooltip
                  formatter={(val: unknown) => [`${val}%`, 'Tiến độ hoàn thành']}
                  contentStyle={{
                    background: '#102A43',
                    border: 'none',
                    borderRadius: '8px',
                    color: '#FFFFFF',
                    fontSize: '12px',
                  }}
                />
                <Bar dataKey="progress" fill="#102A43" radius={[0, 6, 6, 0]} barSize={20} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>
    </div>
  )
}

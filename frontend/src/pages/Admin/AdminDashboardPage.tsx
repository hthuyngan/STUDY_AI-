import React, { useState } from 'react'
import {
  Users,
  GraduationCap,
  BookCheck,
  AlertCircle,
  FileText,
  Calendar,
  ArrowRight,
  Download,
  X,
} from 'lucide-react'
import { Link } from 'react-router-dom'
import { useAdminDashboard } from '@/hooks/useAdmin'
import { StaffMetricCard } from '@/components/ui/StaffMetricCard'
import { Skeleton } from '@/components/ui/Skeleton'
import { Button } from '@/components/ui/Button'
import { PageErrorState } from '@/components/ui/PageErrorState'
import { AdminAnalyticsChart } from '@/components/admin/AdminAnalyticsChart'
import { AdminQuickActions } from '@/components/admin/AdminQuickActions'
import type { TimeRangeFilter } from '@/types/admin'
import './AdminPages.css'
import '@/components/admin/AdminComponents.css'

export const AdminDashboardPage: React.FC = () => {
  const {
    metrics,
    attentionItems,
    activities,
    timeRange,
    setTimeRange,
    trends,
    roleDistribution,
    statusDistribution,
    loading,
    error,
    refresh,
  } = useAdminDashboard('7d')

  const [reportModalOpen, setReportModalOpen] = useState(false)

  if (error) {
    return (
      <PageErrorState
        title="Không thể kết nối máy chủ quản trị."
        description={error}
        onRetry={refresh}
      />
    )
  }

  const handleExportQuickReport = () => {
    const reportData = [
      'BÁO CÁO TỔNG QUAN HỆ THỐNG STUDY_AI',
      `Thời điểm xuất: ${new Date().toLocaleString('vi-VN')}`,
      `Tổng người dùng: ${metrics?.totalUsers ?? 0}`,
      `Học viên hoạt động: ${metrics?.activeLearners ?? 0}`,
      `Bài học hoàn thành: ${metrics?.completedLessonsTotal ?? 8642}`,
      `Yêu cầu cần xử lý: ${attentionItems.length}`,
      `Trạng thái hạ tầng: ${metrics?.systemStatus ?? 'healthy'}`,
    ].join('\r\n')

    const blob = new Blob(['\uFEFF' + reportData], { type: 'text/plain;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `study_ai_report_${new Date().toISOString().slice(0, 10)}.txt`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  return (
    <div className="admin-dashboard-page">
      {/* Hàng 1 — Page Header */}
      <div className="admin-header-row">
        <div className="staff-page-header" style={{ marginBottom: 0 }}>
          <div className="admin-prototype-badge">
            <span className="prototype-dot" />
            <span>FE Prototype Standalone</span>
          </div>
          <h1 className="staff-page-title">Tổng quan hệ thống</h1>
          <p className="staff-page-desc">
            Quản lý hoạt động, tài khoản và chất lượng học tập trên STUDY_AI.
          </p>
        </div>

        <div className="admin-header-actions">
          <div className="admin-time-select-wrap">
            <Calendar size={14} className="admin-time-icon" aria-hidden="true" />
            <select
              className="admin-time-select"
              value={timeRange}
              onChange={(e) => setTimeRange(e.target.value as TimeRangeFilter)}
              aria-label="Chọn khoảng thời gian thống kê"
            >
              <option value="7d">7 ngày qua</option>
              <option value="30d">30 ngày qua</option>
              <option value="month">Tháng này</option>
              <option value="all">Toàn thời gian</option>
            </select>
          </div>

          <Button
            variant="outline"
            icon={FileText}
            onClick={() => setReportModalOpen(true)}
            aria-label="Xem báo cáo tổng quan"
          >
            <span>Xem báo cáo</span>
          </Button>
        </div>
      </div>

      {/* Hàng 2 — 4 KPI compact */}
      <div className="staff-metric-grid" style={{ marginTop: '24px' }}>
        {loading ? (
          <>
            <Skeleton height={96} />
            <Skeleton height={96} />
            <Skeleton height={96} />
            <Skeleton height={96} />
          </>
        ) : (
          <>
            <StaffMetricCard
              label="Tổng người dùng"
              value={metrics?.totalUsers.toLocaleString('vi-VN') || 0}
              context="Bao gồm học viên và nhân sự"
              icon={Users}
              trend={{ value: '12% kỳ này', isPositive: true }}
            />
            <StaffMetricCard
              label="Học viên đang hoạt động"
              value={metrics?.activeLearners.toLocaleString('vi-VN') || 0}
              context="Tương tác trong 30 ngày qua"
              icon={GraduationCap}
              trend={{ value: '8% tuần này', isPositive: true }}
            />
            <StaffMetricCard
              label="Bài học đã hoàn thành"
              value={(metrics?.completedLessonsTotal || 8642).toLocaleString('vi-VN')}
              context="Tiến trình học tập tích lũy"
              icon={BookCheck}
              trend={{ value: '15% tháng này', isPositive: true }}
            />
            <StaffMetricCard
              label="Yêu cầu cần xử lý"
              value={attentionItems.length}
              context="Hàng đợi cần duyệt hoặc hỗ trợ"
              icon={AlertCircle}
              trend={
                attentionItems.length > 0
                  ? { value: `${attentionItems.filter((i) => i.severity === 'high').length} mục ưu tiên cao`, isPositive: false }
                  : undefined
              }
            />
          </>
        )}
      </div>

      {/* Hàng 3 — Analytics (2/3 và 1/3) */}
      <AdminAnalyticsChart
        trends={trends}
        timeRange={timeRange}
        onTimeRangeChange={setTimeRange}
        roleDistribution={roleDistribution}
        statusDistribution={statusDistribution}
      />

      {/* Hàng 4 — Điều hành (1/2 và 1/2) */}
      <div className="admin-operations-grid">
        {/* Cột trái: Hoạt động gần đây */}
        <div className="staff-card">
          <div className="staff-card-header">
            <h2 className="staff-card-title">Hoạt động gần đây</h2>
            <span className="admin-badge-count">{activities.length} sự kiện</span>
          </div>
          <div className="staff-card-body">
            {loading ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                <Skeleton height={36} />
                <Skeleton height={36} />
                <Skeleton height={36} />
              </div>
            ) : activities.length === 0 ? (
              <p style={{ color: 'var(--text-muted)', fontSize: '0.88rem' }}>
                Chưa có hoạt động quản trị nào gần đây.
              </p>
            ) : (
              <div className="staff-activity-timeline">
                {activities.slice(0, 5).map((act) => (
                  <div key={act.id} className="staff-activity-row">
                    <span className="staff-activity-actor">{act.actorName}</span>
                    <span className="staff-activity-action">{act.action}</span>
                    <span className="staff-activity-target">{act.target}</span>
                    <span className="staff-activity-time">
                      {new Date(act.timestamp).toLocaleTimeString('vi-VN', {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Cột phải: Việc cần xử lý */}
        <div className="staff-card">
          <div className="staff-card-header">
            <h2 className="staff-card-title">Việc cần xử lý</h2>
            <span
              style={{
                fontSize: '0.75rem',
                fontWeight: 700,
                color: '#dc2626',
                background: 'rgba(220, 38, 38, 0.08)',
                padding: '2px 8px',
                borderRadius: '9999px',
              }}
            >
              {attentionItems.length} mục
            </span>
          </div>
          <div className="staff-card-body">
            {loading ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                <Skeleton height={60} />
                <Skeleton height={60} />
              </div>
            ) : attentionItems.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '24px 0', color: 'var(--text-muted)' }}>
                Không có mục nào cần xử lý.
              </div>
            ) : (
              <div className="staff-attention-list">
                {attentionItems.map((item) => (
                  <Link
                    key={item.id}
                    to={item.actionUrl}
                    className={`staff-attention-item severity-${item.severity}`}
                    title={`Mở màn hình xử lý: ${item.actionUrl}`}
                  >
                    <div className="staff-attention-header">
                      <span className="staff-attention-title">{item.title}</span>
                      <ArrowRight size={14} style={{ color: 'var(--text-muted)' }} />
                    </div>
                    <p className="staff-attention-desc">{item.description}</p>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Hàng 5 — Quick Actions */}
      <AdminQuickActions />

      {/* Report Modal */}
      {reportModalOpen && (
        <div className="confirm-dialog-backdrop" onClick={() => setReportModalOpen(false)}>
          <div
            className="confirm-dialog-modal admin-report-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="report-modal-title"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="confirm-dialog-header">
              <div className="confirm-dialog-title-wrap">
                <FileText size={18} style={{ color: 'var(--navy-primary, #102a43)' }} />
                <h3 id="report-modal-title" className="confirm-dialog-title">
                  Báo cáo tổng kết điều hành hệ thống
                </h3>
              </div>
              <button
                type="button"
                className="confirm-dialog-close-btn"
                onClick={() => setReportModalOpen(false)}
                aria-label="Đóng báo cáo"
              >
                <X size={16} />
              </button>
            </div>

            <div className="confirm-dialog-body">
              <div className="admin-report-summary-box">
                <div className="admin-report-stat">
                  <span className="label">Kỳ báo cáo</span>
                  <span className="val">{timeRange === '7d' ? '7 ngày qua' : timeRange === '30d' ? '30 ngày qua' : 'Tháng 10/2026'}</span>
                </div>
                <div className="admin-report-stat">
                  <span className="label">Tổng số tài khoản</span>
                  <span className="val">{metrics?.totalUsers ?? 0}</span>
                </div>
                <div className="admin-report-stat">
                  <span className="label">Học viên tích cực</span>
                  <span className="val">{metrics?.activeLearners ?? 0}</span>
                </div>
                <div className="admin-report-stat">
                  <span className="label">Bài học đã hoàn thành</span>
                  <span className="val">{(metrics?.completedLessonsTotal || 8642).toLocaleString('vi-VN')}</span>
                </div>
                <div className="admin-report-stat">
                  <span className="label">Trạng thái vận hành</span>
                  <span className="val text-success">Hoàn toàn bình thường</span>
                </div>
              </div>

              <div style={{ marginTop: '16px', fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                Dữ liệu báo cáo được trích xuất từ bộ nhớ điều hành STUDY_AI. Báo cáo định dạng văn bản có thể tải xuống để lưu trữ.
              </div>
            </div>

            <div className="confirm-dialog-footer">
              <Button
                variant="outline"
                icon={Download}
                onClick={handleExportQuickReport}
              >
                Tải tệp báo cáo
              </Button>
              <Button
                variant="primary"
                onClick={() => setReportModalOpen(false)}
              >
                Đóng
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

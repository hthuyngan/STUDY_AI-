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
            Quản lý hoạt động, tài khoản và chất lượng học tập trên nền tảng STUDY_AI.
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
            Báo cáo nhanh
          </Button>
        </div>
      </div>

      {/* Hàng 2 — Top Metric Grid (4 cards chuẩn) */}
      <div className="staff-metric-grid" aria-label="Thống kê chính">
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
              value={metrics?.totalUsers ?? 0}
              context={`${metrics?.activeLearners ?? 0} người hoạt động tuần này`}
              icon={Users}
              trend={{
                value: '+12.4% so với kỳ trước',
                isPositive: true,
              }}
            />
            <StaffMetricCard
              label="Học viên đang hoạt động"
              value={metrics?.activeLearners ?? 0}
              context="Đang theo học các môn"
              icon={GraduationCap}
              trend={{
                value: '+8.1%',
                isPositive: true,
              }}
            />
            <StaffMetricCard
              label="Bài học đã hoàn thành"
              value={(metrics?.completedLessonsTotal || 8642).toLocaleString('vi-VN')}
              context="Tiến độ học tập tích cực"
              icon={BookCheck}
              trend={{
                value: '+18.5%',
                isPositive: true,
              }}
            />
            <StaffMetricCard
              label="Yêu cầu cần xử lý"
              value={attentionItems.length}
              context="Tài khoản chờ duyệt & khiếu nại"
              icon={AlertCircle}
              trend={{
                value: `${attentionItems.length} mục đang chờ`,
                isPositive: attentionItems.length === 0,
              }}
            />
          </>
        )}
      </div>

      {/* Hàng 3 — Split Grid: Chart + Attention List */}
      <div className="staff-split-grid">
        {/* Left: Analytics Chart Card */}
        <div className="staff-card">
          <div className="staff-card-header">
            <h2 className="staff-card-title">Xu hướng hoạt động học tập</h2>
            <span className="admin-card-subtitle">
              Lượt truy cập và mức độ hoàn thành bài học theo ngày
            </span>
          </div>
          <div className="staff-card-body">
            {loading ? (
              <Skeleton height={240} />
            ) : (
              <AdminAnalyticsChart
                trends={trends}
                timeRange={timeRange}
                onTimeRangeChange={setTimeRange}
                roleDistribution={roleDistribution}
                statusDistribution={statusDistribution}
              />
            )}
          </div>
        </div>

        {/* Right: Items Needing Attention */}
        <div className="staff-card">
          <div className="staff-card-header">
            <h2 className="staff-card-title">Việc cần xử lý</h2>
            <span className="admin-card-subtitle">
              Sự cố và hành động cần quản trị viên can thiệp
            </span>
          </div>
          <div className="staff-card-body">
            {loading ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                <Skeleton height={60} />
                <Skeleton height={60} />
                <Skeleton height={60} />
              </div>
            ) : attentionItems.length === 0 ? (
              <p style={{ color: 'var(--text-muted)' }}>
                Không có sự cố nào cần xử lý ngay. Hệ thống ổn định.
              </p>
            ) : (
              <div className="staff-attention-list">
                {attentionItems.map((item) => (
                  <Link
                    key={item.id}
                    to={item.actionUrl || '/admin'}
                    className={`staff-attention-item severity-${item.severity}`}
                    aria-label={`Chi tiết ${item.title}`}
                  >
                    <div className="staff-attention-header">
                      <span className="staff-attention-title">{item.title}</span>
                      <ArrowRight size={13} className="admin-attention-arrow" aria-hidden="true" />
                    </div>
                    <p className="staff-attention-desc">{item.description}</p>
                    <span className="staff-attention-time">{item.timestamp}</span>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Hàng 4 — Lối tắt tác vụ điều hành & Chuyển không gian */}
      <AdminQuickActions />

      {/* Hàng 5 — System Health + Activity Log */}
      <div className="admin-lower-grid">
        {/* System Health Card */}
        <div className="staff-card">
          <div className="staff-card-header">
            <h2 className="staff-card-title">Tình trạng hạ tầng kỹ thuật</h2>
            <span className="admin-card-subtitle">
              Thời gian uptime 99.98% trong 30 ngày qua
            </span>
          </div>
          <div className="staff-card-body">
            {loading ? (
              <Skeleton height={140} />
            ) : (
              <div className="admin-system-health-list">
                <div className="admin-health-row">
                  <span className="admin-health-name">Frontend Prototype</span>
                  <span className="admin-status-pill online">Hoạt động tốt</span>
                </div>
                <div className="admin-health-row">
                  <span className="admin-health-name">Backend Mock Services</span>
                  <span className="admin-status-pill online">Phản hồi 12ms</span>
                </div>
                <div className="admin-health-row">
                  <span className="admin-health-name">Bộ nhớ đệm localStorage</span>
                  <span className="admin-status-pill online">Đã đồng bộ</span>
                </div>
                <div className="admin-health-row">
                  <span className="admin-health-name">Cơ chế định tuyến RBAC Mock</span>
                  <span className="admin-status-pill online">Bảo mật</span>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Activity Stream */}
        <div className="staff-card">
          <div className="staff-card-header">
            <h2 className="staff-card-title">Hoạt động gần đây</h2>
            <span className="admin-card-subtitle">
              Nhật ký hành động người dùng và sự kiện hệ thống
            </span>
          </div>
          <div className="staff-card-body">
            {loading ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                <Skeleton height={40} />
                <Skeleton height={40} />
                <Skeleton height={40} />
              </div>
            ) : activities.length === 0 ? (
              <p style={{ color: 'var(--text-muted)' }}>Chưa có hoạt động nào được ghi nhận.</p>
            ) : (
              <ul className="admin-activity-stream" aria-label="Nhật ký hoạt động">
                {activities.slice(0, 6).map((act) => (
                  <li key={act.id} className="admin-activity-item">
                    <span className="admin-activity-dot" aria-hidden="true" />
                    <div className="admin-activity-content">
                      <span className="admin-activity-actor">{act.actorName}</span>{' '}
                      <span className="admin-activity-action">{act.action}</span>
                    </div>
                    <span className="admin-activity-time">{act.timestamp}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>

      {/* Modal Báo cáo nhanh */}
      {reportModalOpen && (
        <div className="confirm-dialog-backdrop" role="dialog" aria-modal="true" aria-labelledby="report-modal-title">
          <div className="confirm-dialog-container" style={{ maxWidth: 540 }}>
            <div className="confirm-dialog-header">
              <h2 id="report-modal-title" className="confirm-dialog-title">
                Báo cáo tổng kết điều hành hệ thống
              </h2>
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

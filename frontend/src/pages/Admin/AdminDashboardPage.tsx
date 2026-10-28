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
import './AdminPolish.css'

function formatAdminTimestamp(value: string): string {
  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) return value

  return new Intl.DateTimeFormat('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).format(parsed)
}

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
        title="Không thể tải dữ liệu quản trị."
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
      <div className="admin-header-row">
        <div className="staff-page-header admin-dashboard-heading">
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
              trend={{ value: '+12.4% so với kỳ trước', isPositive: true }}
            />
            <StaffMetricCard
              label="Học viên đang hoạt động"
              value={metrics?.activeLearners ?? 0}
              context="Đang theo học các môn"
              icon={GraduationCap}
              trend={{ value: '+8.1%', isPositive: true }}
            />
            <StaffMetricCard
              label="Bài học đã hoàn thành"
              value={(metrics?.completedLessonsTotal || 8642).toLocaleString('vi-VN')}
              context="Tiến độ học tập tích cực"
              icon={BookCheck}
              trend={{ value: '+18.5%', isPositive: true }}
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

      <AdminAnalyticsChart
        trends={trends}
        timeRange={timeRange}
        onTimeRangeChange={setTimeRange}
        roleDistribution={roleDistribution}
        statusDistribution={statusDistribution}
      />

      <div className="admin-dashboard-operations-grid">
        <section className="staff-card" aria-labelledby="admin-attention-title">
          <div className="staff-card-header admin-dashboard-card-header">
            <div>
              <h2 id="admin-attention-title" className="staff-card-title">Việc cần xử lý</h2>
              <p className="admin-card-subtitle">
                Sự cố và hành động cần quản trị viên can thiệp
              </p>
            </div>
            {!loading && attentionItems.length > 0 && (
              <span className="admin-badge-count">{attentionItems.length} mục</span>
            )}
          </div>
          <div className="staff-card-body">
            {loading ? (
              <div className="admin-dashboard-skeleton-stack">
                <Skeleton height={60} />
                <Skeleton height={60} />
                <Skeleton height={60} />
              </div>
            ) : attentionItems.length === 0 ? (
              <p className="admin-dashboard-empty-copy">
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
                    <span className="staff-attention-time">
                      {formatAdminTimestamp(item.timestamp)}
                    </span>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </section>

        <section className="staff-card" aria-labelledby="admin-activity-title">
          <div className="staff-card-header admin-dashboard-card-header">
            <div>
              <h2 id="admin-activity-title" className="staff-card-title">Hoạt động gần đây</h2>
              <p className="admin-card-subtitle">
                Nhật ký hành động người dùng và sự kiện hệ thống
              </p>
            </div>
          </div>
          <div className="staff-card-body">
            {loading ? (
              <div className="admin-dashboard-skeleton-stack">
                <Skeleton height={40} />
                <Skeleton height={40} />
                <Skeleton height={40} />
              </div>
            ) : activities.length === 0 ? (
              <p className="admin-dashboard-empty-copy">Chưa có hoạt động nào được ghi nhận.</p>
            ) : (
              <ul className="admin-activity-stream" aria-label="Nhật ký hoạt động">
                {activities.slice(0, 6).map((act) => (
                  <li key={act.id} className="admin-activity-item">
                    <span className="admin-activity-dot" aria-hidden="true" />
                    <div className="admin-activity-content">
                      <span className="admin-activity-actor">{act.actorName}</span>{' '}
                      <span className="admin-activity-action">{act.action}</span>
                    </div>
                    <time className="admin-activity-time" dateTime={act.timestamp}>
                      {formatAdminTimestamp(act.timestamp)}
                    </time>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </section>
      </div>

      <AdminQuickActions />

      <section className="staff-card admin-dashboard-health-card" aria-labelledby="admin-health-title">
        <div className="staff-card-header admin-dashboard-card-header">
          <div>
            <h2 id="admin-health-title" className="staff-card-title">Tình trạng môi trường giao diện</h2>
            <p className="admin-card-subtitle">
              Trạng thái các thành phần đang dùng trong chế độ prototype frontend
            </p>
          </div>
        </div>
        <div className="staff-card-body">
          {loading ? (
            <Skeleton height={112} />
          ) : (
            <div className="admin-system-health-list">
              <div className="admin-health-row">
                <span className="admin-health-name">Frontend Prototype</span>
                <span className="admin-status-pill online">Hoạt động tốt</span>
              </div>
              <div className="admin-health-row">
                <span className="admin-health-name">Dữ liệu mô phỏng</span>
                <span className="admin-status-pill online">Sẵn sàng</span>
              </div>
              <div className="admin-health-row">
                <span className="admin-health-name">Bộ nhớ localStorage</span>
                <span className="admin-status-pill online">Đang sử dụng</span>
              </div>
              <div className="admin-health-row">
                <span className="admin-health-name">Điều hướng workspace</span>
                <span className="admin-status-pill online">Sẵn sàng</span>
              </div>
            </div>
          )}
        </div>
      </section>

      {reportModalOpen && (
        <div
          className="confirm-dialog-backdrop"
          role="dialog"
          aria-modal="true"
          aria-labelledby="report-modal-title"
        >
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
                  <span className="val">
                    {timeRange === '7d'
                      ? '7 ngày qua'
                      : timeRange === '30d'
                        ? '30 ngày qua'
                        : 'Tháng 10/2026'}
                  </span>
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
                  <span className="val">
                    {(metrics?.completedLessonsTotal || 8642).toLocaleString('vi-VN')}
                  </span>
                </div>
                <div className="admin-report-stat">
                  <span className="label">Trạng thái vận hành</span>
                  <span className="val text-success">Hoàn toàn bình thường</span>
                </div>
              </div>

              <p className="admin-report-note">
                Dữ liệu báo cáo được trích xuất từ bộ nhớ điều hành STUDY_AI. Báo cáo định dạng văn bản có thể tải xuống để lưu trữ.
              </p>
            </div>

            <div className="confirm-dialog-footer">
              <Button variant="outline" icon={Download} onClick={handleExportQuickReport}>
                Tải tệp báo cáo
              </Button>
              <Button variant="primary" onClick={() => setReportModalOpen(false)}>
                Đóng
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

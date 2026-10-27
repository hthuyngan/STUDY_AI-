import React from 'react'
import {
  Users,
  GraduationCap,
  Briefcase,
  MessageSquare,
  ArrowRight,
} from 'lucide-react'
import { Link } from 'react-router-dom'
import { useAdminDashboard } from '@/hooks/useAdmin'
import { StaffMetricCard } from '@/components/ui/StaffMetricCard'
import { Skeleton } from '@/components/ui/Skeleton'
import { PageErrorState } from '@/components/ui/PageErrorState'
import './AdminPages.css'

export const AdminDashboardPage: React.FC = () => {
  const { metrics, attentionItems, activities, loading, error, refresh } =
    useAdminDashboard()

  if (error) {
    return <PageErrorState description={error} onRetry={refresh} />
  }

  return (
    <div className="admin-dashboard-page">
      {/* Header */}
      <div className="staff-page-header">
        <h1 className="staff-page-title">Bảng điều khiển Quản trị</h1>
        <p className="staff-page-desc">
          Theo dõi tổng thể hệ thống, phân quyền nhân sự và hoạt động vận hành nền tảng StudyAI.
        </p>
      </div>

      {/* 4 Compact Metrics */}
      <div className="staff-metric-grid">
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
              label="Tổng tài khoản"
              value={metrics?.totalUsers.toLocaleString('vi-VN') || 0}
              context="Bao gồm học viên và nhân sự"
              icon={Users}
              trend={{ value: '12% tháng này', isPositive: true }}
            />
            <StaffMetricCard
              label="Học viên hoạt động"
              value={metrics?.activeLearners.toLocaleString('vi-VN') || 0}
              context="Hoạt động trong 30 ngày qua"
              icon={GraduationCap}
              trend={{ value: '8% tuần này', isPositive: true }}
            />
            <StaffMetricCard
              label="Tài khoản nhân sự"
              value={metrics?.staffAccounts || 0}
              context="Giáo viên, nội dung, hỗ trợ"
              icon={Briefcase}
            />
            <StaffMetricCard
              label="Hỗ trợ đang chờ"
              value={metrics?.openSupportTickets || 0}
              context="Tickets chưa được đóng"
              icon={MessageSquare}
              trend={
                metrics && metrics.openSupportTickets > 5
                  ? { value: 'Cần chú ý', isPositive: false }
                  : undefined
              }
            />
          </>
        )}
      </div>

      {/* Split Grid: Activity overview 2/3 and Attention queue 1/3 */}
      <div className="staff-split-grid">
        {/* Left: Recent Activity */}
        <div className="staff-card">
          <div className="staff-card-header">
            <h2 className="staff-card-title">Nhật ký hoạt động hệ thống gần đây</h2>
          </div>
          <div className="staff-card-body">
            {loading ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                <Skeleton height={40} />
                <Skeleton height={40} />
                <Skeleton height={40} />
              </div>
            ) : activities.length === 0 ? (
              <p style={{ color: 'var(--text-muted)', fontSize: '0.88rem' }}>
                Chưa có hoạt động quản trị nào gần đây.
              </p>
            ) : (
              <div className="staff-activity-timeline">
                {activities.map((act) => (
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

        {/* Right: Attention Needed */}
        <div className="staff-card">
          <div className="staff-card-header">
            <h2 className="staff-card-title">Mục cần xử lý</h2>
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
              {attentionItems.length}
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
    </div>
  )
}

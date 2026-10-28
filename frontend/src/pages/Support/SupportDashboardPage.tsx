import { Link } from 'react-router-dom'
import { LifeBuoy, AlertTriangle, Clock, CheckCircle2, UserCheck } from 'lucide-react'
import { useSupportDashboard } from '@/hooks/useSupport'
import { StaffMetricCard } from '@/components/ui/StaffMetricCard'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { Skeleton } from '@/components/ui/Skeleton'
import { PageErrorState } from '@/components/ui/PageErrorState'
import './SupportPages.css'
import '../Admin/AdminPages.css'

export function SupportDashboardPage() {
  const { data, loading, error, refresh } = useSupportDashboard()

  if (loading) {
    return (
      <div className="staff-page">
        <Skeleton height={36} width={260} />
        <div className="staff-metrics-grid" style={{ marginTop: '20px' }}>
          <Skeleton height={96} />
          <Skeleton height={96} />
          <Skeleton height={96} />
          <Skeleton height={96} />
        </div>
      </div>
    )
  }

  if (error || !data) {
    return (
      <div className="staff-page">
        <PageErrorState
          title="Không thể kết nối máy chủ quản trị."
          message={error || 'Không có dữ liệu hỗ trợ'}
          onRetry={refresh}
        />
      </div>
    )
  }

  return (
    <div className="staff-page">
      <div className="staff-page-header">
        <h1 className="staff-page-title">Bàn làm việc Hỗ trợ người dùng</h1>
        <p className="staff-page-desc">
          Theo dõi hàng đợi yêu cầu hỗ trợ (tickets), kiểm soát SLA phản hồi và giải quyết sự cố kỹ thuật.
        </p>
      </div>

      {/* 4 KPIs */}
      <div className="staff-metric-grid">
        <StaffMetricCard
          label="Yêu cầu đang mở"
          value={data.openCount}
          context="Chờ tiếp nhận & phân công"
          icon={LifeBuoy}
          trend={{ value: 'Cần giải quyết', isPositive: false }}
        />
        <StaffMetricCard
          label="Mức độ khẩn cấp (P1/P2)"
          value={data.escalatedCount}
          context="Cần xử lý trong 2 giờ"
          icon={AlertTriangle}
          trend={{ value: 'Ưu tiên cao', isPositive: false }}
        />
        <StaffMetricCard
          label="Thời gian xử lý TB"
          value="1.8h"
          context="Mục tiêu SLA: < 4 giờ"
          icon={Clock}
        />
        <StaffMetricCard
          label="Tỷ lệ giải quyết SLA"
          value="96%"
          context="Tuân thủ cam kết dịch vụ"
          icon={CheckCircle2}
          trend={{ value: '96% đạt chuẩn', isPositive: true }}
        />
      </div>

      {/* Quick Action Navigation Buttons */}
      <div style={{ display: 'flex', gap: 12, margin: '20px 0' }}>
        <Link to="/support/tickets" className="btn btn-secondary">
          <LifeBuoy size={16} /> Danh sách yêu cầu hỗ trợ
        </Link>
        <Link to="/support/users" className="btn btn-secondary">
          <UserCheck size={16} /> Tra cứu hồ sơ người dùng
        </Link>
      </div>

      {/* Recent Tickets Table */}
      <div className="staff-card" style={{ marginTop: '20px' }}>
        <div className="staff-card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h2 className="staff-card-title">Yêu cầu hỗ trợ ưu tiên gần đây</h2>
          <Link to="/support/tickets" style={{ fontSize: '0.85rem', color: '#102A43', textDecoration: 'none', fontWeight: 600 }}>
            Xem toàn bộ hàng đợi &rarr;
          </Link>
        </div>

        <div className="staff-table-wrapper" style={{ border: 'none' }}>
          <table className="staff-table" aria-label="Yêu cầu hỗ trợ gần đây">
            <thead>
              <tr>
                <th scope="col">Mã</th>
                <th scope="col">Tiêu đề yêu cầu</th>
                <th scope="col">Người gửi</th>
                <th scope="col">Chuyên mục</th>
                <th scope="col">Ưu tiên</th>
                <th scope="col">Trạng thái</th>
                <th scope="col">Phụ trách</th>
                <th scope="col">Cập nhật</th>
              </tr>
            </thead>
            <tbody>
              {data.recentTickets.map((t) => (
                <tr key={t.id}>
                  <td>
                    <Link
                      to={`/support/tickets/${t.id}`}
                      style={{ fontWeight: 600, color: 'var(--color-primary)', textDecoration: 'none' }}
                    >
                      {t.id}
                    </Link>
                  </td>
                  <td>
                    <Link
                      to={`/support/tickets/${t.id}`}
                      style={{ color: 'var(--color-navy-dark)', textDecoration: 'none', fontWeight: 500 }}
                    >
                      {t.title}
                    </Link>
                  </td>
                  <td>
                    <div>{t.userName}</div>
                    <div style={{ fontSize: '11px', color: 'var(--color-ink-muted)' }}>{t.userEmail}</div>
                  </td>
                  <td>
                    <span style={{ fontSize: '12px', textTransform: 'capitalize' }}>{t.category}</span>
                  </td>
                  <td>
                    <span
                      style={{
                        fontSize: '12px',
                        fontWeight: 600,
                        color:
                          t.priority === 'urgent' || t.priority === 'high'
                            ? 'var(--color-danger, #e03131)'
                            : 'var(--color-ink-muted)',
                      }}
                    >
                      {t.priority.toUpperCase()}
                    </span>
                  </td>
                  <td>
                    <StatusBadge
                      status={t.status}
                      label={
                        t.status === 'open'
                          ? 'Mới mở'
                          : t.status === 'in-progress'
                          ? 'Đang xử lý'
                          : t.status === 'waiting'
                          ? 'Chờ phản hồi'
                          : 'Đã giải quyết'
                      }
                    />
                  </td>
                  <td>{t.assignedTo || <span style={{ color: 'var(--color-ink-muted)' }}>Chưa gán</span>}</td>
                  <td>{new Date(t.updatedAt).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

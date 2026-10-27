import { Link } from 'react-router-dom'
import { useSupportDashboard } from '@/hooks/useSupport'
import { StaffMetricCard } from '@/components/ui/StaffMetricCard'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { Skeleton } from '@/components/ui/Skeleton'
import { PageErrorState } from '@/components/ui/PageErrorState'
import './SupportPages.css'

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
        <PageErrorState title="Lỗi tải bảng điều khiển hỗ trợ" message={error || 'Không có dữ liệu'} onRetry={refresh} />
      </div>
    )
  }

  return (
    <div className="staff-page">
      <div className="staff-page-header">
        <div className="staff-page-title-row">
          <div>
            <nav className="staff-breadcrumbs" aria-label="Breadcrumb">
              <span>Không gian làm việc</span>
              <span>/</span>
              <span aria-current="page">Hỗ trợ kỹ thuật & người dùng</span>
            </nav>
            <h1>Trung tâm Hỗ trợ & Tiếp nhận Yêu cầu</h1>
            <p className="staff-page-desc">
              Xử lý khiếu nại tài khoản, sự cố đồng bộ dữ liệu ngoại tuyến và hỗ trợ nội dung học tập.
            </p>
          </div>
          <div className="staff-page-actions">
            <Link to="/support/users" className="staff-btn staff-btn-secondary">
              Tra cứu người dùng
            </Link>
            <Link to="/support/tickets" className="staff-btn staff-btn-primary">
              Danh sách ticket
            </Link>
          </div>
        </div>
      </div>

      <div className="staff-metrics-grid">
        <StaffMetricCard label="Ticket đang mở" value={data.openCount} hint="Chưa được gán hoặc đang chờ xử lý" />
        <StaffMetricCard label="Chờ phản hồi người dùng" value={data.waitingCount} hint="Đã gửi câu trả lời" />
        <StaffMetricCard label="Cần leo thang (Escalated)" value={data.escalatedCount} hint="Sự cố đồng bộ / kỹ thuật nặng" />
        <StaffMetricCard label="Đã giải quyết hôm nay" value={data.resolvedTodayCount} hint="Hoàn tất trong 24h qua" />
      </div>

      <div className="staff-card" style={{ marginTop: '24px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <h2 className="staff-card-title" style={{ margin: 0 }}>
            Hàng đợi ticket cần xử lý
          </h2>
          <Link to="/support/tickets" className="staff-btn staff-btn-secondary" style={{ fontSize: '13px', padding: '4px 10px' }}>
            Xem tất cả
          </Link>
        </div>

        <div className="staff-table-wrapper">
          <table className="staff-table">
            <thead>
              <tr>
                <th>Mã</th>
                <th>Tiêu đề yêu cầu</th>
                <th>Người dùng</th>
                <th>Phân loại</th>
                <th>Độ ưu tiên</th>
                <th>Trạng thái</th>
                <th>Người phụ trách</th>
                <th>Cập nhật</th>
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

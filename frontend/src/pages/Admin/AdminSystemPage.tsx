import { useAdminDashboard } from '@/hooks/useAdmin'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { Skeleton } from '@/components/ui/Skeleton'
import './AdminPages.css'

export const AdminSystemPage: React.FC = () => {
  const { metrics, loading } = useAdminDashboard()

  return (
    <div className="admin-system-page">
      <div className="staff-page-header">
        <h1 className="staff-page-title">Trạng thái hệ thống</h1>
        <p className="staff-page-desc">
          Thông số hạ tầng kỹ thuật, độ trễ API và môi trường vận hành của StudyAI.
        </p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px', marginBottom: '24px' }}>
        <div className="staff-card">
          <div className="staff-card-header">
            <h3 className="staff-card-title">Dịch vụ API</h3>
            <StatusBadge status="active" label="Hoạt động" />
          </div>
          <div className="staff-card-body">
            {loading ? (
              <Skeleton height={50} />
            ) : (
              <div>
                <div style={{ fontSize: '1.4rem', fontWeight: 700, color: 'var(--text-main)' }}>
                  {metrics?.apiLatencyMs || 0} ms
                </div>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: 4 }}>
                  Thời gian phản hồi trung bình
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="staff-card">
          <div className="staff-card-header">
            <h3 className="staff-card-title">Cơ sở dữ liệu</h3>
            <StatusBadge status="active" label="Đã kết nối" />
          </div>
          <div className="staff-card-body">
            {loading ? (
              <Skeleton height={50} />
            ) : (
              <div>
                <div style={{ fontSize: '1.4rem', fontWeight: 700, color: 'var(--text-main)' }}>
                  SQLite / Postgres
                </div>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: 4 }}>
                  Alembic Head: 003_user_roles
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="staff-card">
          <div className="staff-card-header">
            <h3 className="staff-card-title">Đồng bộ ngoại tuyến</h3>
            <StatusBadge status="active" label="Sẵn sàng" />
          </div>
          <div className="staff-card-body">
            {loading ? (
              <Skeleton height={50} />
            ) : (
              <div>
                <div style={{ fontSize: '1.4rem', fontWeight: 700, color: 'var(--text-main)' }}>
                  SyncQueue v2
                </div>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: 4 }}>
                  Namespaced offline storage
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="staff-card">
        <div className="staff-card-header">
          <h3 className="staff-card-title">Thông tin triển khai & Phiên bản</h3>
        </div>
        <div className="staff-card-body">
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '16px' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Môi trường:</div>
              <div style={{ fontWeight: 600 }}>{metrics?.environment || 'development'}</div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Backend Version:</div>
              <div style={{ fontWeight: 600 }}>{metrics?.backendVersion || 'v1.4.0'} (FastAPI)</div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Frontend Version:</div>
              <div style={{ fontWeight: 600 }}>{metrics?.frontendVersion || 'v2.1.0'} (React 19 + Vite)</div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Hosting Backend:</div>
              <div style={{ fontWeight: 600, color: '#b45309' }}>NOT CONFIGURED (Local / CI only)</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

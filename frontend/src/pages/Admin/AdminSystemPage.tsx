import React from 'react'
import {
  Cpu,
  Layers,
  Database,
  ExternalLink,
} from 'lucide-react'
import { Link } from 'react-router-dom'
import { useAdminSystemHealth } from '@/hooks/useAdmin'
import { Skeleton } from '@/components/ui/Skeleton'
import './AdminPages.css'
import '@/components/admin/AdminComponents.css'

export const AdminSystemPage: React.FC = () => {
  const { health, loading, error, refresh } = useAdminSystemHealth()

  const WORKSPACE_MODULES = [
    {
      name: 'Học viên (Learner Workspace)',
      route: '/dashboard',
      status: 'Đã đăng ký route',
      features: ['Lộ trình theo khối lớp', 'AI Tutor chat', 'Luyện tập', 'Bài thu hoạch'],
    },
    {
      name: 'Giáo viên (Teacher Workspace)',
      route: '/teacher',
      status: 'Đã đăng ký route',
      features: ['Quản lý lớp học', 'Giao bài tập', 'Theo dõi điểm số'],
    },
    {
      name: 'Biên soạn nội dung (Content Workspace)',
      route: '/content',
      status: 'Đã đăng ký route',
      features: ['Biên soạn bài học', 'Công thức LaTeX', 'Hàng đợi duyệt'],
    },
    {
      name: 'Quản trị hệ thống (Admin Workspace V2)',
      route: '/admin',
      status: 'Đã đăng ký route',
      features: ['Tổng quan', 'Quản lý người dùng', 'Phân trang & CSV', 'Theo dõi hệ thống'],
    },
  ]

  return (
    <div className="admin-system-page">
      {/* Header */}
      <div className="admin-header-row">
        <div className="staff-page-header" style={{ marginBottom: 0 }}>
          <h1 className="staff-page-title">Trạng thái hệ thống & Hạ tầng</h1>
          <p className="staff-page-desc">
            Báo cáo trực tiếp từ API quản trị và cơ sở dữ liệu STUDY_AI.
          </p>
        </div>
      </div>

      {error && (
        <div className="admin-alert-banner admin-alert-danger" role="alert" style={{ margin: '16px 0', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '8px', color: '#b91c1c' }}>
          <div>
            <strong>Lỗi kết nối máy chủ:</strong> {error}
          </div>
          <button type="button" className="admin-btn-outline" onClick={refresh} style={{ borderColor: '#b91c1c', color: '#b91c1c' }}>
            Thử lại
          </button>
        </div>
      )}

      <div className="admin-system-grid" style={{ marginTop: '20px' }}>
        {/* Card 1: Frontend Engine */}
        <div className="staff-card">
          <div className="staff-card-header">
            <div className="admin-sys-header-left">
              <Cpu size={16} className="sys-icon" />
              <h3 className="staff-card-title">Giao diện (Frontend)</h3>
            </div>
            <span className="mock-label-pill">Thực tế</span>
          </div>
          <div className="staff-card-body">
            <div className="sys-stat-val">{import.meta.env.VITE_APP_VERSION || 'Chưa khai báo'}</div>
            <div className="sys-stat-sub">React 19.2 + Vite 8.3 + TypeScript</div>
            <div className="sys-meta-list">
              <div className="sys-meta-item">
                <span>Bundle Engine:</span>
                <strong>Vite / Rolldown Build</strong>
              </div>
              <div className="sys-meta-item">
                <span>Môi trường:</span>
                <strong>{health?.environment || 'Chưa nhận dữ liệu'}</strong>
              </div>
            </div>
          </div>
        </div>

        {/* Card 2: Database persistence */}
        <div className="staff-card">
          <div className="staff-card-header">
            <div className="admin-sys-header-left">
              <Database size={16} className="sys-icon" />
              <h3 className="staff-card-title">Cơ sở dữ liệu</h3>
            </div>
            <span className="mock-label-pill">SQL Server</span>
          </div>
          <div className="staff-card-body">
            {loading ? (
              <Skeleton height={50} />
            ) : (
              <>
                <div className="sys-stat-val">
                  {health?.storageStats?.usersCount ?? 0} người dùng
                </div>
                <div className="sys-stat-sub">
                  {health?.database.status || 'Chưa nhận trạng thái'}
                </div>
                <div className="sys-meta-list">
                  <div className="sys-meta-item">
                    <span>Nhật ký hoạt động:</span>
                    <strong>{health?.storageStats?.activitiesCount ?? 0} bản ghi</strong>
                  </div>
                  <div className="sys-meta-item">
                    <span>Độ trễ truy vấn:</span>
                    <strong>{health && health.database.latencyMs >= 0 ? `${health.database.latencyMs} ms` : 'Không khả dụng'}</strong>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Card 3: Backend Status */}
        <div className="staff-card">
          <div className="staff-card-header">
            <div className="admin-sys-header-left">
              <Database size={16} className="sys-icon" />
              <h3 className="staff-card-title">Máy chủ (Backend)</h3>
            </div>
            <span className="mock-label-pill">API trực tiếp</span>
          </div>
          <div className="staff-card-body">
            <div className="sys-stat-val">
              {loading ? 'Đang kiểm tra…' : health?.apiStatus || 'Không khả dụng'}
            </div>
            <div className="sys-stat-sub">
              {health?.backendVersion || 'Chưa nhận phiên bản backend'}
            </div>
            <div className="sys-meta-list">
              <div className="sys-meta-item">
                <span>API Gateway:</span>
                <strong>{health?.apiStatus || 'Không khả dụng'}</strong>
              </div>
              <div className="sys-meta-item">
                <span>Lần kiểm tra:</span>
                <strong>{health?.checkedAt ? new Date(health.checkedAt).toLocaleString('vi-VN') : '—'}</strong>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Deployed Modules List */}
      <div className="staff-card" style={{ marginTop: '24px' }}>
        <div className="staff-card-header">
          <div className="admin-sys-header-left">
            <Layers size={16} className="sys-icon" />
            <h3 className="staff-card-title">Các module giao diện đã triển khai</h3>
          </div>
          <span className="admin-badge-count">{WORKSPACE_MODULES.length} Không gian</span>
        </div>
        <div className="staff-card-body" style={{ padding: 0 }}>
          <table className="staff-table" aria-label="Danh sách module giao diện">
            <thead>
              <tr>
                <th scope="col">Không gian làm việc</th>
                <th scope="col">Đường dẫn (Route)</th>
                <th scope="col">Tính năng chính</th>
                <th scope="col">Trạng thái</th>
                <th scope="col" style={{ textAlign: 'right' }}>Xem</th>
              </tr>
            </thead>
            <tbody>
              {WORKSPACE_MODULES.map((mod) => (
                <tr key={mod.route}>
                  <td>
                    <div style={{ fontWeight: 600, color: 'var(--text-main)' }}>
                      {mod.name}
                    </div>
                  </td>
                  <td>
                    <code style={{ fontSize: '0.82rem' }}>{mod.route}</code>
                  </td>
                  <td>
                    <div className="admin-mod-tags">
                      {mod.features.map((f) => (
                        <span key={f} className="admin-mod-tag">{f}</span>
                      ))}
                    </div>
                  </td>
                  <td>
                    <span className="staff-status-badge active">{mod.status}</span>
                  </td>
                  <td style={{ textAlign: 'right' }}>
                    <Link
                      to={mod.route}
                      className="staff-action-link"
                      aria-label={`Truy cập ${mod.name}`}
                    >
                      <span>Mở</span>
                      <ExternalLink size={12} />
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  )
}

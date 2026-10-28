import React, { useState } from 'react'
import {
  RotateCcw,
  CheckCircle2,
  Cpu,
  HardDrive,
  Layers,
  Database,
  ExternalLink,
} from 'lucide-react'
import { Link } from 'react-router-dom'
import { useAdminSystemHealth } from '@/hooks/useAdmin'
import { Button } from '@/components/ui/Button'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { Skeleton } from '@/components/ui/Skeleton'
import './AdminPages.css'
import '@/components/admin/AdminComponents.css'

export const AdminSystemPage: React.FC = () => {
  const { health, loading, resetDemoData } = useAdminSystemHealth()
  const [resetConfirmOpen, setResetConfirmOpen] = useState(false)
  const [resetFeedback, setResetFeedback] = useState<string | null>(null)

  const handleReset = async () => {
    await resetDemoData()
    setResetConfirmOpen(false)
    setResetFeedback('Đã đặt lại toàn bộ dữ liệu demo về trạng thái ban đầu.')
    setTimeout(() => setResetFeedback(null), 3500)
  }

  const WORKSPACE_MODULES = [
    {
      name: 'Học viên (Learner Workspace)',
      route: '/dashboard',
      status: 'Sẵn sàng trải nghiệm',
      features: ['Lộ trình Toán 12', 'AI Tutor chat', 'Làm bài trắc nghiệm', 'Bài thu hoạch'],
    },
    {
      name: 'Giáo viên (Teacher Workspace)',
      route: '/teacher',
      status: 'Sẵn sàng trải nghiệm',
      features: ['Quản lý lớp học', 'Giao bài tập', 'Theo dõi điểm số'],
    },
    {
      name: 'Biên soạn nội dung (Content Workspace)',
      route: '/content',
      status: 'Sẵn sàng trải nghiệm',
      features: ['Biên soạn bài học', 'Công thức LaTeX', 'Hàng đợi duyệt'],
    },
    {
      name: 'Trung tâm hỗ trợ (Support Workspace)',
      route: '/support',
      status: 'Sẵn sàng trải nghiệm',
      features: ['Ticket khiếu nại', 'Tra cứu người dùng', 'Trạng thái sync'],
    },
    {
      name: 'Quản trị hệ thống (Admin Workspace V2)',
      route: '/admin',
      status: 'Đã hoàn thiện V2',
      features: ['Tổng quan 5 hàng', 'Quản lý người dùng', 'Phân trang & CSV', 'Sandbox quyền'],
    },
  ]

  return (
    <div className="admin-system-page">
      {/* Toast Feedback */}
      {resetFeedback && (
        <div className="admin-toast-banner" role="status">
          <CheckCircle2 size={16} />
          <span>{resetFeedback}</span>
        </div>
      )}

      {/* Header */}
      <div className="admin-header-row">
        <div className="staff-page-header" style={{ marginBottom: 0 }}>
          <h1 className="staff-page-title">Trạng thái hệ thống & Hạ tầng</h1>
          <p className="staff-page-desc">
            Báo cáo môi trường vận hành, phiên bản giao diện và bộ lưu trữ cục bộ STUDY_AI.
          </p>
        </div>

        <Button
          variant="outline"
          icon={RotateCcw}
          onClick={() => setResetConfirmOpen(true)}
          aria-label="Đặt lại dữ liệu demo"
        >
          <span>Đặt lại dữ liệu Demo</span>
        </Button>
      </div>

      {/* Honest Prototype Notice */}
      <div className="admin-system-honest-card" style={{ marginTop: '20px' }}>
        <div className="honest-card-top">
          <span className="prototype-status-pill">FE Prototype Standalone</span>
          <span className="prototype-label-tag">Chế độ xem trước giao diện</span>
        </div>
        <p className="honest-card-text">
          Hệ thống đang chạy hoàn toàn ở chế độ <strong>Frontend Prototype</strong> phục vụ đánh giá UI/UX.
          Mọi số liệu, thời gian phản hồi API và nhật ký thay đổi đều là <strong>Dữ liệu mô phỏng (Mock Data)</strong> được lưu bền vững trong trình duyệt (<code>localStorage</code>) và <strong>chưa kết nối với cơ sở dữ liệu thật của Backend</strong>.
        </p>
      </div>

      {/* 3 Metric Cards with Mock Indicator */}
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
            <div className="sys-stat-val">v2.2.0</div>
            <div className="sys-stat-sub">React 19.2 + Vite 8.3 + TypeScript</div>
            <div className="sys-meta-list">
              <div className="sys-meta-item">
                <span>Bundle Engine:</span>
                <strong>Vite / Rolldown Build</strong>
              </div>
              <div className="sys-meta-item">
                <span>Môi trường:</span>
                <strong>GitHub Pages / Static SPA</strong>
              </div>
            </div>
          </div>
        </div>

        {/* Card 2: Local Storage Persistence */}
        <div className="staff-card">
          <div className="staff-card-header">
            <div className="admin-sys-header-left">
              <HardDrive size={16} className="sys-icon" />
              <h3 className="staff-card-title">Lưu trữ cục bộ</h3>
            </div>
            <span className="mock-label-pill">LocalStorage</span>
          </div>
          <div className="staff-card-body">
            {loading ? (
              <Skeleton height={50} />
            ) : (
              <>
                <div className="sys-stat-val">
                  {health?.storageStats.usersCount ?? 0} người dùng
                </div>
                <div className="sys-stat-sub">
                  Đồng bộ tức thời vào Web Storage
                </div>
                <div className="sys-meta-list">
                  <div className="sys-meta-item">
                    <span>Nhật ký hoạt động:</span>
                    <strong>{health?.storageStats.activitiesCount ?? 0} bản ghi</strong>
                  </div>
                  <div className="sys-meta-item">
                    <span>Trạng thái lưu:</span>
                    <strong style={{ color: '#047857' }}>
                      {health?.storageStats.isLocalStoragePersisted ? 'Đã lưu cache' : 'Mặc định sẵn có'}
                    </strong>
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
            <span className="mock-label-pill warning">Dữ liệu mô phỏng</span>
          </div>
          <div className="staff-card-body">
            <div className="sys-stat-val" style={{ color: '#b45309' }}>
              Chưa nối máy chủ
            </div>
            <div className="sys-stat-sub">
              Sử dụng Mock Engine trong bộ nhớ
            </div>
            <div className="sys-meta-list">
              <div className="sys-meta-item">
                <span>API Gateway:</span>
                <strong>Client Mock Service</strong>
              </div>
              <div className="sys-meta-item">
                <span>Đồng bộ máy chủ:</span>
                <strong style={{ color: '#b45309' }}>Sẵn sàng kết nối sau</strong>
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

      {/* Confirm Reset Dialog */}
      <ConfirmDialog
        isOpen={resetConfirmOpen}
        title="Đặt lại toàn bộ dữ liệu Demo?"
        description="Toàn bộ tài khoản vừa thêm, phân quyền đã chỉnh và nhật ký hoạt động lưu trong localStorage sẽ bị xóa và quay về bộ dữ liệu mẫu ban đầu."
        confirmText="Xác nhận đặt lại"
        cancelText="Hủy bỏ"
        isDestructive={true}
        onConfirm={handleReset}
        onCancel={() => setResetConfirmOpen(false)}
      />
    </div>
  )
}

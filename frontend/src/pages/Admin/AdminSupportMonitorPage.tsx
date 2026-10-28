import React, { useEffect, useState, useMemo } from 'react'
import {
  LifeBuoy,
  Clock,
  CheckCircle2,
  ArrowRight,
  ExternalLink,
  ShieldAlert,
} from 'lucide-react'
import { Link } from 'react-router-dom'
import { supportService } from '@/services/support.service'
import type { SupportTicketItem } from '@/types/support'
import { Skeleton } from '@/components/ui/Skeleton'
import { EmptyState } from '@/components/ui/EmptyState'
import './AdminPages.css'
import '@/components/admin/AdminComponents.css'

export const AdminSupportMonitorPage: React.FC = () => {
  const [tickets, setTickets] = useState<SupportTicketItem[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let active = true
    supportService
      .getTickets()
      .then((res) => {
        if (!active) return
        const list = Array.isArray(res) ? res : (res as { items?: SupportTicketItem[] })?.items || []
        setTickets(list)
      })
      .catch(() => {
        // fallback
      })
      .finally(() => {
        if (active) setLoading(false)
      })

    return () => {
      active = false
    }
  }, [])

  // Metrics
  const metrics = useMemo(() => {
    const total = tickets.length
    const open = tickets.filter((t) => t.status === 'open').length
    const inProgress = tickets.filter((t) => t.status === 'in-progress' || t.status === 'waiting').length
    const resolved = tickets.filter((t) => t.status === 'resolved').length
    const urgent = tickets.filter((t) => t.priority === 'urgent' || t.priority === 'high').length
    const slaRate = total > 0 ? Math.round(((total - urgent) / total) * 100) : 98

    return { total, open, inProgress, resolved, urgent, slaRate }
  }, [tickets])

  return (
    <div className="admin-page-container">
      {/* Header */}
      <div className="admin-page-header">
        <div>
          <h1 className="admin-page-title">Giám sát & Báo cáo Vận hành Hỗ trợ</h1>
          <p className="admin-page-desc">
            Theo dõi khối lượng yêu cầu hỗ trợ (tickets), mức độ tuân thủ SLA phản hồi và chất lượng dịch vụ người dùng.
          </p>
        </div>

        <Link to="/support/tickets" className="btn btn-primary" style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
          <span>Mở Support Workspace</span>
          <ExternalLink size={16} />
        </Link>
      </div>

      {/* 4 KPIs */}
      <div className="admin-stats-grid">
        <div className="admin-stat-card">
          <div className="stat-icon" style={{ backgroundColor: '#E0F2FE', color: '#0369A1' }}>
            <LifeBuoy size={22} />
          </div>
          <div>
            <div className="stat-label">Tổng số yêu cầu tiếp nhận</div>
            <div className="stat-value">{metrics.total}</div>
          </div>
        </div>

        <div className="admin-stat-card">
          <div className="stat-icon" style={{ backgroundColor: '#FEE2E2', color: '#DC2626' }}>
            <ShieldAlert size={22} />
          </div>
          <div>
            <div className="stat-label">Yêu cầu khẩn cấp (P1/P2)</div>
            <div className="stat-value">{metrics.urgent}</div>
          </div>
        </div>

        <div className="admin-stat-card">
          <div className="stat-icon" style={{ backgroundColor: '#FEF3C7', color: '#B45309' }}>
            <Clock size={22} />
          </div>
          <div>
            <div className="stat-label">Đang được xử lý</div>
            <div className="stat-value">{metrics.inProgress}</div>
          </div>
        </div>

        <div className="admin-stat-card">
          <div className="stat-icon" style={{ backgroundColor: '#DCFCE7', color: '#15803D' }}>
            <CheckCircle2 size={22} />
          </div>
          <div>
            <div className="stat-label">Tuân thủ cam kết SLA</div>
            <div className="stat-value">{metrics.slaRate}%</div>
          </div>
        </div>
      </div>

      {/* Callout */}
      <div
        style={{
          backgroundColor: '#FFF9EA',
          border: '1px solid #F4B942',
          borderRadius: 8,
          padding: '16px 20px',
          marginBottom: 24,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: 16,
        }}
      >
        <div>
          <strong style={{ color: '#102A43', fontSize: '1rem' }}>
            Phân quyền nghiệp vụ V6: Trách nhiệm xử lý khiếu nại & hỗ trợ
          </strong>
          <p style={{ margin: '4px 0 0 0', fontSize: '0.875rem', color: '#627D98' }}>
            Nghiệp vụ phản hồi, điều phối kỹ thuật và trò chuyện trực tiếp với học viên/giáo viên thuộc quyền sở hữu của <strong>Support Workspace</strong>.
            Quản trị viên theo dõi chỉ số vận hành tại đây và can thiệp khi có vi phạm SLA kéo dài.
          </p>
        </div>

        <div style={{ display: 'flex', gap: 10 }}>
          <Link to="/support/users" className="btn btn-secondary btn-sm">
            Tra cứu người dùng
          </Link>
          <Link to="/support/tickets" className="btn btn-primary btn-sm">
            Hàng đợi Ticket &rarr;
          </Link>
        </div>
      </div>

      {/* Ticket List Preview */}
      <div className="admin-card">
        <div className="admin-card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h2 className="admin-card-title">Yêu cầu hỗ trợ đang hoạt động gần đây</h2>
          <Link to="/support/tickets" style={{ fontSize: '0.85rem', color: '#102A43', textDecoration: 'none', fontWeight: 600 }}>
            Xem toàn bộ hàng đợi &rarr;
          </Link>
        </div>

        <div className="admin-table-container">
          {loading ? (
            <div style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 12 }}>
              <Skeleton height={44} />
              <Skeleton height={44} />
            </div>
          ) : tickets.length === 0 ? (
            <EmptyState
              title="Không có yêu cầu hỗ trợ"
              description="Hiện tại hệ thống không ghi nhận khiếu nại hoặc sự cố nào chưa xử lý."
            />
          ) : (
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Mã & Tiêu đề</th>
                  <th>Người gửi</th>
                  <th>Chuyên mục</th>
                  <th>Ưu tiên</th>
                  <th>Chuyên viên phụ trách</th>
                  <th>Trạng thái</th>
                  <th style={{ textAlign: 'center' }}>Chi tiết</th>
                </tr>
              </thead>
              <tbody>
                {tickets.slice(0, 6).map((t) => (
                  <tr key={t.id}>
                    <td>
                      <div style={{ fontWeight: 600, color: '#102A43' }}>{t.title}</div>
                      <div style={{ fontSize: '0.75rem', color: '#627D98', fontFamily: 'monospace' }}>{t.id}</div>
                    </td>
                    <td>
                      <div style={{ fontWeight: 500, color: '#102A43' }}>{t.userName}</div>
                      <div style={{ fontSize: '0.75rem', color: '#627D98' }}>{t.userEmail}</div>
                    </td>
                    <td>
                      <span className="badge badge-secondary">{t.category}</span>
                    </td>
                    <td>
                      <span
                        className={`badge ${
                          t.priority === 'urgent'
                            ? 'badge-danger'
                            : t.priority === 'high'
                            ? 'badge-warning'
                            : 'badge-secondary'
                        }`}
                      >
                        {t.priority}
                      </span>
                    </td>
                    <td style={{ color: '#102A43', fontSize: '0.85rem' }}>
                      {t.assignedTo || 'Chưa phân công'}
                    </td>
                    <td>
                      <span
                        className={`badge ${
                          t.status === 'resolved'
                            ? 'badge-success'
                            : t.status === 'in-progress'
                            ? 'badge-warning'
                            : 'badge-danger'
                        }`}
                      >
                        {t.status === 'in-progress' ? 'Đang xử lý' : t.status === 'resolved' ? 'Đã giải quyết' : t.status === 'waiting' ? 'Chờ phản hồi' : 'Mới mở'}
                      </span>
                    </td>
                    <td style={{ textAlign: 'center' }}>
                      <Link
                        to={`/support/tickets/${t.id}`}
                        className="btn btn-secondary btn-sm"
                        style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}
                      >
                        <span>Xử lý</span>
                        <ArrowRight size={13} />
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  )
}

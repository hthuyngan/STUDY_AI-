import React from 'react'
import { Link } from 'react-router-dom'
import { LifeBuoy, UserCheck, CheckCircle2, Clock, ShieldCheck, ArrowRight } from 'lucide-react'
import { useSupportDashboard } from '@/hooks/useSupport'
import { Skeleton } from '@/components/ui/Skeleton'
import { PageErrorState } from '@/components/ui/PageErrorState'
import { SummaryStrip } from '@/components/ui/SummaryStrip'
import { SupportTicketTable } from './components/tickets/SupportTicketTable'
import { SupportTicketCardList } from './components/tickets/SupportTicketCardList'
import './SupportPages.css'
import '../Admin/AdminPages.css'
import '@/components/admin/AdminComponents.css'

export const SupportDashboardPage: React.FC = () => {
  const { data, loading, error, refresh } = useSupportDashboard()

  if (loading) {
    return (
      <div className="admin-page-container">
        <Skeleton height={36} width={260} />
        <div style={{ marginTop: '20px' }}>
          <Skeleton height={64} />
        </div>
        <div style={{ marginTop: '20px' }}>
          <Skeleton height={240} />
        </div>
      </div>
    )
  }

  if (error || !data) {
    return (
      <div className="admin-page-container">
        <PageErrorState
          title="Không thể kết nối máy chủ quản trị."
          message={error || 'Không có dữ liệu hỗ trợ'}
          onRetry={refresh}
        />
      </div>
    )
  }

  const supportKPIs = [
    {
      id: 'open',
      label: 'Yêu cầu đang mở',
      value: data.openCount,
      color: '#dc2626',
    },
    {
      id: 'waiting',
      label: 'Đang xử lý / Chờ',
      value: data.waitingCount,
      color: '#d97706',
    },
    {
      id: 'escalated',
      label: 'Mức độ khẩn cấp (P1/P2)',
      value: data.escalatedCount,
      color: '#b91c1c',
    },
    {
      id: 'resolved',
      label: 'Đã giải quyết hôm nay',
      value: data.resolvedTodayCount,
      color: '#047857',
    },
  ]

  return (
    <div className="admin-page-container">
      {/* Page Header */}
      <div className="staff-page-header">
        <div className="admin-header-row">
          <div>
            <h1 className="staff-page-title">Bàn làm việc Hỗ trợ người dùng</h1>
            <p className="staff-page-desc">
              Theo dõi hàng đợi yêu cầu hỗ trợ (tickets), kiểm soát SLA phản hồi và giải quyết sự cố kỹ thuật.
            </p>
          </div>
          <div className="admin-header-actions" style={{ display: 'flex', gap: 10 }}>
            <Link to="/support/tickets" className="btn btn-primary" style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
              <LifeBuoy size={15} />
              <span>Xem hàng đợi Ticket</span>
            </Link>
            <Link to="/support/users" className="btn btn-secondary" style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
              <UserCheck size={15} />
              <span>Tra cứu người dùng</span>
            </Link>
          </div>
        </div>
      </div>

      {/* 4 KPIs Summary Strip */}
      <SummaryStrip items={supportKPIs} ariaLabel="Thống kê nhanh hàng đợi hỗ trợ" />

      {/* SLA & Operations Health Banner */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
          gap: 14,
          margin: '16px 0',
        }}
      >
        <div
          style={{
            padding: '12px 16px',
            background: '#ffffff',
            borderRadius: 8,
            border: '1px solid #e2e8f0',
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            boxShadow: '0 1px 2px rgba(0,0,0,0.03)',
          }}
        >
          <div
            style={{
              width: 36,
              height: 36,
              borderRadius: '50%',
              background: 'rgba(4, 120, 87, 0.1)',
              color: '#047857',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <CheckCircle2 size={18} />
          </div>
          <div>
            <div style={{ fontSize: '0.78rem', color: '#64748b', fontWeight: 600 }}>Tỷ lệ tuân thủ SLA</div>
            <div style={{ fontSize: '1.05rem', fontWeight: 800, color: '#102a43' }}>96.4% đạt chuẩn</div>
          </div>
        </div>

        <div
          style={{
            padding: '12px 16px',
            background: '#ffffff',
            borderRadius: 8,
            border: '1px solid #e2e8f0',
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            boxShadow: '0 1px 2px rgba(0,0,0,0.03)',
          }}
        >
          <div
            style={{
              width: 36,
              height: 36,
              borderRadius: '50%',
              background: 'rgba(2, 132, 199, 0.1)',
              color: '#0284c7',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Clock size={18} />
          </div>
          <div>
            <div style={{ fontSize: '0.78rem', color: '#64748b', fontWeight: 600 }}>Thời gian phản hồi TB</div>
            <div style={{ fontSize: '1.05rem', fontWeight: 800, color: '#102a43' }}>1.8 giờ (Mục tiêu: &lt; 4h)</div>
          </div>
        </div>

        <div
          style={{
            padding: '12px 16px',
            background: '#ffffff',
            borderRadius: 8,
            border: '1px solid #e2e8f0',
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            boxShadow: '0 1px 2px rgba(0,0,0,0.03)',
          }}
        >
          <div
            style={{
              width: 36,
              height: 36,
              borderRadius: '50%',
              background: 'rgba(16, 42, 67, 0.08)',
              color: 'var(--navy-primary, #102a43)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <ShieldCheck size={18} />
          </div>
          <div>
            <div style={{ fontSize: '0.78rem', color: '#64748b', fontWeight: 600 }}>Đồng bộ dữ liệu học viên</div>
            <div style={{ fontSize: '1.05rem', fontWeight: 800, color: '#102a43' }}>100% Khỏe mạnh</div>
          </div>
        </div>
      </div>

      {/* Priority Work Queue Table & Mobile Cards */}
      <div className="admin-card" style={{ marginTop: 14 }}>
        <div
          className="admin-card-header"
          style={{
            padding: '14px 18px',
            borderBottom: '1px solid #e2e8f0',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <div>
            <h2 style={{ fontSize: '0.98rem', fontWeight: 700, margin: 0, color: 'var(--navy-primary, #102a43)' }}>
              Hàng đợi yêu cầu hỗ trợ ưu tiên (Work Queue)
            </h2>
            <p style={{ fontSize: '0.78rem', color: '#64748b', margin: '2px 0 0 0' }}>
              Các sự cố cần chuyên viên tiếp nhận và xử lý theo cam kết chất lượng dịch vụ.
            </p>
          </div>
          <Link
            to="/support/tickets"
            style={{
              fontSize: '0.84rem',
              color: '#0284c7',
              textDecoration: 'none',
              fontWeight: 600,
              display: 'inline-flex',
              alignItems: 'center',
              gap: 4,
            }}
          >
            <span>Toàn bộ hàng đợi</span>
            <ArrowRight size={14} />
          </Link>
        </div>

        <div className="staff-table-wrapper has-mobile-cards" style={{ border: 'none' }}>
          <SupportTicketTable tickets={data.recentTickets} />
          <SupportTicketCardList tickets={data.recentTickets} />
        </div>
      </div>
    </div>
  )
}

import React, { useState } from 'react'
import {
  Check,
  CreditCard,
  ShieldAlert,
  Users,
  BarChart3,
} from 'lucide-react'
import { AdminTabs, StatusBadge, AdminButton } from '@/components/admin/ui'
import './AdminPages.css'
import '@/components/admin/AdminComponents.css'

interface SamplePlan {
  id: string
  name: string
  priceLabel: string
  dailyAiLimit: number
  description: string
  features: string[]
  status: 'active'
  subscribersCount: number
}

const SAMPLE_PLANS: SamplePlan[] = [
  {
    id: 'plan_free',
    name: 'Free',
    priceLabel: '0 VNĐ/tháng',
    dailyAiLimit: 10,
    description: 'Gói cơ bản dành cho học sinh làm quen với lộ trình Toán 10–12.',
    features: [
      '10 lượt hỏi đáp AI Tutor / ngày',
      'Truy cập bài giảng & bài tập chuẩn GDPT 2018',
      'Theo dõi tiến độ học tập cá nhân',
    ],
    status: 'active',
    subscribersCount: 1240,
  },
  {
    id: 'plan_plus',
    name: 'Plus',
    priceLabel: '49.000 VNĐ/tháng',
    dailyAiLimit: 100,
    description: 'Gói tiêu chuẩn cho học sinh ôn luyện thường xuyên và phân tích lỗi sai.',
    features: [
      '100 lượt hỏi đáp AI Tutor / ngày',
      'Phân tích lỗi sai chi tiết & gợi ý bài ôn tập',
      'Lộ trình học thích ứng cá nhân hóa',
    ],
    status: 'active',
    subscribersCount: 318,
  },
  {
    id: 'plan_pro',
    name: 'Pro',
    priceLabel: '99.000 VNĐ/tháng',
    dailyAiLimit: 300,
    description: 'Gói nâng cao cho học sinh ôn thi THPT Quốc gia cường độ cao.',
    features: [
      '300 lượt hỏi đáp AI Tutor / ngày',
      'Ưu tiên model suy luận cho bài toán vận dụng cao',
      'Hỏi đáp từ tài liệu cá nhân & báo cáo chuyên sâu',
    ],
    status: 'active',
    subscribersCount: 94,
  },
]

const SAMPLE_USER_SUBSCRIPTIONS = [
  { id: 'sub_01', user: 'Nguyễn Minh Anh', email: 'minhanh@example.com', plan: 'Pro', usedToday: 112, limit: 300, expiresAt: '27/12/2026', status: 'active' },
  { id: 'sub_02', user: 'Trần Gia Bảo', email: 'giabao@example.com', plan: 'Plus', usedToday: 48, limit: 100, expiresAt: '15/12/2026', status: 'active' },
  { id: 'sub_03', user: 'Lê Thảo Vy', email: 'thaovy@example.com', plan: 'Free', usedToday: 9, limit: 10, expiresAt: 'Không thời hạn', status: 'active' },
]

export const AdminSubscriptionsMockupPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState('plans')

  return (
    <div className="admin-users-page">
      <div className="admin-header-row">
        <div className="staff-page-header" style={{ marginBottom: 0 }}>
          <h1 className="staff-page-title">Quản lý gói đăng ký & Hạn mức AI</h1>
          <p className="staff-page-desc">
            Thiết lập gói dịch vụ (Free, Plus, Pro), quyền lợi tính năng, hạn mức lượt AI/ngày và theo dõi thuê bao.
          </p>
        </div>
        <AdminButton variant="secondary" disabled title="Chờ phê duyệt thiết kế ADM-05">
          Tạo gói mới (Chờ duyệt)
        </AdminButton>
      </div>

      {/* Design Approval Gate Banner */}
      <div
        role="status"
        style={{
          display: 'flex',
          alignItems: 'flex-start',
          gap: '12px',
          padding: '14px 16px',
          borderRadius: '8px',
          border: '1px solid #FDE68A',
          background: '#FFFBEB',
          marginTop: '16px',
          marginBottom: '20px',
          fontSize: '13px',
          color: '#92400E',
        }}
      >
        <ShieldAlert size={18} style={{ flexShrink: 0, marginTop: '2px' }} />
        <div>
          <strong>BẢN MẪU THIẾT KẾ ADM-05 — CHỜ CHỦ DỰ ÁN PHÊ DUYỆT</strong>
          <p style={{ margin: '4px 0 0', lineHeight: 1.5 }}>
            Mức giá (Free 0đ, Plus 49.000đ, Pro 99.000đ) và hạn mức AI (10 / 100 / 300 lượt/ngày) chỉ là <strong>dữ liệu minh họa</strong>, không phải cấu hình kinh doanh chính thức.
            Không tạo giao dịch giả hoặc kích hoạt gói trả phí từ Frontend.
          </p>
        </div>
      </div>

      <AdminTabs
        activeTab={activeTab}
        onTabChange={setActiveTab}
        tabs={[
          { id: 'plans', label: 'Danh sách gói (3)', icon: <CreditCard size={14} /> },
          { id: 'subscribers', label: 'Thuê bao người dùng', icon: <Users size={14} /> },
          { id: 'stats', label: 'Thống kê gói', icon: <BarChart3 size={14} /> },
        ]}
      />

      {activeTab === 'plans' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px', marginTop: '16px' }}>
          {SAMPLE_PLANS.map((plan) => (
            <div key={plan.id} className="staff-card" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
              <div className="staff-card-body">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                  <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 700, color: '#0F172A' }}>{plan.name}</h3>
                  <StatusBadge status={plan.status} />
                </div>
                <div style={{ fontSize: '22px', fontWeight: 700, color: '#1D4ED8', fontVariantNumeric: 'tabular-nums', marginBottom: '4px' }}>
                  {plan.priceLabel}
                </div>
                <div style={{ fontSize: '13px', fontWeight: 600, color: '#334155', marginBottom: '10px' }}>
                  Hạn mức AI: {plan.dailyAiLimit} lượt / ngày
                </div>
                <p style={{ fontSize: '13px', color: '#64748B', marginBottom: '14px', lineHeight: 1.5 }}>{plan.description}</p>
                <ul style={{ margin: 0, padding: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '13px', color: '#334155' }}>
                  {plan.features.map((f) => (
                    <li key={f} style={{ display: 'flex', alignItems: 'flex-start', gap: '8px' }}>
                      <Check size={15} style={{ color: '#16A34A', flexShrink: 0, marginTop: '2px' }} />
                      <span>{f}</span>
                    </li>
                  ))}
                </ul>
              </div>
              <div style={{ padding: '12px 18px', borderTop: '1px solid #E2E8F0', background: '#F8FAFC', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '12px', color: '#64748B' }}>
                <span>Minh họa: {plan.subscribersCount.toLocaleString('vi-VN')} người dùng</span>
                <AdminButton size="sm" variant="secondary" disabled>
                  Chỉnh sửa
                </AdminButton>
              </div>
            </div>
          ))}
        </div>
      )}

      {activeTab === 'subscribers' && (
        <div className="staff-table-wrapper" style={{ marginTop: '16px' }}>
          <table className="staff-table" aria-label="Danh sách thuê bao minh họa">
            <thead>
              <tr>
                <th scope="col">Người dùng</th>
                <th scope="col">Gói hiện tại</th>
                <th scope="col">Lượt AI hôm nay</th>
                <th scope="col">Ngày hết hạn</th>
                <th scope="col">Trạng thái</th>
              </tr>
            </thead>
            <tbody>
              {SAMPLE_USER_SUBSCRIPTIONS.map((s) => (
                <tr key={s.id}>
                  <td>
                    <div style={{ fontWeight: 600, color: '#0F172A' }}>{s.user}</div>
                    <div style={{ fontSize: '12px', color: '#64748B' }}>{s.email}</div>
                  </td>
                  <td>
                    <span className="staff-role-pill">{s.plan}</span>
                  </td>
                  <td style={{ fontVariantNumeric: 'tabular-nums' }}>
                    {s.usedToday} / {s.limit} lượt
                  </td>
                  <td>{s.expiresAt}</td>
                  <td>
                    <StatusBadge status={s.status} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {activeTab === 'stats' && (
        <div className="staff-card" style={{ marginTop: '16px' }}>
          <div className="staff-card-body">
            <h3 style={{ margin: '0 0 12px', fontSize: '15px', fontWeight: 600 }}>Phân bố gói (Dữ liệu minh họa)</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {SAMPLE_PLANS.map((plan) => {
                const total = SAMPLE_PLANS.reduce((acc, p) => acc + p.subscribersCount, 0)
                const pct = Math.round((plan.subscribersCount / total) * 100)
                return (
                  <div key={plan.id} style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}>
                      <span>{plan.name} ({plan.priceLabel})</span>
                      <span style={{ fontWeight: 600 }}>{plan.subscribersCount.toLocaleString('vi-VN')} ({pct}%)</span>
                    </div>
                    <div style={{ height: '8px', borderRadius: '4px', background: '#F1F5F9', overflow: 'hidden' }}>
                      <div style={{ height: '100%', width: `${pct}%`, background: '#1D4ED8', borderRadius: '4px' }} />
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

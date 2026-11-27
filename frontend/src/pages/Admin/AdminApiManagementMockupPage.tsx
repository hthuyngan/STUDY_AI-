import React, { useState } from 'react'
import {
  Activity,
  AlertCircle,
  CheckCircle2,
  Cpu,
  KeyRound,
  Plus,
  RefreshCw,
  ShieldAlert,
  Sliders,
} from 'lucide-react'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts'
import { AdminTabs, StatusBadge, AdminButton, AdminIconButton } from '@/components/admin/ui'
import './AdminPages.css'
import '@/components/admin/AdminComponents.css'

interface MockProvider {
  id: string
  name: string
  providerType: string
  baseUrl: string
  defaultModel: string
  role: 'Primary' | 'Fallback' | 'Standby'
  status: 'active' | 'disabled'
  latencyMs: number
  errorRate: number
  monthlyBudgetUsd: number
  spentUsd: number
}

const SAMPLE_PROVIDERS: MockProvider[] = [
  {
    id: 'prov_openai_main',
    name: 'OpenAI Production (Minh họa)',
    providerType: 'OpenAI-Compatible',
    baseUrl: 'https://api.openai.com/v1',
    defaultModel: 'gpt-4o-mini',
    role: 'Primary',
    status: 'active',
    latencyMs: 640,
    errorRate: 0.4,
    monthlyBudgetUsd: 150,
    spentUsd: 42.8,
  },
  {
    id: 'prov_gemini_fb',
    name: 'Google Gemini Fallback (Minh họa)',
    providerType: 'Gemini',
    baseUrl: 'https://generativelanguage.googleapis.com/v1beta',
    defaultModel: 'gemini-1.5-flash',
    role: 'Fallback',
    status: 'active',
    latencyMs: 520,
    errorRate: 0.2,
    monthlyBudgetUsd: 80,
    spentUsd: 11.4,
  },
  {
    id: 'prov_local_eval',
    name: 'Secondary Gateway (Tạm tắt)',
    providerType: 'OpenAI-Compatible',
    baseUrl: 'https://gateway.example.com/v1',
    defaultModel: 'gpt-4.1-mini',
    role: 'Standby',
    status: 'disabled',
    latencyMs: 0,
    errorRate: 0,
    monthlyBudgetUsd: 50,
    spentUsd: 0,
  },
]

const SAMPLE_USAGE_DATA = [
  { day: '21/11', tokensK: 145, costUsd: 1.8 },
  { day: '22/11', tokensK: 190, costUsd: 2.3 },
  { day: '23/11', tokensK: 172, costUsd: 2.1 },
  { day: '24/11', tokensK: 230, costUsd: 2.9 },
  { day: '25/11', tokensK: 215, costUsd: 2.6 },
  { day: '26/11', tokensK: 268, costUsd: 3.2 },
  { day: '27/11', tokensK: 244, costUsd: 3.0 },
]

export const AdminApiManagementMockupPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState('list')
  const [selectedProvider, setSelectedProvider] = useState<MockProvider>(SAMPLE_PROVIDERS[0])
  const [testNotice, setTestNotice] = useState<string | null>(null)

  return (
    <div className="admin-users-page">
      <div className="admin-header-row">
        <div className="staff-page-header" style={{ marginBottom: 0 }}>
          <h1 className="staff-page-title">Quản lý API & AI Provider</h1>
          <p className="staff-page-desc">
            Cấu hình nhà cung cấp LLM, định tuyến Primary/Fallback, giới hạn ngân sách và theo dõi hiệu năng.
          </p>
        </div>
        <AdminButton variant="primary" icon={<Plus size={15} />} disabled title="Chờ phê duyệt thiết kế ADM-04">
          Thêm Provider (Chờ duyệt)
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
          <strong>BẢN MẪU THIẾT KẾ ADM-04 — CHỜ CHỦ DỰ ÁN PHÊ DUYỆT</strong>
          <p style={{ margin: '4px 0 0', lineHeight: 1.5 }}>
            Trang này sử dụng <strong>dữ liệu minh họa</strong> để trình bày giao diện Provider List, Provider Configuration và Usage Analytics.
            Khi được phê duyệt, Backend sẽ lưu API Key bằng cơ chế mã hóa/Secret Store (không trả key về Frontend), bảo vệ Base URL chống SSRF, và tách biệt hoàn toàn khỏi Codex CLI reviewer.
          </p>
        </div>
      </div>

      {testNotice && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '10px 14px',
            borderRadius: '8px',
            border: '1px solid #BAE6FD',
            background: '#F0F9FF',
            color: '#0369A1',
            fontSize: '13px',
            marginBottom: '16px',
          }}
        >
          <CheckCircle2 size={15} />
          <span>{testNotice}</span>
        </div>
      )}

      <AdminTabs
        activeTab={activeTab}
        onTabChange={setActiveTab}
        tabs={[
          { id: 'list', label: 'Danh sách Provider', icon: <Cpu size={14} />, badge: SAMPLE_PROVIDERS.length },
          { id: 'config', label: 'Cấu hình Provider', icon: <Sliders size={14} /> },
          { id: 'analytics', label: 'Phân tích sử dụng', icon: <Activity size={14} /> },
        ]}
      />

      {activeTab === 'list' && (
        <div className="staff-table-wrapper" style={{ marginTop: '16px' }}>
          <table className="staff-table" aria-label="Danh sách AI Provider minh họa">
            <thead>
              <tr>
                <th scope="col">Tên Provider</th>
                <th scope="col">Vai trò định tuyến</th>
                <th scope="col">Model mặc định</th>
                <th scope="col">Độ trễ TB</th>
                <th scope="col">Tỷ lệ lỗi</th>
                <th scope="col">Ngân sách tháng</th>
                <th scope="col">Trạng thái</th>
                <th scope="col" style={{ textAlign: 'right' }}>Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {SAMPLE_PROVIDERS.map((p) => (
                <tr key={p.id}>
                  <td>
                    <div style={{ fontWeight: 600, color: '#0F172A' }}>{p.name}</div>
                    <div style={{ fontSize: '12px', color: '#64748B', fontFamily: 'monospace' }}>{p.baseUrl}</div>
                  </td>
                  <td>
                    <span className="staff-role-pill" style={{ background: p.role === 'Primary' ? '#EFF6FF' : '#F1F5F9', color: p.role === 'Primary' ? '#1D4ED8' : '#475569' }}>
                      {p.role}
                    </span>
                  </td>
                  <td><code>{p.defaultModel}</code></td>
                  <td style={{ fontVariantNumeric: 'tabular-nums' }}>{p.latencyMs > 0 ? `${p.latencyMs} ms` : '—'}</td>
                  <td style={{ fontVariantNumeric: 'tabular-nums' }}>{p.errorRate}%</td>
                  <td style={{ fontVariantNumeric: 'tabular-nums' }}>
                    ${p.spentUsd.toFixed(1)} / ${p.monthlyBudgetUsd}
                  </td>
                  <td>
                    <StatusBadge status={p.status} />
                  </td>
                  <td style={{ textAlign: 'right' }}>
                    <div style={{ display: 'inline-flex', gap: '4px' }}>
                      <AdminIconButton
                        label="Kiểm tra kết nối (Mẫu)"
                        icon={<RefreshCw size={14} />}
                        onClick={() => setTestNotice(`Mô phỏng kiểm tra kết nối tới ${p.name}: Thành công (${p.latencyMs || 480} ms).`)}
                      />
                      <AdminIconButton
                        label="Xem cấu hình"
                        icon={<Sliders size={14} />}
                        onClick={() => {
                          setSelectedProvider(p)
                          setActiveTab('config')
                        }}
                      />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {activeTab === 'config' && (
        <div className="staff-card" style={{ marginTop: '16px' }}>
          <div className="staff-card-header">
            <h2 className="staff-card-title">Cấu hình chi tiết: {selectedProvider.name}</h2>
          </div>
          <div className="staff-card-body">
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '16px' }}>
              <div className="admin-form-field">
                <label className="admin-form-label">Tên hiển thị</label>
                <input className="admin-input" value={selectedProvider.name} readOnly />
              </div>
              <div className="admin-form-field">
                <label className="admin-form-label">API Base URL (Kiểm tra chống SSRF)</label>
                <input className="admin-input" value={selectedProvider.baseUrl} readOnly />
              </div>
              <div className="admin-form-field">
                <label className="admin-form-label">
                  <KeyRound size={13} /> API Key (Lưu mã hóa, không trả plaintext)
                </label>
                <input className="admin-input" type="password" value="sk-demo-masked-value" readOnly />
              </div>
              <div className="admin-form-field">
                <label className="admin-form-label">Model mặc định</label>
                <input className="admin-input" value={selectedProvider.defaultModel} readOnly />
              </div>
              <div className="admin-form-field">
                <label className="admin-form-label">Timeout (ms) / Max Retries</label>
                <input className="admin-input" value="15000 ms · Tối đa 2 lần thử lại" readOnly />
              </div>
              <div className="admin-form-field">
                <label className="admin-form-label">Rate Limit & Ngân sách tháng</label>
                <input className="admin-input" value={`120 RPM · $${selectedProvider.monthlyBudgetUsd}/tháng`} readOnly />
              </div>
            </div>
            <div style={{ marginTop: '16px', padding: '12px', borderRadius: '6px', background: '#F8FAFC', border: '1px solid #E2E8F0', fontSize: '12px', color: '#475569', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <AlertCircle size={15} />
              <span>Chế độ chỉ xem (Bản mẫu). Nút Lưu cấu hình và Thay thế API Key sẽ được kích hoạt sau khi chủ dự án duyệt ADM-04.</span>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'analytics' && (
        <div className="staff-card" style={{ marginTop: '16px' }}>
          <div className="staff-card-header">
            <h2 className="staff-card-title">Lượng Token tiêu thụ (Nghìn tokens / ngày — Minh họa)</h2>
          </div>
          <div className="staff-card-body">
            <div style={{ width: '100%', height: 280 }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={SAMPLE_USAGE_DATA} margin={{ top: 10, right: 16, left: -12, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" vertical={false} />
                  <XAxis dataKey="day" tick={{ fontSize: 11, fill: '#64748B' }} axisLine={{ stroke: '#E2E8F0' }} tickLine={false} />
                  <YAxis tick={{ fontSize: 11, fill: '#64748B' }} axisLine={false} tickLine={false} />
                  <Tooltip />
                  <Bar dataKey="tokensK" name="Token (nghìn)" fill="#1D4ED8" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

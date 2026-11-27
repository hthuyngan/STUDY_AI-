import React from 'react'
import { CreditCard, Info } from 'lucide-react'
import { Card } from '@/components/ui/Card'

/**
 * USER-09: Subscriptions page.
 * Respects ADM-05 Design Approval Gate: never hardcodes prices/entitlements or fakes payment success.
 */
export const LearnerSubscriptionsPage: React.FC = () => {
  return (
    <div style={{ maxWidth: 960, margin: '0 auto', padding: '20px 16px' }}>
      <header style={{ marginBottom: 20 }}>
        <h1 style={{ fontSize: 22, fontWeight: 700, color: 'var(--color-navy-dark, #102a43)', margin: 0 }}>
          Gói đăng ký & Hạn mức AI
        </h1>
        <p style={{ margin: '6px 0 0', fontSize: 14, color: 'var(--color-ink-muted, #627d98)' }}>
          Thông tin gói học tập Toán 12 và hạn mức sử dụng AI Gia sư được đồng bộ từ cấu hình hệ thống.
        </p>
      </header>

      <Card>
        <div style={{ padding: 20, display: 'flex', gap: 12, alignItems: 'flex-start' }}>
          <Info size={20} style={{ color: '#0284c7', flexShrink: 0, marginTop: 2 }} />
          <div>
            <h2 style={{ fontSize: 16, fontWeight: 600, margin: '0 0 6px', color: 'var(--color-navy-dark, #102a43)' }}>
              Cổng đăng ký gói đang chờ phê duyệt cấu hình (ADM-05)
            </h2>
            <p style={{ margin: 0, fontSize: 14, color: 'var(--color-ink-muted, #486581)', lineHeight: 1.55 }}>
              Hệ thống chưa kích hoạt thanh toán trực tuyến và bảng giá chính thức. Bạn vẫn có thể sử dụng đầy đủ các tính năng học tập Toán 12 trong hạn mức mặc định. Khi quản trị viên hoàn tất cấu hình gói Free / Plus / Pro, thông tin quyền lợi và lịch sử giao dịch sẽ hiển thị tại đây.
            </p>
          </div>
        </div>
      </Card>

      <div style={{ marginTop: 16 }}>
        <Card>
          <div style={{ padding: 20, display: 'flex', alignItems: 'center', gap: 10, color: 'var(--color-ink-muted, #627d98)', fontSize: 14 }}>
            <CreditCard size={18} />
            <span>Chưa có dữ liệu gói đăng ký hoặc giao dịch thanh toán.</span>
          </div>
        </Card>
      </div>
    </div>
  )
}

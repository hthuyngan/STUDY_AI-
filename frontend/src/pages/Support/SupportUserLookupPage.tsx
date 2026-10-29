import { useState, useEffect, type FormEvent } from 'react'
import { useParams, Link } from 'react-router-dom'
import { useUserLookup } from '@/hooks/useSupport'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { Skeleton } from '@/components/ui/Skeleton'
import './SupportPages.css'

export function SupportUserLookupPage() {
  const { id } = useParams<{ id: string }>()
  const { profile, loading, error, searchUser } = useUserLookup()
  const [searchTerm, setSearchTerm] = useState('')

  useEffect(() => {
    if (id) {
      void searchUser(id)
    } else {
      // Default initial demo search
      void searchUser('usr-101')
    }
  }, [id, searchUser])

  const handleSearch = (e: FormEvent) => {
    e.preventDefault()
    if (searchTerm.trim()) {
      void searchUser(searchTerm.trim())
    }
  }

  return (
    <div className="staff-page">
      <div className="staff-page-header">
        <div className="staff-page-title-row">
          <div>
            <h1>Tra cứu & Hỗ trợ kỹ thuật người dùng</h1>
            <p className="staff-page-desc">
              Kiểm tra trạng thái đồng bộ dữ liệu ngoại tuyến, thông tin tiến trình và lịch sử khiếu nại.
            </p>
          </div>
        </div>
      </div>

      {/* Search Bar */}
      <div className="staff-card" style={{ marginBottom: '20px' }}>
        <form onSubmit={handleSearch} style={{ display: 'flex', gap: '10px' }}>
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Nhập email, tên học sinh hoặc User ID (VD: minh.anh@example.com, usr-101)..."
            style={{
              flex: 1,
              padding: '10px 14px',
              fontSize: '14px',
              border: '1px solid var(--color-border)',
              borderRadius: '6px',
              background: 'var(--color-surface)',
              color: 'var(--color-text)',
            }}
          />
          <button type="submit" className="staff-btn staff-btn-primary" disabled={loading}>
            {loading ? 'Đang tra cứu...' : 'Tìm kiếm'}
          </button>
        </form>
      </div>

      {loading ? (
        <div className="staff-card">
          <Skeleton height={32} width={200} />
          <div style={{ marginTop: '16px', display: 'grid', gap: '12px' }}>
            <Skeleton height={20} />
            <Skeleton height={20} />
            <Skeleton height={20} />
          </div>
        </div>
      ) : error ? (
        <div className="staff-card" style={{ color: 'var(--color-danger, #e03131)', fontSize: '14px' }}>
          {error}
        </div>
      ) : profile ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 2fr) minmax(280px, 1fr)', gap: '20px' }}>
          {/* Main User Diagnostic Info */}
          <div className="staff-card">
            <h2 className="staff-card-title">Hồ sơ người dùng hỗ trợ</h2>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginTop: '16px' }}>
              <div>
                <span className="support-context-label">Tên hiển thị</span>
                <div style={{ fontWeight: 600, fontSize: '15px' }}>{profile.displayName}</div>
              </div>
              <div>
                <span className="support-context-label">Địa chỉ Email</span>
                <div style={{ fontSize: '14px' }}>{profile.email}</div>
              </div>
              <div>
                <span className="support-context-label">Mã định danh (User ID)</span>
                <code>{profile.id}</code>
              </div>
              <div>
                <span className="support-context-label">Vai trò hiện tại</span>
                <div>
                  <StatusBadge status="learner" label="Học viên" />
                </div>
              </div>
              <div>
                <span className="support-context-label">Ngày tạo tài khoản</span>
                <div style={{ fontSize: '13px' }}>{new Date(profile.createdAt).toLocaleDateString('vi-VN')}</div>
              </div>
              <div>
                <span className="support-context-label">Đăng nhập gần nhất</span>
                <div style={{ fontSize: '13px' }}>
                  {profile.lastLoginAt ? new Date(profile.lastLoginAt).toLocaleString('vi-VN') : '—'}
                </div>
              </div>
            </div>

            <hr style={{ margin: '20px 0', border: 'none', borderTop: '1px solid var(--color-border)' }} />

            <h3 style={{ fontSize: '14px', fontWeight: 600, marginBottom: '12px' }}>Chỉ số học tập ghi nhận</h3>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              <div style={{ padding: '12px', border: '1px solid var(--color-border)', borderRadius: '6px' }}>
                <span style={{ fontSize: '12px', color: 'var(--color-ink-muted)' }}>Bài học đã hoàn thành</span>
                <div style={{ fontSize: '20px', fontWeight: 700, color: 'var(--color-navy-dark)' }}>
                  {profile.completedLessonsCount} bài
                </div>
              </div>
              <div style={{ padding: '12px', border: '1px solid var(--color-border)', borderRadius: '6px' }}>
                <span style={{ fontSize: '12px', color: 'var(--color-ink-muted)' }}>Lần làm bài thu hoạch</span>
                <div style={{ fontSize: '20px', fontWeight: 700, color: 'var(--color-navy-dark)' }}>
                  {profile.totalAttemptsCount} lượt
                </div>
              </div>
            </div>

            <hr style={{ margin: '20px 0', border: 'none', borderTop: '1px solid var(--color-border)' }} />

            <h3 style={{ fontSize: '14px', fontWeight: 600, marginBottom: '12px' }}>Lịch sử Ticket đã mở</h3>
            <div style={{ display: 'grid', gap: '8px' }}>
              {profile.recentTicketHistory.map((t) => (
                <div
                  key={t.id}
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    padding: '8px 12px',
                    borderRadius: '4px',
                    border: '1px solid var(--color-border)',
                  }}
                >
                  <div>
                    <Link to={`/support/tickets/${t.id}`} style={{ fontWeight: 600, color: 'var(--color-primary)' }}>
                      {t.id}
                    </Link>{' '}
                    - {t.title}
                  </div>
                  <span style={{ fontSize: '12px', color: 'var(--color-ink-muted)' }}>{t.date}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Sync & Storage Diagnostic Panel */}
          <div className="staff-card">
            <h2 className="staff-card-title">Chẩn đoán dữ liệu đồng bộ</h2>

            <div className="support-context-section">
              <div className="support-context-label">Trạng thái Sync Queue</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span
                  style={{
                    display: 'inline-block',
                    width: '8px',
                    height: '8px',
                    borderRadius: '50%',
                    background: 'var(--color-success, #2b8a3e)',
                  }}
                />
                <strong style={{ fontSize: '13px' }}>ĐỒNG BỘ BÌNH THƯỜNG</strong>
              </div>
              <div style={{ fontSize: '12px', color: 'var(--color-ink-muted)', marginTop: '4px' }}>
                Không có sự cố xung đột phiên bản cục bộ và từ xa.
              </div>
            </div>

            <div className="support-context-section">
              <div className="support-context-label">Không gian lưu trữ (Namespace)</div>
              <code>{profile.storageNamespace}</code>
            </div>

            <div className="support-context-section">
              <div className="support-context-label">Chính sách bảo vệ quyền riêng tư</div>
              <div style={{ fontSize: '12px', color: 'var(--color-ink-muted)', lineHeight: 1.5 }}>
                Nhân viên hỗ trợ không được phép xem mật khẩu hoặc tokens xác thực. Tất cả phiên đăng nhập đều được mã
                hóa theo nguyên tắc Least Privilege.
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  )
}

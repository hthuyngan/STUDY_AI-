import React, { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import {
  ArrowLeft,
  User,
  CheckCircle2,
  AlertCircle,
  Database,
  BookOpen,
  Calendar,
  Clock,
  RotateCw,
  MessageSquare,
  LifeBuoy,
  ExternalLink,
} from 'lucide-react'
import { supportService } from '@/services/support.service'
import type { SupportUserProfile } from '@/types/support'
import { Skeleton } from '@/components/ui/Skeleton'
import { EmptyState } from '@/components/ui/EmptyState'
import '../Admin/AdminPages.css'
import '@/components/admin/AdminComponents.css'
import './SupportPages.css'

export const SupportUserDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>()
  const userId = id || 'usr-101'

  const [profile, setProfile] = useState<SupportUserProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const [toastMessage, setToastMessage] = useState<string | null>(null)

  const showToast = (msg: string) => {
    setToastMessage(msg)
    setTimeout(() => setToastMessage(null), 3500)
  }

  useEffect(() => {
    let active = true
    supportService
      .getUserById(userId)
      .then((data) => {
        if (active) {
          setProfile(data)
          setLoading(false)
        }
      })
      .catch((err) => {
        console.error(err)
        if (active) setLoading(false)
      })

    return () => {
      active = false
    }
  }, [userId])

  const handleForceSync = () => {
    showToast(`Đã gửi lệnh đồng bộ lại cache cho người dùng ${userId}`)
  }

  if (loading) {
    return (
      <div className="admin-page-container" style={{ padding: '24px' }}>
        <Skeleton height={36} width={240} />
        <div style={{ marginTop: '20px', display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '20px' }}>
          <Skeleton height={380} />
          <Skeleton height={380} />
        </div>
      </div>
    )
  }

  if (!profile) {
    return (
      <div className="admin-page-container">
        <Link to="/support/users" className="btn btn-secondary" style={{ marginBottom: 16 }}>
          <ArrowLeft size={16} /> Quay lại danh bạ người dùng
        </Link>
        <EmptyState
          title="Không tìm thấy người dùng"
          description={`Không tìm thấy hồ sơ kỹ thuật cho mã người dùng "${userId}".`}
        />
      </div>
    )
  }

  return (
    <div className="admin-page-container">
      {/* Toast Feedback */}
      {toastMessage && (
        <div className="admin-toast-notification">
          <CheckCircle2 size={18} color="#047857" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Top back navigation */}
      <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Link
          to="/support/users"
          className="btn btn-secondary btn-sm"
          style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}
        >
          <ArrowLeft size={15} />
          <span>Danh bạ người dùng</span>
        </Link>

        <button
          type="button"
          className="btn btn-secondary btn-sm"
          onClick={handleForceSync}
          style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}
        >
          <RotateCw size={14} />
          <span>Đồng bộ lại Cache</span>
        </button>
      </div>

      {/* Two Column Layout: Left Diagnostic Profile, Right Action Panel */}
      <div
        className="support-detail-grid"
        style={{
          display: 'grid',
          gridTemplateColumns: 'minmax(0, 2fr) minmax(300px, 1fr)',
          gap: 20,
          alignItems: 'start',
        }}
      >
        {/* Left Column: User Profile & Technical Diagnostic */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* User Header Profile Card */}
          <div className="admin-card" style={{ padding: '18px 20px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
              <div
                style={{
                  width: 52,
                  height: 52,
                  borderRadius: '50%',
                  background: '#e0f2fe',
                  color: '#0284c7',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontWeight: 800,
                  fontSize: '1.25rem',
                }}
              >
                <User size={26} />
              </div>

              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4, flexWrap: 'wrap' }}>
                  <h1 style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--navy-primary, #102a43)', margin: 0 }}>
                    {profile.displayName}
                  </h1>
                  <span className="status-badge status-default">
                    {profile.role === 'learner' ? 'Học viên' : profile.role}
                  </span>
                  <span
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 4,
                      fontSize: '0.75rem',
                      fontWeight: 600,
                      color: profile.syncState === 'synced' ? '#047857' : '#d97706',
                      background: profile.syncState === 'synced' ? 'rgba(4, 120, 87, 0.08)' : 'rgba(217, 119, 6, 0.08)',
                      padding: '2px 8px',
                      borderRadius: 4,
                    }}
                  >
                    {profile.syncState === 'synced' ? <CheckCircle2 size={12} /> : <AlertCircle size={12} />}
                    <span>{profile.syncState === 'synced' ? 'Đã đồng bộ' : 'Chờ đồng bộ'}</span>
                  </span>
                </div>
                <div style={{ fontSize: '0.86rem', color: '#64748b', wordBreak: 'break-all' }}>
                  <span>{profile.email}</span> • User ID: <code style={{ background: '#f1f5f9', padding: '1px 6px', borderRadius: 4, fontWeight: 700 }}>{profile.id}</code>
                </div>
              </div>
            </div>
          </div>

          {/* Technical Diagnostics Grid */}
          <div className="admin-card" style={{ padding: 18 }}>
            <h2 style={{ fontSize: '0.94rem', fontWeight: 700, margin: '0 0 14px 0', color: 'var(--navy-primary, #102a43)' }}>
              Thông số chẩn đoán kỹ thuật (Technical Diagnostics)
            </h2>

            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
                gap: 12,
              }}
            >
              <div style={{ padding: '12px 14px', background: '#f8fafc', borderRadius: 6, border: '1px solid #e2e8f0' }}>
                <div style={{ fontSize: '0.78rem', color: '#64748b', marginBottom: 4, display: 'flex', alignItems: 'center', gap: 6 }}>
                  <Database size={13} />
                  <span>Storage Namespace:</span>
                </div>
                <code style={{ fontSize: '0.82rem', color: 'var(--navy-primary, #102a43)', fontWeight: 700 }}>
                  {profile.storageNamespace}
                </code>
              </div>

              <div style={{ padding: '12px 14px', background: '#f8fafc', borderRadius: 6, border: '1px solid #e2e8f0' }}>
                <div style={{ fontSize: '0.78rem', color: '#64748b', marginBottom: 4, display: 'flex', alignItems: 'center', gap: 6 }}>
                  <BookOpen size={13} />
                  <span>Bài học đã hoàn thành:</span>
                </div>
                <div style={{ fontSize: '1.05rem', fontWeight: 800, color: 'var(--navy-primary, #102a43)' }}>
                  {profile.completedLessonsCount} bài học
                </div>
              </div>

              <div style={{ padding: '12px 14px', background: '#f8fafc', borderRadius: 6, border: '1px solid #e2e8f0' }}>
                <div style={{ fontSize: '0.78rem', color: '#64748b', marginBottom: 4, display: 'flex', alignItems: 'center', gap: 6 }}>
                  <Calendar size={13} />
                  <span>Ngày khởi tạo tài khoản:</span>
                </div>
                <div style={{ fontSize: '0.86rem', fontWeight: 600, color: '#334e68' }}>
                  {new Date(profile.createdAt).toLocaleDateString('vi-VN')}
                </div>
              </div>

              <div style={{ padding: '12px 14px', background: '#f8fafc', borderRadius: 6, border: '1px solid #e2e8f0' }}>
                <div style={{ fontSize: '0.78rem', color: '#64748b', marginBottom: 4, display: 'flex', alignItems: 'center', gap: 6 }}>
                  <Clock size={13} />
                  <span>Đăng nhập hệ thống cuối:</span>
                </div>
                <div style={{ fontSize: '0.86rem', fontWeight: 600, color: '#334e68' }}>
                  {profile.lastLoginAt ? new Date(profile.lastLoginAt).toLocaleString('vi-VN') : '—'}
                </div>
              </div>
            </div>
          </div>

          {/* Related Support Tickets History */}
          <div className="admin-card" style={{ padding: 18 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
              <h2 style={{ fontSize: '0.94rem', fontWeight: 700, margin: 0, color: 'var(--navy-primary, #102a43)' }}>
                Lịch sử yêu cầu hỗ trợ (Ticket History)
              </h2>
              <span style={{ fontSize: '0.8rem', color: '#64748b' }}>
                Tổng số: <strong>{profile.recentTicketHistory?.length || 0}</strong> ticket
              </span>
            </div>

            {profile.recentTicketHistory && profile.recentTicketHistory.length > 0 ? (
              <div className="staff-table-wrapper has-mobile-cards" style={{ border: '1px solid #e2e8f0', borderRadius: 6 }}>
                <table className="staff-table">
                  <thead>
                    <tr>
                      <th style={{ width: 110 }}>Mã Ticket</th>
                      <th>Tiêu đề yêu cầu</th>
                      <th>Trạng thái</th>
                      <th>Ngày gửi</th>
                      <th style={{ textAlign: 'right', width: 90 }}>Xem</th>
                    </tr>
                  </thead>
                  <tbody>
                    {profile.recentTicketHistory.map((t) => (
                      <tr key={t.id}>
                        <td>
                          <code>{t.id}</code>
                        </td>
                        <td>
                          <Link
                            to={`/support/tickets/${t.id}`}
                            style={{ fontWeight: 600, color: '#102a43', textDecoration: 'none' }}
                          >
                            {t.title}
                          </Link>
                        </td>
                        <td>
                          <span
                            className={`status-badge ${
                              t.status === 'resolved'
                                ? 'status-success'
                                : t.status === 'in-progress'
                                ? 'status-info'
                                : 'status-warning'
                            }`}
                          >
                            {t.status === 'resolved'
                              ? 'Đã giải quyết'
                              : t.status === 'in-progress'
                              ? 'Đang xử lý'
                              : 'Chờ phản hồi'}
                          </span>
                        </td>
                        <td>
                          <span style={{ fontSize: '0.82rem', color: '#64748b' }}>{t.date}</span>
                        </td>
                        <td style={{ textAlign: 'right' }}>
                          <Link
                            to={`/support/tickets/${t.id}`}
                            className="table-action-btn"
                            title="Mở chi tiết ticket"
                          >
                            <ExternalLink size={14} />
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                {/* Mobile Ticket Cards in History */}
                <div className="staff-mobile-card-list">
                  {profile.recentTicketHistory.map((t) => (
                    <div key={t.id} className="staff-mobile-card" style={{ padding: '10px 12px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                        <code>{t.id}</code>
                        <span
                          className={`status-badge ${
                            t.status === 'resolved'
                              ? 'status-success'
                              : t.status === 'in-progress'
                              ? 'status-info'
                              : 'status-warning'
                          }`}
                        >
                          {t.status === 'resolved' ? 'Đã giải quyết' : 'Đang xử lý'}
                        </span>
                      </div>
                      <Link
                        to={`/support/tickets/${t.id}`}
                        style={{ fontWeight: 600, color: '#102a43', textDecoration: 'none', display: 'block', marginBottom: 6, fontSize: '0.88rem' }}
                      >
                        {t.title}
                      </Link>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.78rem', color: '#64748b' }}>
                        <span>Ngày gửi: {t.date}</span>
                        <Link
                          to={`/support/tickets/${t.id}`}
                          className="admin-btn-secondary"
                          style={{ padding: '3px 8px', fontSize: '0.75rem', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 4 }}
                        >
                          <span>Xem</span>
                          <ExternalLink size={11} />
                        </Link>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div style={{ padding: '24px', textAlign: 'center', color: '#64748b', fontSize: '0.88rem' }}>
                Người dùng này chưa có yêu cầu hỗ trợ nào được ghi nhận.
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Support Quick Actions */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div className="admin-card" style={{ padding: 16 }}>
            <h2 style={{ fontSize: '0.92rem', fontWeight: 700, margin: '0 0 12px 0', color: 'var(--navy-primary, #102a43)' }}>
              Thao tác hỗ trợ nhanh
            </h2>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <button
                type="button"
                className="btn btn-secondary"
                style={{ width: '100%', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 6, fontSize: '0.84rem' }}
                onClick={() => showToast(`Đã gửi thông báo kiểm tra đến thiết bị của ${profile.displayName}`)}
              >
                <MessageSquare size={14} />
                <span>Gửi thông báo kỹ thuật</span>
              </button>

              <button
                type="button"
                className="btn btn-secondary"
                style={{ width: '100%', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 6, fontSize: '0.84rem' }}
                onClick={handleForceSync}
              >
                <RotateCw size={14} />
                <span>Đồng bộ lại dữ liệu</span>
              </button>

              <Link
                to="/support/tickets"
                className="btn btn-primary"
                style={{ width: '100%', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 6, fontSize: '0.84rem', textDecoration: 'none', boxSizing: 'border-box' }}
              >
                <LifeBuoy size={14} />
                <span>Hàng đợi hỗ trợ</span>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

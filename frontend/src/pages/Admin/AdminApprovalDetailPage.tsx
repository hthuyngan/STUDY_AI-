import React, { useEffect, useState } from 'react'
import {
  ArrowLeft,
  CheckCircle2,
  Clock,
  RotateCcw,
  X,
  Check,
  Send,
} from 'lucide-react'
import { Link, useParams } from 'react-router-dom'
import { operationsService } from '@/services/operations.service'
import type {
  ApprovalItem,
} from '@/types/operations'
import { Skeleton } from '@/components/ui/Skeleton'
import { EmptyState } from '@/components/ui/EmptyState'
import './AdminPages.css'
import '@/components/admin/AdminComponents.css'

type TabType = 'content' | 'publishing' | 'feedback' | 'history'

export const AdminApprovalDetailPage: React.FC = () => {
  const { approvalId } = useParams<{ approvalId: string }>()
  const [activeTab, setActiveTab] = useState<TabType>('content')
  const [approval, setApproval] = useState<ApprovalItem | null>(null)
  const [loading, setLoading] = useState(true)

  // Action Modals
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [modalMode, setModalMode] = useState<'reject' | 'changes' | 'publish'>('changes')
  const [actionNote, setActionNote] = useState('')
  const [toastMessage, setToastMessage] = useState<string | null>(null)

  const showToast = (msg: string) => {
    setToastMessage(msg)
    setTimeout(() => setToastMessage(null), 3500)
  }

  const loadData = () => {
    if (!approvalId) return
    setLoading(true)
    operationsService
      .getApprovalById(approvalId)
      .then((data) => {
        setApproval(data)
        setLoading(false)
      })
      .catch((err) => {
        console.error(err)
        setLoading(false)
      })
  }

  useEffect(() => {
    if (!approvalId) return
    let active = true
    operationsService
      .getApprovalById(approvalId)
      .then((data) => {
        if (active) {
          setApproval(data)
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
  }, [approvalId])

  const handleApprove = async () => {
    if (!approval) return
    if (window.confirm(`Xác nhận phê duyệt nội dung "${approval.title}"?`)) {
      try {
        const updated = await operationsService.approveContent(
          approval.id,
          'Phê duyệt đạt chuẩn chương trình',
          'Demo Admin'
        )
        setApproval(updated)
        showToast('Đã phê duyệt nội dung thành công')
      } catch (err: unknown) {
        if (err instanceof Error) alert(err.message)
      }
    }
  }

  const handleOpenModal = (mode: 'reject' | 'changes' | 'publish') => {
    setModalMode(mode)
    setActionNote('')
    setIsModalOpen(true)
  }

  const handleModalSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!approval) return

    try {
      if (modalMode === 'changes') {
        const updated = await operationsService.requestChanges(approval.id, actionNote, 'Demo Admin')
        setApproval(updated)
        showToast('Đã gửi yêu cầu chỉnh sửa tới tác giả')
      } else if (modalMode === 'reject') {
        const updated = await operationsService.rejectContent(approval.id, actionNote, 'Demo Admin')
        setApproval(updated)
        showToast('Đã từ chối phê duyệt nội dung')
      } else if (modalMode === 'publish') {
        await operationsService.publishContent(approval.id, actionNote, 'Demo Admin')
        showToast('Nội dung đã được xuất bản chính thức!')
        loadData()
      }
      setIsModalOpen(false)
    } catch (err: unknown) {
      if (err instanceof Error) alert(err.message)
    }
  }

  if (loading) {
    return (
      <div className="admin-page-container" style={{ padding: '32px' }}>
        <Skeleton height={40} width={250} />
        <div style={{ marginTop: 24 }}>
          <Skeleton height={200} />
        </div>
      </div>
    )
  }

  if (!approval) {
    return (
      <div className="admin-page-container">
        <EmptyState
          title="Không tìm thấy yêu cầu phê duyệt"
          description="Nội dung này không tồn tại hoặc đã bị xóa."
          actionLabel="Quay lại danh sách phê duyệt"
          onAction={() => window.history.back()}
        />
      </div>
    )
  }

  return (
    <div className="admin-page-container">
      {/* Toast */}
      {toastMessage && (
        <div className="admin-toast-notification">
          <CheckCircle2 size={18} color="#047857" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Breadcrumb Header */}
      <div className="staff-page-header">
        <div style={{ marginBottom: 12 }}>
          <Link
            to="/admin/approvals"
            className="flex items-center gap-1.5 text-sm font-medium text-navy-primary hover:underline"
            style={{ display: 'inline-flex', alignItems: 'center', gap: 6, color: '#102a43', fontSize: '0.88rem' }}
          >
            <ArrowLeft size={16} />
            <span>Quay lại Danh sách phê duyệt</span>
          </Link>
        </div>

        <div className="admin-header-row">
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
              <h1 className="staff-page-title" style={{ margin: 0 }}>
                {approval.title}
              </h1>
              <span className="status-badge status-default">
                {approval.contentType === 'lesson' ? 'Bài học' : 'Bài thu hoạch'}
              </span>
              <span
                className={`status-badge ${
                  approval.status === 'published'
                    ? 'status-success'
                    : approval.status === 'approved'
                    ? 'status-info'
                    : approval.status === 'pending'
                    ? 'status-warning'
                    : approval.status === 'changes-requested'
                    ? 'status-danger'
                    : 'status-default'
                }`}
              >
                {approval.status === 'published'
                  ? 'Đã xuất bản'
                  : approval.status === 'approved'
                  ? 'Đã duyệt'
                  : approval.status === 'pending'
                  ? 'Chờ duyệt'
                  : approval.status === 'changes-requested'
                  ? 'Yêu cầu sửa'
                  : 'Bị từ chối'}
              </span>
            </div>
            <p className="staff-page-desc" style={{ marginTop: 6 }}>
              Môn: <strong>{approval.subjectName}</strong> • Tác giả: <strong>{approval.authorName}</strong> ({approval.authorRole}) • Phiên bản: <code>{approval.version}</code>
            </p>
          </div>

          <div className="admin-header-actions">
            {approval.status === 'pending' && (
              <>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => handleOpenModal('changes')}
                >
                  <RotateCcw size={16} />
                  <span>Yêu cầu sửa</span>
                </button>
                <button
                  type="button"
                  className="btn btn-danger"
                  onClick={() => handleOpenModal('reject')}
                >
                  <X size={16} />
                  <span>Từ chối</span>
                </button>
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={handleApprove}
                >
                  <Check size={16} />
                  <span>Phê duyệt</span>
                </button>
              </>
            )}

            {(approval.status === 'approved' || approval.status === 'pending') && (
              <button
                type="button"
                className="btn btn-primary"
                onClick={() => handleOpenModal('publish')}
              >
                <Send size={16} />
                <span>Xuất bản ngay</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* 4 Tabs */}
      <div className="admin-roles-tabs" style={{ marginBottom: 24, borderBottom: '1px solid #e2e8f0', display: 'flex', gap: 8 }}>
        <button
          type="button"
          className={`btn ${activeTab === 'content' ? 'btn-primary' : 'btn-secondary'}`}
          style={{ borderRadius: '6px 6px 0 0' }}
          onClick={() => setActiveTab('content')}
        >
          Nội dung xem trước
        </button>
        <button
          type="button"
          className={`btn ${activeTab === 'publishing' ? 'btn-primary' : 'btn-secondary'}`}
          style={{ borderRadius: '6px 6px 0 0' }}
          onClick={() => setActiveTab('publishing')}
        >
          Thông tin xuất bản
        </button>
        <button
          type="button"
          className={`btn ${activeTab === 'feedback' ? 'btn-primary' : 'btn-secondary'}`}
          style={{ borderRadius: '6px 6px 0 0' }}
          onClick={() => setActiveTab('feedback')}
        >
          Nhận xét kiểm duyệt
        </button>
        <button
          type="button"
          className={`btn ${activeTab === 'history' ? 'btn-primary' : 'btn-secondary'}`}
          style={{ borderRadius: '6px 6px 0 0' }}
          onClick={() => setActiveTab('history')}
        >
          Lịch sử thay đổi ({approval.history.length})
        </button>
      </div>

      {/* TAB 1: CONTENT PREVIEW */}
      {activeTab === 'content' && (
        <div className="admin-card" style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 8, padding: 24, display: 'flex', flexDirection: 'column', gap: 20 }}>
          {approval.contentPreview ? (
            <>
              {approval.contentPreview.introduction && (
                <div>
                  <h3 style={{ fontSize: '0.95rem', fontWeight: 700, color: '#102a43', marginBottom: 6 }}>1. Đặt vấn đề & Giới thiệu bài học</h3>
                  <p style={{ margin: 0, color: '#334e68', lineHeight: 1.6, background: '#f8fafc', padding: 12, borderRadius: 6 }}>
                    {approval.contentPreview.introduction}
                  </p>
                </div>
              )}

              {approval.contentPreview.definitions && (
                <div>
                  <h3 style={{ fontSize: '0.95rem', fontWeight: 700, color: '#102a43', marginBottom: 6 }}>2. Khái niệm & Định nghĩa cơ bản</h3>
                  <p style={{ margin: 0, color: '#334e68', lineHeight: 1.6, background: '#f8fafc', padding: 12, borderRadius: 6 }}>
                    {approval.contentPreview.definitions}
                  </p>
                </div>
              )}

              {approval.contentPreview.formulas && (
                <div>
                  <h3 style={{ fontSize: '0.95rem', fontWeight: 700, color: '#102a43', marginBottom: 6 }}>3. Công thức & Quy tắc trọng tâm</h3>
                  <pre style={{ margin: 0, background: '#f1f5f9', padding: 12, borderRadius: 6, fontSize: '0.9rem', color: '#0f172a', whiteSpace: 'pre-wrap' }}>
                    {approval.contentPreview.formulas}
                  </pre>
                </div>
              )}

              {approval.contentPreview.examples && (
                <div>
                  <h3 style={{ fontSize: '0.95rem', fontWeight: 700, color: '#102a43', marginBottom: 6 }}>4. Ví dụ mẫu minh họa</h3>
                  <p style={{ margin: 0, color: '#334e68', lineHeight: 1.6, background: '#f8fafc', padding: 12, borderRadius: 6 }}>
                    {approval.contentPreview.examples}
                  </p>
                </div>
              )}

              {approval.contentPreview.questionCount && (
                <div>
                  <h3 style={{ fontSize: '0.95rem', fontWeight: 700, color: '#102a43', marginBottom: 6 }}>Cấu trúc bài thu hoạch</h3>
                  <div style={{ background: '#f8fafc', padding: 14, borderRadius: 6 }}>
                    <div>Số lượng câu hỏi trắc nghiệm: <strong>{approval.contentPreview.questionCount} câu</strong></div>
                    <div>Thang điểm tối đa: <strong>{approval.contentPreview.maxScore || 10} điểm</strong></div>
                  </div>
                </div>
              )}
            </>
          ) : (
            <div style={{ color: '#627d98', fontStyle: 'italic' }}>
              Chưa có dữ liệu xem trước cho nội dung này.
            </div>
          )}
        </div>
      )}

      {/* TAB 2: PUBLISHING INFO */}
      {activeTab === 'publishing' && (
        <div className="admin-card" style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 8, padding: 24, maxWidth: 640 }}>
          <h3 style={{ fontSize: '1rem', fontWeight: 700, color: '#102a43', marginBottom: 16 }}>
            Thông số xuất bản
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12, fontSize: '0.9rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px dashed #e2e8f0', paddingBottom: 8 }}>
              <span style={{ color: '#627d98' }}>Môn học áp dụng:</span>
              <strong style={{ color: '#102a43' }}>{approval.subjectName}</strong>
            </div>
            {approval.chapterName && (
              <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px dashed #e2e8f0', paddingBottom: 8 }}>
                <span style={{ color: '#627d98' }}>Chương bài học:</span>
                <span style={{ fontWeight: 600 }}>{approval.chapterName}</span>
              </div>
            )}
            <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px dashed #e2e8f0', paddingBottom: 8 }}>
              <span style={{ color: '#627d98' }}>Phiên bản nội dung:</span>
              <code>{approval.version}</code>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px dashed #e2e8f0', paddingBottom: 8 }}>
              <span style={{ color: '#627d98' }}>Thời điểm nộp duyệt:</span>
              <span>{new Date(approval.submittedAt).toLocaleString('vi-VN')}</span>
            </div>
            {approval.reviewedAt && (
              <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px dashed #e2e8f0', paddingBottom: 8 }}>
                <span style={{ color: '#627d98' }}>Người kiểm duyệt:</span>
                <span>{approval.reviewedBy} ({new Date(approval.reviewedAt).toLocaleString('vi-VN')})</span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 3: FEEDBACK */}
      {activeTab === 'feedback' && (
        <div className="admin-card" style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 8, padding: 24, maxWidth: 640 }}>
          <h3 style={{ fontSize: '1rem', fontWeight: 700, color: '#102a43', marginBottom: 16 }}>
            Nhận xét & Đánh giá kiểm duyệt
          </h3>
          {approval.reviewNote || approval.rejectionReason ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {approval.reviewNote && (
                <div style={{ padding: 14, background: '#f8fafc', borderRadius: 6, borderLeft: '4px solid #0284c7' }}>
                  <div style={{ fontSize: '0.8rem', color: '#627d98' }}>Ghi chú kiểm duyệt:</div>
                  <div style={{ marginTop: 4, color: '#102a43' }}>{approval.reviewNote}</div>
                </div>
              )}
              {approval.rejectionReason && (
                <div style={{ padding: 14, background: 'rgba(220, 38, 38, 0.08)', borderRadius: 6, borderLeft: '4px solid #dc2626' }}>
                  <div style={{ fontSize: '0.8rem', color: '#b91c1c', fontWeight: 600 }}>Lý do từ chối:</div>
                  <div style={{ marginTop: 4, color: '#b91c1c' }}>{approval.rejectionReason}</div>
                </div>
              )}
            </div>
          ) : (
            <div style={{ color: '#627d98', fontStyle: 'italic' }}>
              Chưa có phản hồi hoặc nhận xét nào cho phiên bản này.
            </div>
          )}
        </div>
      )}

      {/* TAB 4: HISTORY */}
      {activeTab === 'history' && (
        <div style={{ maxWidth: 640 }}>
          <h3 style={{ fontSize: '1rem', fontWeight: 700, color: '#102a43', marginBottom: 16 }}>
            Dòng thời gian chuyển đổi trạng thái
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {approval.history.map((h) => (
              <div key={h.id} style={{ display: 'flex', gap: 14, padding: '14px 18px', background: '#fff', border: '1px solid #e2e8f0', borderRadius: 8 }}>
                <div style={{ width: 34, height: 34, borderRadius: '50%', background: 'rgba(16, 42, 67, 0.08)', color: '#102a43', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <Clock size={16} />
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <strong style={{ fontSize: '0.9rem', color: '#102a43' }}>{h.action}</strong>
                    <span style={{ fontSize: '0.78rem', color: '#627d98' }}>{new Date(h.timestamp).toLocaleString('vi-VN')}</span>
                  </div>
                  <div style={{ fontSize: '0.82rem', color: '#486581', marginTop: 2 }}>Thực hiện bởi: {h.actor}</div>
                  {h.note && (
                    <div style={{ fontSize: '0.85rem', color: '#334e68', marginTop: 4, background: '#f8fafc', padding: 6, borderRadius: 4 }}>
                      {h.note}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Modal Xử lý */}
      {isModalOpen && (
        <div className="admin-modal-overlay" role="dialog" aria-modal="true">
          <div className="admin-modal-card" style={{ maxWidth: 480 }}>
            <div className="admin-modal-header">
              <h3 className="modal-title">
                {modalMode === 'publish'
                  ? 'Xuất bản nội dung chính thức'
                  : modalMode === 'reject'
                  ? 'Từ chối phê duyệt'
                  : 'Yêu cầu tác giả chỉnh sửa'}
              </h3>
              <button
                type="button"
                className="modal-close-btn"
                onClick={() => setIsModalOpen(false)}
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleModalSubmit}>
              <div className="admin-modal-body" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                <div style={{ background: '#f8fafc', padding: 12, borderRadius: 6 }}>
                  <div style={{ fontWeight: 600, color: '#102a43' }}>{approval.title}</div>
                  <div style={{ fontSize: '0.8rem', color: '#627d98' }}>Tác giả: {approval.authorName} • Phiên bản {approval.version}</div>
                </div>

                <div>
                  <label className="form-label" htmlFor="modal-note-input">
                    {modalMode === 'publish'
                      ? 'Ghi chú xuất bản / Changelog'
                      : modalMode === 'reject'
                      ? 'Lý do từ chối'
                      : 'Nội dung yêu cầu chỉnh sửa'}
                    {modalMode !== 'publish' && <span className="text-danger"> *</span>}
                  </label>
                  <textarea
                    id="modal-note-input"
                    className="form-input"
                    rows={4}
                    placeholder={
                      modalMode === 'publish'
                        ? 'VD: Xuất bản phiên bản cập nhật đồ thị và bài tập...'
                        : 'Mô tả chi tiết lý do...'
                    }
                    value={actionNote}
                    onChange={(e) => setActionNote(e.target.value)}
                    required={modalMode !== 'publish'}
                  />
                </div>
              </div>

              <div className="admin-modal-footer">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setIsModalOpen(false)}
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className={`btn ${modalMode === 'reject' ? 'btn-danger' : 'btn-primary'}`}
                >
                  {modalMode === 'publish' ? 'Xác nhận xuất bản' : modalMode === 'reject' ? 'Từ chối' : 'Gửi yêu cầu'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

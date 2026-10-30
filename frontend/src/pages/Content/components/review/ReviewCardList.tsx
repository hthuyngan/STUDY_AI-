import React from 'react'
import { Link } from 'react-router-dom'
import { Eye, Check, X, RotateCcw } from 'lucide-react'
import type { ApprovalItem } from '@/types/operations'

export interface ReviewCardListProps {
  approvals: ApprovalItem[]
  onApprove: (item: ApprovalItem) => void
  onOpenModal: (item: ApprovalItem, mode: 'reject' | 'changes') => void
}

export const ReviewCardList: React.FC<ReviewCardListProps> = ({
  approvals,
  onApprove,
  onOpenModal,
}) => {
  return (
    <div className="admin-mobile-card-list teacher-mobile-cards-list" role="region" aria-label="Hàng đợi phê duyệt trên di động">
      {approvals.map((item) => (
        <div key={item.id} className="admin-mobile-card teacher-card-item">
          <div className="teacher-card-item-header">
            <div>
              <Link
                to={`/content/review/${item.id}`}
                className="teacher-card-title"
                style={{ fontSize: '0.92rem', fontWeight: 600 }}
              >
                {item.title}
              </Link>
              <div className="teacher-card-meta-line" style={{ marginTop: 2 }}>
                <span>{item.subjectName}</span>
                <span>•</span>
                <span>Phiên bản: <code>{item.version}</code></span>
              </div>
            </div>
            <span
              className={`status-badge ${
                item.status === 'published'
                  ? 'status-success'
                  : item.status === 'approved'
                  ? 'status-info'
                  : item.status === 'pending'
                  ? 'status-warning'
                  : item.status === 'changes-requested'
                  ? 'status-danger'
                  : 'status-default'
              }`}
            >
              {item.status === 'published'
                ? 'Đã xuất bản'
                : item.status === 'approved'
                ? 'Đã duyệt'
                : item.status === 'pending'
                ? 'Chờ duyệt'
                : item.status === 'changes-requested'
                ? 'Yêu cầu sửa'
                : 'Từ chối'}
            </span>
          </div>

          <div className="teacher-card-item-body">
            <div className="teacher-card-stat">
              <span className="teacher-stat-label">Loại nội dung</span>
              <span style={{ fontSize: '0.82rem', fontWeight: 500 }}>
                {item.contentType === 'lesson' ? 'Bài học' : item.contentType === 'assessment' ? 'Bài thu hoạch' : 'Bài tập'}
              </span>
            </div>
            <div className="teacher-card-stat">
              <span className="teacher-stat-label">Tác giả</span>
              <span style={{ fontSize: '0.82rem' }}>{item.authorName}</span>
            </div>
            <div className="teacher-card-stat">
              <span className="teacher-stat-label">Ngày gửi</span>
              <span style={{ fontSize: '0.82rem' }}>{new Date(item.submittedAt).toLocaleDateString('vi-VN')}</span>
            </div>
          </div>

          <div className="teacher-card-item-footer" style={{ display: 'flex', gap: 6, marginTop: 10, flexWrap: 'wrap' }}>
            <Link
              to={`/content/review/${item.id}`}
              className="btn btn-secondary btn-sm"
              style={{ flex: 1, minWidth: 90, textAlign: 'center', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 4 }}
            >
              <Eye size={13} />
              <span>Xem chi tiết</span>
            </Link>
            {item.status === 'pending' && (
              <>
                <button
                  type="button"
                  className="btn btn-primary btn-sm"
                  onClick={() => onApprove(item)}
                  title="Duyệt nội dung"
                  aria-label={`Duyệt ${item.title}`}
                >
                  <Check size={13} />
                  <span>Duyệt</span>
                </button>
                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  onClick={() => onOpenModal(item, 'changes')}
                  title="Yêu cầu sửa"
                  aria-label={`Yêu cầu sửa ${item.title}`}
                >
                  <RotateCcw size={13} />
                </button>
                <button
                  type="button"
                  className="btn btn-secondary btn-sm text-danger"
                  onClick={() => onOpenModal(item, 'reject')}
                  title="Từ chối"
                  aria-label={`Từ chối ${item.title}`}
                >
                  <X size={13} />
                </button>
              </>
            )}
          </div>
        </div>
      ))}
    </div>
  )
}


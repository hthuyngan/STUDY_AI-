import React from 'react'
import { Edit2, Trash2, Calendar, Users } from 'lucide-react'
import type { AnnouncementItem } from '@/types/operations'

export interface AnnouncementCardListProps {
  announcements: AnnouncementItem[]
  onEdit: (item: AnnouncementItem) => void
  onDelete: (item: AnnouncementItem) => void
}

export const AnnouncementCardList: React.FC<AnnouncementCardListProps> = ({
  announcements,
  onEdit,
  onDelete,
}) => {
  const getAudienceLabel = (a: AnnouncementItem) => {
    switch (a.audience) {
      case 'all':
        return 'Toàn trường'
      case 'learners':
        return 'Học viên'
      case 'teachers':
        return 'Giáo viên'
      case 'class':
        return a.targetClassName ? `Lớp ${a.targetClassName}` : 'Theo lớp'
      default:
        return 'Toàn trường'
    }
  }

  return (
    <div className="admin-mobile-card-list announcement-mobile-card-list" role="region" aria-label="Danh sách thông báo di động">
      {announcements.map((item) => (
        <div key={item.id} className="admin-mobile-card">
          <div className="admin-mobile-header">
            <div className="admin-mobile-id-wrap" style={{ flex: 1 }}>
              <div className="admin-mobile-user-info">
                <span className="admin-mobile-name-link" style={{ fontSize: '0.92rem' }}>
                  TB. {item.title}
                </span>
                <span className="admin-mobile-email" style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                  <Calendar size={12} />
                  <span>{new Date(item.createdAt).toLocaleDateString('vi-VN')}</span>
                  <span>•</span>
                  <span>{item.createdBy}</span>
                </span>
              </div>
            </div>
            <div className="admin-mobile-status-wrap">
              <span className={`admin-severity-badge severity-${item.severity}`}>
                {item.severity === 'danger' ? 'Khẩn cấp' : item.severity === 'warning' ? 'Cảnh báo' : 'Thông tin'}
              </span>
              <span className={`admin-status-badge status-${item.status}`}>
                {item.status === 'published' ? 'Đã xuất bản' : item.status === 'draft' ? 'Bản nháp' : 'Hết hạn'}
              </span>
            </div>
          </div>

          {/* Meta row: Audience */}
          <div className="admin-mobile-meta-row">
            <span className="admin-audience-chip">
              <Users size={12} />
              <span>{getAudienceLabel(item)}</span>
            </span>
          </div>

          {/* Content snippet */}
          <p className="admin-mobile-snippet">
            {item.content}
          </p>

          {/* Actions */}
          <div className="admin-mobile-actions">
            <button
              type="button"
              className="btn btn-secondary btn-sm admin-mobile-action-btn"
              onClick={() => onEdit(item)}
              aria-label={`Sửa thông báo ${item.title}`}
            >
              <Edit2 size={13} />
              <span>Chỉnh sửa</span>
            </button>
            <button
              type="button"
              className="btn btn-secondary btn-sm admin-mobile-action-btn text-danger"
              onClick={() => onDelete(item)}
              aria-label={`Xóa thông báo ${item.title}`}
            >
              <Trash2 size={13} />
              <span>Xóa</span>
            </button>
          </div>
        </div>
      ))}
    </div>
  )
}

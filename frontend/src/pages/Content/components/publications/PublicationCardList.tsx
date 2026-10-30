import React from 'react'
import { Calendar, RotateCcw } from 'lucide-react'
import type { PublicationRecord } from '@/types/operations'

interface PublicationCardListProps {
  publications: PublicationRecord[]
  onRollback: (pub: PublicationRecord) => void
}

export const PublicationCardList: React.FC<PublicationCardListProps> = ({
  publications,
  onRollback,
}) => {
  return (
    <div className="staff-mobile-card-list">
      {publications.map((pub) => (
        <div key={pub.id} className="staff-mobile-card">
          <div className="staff-mobile-card-header">
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                <span className="status-badge status-default">
                  {pub.contentType === 'lesson' ? 'Bài học' : 'Bài thu hoạch'}
                </span>
                <span
                  className={`status-badge ${
                    pub.status === 'active' ? 'status-success' : 'status-default'
                  }`}
                >
                  {pub.status === 'active' ? 'Đang kích hoạt' : 'Lưu trữ'}
                </span>
              </div>
              <h3 className="staff-mobile-card-title">{pub.title}</h3>
              <p className="staff-mobile-card-subtitle">{pub.subjectName}</p>
            </div>
            <code
              style={{
                background: '#f1f5f9',
                padding: '2px 8px',
                borderRadius: 4,
                fontWeight: 700,
                fontSize: '0.8rem',
                color: 'var(--navy-primary, #102a43)',
                alignSelf: 'flex-start',
              }}
            >
              {pub.version}
            </code>
          </div>

          <div className="staff-mobile-card-meta">
            <div className="staff-mobile-card-meta-item">
              <span className="meta-label">Người xuất bản:</span>
              <span className="meta-value">{pub.publishedBy}</span>
            </div>
            <div className="staff-mobile-card-meta-item">
              <span className="meta-label">Ngày xuất bản:</span>
              <span className="meta-value" style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                <Calendar size={12} />
                {new Date(pub.publishedAt).toLocaleDateString('vi-VN')}
              </span>
            </div>
            {pub.changelog && (
              <div className="staff-mobile-card-meta-item" style={{ gridColumn: '1 / -1' }}>
                <span className="meta-label">Ghi chú:</span>
                <span className="meta-value">{pub.changelog}</span>
              </div>
            )}
          </div>

          <div className="staff-mobile-card-actions">
            <button
              type="button"
              className="admin-btn-secondary"
              style={{ flex: 1, padding: '7px 12px', fontSize: '0.82rem', gap: 6, display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}
              onClick={() => onRollback(pub)}
            >
              <RotateCcw size={14} />
              <span>Khôi phục phiên bản</span>
            </button>
          </div>
        </div>
      ))}
    </div>
  )
}


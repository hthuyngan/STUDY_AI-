import React from 'react'
import { Link } from 'react-router-dom'
import { ExternalLink, Trash2, Globe, Send } from 'lucide-react'
import type { CurriculumLessonItem, ContentStatus } from '@/types/education'
import { StatusBadge } from '@/components/ui/StatusBadge'

export interface LessonCardListProps {
  lessons: CurriculumLessonItem[]
  onStatusChange: (id: string, newStatus: ContentStatus, title: string) => void
  onDelete: (id: string, title: string) => void
}

export const LessonCardList: React.FC<LessonCardListProps> = ({
  lessons,
  onStatusChange,
  onDelete,
}) => {
  return (
    <div className="admin-mobile-card-list teacher-mobile-cards-list" role="region" aria-label="Danh sách bài học trên di động">
      {lessons.map((l) => (
        <div key={l.id} className="admin-mobile-card teacher-card-item">
          <div className="teacher-card-item-header">
            <div>
              <Link
                to={`/content/lessons/${l.id}`}
                className="teacher-card-title"
                style={{ fontSize: '0.92rem', fontWeight: 600 }}
              >
                {l.title}
              </Link>
              <div className="teacher-card-meta-line" style={{ marginTop: 2 }}>
                <span>{l.subjectName}</span>
                <span>•</span>
                <span>{l.chapterName}</span>
              </div>
            </div>
            <StatusBadge status={l.status} />
          </div>

          <div className="teacher-card-item-body">
            <div className="teacher-card-stat">
              <span className="teacher-stat-label">Tác giả</span>
              <span style={{ fontSize: '0.82rem' }}>{l.authorName}</span>
            </div>
            <div className="teacher-card-stat">
              <span className="teacher-stat-label">Thu hoạch</span>
              {l.hasAssessment ? (
                <span style={{ fontSize: '0.78rem', color: '#047857', fontWeight: 600 }}>✓ Có bài</span>
              ) : (
                <span style={{ fontSize: '0.78rem', color: '#627d98' }}>Chưa gắn</span>
              )}
            </div>
            <div className="teacher-card-stat">
              <span className="teacher-stat-label">Cập nhật</span>
              <span style={{ fontSize: '0.78rem' }}>{new Date(l.updatedAt).toLocaleDateString('vi-VN')}</span>
            </div>
          </div>

          <div className="teacher-card-item-footer" style={{ display: 'flex', gap: 6, marginTop: 10, flexWrap: 'wrap' }}>
            <Link
              to={`/content/lessons/${l.id}`}
              className="btn btn-primary btn-sm"
              style={{ flex: 1, minWidth: 100, textAlign: 'center', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 4 }}
            >
              <ExternalLink size={13} />
              <span>Soạn thảo</span>
            </Link>
            {l.status !== 'published' && (
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={() => onStatusChange(l.id, 'published', l.title)}
                title="Xuất bản ngay"
                aria-label={`Xuất bản ngay ${l.title}`}
              >
                <Globe size={13} style={{ color: '#047857' }} />
                <span>Xuất bản</span>
              </button>
            )}
            {l.status === 'draft' && (
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={() => onStatusChange(l.id, 'in-review', l.title)}
                title="Gửi duyệt"
                aria-label={`Gửi duyệt ${l.title}`}
              >
                <Send size={13} style={{ color: '#b45309' }} />
                <span>Gửi duyệt</span>
              </button>
            )}
            <button
              type="button"
              className="btn btn-secondary btn-sm text-danger"
              onClick={() => onDelete(l.id, l.title)}
              title="Xóa bài học"
              aria-label={`Xóa bài học ${l.title}`}
            >
              <Trash2 size={13} />
            </button>
          </div>
        </div>
      ))}
    </div>
  )
}

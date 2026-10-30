import React from 'react'
import { ArrowUp, ArrowDown, Edit2, Trash2, BookOpen } from 'lucide-react'
import type { CurriculumChapterItem } from '@/types/education'
import { StatusBadge } from '@/components/ui/StatusBadge'

export interface ChapterCardListProps {
  chapters: CurriculumChapterItem[]
  onMoveUp: (index: number) => void
  onMoveDown: (index: number) => void
  onEdit: (chapter: CurriculumChapterItem) => void
  onDelete: (id: string, title: string) => void
}

export const ChapterCardList: React.FC<ChapterCardListProps> = ({
  chapters,
  onMoveUp,
  onMoveDown,
  onEdit,
  onDelete,
}) => {
  return (
    <div className="admin-mobile-card-list teacher-mobile-cards-list" role="region" aria-label="Danh sách chương học trên di động">
      {chapters.map((ch, idx) => (
        <div key={ch.id} className="admin-mobile-card teacher-card-item">
          <div className="teacher-card-item-header">
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span className="teacher-code-pill" style={{ fontWeight: 700, minWidth: 26, textAlign: 'center' }}>
                #{idx + 1}
              </span>
              <strong style={{ color: 'var(--navy-primary, #102a43)', fontSize: '0.92rem' }}>
                {ch.title}
              </strong>
            </div>
            <StatusBadge
              status={ch.status}
              label={
                ch.status === 'published'
                  ? 'Đã xuất bản'
                  : ch.status === 'draft'
                  ? 'Bản nháp'
                  : 'Lưu trữ'
              }
            />
          </div>

          <div className="teacher-card-item-body">
            <div className="teacher-card-stat">
              <span className="teacher-stat-label">Môn học</span>
              <span style={{ fontSize: '0.82rem', fontWeight: 600, color: '#0284c7' }}>
                {ch.subjectName || ch.subjectId}
              </span>
            </div>
            <div className="teacher-card-stat">
              <span className="teacher-stat-label">Bài giảng</span>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontWeight: 600 }}>
                <BookOpen size={13} color="#627d98" />
                <span>{ch.lessonsCount || 0} bài</span>
              </span>
            </div>
            <div className="teacher-card-stat">
              <span className="teacher-stat-label">Thứ tự</span>
              <span style={{ fontSize: '0.82rem' }}>Vị trí {ch.order}</span>
            </div>
          </div>

          <div className="teacher-card-item-footer" style={{ display: 'flex', gap: 6, marginTop: 10 }}>
            <div style={{ display: 'flex', gap: 4, marginRight: 'auto' }}>
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={() => onMoveUp(idx)}
                disabled={idx === 0}
                title="Di chuyển lên trên"
                aria-label={`Di chuyển chương ${ch.title} lên trên`}
              >
                <ArrowUp size={14} />
              </button>
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={() => onMoveDown(idx)}
                disabled={idx === chapters.length - 1}
                title="Di chuyển xuống dưới"
                aria-label={`Di chuyển chương ${ch.title} xuống dưới`}
              >
                <ArrowDown size={14} />
              </button>
            </div>
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={() => onEdit(ch)}
              title={`Sửa chương ${ch.title}`}
              aria-label={`Sửa chương ${ch.title}`}
            >
              <Edit2 size={14} />
              <span>Sửa</span>
            </button>
            <button
              type="button"
              className="btn btn-secondary btn-sm text-danger"
              onClick={() => onDelete(ch.id, ch.title)}
              title={`Xóa chương ${ch.title}`}
              aria-label={`Xóa chương ${ch.title}`}
            >
              <Trash2 size={14} />
            </button>
          </div>
        </div>
      ))}
    </div>
  )
}

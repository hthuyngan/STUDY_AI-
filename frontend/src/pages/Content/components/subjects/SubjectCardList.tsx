import React from 'react'
import { Link } from 'react-router-dom'
import { Layers, Edit2, Trash2 } from 'lucide-react'
import type { CurriculumSubjectItem } from '@/types/education'
import { StatusBadge } from '@/components/ui/StatusBadge'

export interface SubjectCardListProps {
  subjects: CurriculumSubjectItem[]
  onEdit: (subject: CurriculumSubjectItem) => void
  onDelete: (id: string, name: string) => void
}

export const SubjectCardList: React.FC<SubjectCardListProps> = ({
  subjects,
  onEdit,
  onDelete,
}) => {
  return (
    <div className="admin-mobile-card-list teacher-mobile-cards-list" role="region" aria-label="Danh sách môn học trên di động">
      {subjects.map((s) => (
        <div key={s.id} className="admin-mobile-card teacher-card-item">
          <div className="teacher-card-item-header">
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <span style={{ fontSize: '1.4rem' }}>{s.icon || '📖'}</span>
              <div>
                <strong style={{ color: 'var(--navy-primary, #102a43)', fontSize: '0.95rem' }}>
                  {s.name}
                </strong>
                <div style={{ fontSize: '0.78rem', color: '#627d98', marginTop: 2 }}>
                  Mã: <code>{s.code}</code> • {s.grade}
                </div>
              </div>
            </div>
            <StatusBadge
              status={s.status}
              label={
                s.status === 'published'
                  ? 'Đã xuất bản'
                  : s.status === 'draft'
                  ? 'Bản nháp'
                  : 'Lưu trữ'
              }
            />
          </div>

          {s.description && (
            <p style={{ margin: '8px 0', fontSize: '0.82rem', color: '#627d98', lineHeight: 1.4 }}>
              {s.description}
            </p>
          )}

          <div className="teacher-card-item-body">
            <div className="teacher-card-stat">
              <span className="teacher-stat-label">Số chương</span>
              <Link
                to={`/content/chapters?subject=${s.id}`}
                style={{ color: '#0284c7', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: 4, textDecoration: 'none' }}
                title="Xem danh sách chương học"
              >
                <Layers size={13} />
                <span>{s.chapterCount || 0} chương</span>
              </Link>
            </div>
            <div className="teacher-card-stat">
              <span className="teacher-stat-label">Bài học</span>
              <strong className="teacher-stat-val">{s.lessonCount || 0} bài</strong>
            </div>
            <div className="teacher-card-stat">
              <span className="teacher-stat-label">Cập nhật</span>
              <span style={{ fontSize: '0.78rem', color: '#627d98' }}>
                {s.updatedAt ? new Date(s.updatedAt).toLocaleDateString('vi-VN') : '—'}
              </span>
            </div>
          </div>

          <div className="teacher-card-item-footer" style={{ display: 'flex', gap: 8, marginTop: 10 }}>
            <Link
              to={`/content/subjects/${s.id}`}
              className="btn btn-secondary btn-sm"
              style={{ flex: 1, textAlign: 'center', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 4 }}
            >
              Xem chi tiết
            </Link>
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={() => onEdit(s)}
              title={`Sửa môn học ${s.name}`}
              aria-label={`Sửa môn học ${s.name}`}
            >
              <Edit2 size={14} />
            </button>
            <button
              type="button"
              className="btn btn-secondary btn-sm text-danger"
              onClick={() => onDelete(s.id, s.name)}
              title={`Xóa môn học ${s.name}`}
              aria-label={`Xóa môn học ${s.name}`}
            >
              <Trash2 size={14} />
            </button>
          </div>
        </div>
      ))}
    </div>
  )
}


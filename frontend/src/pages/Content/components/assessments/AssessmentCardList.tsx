import React from 'react'
import { Eye, Plus, Edit2, Trash2 } from 'lucide-react'
import type { CurriculumAssessmentItem } from '@/types/education'
import { StatusBadge } from '@/components/ui/StatusBadge'

export interface AssessmentCardListProps {
  assessments: CurriculumAssessmentItem[]
  onPreview: (asm: CurriculumAssessmentItem) => void
  onAddQuestion: (id: string) => void
  onEdit: (asm: CurriculumAssessmentItem) => void
  onDelete: (id: string, title: string) => void
}

export const AssessmentCardList: React.FC<AssessmentCardListProps> = ({
  assessments,
  onPreview,
  onAddQuestion,
  onEdit,
  onDelete,
}) => {
  return (
    <div className="admin-mobile-card-list teacher-mobile-cards-list" role="region" aria-label="Danh sách bài thu hoạch trên di động">
      {assessments.map((asm) => {
        const qCount = asm.questions?.length || asm.questionCount || 0
        return (
          <div key={asm.id} className="admin-mobile-card teacher-card-item">
            <div className="teacher-card-item-header">
              <div>
                <strong style={{ color: 'var(--navy-primary, #102a43)', fontSize: '0.92rem' }}>
                  {asm.lessonTitle}
                </strong>
                <div className="teacher-card-meta-line" style={{ marginTop: 2 }}>
                  <span>{asm.subjectName}</span>
                  <span>•</span>
                  <span>{asm.chapterName || 'Chương 1'}</span>
                </div>
              </div>
              <StatusBadge status={asm.status} />
            </div>

            <div className="teacher-card-item-body">
              <div className="teacher-card-stat">
                <span className="teacher-stat-label">Số câu hỏi</span>
                <strong className="teacher-stat-val" style={{ color: qCount > 0 ? '#102a43' : '#d97706' }}>
                  {qCount} câu
                </strong>
              </div>
              <div className="teacher-card-stat">
                <span className="teacher-stat-label">Thời lượng</span>
                <span>{asm.durationMinutes || 15} phút</span>
              </div>
              <div className="teacher-card-stat">
                <span className="teacher-stat-label">Điểm đạt</span>
                <span style={{ fontWeight: 600, color: '#047857' }}>{asm.passingScore || 60}%</span>
              </div>
            </div>

            <div className="teacher-card-item-footer" style={{ display: 'flex', gap: 6, marginTop: 10, flexWrap: 'wrap' }}>
              <button
                type="button"
                className="btn btn-primary btn-sm"
                onClick={() => onPreview(asm)}
                style={{ flex: 1, minWidth: 100, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 4 }}
              >
                <Eye size={13} />
                <span>Xem trước</span>
              </button>
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={() => onAddQuestion(asm.id)}
                title="Thêm câu hỏi"
                aria-label={`Thêm câu hỏi ${asm.lessonTitle}`}
              >
                <Plus size={13} />
                <span>Thêm câu</span>
              </button>
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={() => onEdit(asm)}
                title="Chỉnh sửa bài"
                aria-label={`Chỉnh sửa ${asm.lessonTitle}`}
              >
                <Edit2 size={13} />
              </button>
              <button
                type="button"
                className="btn btn-secondary btn-sm text-danger"
                onClick={() => onDelete(asm.id, asm.lessonTitle)}
                title="Xóa bài"
                aria-label={`Xóa bài ${asm.lessonTitle}`}
              >
                <Trash2 size={13} />
              </button>
            </div>
          </div>
        )
      })}
    </div>
  )
}


import React from 'react'
import { ArrowLeft, BookOpen, AlertTriangle, BookMarked, Sparkles, X, RotateCw } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import type { TutorLearningContext } from '@/types/aiTutor'
import './ContextualHeaderBadge.css'

export interface ContextualHeaderBadgeProps {
  context: TutorLearningContext
  onClearContext: () => void
}

function getSourceMeta(source: TutorLearningContext['source']) {
  switch (source) {
    case 'assessment-question':
      return { label: 'Câu hỏi bài thu hoạch', icon: AlertTriangle, badgeClass: 'source-assessment' }
    case 'knowledge-gap':
      return { label: 'Kiến thức cần củng cố', icon: RotateCw, badgeClass: 'source-gap' }
    case 'smart-review':
      return { label: 'Ôn tập Spaced Repetition', icon: Sparkles, badgeClass: 'source-review' }
    case 'study-note':
      return { label: 'Ghi chú học tập', icon: BookMarked, badgeClass: 'source-note' }
    case 'lesson-section':
      return { label: 'Đoạn bài giảng', icon: BookOpen, badgeClass: 'source-section' }
    case 'lesson':
    default:
      return { label: 'Bài học', icon: BookOpen, badgeClass: 'source-lesson' }
  }
}

export const ContextualHeaderBadge: React.FC<ContextualHeaderBadgeProps> = ({
  context,
  onClearContext,
}) => {
  const navigate = useNavigate()
  const meta = getSourceMeta(context.source)
  const Icon = meta.icon

  const handleReturn = () => {
    if (context.returnUrl) {
      navigate(context.returnUrl)
    } else if (context.lessonId) {
      navigate(`/subjects/${context.subjectId || 'math'}/lessons/${context.lessonId}`)
    } else {
      navigate(-1)
    }
  }

  return (
    <aside
      className="contextual-header-panel"
      role="region"
      aria-label="Ngữ cảnh học tập hiện tại"
    >
      <div className="contextual-panel-content">
        <div className="contextual-meta-group">
          <span className={`contextual-source-tag ${meta.badgeClass}`}>
            <Icon size={12} aria-hidden />
            <span>{meta.label}</span>
          </span>

          <span className="contextual-breadcrumbs">
            {context.subjectName && <strong>{context.subjectName} / </strong>}
            {context.lessonTitle && <span>{context.lessonTitle} / </span>}
            <span className="contextual-active-title" title={context.title}>
              {context.sectionTitle || context.title}
            </span>
          </span>
        </div>

        {context.excerpt && (
          <p className="contextual-excerpt-snippet" title={context.excerpt}>
            &ldquo;{context.excerpt}&rdquo;
          </p>
        )}
      </div>

      <div className="contextual-actions-group">
        <button
          type="button"
          className="contextual-return-btn"
          onClick={handleReturn}
          aria-label="Quay lại bài giảng hoặc màn hình trước"
        >
          <ArrowLeft size={13} aria-hidden />
          <span>Quay lại</span>
        </button>

        <button
          type="button"
          className="contextual-dismiss-btn"
          onClick={onClearContext}
          aria-label="Bỏ ngữ cảnh này và chuyển sang trò chuyện chung"
          title="Bỏ ngữ cảnh"
        >
          <X size={14} aria-hidden />
          <span className="dismiss-label">Bỏ ngữ cảnh</span>
        </button>
      </div>
    </aside>
  )
}

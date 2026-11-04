import React from 'react'
import {
  Award,
  RotateCcw,
  BookOpen,
  AlertTriangle,
  Clock,
  Filter,
} from 'lucide-react'
import type { TimelineHistoryItem } from '@/types/analytics'

interface LearningHistoryTabProps {
  history: TimelineHistoryItem[]
  selectedCategory: string
  onSelectCategory: (cat: string) => void
  selectedSubject: string
  onSelectSubject: (subj: string) => void
}

export const LearningHistoryTab: React.FC<LearningHistoryTabProps> = ({
  history,
  selectedCategory,
  onSelectCategory,
  selectedSubject,
  onSelectSubject,
}) => {
  const getCategoryIcon = (cat: string) => {
    switch (cat) {
      case 'assessment':
        return <Award size={16} className="text-success" aria-hidden />
      case 'smart_review':
        return <RotateCcw size={16} className="text-primary" aria-hidden />
      case 'knowledge_gap':
        return <AlertTriangle size={16} className="text-warning" aria-hidden />
      case 'lesson_progress':
      default:
        return <BookOpen size={16} className="text-info" aria-hidden />
    }
  }

  return (
    <div className="analytics-tab-history">
      {/* Filters Toolbar */}
      <div className="history-filter-toolbar">
        {/* Category Pills */}
        <div className="history-cat-pills">
          <span className="filter-label">
            <Filter size={13} aria-hidden /> Lọc sự kiện:
          </span>
          {[
            { id: 'all', label: 'Tất cả' },
            { id: 'assessment', label: 'Bài thu hoạch' },
            { id: 'smart_review', label: 'Ôn ngắt quãng' },
            { id: 'knowledge_gap', label: 'Kiến thức yếu' },
            { id: 'lesson_progress', label: 'Đọc bài giảng' },
          ].map((cat) => (
            <button
              key={cat.id}
              type="button"
              className={`cat-pill-btn ${selectedCategory === cat.id ? 'active' : ''}`}
              onClick={() => onSelectCategory(cat.id)}
            >
              {cat.label}
            </button>
          ))}
        </div>

        {/* Subject Chips */}
        <div className="history-subj-chips">
          {[
            { id: 'all', label: 'Tất cả môn' },
            { id: 'math', label: 'Toán' },
            { id: 'physics', label: 'Lý' },
            { id: 'chemistry', label: 'Hóa' },
            { id: 'english', label: 'Anh' },
          ].map((s) => (
            <button
              key={s.id}
              type="button"
              className={`subj-chip-btn ${selectedSubject === s.id ? 'active' : ''}`}
              onClick={() => onSelectSubject(s.id)}
            >
              {s.label}
            </button>
          ))}
        </div>
      </div>

      {/* Timeline List */}
      {history.length === 0 ? (
        <div className="empty-history-box">
          <Clock size={36} className="empty-icon text-muted" aria-hidden />
          <h4 className="empty-title">Chưa có lịch sử học tập phù hợp</h4>
          <p className="empty-desc">
            Các mốc quan trọng như nộp bài thu hoạch, đọc xong phần lý thuyết và ôn tập sẽ tự động xuất hiện tại đây.
          </p>
        </div>
      ) : (
        <div className="timeline-stream">
          {history.map((item) => (
            <div key={item.id} className="timeline-node">
              <div className="node-icon-col">
                <div className={`node-icon-circle ${item.category}`}>
                  {getCategoryIcon(item.category)}
                </div>
                <div className="node-vertical-line" />
              </div>

              <div className="node-content-card">
                <div className="node-meta-row">
                  <span className="node-time">
                    {item.dateFormatted} lúc {item.timeFormatted}
                  </span>
                  {item.subjectName && (
                    <span className="node-subj-tag">{item.subjectName}</span>
                  )}
                  <span className={`node-badge ${item.badgeVariant}`}>
                    {item.badgeText}
                  </span>
                </div>

                <h4 className="node-title">{item.title}</h4>
                <p className="node-desc">{item.description}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}


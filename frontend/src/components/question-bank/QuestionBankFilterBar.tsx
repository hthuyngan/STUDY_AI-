import React from 'react'
import { Search, RotateCcw } from 'lucide-react'
import type {
  CognitiveLevel,
  QuestionDifficulty,
  QuestionFilterCriteria,
  QuestionReviewStatus,
  QuestionType,
} from '@/types/questionBank'
import './QuestionBankFilterBar.css'

interface QuestionBankFilterBarProps {
  criteria: QuestionFilterCriteria
  onChangeCriteria: (criteria: QuestionFilterCriteria) => void
  onReset: () => void
  totalCount: number
  filteredCount: number
}

export const QuestionBankFilterBar: React.FC<QuestionBankFilterBarProps> = ({
  criteria,
  onChangeCriteria,
  onReset,
  totalCount,
  filteredCount,
}) => {
  return (
    <div className="qb-filter-bar-card">
      {/* Top Search & Reset Row */}
      <div className="qb-search-row">
        <div className="qb-search-input-wrap">
          <Search size={16} className="qb-search-icon" aria-hidden />
          <input
            type="text"
            className="qb-search-input"
            placeholder="Tìm theo nội dung câu hỏi, mã kỹ năng (SKILL-MATH-12)..."
            value={criteria.search || ''}
            onChange={(e) => onChangeCriteria({ ...criteria, search: e.target.value })}
          />
        </div>

        <div className="qb-filter-meta-right">
          <span className="qb-count-indicator">
            Hiển thị <strong>{filteredCount}</strong> / {totalCount} câu
          </span>
          <button type="button" className="qb-reset-filter-btn" onClick={onReset} title="Xóa bộ lọc">
            <RotateCcw size={14} aria-hidden />
            <span>Đặt lại</span>
          </button>
        </div>
      </div>

      {/* Filter Select Controls */}
      <div className="qb-filter-controls-grid">
        {/* Question Type */}
        <div className="qb-filter-group">
          <label className="qb-filter-label">Dạng câu hỏi</label>
          <select
            className="qb-filter-select"
            value={criteria.type || ''}
            onChange={(e) =>
              onChangeCriteria({
                ...criteria,
                type: (e.target.value as QuestionType) || undefined,
              })
            }
          >
            <option value="">Tất cả dạng câu</option>
            <option value="multiple_choice">Trắc nghiệm 4 lựa chọn (MCQ)</option>
            <option value="true_false_group">Đúng / Sai theo cụm 4 ý</option>
            <option value="short_answer">Trả lời ngắn</option>
          </select>
        </div>

        {/* Cognitive Level */}
        <div className="qb-filter-group">
          <label className="qb-filter-label">Mức độ nhận thức</label>
          <select
            className="qb-filter-select"
            value={criteria.cognitiveLevel || ''}
            onChange={(e) =>
              onChangeCriteria({
                ...criteria,
                cognitiveLevel: (e.target.value as CognitiveLevel) || undefined,
              })
            }
          >
            <option value="">Tất cả mức độ</option>
            <option value="recognition">Nhận biết</option>
            <option value="comprehension">Thông hiểu</option>
            <option value="application">Vận dụng</option>
            <option value="high_application">Vận dụng cao</option>
          </select>
        </div>

        {/* Difficulty */}
        <div className="qb-filter-group">
          <label className="qb-filter-label">Độ khó</label>
          <select
            className="qb-filter-select"
            value={criteria.difficulty || ''}
            onChange={(e) =>
              onChangeCriteria({
                ...criteria,
                difficulty: (e.target.value as QuestionDifficulty) || undefined,
              })
            }
          >
            <option value="">Tất cả độ khó</option>
            <option value="easy">Dễ</option>
            <option value="medium">Trung bình</option>
            <option value="hard">Khó</option>
            <option value="very_hard">Rất khó</option>
          </select>
        </div>

        {/* Review Status */}
        <div className="qb-filter-group">
          <label className="qb-filter-label">Trạng thái duyệt</label>
          <select
            className="qb-filter-select"
            value={criteria.reviewStatus || 'all'}
            onChange={(e) =>
              onChangeCriteria({
                ...criteria,
                reviewStatus: (e.target.value as QuestionReviewStatus | 'all') || 'all',
              })
            }
          >
            <option value="all">Tất cả trạng thái</option>
            <option value="approved">Đã duyệt (Approved)</option>
            <option value="needs_review">Chờ duyệt (Needs Review)</option>
          </select>
        </div>
      </div>
    </div>
  )
}

import React from 'react'
import { Search, RotateCcw, Trash2, Plus } from 'lucide-react'
import type { QuestionFilterParams } from '../types'

interface SubjectOption {
  id: string
  name: string
}

interface QuestionFiltersProps {
  filters: QuestionFilterParams
  onFilterChange: (updates: Partial<QuestionFilterParams>) => void
  onReset: () => void
  subjects: SubjectOption[]
  onOpenCreate: () => void
}

export const QuestionFilters: React.FC<QuestionFiltersProps> = ({
  filters,
  onFilterChange,
  onReset,
  subjects,
  onOpenCreate,
}) => {
  return (
    <div
      style={{
        backgroundColor: '#FFFFFF',
        border: '1px solid #E2E8F0',
        borderRadius: '12px',
        padding: '16px',
        marginBottom: '16px',
        boxShadow: '0 1px 3px rgba(0, 0, 0, 0.04)',
        display: 'flex',
        flexDirection: 'column',
        gap: '12px',
      }}
    >
      {/* Top action row */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
        {/* Search */}
        <div style={{ flex: '1 1 280px', position: 'relative' }}>
          <Search
            size={16}
            style={{
              position: 'absolute',
              left: '12px',
              top: '50%',
              transform: 'translateY(-50%)',
              color: '#94A3B8',
              pointerEvents: 'none',
            }}
          />
          <input
            type="text"
            placeholder="Tìm theo nội dung, mã câu, chủ đề..."
            value={filters.search || ''}
            onChange={(e) => onFilterChange({ search: e.target.value, page: 1 })}
            style={{
              width: '100%',
              height: '38px',
              paddingLeft: '36px',
              paddingRight: '12px',
              fontSize: '13.5px',
              border: '1px solid #CBD5E1',
              borderRadius: '8px',
              backgroundColor: '#F8FAFC',
              outline: 'none',
              boxSizing: 'border-box',
            }}
          />
        </div>

        {/* Right action group */}
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
          <button
            type="button"
            className="staff-btn staff-btn-secondary"
            onClick={() => onFilterChange({ includeDeleted: !filters.includeDeleted, page: 1 })}
            style={{
              height: '38px',
              padding: '0 12px',
              borderRadius: '8px',
              backgroundColor: filters.includeDeleted ? 'rgba(220, 38, 38, 0.08)' : '#FFFFFF',
              borderColor: filters.includeDeleted ? '#DC2626' : '#CBD5E1',
              color: filters.includeDeleted ? '#DC2626' : '#475569',
              fontWeight: 600,
            }}
          >
            <Trash2 size={15} />
            {filters.includeDeleted ? 'Đang xem thùng rác' : 'Thùng rác'}
          </button>

          <button
            type="button"
            className="staff-btn staff-btn-secondary"
            onClick={onReset}
            style={{ height: '38px', padding: '0 12px', borderRadius: '8px' }}
            title="Đặt lại bộ lọc"
            aria-label="Đặt lại bộ lọc"
          >
            <RotateCcw size={15} />
            Đặt lại
          </button>

          <button
            type="button"
            className="staff-btn staff-btn-primary"
            onClick={onOpenCreate}
            style={{
              height: '38px',
              padding: '0 16px',
              borderRadius: '8px',
              backgroundColor: '#183B69',
              borderColor: '#183B69',
              fontWeight: 600,
            }}
          >
            <Plus size={16} />
            Soạn câu hỏi mới
          </button>
        </div>
      </div>

      {/* Select filter row */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
          gap: '10px',
        }}
      >
        {/* Subject */}
        <select
          value={filters.subjectId || 'all'}
          onChange={(e) => onFilterChange({ subjectId: e.target.value, page: 1 })}
          style={{
            height: '36px',
            padding: '0 10px',
            fontSize: '13px',
            border: '1px solid #CBD5E1',
            borderRadius: '8px',
            backgroundColor: '#FFFFFF',
            outline: 'none',
          }}
        >
          <option value="all">Tất cả môn học</option>
          <option value="math">Toán học</option>
          <option value="physics">Vật lý</option>
          <option value="chemistry">Hóa học</option>
          <option value="english">Tiếng Anh</option>
          <option value="history">Lịch sử</option>
          <option value="geography">Địa lý</option>
          <option value="biology">Sinh học</option>
          <option value="civic">Giáo dục công dân</option>
          <option value="literature">Ngữ văn</option>
          {subjects
            .filter((s) => !['math', 'physics', 'chemistry', 'english', 'history', 'geography', 'biology', 'civic', 'literature'].includes(s.id.toLowerCase()))
            .map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
        </select>

        {/* Grade */}
        <select
          value={filters.grade || 'all'}
          onChange={(e) => onFilterChange({ grade: e.target.value, page: 1 })}
          style={{
            height: '36px',
            padding: '0 10px',
            fontSize: '13px',
            border: '1px solid #CBD5E1',
            borderRadius: '8px',
            backgroundColor: '#FFFFFF',
            outline: 'none',
          }}
        >
          <option value="all">Tất cả khối lớp</option>
          <option value="12">Lớp 12</option>
          <option value="11">Lớp 11</option>
          <option value="10">Lớp 10</option>
        </select>

        {/* Difficulty */}
        <select
          value={filters.difficulty || 'all'}
          onChange={(e) => onFilterChange({ difficulty: e.target.value, page: 1 })}
          style={{
            height: '36px',
            padding: '0 10px',
            fontSize: '13px',
            border: '1px solid #CBD5E1',
            borderRadius: '8px',
            backgroundColor: '#FFFFFF',
            outline: 'none',
          }}
        >
          <option value="all">Tất cả độ khó</option>
          <option value="nhan_biet">Nhận biết</option>
          <option value="thong_hieu">Thông hiểu</option>
          <option value="van_dung">Vận dụng</option>
          <option value="van_dung_cao">Vận dụng cao</option>
          <option value="easy">Dễ (Easy)</option>
          <option value="medium">Trung bình (Medium)</option>
          <option value="hard">Khó (Hard)</option>
        </select>

        {/* Type */}
        <select
          value={filters.type || 'all'}
          onChange={(e) => onFilterChange({ type: e.target.value, page: 1 })}
          style={{
            height: '36px',
            padding: '0 10px',
            fontSize: '13px',
            border: '1px solid #CBD5E1',
            borderRadius: '8px',
            backgroundColor: '#FFFFFF',
            outline: 'none',
          }}
        >
          <option value="all">Tất cả dạng câu hỏi</option>
          <option value="multiple-choice">Trắc nghiệm đơn</option>
          <option value="multiple-select">Nhiều đáp án</option>
          <option value="true-false">Đúng / Sai</option>
          <option value="short-answer">Trả lời ngắn</option>
          <option value="essay">Tự luận</option>
        </select>

        {/* Status */}
        <select
          value={filters.status || 'all'}
          onChange={(e) => onFilterChange({ status: e.target.value, page: 1 })}
          style={{
            height: '36px',
            padding: '0 10px',
            fontSize: '13px',
            border: '1px solid #CBD5E1',
            borderRadius: '8px',
            backgroundColor: '#FFFFFF',
            outline: 'none',
          }}
        >
          <option value="all">Tất cả trạng thái</option>
          <option value="draft">Bản nháp</option>
          <option value="in-review">Chờ kiểm duyệt</option>
          <option value="approved">Đã phê duyệt</option>
          <option value="published">Đã xuất bản</option>
          <option value="rejected">Bị từ chối</option>
        </select>

        {/* Source */}
        <select
          value={filters.sourceType || 'all'}
          onChange={(e) => onFilterChange({ sourceType: e.target.value, page: 1 })}
          style={{
            height: '36px',
            padding: '0 10px',
            fontSize: '13px',
            border: '1px solid #CBD5E1',
            borderRadius: '8px',
            backgroundColor: '#FFFFFF',
            outline: 'none',
          }}
        >
          <option value="all">Mọi nguồn dữ liệu</option>
          <option value="manual">Thủ công</option>
          <option value="ai-generated">AI sinh</option>
          <option value="vnhsge">Bộ đề VNHSGE</option>
        </select>
      </div>
    </div>
  )
}

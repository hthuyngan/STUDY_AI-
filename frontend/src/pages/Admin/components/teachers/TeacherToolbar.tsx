import React from 'react'
import { Search, RotateCcw } from 'lucide-react'

export interface TeacherFilterValues {
  search: string
  subject: string
  status: string
  accountStatus: string
}

export interface TeacherToolbarProps {
  filters: TeacherFilterValues
  onFilterChange: (newFilters: TeacherFilterValues) => void
  onResetFilters: () => void
}

export const TeacherToolbar: React.FC<TeacherToolbarProps> = ({
  filters,
  onFilterChange,
  onResetFilters,
}) => {
  const isFiltered =
    Boolean(filters.search.trim()) ||
    filters.subject !== 'all' ||
    filters.status !== 'all' ||
    filters.accountStatus !== 'all'

  return (
    <div className="teacher-toolbar-container" role="search" aria-label="Bộ lọc tìm kiếm giáo viên">
      <div className="teacher-toolbar-left">
        {/* Search Input */}
        <div className="teacher-search-input-wrap">
          <Search size={15} className="teacher-search-icon" aria-hidden="true" />
          <input
            type="search"
            className="teacher-search-input"
            placeholder="Tìm theo tên giáo viên, email hoặc mã lớp..."
            value={filters.search}
            onChange={(e) => onFilterChange({ ...filters, search: e.target.value })}
            aria-label="Tìm kiếm giáo viên"
          />
        </div>

        {/* Filters Group */}
        <div className="teacher-filters-group">
          {/* Subject Filter */}
          <select
            className="teacher-select"
            value={filters.subject}
            onChange={(e) => onFilterChange({ ...filters, subject: e.target.value })}
            aria-label="Lọc theo bộ môn"
          >
            <option value="all">Tất cả bộ môn</option>
            <option value="Toán học">Toán học</option>
            <option value="Vật lý">Vật lý</option>
            <option value="Hóa học">Hóa học</option>
            <option value="Ngữ văn">Ngữ văn</option>
            <option value="Tiếng Anh">Tiếng Anh</option>
          </select>

          {/* Status Filter */}
          <select
            className="teacher-select"
            value={filters.status}
            onChange={(e) => onFilterChange({ ...filters, status: e.target.value })}
            aria-label="Lọc theo trạng thái giảng dạy"
          >
            <option value="all">Tất cả trạng thái</option>
            <option value="active">Đang giảng dạy</option>
            <option value="pending">Chờ phê duyệt</option>
            <option value="inactive">Tạm ngừng</option>
          </select>

          {/* Account Status Filter */}
          <select
            className="teacher-select"
            value={filters.accountStatus}
            onChange={(e) => onFilterChange({ ...filters, accountStatus: e.target.value })}
            aria-label="Lọc theo tài khoản"
          >
            <option value="all">Tất cả tài khoản</option>
            <option value="ACTIVE">Hoạt động bình thường</option>
            <option value="LOCKED">Đã khóa tài khoản</option>
          </select>
        </div>
      </div>

      <div className="teacher-toolbar-right">
        {isFiltered && (
          <button
            type="button"
            className="btn btn-secondary btn-sm teacher-reset-btn"
            onClick={onResetFilters}
            aria-label="Đặt lại bộ lọc"
          >
            <RotateCcw size={13} aria-hidden="true" />
            <span>Đặt lại bộ lọc</span>
          </button>
        )}
      </div>
    </div>
  )
}

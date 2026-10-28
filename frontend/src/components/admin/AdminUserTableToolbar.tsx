import React from 'react'
import { Search, Download, UserPlus, Filter } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import './AdminComponents.css'

export interface AdminUserTableToolbarProps {
  search: string
  onSearchChange: (val: string) => void
  roleFilter: string
  onRoleFilterChange: (val: string) => void
  statusFilter: string
  onStatusFilterChange: (val: string) => void
  pageSize: number
  onPageSizeChange: (val: number) => void
  onAddUserClick: () => void
  onExportCSVClick: () => void
  totalCount: number
}

export const AdminUserTableToolbar: React.FC<AdminUserTableToolbarProps> = ({
  search,
  onSearchChange,
  roleFilter,
  onRoleFilterChange,
  statusFilter,
  onStatusFilterChange,
  pageSize,
  onPageSizeChange,
  onAddUserClick,
  onExportCSVClick,
  totalCount,
}) => {
  return (
    <div className="admin-table-toolbar">
      {/* Top row: Search and Filters */}
      <div className="admin-toolbar-row">
        {/* Search */}
        <div className="admin-search-wrap">
          <Search size={16} className="admin-search-icon" aria-hidden="true" />
          <input
            type="search"
            className="admin-search-input"
            placeholder="Tìm theo tên, email, lớp..."
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            aria-label="Tìm kiếm người dùng"
          />
        </div>

        {/* Filters and Actions */}
        <div className="admin-filters-wrap">
          <div className="admin-filter-item">
            <Filter size={14} className="admin-filter-icon" aria-hidden="true" />
            <select
              className="admin-select"
              value={roleFilter}
              onChange={(e) => onRoleFilterChange(e.target.value)}
              aria-label="Lọc theo vai trò"
            >
              <option value="all">Tất cả vai trò</option>
              <option value="learner">Học viên</option>
              <option value="teacher">Giáo viên</option>
              <option value="content">Nội dung</option>
              <option value="support">Hỗ trợ</option>
              <option value="admin">Quản trị viên</option>
            </select>
          </div>

          <div className="admin-filter-item">
            <select
              className="admin-select"
              value={statusFilter}
              onChange={(e) => onStatusFilterChange(e.target.value)}
              aria-label="Lọc theo trạng thái"
            >
              <option value="all">Tất cả trạng thái</option>
              <option value="active">Đang hoạt động</option>
              <option value="pending">Chờ phê duyệt</option>
              <option value="suspended">Tạm khóa</option>
            </select>
          </div>

          <div className="admin-filter-item">
            <label htmlFor="page-size-select" className="admin-page-size-label">Hiển thị:</label>
            <select
              id="page-size-select"
              className="admin-select page-size-select"
              value={pageSize}
              onChange={(e) => onPageSizeChange(Number(e.target.value))}
              aria-label="Số dòng mỗi trang"
            >
              <option value={10}>10 dòng</option>
              <option value={20}>20 dòng</option>
              <option value={50}>50 dòng</option>
            </select>
          </div>

          <Button
            variant="outline"
            icon={Download}
            onClick={onExportCSVClick}
            title="Xuất danh sách ra tệp CSV"
            aria-label="Xuất CSV"
          >
            <span>Xuất CSV</span>
          </Button>

          <Button
            variant="primary"
            icon={UserPlus}
            onClick={onAddUserClick}
            title="Tạo người dùng demo mới"
            aria-label="Thêm người dùng"
          >
            <span>Thêm người dùng</span>
          </Button>
        </div>
      </div>

      {/* Meta summary indicator */}
      <div className="admin-toolbar-summary">
        <span>Tổng cộng: <strong>{totalCount}</strong> tài khoản</span>
      </div>
    </div>
  )
}

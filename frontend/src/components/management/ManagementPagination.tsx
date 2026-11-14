import React from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import './ManagementLayout.css'

export interface ManagementPaginationProps {
  currentPage: number
  totalPages: number
  totalCount: number
  pageSize: number
  onPageChange: (page: number) => void
  onPageSizeChange?: (pageSize: number) => void
  pageSizeOptions?: number[]
  className?: string
}

export const ManagementPagination: React.FC<ManagementPaginationProps> = ({
  currentPage,
  totalPages,
  totalCount,
  pageSize,
  onPageChange,
  onPageSizeChange,
  pageSizeOptions = [10, 20, 50],
  className = '',
}) => {
  if (totalCount === 0 && totalPages <= 1) return null

  const startItem = totalCount === 0 ? 0 : (currentPage - 1) * pageSize + 1
  const endItem = Math.min(totalCount, currentPage * pageSize)

  // Generate page numbers
  const pages: number[] = []
  const maxButtons = 5
  let startPage = Math.max(1, currentPage - Math.floor(maxButtons / 2))
  let endPage = startPage + maxButtons - 1

  if (endPage > totalPages) {
    endPage = totalPages
    startPage = Math.max(1, endPage - maxButtons + 1)
  }

  for (let i = startPage; i <= endPage; i++) {
    pages.push(i)
  }

  return (
    <div className={`mgmt-pagination ${className}`.trim()} aria-label="Điều hướng phân trang">
      <div className="mgmt-pagination-info">
        Hiển thị <strong>{startItem}</strong> - <strong>{endItem}</strong> trên tổng số{' '}
        <strong>{totalCount}</strong> mục
      </div>

      <div className="mgmt-pagination-controls">
        {onPageSizeChange && (
          <select
            className="mgmt-select"
            value={pageSize}
            onChange={(e) => onPageSizeChange(Number(e.target.value))}
            aria-label="Số dòng mỗi trang"
            style={{ height: '28px', fontSize: '11.5px', padding: '0 24px 0 6px', marginRight: '8px' }}
          >
            {pageSizeOptions.map((opt) => (
              <option key={opt} value={opt}>
                {opt} dòng
              </option>
            ))}
          </select>
        )}

        <button
          type="button"
          className="mgmt-page-btn"
          disabled={currentPage <= 1}
          onClick={() => onPageChange(currentPage - 1)}
          aria-label="Trang trước"
        >
          <ChevronLeft size={14} />
        </button>

        {pages.map((p) => (
          <button
            key={p}
            type="button"
            className={`mgmt-page-btn ${p === currentPage ? 'active' : ''}`}
            onClick={() => onPageChange(p)}
            aria-label={`Trang ${p}`}
            aria-current={p === currentPage ? 'page' : undefined}
          >
            {p}
          </button>
        ))}

        <button
          type="button"
          className="mgmt-page-btn"
          disabled={currentPage >= totalPages}
          onClick={() => onPageChange(currentPage + 1)}
          aria-label="Trang sau"
        >
          <ChevronRight size={14} />
        </button>
      </div>
    </div>
  )
}

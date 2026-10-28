import React from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import './staff-shared.css'

export interface StaffPaginationProps {
  currentPage: number
  totalPages: number
  totalItems?: number
  itemsPerPage?: number
  onPageChange: (page: number) => void
}

export const StaffPagination: React.FC<StaffPaginationProps> = ({
  currentPage,
  totalPages,
  totalItems,
  itemsPerPage,
  onPageChange,
}) => {
  if (totalPages <= 1 && !totalItems) return null

  const startItem = totalItems !== undefined && itemsPerPage ? (currentPage - 1) * itemsPerPage + 1 : undefined
  const endItem =
    totalItems !== undefined && itemsPerPage ? Math.min(currentPage * itemsPerPage, totalItems) : undefined

  return (
    <div className="staff-pagination-root">
      <div>
        {totalItems !== undefined && startItem !== undefined && endItem !== undefined ? (
          <span>
            Hiển thị <strong>{startItem}</strong> - <strong>{endItem}</strong> trên{' '}
            <strong>{totalItems}</strong> mục
          </span>
        ) : (
          <span>
            Trang <strong>{currentPage}</strong> / <strong>{totalPages}</strong>
          </span>
        )}
      </div>

      <div className="staff-pagination-buttons">
        <button
          type="button"
          className="staff-page-btn"
          disabled={currentPage <= 1}
          onClick={() => onPageChange(currentPage - 1)}
          aria-label="Trang trước"
        >
          <ChevronLeft size={14} />
        </button>

        {Array.from({ length: totalPages }, (_, i) => i + 1)
          .filter((p) => p === 1 || p === totalPages || Math.abs(p - currentPage) <= 1)
          .map((p, idx, arr) => {
            const prev = arr[idx - 1]
            const showEllipsis = prev && p - prev > 1
            return (
              <React.Fragment key={p}>
                {showEllipsis && <span style={{ padding: '0 4px' }}>...</span>}
                <button
                  type="button"
                  className={`staff-page-btn ${p === currentPage ? 'active' : ''}`}
                  onClick={() => onPageChange(p)}
                  aria-current={p === currentPage ? 'page' : undefined}
                >
                  {p}
                </button>
              </React.Fragment>
            )
          })}

        <button
          type="button"
          className="staff-page-btn"
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

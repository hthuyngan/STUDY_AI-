import React from 'react'
import { ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react'
import { ManagementEmptyState } from './ManagementEmptyState'
import './ManagementLayout.css'

export interface ManagementColumn<T> {
  key: string
  title: string
  width?: string | number
  align?: 'left' | 'center' | 'right'
  sortable?: boolean
  render?: (value: unknown, record: T, index: number) => React.ReactNode
}

export interface ManagementTableProps<T> {
  columns: ManagementColumn<T>[]
  data: T[]
  rowKey: (record: T) => string
  isLoading?: boolean
  emptyTitle?: string
  emptyDescription?: string
  sortColumn?: string
  sortDirection?: 'asc' | 'desc'
  onSort?: (columnKey: string) => void
  selectedRowKeys?: string[]
  onSelectRow?: (rowKey: string) => void
  onSelectAll?: () => void
  isSelectAll?: boolean
  onRowClick?: (record: T) => void
  className?: string
  ariaLabel?: string
}

export function ManagementTable<T extends Record<string, unknown>>({
  columns,
  data,
  rowKey,
  isLoading = false,
  emptyTitle = 'Không có dữ liệu',
  emptyDescription = 'Không tìm thấy bản ghi nào khớp với điều kiện tìm kiếm.',
  sortColumn,
  sortDirection,
  onSort,
  selectedRowKeys,
  onSelectRow,
  onSelectAll,
  isSelectAll,
  onRowClick,
  className = '',
  ariaLabel = 'Bảng dữ liệu quản trị',
}: ManagementTableProps<T>): React.ReactElement {
  const hasSelection = Boolean(selectedRowKeys && onSelectRow)

  return (
    <div className={`mgmt-table-card ${className}`.trim()}>
      <div className="mgmt-table-wrapper">
        <table className="mgmt-table" aria-label={ariaLabel}>
          <thead>
            <tr>
              {hasSelection && (
                <th style={{ width: '40px', textAlign: 'center' }}>
                  <input
                    type="checkbox"
                    checked={Boolean(isSelectAll)}
                    onChange={onSelectAll}
                    aria-label="Chọn tất cả các dòng"
                    style={{ cursor: 'pointer' }}
                  />
                </th>
              )}
              {columns.map((col) => {
                const isSorted = sortColumn === col.key
                return (
                  <th
                    key={col.key}
                    style={{
                      width: col.width,
                      textAlign: col.align || 'left',
                      cursor: col.sortable ? 'pointer' : 'default',
                    }}
                    onClick={() => col.sortable && onSort?.(col.key)}
                  >
                    <div
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '4px',
                        justifyContent: col.align === 'right' ? 'flex-end' : col.align === 'center' ? 'center' : 'flex-start',
                      }}
                    >
                      <span>{col.title}</span>
                      {col.sortable && (
                        <span aria-hidden="true" style={{ color: isSorted ? 'var(--mgmt-primary)' : 'inherit' }}>
                          {isSorted && sortDirection === 'asc' ? (
                            <ArrowUp size={12} />
                          ) : isSorted && sortDirection === 'desc' ? (
                            <ArrowDown size={12} />
                          ) : (
                            <ArrowUpDown size={12} />
                          )}
                        </span>
                      )}
                    </div>
                  </th>
                )
              })}
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              Array.from({ length: 5 }).map((_, rIdx) => (
                <tr key={`skel-${rIdx}`}>
                  {hasSelection && (
                    <td style={{ textAlign: 'center' }}>
                      <div style={{ width: 16, height: 16, backgroundColor: '#E2E8F0', borderRadius: 3, margin: '0 auto' }} />
                    </td>
                  )}
                  {columns.map((_, cIdx) => (
                    <td key={`skel-td-${cIdx}`}>
                      <div
                        style={{
                          height: '14px',
                          width: cIdx === 0 ? '60%' : '85%',
                          backgroundColor: '#E2E8F0',
                          borderRadius: '4px',
                          animation: 'pulse 1.5s infinite',
                        }}
                      />
                    </td>
                  ))}
                </tr>
              ))
            ) : data.length === 0 ? (
              <tr>
                <td colSpan={columns.length + (hasSelection ? 1 : 0)} style={{ padding: 0 }}>
                  <ManagementEmptyState title={emptyTitle} description={emptyDescription} />
                </td>
              </tr>
            ) : (
              data.map((record, index) => {
                const key = rowKey(record)
                const isSelected = selectedRowKeys?.includes(key)

                return (
                  <tr
                    key={key}
                    className={isSelected ? 'selected' : undefined}
                    onClick={() => onRowClick?.(record)}
                    style={{ cursor: onRowClick ? 'pointer' : 'default' }}
                  >
                    {hasSelection && (
                      <td
                        style={{ textAlign: 'center' }}
                        onClick={(e) => e.stopPropagation()}
                      >
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => onSelectRow?.(key)}
                          aria-label={`Chọn dòng ${index + 1}`}
                          style={{ cursor: 'pointer' }}
                        />
                      </td>
                    )}
                    {columns.map((col) => {
                      const val = record[col.key]
                      return (
                        <td
                          key={col.key}
                          style={{
                            textAlign: col.align || 'left',
                          }}
                        >
                          {col.render ? col.render(val, record, index) : (val as React.ReactNode)}
                        </td>
                      )
                    })}
                  </tr>
                )
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}


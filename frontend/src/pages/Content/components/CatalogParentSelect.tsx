import React, { useCallback, useEffect, useState } from 'react'

export interface ParentOptionItem {
  id: string
  label: string
}

export interface CatalogParentSelectProps {
  id: string
  label: string
  value: string
  fallbackLabel?: string
  placeholder?: string
  emptyOptionLabel?: string
  required?: boolean
  onChange: (value: string) => void
  fetchPage: (search: string, page: number) => Promise<{ items: ParentOptionItem[]; total: number }>
}

export const CatalogParentSelect: React.FC<CatalogParentSelectProps> = ({
  id,
  label,
  value,
  fallbackLabel,
  placeholder = 'Tìm kiếm...',
  emptyOptionLabel = '-- Chọn --',
  required = false,
  onChange,
  fetchPage,
}) => {
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [items, setItems] = useState<ParentOptionItem[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(false)

  const load = useCallback(
    async (term: string, targetPage: number, append: boolean) => {
      setLoading(true)
      try {
        const res = await fetchPage(term, targetPage)
        setTotal(res.total)
        setItems((prev) => {
          if (!append) return res.items
          const seen = new Set(prev.map((x) => x.id))
          return [...prev, ...res.items.filter((x) => !seen.has(x.id))]
        })
      } catch {
        if (!append) setItems([])
      } finally {
        setLoading(false)
      }
    },
    [fetchPage]
  )

  useEffect(() => {
    const timer = setTimeout(() => {
      setPage(1)
      void load(search, 1, false)
    }, 150)
    return () => clearTimeout(timer)
  }, [search, load])

  const hasMore = items.length < total
  const selectedMissing = Boolean(value && !items.some((x) => x.id === value))

  return (
    <div className="catalog-form-field">
      <label className="catalog-form-label" htmlFor={id}>
        {label} {required ? '*' : ''}
      </label>
      <div className="catalog-parent-picker">
        <input
          type="search"
          className="catalog-form-input"
          aria-label={`Tìm ${label}`}
          placeholder={placeholder}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <select
          id={id}
          className="catalog-form-select"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          required={required}
        >
          <option value="">{emptyOptionLabel}</option>
          {selectedMissing && (
            <option value={value}>{fallbackLabel || value}</option>
          )}
          {items.map((opt) => (
            <option key={opt.id} value={opt.id}>
              {opt.label}
            </option>
          ))}
        </select>
        {hasMore && (
          <button
            type="button"
            className="catalog-action-btn"
            disabled={loading}
            onClick={() => {
              const next = page + 1
              setPage(next)
              void load(search, next, true)
            }}
          >
            {loading ? 'Đang tải...' : `Tải thêm (${items.length}/${total})`}
          </button>
        )}
      </div>
    </div>
  )
}

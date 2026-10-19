import { ChevronRight, Home } from 'lucide-react'
import { Link } from 'react-router-dom'
import './Breadcrumb.css'

export interface BreadcrumbItem {
  label: string
  to?: string
}

export interface BreadcrumbProps {
  items: BreadcrumbItem[]
}

export function Breadcrumb({ items }: BreadcrumbProps) {
  return (
    <nav className="breadcrumb-nav" aria-label="Đường dẫn phân cấp">
      <ol className="breadcrumb-list">
        <li className="breadcrumb-item">
          <Link to="/dashboard" className="breadcrumb-link" title="Trang chủ">
            <Home size={14} aria-hidden />
            <span className="sr-only">Trang chủ</span>
          </Link>
        </li>

        {items.map((item, index) => {
          const isLast = index === items.length - 1
          return (
            <li key={index} className="breadcrumb-item">
              <ChevronRight size={13} className="breadcrumb-separator" aria-hidden />
              {isLast || !item.to ? (
                <span className="breadcrumb-current" aria-current="page">
                  {item.label}
                </span>
              ) : (
                <Link to={item.to} className="breadcrumb-link">
                  {item.label}
                </Link>
              )}
            </li>
          )
        })}
      </ol>
    </nav>
  )
}

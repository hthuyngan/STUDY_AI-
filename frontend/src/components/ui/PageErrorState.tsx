import { AlertCircle, RotateCcw } from 'lucide-react'
import { Button } from './Button'
import './PageErrorState.css'

export interface PageErrorStateProps {
  title?: string
  description?: string
  message?: string
  onRetry?: () => void | Promise<void>
}

export function PageErrorState({
  title = 'Không thể tải dữ liệu',
  description,
  message,
  onRetry,
}: PageErrorStateProps) {
  const displayDescription =
    description || message || 'Đã có lỗi xảy ra trong quá trình kết nối. Vui lòng thử lại.'

  return (
    <div className="page-error-root" role="alert">
      <div className="page-error-icon" aria-hidden>
        <AlertCircle size={32} />
      </div>
      <h3 className="page-error-title">{title}</h3>
      <p className="page-error-desc">{displayDescription}</p>
      {onRetry && (
        <div className="page-error-action">
          <Button variant="outline" icon={RotateCcw} onClick={onRetry}>
            Thử lại
          </Button>
        </div>
      )}
    </div>
  )
}

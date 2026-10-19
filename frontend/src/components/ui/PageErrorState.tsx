import { AlertCircle, RotateCcw } from 'lucide-react'
import { Button } from './Button'
import './PageErrorState.css'

export interface PageErrorStateProps {
  title?: string
  description?: string
  onRetry?: () => void
}

export function PageErrorState({
  title = 'Không thể tải dữ liệu',
  description = 'Đã có lỗi xảy ra trong quá trình kết nối. Vui lòng thử lại.',
  onRetry,
}: PageErrorStateProps) {
  return (
    <div className="page-error-root" role="alert">
      <div className="page-error-icon" aria-hidden>
        <AlertCircle size={32} />
      </div>
      <h3 className="page-error-title">{title}</h3>
      <p className="page-error-desc">{description}</p>
      {onRetry && (
        <div className="page-error-action">
          <Button variant="outline" icon={RotateCcw} onClick={onRetry}>
            Thử tải lại
          </Button>
        </div>
      )}
    </div>
  )
}

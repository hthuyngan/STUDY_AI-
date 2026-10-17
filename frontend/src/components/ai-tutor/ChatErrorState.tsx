import { AlertCircle, RotateCcw } from 'lucide-react'
import { Button } from '../ui/Button'

interface ChatErrorStateProps {
  message?: string
  onRetry: () => void
  isRetrying?: boolean
}

export function ChatErrorState({
  message = 'Không thể tạo câu trả lời từ AI Tutor.',
  onRetry,
  isRetrying = false,
}: ChatErrorStateProps) {
  return (
    <div className="chat-error-banner" role="alert">
      <div className="chat-error-content">
        <AlertCircle size={16} className="chat-error-icon" aria-hidden />
        <span className="chat-error-text">{message}</span>
      </div>
      <Button
        variant="outline"
        onClick={onRetry}
        isLoading={isRetrying}
        icon={RotateCcw}
        className="chat-error-retry-btn"
      >
        Thử lại
      </Button>
    </div>
  )
}

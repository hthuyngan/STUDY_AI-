import { useState } from 'react'
import { Check, Copy, HelpCircle, Lightbulb, Sparkles } from 'lucide-react'
import { Button } from '../ui/Button'

interface MessageActionsProps {
  content: string
  onFollowUpClick?: (prompt: string) => void
  showFollowUps?: boolean
}

export function MessageActions({
  content,
  onFollowUpClick,
  showFollowUps = true,
}: MessageActionsProps) {
  const [copied, setCopied] = useState(false)

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(content)
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    } catch {
      // Fallback
      setCopied(false)
    }
  }

  return (
    <div className="message-actions-wrapper">
      <div className="message-utility-actions">
        <button
          type="button"
          onClick={handleCopy}
          className="msg-action-btn"
          aria-label={copied ? 'Đã sao chép vào bộ nhớ tạm' : 'Sao chép nội dung'}
        >
          {copied ? (
            <>
              <Check size={14} className="text-success" aria-hidden />
              <span>Đã sao chép</span>
            </>
          ) : (
            <>
              <Copy size={14} aria-hidden />
              <span>Sao chép</span>
            </>
          )}
        </button>
      </div>

      {showFollowUps && onFollowUpClick && (
        <div className="message-followups" role="group" aria-label="Gợi ý câu hỏi tiếp theo">
          <Button
            variant="ghost"
            className="followup-btn"
            onClick={() => onFollowUpClick('Giải thích đơn giản và trực quan hơn')}
            icon={Sparkles}
          >
            Giải thích đơn giản hơn
          </Button>

          <Button
            variant="ghost"
            className="followup-btn"
            onClick={() => onFollowUpClick('Cho thêm 1 ví dụ cụ thể về phần này')}
            icon={Lightbulb}
          >
            Ví dụ khác
          </Button>

          <Button
            variant="ghost"
            className="followup-btn"
            onClick={() => onFollowUpClick('Tạo 3 câu hỏi trắc nghiệm kiểm tra phần kiến thức vừa rồi')}
            icon={HelpCircle}
          >
            Tạo 3 câu quiz
          </Button>
        </div>
      )}
    </div>
  )
}

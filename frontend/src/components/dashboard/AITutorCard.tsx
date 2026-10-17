import { Bot, Sparkles } from 'lucide-react'
import { Link } from 'react-router-dom'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'

export interface AITutorCardProps {
  onOpenChat?: () => void
}

export function AITutorCard({ onOpenChat }: AITutorCardProps) {
  return (
    <Card className="ai-tutor-feature-card">
      <div className="ai-tutor-content">
        <div className="ai-tutor-badge-header">
          <Sparkles size={14} className="ai-sparkle-icon" aria-hidden />
          <span className="ai-badge-label">AI Tutor thông minh</span>
        </div>

        <h2 className="ai-tutor-title">Có gì chưa hiểu?</h2>

        <p className="ai-tutor-desc">
          Hỏi AI về bài học khó, yêu cầu giải thích từng bước hoặc tạo đề luyện tập tức thì theo đúng trình độ của bạn.
        </p>

        {/* Suggested quick questions */}
        <div className="ai-quick-prompts">
          <Link to="/ai-tutor?prompt=giai-thich-toan-12" className="ai-prompt-chip">
            Giải thích tiệm cận đứng hàm số
          </Link>
          <Link to="/ai-tutor?prompt=tom-tat-ly-12" className="ai-prompt-chip">
            Tóm tắt công thức con lắc lò xo
          </Link>
        </div>

        <div className="ai-tutor-action-row">
          <Link to="/ai-tutor" className="w-full">
            <Button
              variant="primary"
              icon={Bot}
              fullWidth
              onClick={onOpenChat}
              className="ai-tutor-cta-btn"
            >
              Hỏi AI Tutor ngay
            </Button>
          </Link>
        </div>
      </div>
    </Card>
  )
}

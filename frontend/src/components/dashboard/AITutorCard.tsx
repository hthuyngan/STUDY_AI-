import { Bot, Sparkles } from 'lucide-react'
import { Link } from 'react-router-dom'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { StickerIllustration } from '@/components/ui/StickerIllustration'

export interface AITutorCardProps {
  onOpenChat?: () => void
}

export function AITutorCard({ onOpenChat }: AITutorCardProps) {
  return (
    <Card className="ai-tutor-notebook-card">
      <div className="ai-tutor-notebook-inner">
        <div className="ai-tutor-header-row">
          <div className="ai-badge-chip">
            <Sparkles size={13} className="ai-sparkle-icon" aria-hidden="true" />
            <span>AI Tutor</span>
          </div>

          <StickerIllustration
            name="aiTutor"
            size="lg"
            decorative
            className="ai-character-sticker"
          />
        </div>

        <div className="ai-tutor-body">
          <span className="ai-context-label">Bạn đang gặp khó ở:</span>
          <h3 className="ai-context-topic">Tiệm cận của đồ thị hàm số</h3>
          <p className="ai-tutor-speech">
            Mình có thể giải thích lại từng bước bằng một ví dụ trực quan ngắn gọn để bạn nắm chắc bản chất nhé!
          </p>
        </div>

        <div className="ai-tutor-footer-action">
          <Link
            to="/ai-tutor?prompt=Giai%20thich%20tiem%20can%20do%20thi%20de%20hieu"
            className="w-full"
          >
            <Button
              variant="outline"
              icon={Bot}
              fullWidth
              onClick={onOpenChat}
              className="ai-tutor-ask-btn"
            >
              Hỏi AI Tutor
            </Button>
          </Link>
        </div>
      </div>
    </Card>
  )
}

export default AITutorCard

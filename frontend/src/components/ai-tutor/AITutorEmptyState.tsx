import { Sparkles } from 'lucide-react'
import type { SuggestedPrompt } from '../../types/aiTutor'
import { SUGGESTED_PROMPTS } from '../../data/aiTutor.mock'

interface AITutorEmptyStateProps {
  onSelectPrompt: (prompt: string, subject?: string) => void
}

export function AITutorEmptyState({ onSelectPrompt }: AITutorEmptyStateProps) {
  return (
    <div className="ai-empty-state-root">
      <div className="ai-empty-state-card">
        <div className="ai-empty-badge" aria-hidden>
          <Sparkles size={18} className="text-primary" />
          <span className="font-semibold text-text">AI Tutor</span>
        </div>

        <h2 className="ai-empty-title">Bạn muốn học gì hôm nay?</h2>

        <div className="ai-empty-capabilities">
          <p className="ai-empty-cap-heading">Bạn có thể hỏi bất kỳ bài học nào:</p>
          <ul className="ai-empty-cap-list">
            <li>Giải thích kiến thức khó & bản chất hiện tượng</li>
            <li>Hướng dẫn phương pháp giải bài từng bước</li>
            <li>Tạo bài tập trắc nghiệm luyện tập theo chủ đề</li>
            <li>Tóm tắt nội dung bài học và công thức trọng tâm</li>
          </ul>
        </div>

        <div className="ai-empty-prompts-group">
          <p className="ai-empty-prompts-label">Gợi ý bắt đầu nhanh:</p>
          <div className="ai-empty-prompts-grid" role="group" aria-label="Gợi ý câu hỏi bắt đầu">
            {SUGGESTED_PROMPTS.map((item: SuggestedPrompt) => (
              <button
                key={item.id}
                type="button"
                onClick={() => onSelectPrompt(item.prompt, item.subject)}
                className="ai-empty-prompt-card"
              >
                <span className="ai-empty-prompt-title">{item.title}</span>
                <span className="ai-empty-prompt-subject">{item.subjectLabel}</span>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

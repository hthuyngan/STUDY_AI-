import {
  useEffect,
  useRef,
  useState,
  type ChangeEvent,
  type KeyboardEvent,
  type FormEvent,
} from 'react'
import { ArrowUp, Plus, Square } from 'lucide-react'
import { SUBJECT_OPTIONS } from '../../data/aiTutor.mock'

interface ChatComposerProps {
  onSendMessage: (message: string) => void
  isStreaming: boolean
  onStopStreaming: () => void
  activeSubject: string
  onSelectSubject: (subject: string) => void
  prefilledText?: string
  disabled?: boolean
}

function adjustTextareaHeight(el: HTMLTextAreaElement) {
  el.style.height = 'auto'
  const nextHeight = Math.min(el.scrollHeight, 140) // max ~5-6 lines
  el.style.height = `${Math.max(nextHeight, 44)}px`
}

export function ChatComposer({
  onSendMessage,
  isStreaming,
  onStopStreaming,
  activeSubject,
  onSelectSubject,
  prefilledText = '',
  disabled = false,
}: ChatComposerProps) {
  const [content, setContent] = useState(prefilledText)
  const [prevPrefilledText, setPrevPrefilledText] = useState(prefilledText)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  if (prefilledText !== prevPrefilledText) {
    setPrevPrefilledText(prefilledText)
    if (prefilledText) {
      setContent(prefilledText)
    }
  }

  // Adjust height and focus when prefilledText changes
  useEffect(() => {
    if (prefilledText && textareaRef.current) {
      textareaRef.current.focus()
      adjustTextareaHeight(textareaRef.current)
    }
  }, [prefilledText])

  const handleChange = (e: ChangeEvent<HTMLTextAreaElement>) => {
    setContent(e.target.value)
    adjustTextareaHeight(e.target)
  }

  const handleSubmit = (e?: FormEvent) => {
    if (e) e.preventDefault()
    if (isStreaming) {
      onStopStreaming()
      return
    }
    const trimmed = content.trim()
    if (!trimmed || disabled) return

    onSendMessage(trimmed)
    setContent('')
    if (textareaRef.current) {
      textareaRef.current.style.height = '44px'
      textareaRef.current.focus()
    }
  }

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSubmit()
    }
  }

  const isBlank = !content.trim()

  return (
    <form className="chat-composer-root" onSubmit={handleSubmit}>
      <div className="chat-composer-box">
        <div className="chat-composer-input-row">
          <button
            type="button"
            className="composer-attach-btn"
            aria-label="Đính kèm tài liệu tham khảo (sắp ra mắt)"
            title="Đính kèm tài liệu tham khảo (sắp ra mắt)"
            onClick={() => {
              /* Affordance only */
            }}
          >
            <Plus size={18} aria-hidden />
          </button>

          <textarea
            ref={textareaRef}
            className="composer-textarea"
            rows={1}
            value={content}
            onChange={handleChange}
            onKeyDown={handleKeyDown}
            placeholder="Đặt câu hỏi về bài học của bạn..."
            aria-label="Đặt câu hỏi về bài học"
            disabled={disabled}
          />
        </div>

        <div className="chat-composer-footer">
          <div className="composer-subject-selector">
            <label htmlFor="ai-subject-select" className="sr-only">
              Chọn môn học
            </label>
            <select
              id="ai-subject-select"
              className="composer-select"
              value={activeSubject}
              onChange={(e) => onSelectSubject(e.target.value)}
              disabled={isStreaming}
            >
              {SUBJECT_OPTIONS.map((sub) => (
                <option key={sub.id} value={sub.id}>
                  {sub.name}
                </option>
              ))}
            </select>
          </div>

          <div className="composer-actions-right">
            <span className="composer-hint-key" aria-hidden>
              Nhấn Enter để gửi
            </span>

            {isStreaming ? (
              <button
                type="button"
                className="composer-submit-btn is-streaming"
                onClick={onStopStreaming}
                aria-label="Dừng câu trả lời"
                title="Dừng câu trả lời"
              >
                <Square size={14} className="fill-current" aria-hidden />
              </button>
            ) : (
              <button
                type="submit"
                className="composer-submit-btn"
                disabled={isBlank || disabled}
                aria-label="Gửi câu hỏi"
                title="Gửi câu hỏi (Enter)"
              >
                <ArrowUp size={16} aria-hidden />
              </button>
            )}
          </div>
        </div>
      </div>
    </form>
  )
}

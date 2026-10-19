export function TypingIndicator() {
  return (
    <div
      className="typing-indicator"
      role="status"
      aria-label="AI Tutor đang suy nghĩ..."
    >
      <span className="typing-dot" />
      <span className="typing-dot" />
      <span className="typing-dot" />
      <span className="sr-only">AI Tutor đang chuẩn bị câu trả lời...</span>
    </div>
  )
}

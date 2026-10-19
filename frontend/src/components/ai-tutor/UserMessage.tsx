import type { ChatMessage } from '../../types/aiTutor'

interface UserMessageProps {
  message: ChatMessage
}

export function UserMessage({ message }: UserMessageProps) {
  const formattedTime = new Date(message.createdAt).toLocaleTimeString('vi-VN', {
    hour: '2-digit',
    minute: '2-digit',
  })

  return (
    <article className="user-message-row" aria-label={`Tin nhắn của bạn lúc ${formattedTime}`}>
      <div className="user-message-meta">
        <span className="user-message-author">Bạn</span>
        <time className="user-message-time" dateTime={message.createdAt}>
          {formattedTime}
        </time>
      </div>
      <div className="user-message-bubble">
        <p className="user-message-content">{message.content}</p>
      </div>
    </article>
  )
}

// ============================================================
// AI TUTOR TYPES — STUDY_AI
// ============================================================

export type ChatRole = 'user' | 'assistant' | 'system'

export type MessageStatus = 'sending' | 'streaming' | 'done' | 'error'

export interface ChatMessage {
  id: string
  role: ChatRole
  content: string
  createdAt: string
  status?: MessageStatus
  suggestedActions?: string[]
  subjectContext?: string
}

export interface ChatConversation {
  id: string
  title: string
  subject?: string
  createdAt: string
  updatedAt: string
  messages: ChatMessage[]
}

export interface SendMessagePayload {
  conversationId: string
  message: string
  subject?: string
}

export interface SuggestedPrompt {
  id: string
  title: string
  subject: string
  subjectLabel?: string
  prompt: string
  icon?: string
}

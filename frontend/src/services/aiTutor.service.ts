import type {
  ChatConversation,
  ChatMessage,
  SendMessagePayload,
} from '../types/aiTutor'
import {
  MOCK_CONVERSATIONS,
  MOCK_STREAMING_RESPONSES,
} from '../data/aiTutor.mock'

/**
 * AI Tutor Service
 *
 * Designed to easily switch from in-memory mock streaming to a real backend API:
 * POST /api/chat
 * GET  /api/conversations
 * GET  /api/conversations/:id
 * POST /api/conversations
 */
class AITutorService {
  private conversations: ChatConversation[] = [...MOCK_CONVERSATIONS]

  /**
   * Fetch all conversations for current user
   */
  async getConversations(): Promise<ChatConversation[]> {
    // Simulate brief network delay
    await new Promise((resolve) => setTimeout(resolve, 80))
    return [...this.conversations]
  }

  /**
   * Fetch single conversation by ID
   */
  async getConversationById(id: string): Promise<ChatConversation | null> {
    await new Promise((resolve) => setTimeout(resolve, 60))
    const found = this.conversations.find((c) => c.id === id)
    return found ? { ...found } : null
  }

  /**
   * Create a new blank conversation
   */
  async createConversation(subject?: string, initialTitle?: string): Promise<ChatConversation> {
    const newConv: ChatConversation = {
      id: `conv-${Date.now()}`,
      title: initialTitle || 'Cuộc trò chuyện mới',
      subject: subject || 'all',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      messages: [],
    }
    this.conversations.unshift(newConv)
    return newConv
  }

  /**
   * Update conversation title or metadata
   */
  async updateConversationTitle(id: string, title: string): Promise<void> {
    const conv = this.conversations.find((c) => c.id === id)
    if (conv) {
      conv.title = title
      conv.updatedAt = new Date().toISOString()
    }
  }

  /**
   * Delete a conversation
   */
  async deleteConversation(id: string): Promise<void> {
    this.conversations = this.conversations.filter((c) => c.id !== id)
  }

  /**
   * Send a message and stream assistant chunks.
   *
   * @param payload.conversationId Target conversation ID
   * @param payload.message User message content
   * @param payload.subject Selected subject filter
   * @param onChunk Callback receiving text delta as it streams
   * @param signal AbortSignal to cancel streaming
   * @returns Completed ChatMessage
   */
  async sendMessageStream(
    payload: SendMessagePayload,
    onChunk: (chunk: string) => void,
    signal?: AbortSignal
  ): Promise<ChatMessage> {
    // Error test simulation if prompt is explicitly 'error_test'
    if (payload.message.trim() === 'error_test') {
      await new Promise((resolve) => setTimeout(resolve, 400))
      throw new Error('Lỗi kết nối tới AI Tutor. Vui lòng thử lại.')
    }

    // Determine mock response based on keyword matching
    const promptLower = payload.message.toLowerCase()
    let responseText = MOCK_STREAMING_RESPONSES.default

    if (promptLower.includes('đạo hàm') || promptLower.includes('cực trị') || promptLower.includes('tiếp tuyến') || promptLower.includes('tiệm cận')) {
      responseText = MOCK_STREAMING_RESPONSES.dao_ham
    } else if (promptLower.includes('newton') || promptLower.includes('vật lý') || promptLower.includes('lực') || promptLower.includes('gia tốc')) {
      responseText = MOCK_STREAMING_RESPONSES.newton
    } else if (promptLower.includes('xác suất') || promptLower.includes('tổ hợp') || promptLower.includes('chỉnh hợp')) {
      responseText = MOCK_STREAMING_RESPONSES.xac_suat
    } else if (promptLower.includes('quiz') || promptLower.includes('trắc nghiệm') || promptLower.includes('bài tập')) {
      responseText = MOCK_STREAMING_RESPONSES.quiz
    } else if (promptLower.includes('code') || promptLower.includes('thuật toán') || promptLower.includes('python')) {
      responseText = MOCK_STREAMING_RESPONSES.code_sample
    }

    // Split into chunks for streaming simulation
    const words = responseText.split(' ')
    let accumulated = ''

    for (let i = 0; i < words.length; i++) {
      if (signal?.aborted) {
        throw new DOMException('Aborted by user', 'AbortError')
      }

      const wordWithSpace = i === 0 ? words[i] : ' ' + words[i]
      accumulated += wordWithSpace
      onChunk(accumulated)

      // Random delay between 15ms and 35ms for natural reading feel
      const delay = Math.floor(Math.random() * 20) + 15
      await new Promise((resolve) => setTimeout(resolve, delay))
    }

    const completedMessage: ChatMessage = {
      id: `msg-${Date.now()}`,
      role: 'assistant',
      content: accumulated,
      createdAt: new Date().toISOString(),
      status: 'done',
    }

    return completedMessage
  }
}

export const aiTutorService = new AITutorService()

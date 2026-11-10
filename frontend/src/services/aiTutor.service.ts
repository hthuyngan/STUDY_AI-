import type {
  ChatConversation,
  ChatMessage,
  ChatRole,
  LearningAssistanceMode,
  MessageStatus,
  SendMessagePayload,
  TutorLearningContext,
} from '../types/aiTutor'
import {
  MOCK_CONVERSATIONS,
  MOCK_STREAMING_RESPONSES,
} from '../data/aiTutor.mock'
import { getStorageKey } from '@/repositories/storageKeys'
import { apiClient } from '@/lib/apiClient'
import { getAccessToken } from '@/auth/authSession'

export const LEGACY_AI_CONVERSATIONS_KEY = 'study_ai.ai_conversations.v1'

function mapConversationDetailToChatConversation(dto: any): ChatConversation {
  return {
    id: dto.id,
    title: dto.title,
    subject: dto.subject || 'all',
    createdAt: dto.createdAt,
    updatedAt: dto.updatedAt,
    learningContext: dto.learningContextJson ? JSON.parse(dto.learningContextJson) : undefined,
    assistanceMode: (dto.assistanceMode as LearningAssistanceMode) || 'explain',
    messages: (dto.messages || []).map((m: any) => ({
      id: m.id,
      role: m.role as ChatRole,
      content: m.content,
      createdAt: m.createdAt,
      status: 'done' as MessageStatus,
      suggestedActions: m.suggestedActionsJson ? JSON.parse(m.suggestedActionsJson) : [],
      learningContextSnapshot: m.learningContextSnapshotJson
        ? JSON.parse(m.learningContextSnapshotJson)
        : undefined,
      assistanceMode: m.assistanceMode as LearningAssistanceMode,
    })),
  }
}

class AITutorService {
  private inMemoryCache: ChatConversation[] | null = null

  /**
   * Check if user is authenticated with backend
   */
  isAuthenticated(): boolean {
    return Boolean(getAccessToken())
  }

  /**
   * Resolve storage key for conversations
   */
  private getStorageKeyName(): string {
    if (typeof window === 'undefined') return LEGACY_AI_CONVERSATIONS_KEY
    try {
      return getStorageKey('ai_conversations')
    } catch {
      return LEGACY_AI_CONVERSATIONS_KEY
    }
  }

  /**
   * Load conversations from persistent storage with fallback to mock data (demo/unauthenticated mode)
   */
  private loadFromStorage(): ChatConversation[] {
    if (typeof window === 'undefined') return JSON.parse(JSON.stringify(MOCK_CONVERSATIONS))
    try {
      const key = this.getStorageKeyName()
      const raw = localStorage.getItem(key) || localStorage.getItem(LEGACY_AI_CONVERSATIONS_KEY)
      if (raw) {
        const parsed = JSON.parse(raw)
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed
        }
      }
    } catch (err) {
      console.warn('Failed to parse saved conversations, resetting to default:', err)
    }

    const defaultList = JSON.parse(JSON.stringify(MOCK_CONVERSATIONS))
    this.saveToStorage(defaultList)
    return defaultList
  }

  /**
   * Persist conversations to localStorage (demo/unauthenticated mode)
   */
  private saveToStorage(list: ChatConversation[]): void {
    if (typeof window === 'undefined') return
    try {
      const key = this.getStorageKeyName()
      const json = JSON.stringify(list)
      localStorage.setItem(key, json)
      localStorage.setItem(LEGACY_AI_CONVERSATIONS_KEY, json)
    } catch {
      // Ignore private browsing quota issues
    }
  }

  /**
   * Fetch all conversations for current user
   */
  async getConversations(): Promise<ChatConversation[]> {
    if (this.isAuthenticated()) {
      try {
        const list = await apiClient.get<any[]>('/api/v1/ai/conversations')
        return (list || []).map((dto) => ({
          id: dto.id,
          title: dto.title,
          subject: dto.subject || 'all',
          createdAt: dto.createdAt,
          updatedAt: dto.updatedAt,
          learningContext: dto.learningContextJson ? JSON.parse(dto.learningContextJson) : undefined,
          assistanceMode: (dto.assistanceMode as LearningAssistanceMode) || 'explain',
          messages: [],
        }))
      } catch (err) {
        console.error('Failed to load conversations from backend:', err)
        throw err
      }
    }

    if (!this.inMemoryCache) {
      this.inMemoryCache = this.loadFromStorage()
    }
    await new Promise((resolve) => setTimeout(resolve, 60))
    return [...this.inMemoryCache]
  }

  /**
   * Fetch single conversation by ID
   */
  async getConversationById(id: string): Promise<ChatConversation | null> {
    if (this.isAuthenticated()) {
      try {
        const dto = await apiClient.get<any>(`/api/v1/ai/conversations/${id}`)
        return dto ? mapConversationDetailToChatConversation(dto) : null
      } catch (err: any) {
        if (err?.status === 404) return null
        throw err
      }
    }

    const list = await this.getConversations()
    const found = list.find((c) => c.id === id)
    return found ? JSON.parse(JSON.stringify(found)) : null
  }

  /**
   * Create a new blank or contextual conversation
   */
  async createConversation(
    subject?: string,
    initialTitle?: string,
    context?: TutorLearningContext,
    mode?: LearningAssistanceMode
  ): Promise<ChatConversation> {
    if (this.isAuthenticated()) {
      const dto = await apiClient.post<any>('/api/v1/ai/conversations', {
        subject: subject || context?.subjectId || 'all',
        title: initialTitle,
        lessonId: context?.lessonId,
        assistanceMode: mode || 'explain',
        learningContextJson: context ? JSON.stringify(context) : null,
      })
      return mapConversationDetailToChatConversation(dto)
    }

    const list = await this.getConversations()
    const title =
      initialTitle ||
      (context?.title ? `${context.title.slice(0, 32)}...` : 'Cuộc trò chuyện mới')

    const newConv: ChatConversation = {
      id: `conv-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      title,
      subject: subject || context?.subjectId || 'all',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      messages: [],
      learningContext: context,
      assistanceMode: mode || 'explain',
    }

    list.unshift(newConv)
    this.inMemoryCache = list
    this.saveToStorage(list)
    return newConv
  }

  /**
   * Update conversation title
   */
  async updateConversationTitle(id: string, title: string): Promise<void> {
    if (this.isAuthenticated()) {
      await apiClient.patch(`/api/v1/ai/conversations/${id}`, { title })
      return
    }

    const list = await this.getConversations()
    const conv = list.find((c) => c.id === id)
    if (conv) {
      conv.title = title
      conv.updatedAt = new Date().toISOString()
      this.inMemoryCache = list
      this.saveToStorage(list)
    }
  }

  /**
   * Delete a conversation
   */
  async deleteConversation(id: string): Promise<void> {
    if (this.isAuthenticated()) {
      await apiClient.delete(`/api/v1/ai/conversations/${id}`)
      return
    }

    const list = await this.getConversations()
    const filtered = list.filter((c) => c.id !== id)
    this.inMemoryCache = filtered
    this.saveToStorage(filtered)
  }

  /**
   * Append a message to conversation in demo storage
   */
  async appendMessage(conversationId: string, message: ChatMessage): Promise<void> {
    if (this.isAuthenticated()) {
      // In authenticated mode, messages are persisted by the backend SendMessage endpoint
      return
    }

    const list = await this.getConversations()
    const conv = list.find((c) => c.id === conversationId)
    if (conv) {
      conv.messages.push(message)
      conv.updatedAt = new Date().toISOString()
      this.inMemoryCache = list
      this.saveToStorage(list)
    }
  }

  /**
   * Craft pedagogical mock response with LaTeX and mode awareness (for demo mode / standalone tests)
   */
  generateMockResponse(
    message: string,
    context?: TutorLearningContext,
    mode: LearningAssistanceMode = 'explain'
  ): { text: string; suggestedActions: string[] } {
    const promptLower = message.toLowerCase()
    const demoNotice = '> **[Bản mô phỏng AI Tutor · Trải nghiệm học tập có ngữ cảnh]**\n\n'

    if (context?.source === 'assessment-question') {
      const qPrompt = context.questionPrompt || context.title
      const correct = context.correctAnswer || 'Đáp án chính xác'
      const selected = context.selectedAnswer || 'Đáp án đã chọn'

      if (mode === 'hint') {
        return {
          text: `${demoNotice}### 🔍 Gợi ý tư duy cho câu hỏi:
"${qPrompt}"

1. **Nhận diện dạng toán:** Hãy quan sát kỹ cấu trúc hàm số hoặc hiện tượng vật lý đang xét.
2. **Quy tắc cốt lõi:** Chú ý công thức đạo hàm hàm hợp $\\left(u^n\\right)' = n \\cdot u^{n-1} \\cdot u'$.
3. **Bẫy thường gặp:** Em chọn **${selected}** có thể do quên nhân với đạo hàm của biểu thức bên trong $u'(x)$.

> **Thử lại:** Hãy tính riêng $u'(x)$ trước, sau đó nhân với phần ngoài để tìm ra đáp án đúng!`,
          suggestedActions: [
            'Xem hướng dẫn giải từng bước',
            'Giải thích bản chất lý thuyết',
            'Cho bài tập tương tự để làm thử',
          ],
        }
      }

      if (mode === 'step-by-step') {
        return {
          text: `${demoNotice}### 🪜 Hướng dẫn giải chi tiết từng bước:
**Đề bài:** "${qPrompt}"

- **Bước 1: Phân tích biểu thức**
  Xác định cấu trúc hàm: $y = f(u(x))$.
- **Bước 2: Áp dụng công thức đạo hàm hàm hợp**
  $$\\frac{dy}{dx} = \\frac{df}{du} \\cdot \\frac{du}{dx}$$
  Tính đạo hàm thành phần từng bước một cách cẩn trọng.
- **Bước 3: Rút gọn và đối chiếu**
  So sánh kết quả vừa tính với các phương án đề bài cho.
- **Kết luận:**
  Đáp án đúng là **${correct}**. Em đã chọn **${selected}** do bỏ sót bước nhân hệ số phụ.

${context.explanation ? `\n> **Giải thích chuẩn:** ${context.explanation}` : ''}`,
          suggestedActions: [
            'Cho mình 1 câu trắc nghiệm tương tự',
            'Tóm tắt các công thức đạo hàm hàm hợp',
            'Quay lại bài giảng',
          ],
        }
      }

      return {
        text: `${demoNotice}### 💡 Giải thích bản chất câu hỏi:
"${qPrompt}"

- **Nguyên nhân sai phổ biến:**
  Phương án em chọn là **${selected}**, trong khi đáp án đúng là **${correct}**. Lỗi này rất thường gặp khi người học áp dụng công thức cơ bản cho biến $x$ nhưng quên mất đây là hàm hợp $u(x)$.

- **Công thức trọng tâm cần ghi nhớ:**
  $$(u^\\alpha)' = \\alpha \\cdot u^{\\alpha - 1} \\cdot u'$$
  $$\\sqrt{u}' = \\frac{u'}{2\\sqrt{u}}$$

- **Lời khuyên sư phạm:**
  Mỗi khi gặp biểu thức phức tạp, hãy đóng khung $u = \\dots$ lại, tính $u'$ ra nháp trước khi ghép vào công thức tổng thể.`,
        suggestedActions: [
          'Giải thích thêm về điều kiện áp dụng',
          'Luyện tập câu hỏi tương tự',
          'Quay lại câu hỏi trắc nghiệm',
        ],
      }
    }

    if (mode === 'summarize') {
      return {
        text: `${demoNotice}### 📑 Bảng tóm tắt kiến thức cốt lõi:

| Khái niệm | Công thức / Quy tắc | Điều kiện áp dụng |
| :--- | :--- | :--- |
| **Đạo hàm đa thức** | $(x^n)' = n \\cdot x^{n-1}$ | $n \\in \\mathbb{N}^*$ |
| **Đạo hàm căn thức** | $(\\sqrt{x})' = \\frac{1}{2\\sqrt{x}}$ | $x > 0$ |
| **Đạo hàm hàm hợp** | $(u^n)' = n \\cdot u^{n-1} \\cdot u'$ | $u = u(x)$ khả vi |
| **Cực trị hàm số** | $f'(x_0) = 0$ và $f'(x)$ đổi dấu | $x_0$ thuộc miền xác định |

> **Quy tắc vàng:** Luôn nhân thêm $u'$ khi lấy đạo hàm của bất kỳ biểu thức hàm hợp nào!`,
        suggestedActions: [
          'Giải thích thêm về hàm hợp',
          'Cho bài tập trắc nghiệm',
          'Quay lại bài giảng',
        ],
      }
    }

    if (promptLower.includes('đạo hàm') || promptLower.includes('cực trị') || promptLower.includes('tiếp tuyến')) {
      return {
        text: `${demoNotice}${MOCK_STREAMING_RESPONSES.dao_ham}`,
        suggestedActions: [
          'Giải thích đơn giản hơn',
          'Cho ví dụ bài tập trắc nghiệm',
          'Tạo 3 câu quiz luyện tập',
        ],
      }
    }

    if (promptLower.includes('newton') || promptLower.includes('vật lý') || promptLower.includes('lực')) {
      return {
        text: `${demoNotice}${MOCK_STREAMING_RESPONSES.newton}`,
        suggestedActions: [
          'Cho ví dụ tính lực ma sát',
          'Tóm tắt 3 định luật Newton',
          'Quiz 3 câu kiểm tra',
        ],
      }
    }

    return {
      text: `${demoNotice}${MOCK_STREAMING_RESPONSES.default}`,
      suggestedActions: [
        'Giải thích bản chất lý thuyết',
        'Cho ví dụ bài tập có lời giải',
        'Tóm tắt các công thức cốt lõi',
      ],
    }
  }

  /**
   * Send a message and stream assistant chunks.
   * If authenticated, posts to real backend API with fail-closed error handling.
   * If unauthenticated, uses mock generator for offline/demo usage.
   */
  async sendMessageStream(
    payload: SendMessagePayload,
    onChunk: (chunk: string) => void,
    signal?: AbortSignal
  ): Promise<ChatMessage> {
    if (payload.message.trim() === 'error_test') {
      await new Promise((resolve) => setTimeout(resolve, 80))
      throw new Error('Lỗi kết nối tới AI Tutor. Vui lòng thử lại.')
    }

    const mode = payload.mode || 'explain'
    const context = payload.learningContext

    // 1. Authenticated mode: Connect directly to real backend API
    if (this.isAuthenticated()) {
      let res: any
      try {
        res = await apiClient.post<any>(
          `/api/v1/ai/conversations/${payload.conversationId}/messages`,
          {
            message: payload.message,
            lessonId: context?.lessonId,
            assistanceMode: mode,
            learningContextJson: context ? JSON.stringify(context) : null,
          },
          { signal }
        )
      } catch (err: any) {
        if (signal?.aborted) throw err

        const status = err?.status
        const detail = err?.data?.detail || err?.message

        if (status === 403) {
          throw new Error('Không có quyền truy cập bài học chưa xuất bản (bản nháp).')
        }
        if (status === 504) {
          throw new Error('Yêu cầu AI Tutor vượt quá thời gian chờ (timeout). Vui lòng thử lại.')
        }
        if (status === 502) {
          throw new Error('Lỗi kết nối tới nhà cung cấp mô hình AI (Provider error). Vui lòng thử lại sau.')
        }
        if (status === 503) {
          throw new Error('Chưa cấu hình API Key AI cho hệ thống.')
        }

        throw new Error(detail || 'Không thể tạo câu trả lời từ AI Tutor.')
      }

      const assistantMsgDto = res.assistantMessage
      const fullText = assistantMsgDto.content
      const suggestedActions = res.suggestedActions || []

      // Progressive typing animation
      const words = fullText.split(' ')
      let accumulated = ''
      for (let i = 0; i < words.length; i++) {
        if (signal?.aborted) {
          throw new DOMException('Aborted by user', 'AbortError')
        }
        accumulated += (i === 0 ? words[i] : ' ' + words[i])
        onChunk(accumulated)
        if (words.length > 1) {
          await new Promise((resolve) => setTimeout(resolve, 6))
        }
      }

      return {
        id: assistantMsgDto.id,
        role: 'assistant',
        content: fullText,
        createdAt: assistantMsgDto.createdAt,
        status: 'done',
        suggestedActions,
        learningContextSnapshot: context,
        assistanceMode: mode,
      }
    }

    // 2. Unauthenticated demo fallback (for tests without auth token or demo mode)
    const { text, suggestedActions } = this.generateMockResponse(payload.message, context, mode)
    const words = text.split(' ')
    let accumulated = ''

    for (let i = 0; i < words.length; i++) {
      if (signal?.aborted) {
        throw new DOMException('Aborted by user', 'AbortError')
      }
      const wordWithSpace = i === 0 ? words[i] : ' ' + words[i]
      accumulated += wordWithSpace
      onChunk(accumulated)
      const delay = Math.floor(Math.random() * 8) + 4
      await new Promise((resolve) => setTimeout(resolve, delay))
    }

    const completedMessage: ChatMessage = {
      id: `msg-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      role: 'assistant',
      content: accumulated,
      createdAt: new Date().toISOString(),
      status: 'done',
      suggestedActions,
      learningContextSnapshot: context,
      assistanceMode: mode,
    }

    await this.appendMessage(payload.conversationId, completedMessage)
    return completedMessage
  }
}

export const aiTutorService = new AITutorService()

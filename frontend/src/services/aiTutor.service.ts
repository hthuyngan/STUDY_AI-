import type {
  ChatConversation,
  ChatMessage,
  LearningAssistanceMode,
  SendMessagePayload,
  TutorLearningContext,
} from '../types/aiTutor'
import {
  MOCK_CONVERSATIONS,
  MOCK_STREAMING_RESPONSES,
} from '../data/aiTutor.mock'
import { getStorageKey } from '@/repositories/storageKeys'

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || ''
export const LEGACY_AI_CONVERSATIONS_KEY = 'study_ai.ai_conversations.v1'

class AITutorService {
  private inMemoryCache: ChatConversation[] | null = null

  /**
   * Check if remote AI backend is configured
   */
  isRemoteBackendConfigured(): boolean {
    return Boolean(API_BASE_URL)
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
   * Load conversations from persistent storage with fallback to mock data
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
   * Persist conversations to localStorage
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
    if (this.isRemoteBackendConfigured()) {
      try {
        const res = await fetch(`${API_BASE_URL}/api/conversations`)
        if (res.ok) {
          return await res.json()
        }
      } catch (err) {
        console.warn('Backend unavailable, falling back to local conversations:', err)
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
   * Update conversation title or metadata
   */
  async updateConversationTitle(id: string, title: string): Promise<void> {
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
    const list = await this.getConversations()
    const filtered = list.filter((c) => c.id !== id)
    this.inMemoryCache = filtered
    this.saveToStorage(filtered)
  }

  /**
   * Append a message to conversation and persist
   */
  async appendMessage(conversationId: string, message: ChatMessage): Promise<void> {
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
   * Craft pedagogical mock response with LaTeX and mode awareness
   */
  generateMockResponse(
    message: string,
    context?: TutorLearningContext,
    mode: LearningAssistanceMode = 'explain'
  ): { text: string; suggestedActions: string[] } {
    const promptLower = message.toLowerCase()
    const demoNotice = '> **[Bản mô phỏng AI Tutor · Trải nghiệm học tập có ngữ cảnh]**\n\n'

    // 1. Context: Wrong Assessment Question
    if (context?.source === 'assessment-question') {
      const qPrompt = context.questionPrompt || context.title
      const correct = context.correctAnswer || 'Đáp án chính xác'
      const selected = context.selectedAnswer || 'Đáp án đã chọn'

      if (mode === 'hint') {
        return {
          text: `${demoNotice}### 🔍 Gợi ý tư duy cho câu hỏi:
"${qPrompt}"

1. **Nhận diện dạng toán:** Hãy quan sát kỹ cấu trúc hàm số hoặc hiện tượng vật lý đang xét.
2. **Quy tắc cốt lõi:** Chú ý công thức đạo hàm hàm hợp $\\left(u^n\\right)' = n \\cdot u^{n-1} \\cdot u'$ hoặc định luật bảo toàn liên quan.
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

      // Default explain
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
          'Cho mình xin gợi ý làm lại',
          'Tạo bài tập vận dụng',
          'Quay lại bài giảng',
        ],
      }
    }

    // 2. Context: Knowledge Gap or Smart Review
    if (context?.source === 'knowledge-gap' || context?.source === 'smart-review') {
      if (mode === 'hint') {
        return {
          text: `${demoNotice}### 🔍 Gợi ý ôn tập cho kiến thức: "${context.title}"

- **Dấu hiệu nhận biết:** Hãy kiểm tra xem phương trình đạo hàm cấp hai $y''(x) = 0$ có nghiệm hay không và có đổi dấu khi đi qua điểm đó hay không.
- **Hệ thức then chốt:**
  $$y'' = 0 \\quad \\text{và} \\quad y''(x) \\text{ đổi dấu qua } x_0$$
- **Chiến lược:** Không cần vội nhớ đáp số, hãy viết biểu thức $y'$ rồi lấy tiếp $y''$ ra giấy nháp nhé!`,
          suggestedActions: [
            'Giải thích từng bước',
            'Cho ví dụ minh họa',
            'Mình đã hiểu, quay lại ôn tiếp',
          ],
        }
      }

      return {
        text: `${demoNotice}### 💡 Củng cố kiến thức: "${context.title}"

${context.excerpt ? `> **Trích dẫn nội dung:** ${context.excerpt}\n\n` : ''}
1. **Khái niệm then chốt:**
   Điểm uốn của đồ thị hàm số là điểm phân chia phần lồi và phần lõm của đồ thị.
2. **Điều kiện cần và đủ:**
   Nếu hàm số có đạo hàm cấp hai liên tục trên khoảng chứa $x_0$, thì:
   $$y''(x_0) = 0 \\quad \\text{và } y''(x) \\text{ đổi dấu khi qua } x_0$$
3. **Ví dụ trực quan:**
   Với hàm số bậc ba $y = ax^3 + bx^2 + cx + d$ ($a \\neq 0$):
   $$y' = 3ax^2 + 2bx + c$$
   $$y'' = 6ax + 2b = 0 \\iff x = -\\frac{b}{3a}$$
   Do $y''$ là nhị thức bậc nhất nên luôn đổi dấu qua $x = -\\frac{b}{3a}$, tức là hàm bậc 3 luôn luôn có duy nhất một điểm uốn!`,
        suggestedActions: [
          'Cho 1 bài tập trắc nghiệm tự luyện',
          'Tóm tắt các dạng bài đồ thị',
          'Quay lại bài giảng',
        ],
      }
    }

    // 3. Assistance Modes: Hint / Step-by-Step / Practice / Summarize
    if (mode === 'hint') {
      return {
        text: `${demoNotice}### 🔍 Gợi ý tư duy (Chưa tiết lộ đáp án ngay):

1. **Bước 1 — Xác định đại lượng đã biết và cần tìm:**
   Hãy viết tóm tắt các thông số của bài toán ra giấy nháp.
2. **Bước 2 — Áp dụng định lý hoặc công thức liên hệ:**
   Xem xét các công thức liên hệ trực tiếp giữa đại lượng đã cho và biến số cần tìm:
   $$x = \\frac{-b \\pm \\sqrt{b^2 - 4ac}}{2a} \\quad \\text{hoặc} \\quad F = m \\cdot a$$
3. **Bước 3 — Kiểm tra điều kiện xác định:**
   Đừng quên xét điều kiện để biểu thức có nghĩa (mẫu khác 0, biểu thức trong căn $\\ge 0$).

> Em hãy thử làm theo gợi ý trên rồi gửi đáp án ra đây để mình kiểm tra giúp nhé!`,
        suggestedActions: [
          'Cho hướng dẫn từng bước',
          'Giải thích rõ hơn công thức',
          'Đưa đáp án và lời giải',
        ],
      }
    }

    if (mode === 'step-by-step') {
      return {
        text: `${demoNotice}### 🪜 Hướng dẫn giải chi tiết từng bước:

- **Bước 1: Tìm tập xác định**
  Hàm số xác định khi và chỉ khi các biểu thức dưới mẫu khác 0 và biểu thức dưới căn bậc hai không âm:
  $$\\mathcal{D} = \\mathbb{R} \\setminus \\{x_0\\}$$

- **Bước 2: Tính đạo hàm bậc nhất**
  Áp dụng quy tắc đạo hàm:
  $$f'(x) = \\lim_{\\Delta x \\to 0} \\frac{f(x + \\Delta x) - f(x)}{\\Delta x}$$

- **Bước 3: Giải phương trình $f'(x) = 0$**
  Tìm các nghiệm $x_1, x_2, \\dots$ thuộc tập xác định $\\mathcal{D}$.

- **Bước 4: Lập bảng biến thiên và kết luận**
  Xét dấu của $f'(x)$ trên từng khoảng để xác định tính đồng biến, nghịch biến và các điểm cực trị.`,
        suggestedActions: [
          'Cho bài tập tương tự để làm thử',
          'Tóm tắt các quy tắc đạo hàm',
          'Hỏi thêm câu hỏi khác',
        ],
      }
    }

    if (mode === 'practice') {
      return {
        text: `${demoNotice}### 📝 Bài tập luyện tập vận dụng:

**Đề bài:** Cho hàm số $y = x^3 - 3x^2 + 2$. Điểm cực đại của đồ thị hàm số có tọa độ là:

- **A.** $(0; 2)$
- **B.** $(2; -2)$
- **C.** $(1; 0)$
- **D.** $(0; 0)$

---
*💡 Hướng dẫn: Hãy tính $y'$, giải $y' = 0$ và lập bảng xét dấu để tìm điểm cực đại trước khi bấm xem lời giải.*`,
        suggestedActions: [
          'Đáp án là phương án A',
          'Cho mình xin gợi ý giải bài này',
          'Xem lời giải chi tiết',
        ],
      }
    }

    if (mode === 'summarize') {
      return {
        text: `${demoNotice}### 📋 Bảng tóm tắt kiến thức cốt lõi:

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

    // Keyword Fallbacks
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

    if (promptLower.includes('xác suất') || promptLower.includes('tổ hợp')) {
      return {
        text: `${demoNotice}${MOCK_STREAMING_RESPONSES.xac_suat}`,
        suggestedActions: [
          'Phân biệt chỉnh hợp và tổ hợp',
          'Công thức xác suất cổ điển',
          'Bài tập có lời giải',
        ],
      }
    }

    if (promptLower.includes('quiz') || promptLower.includes('trắc nghiệm')) {
      return {
        text: `${demoNotice}${MOCK_STREAMING_RESPONSES.quiz}`,
        suggestedActions: [
          'Giải thích chi tiết câu 1',
          'Giải thích chi tiết câu 2',
          'Tạo thêm 3 câu hỏi mới',
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
   */
  async sendMessageStream(
    payload: SendMessagePayload,
    onChunk: (chunk: string) => void,
    signal?: AbortSignal
  ): Promise<ChatMessage> {
    if (payload.message.trim() === 'error_test') {
      await new Promise((resolve) => setTimeout(resolve, 300))
      throw new Error('Lỗi kết nối tới AI Tutor. Vui lòng thử lại.')
    }

    const mode = payload.mode || 'explain'
    const context = payload.learningContext

    // 1. If remote backend configured, attempt streaming
    if (this.isRemoteBackendConfigured()) {
      try {
        const response = await fetch(`${API_BASE_URL}/api/chat`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
          signal,
        })
        if (response.ok && response.body) {
          const reader = response.body.getReader()
          const decoder = new TextDecoder()
          let streamText = ''
          while (true) {
            const { done, value } = await reader.read()
            if (done) break
            const chunk = decoder.decode(value, { stream: true })
            streamText += chunk
            onChunk(streamText)
          }

          const assistantMsg: ChatMessage = {
            id: `msg-${Date.now()}`,
            role: 'assistant',
            content: streamText,
            createdAt: new Date().toISOString(),
            status: 'done',
            learningContextSnapshot: context,
            assistanceMode: mode,
          }
          await this.appendMessage(payload.conversationId, assistantMsg)
          return assistantMsg
        }
      } catch (err) {
        if (signal?.aborted) throw err
        console.warn('Real AI backend unavailable, falling back to simulated streaming:', err)
      }
    }

    // 2. Generate simulated pedagogical response
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

      // Natural streaming cadence
      const delay = Math.floor(Math.random() * 14) + 10
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

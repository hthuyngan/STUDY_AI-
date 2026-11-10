import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { aiTutorService } from './aiTutor.service'
import { setAccessToken, clearAuthSession } from '@/auth/authSession'
import { apiClient, ApiError } from '@/lib/apiClient'

describe('aiTutorService Real API Integration', () => {
  beforeEach(() => {
    localStorage.clear()
    sessionStorage.clear()
    clearAuthSession()
  })

  afterEach(() => {
    clearAuthSession()
    vi.restoreAllMocks()
  })

  it('calls real GET /api/v1/ai/conversations when authenticated', async () => {
    setAccessToken('mock_bearer_token')

    const mockApiConversations = [
      {
        id: 'conv_123',
        userId: 'usr_learner',
        title: 'Hỏi về đạo hàm',
        subject: 'MATH12',
        lessonId: 'les_1',
        assistanceMode: 'explain',
        learningContextJson: null,
        createdAt: '2026-11-10T08:00:00Z',
        updatedAt: '2026-11-10T08:00:00Z',
        messageCount: 2,
      },
    ]

    const getSpy = vi.spyOn(apiClient, 'get').mockResolvedValue(mockApiConversations)

    const list = await aiTutorService.getConversations()

    expect(getSpy).toHaveBeenCalledWith('/api/v1/ai/conversations')
    expect(list.length).toBe(1)
    expect(list[0].id).toBe('conv_123')
    expect(list[0].title).toBe('Hỏi về đạo hàm')
  })

  it('calls real POST /api/v1/ai/conversations when authenticated', async () => {
    setAccessToken('mock_bearer_token')

    const mockCreated = {
      id: 'conv_new_456',
      userId: 'usr_learner',
      title: 'Học tích phân',
      subject: 'MATH12',
      lessonId: null,
      lessonTitle: null,
      assistanceMode: 'step-by-step',
      learningContextJson: null,
      createdAt: '2026-11-10T08:05:00Z',
      updatedAt: '2026-11-10T08:05:00Z',
      messages: [],
    }

    const postSpy = vi.spyOn(apiClient, 'post').mockResolvedValue(mockCreated)

    const result = await aiTutorService.createConversation('MATH12', 'Học tích phân', undefined, 'step-by-step')

    expect(postSpy).toHaveBeenCalledWith('/api/v1/ai/conversations', expect.objectContaining({
      subject: 'MATH12',
      title: 'Học tích phân',
      assistanceMode: 'step-by-step',
    }))
    expect(result.id).toBe('conv_new_456')
    expect(result.title).toBe('Học tích phân')
  })

  it('calls real POST messages and returns assistant message without falling back to mock', async () => {
    setAccessToken('mock_bearer_token')

    const mockSendResponse = {
      userMessage: {
        id: 'msg_u1',
        conversationId: 'conv_123',
        role: 'user',
        content: 'Đạo hàm x^2?',
        suggestedActionsJson: null,
        learningContextSnapshotJson: null,
        assistanceMode: 'explain',
        tokensUsed: 10,
        createdAt: '2026-11-10T08:10:00Z',
      },
      assistantMessage: {
        id: 'msg_a1',
        conversationId: 'conv_123',
        role: 'assistant',
        content: 'Đạo hàm của $x^2$ là $2x$.',
        suggestedActionsJson: JSON.stringify(['Luyện tập', 'Giải thích thêm']),
        learningContextSnapshotJson: null,
        assistanceMode: 'explain',
        tokensUsed: 25,
        createdAt: '2026-11-10T08:10:01Z',
      },
      suggestedActions: ['Luyện tập', 'Giải thích thêm'],
      provider: 'FakeLlmProvider',
      isConfigured: true,
    }

    const postSpy = vi.spyOn(apiClient, 'post').mockResolvedValue(mockSendResponse)

    let streamed = ''
    const msg = await aiTutorService.sendMessageStream(
      {
        conversationId: 'conv_123',
        message: 'Đạo hàm x^2?',
        mode: 'explain',
      },
      (chunk) => {
        streamed = chunk
      }
    )

    expect(postSpy).toHaveBeenCalledWith(
      '/api/v1/ai/conversations/conv_123/messages',
      expect.objectContaining({
        message: 'Đạo hàm x^2?',
        assistanceMode: 'explain',
      }),
      expect.any(Object)
    )

    expect(msg.content).toBe('Đạo hàm của $x^2$ là $2x$.')
    expect(msg.role).toBe('assistant')
    expect(streamed).toContain('2x')
  })

  it('throws descriptive error on 403 Forbidden without fallback to mock', async () => {
    setAccessToken('mock_bearer_token')

    const forbiddenError = new ApiError(403, 'Forbidden', 'FORBIDDEN', {
      detail: 'Không có quyền truy cập bài học chưa xuất bản (bản nháp).',
    })

    vi.spyOn(apiClient, 'post').mockRejectedValue(forbiddenError)

    await expect(
      aiTutorService.sendMessageStream(
        {
          conversationId: 'conv_123',
          message: 'Hỏi bài nháp',
        },
        () => {}
      )
    ).rejects.toThrow('Không có quyền truy cập bài học chưa xuất bản')
  })

  it('throws descriptive error on 504 Timeout without fallback to mock', async () => {
    setAccessToken('mock_bearer_token')

    const timeoutError = new ApiError(504, 'Gateway Timeout', 'TIMEOUT', {
      detail: 'Yêu cầu AI Tutor vượt quá thời gian chờ (timeout).',
    })

    vi.spyOn(apiClient, 'post').mockRejectedValue(timeoutError)

    await expect(
      aiTutorService.sendMessageStream(
        {
          conversationId: 'conv_123',
          message: 'Timeout query',
        },
        () => {}
      )
    ).rejects.toThrow('thời gian chờ (timeout)')
  })

  it('fetches provider status from backend via getProviderStatus()', async () => {
    const mockStatus = {
      provider: 'openai',
      displayName: 'AI thật',
      isReady: true,
      model: 'gpt-4o-mini',
    }

    const getSpy = vi.spyOn(apiClient, 'get').mockResolvedValue(mockStatus)

    const status = await aiTutorService.getProviderStatus()

    expect(getSpy).toHaveBeenCalledWith('/api/v1/ai/status')
    expect(status.provider).toBe('openai')
    expect(status.displayName).toBe('AI thật')
    expect(status.isReady).toBe(true)
    expect(status.model).toBe('gpt-4o-mini')
  })

  it('throws descriptive error on 503 Unconfigured without fallback to mock', async () => {
    setAccessToken('mock_bearer_token')

    const unconfiguredError = new ApiError(503, 'Service Unavailable', 'SERVICE_UNAVAILABLE', {
      detail: 'Dịch vụ AI chưa sẵn sàng: Nhà cung cấp mô hình AI chưa được cấu hình hoặc thiếu API Key.',
    })

    vi.spyOn(apiClient, 'post').mockRejectedValue(unconfiguredError)

    await expect(
      aiTutorService.sendMessageStream(
        {
          conversationId: 'conv_123',
          message: 'Hỏi khi chưa cấu hình',
        },
        () => {}
      )
    ).rejects.toThrow('Dịch vụ AI chưa sẵn sàng')
  })

  it('handles getProviderStatus() failure gracefully with unconfigured fallback', async () => {
    vi.spyOn(apiClient, 'get').mockRejectedValue(new Error('Network error'))

    const status = await aiTutorService.getProviderStatus()

    expect(status.provider).toBe('unconfigured')
    expect(status.displayName).toBe('AI chưa sẵn sàng')
    expect(status.isReady).toBe(false)
  })
})

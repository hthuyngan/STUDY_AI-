import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { MemoryRouter } from 'react-router-dom'
import { AiChatProvider } from '@/context/AiChatContext'
import { FloatingAiChatbot } from '@/components/chat/FloatingAiChatbot'
import { shouldShowFloatingChat } from '@/components/chat/floatingChatUtils'

vi.mock('@/services/aiTutor.service', () => ({
  aiTutorService: {
    isAuthenticated: vi.fn().mockReturnValue(true),
    getProviderStatus: vi.fn().mockResolvedValue({
      provider: 'gemini',
      displayName: 'AI thật (Gemini)',
      isReady: true,
      model: 'gemini-3.5-flash-lite',
    }),
    createConversation: vi.fn().mockResolvedValue({
      id: 'conv-test-123',
      title: 'Cuộc trò chuyện mới',
      messages: [],
    }),
    sendMessageStream: vi.fn().mockImplementation((_payload, onChunk) => {
      onChunk('Chào bạn, ')
      onChunk('đây là gợi ý Toán 12.')
      return Promise.resolve({
        id: 'assistant-test-1',
        role: 'assistant',
        content: 'Chào bạn, đây là gợi ý Toán 12.',
        suggestedActions: ['Giải thích thêm', 'Xem công thức'],
        status: 'done',
      })
    }),
  },
}))

describe('Floating AI Chatbot & Context Suite', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('1. shouldShowFloatingChat correctly filters permitted and forbidden routes', () => {
    // Permitted learner routes
    expect(shouldShowFloatingChat('/dashboard')).toBe(true)
    expect(shouldShowFloatingChat('/subjects')).toBe(true)
    expect(shouldShowFloatingChat('/subjects/math')).toBe(true)
    expect(shouldShowFloatingChat('/subjects/math/lessons/lesson-01')).toBe(true)
    expect(shouldShowFloatingChat('/practice')).toBe(true)
    expect(shouldShowFloatingChat('/practice/session/123')).toBe(true)
    expect(shouldShowFloatingChat('/smart-review')).toBe(true)
    expect(shouldShowFloatingChat('/knowledge-gaps')).toBe(true)

    // Strictly forbidden routes
    expect(shouldShowFloatingChat('/login')).toBe(false)
    expect(shouldShowFloatingChat('/register')).toBe(false)
    expect(shouldShowFloatingChat('/admin')).toBe(false)
    expect(shouldShowFloatingChat('/admin/users')).toBe(false)
    expect(shouldShowFloatingChat('/settings')).toBe(false)
    expect(shouldShowFloatingChat('/quiz/active-exam-1')).toBe(false)
  })

  it('2. Renders single floating launcher with status dot and opens panel on click', async () => {
    render(
      <MemoryRouter initialEntries={['/subjects/math']}>
        <AiChatProvider>
          <FloatingAiChatbot />
        </AiChatProvider>
      </MemoryRouter>
    )

    const launcherBtn = screen.getByRole('button', { name: /hỏi ai tutor/i })
    expect(launcherBtn).toBeInTheDocument()

    // Panel is closed initially
    expect(screen.queryByRole('complementary', { name: /cửa sổ trò chuyện ai tutor/i })).not.toBeInTheDocument()

    // Click to open panel
    fireEvent.click(launcherBtn)

    await waitFor(() => {
      expect(screen.getByRole('complementary', { name: /cửa sổ trò chuyện ai tutor/i })).toBeInTheDocument()
      expect(screen.getByText('AI Tutor')).toBeInTheDocument()
    })
  })

  it('3. Displays Sẵn sàng hỗ trợ badge when provider is ready and verified', async () => {
    render(
      <MemoryRouter initialEntries={['/subjects/math']}>
        <AiChatProvider>
          <FloatingAiChatbot />
        </AiChatProvider>
      </MemoryRouter>
    )

    const launcherBtn = screen.getByRole('button', { name: /hỏi ai tutor/i })
    fireEvent.click(launcherBtn)

    await waitFor(() => {
      expect(screen.getByText(/sẵn sàng hỗ trợ/i)).toBeInTheDocument()
    })
  })

  it('4. Allows student to type message, send, receive streamed answer and copy response', async () => {
    render(
      <MemoryRouter initialEntries={['/subjects/math']}>
        <AiChatProvider>
          <FloatingAiChatbot />
        </AiChatProvider>
      </MemoryRouter>
    )

    // Open chat
    fireEvent.click(screen.getByRole('button', { name: /hỏi ai tutor/i }))

    await waitFor(() => {
      expect(screen.getByPlaceholderText(/hỏi ai tutor về bài học/i)).toBeInTheDocument()
    })

    const textarea = screen.getByPlaceholderText(/hỏi ai tutor về bài học/i)
    fireEvent.change(textarea, { target: { value: 'Cho hàm số $y=x^3-3x$. Tìm cực trị.' } })

    const sendBtn = screen.getByRole('button', { name: /gửi câu hỏi/i })
    fireEvent.click(sendBtn)

    await waitFor(() => {
      expect(screen.getByText(/đây là gợi ý Toán 12/i)).toBeInTheDocument()
    })

    // Copy button exists
    const copyBtn = screen.getByTitle(/sao chép câu trả lời/i)
    expect(copyBtn).toBeInTheDocument()
  })

  it('5. Allows minimizing and restoring the chat panel', async () => {
    render(
      <MemoryRouter initialEntries={['/subjects/math']}>
        <AiChatProvider>
          <FloatingAiChatbot />
        </AiChatProvider>
      </MemoryRouter>
    )

    // Open chat
    fireEvent.click(screen.getByRole('button', { name: /hỏi ai tutor/i }))

    const minimizeBtn = await screen.findByTitle('Thu nhỏ')
    fireEvent.click(minimizeBtn)

    // Shows minimized bar
    expect(screen.getByText('AI Tutor đang mở')).toBeInTheDocument()

    // Restore
    fireEvent.click(screen.getByText('AI Tutor đang mở'))
    expect(screen.getByRole('complementary', { name: /cửa sổ trò chuyện ai tutor/i })).toBeInTheDocument()
  })

  it('6. Does not render floating chatbot on forbidden routes like /login or /quiz', () => {
    const { unmount } = render(
      <MemoryRouter initialEntries={['/login']}>
        <AiChatProvider>
          <FloatingAiChatbot />
        </AiChatProvider>
      </MemoryRouter>
    )

    expect(screen.queryByRole('button', { name: /hỏi ai tutor/i })).not.toBeInTheDocument()
    unmount()

    render(
      <MemoryRouter initialEntries={['/quiz/active-test-1']}>
        <AiChatProvider>
          <FloatingAiChatbot />
        </AiChatProvider>
      </MemoryRouter>
    )

    expect(screen.queryByRole('button', { name: /hỏi ai tutor/i })).not.toBeInTheDocument()
  })
})


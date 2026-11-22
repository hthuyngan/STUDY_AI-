import { useEffect } from 'react'
import { describe, expect, it, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import { LessonPage } from '@/pages/Lesson/LessonPage'
import { AiChatProvider } from '@/context/AiChatContext'
import { useAiChat } from '@/context/useAiChat'
import { Sidebar } from '@/components/layout/Sidebar'
import { MobileBottomNav } from '@/components/layout/MobileBottomNav'

// Mock useAuth
vi.mock('@/auth/useAuth', () => ({
  useAuth: () => ({
    user: { id: 'usr_student1', email: 'student@studyai.vn', displayName: 'Học sinh', role: 'learner' },
    isAuthenticated: true,
    role: 'learner',
    logout: vi.fn(),
  }),
}))

const MOCK_LESSON = {
  id: 'les_math12_c1_b1',
  title: 'Tính đơn điệu và cực trị của hàm số',
  chapterTitle: 'Chương 1: Ứng dụng đạo hàm để khảo sát và vẽ đồ thị của hàm số',
  subjectName: 'Toán học',
  durationMinutes: 45,
  xp: 50,
  previousLessonId: 'les_math12_intro',
  nextLessonId: 'les_math12_c1_b2',
  learningObjectives: ['Hiểu rõ định lý về tính đơn điệu', 'Biết cách lập bảng biến thiên'],
  skills: [{ skillCode: 'NL_TOAN_01', skillName: 'Tư duy và lập luận toán học', level: 'core' }],
  content: {
    introduction: 'Đạo hàm là công cụ toán học nền tảng để khảo sát sự biến thiên của hàm số.',
    summaryPoints: ['Hàm số đồng biến khi đạo hàm dương', 'Hàm số nghịch biến khi đạo hàm âm'],
    definitions: [{ term: 'Hàm số đồng biến', content: 'Hàm số đồng biến trên K nếu với mọi x1 < x2 thì f(x1) < f(x2).' }],
    formulas: [{ id: 'f1', name: 'Định lý đồng biến', latex: "f'(x) \\ge 0 \\quad \\forall x \\in K" }],
  },
  videos: [
    {
      id: 'vid1',
      title: 'Bài giảng Đạo hàm và Tính đơn điệu',
      provider: 'youtube',
      sourceUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
      youTubeVideoId: 'dQw4w9WgXcQ',
      durationSeconds: 900,
    },
  ],
  video: {
    hasVideo: true,
    youtubeId: 'dQw4w9WgXcQ',
    durationSeconds: 900,
  },
}

// Mock useLesson to supply a Math 12 lesson
vi.mock('@/hooks/useLesson', () => ({
  useLesson: () => ({
    lesson: MOCK_LESSON,
    outline: [],
    isLoading: false,
    error: null,
    isBookmarked: false,
    toggleBookmark: vi.fn(),
    reload: vi.fn(),
  }),
}))

// Mock curriculumService
vi.mock('@/services/curriculum.service', () => ({
  curriculumService: {
    getLessonQuestions: vi.fn().mockResolvedValue([
      {
        id: 'q1',
        prompt: 'Hàm số $y = x^3 - 3x$ đồng biến trên khoảng nào?',
        options: ['A. $(-\\infty; -1)$', 'B. $(-1; 1)$', 'C. $(0; 2)$', 'D. $(-\\infty; +\\infty)$'],
      },
    ]),
  },
}))

// Mock aiTutorService to eliminate TCP socket timeouts on /api/v1/ai/status
vi.mock('@/services/aiTutor.service', () => ({
  aiTutorService: {
    getProviderStatus: vi.fn().mockResolvedValue({
      provider: 'openai',
      displayName: 'OpenAI GPT-4o-mini',
      isReady: true,
      model: 'gpt-4o-mini',
    }),
    getLessonAiContext: vi.fn().mockResolvedValue({
      lessonId: 'les_math12_c1_b1',
      title: 'Tính đơn điệu và cực trị của hàm số',
      subjectName: 'Toán học',
      grade: '12',
      chapterTitle: 'Chương 1',
      learningObjectives: ['Hiểu rõ định lý về tính đơn điệu'],
      keyDefinitions: [],
      keyFormulas: [],
      contentSummary: 'Tóm tắt bài học',
      videoMetadata: [],
      hasTranscript: true,
    }),
  },
}))

// Mock LessonVideoPlayer to prevent happy-dom iframe network fetch stall
vi.mock('@/components/lesson/LessonVideoPlayer', () => ({
  LessonVideoPlayer: () => (
    <div className="lesson-video-player-mock">
      <span>Video bài giảng</span>
    </div>
  ),
}))

describe('Redesigned Lesson Page & Context-Aware AI Tutor Suite', () => {
  it('renders the clean vertical sequence without notes toolbar or duplicate AI buttons', () => {
    const { container } = render(
      <MemoryRouter initialEntries={['/subjects/math/lessons/les_math12_c1_b1']}>
        <AiChatProvider>
          <LessonPage />
        </AiChatProvider>
      </MemoryRouter>
    )

    // 1. Breadcrumb nhỏ
    expect(screen.getByRole('navigation', { name: /đường dẫn điều hướng/i })).toBeInTheDocument()
    expect(screen.getAllByText('Trang chủ').length).toBeGreaterThan(0)
    expect(screen.getAllByText('Môn học').length).toBeGreaterThan(0)
    expect(screen.getByText('Toán học')).toBeInTheDocument()

    // 2. Tên bài học
    expect(screen.getByRole('heading', { level: 1, name: /Tính đơn điệu và cực trị của hàm số/i })).toBeInTheDocument()
    expect(screen.getByText(/Chương 1: Ứng dụng đạo hàm/i)).toBeInTheDocument()

    // 3. Tiến độ học tập (% tiến độ, XP)
    expect(screen.getByLabelText(/tiến độ học tập/i)).toBeInTheDocument()
    expect(screen.getByText(/\+50 XP/i)).toBeInTheDocument()

    // 4. Video bài giảng duy nhất
    expect(screen.getByRole('region', { name: /video bài giảng/i })).toBeInTheDocument()
    expect(screen.getByText('Video bài giảng')).toBeInTheDocument()

    // 5. Bài tập thu hoạch (collapsible accordion, default collapsed)
    expect(screen.getByRole('region', { name: /bài tập thu hoạch/i })).toBeInTheDocument()
    expect(screen.getByRole('heading', { level: 2, name: /bài tập thu hoạch/i })).toBeInTheDocument()
    expect(screen.getByText('Đánh giá hiểu bài')).toBeInTheDocument()

    // 6. Điều hướng bài trước/bài tiếp theo
    expect(screen.getByRole('navigation', { name: /điều hướng bài trước và bài tiếp theo/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /bài trước/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /bài tiếp theo/i })).toBeInTheDocument()

    // Strict Verification: Notes toolbar & panel MUST be completely removed from Lesson Page
    expect(screen.queryByRole('region', { name: /công cụ ghi chú và lưu bài/i })).toBeNull()
    expect(screen.queryByRole('button', { name: /mở ghi chú cá nhân/i })).toBeNull()
    expect(container.querySelector('.lesson-tools-toolbar')).toBeNull()
    expect(container.querySelector('.lesson-notes-panel')).toBeNull()

    // Strict Verification: Multi-video list grid & duplicate inline "Hỏi AI" buttons MUST NOT exist
    expect(container.querySelector('.lesson-multi-video-list')).toBeNull()
    expect(container.querySelector('.btn-ask-ai-contextual')).toBeNull()

    // Strict Check: Legacy Sidebar, Tab Navigation, and old Accordions MUST NOT exist
    expect(container.querySelector('.lesson-sidebar')).toBeNull()
    expect(screen.queryByRole('tablist')).toBeNull()
    expect(screen.queryByText(/A\. Giới thiệu & Kiến thức trọng tâm/i)).toBeNull()
    expect(screen.queryByText(/B\. Lý thuyết & Công thức/i)).toBeNull()
    expect(screen.queryByText(/C\. Ví dụ & Bài tập mẫu/i)).toBeNull()
  })

  it('toggles "Bài tập thu hoạch" accordion on click without losing attempt state', async () => {
    render(
      <MemoryRouter initialEntries={['/subjects/math/lessons/les_math12_c1_b1']}>
        <AiChatProvider>
          <LessonPage />
        </AiChatProvider>
      </MemoryRouter>
    )

    // Initially collapsed: assessment card questions/buttons are not shown
    expect(screen.queryByText(/Bắt đầu làm bài|đang được biên soạn/i)).toBeNull()

    // Click accordion header to expand
    const accordionHeader = screen.getByRole('button', { name: /bài tập thu hoạch/i })
    fireEvent.click(accordionHeader)

    // Now assessment card is visible
    expect(await screen.findByText(/Bắt đầu làm bài|đang được biên soạn/i)).toBeInTheDocument()

    // Click again to collapse
    fireEvent.click(accordionHeader)
    expect(screen.queryByText(/Bắt đầu làm bài|đang được biên soạn/i)).toBeNull()
  })

  it('synchronizes LessonId context into AI Tutor and supports opening floating chat', async () => {
    let capturedContext: any = null

    function TestChatConsumer() {
      const { learningContext, isOpen, openChat } = useAiChat()
      useEffect(() => {
        capturedContext = learningContext
      }, [learningContext])
      return (
        <div>
          <div data-testid="chat-open-state">{isOpen ? 'OPEN' : 'CLOSED'}</div>
          <button type="button" data-testid="open-chat-btn" onClick={() => openChat()}>
            Mở AI Tutor
          </button>
        </div>
      )
    }

    render(
      <MemoryRouter initialEntries={['/subjects/math/lessons/les_math12_c1_b1']}>
        <AiChatProvider>
          <LessonPage />
          <TestChatConsumer />
        </AiChatProvider>
      </MemoryRouter>
    )

    const { waitFor } = await import('@testing-library/react')

    // Context is synchronized asynchronously from current active lesson
    await waitFor(() => {
      expect(capturedContext?.lessonId).toBe('les_math12_c1_b1')
      expect(capturedContext?.lessonTitle).toBe('Tính đơn điệu và cực trị của hàm số')
    })
    expect(screen.getByTestId('chat-open-state').textContent).toBe('CLOSED')

    // Open chat
    fireEvent.click(screen.getByTestId('open-chat-btn'))
    expect(screen.getByTestId('chat-open-state').textContent).toBe('OPEN')
  })

  it('removes "AI Tutor" link from student Sidebar and MobileBottomNav', () => {
    const { container: sidebarContainer } = render(
      <MemoryRouter>
        <Sidebar mobileOpen={false} onCloseMobile={vi.fn()} />
      </MemoryRouter>
    )

    // Sidebar should have Môn học, Lớp học, Luyện thi, Bài tập, but NOT AI Tutor
    expect(screen.getByText('Môn học')).toBeInTheDocument()
    expect(screen.getByText('Lớp học')).toBeInTheDocument()
    expect(screen.getByText('Luyện thi')).toBeInTheDocument()
    expect(screen.getByText('Bài tập')).toBeInTheDocument()
    expect(sidebarContainer.querySelector('a[href="/ai-tutor"]')).toBeNull()

    const { container: mobileNavContainer } = render(
      <MemoryRouter>
        <MobileBottomNav />
      </MemoryRouter>
    )
    expect(mobileNavContainer.querySelector('a[href="/ai-tutor"]')).toBeNull()
  })

  it('cleanly redirects legacy /ai-tutor route to /subjects without dead links', async () => {
    const { LegacyAiTutorRoutes } = await import('@/routes/legacyRedirectRoutes')
    render(
      <MemoryRouter initialEntries={['/ai-tutor']}>
        <Routes>
          {LegacyAiTutorRoutes()}
          <Route path="/subjects" element={<div data-testid="subjects-page">Trang Môn học</div>} />
        </Routes>
      </MemoryRouter>
    )

    expect(screen.getByTestId('subjects-page')).toBeInTheDocument()
  })
})

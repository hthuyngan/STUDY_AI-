import { describe, expect, it, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { MemoryRouter, Routes } from 'react-router-dom'
import { LessonPage } from '@/pages/Lesson/LessonPage'
import { AiChatProvider, useAiChat } from '@/context/AiChatContext'
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

// Mock useLesson to supply a comprehensive Math 12 lesson
vi.mock('@/hooks/useLesson', () => ({
  useLesson: () => ({
    lesson: {
      id: 'les_math12_c1_b1',
      title: 'Tính đơn điệu và cực trị của hàm số',
      chapterTitle: 'Chương 1: Ứng dụng đạo hàm để khảo sát và vẽ đồ thị của hàm số',
      subjectName: 'Toán học',
      durationMinutes: 45,
      xp: 50,
      learningObjectives: ['Hiểu rõ định lý về tính đơn điệu', 'Biết cách lập bảng biến thiên'],
      skills: [{ skillCode: 'NL_TOAN_01', skillName: 'Tư duy và lập luận toán học', level: 'core' }],
      content: {
        introduction: 'Đạo hàm là công cụ toán học nền tảng để khảo sát sự biến thiên của hàm số.',
        summaryPoints: ['Hàm số đồng biến khi đạo hàm dương', 'Hàm số nghịch biến khi đạo hàm âm'],
        definitions: [{ term: 'Hàm số đồng biến', content: 'Hàm số đồng biến trên K nếu với mọi x1 < x2 thì f(x1) < f(x2).' }],
        formulas: [{ id: 'f1', name: 'Định lý đồng biến', latex: "f'(x) \\ge 0 \\quad \\forall x \\in K" }],
        variationTables: [
          {
            id: 'vt1',
            title: 'Bảng biến thiên mẫu y = x^3 - 3x',
            columns: [
              { x: '-\\infty', yPrime: '+', y: { value: '-\\infty', position: 'bottom', arrow: 'up' } },
              { x: '-1', yPrime: '0', y: { value: '2', position: 'top', arrow: 'down' } },
              { x: '1', yPrime: '0', y: { value: '-2', position: 'bottom', arrow: 'up' } },
              { x: '+\\infty', yPrime: '+', y: { value: '+\\infty', position: 'top', arrow: 'none' } },
            ],
          },
        ],
        functionGraphs: [{ id: 'fg1', title: 'Đồ thị hàm số bậc ba', functionLatex: 'y = x^3 - 3x' }],
        importantNotes: ['Chú ý dấu bằng chỉ xảy ra tại hữu hạn điểm.'],
        commonMistakes: [{ title: 'Quên xét dấu bằng', description: 'Nhiều bạn quên rằng đạo hàm có thể bằng 0 tại hữu hạn điểm mà hàm vẫn đơn điệu.' }],
        examples: [{ id: 'ex1', title: 'Xét tính đơn điệu hàm số y = 2x^3 - 3x^2', problem: 'Tìm các khoảng đơn điệu của hàm số', solutionSteps: ['Bước 1: TXĐ D = R', 'Bước 2: y\' = 6x^2 - 6x'] }],
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
    },
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

describe('Redesigned Lesson Page & Unified Contextual AI Tutor Suite', () => {
  it('renders exactly two main content areas: Video and Unified Overview Card', () => {
    render(
      <MemoryRouter initialEntries={['/subjects/math/lessons/les_math12_c1_b1']}>
        <AiChatProvider>
          <LessonPage />
        </AiChatProvider>
      </MemoryRouter>
    )

    // Area 1: Video Bài Giảng
    expect(screen.getByRole('region', { name: /video bài giảng/i })).toBeInTheDocument()
    expect(screen.getByText('Video bài giảng')).toBeInTheDocument()

    // Area 2: Tổng Quan Bài Học Card
    expect(screen.getByRole('region', { name: /tổng quan bài học/i })).toBeInTheDocument()

    // Accordion Sections inside Unified Overview
    expect(screen.getByText(/A\. Giới thiệu & Kiến thức trọng tâm/i)).toBeInTheDocument()
    expect(screen.getByText(/B\. Lý thuyết & Công thức/i)).toBeInTheDocument()
    expect(screen.getByText(/C\. Ví dụ & Bài tập mẫu/i)).toBeInTheDocument()
    expect(screen.getByText(/D\. Luyện tập thu hoạch/i)).toBeInTheDocument()

    // Strict Check: Legacy Tab Navigation buttons MUST NOT exist
    expect(screen.queryByRole('tablist', { name: /tab/i })).toBeNull()
    expect(screen.queryByText('Tổng quan & Video')).toBeNull()
    expect(screen.queryByText('Lý thuyết & KaTeX')).toBeNull()
  })

  it('provides contextual "Hỏi AI Tutor" button across video and all 4 overview sections', () => {
    render(
      <MemoryRouter initialEntries={['/subjects/math/lessons/les_math12_c1_b1']}>
        <AiChatProvider>
          <LessonPage />
        </AiChatProvider>
      </MemoryRouter>
    )

    const askAiButtons = screen.getAllByRole('button', { name: /Hỏi AI Tutor/i })
    // At least 5 contextual Ask AI triggers (1 in Video, 4 in the 4 accordion headers, plus block triggers)
    expect(askAiButtons.length).toBeGreaterThanOrEqual(5)
  })

  it('triggers FloatingAiChatbot with accurate context and prefilled prompt without auto-sending', () => {
    let capturedContext: any = null
    let capturedPrompt: any = null

    // Helper consumer to verify state
    function TestChatConsumer() {
      const { learningContext, injectedPrompt, isOpen } = useAiChat()
      capturedContext = learningContext
      capturedPrompt = injectedPrompt
      return <div data-testid="chat-open-state">{isOpen ? 'OPEN' : 'CLOSED'}</div>
    }

    render(
      <MemoryRouter initialEntries={['/subjects/math/lessons/les_math12_c1_b1']}>
        <AiChatProvider>
          <LessonPage />
          <TestChatConsumer />
        </AiChatProvider>
      </MemoryRouter>
    )

    expect(screen.getByTestId('chat-open-state').textContent).toBe('CLOSED')

    // Click "Hỏi AI Tutor" on Video header
    const videoAskBtn = screen.getByTitle('Hỏi AI Tutor về nội dung video này')
    fireEvent.click(videoAskBtn)

    expect(screen.getByTestId('chat-open-state').textContent).toBe('OPEN')
    expect(capturedContext?.source).toBe('lesson-video')
    expect(capturedContext?.sectionType).toBe('video')
    expect(capturedPrompt).toBe('Giải thích nội dung video này')

    // Click "Hỏi AI Tutor" on Theory header
    const theoryAskBtn = screen.getByTitle('Hỏi AI Tutor giải thích lý thuyết và công thức')
    fireEvent.click(theoryAskBtn)

    expect(capturedContext?.source).toBe('lesson-theory')
    expect(capturedContext?.sectionType).toBe('theory')
    expect(capturedPrompt).toBe('Giải thích công thức này dễ hiểu hơn')
  })

  it('toggles Accordion sections properly without losing content', () => {
    render(
      <MemoryRouter initialEntries={['/subjects/math/lessons/les_math12_c1_b1']}>
        <AiChatProvider>
          <LessonPage />
        </AiChatProvider>
      </MemoryRouter>
    )

    // Examples section is collapsed by default
    expect(screen.queryByText('Ví dụ mẫu & Phương pháp giải từng bước')).toBeNull()

    // Click to open Examples section
    const examplesHeader = screen.getByText(/C\. Ví dụ & Bài tập mẫu/i)
    fireEvent.click(examplesHeader)

    // Now Examples content is displayed
    expect(screen.getByText('Ví dụ mẫu & Phương pháp giải từng bước')).toBeInTheDocument()
    expect(screen.getByText(/Xét tính đơn điệu hàm số y = 2x\^3 - 3x\^2/i)).toBeInTheDocument()
  })

  it('removes "AI Tutor" item from student Sidebar and MobileBottomNav', () => {
    const { container: sidebarContainer } = render(
      <MemoryRouter>
        <Sidebar collapsed={false} onToggleCollapse={vi.fn()} mobileOpen={false} onCloseMobile={vi.fn()} />
      </MemoryRouter>
    )

    // Sidebar should have Môn học, Luyện tập, Thi thử, Lớp học, but NOT AI Tutor
    expect(screen.getByText('Môn học')).toBeInTheDocument()
    expect(screen.getByText('Luyện tập & Ôn câu sai')).toBeInTheDocument()
    expect(screen.getByText('Thi thử')).toBeInTheDocument()
    expect(screen.getByText('Lớp học & Bài tập')).toBeInTheDocument()
    expect(sidebarContainer.querySelector('a[href="/ai-tutor"]')).toBeNull()

    const { container: mobileNavContainer } = render(
      <MemoryRouter>
        <MobileBottomNav />
      </MemoryRouter>
    )
    expect(mobileNavContainer.querySelector('a[href="/ai-tutor"]')).toBeNull()
  })

  it('cleanly redirects legacy /ai-tutor route to /subjects without dead links', async () => {
    const { LearnerRoutes } = await import('@/routes/learnerRoutes')
    render(
      <MemoryRouter initialEntries={['/ai-tutor']}>
        <Routes>
          {LearnerRoutes()}
        </Routes>
      </MemoryRouter>
    )

    // Should redirect to /subjects and render Subjects page cleanly
    expect(screen.getAllByText(/Môn học/i).length).toBeGreaterThan(0)
  })
})

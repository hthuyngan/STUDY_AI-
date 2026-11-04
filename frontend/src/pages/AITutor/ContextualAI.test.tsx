import { describe, it, expect, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { AssistantMessage } from '@/components/ai-tutor/AssistantMessage'
import { AITutorPage } from './AITutorPage'
import { learningContextService } from '@/services/learningContext.service'
import { aiTutorService } from '@/services/aiTutor.service'
import { learningProgressRepository } from '@/repositories'
import type { TutorLearningContext } from '@/types/aiTutor'

describe('Phase 8: Contextual AI Tutor & Learning Assistance Suite', () => {
  beforeEach(() => {
    localStorage.clear()
    sessionStorage.clear()
    learningContextService.clearContext()
  })

  it('renders contextual banner when learning context is active', async () => {
    const context: TutorLearningContext = {
      source: 'lesson-section',
      subjectId: 'toan-hoc',
      subjectName: 'Toán học',
      lessonId: 'les-math-12-01',
      lessonTitle: 'Đạo hàm và Khảo sát hàm số',
      sectionId: 'definitions',
      sectionTitle: 'Khái niệm và Định nghĩa cơ bản',
      title: 'Khái niệm và Định nghĩa cơ bản',
      excerpt: 'Đạo hàm của hàm số tại điểm x0...',
      returnUrl: '/subjects/toan-hoc/lessons/les-math-12-01',
    }

    learningContextService.setContext(context)

    render(
      <MemoryRouter initialEntries={['/ai-tutor']}>
        <AITutorPage />
      </MemoryRouter>
    )

    expect(screen.getByRole('region', { name: /Ngữ cảnh học tập hiện tại/i })).toBeInTheDocument()
    expect(screen.getByText(/Đoạn bài giảng/i)).toBeInTheDocument()
    expect(screen.getAllByText(/Khái niệm và Định nghĩa cơ bản/i).length).toBeGreaterThan(0)
    expect(screen.getByRole('button', { name: /Quay lại/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Bỏ ngữ cảnh/i })).toBeInTheDocument()
  })

  it('allows dismissing context to return to general conversation', async () => {
    const context: TutorLearningContext = {
      source: 'knowledge-gap',
      title: 'Điểm uốn của đồ thị hàm số bậc 3',
      excerpt: 'y\'\'(x) = 0 và đổi dấu khi qua điểm đó',
    }
    learningContextService.setContext(context)

    render(
      <MemoryRouter initialEntries={['/ai-tutor']}>
        <AITutorPage />
      </MemoryRouter>
    )

    const dismissBtn = screen.getByRole('button', { name: /Bỏ ngữ cảnh/i })
    fireEvent.click(dismissBtn)

    expect(learningContextService.getContext()).toBeNull()
    await waitFor(() => {
      expect(screen.queryByRole('region', { name: /Ngữ cảnh học tập hiện tại/i })).not.toBeInTheDocument()
    })
  })

  it('renders assistance mode selector with all 5 pedagogical modes', async () => {
    render(
      <MemoryRouter initialEntries={['/ai-tutor']}>
        <AITutorPage />
      </MemoryRouter>
    )

    expect(screen.getByRole('radiogroup', { name: /Chọn chế độ hỗ trợ học tập/i })).toBeInTheDocument()
    expect(screen.getByRole('radio', { name: /Giải thích/i })).toBeInTheDocument()
    expect(screen.getByRole('radio', { name: /Gợi ý/i })).toBeInTheDocument()
    expect(screen.getByRole('radio', { name: /Từng bước/i })).toBeInTheDocument()
    expect(screen.getByRole('radio', { name: /Luyện tập/i })).toBeInTheDocument()
    expect(screen.getByRole('radio', { name: /Tóm tắt/i })).toBeInTheDocument()
  })

  it('updates prefilled prompt when switching assistance modes for active context', async () => {
    const context: TutorLearningContext = {
      source: 'assessment-question',
      title: 'Đạo hàm hàm hợp',
      questionPrompt: 'Tính đạo hàm của (3x + 1)^4',
      selectedAnswer: 'A. 4(3x + 1)^3',
      correctAnswer: 'B. 12(3x + 1)^3',
    }
    learningContextService.setContext(context)

    render(
      <MemoryRouter initialEntries={['/ai-tutor']}>
        <AITutorPage />
      </MemoryRouter>
    )

    const textarea = screen.getByPlaceholderText(/Đặt câu hỏi về bài học của bạn/i) as HTMLTextAreaElement
    expect(textarea.value).toContain('giải thích chi tiết')

    // Switch to Hint mode
    const hintRadio = screen.getByRole('radio', { name: /Gợi ý/i })
    fireEvent.click(hintRadio)
    expect(textarea.value).toContain('gợi ý bước tư duy')

    // Switch to Step-by-Step mode
    const stepRadio = screen.getByRole('radio', { name: /Từng bước/i })
    fireEvent.click(stepRadio)
    expect(textarea.value).toContain('giải từng bước')
  })

  it('renders KaTeX equations without errors and preserves LaTeX syntax', () => {
    const mockMsg = {
      id: 'msg-math-01',
      role: 'assistant' as const,
      content: 'Phương trình bậc 2 có nghiệm là: $$x = \\frac{-b \\pm \\sqrt{b^2 - 4ac}}{2a}$$ với biệt thức $\\Delta = b^2 - 4ac$.',
      createdAt: new Date().toISOString(),
      status: 'done' as const,
    }

    const { container } = render(<AssistantMessage message={mockMsg} />)
    expect(container.querySelector('.ai-math-block-container')).toBeInTheDocument()
    expect(container.querySelector('.ai-inline-math')).toBeInTheDocument()
  })

  it('preserves lesson progress and assessment scores invariants when asking AI', async () => {
    // 1. Initial lesson progress: 80% (reading complete, harvest pending)
    const initialProgress = {
      'les-math-12-01': {
        lessonId: 'les-math-12-01',
        subjectId: 'toan-hoc',
        contentProgress: 80,
        overallProgress: 80,
        completed: false,
        completedSectionIds: ['intro', 'definitions'],
        lastAccessedAt: new Date().toISOString(),
      },
    }
    localStorage.setItem('study_ai.lesson_progress.v1', JSON.stringify(initialProgress))

    // Set context and simulate sending message to AI
    const context: TutorLearningContext = {
      source: 'lesson-section',
      lessonId: 'les-math-12-01',
      subjectId: 'toan-hoc',
      sectionId: 'definitions',
      title: 'Khái niệm đạo hàm',
    }
    learningContextService.setContext(context)

    const conv = await aiTutorService.createConversation('toan-hoc', undefined, context, 'explain')
    await aiTutorService.sendMessageStream(
      {
        conversationId: conv.id,
        message: 'Giải thích cho em khái niệm này',
        learningContext: context,
        mode: 'explain',
      },
      () => {}
    )

    // Verify progress in repository has NOT been mutated
    const repoProgress = learningProgressRepository.getByLessonId('les-math-12-01')
    expect(repoProgress?.overallProgress ?? 80).toBe(80)
    expect(repoProgress?.assessmentStatus ?? 'not-attempted').toBe('not-attempted')
  })
})

import { describe, it, expect, beforeEach } from 'vitest'
import { aiTutorService, LEGACY_AI_CONVERSATIONS_KEY } from './aiTutor.service'
import type { TutorLearningContext } from '@/types/aiTutor'

describe('aiTutorService', () => {
  beforeEach(() => {
    localStorage.clear()
    sessionStorage.clear()
  })

  it('loads default conversations and persists them to localStorage', async () => {
    const list = await aiTutorService.getConversations()
    expect(list.length).toBeGreaterThan(0)
    expect(list[0].id).toBeDefined()
    expect(list[0].messages.length).toBeGreaterThan(0)

    // Check localStorage was written
    const stored = localStorage.getItem(LEGACY_AI_CONVERSATIONS_KEY)
    expect(stored).not.toBeNull()
  })

  it('creates and persists a new contextual conversation', async () => {
    const context: TutorLearningContext = {
      source: 'lesson-section',
      subjectId: 'toan-hoc',
      title: 'Đạo hàm hàm hợp',
      sectionTitle: 'Quy tắc chuỗi',
    }

    const conv = await aiTutorService.createConversation('toan-hoc', undefined, context, 'hint')
    expect(conv.id).toMatch(/^conv-/)
    expect(conv.learningContext?.title).toBe('Đạo hàm hàm hợp')
    expect(conv.assistanceMode).toBe('hint')

    const retrieved = await aiTutorService.getConversationById(conv.id)
    expect(retrieved).not.toBeNull()
    expect(retrieved?.title).toContain('Đạo hàm hàm hợp')
  })

  it('generates hint mode response with demo attribution and no direct answer', () => {
    const context: TutorLearningContext = {
      source: 'assessment-question',
      title: 'Đạo hàm bậc 2',
      questionPrompt: 'Tính đạo hàm cấp hai của y = x^4 - 2x^2 + 1',
      selectedAnswer: 'A. 4x^3 - 4x',
      correctAnswer: 'B. 12x^2 - 4',
    }

    const { text, suggestedActions } = aiTutorService.generateMockResponse(
      'Xin gợi ý',
      context,
      'hint'
    )

    expect(text).toContain('[Bản mô phỏng AI Tutor · Trải nghiệm học tập có ngữ cảnh]')
    expect(text).toContain('Gợi ý tư duy')
    expect(text).toContain('A. 4x^3 - 4x') // references student selected answer
    expect(suggestedActions.length).toBeGreaterThan(0)
  })

  it('generates step-by-step response with LaTeX equations', () => {
    const context: TutorLearningContext = {
      source: 'assessment-question',
      title: 'Tính đạo hàm hàm hợp',
      questionPrompt: 'Đạo hàm của y = (3x + 1)^4',
      correctAnswer: '12(3x + 1)^3',
      selectedAnswer: '4(3x + 1)^3',
    }

    const { text } = aiTutorService.generateMockResponse('Hướng dẫn từng bước', context, 'step-by-step')
    expect(text).toContain('Bước 1')
    expect(text).toContain('Bước 2')
    expect(text).toContain('$$\\frac{dy}{dx}')
  })

  it('generates summarize response with LaTeX table', () => {
    const { text } = aiTutorService.generateMockResponse('Tóm tắt công thức', undefined, 'summarize')
    expect(text).toContain('Bảng tóm tắt kiến thức cốt lõi')
    expect(text).toContain('|')
    expect(text).toContain('$(x^n)\'')
  })

  it('streams message chunks and appends message with context snapshot', async () => {
    const conv = await aiTutorService.createConversation('toan-hoc')
    let accumulated = ''

    const context: TutorLearningContext = {
      source: 'lesson',
      title: 'Đạo hàm đại cương',
    }

    const completed = await aiTutorService.sendMessageStream(
      {
        conversationId: conv.id,
        message: 'Giải thích đạo hàm cực trị',
        learningContext: context,
        mode: 'explain',
      },
      (chunk) => {
        accumulated = chunk
      }
    )

    expect(accumulated.length).toBeGreaterThan(20)
    expect(completed.status).toBe('done')
    expect(completed.learningContextSnapshot?.title).toBe('Đạo hàm đại cương')
    expect(completed.assistanceMode).toBe('explain')

    const updatedConv = await aiTutorService.getConversationById(conv.id)
    expect(updatedConv?.messages.some((m) => m.id === completed.id)).toBe(true)
  })

  it('aborts streaming gracefully when signal is triggered', async () => {
    const conv = await aiTutorService.createConversation('toan-hoc')
    const controller = new AbortController()

    // Trigger abort shortly after start
    setTimeout(() => controller.abort(), 20)

    await expect(
      aiTutorService.sendMessageStream(
        {
          conversationId: conv.id,
          message: 'Lực hấp dẫn Newton',
        },
        () => {},
        controller.signal
      )
    ).rejects.toThrow()
  })
})

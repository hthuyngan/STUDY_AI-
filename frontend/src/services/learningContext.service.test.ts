import { describe, it, expect, beforeEach } from 'vitest'
import {
  learningContextService,
  LEARNING_CONTEXT_STORAGE_KEY,
  ASSISTANCE_MODES,
} from './learningContext.service'
import type { TutorLearningContext } from '@/types/aiTutor'

describe('learningContextService', () => {
  beforeEach(() => {
    sessionStorage.clear()
    localStorage.clear()
  })

  it('validates and stores valid learning context', () => {
    const context: TutorLearningContext = {
      source: 'lesson-section',
      subjectId: 'toan-hoc',
      subjectName: 'Toán học',
      lessonId: 'les-math-12-01',
      lessonTitle: 'Đạo hàm và Khảo sát hàm số',
      sectionId: 'definitions',
      sectionTitle: 'Khái niệm và Định nghĩa cơ bản',
      title: 'Khái niệm và Định nghĩa cơ bản',
      excerpt: 'Đạo hàm của hàm số tại điểm x0 là giới hạn tỉ số số gia hàm số...',
      returnUrl: '/subjects/toan-hoc/lessons/les-math-12-01',
    }

    learningContextService.setContext(context)
    const retrieved = learningContextService.getContext()

    expect(retrieved).not.toBeNull()
    expect(retrieved?.source).toBe('lesson-section')
    expect(retrieved?.subjectId).toBe('toan-hoc')
    expect(retrieved?.sectionTitle).toBe('Khái niệm và Định nghĩa cơ bản')
  })

  it('bounds excerpt length to maximum 250 characters', () => {
    const longExcerpt = 'A'.repeat(500)
    const context: TutorLearningContext = {
      source: 'lesson',
      title: 'Test Long Excerpt',
      excerpt: longExcerpt,
    }

    learningContextService.setContext(context)
    const retrieved = learningContextService.getContext()

    expect(retrieved?.excerpt?.length).toBeLessThanOrEqual(254)
    expect(retrieved?.excerpt?.endsWith('...')).toBe(true)
  })

  it('rejects invalid context gracefully', () => {
    // @ts-expect-error Testing invalid input
    learningContextService.setContext({ source: 'unsupported-source', title: '' })
    expect(learningContextService.getContext()).toBeNull()

    // @ts-expect-error Testing null input
    learningContextService.setContext(null)
    expect(learningContextService.getContext()).toBeNull()
  })

  it('clears active context properly', () => {
    const context: TutorLearningContext = {
      source: 'study-note',
      title: 'Ghi chú điểm uốn',
      excerpt: 'y\'\'(x) = 0 và đổi dấu',
    }
    learningContextService.setContext(context)
    expect(learningContextService.getContext()).not.toBeNull()

    learningContextService.clearContext()
    expect(learningContextService.getContext()).toBeNull()
    expect(sessionStorage.getItem(LEARNING_CONTEXT_STORAGE_KEY)).toBeNull()
  })

  it('builds default prompts tailored to context source and assistance mode', () => {
    const wrongQContext: TutorLearningContext = {
      source: 'assessment-question',
      title: 'Câu 1: Đạo hàm hàm hợp',
      questionPrompt: 'Đạo hàm của (2x + 1)^3 là?',
      selectedAnswer: 'A. 3(2x + 1)^2',
      correctAnswer: 'B. 6(2x + 1)^2',
    }

    const hintPrompt = learningContextService.buildDefaultPrompt(wrongQContext, 'hint')
    expect(hintPrompt).toContain('gợi ý bước tư duy')

    const stepPrompt = learningContextService.buildDefaultPrompt(wrongQContext, 'step-by-step')
    expect(stepPrompt).toContain('giải từng bước')

    const lessonContext: TutorLearningContext = {
      source: 'lesson-section',
      title: 'Quy tắc chuỗi',
      sectionTitle: 'Quy tắc đạo hàm hàm hợp',
    }
    const summarizePrompt = learningContextService.buildDefaultPrompt(lessonContext, 'summarize')
    expect(summarizePrompt).toContain('Tóm tắt')
  })

  it('provides all 5 required educational assistance modes', () => {
    const modeIds = ASSISTANCE_MODES.map((m) => m.id)
    expect(modeIds).toEqual(['explain', 'hint', 'step-by-step', 'practice', 'summarize'])
  })
})

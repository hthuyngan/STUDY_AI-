/**
 * Learning Context Service — STUDY_AI Phase 8
 * Manages active learning context when student bridges from a lesson, assessment,
 * knowledge gap, smart review or study note into the AI Tutor.
 */

import type { LearningAssistanceMode, TutorLearningContext } from '@/types/aiTutor'

export const LEARNING_CONTEXT_STORAGE_KEY = 'study_ai.pending_learning_context.v1'
export const LEARNING_CONTEXT_CHANGED_EVENT = 'study_ai:learning_context_changed'

const MAX_EXCERPT_LENGTH = 250

export const ASSISTANCE_MODES = [
  {
    id: 'explain',
    label: 'Giải thích',
    shortLabel: 'Giải thích',
    description: 'Giải thích bản chất lý thuyết, dễ hiểu và trực quan',
    icon: '💡',
    promptPrefix: 'Hãy giải thích chi tiết và trực quan về:',
  },
  {
    id: 'hint',
    label: 'Gợi ý',
    shortLabel: 'Gợi ý',
    description: 'Chỉ gợi ý bước tư duy tiếp theo, không đưa đáp án ngay',
    icon: '🔍',
    promptPrefix: 'Cho mình xin gợi ý hướng tư duy bước tiếp theo cho:',
  },
  {
    id: 'step-by-step',
    label: 'Từng bước',
    shortLabel: 'Từng bước',
    description: 'Hướng dẫn phương pháp giải tuần tự từng bước với công thức',
    icon: '🪜',
    promptPrefix: 'Hãy hướng dẫn giải chi tiết từng bước cho:',
  },
  {
    id: 'practice',
    label: 'Luyện tập',
    shortLabel: 'Luyện tập',
    description: 'Đề xuất câu hỏi trắc nghiệm tương tự để kiểm tra hiểu bài',
    icon: '📝',
    promptPrefix: 'Tạo giúp mình 1 bài tập trắc nghiệm vận dụng tương tự về:',
  },
  {
    id: 'summarize',
    label: 'Tóm tắt',
    shortLabel: 'Tóm tắt',
    description: 'Tóm tắt các ý chính và công thức cốt lõi',
    icon: '📋',
    promptPrefix: 'Tóm tắt ngắn gọn các công thức và quy tắc cốt lõi của:',
  },
] as const

class LearningContextService {
  /**
   * Validate and sanitize context before storage
   */
  validateContext(raw: unknown): TutorLearningContext | null {
    if (!raw || typeof raw !== 'object') return null
    const obj = raw as Record<string, unknown>

    if (
      typeof obj.source !== 'string' ||
      !['lesson', 'lesson-section', 'assessment-question', 'knowledge-gap', 'study-note', 'smart-review'].includes(
        obj.source
      )
    ) {
      return null
    }

    if (typeof obj.title !== 'string' || !obj.title.trim()) {
      return null
    }

    let excerpt = typeof obj.excerpt === 'string' ? obj.excerpt.trim() : undefined
    if (excerpt && excerpt.length > MAX_EXCERPT_LENGTH) {
      excerpt = excerpt.slice(0, MAX_EXCERPT_LENGTH) + '...'
    }

    return {
      source: obj.source as TutorLearningContext['source'],
      title: obj.title.trim(),
      excerpt,
      subjectId: typeof obj.subjectId === 'string' ? obj.subjectId : undefined,
      subjectName: typeof obj.subjectName === 'string' ? obj.subjectName : undefined,
      chapterId: typeof obj.chapterId === 'string' ? obj.chapterId : undefined,
      chapterTitle: typeof obj.chapterTitle === 'string' ? obj.chapterTitle : undefined,
      lessonId: typeof obj.lessonId === 'string' ? obj.lessonId : undefined,
      lessonTitle: typeof obj.lessonTitle === 'string' ? obj.lessonTitle : undefined,
      sectionId: typeof obj.sectionId === 'string' ? obj.sectionId : undefined,
      sectionTitle: typeof obj.sectionTitle === 'string' ? obj.sectionTitle : undefined,
      questionId: typeof obj.questionId === 'string' ? obj.questionId : undefined,
      questionPrompt: typeof obj.questionPrompt === 'string' ? obj.questionPrompt : undefined,
      selectedAnswer: typeof obj.selectedAnswer === 'string' ? obj.selectedAnswer : undefined,
      correctAnswer: typeof obj.correctAnswer === 'string' ? obj.correctAnswer : undefined,
      explanation: typeof obj.explanation === 'string' ? obj.explanation : undefined,
      knowledgeGapId: typeof obj.knowledgeGapId === 'string' ? obj.knowledgeGapId : undefined,
      studyNoteId: typeof obj.studyNoteId === 'string' ? obj.studyNoteId : undefined,
      returnUrl: typeof obj.returnUrl === 'string' ? obj.returnUrl : undefined,
    }
  }

  /**
   * Save active learning context to sessionStorage and notify listeners
   */
  setContext(context: TutorLearningContext): void {
    if (typeof window === 'undefined') return
    const sanitized = this.validateContext(context)
    if (!sanitized) return

    try {
      sessionStorage.setItem(LEARNING_CONTEXT_STORAGE_KEY, JSON.stringify(sanitized))
      // Also write to localStorage for cross-tab or navigation resilience
      localStorage.setItem(LEARNING_CONTEXT_STORAGE_KEY, JSON.stringify(sanitized))
      window.dispatchEvent(new CustomEvent(LEARNING_CONTEXT_CHANGED_EVENT, { detail: sanitized }))
    } catch {
      // Ignore private browsing storage quota errors
    }
  }

  /**
   * Retrieve current learning context
   */
  getContext(): TutorLearningContext | null {
    if (typeof window === 'undefined') return null
    try {
      const raw =
        sessionStorage.getItem(LEARNING_CONTEXT_STORAGE_KEY) ||
        localStorage.getItem(LEARNING_CONTEXT_STORAGE_KEY)
      if (!raw) return null
      return this.validateContext(JSON.parse(raw))
    } catch {
      return null
    }
  }

  /**
   * Clear active learning context
   */
  clearContext(): void {
    if (typeof window === 'undefined') return
    try {
      sessionStorage.removeItem(LEARNING_CONTEXT_STORAGE_KEY)
      localStorage.removeItem(LEARNING_CONTEXT_STORAGE_KEY)
      window.dispatchEvent(new CustomEvent(LEARNING_CONTEXT_CHANGED_EVENT, { detail: null }))
    } catch {
      // Ignore
    }
  }

  /**
   * Build an initial suggestion prompt tailored to context and selected assistance mode
   */
  buildDefaultPrompt(context: TutorLearningContext, mode: LearningAssistanceMode = 'explain'): string {
    const config = ASSISTANCE_MODES.find((m) => m.id === mode) || ASSISTANCE_MODES[0]

    switch (context.source) {
      case 'assessment-question':
        if (mode === 'hint') {
          return `Em làm sai câu "${context.title}". Xin AI cho gợi ý bước tư duy để nhận biết dấu hiệu chọn đáp án đúng.`
        }
        if (mode === 'step-by-step') {
          return `Em làm sai câu hỏi: "${context.questionPrompt || context.title}". Em đã chọn: "${context.selectedAnswer || 'đáp án khác'}", nhưng đáp án đúng là "${context.correctAnswer || 'chưa rõ'}". Nhờ AI giải từng bước giúp em.`
        }
        return `Em làm sai câu hỏi: "${context.questionPrompt || context.title}". Nhờ AI giải thích chi tiết phương pháp giải và lưu ý để không mắc lại lỗi này.`

      case 'knowledge-gap':
        if (mode === 'hint') {
          return `Mình đang ôn điểm yếu "${context.title}". Cho mình 1 gợi ý về quy tắc then chốt.`
        }
        if (mode === 'step-by-step') {
          return `Hướng dẫn phương pháp giải từng bước cho dạng kiến thức: ${context.title}.`
        }
        return `Giải thích chi tiết cho mình điểm kiến thức cần củng cố: "${context.title}".`

      case 'smart-review':
        return `Mình đang ôn tập Spaced Repetition về "${context.title}". Cho mình xin gợi ý hướng giải quyết mà chưa lộ đáp án nhé.`

      case 'study-note':
        return `Mình có ghi chú: "${context.excerpt || context.title}". Nhờ AI giải thích sâu hơn và cho ví dụ minh họa.`

      case 'lesson-section':
      case 'lesson':
      default:
        if (mode === 'hint') {
          return `${config.promptPrefix} ${context.sectionTitle || context.title}.`
        }
        if (mode === 'step-by-step') {
          return `Hướng dẫn từng bước cách áp dụng kiến thức trong phần ${context.sectionTitle || context.title}.`
        }
        if (mode === 'summarize') {
          return `Tóm tắt các công thức và ý chính của phần ${context.sectionTitle || context.title}.`
        }
        if (mode === 'practice') {
          return `Tạo 1 bài tập trắc nghiệm vận dụng có đáp án về ${context.sectionTitle || context.title}.`
        }
        return `Nhờ AI giải thích chi tiết nội dung: ${context.sectionTitle || context.title}.`
    }
  }
}

export const learningContextService = new LearningContextService()

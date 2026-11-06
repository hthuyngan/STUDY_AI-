import { mockQuestions } from '@/data/questionBank.data'
import type {
  QuestionBankStats,
  QuestionFilterCriteria,
  QuestionItem,
} from '@/types/questionBank'

const QUESTION_BANK_STORAGE_KEY = 'study_ai_question_bank_v1'

export interface IQuestionBankRepository {
  getAll(): Promise<QuestionItem[]>
  getById(id: string): Promise<QuestionItem | null>
  filter(criteria: QuestionFilterCriteria): Promise<QuestionItem[]>
  getApprovedOnly(criteria?: Omit<QuestionFilterCriteria, 'reviewStatus'>): Promise<QuestionItem[]>
  getStats(): Promise<QuestionBankStats>
  save(item: QuestionItem): Promise<void>
  saveBatch(items: QuestionItem[]): Promise<void>
  resetToDefaults(): Promise<void>
}

export class QuestionBankRepository implements IQuestionBankRepository {
  private inMemoryCache: QuestionItem[] | null = null

  private loadFromStorage(): QuestionItem[] {
    if (this.inMemoryCache) {
      return this.inMemoryCache
    }

    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        const raw = window.localStorage.getItem(QUESTION_BANK_STORAGE_KEY)
        if (raw) {
          const parsed = JSON.parse(raw) as QuestionItem[]
          if (Array.isArray(parsed) && parsed.length > 0) {
            this.inMemoryCache = parsed
            return parsed
          }
        }
      }
    } catch {
      // Fallback to initial mock dataset if localStorage is unavailable
    }

    this.inMemoryCache = [...mockQuestions]
    return this.inMemoryCache
  }

  private persistToStorage(items: QuestionItem[]): void {
    this.inMemoryCache = items
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.setItem(QUESTION_BANK_STORAGE_KEY, JSON.stringify(items))
      }
    } catch {
      // LocalStorage write error fallback
    }
  }

  async getAll(): Promise<QuestionItem[]> {
    return [...this.loadFromStorage()]
  }

  /**
   * Retrieves a question by exact ID.
   * INVARIANT: Never fallbacks to a different question when ID does not exist.
   */
  async getById(id: string): Promise<QuestionItem | null> {
    const items = this.loadFromStorage()
    const found = items.find((q) => q.id === id)
    return found ? { ...found } : null
  }

  async filter(criteria: QuestionFilterCriteria): Promise<QuestionItem[]> {
    const items = this.loadFromStorage()

    return items.filter((q) => {
      if (criteria.subjectId && q.subjectId !== criteria.subjectId) return false
      if (criteria.chapterId && q.chapterId !== criteria.chapterId) return false
      if (criteria.lessonId && q.lessonId !== criteria.lessonId) return false
      if (criteria.skillId && !q.skillIds.includes(criteria.skillId)) return false
      if (criteria.type && q.type !== criteria.type) return false
      if (criteria.difficulty && q.difficulty !== criteria.difficulty) return false
      if (criteria.cognitiveLevel && q.cognitiveLevel !== criteria.cognitiveLevel) return false

      if (criteria.reviewStatus && criteria.reviewStatus !== 'all') {
        if (q.reviewStatus !== criteria.reviewStatus) return false
      }

      if (criteria.search) {
        const query = criteria.search.toLowerCase()
        const matchStem = q.stem.toLowerCase().includes(query)
        const matchId = q.id.toLowerCase().includes(query)
        const matchSkills = q.skillIds.some((s) => s.toLowerCase().includes(query))
        if (!matchStem && !matchId && !matchSkills) return false
      }

      return true
    })
  }

  async getApprovedOnly(
    criteria?: Omit<QuestionFilterCriteria, 'reviewStatus'>
  ): Promise<QuestionItem[]> {
    return this.filter({
      ...criteria,
      reviewStatus: 'approved',
    })
  }

  async getStats(): Promise<QuestionBankStats> {
    const items = this.loadFromStorage()

    const stats: QuestionBankStats = {
      total: items.length,
      approvedCount: 0,
      needsReviewCount: 0,
      draftCount: 0,
      rejectedCount: 0,
      byType: {
        multiple_choice: 0,
        true_false_group: 0,
        short_answer: 0,
      },
      byCognitiveLevel: {
        recognition: 0,
        comprehension: 0,
        application: 0,
        high_application: 0,
      },
    }

    for (const q of items) {
      if (q.reviewStatus === 'approved') stats.approvedCount++
      else if (q.reviewStatus === 'needs_review') stats.needsReviewCount++
      else if (q.reviewStatus === 'draft') stats.draftCount++
      else if (q.reviewStatus === 'rejected') stats.rejectedCount++

      if (stats.byType[q.type] !== undefined) {
        stats.byType[q.type]++
      }
      if (stats.byCognitiveLevel[q.cognitiveLevel] !== undefined) {
        stats.byCognitiveLevel[q.cognitiveLevel]++
      }
    }

    return stats
  }

  async save(item: QuestionItem): Promise<void> {
    const items = this.loadFromStorage()
    const index = items.findIndex((q) => q.id === item.id)

    if (index >= 0) {
      items[index] = item
    } else {
      items.push(item)
    }

    this.persistToStorage(items)
  }

  async saveBatch(newItems: QuestionItem[]): Promise<void> {
    const items = this.loadFromStorage()
    for (const newItem of newItems) {
      const idx = items.findIndex((q) => q.id === newItem.id)
      if (idx >= 0) {
        items[idx] = newItem
      } else {
        items.push(newItem)
      }
    }
    this.persistToStorage(items)
  }

  async resetToDefaults(): Promise<void> {
    this.inMemoryCache = null
    if (typeof window !== 'undefined' && window.localStorage) {
      window.localStorage.removeItem(QUESTION_BANK_STORAGE_KEY)
    }
    this.loadFromStorage()
  }
}

export const questionBankRepository = new QuestionBankRepository()

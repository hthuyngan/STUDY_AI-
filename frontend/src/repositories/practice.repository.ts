import type { PracticeResult, PracticeSession } from '@/types/practice'

const SESSIONS_STORAGE_KEY = 'study_ai_practice_sessions_v1'
const RESULTS_STORAGE_KEY = 'study_ai_practice_results_v1'
const CURRENT_SCHEMA_VERSION = 1

export interface IPracticeRepository {
  // Session management
  getSessionById(sessionId: string): Promise<PracticeSession | null>
  getActiveSession(): Promise<PracticeSession | null>
  saveSession(session: PracticeSession): Promise<void>
  abandonSession(sessionId: string): Promise<void>

  // Result & History management
  getResultById(resultId: string): Promise<PracticeResult | null>
  getResultBySessionId(sessionId: string): Promise<PracticeResult | null>
  saveResult(result: PracticeResult): Promise<void>
  getAllResults(): Promise<PracticeResult[]>

  // Storage maintenance
  clearAll(): Promise<void>
}

export class PracticeRepository implements IPracticeRepository {
  private sessionsCache: PracticeSession[] | null = null
  private resultsCache: PracticeResult[] | null = null

  private getLocalStorage(): Storage | null {
    if (typeof window !== 'undefined' && window.localStorage) {
      return window.localStorage
    }
    return null
  }

  private loadSessions(): PracticeSession[] {
    if (this.sessionsCache) return this.sessionsCache

    const storage = this.getLocalStorage()
    if (!storage) {
      this.sessionsCache = []
      return []
    }

    try {
      const raw = storage.getItem(SESSIONS_STORAGE_KEY)
      if (raw) {
        const parsed = JSON.parse(raw)
        if (Array.isArray(parsed)) {
          // Safe validation: filter out malformed objects
          this.sessionsCache = parsed.filter(
            (s) => s && typeof s.id === 'string' && Array.isArray(s.questionIds)
          )
          return this.sessionsCache
        }
      }
    } catch {
      // Corrupt JSON handled gracefully
    }

    this.sessionsCache = []
    return []
  }

  private persistSessions(sessions: PracticeSession[]): void {
    this.sessionsCache = sessions
    const storage = this.getLocalStorage()
    if (storage) {
      try {
        storage.setItem(SESSIONS_STORAGE_KEY, JSON.stringify(sessions))
      } catch {
        // Storage quota exceeded or disabled
      }
    }
  }

  private loadResults(): PracticeResult[] {
    if (this.resultsCache) return this.resultsCache

    const storage = this.getLocalStorage()
    if (!storage) {
      this.resultsCache = []
      return []
    }

    try {
      const raw = storage.getItem(RESULTS_STORAGE_KEY)
      if (raw) {
        const parsed = JSON.parse(raw)
        if (Array.isArray(parsed)) {
          this.resultsCache = parsed.filter(
            (r) => r && typeof r.id === 'string' && typeof r.sessionId === 'string'
          )
          return this.resultsCache
        }
      }
    } catch {
      // Corrupt JSON handled gracefully
    }

    this.resultsCache = []
    return []
  }

  private persistResults(results: PracticeResult[]): void {
    this.resultsCache = results
    const storage = this.getLocalStorage()
    if (storage) {
      try {
        storage.setItem(RESULTS_STORAGE_KEY, JSON.stringify(results))
      } catch {
        // Storage quota exceeded or disabled
      }
    }
  }

  /* -------------------------------------------------------------------------
   * Session Methods
   * ------------------------------------------------------------------------- */
  async getSessionById(sessionId: string): Promise<PracticeSession | null> {
    const list = this.loadSessions()
    const found = list.find((s) => s.id === sessionId)
    return found ? JSON.parse(JSON.stringify(found)) : null
  }

  async getActiveSession(): Promise<PracticeSession | null> {
    const list = this.loadSessions()
    const found = list.find((s) => s.status === 'in_progress')
    return found ? JSON.parse(JSON.stringify(found)) : null
  }

  async saveSession(session: PracticeSession): Promise<void> {
    const list = this.loadSessions()
    const sessionToSave = {
      ...session,
      updatedAt: new Date().toISOString(),
      schemaVersion: session.schemaVersion || CURRENT_SCHEMA_VERSION,
    }

    const index = list.findIndex((s) => s.id === session.id)
    if (index >= 0) {
      list[index] = sessionToSave
    } else {
      list.push(sessionToSave)
    }

    this.persistSessions(list)
  }

  async abandonSession(sessionId: string): Promise<void> {
    const list = this.loadSessions()
    const index = list.findIndex((s) => s.id === sessionId)
    if (index >= 0) {
      list[index] = {
        ...list[index],
        status: 'abandoned',
        updatedAt: new Date().toISOString(),
      }
      this.persistSessions(list)
    }
  }

  /* -------------------------------------------------------------------------
   * Result & History Methods
   * ------------------------------------------------------------------------- */
  async getResultById(resultId: string): Promise<PracticeResult | null> {
    const list = this.loadResults()
    const found = list.find((r) => r.id === resultId)
    return found ? JSON.parse(JSON.stringify(found)) : null
  }

  async getResultBySessionId(sessionId: string): Promise<PracticeResult | null> {
    const list = this.loadResults()
    const found = list.find((r) => r.sessionId === sessionId)
    return found ? JSON.parse(JSON.stringify(found)) : null
  }

  async saveResult(result: PracticeResult): Promise<void> {
    const list = this.loadResults()
    const index = list.findIndex((r) => r.id === result.id || r.sessionId === result.sessionId)

    if (index >= 0) {
      // Invariant: Do not overwrite previous result silently unless it has the same ID
      list[index] = result
    } else {
      list.push(result)
    }

    this.persistResults(list)
  }

  async getAllResults(): Promise<PracticeResult[]> {
    const list = this.loadResults()
    // Sort descending by submittedAt (newest first)
    return [...list].sort(
      (a, b) => new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime()
    )
  }

  async clearAll(): Promise<void> {
    this.sessionsCache = []
    this.resultsCache = []
    const storage = this.getLocalStorage()
    if (storage) {
      storage.removeItem(SESSIONS_STORAGE_KEY)
      storage.removeItem(RESULTS_STORAGE_KEY)
    }
  }
}

export const practiceRepository = new PracticeRepository()

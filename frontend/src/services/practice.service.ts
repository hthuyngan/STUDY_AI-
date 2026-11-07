import {
  practiceRepository,
  type IPracticeRepository,
} from '@/repositories/practice.repository'
import {
  questionBankRepository,
  type IQuestionBankRepository,
} from '@/repositories/questionBank.repository'
import { evaluatePracticeSession } from './scoringEngine'
import type {
  PracticeResult,
  PracticeSession,
  PracticeSetupConfig,
  StudentAnswer,
} from '@/types/practice'
import type { QuestionItem } from '@/types/questionBank'

export class PracticeService {
  private practiceRepo: IPracticeRepository
  private qbRepo: IQuestionBankRepository

  constructor(
    practiceRepo: IPracticeRepository = practiceRepository,
    qbRepo: IQuestionBankRepository = questionBankRepository
  ) {
    this.practiceRepo = practiceRepo
    this.qbRepo = qbRepo
  }

  /**
   * Helper to create deterministic, reproducible practice sessions
   */
  private generateSessionId(): string {
    if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
      return `sess_${crypto.randomUUID()}`
    }
    return `sess_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`
  }

  /**
   * Step 1: Query approved questions matching setup criteria
   * Invariant: Never picks needs_review questions. No duplicate question IDs.
   */
  async getAvailableQuestions(config: PracticeSetupConfig): Promise<QuestionItem[]> {
    const allApproved = await this.qbRepo.getApprovedOnly({
      subjectId: config.subjectId,
      chapterId: config.chapterId,
      lessonId: config.lessonId,
      type: config.questionType,
      difficulty: config.difficulty,
    })

    if (!config.skillIds || config.skillIds.length === 0) {
      return allApproved
    }

    return allApproved.filter((q) =>
      config.skillIds!.some((sk) => q.skillIds.includes(sk))
    )
  }

  /**
   * Step 2: Initialize a new Practice Session with fixed question IDs
   */
  async startSession(config: PracticeSetupConfig): Promise<PracticeSession> {
    const available = await this.getAvailableQuestions(config)

    if (available.length === 0) {
      throw new Error('Không có câu hỏi đã duyệt (approved) nào phù hợp với bộ lọc đã chọn.')
    }

    // Pick without duplicates up to config.limit
    const selected = available.slice(0, Math.min(config.limit, available.length))
    const questionIds = selected.map((q) => q.id)

    const now = new Date().toISOString()
    const session: PracticeSession = {
      id: this.generateSessionId(),
      mode: config.lessonId ? 'lesson' : config.skillIds?.length ? 'skill' : 'mixed',
      subjectId: config.subjectId,
      chapterId: config.chapterId || 'chap-math-12-01',
      lessonId: config.lessonId,
      selectedSkillIds: config.skillIds || [],
      questionIds,
      status: 'in_progress',
      startedAt: now,
      updatedAt: now,
      answers: {},
      schemaVersion: 1,
    }

    await this.practiceRepo.saveSession(session)
    return session
  }

  /**
   * Step 3: Auto-save a student's answer for a specific question
   * Invariants:
   *  - Does not modify answers if session is already 'submitted' or 'abandoned'.
   *  - Updates timestamp and persists to localStorage.
   */
  async saveAnswer(
    sessionId: string,
    questionId: string,
    answer: StudentAnswer
  ): Promise<PracticeSession> {
    const session = await this.practiceRepo.getSessionById(sessionId)
    if (!session) {
      throw new Error(`Phiên làm bài ${sessionId} không tồn tại.`)
    }

    if (session.status !== 'in_progress') {
      throw new Error(`Không thể sửa câu trả lời cho phiên làm bài đã ${session.status}.`)
    }

    if (!session.questionIds.includes(questionId)) {
      throw new Error(`Câu hỏi ${questionId} không thuộc phiên làm bài này.`)
    }

    session.answers[questionId] = answer
    session.updatedAt = new Date().toISOString()

    await this.practiceRepo.saveSession(session)
    return session
  }

  /**
   * Step 4: Submit session, evaluate scores deterministically, and save result
   * Invariants:
   *  - Cannot submit a session twice (anti double-submit).
   *  - Cannot submit an abandoned session.
   *  - Sets status to 'submitted' and records submittedAt.
   */
  async submitSession(
    sessionId: string,
    skillNameMap: Record<string, string> = {}
  ): Promise<PracticeResult> {
    const session = await this.practiceRepo.getSessionById(sessionId)
    if (!session) {
      throw new Error(`Phiên làm bài ${sessionId} không tồn tại.`)
    }

    if (session.status === 'submitted') {
      // If already submitted, return the existing result to prevent duplicate result creation
      const existing = await this.practiceRepo.getResultBySessionId(sessionId)
      if (existing) return existing
    }

    if (session.status === 'abandoned') {
      throw new Error('Không thể nộp bài cho phiên làm bài đã bị hủy (abandoned).')
    }

    // Retrieve all questions of the session directly from question bank
    const questions: QuestionItem[] = []
    for (const qId of session.questionIds) {
      const q = await this.qbRepo.getById(qId)
      if (!q) {
        throw new Error(`Không tìm thấy câu hỏi ID ${qId} trong ngân hàng dữ liệu.`)
      }
      questions.push(q)
    }

    session.status = 'submitted'
    session.submittedAt = new Date().toISOString()
    session.updatedAt = session.submittedAt

    // Evaluate scoring
    const result = evaluatePracticeSession(session, questions, skillNameMap)
    session.resultId = result.id

    await this.practiceRepo.saveSession(session)
    await this.practiceRepo.saveResult(result)

    return result
  }

  /**
   * Resume active in-progress session if any
   */
  async getActiveSession(): Promise<PracticeSession | null> {
    return this.practiceRepo.getActiveSession()
  }

  async getSessionById(sessionId: string): Promise<PracticeSession | null> {
    return this.practiceRepo.getSessionById(sessionId)
  }

  async getResultById(resultId: string): Promise<PracticeResult | null> {
    return this.practiceRepo.getResultById(resultId)
  }

  async getResultBySessionId(sessionId: string): Promise<PracticeResult | null> {
    return this.practiceRepo.getResultBySessionId(sessionId)
  }

  async getHistory(): Promise<PracticeResult[]> {
    return this.practiceRepo.getAllResults()
  }

  async abandonSession(sessionId: string): Promise<void> {
    await this.practiceRepo.abandonSession(sessionId)
  }
}

export const practiceService = new PracticeService()

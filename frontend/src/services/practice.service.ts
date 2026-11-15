import { apiClient } from '@/lib/apiClient'
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
import type { MultipleChoiceOption, QuestionItem } from '@/types/questionBank'

interface BackendQuestionDto {
  id: string
  prompt: string
  options: string[]
  imageUrl?: string
  difficulty: string
  type: string
  topic?: string
  subjectId?: string
}

interface BackendSessionResponse {
  sessionId: string
  subjectId: string
  chapterId?: string
  lessonId?: string
  mode: string
  questionCount: number
  timeLimitMinutes?: number
  startedAt: string
  expiresAt?: string
  status: string
  questions: BackendQuestionDto[]
  savedAnswers: Record<string, string>
}

interface BackendSubmitResponse {
  resultId: string
  sessionId: string
  subjectId: string
  mode: string
  totalQuestions: number
  correctCount: number
  incorrectCount: number
  unansweredCount: number
  scoreRaw: number
  scoreScaled: number
  passed: boolean
  timeSpentSeconds: number
  completedAt: string
  questions: Array<{
    questionId: string
    prompt: string
    options: string[]
    studentAnswer: string
    correctAnswer: string
    isCorrect: boolean
    explanation?: string
    difficulty: string
  }>
  performanceByDifficulty: Record<string, number>
}

function mapBackendDtoToQuestionItem(dto: BackendQuestionDto, index: number): QuestionItem {
  const letters: Array<'A' | 'B' | 'C' | 'D'> = ['A', 'B', 'C', 'D']
  const rawOptions: string[] = Array.isArray(dto.options) ? dto.options : []

  const options = letters.map((letter, idx) => {
    const raw = rawOptions[idx] || `Lựa chọn ${letter}`
    return {
      id: letter,
      text: raw.replace(/^[A-Da-d][.:)\s]+/, '').trim(),
    }
  }) as [MultipleChoiceOption, MultipleChoiceOption, MultipleChoiceOption, MultipleChoiceOption]

  return {
    id: dto.id || `q_${index}`,
    subjectId: dto.subjectId || 'sub_math12',
    chapterId: 'chap-default',
    lessonId: 'lesson-default',
    skillIds: ['SKILL-GENERAL'],
    type: 'multiple_choice',
    stem: dto.prompt || '',
    difficulty:
      dto.difficulty === 'nhan_biet' || dto.difficulty === 'easy'
        ? 'easy'
        : dto.difficulty === 'van_dung' || dto.difficulty === 'hard'
        ? 'hard'
        : dto.difficulty === 'van_dung_cao' || dto.difficulty === 'very-hard'
        ? 'very_hard'
        : 'medium',
    cognitiveLevel: 'comprehension',
    explanation: '', // Zero-leak placeholder before submit
    reviewStatus: 'approved',
    options,
    correctAnswer: 'A', // Zero-leak placeholder before submit
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }
}

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

  private generateSessionId(): string {
    if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
      return `sess_${crypto.randomUUID()}`
    }
    return `sess_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`
  }

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

  async startSession(config: PracticeSetupConfig): Promise<PracticeSession> {
    // 1. Attempt to create session via real backend API
    try {
      const backendSession = await apiClient.post<BackendSessionResponse>(
        '/api/v1/practice/sessions',
        {
          subjectId: config.subjectId,
          chapterId: config.chapterId,
          lessonId: config.lessonId,
          difficulty: config.difficulty,
          questionCount: config.limit || 10,
          mode: config.mode || (config.lessonId ? 'lesson' : 'practice'),
        }
      )

      if (backendSession && backendSession.questions && backendSession.questions.length > 0) {
        const questionItems = backendSession.questions.map(mapBackendDtoToQuestionItem)
        await this.qbRepo.saveBatch(questionItems)

        const session: PracticeSession = {
          id: backendSession.sessionId,
          mode: config.lessonId ? 'lesson' : config.skillIds?.length ? 'skill' : 'mixed',
          subjectId: backendSession.subjectId,
          chapterId: backendSession.chapterId || config.chapterId || 'chap-math-12-01',
          lessonId: backendSession.lessonId,
          selectedSkillIds: config.skillIds || [],
          questionIds: backendSession.questions.map((q) => q.id),
          status: 'in_progress',
          startedAt: backendSession.startedAt,
          updatedAt: backendSession.startedAt,
          answers: {},
          schemaVersion: 1,
        }

        await this.practiceRepo.saveSession(session)
        return session
      }
    } catch {
      // Fallback to local pure repository if server is unreachable
    }

    // 2. Fallback to local approved repository
    const available = await this.getAvailableQuestions(config)
    if (available.length === 0) {
      throw new Error('Không có câu hỏi đã duyệt (approved) nào phù hợp với bộ lọc đã chọn.')
    }

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

    // Sync answer to backend in background
    let rawAns = ''
    if (answer.questionType === 'multiple_choice') rawAns = answer.selectedOption || ''
    else if (answer.questionType === 'short_answer') rawAns = answer.rawInput || ''
    else rawAns = JSON.stringify(answer)

    apiClient
      .post(`/api/v1/practice/sessions/${sessionId}/answer`, {
        questionId,
        answer: rawAns,
        timeSpentMs: 0,
      })
      .catch(() => {})

    return session
  }

  async submitSession(
    sessionId: string,
    skillNameMap: Record<string, string> = {}
  ): Promise<PracticeResult> {
    const session = await this.practiceRepo.getSessionById(sessionId)
    if (!session) {
      throw new Error(`Phiên làm bài ${sessionId} không tồn tại.`)
    }

    if (session.status === 'submitted') {
      const existing = await this.practiceRepo.getResultBySessionId(sessionId)
      if (existing) return existing
    }

    if (session.status === 'abandoned') {
      throw new Error('Không thể nộp bài cho phiên làm bài đã bị hủy (abandoned).')
    }

    // 1. Try server-side grading via real backend API
    try {
      const answersMap: Record<string, string> = {}
      for (const [qId, ans] of Object.entries(session.answers)) {
        if (ans.questionType === 'multiple_choice') answersMap[qId] = ans.selectedOption || ''
        else if (ans.questionType === 'short_answer') answersMap[qId] = ans.rawInput || ''
        else answersMap[qId] = JSON.stringify(ans)
      }

      const backendResult = await apiClient.post<BackendSubmitResponse>(
        `/api/v1/practice/sessions/${sessionId}/submit`,
        {
          answers: answersMap,
          sessionTimeMs: 0,
        }
      )

      if (backendResult && backendResult.questions) {
        // Update local question bank with revealed explanations & correct answers
        for (const q of backendResult.questions) {
          const existing = await this.qbRepo.getById(q.questionId)
          if (existing) {
            existing.explanation = q.explanation || existing.explanation
            if (existing.type === 'multiple_choice') {
              existing.correctAnswer = (q.correctAnswer as any) || existing.correctAnswer
            }
            await this.qbRepo.save(existing)
          }
        }

        session.status = 'submitted'
        session.submittedAt = backendResult.completedAt
        session.updatedAt = backendResult.completedAt
        session.resultId = backendResult.resultId

        const totalQ = Math.max(1, backendResult.totalQuestions)
        const scorePerQ = 10 / totalQ

        const result: PracticeResult = {
          id: backendResult.resultId,
          sessionId: backendResult.sessionId,
          subjectId: backendResult.subjectId,
          chapterId: session.chapterId,
          lessonId: session.lessonId,
          questionResults: backendResult.questions.map((q) => ({
            questionId: q.questionId,
            questionType: 'multiple_choice' as const,
            difficulty: 'medium' as const,
            cognitiveLevel: 'comprehension' as const,
            skillIds: ['SKILL-GENERAL'],
            stem: q.prompt,
            explanation: q.explanation || '',
            studentAnswer: {
              questionType: 'multiple_choice' as const,
              selectedOption: (q.studentAnswer as any) || null,
            },
            correctAnswerDisplay: q.correctAnswer,
            isFullyCorrect: q.isCorrect,
            isPartiallyCorrect: false,
            isUnanswered: !q.studentAnswer,
            earnedPoints: q.isCorrect ? scorePerQ : 0,
            maxPoints: scorePerQ,
          })),
          totalQuestions: totalQ,
          correctCount: backendResult.correctCount,
          partialCount: 0,
          incorrectCount: backendResult.incorrectCount,
          unansweredCount: backendResult.unansweredCount,
          earnedPoints: backendResult.scoreScaled,
          maxPoints: 10,
          percentage: Math.round((backendResult.correctCount / totalQ) * 100),
          startedAt: session.startedAt,
          submittedAt: backendResult.completedAt,
          durationSeconds: backendResult.timeSpentSeconds,
          skillBreakdown: [],
          scoringVersion: 'GDPT_2018_V1',
        }

        await this.practiceRepo.saveSession(session)
        await this.practiceRepo.saveResult(result)

        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('study_ai:personalization_changed'))
        }

        return result
      }
    } catch {
      // Fallback to local pure scoring engine
    }

    // 2. Pure offline fallback evaluation
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

    const result = evaluatePracticeSession(session, questions, skillNameMap)
    session.resultId = result.id

    await this.practiceRepo.saveSession(session)
    await this.practiceRepo.saveResult(result)

    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('study_ai:personalization_changed'))
    }

    return result
  }

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

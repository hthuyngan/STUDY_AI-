import { apiClient } from '@/lib/apiClient'
import { getAccessToken } from '@/auth/authSession'
import { calculateSkillBreakdown } from './scoringEngine'
import {
  practiceRepository,
  type IPracticeRepository,
} from '@/repositories/practice.repository'
import {
  questionBankRepository,
  type IQuestionBankRepository,
} from '@/repositories/questionBank.repository'
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
    correctAnswer: 'A' as const, // Unknown until the server returns the graded result
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

  async getQuestionCount(params: {
    subjectId: string
    chapterId?: string
    lessonId?: string
    difficulty?: string
    skillId?: string
    questionType?: string
    grade?: string
  }): Promise<number> {
    const query = new URLSearchParams()
    query.set('subjectId', params.subjectId)
    if (params.chapterId) query.set('chapterId', params.chapterId)
    if (params.lessonId) query.set('lessonId', params.lessonId)
    if (params.difficulty && params.difficulty !== 'all') query.set('difficulty', params.difficulty)
    if (params.skillId) query.set('skillId', params.skillId)
    if (params.questionType) query.set('questionType', params.questionType)
    if (params.grade) query.set('grade', params.grade)

    const res = await apiClient.get<{ count: number }>(`/api/v1/practice/question-count?${query.toString()}`)
    return typeof res.count === 'number' ? res.count : 0
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
          skillId: config.skillId || config.skillIds?.[0],
          skillIds: config.skillIds,
          questionType: config.questionType,
          difficulty: config.difficulty,
          grade: config.grade,
          questionCount: config.limit || 10,
          mode: config.mode || (config.lessonId ? 'lesson' : 'practice'),
          timeLimitMinutes: config.timeLimitMinutes,
          blueprintId: config.blueprintId,
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
    } catch (error) {
      console.error(error)
      throw new Error('Không thể tạo phiên luyện tập từ máy chủ. Vui lòng kiểm tra kết nối và thử lại.')
    }

    // Offline fallback is disabled for production sessions.
    throw new Error('Máy chủ không trả về câu hỏi hợp lệ.')
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

    let rawAns = ''
    if (answer.questionType === 'multiple_choice') rawAns = answer.selectedOption || ''
    else if (answer.questionType === 'short_answer') rawAns = answer.rawInput || ''
    else rawAns = JSON.stringify(answer)

    // Persist on the server before reporting success locally.
    await apiClient.post(`/api/v1/practice/sessions/${sessionId}/answer`, {
      questionId,
      answer: rawAns,
      timeSpentMs: 0,
    })

    session.answers[questionId] = answer
    session.updatedAt = new Date().toISOString()
    await this.practiceRepo.saveSession(session)

    return session
  }

  async submitSession(
    sessionId: string,
    _skillNameMap: Record<string, string> = {}
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

        const questionResults = backendResult.questions.map((q: any) => ({
          questionId: q.questionId,
          questionType: 'multiple_choice' as const,
          difficulty: 'medium' as const,
          cognitiveLevel: 'comprehension' as const,
          skillIds: q.skillIds || ['SKILL-GENERAL'],
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
        }))

        const result: PracticeResult = {
          id: backendResult.resultId,
          sessionId: backendResult.sessionId,
          subjectId: backendResult.subjectId,
          chapterId: session.chapterId,
          lessonId: session.lessonId,
          questionResults,
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
          skillBreakdown: calculateSkillBreakdown(questionResults),
          scoringVersion: 'GDPT_2018_V1',
        }

        await this.practiceRepo.saveSession(session)
        await this.practiceRepo.saveResult(result)

        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('study_ai:personalization_changed'))
        }

        return result
      }
    } catch (error) {
      console.error(error)
      throw new Error('Không thể chấm bài trên máy chủ. Bài làm chưa được xác nhận đã nộp.')
    }

    throw new Error('Máy chủ không trả về kết quả chấm bài hợp lệ.')
  }

  async getActiveSession(): Promise<PracticeSession | null> {
    return this.practiceRepo.getActiveSession()
  }

  async getSessionById(sessionId: string): Promise<PracticeSession | null> {
    return this.practiceRepo.getSessionById(sessionId)
  }

  async getResultById(resultId: string): Promise<PracticeResult | null> {
    let localResult = await this.practiceRepo.getResultById(resultId)
    if (!localResult && resultId.startsWith('res_')) {
      localResult = await this.practiceRepo.getResultById(resultId.replace('res_', ''))
    }

    if (getAccessToken()) {
      try {
        const rawResultId = resultId.startsWith('res_') ? resultId : `res_${resultId}`
        const backendResult = await apiClient.get<BackendSubmitResponse>(
          `/api/v1/practice/results/${rawResultId}`
        )
        if (backendResult && backendResult.questions) {
          const totalQ = Math.max(1, backendResult.totalQuestions)
          const scorePerQ = 10 / totalQ
          const questionResults = backendResult.questions.map((q) => ({
            questionId: q.questionId,
            questionType: 'multiple_choice' as const,
            difficulty: (q.difficulty || 'medium') as any,
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
          }))

          const remoteResult: PracticeResult = {
            id: backendResult.resultId,
            sessionId: backendResult.sessionId,
            subjectId: backendResult.subjectId,
            chapterId: localResult?.chapterId || '',
            lessonId: localResult?.lessonId,
            questionResults,
            totalQuestions: totalQ,
            correctCount: backendResult.correctCount,
            partialCount: 0,
            incorrectCount: backendResult.incorrectCount,
            unansweredCount: backendResult.unansweredCount,
            earnedPoints: backendResult.scoreScaled,
            maxPoints: 10,
            percentage: Math.round((backendResult.correctCount / totalQ) * 100),
            startedAt: localResult?.startedAt || backendResult.completedAt,
            submittedAt: backendResult.completedAt,
            durationSeconds: backendResult.timeSpentSeconds,
            skillBreakdown: calculateSkillBreakdown(questionResults),
            scoringVersion: 'GDPT_2018_V1',
          }

          await this.practiceRepo.saveResult(remoteResult)
          return remoteResult
        }
      } catch (err: any) {
        if (localResult) return localResult
        throw err
      }
    }

    return localResult
  }

  async getResultBySessionId(sessionId: string): Promise<PracticeResult | null> {
    const localResult = await this.practiceRepo.getResultBySessionId(sessionId)
    if (getAccessToken()) {
      try {
        const backendResult = await apiClient.get<BackendSubmitResponse>(
          `/api/v1/practice/sessions/${sessionId}/result`
        )
        if (backendResult && backendResult.questions) {
          const totalQ = Math.max(1, backendResult.totalQuestions)
          const scorePerQ = 10 / totalQ
          const questionResults = backendResult.questions.map((q) => ({
            questionId: q.questionId,
            questionType: 'multiple_choice' as const,
            difficulty: (q.difficulty || 'medium') as any,
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
          }))

          const remoteResult: PracticeResult = {
            id: backendResult.resultId,
            sessionId: backendResult.sessionId,
            subjectId: backendResult.subjectId,
            chapterId: localResult?.chapterId || '',
            lessonId: localResult?.lessonId,
            questionResults,
            totalQuestions: totalQ,
            correctCount: backendResult.correctCount,
            partialCount: 0,
            incorrectCount: backendResult.incorrectCount,
            unansweredCount: backendResult.unansweredCount,
            earnedPoints: backendResult.scoreScaled,
            maxPoints: 10,
            percentage: Math.round((backendResult.correctCount / totalQ) * 100),
            startedAt: localResult?.startedAt || backendResult.completedAt,
            submittedAt: backendResult.completedAt,
            durationSeconds: backendResult.timeSpentSeconds,
            skillBreakdown: calculateSkillBreakdown(questionResults),
            scoringVersion: 'GDPT_2018_V1',
          }

          await this.practiceRepo.saveResult(remoteResult)
          return remoteResult
        }
      } catch (err: any) {
        if (localResult) return localResult
        throw err
      }
    }

    return localResult
  }

  async getHistory(): Promise<PracticeResult[]> {
    return this.practiceRepo.getAllResults()
  }

  async abandonSession(sessionId: string): Promise<void> {
    await this.practiceRepo.abandonSession(sessionId)
  }
}

export const practiceService = new PracticeService()

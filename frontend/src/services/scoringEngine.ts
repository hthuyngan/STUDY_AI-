import { isMathAnswerCorrect } from './mathAnswerNormalizer'
import type {
  MultipleChoiceQuestion,
  QuestionItem,
  ShortAnswerQuestion,
  TrueFalseGroupQuestion,
} from '@/types/questionBank'
import type {
  MultipleChoiceAnswer,
  PracticeResult,
  PracticeSession,
  ScoredQuestionResult,
  ShortAnswerAnswer,
  SkillScoreBreakdown,
  StudentAnswer,
  TrueFalseGroupAnswer,
} from '@/types/practice'

export const SCORING_VERSION = 'GDPT_2018_V1'

/**
 * Clean floating point arithmetic to avoid 0.1 + 0.2 = 0.30000000000000004 issues
 */
export function roundPoints(val: number): number {
  return Math.round((val + Number.EPSILON) * 100) / 100
}

/**
 * Scores a Multiple Choice Question:
 *  - 1.0 point if correct
 *  - 0.0 point if wrong or unanswered
 */
export function scoreMultipleChoice(
  question: MultipleChoiceQuestion,
  answer?: StudentAnswer | null
): ScoredQuestionResult {
  const mcqAns = answer && answer.questionType === 'multiple_choice' ? (answer as MultipleChoiceAnswer) : null
  const selected = mcqAns?.selectedOption ?? null
  const isUnanswered = selected === null
  const isFullyCorrect = !isUnanswered && selected === question.correctAnswer
  const earnedPoints = isFullyCorrect ? 1 : 0

  return {
    questionId: question.id,
    questionType: 'multiple_choice',
    difficulty: question.difficulty,
    cognitiveLevel: question.cognitiveLevel,
    skillIds: question.skillIds,
    stem: question.stem,
    explanation: question.explanation,
    studentAnswer: mcqAns,
    correctAnswerDisplay: question.correctAnswer,
    isFullyCorrect,
    isPartiallyCorrect: false,
    isUnanswered,
    earnedPoints,
    maxPoints: 1,
  }
}

/**
 * Scores a True / False Group Question:
 * GDPT 2018 Exam Rule:
 *  - 0 correct statements: 0 points
 *  - 1 correct statement: 0.1 points
 *  - 2 correct statements: 0.25 points
 *  - 3 correct statements: 0.5 points
 *  - 4 correct statements: 1.0 point
 *
 * Invariant: Unanswered statements (null) are NEVER treated as correct or equivalent to false.
 */
export function scoreTrueFalseGroup(
  question: TrueFalseGroupQuestion,
  answer?: StudentAnswer | null
): ScoredQuestionResult {
  const tfgAns = answer && answer.questionType === 'true_false_group' ? (answer as TrueFalseGroupAnswer) : null

  let correctCount = 0
  let answeredCount = 0

  const subItemDetails = question.subItems.map((sub) => {
    const studentChoice = tfgAns?.subItemAnswers ? tfgAns.subItemAnswers[sub.id] ?? null : null
    if (studentChoice !== null) {
      answeredCount++
    }
    const isCorrect = studentChoice !== null && studentChoice === sub.isCorrect
    if (isCorrect) {
      correctCount++
    }

    return {
      id: sub.id,
      statement: sub.statement,
      studentChoice,
      correctChoice: sub.isCorrect,
      isCorrect,
      explanation: sub.explanation,
    }
  })

  let earnedPoints = 0
  if (correctCount === 1) earnedPoints = 0.1
  else if (correctCount === 2) earnedPoints = 0.25
  else if (correctCount === 3) earnedPoints = 0.5
  else if (correctCount === 4) earnedPoints = 1.0
  else earnedPoints = 0.0

  const isUnanswered = answeredCount === 0
  const isFullyCorrect = correctCount === 4
  const isPartiallyCorrect = correctCount > 0 && correctCount < 4

  const correctAnswerDisplay = question.subItems
    .map((s) => `${s.id}: ${s.isCorrect ? 'Đ' : 'S'}`)
    .join(' | ')

  return {
    questionId: question.id,
    questionType: 'true_false_group',
    difficulty: question.difficulty,
    cognitiveLevel: question.cognitiveLevel,
    skillIds: question.skillIds,
    stem: question.stem,
    explanation: question.explanation,
    studentAnswer: tfgAns,
    correctAnswerDisplay,
    isFullyCorrect,
    isPartiallyCorrect,
    isUnanswered,
    earnedPoints: roundPoints(earnedPoints),
    maxPoints: 1,
    subItemDetails,
  }
}

/**
 * Scores a Short Answer Question:
 * Uses normalized mathematical equality evaluation from Phase 11.
 *  - 1.0 point if mathematically correct
 *  - 0.0 point if wrong or blank
 */
export function scoreShortAnswer(
  question: ShortAnswerQuestion,
  answer?: StudentAnswer | null
): ScoredQuestionResult {
  const saAns = answer && answer.questionType === 'short_answer' ? (answer as ShortAnswerAnswer) : null
  const rawInput = saAns?.rawInput ?? ''
  const isUnanswered = !rawInput.trim()

  const isFullyCorrect =
    !isUnanswered &&
    isMathAnswerCorrect(rawInput, question.acceptedAnswers, question.tolerance ?? 1e-6)

  const earnedPoints = isFullyCorrect ? 1 : 0

  return {
    questionId: question.id,
    questionType: 'short_answer',
    difficulty: question.difficulty,
    cognitiveLevel: question.cognitiveLevel,
    skillIds: question.skillIds,
    stem: question.stem,
    explanation: question.explanation,
    studentAnswer: saAns,
    correctAnswerDisplay: question.displayAnswer,
    isFullyCorrect,
    isPartiallyCorrect: false,
    isUnanswered,
    earnedPoints,
    maxPoints: 1,
  }
}

/**
 * Scores an individual QuestionItem based on its discriminated union type
 */
export function scoreQuestionItem(
  question: QuestionItem,
  answer?: StudentAnswer | null
): ScoredQuestionResult {
  if (question.type === 'multiple_choice') {
    return scoreMultipleChoice(question, answer)
  }
  if (question.type === 'true_false_group') {
    return scoreTrueFalseGroup(question, answer)
  }
  if (question.type === 'short_answer') {
    return scoreShortAnswer(question, answer)
  }
  throw new Error(`Unsupported question type: ${(question as any).type}`)
}

/**
 * Skill Breakdown Allocation Policy:
 * When a question has multiple skillIds, the points (both earned and max)
 * are divided equally among those skillIds.
 *
 * Invariant:
 *  - Sum of all allocated earnedPoints in breakdown <= Total earned points in session.
 *  - Percentage is rounded to 1 decimal place.
 */
export function calculateSkillBreakdown(
  questionResults: ScoredQuestionResult[],
  skillNameMap: Record<string, string> = {}
): SkillScoreBreakdown[] {
  const skillMap: Record<
    string,
    {
      totalQuestions: number
      fullyCorrectQuestions: number
      earnedPoints: number
      maxPoints: number
    }
  > = {}

  for (const res of questionResults) {
    if (!res.skillIds || res.skillIds.length === 0) continue

    const weight = 1 / res.skillIds.length
    const pointPortion = res.earnedPoints * weight
    const maxPortion = res.maxPoints * weight

    for (const skillId of res.skillIds) {
      if (!skillMap[skillId]) {
        skillMap[skillId] = {
          totalQuestions: 0,
          fullyCorrectQuestions: 0,
          earnedPoints: 0,
          maxPoints: 0,
        }
      }

      skillMap[skillId].totalQuestions += 1
      if (res.isFullyCorrect) {
        skillMap[skillId].fullyCorrectQuestions += 1
      }
      skillMap[skillId].earnedPoints += pointPortion
      skillMap[skillId].maxPoints += maxPortion
    }
  }

  const breakdown: SkillScoreBreakdown[] = Object.keys(skillMap).map((skillId) => {
    const data = skillMap[skillId]
    const earned = roundPoints(data.earnedPoints)
    const max = roundPoints(data.maxPoints)
    const percentage = max > 0 ? Math.round((earned / max) * 1000) / 10 : 0

    return {
      skillId,
      skillName: skillNameMap[skillId] || skillId,
      totalQuestions: data.totalQuestions,
      fullyCorrectQuestions: data.fullyCorrectQuestions,
      earnedPoints: earned,
      maxPoints: max,
      percentage,
    }
  })

  // Sort descending by total questions, then by skillId
  return breakdown.sort((a, b) => b.totalQuestions - a.totalQuestions || a.skillId.localeCompare(b.skillId))
}

/**
 * Primary Scoring Function for PracticeSession:
 * Evaluates all session questions deterministically, aggregates points,
 * and generates a PracticeResult.
 */
export function evaluatePracticeSession(
  session: PracticeSession,
  questions: QuestionItem[],
  skillNameMap: Record<string, string> = {}
): PracticeResult {
  const questionMap = new Map<string, QuestionItem>()
  questions.forEach((q) => questionMap.set(q.id, q))

  const questionResults: ScoredQuestionResult[] = []
  let totalEarned = 0
  let totalMax = 0
  let correctCount = 0
  let partialCount = 0
  let incorrectCount = 0
  let unansweredCount = 0

  for (const qId of session.questionIds) {
    const question = questionMap.get(qId)
    if (!question) {
      throw new Error(`Question ID ${qId} defined in session was not found in provided questions.`)
    }

    const studentAns = session.answers[qId] || null
    const result = scoreQuestionItem(question, studentAns)

    questionResults.push(result)
    totalEarned += result.earnedPoints
    totalMax += result.maxPoints

    if (result.isUnanswered) unansweredCount++
    else if (result.isFullyCorrect) correctCount++
    else if (result.isPartiallyCorrect) partialCount++
    else incorrectCount++
  }

  totalEarned = roundPoints(totalEarned)
  totalMax = roundPoints(totalMax)
  const percentage = totalMax > 0 ? Math.round((totalEarned / totalMax) * 1000) / 10 : 0

  const startedTime = new Date(session.startedAt).getTime()
  const submittedTime = session.submittedAt
    ? new Date(session.submittedAt).getTime()
    : Date.now()
  const durationSeconds = Math.max(0, Math.round((submittedTime - startedTime) / 1000))

  const skillBreakdown = calculateSkillBreakdown(questionResults, skillNameMap)

  return {
    id: `res-${session.id}`,
    sessionId: session.id,
    subjectId: session.subjectId,
    chapterId: session.chapterId,
    lessonId: session.lessonId,
    questionResults,
    totalQuestions: session.questionIds.length,
    correctCount,
    partialCount,
    incorrectCount,
    unansweredCount,
    earnedPoints: totalEarned,
    maxPoints: totalMax,
    percentage,
    submittedAt: session.submittedAt || new Date().toISOString(),
    durationSeconds,
    skillBreakdown,
    scoringVersion: SCORING_VERSION,
  }
}

import { mockQuizzes } from '@/data/quiz.mock'
import type { QuizDetail, QuizResultReport, QuizSubmissionAnswer } from '@/types/quiz'

export async function getQuiz(quizId: string): Promise<QuizDetail | null> {
  await new Promise((resolve) => setTimeout(resolve, 50))
  const quiz = mockQuizzes[quizId]
  if (!quiz) {
    return null
  }
  return { ...quiz }
}

export async function submitQuiz(
  quizId: string,
  answers: QuizSubmissionAnswer[],
  timeTakenSeconds = 180
): Promise<QuizResultReport> {
  await new Promise((resolve) => setTimeout(resolve, 200))
  const quiz = mockQuizzes[quizId] || mockQuizzes['quiz-math-08']

  let correctCount = 0
  const evaluatedAnswers = quiz.questions.map((q) => {
    const given = answers.find((a) => a.questionId === q.id)
    const isCorrect = given?.selectedOptionId === q.correctOptionId
    if (isCorrect) correctCount++

    return {
      questionId: q.id,
      questionNumber: q.number,
      questionText: q.question,
      selectedOptionId: given?.selectedOptionId || '',
      correctOptionId: q.correctOptionId,
      isCorrect,
      explanation: q.explanation,
    }
  })

  const percentage = Math.round((correctCount / quiz.questions.length) * 100)
  const earnedXP = Math.round((percentage / 100) * quiz.rewardXP)

  return {
    quizId,
    quizTitle: quiz.title,
    subjectName: quiz.subjectName,
    totalQuestions: quiz.questions.length,
    correctCount,
    percentage,
    earnedXP,
    timeTakenSeconds,
    passed: percentage >= quiz.passingScore,
    strengths: evaluatedAnswers
      .filter((a) => a.isCorrect)
      .slice(0, 3)
      .map((a) => `Câu ${a.questionNumber}: Đúng câu hỏi về ${quiz.questions.find((q) => q.id === a.questionId)?.conceptTag || 'khái niệm'}`),
    improvements: evaluatedAnswers
      .filter((a) => !a.isCorrect)
      .map((a) => `Ôn lại kiến thức: ${quiz.questions.find((q) => q.id === a.questionId)?.conceptTag || 'chuyên đề'}`),
    answers: evaluatedAnswers,
  }
}

export async function getLatestQuizResult(quizId: string): Promise<QuizResultReport | null> {
  await new Promise((resolve) => setTimeout(resolve, 50))
  const quiz = mockQuizzes[quizId]
  if (!quiz) return null
  return {
    quizId,
    quizTitle: quiz.title,
    subjectName: quiz.subjectName,
    totalQuestions: quiz.questions.length,
    correctCount: 0,
    percentage: 0,
    earnedXP: 0,
    timeTakenSeconds: 0,
    passed: false,
    strengths: [],
    improvements: [],
    answers: [],
  }
}

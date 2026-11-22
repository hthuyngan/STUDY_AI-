import type { QuizDetail, QuizResultReport, QuizSubmissionAnswer } from '@/types/quiz'

const isTestEnvironment = (): boolean => import.meta.env.MODE === 'test'

async function getTestQuizzes() {
  if (!isTestEnvironment()) {
    throw new Error('Test fixtures are unavailable outside the test runner.')
  }
  return (await import('@/data/quiz.mock')).mockQuizzes
}

export async function getQuiz(quizId: string): Promise<QuizDetail | null> {
  if (isTestEnvironment()) {
    const mockQuizzes = await getTestQuizzes()
    const quiz = mockQuizzes[quizId]
    return quiz ? { ...quiz } : null
  }
  throw new Error('Luồng quiz cũ đã được thay bằng Luyện tập có chấm điểm phía máy chủ.')
}

export async function submitQuiz(
  quizId: string,
  answers: QuizSubmissionAnswer[],
  timeTakenSeconds = 180
): Promise<QuizResultReport> {
  if (isTestEnvironment()) {
    const mockQuizzes = await getTestQuizzes()
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

  throw new Error('Luồng quiz cũ đã được thay bằng Luyện tập có chấm điểm phía máy chủ.')
}

export async function getLatestQuizResult(quizId: string): Promise<QuizResultReport | null> {
  if (isTestEnvironment()) {
    const mockQuizzes = await getTestQuizzes()
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
  throw new Error('Luồng kết quả quiz cũ đã được thay bằng lịch sử Luyện tập trên máy chủ.')
}

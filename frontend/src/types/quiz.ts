export interface QuizOption {
  id: string
  label: string // 'A' | 'B' | 'C' | 'D'
  text: string
}

export interface QuizQuestion {
  id: string
  number: number
  question: string
  codeSnippet?: string
  options: QuizOption[]
  correctOptionId: string
  explanation: string
  conceptTag: string
}

export interface QuizDetail {
  id: string
  title: string
  subjectId: string
  subjectName: string
  courseId?: string
  lessonId?: string
  lessonTitle?: string
  totalQuestions: number
  durationMinutes: number
  passingScore: number
  rewardXP: number
  questions: QuizQuestion[]
}

export interface QuizSubmissionAnswer {
  questionId: string
  selectedOptionId: string
}

export interface QuizResultReport {
  quizId: string
  quizTitle: string
  subjectName: string
  totalQuestions: number
  correctCount: number
  percentage: number
  earnedXP: number
  timeTakenSeconds: number
  passed: boolean
  strengths: string[]
  improvements: string[]
  answers: {
    questionId: string
    questionNumber: number
    questionText: string
    selectedOptionId: string
    correctOptionId: string
    isCorrect: boolean
    explanation: string
  }[]
}

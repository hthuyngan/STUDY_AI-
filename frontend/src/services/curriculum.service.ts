import { apiClient } from '@/lib/apiClient'

export interface LearnerSubject {
  id: string
  name: string
  code: string
  grade: string
  description: string
  orderIndex: number
  chapterCount: number
  lessonCount: number
}

export interface LearnerLessonSummary {
  id: string
  title: string
  slug: string
  orderIndex: number
  status: string
}

export interface LearnerChapter {
  id: string
  title: string
  description: string
  orderIndex: number
  lessons: LearnerLessonSummary[]
}

export interface LearnerLessonDetail {
  id: string
  chapterId: string
  chapterTitle: string
  subjectId: string
  subjectName: string
  title: string
  slug: string
  orderIndex: number
  introduction: string
  definitions: string[]
  formulas: string[]
  examples: string[]
  importantNotes: string[]
  summaryPoints: string[]
}

export interface LearnerQuestion {
  id: string
  lessonId: string
  prompt: string
  options: string[]
  topic?: string
  difficulty: string
  type: string
  orderIndex: number
}

export interface CheckAnswerResult {
  questionId: string
  isCorrect: boolean
  correctAnswer: string
  explanation?: string
  scoreEarned: number
  feedback: string
}

export const curriculumService = {
  async getSubjects(grade?: string, search?: string): Promise<LearnerSubject[]> {
    const params = new URLSearchParams()
    if (grade && grade !== 'all') params.append('grade', grade)
    if (search) params.append('search', search)
    const qs = params.toString() ? `?${params.toString()}` : ''
    return apiClient.get<LearnerSubject[]>(`/api/v1/curriculum/subjects${qs}`)
  },

  async getSubjectChapters(subjectId: string): Promise<LearnerChapter[]> {
    return apiClient.get<LearnerChapter[]>(`/api/v1/curriculum/subjects/${subjectId}/chapters`)
  },

  async getLesson(lessonId: string): Promise<LearnerLessonDetail> {
    return apiClient.get<LearnerLessonDetail>(`/api/v1/curriculum/lessons/${lessonId}`)
  },

  async getLessonQuestions(lessonId: string): Promise<LearnerQuestion[]> {
    return apiClient.get<LearnerQuestion[]>(`/api/v1/curriculum/lessons/${lessonId}/questions`)
  },

  async checkQuestionAnswer(
    lessonId: string,
    questionId: string,
    selectedOption: string
  ): Promise<CheckAnswerResult> {
    return apiClient.post<CheckAnswerResult>(
      `/api/v1/curriculum/lessons/${lessonId}/questions/${questionId}/check`,
      { selectedOption }
    )
  },
}

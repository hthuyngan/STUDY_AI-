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

export interface LearnerSubjectWithChapters extends LearnerSubject {
  chapters: LearnerChapter[]
}

export interface LearnerTopic {
  id: string
  chapterId: string
  title: string
  description?: string
  orderIndex: number
  lessons: LearnerLessonSummary[]
}

export interface LearnerVideo {
  id: string
  title: string
  description?: string
  provider: string
  sourceUrl: string
  embedUrl?: string
  youtubeVideoId?: string
  youTubeVideoId?: string
  channelName?: string
  isPrimary?: boolean
  attributionText?: string
  durationSeconds: number
  thumbnailUrl?: string
  embedAllowed: boolean
  verificationStatus: string
}

export interface LearnerLessonSummary {
  id: string
  topicId?: string
  topicTitle?: string
  title: string
  slug: string
  orderIndex: number
  status: string
  contentType?: string
  hasVideo?: boolean
  videoProvider?: string
  youTubeVideoId?: string
}

export interface LearnerChapter {
  id: string
  title: string
  description: string
  orderIndex: number
  topics?: LearnerTopic[]
  lessons: LearnerLessonSummary[]
}

export interface LearnerLessonDetail {
  id: string
  chapterId: string
  chapterTitle: string
  topicId?: string
  topicTitle?: string
  subjectId: string
  subjectName: string
  title: string
  slug: string
  orderIndex: number
  contentType?: string
  sourceName?: string
  sourceUrl?: string
  sourceLicense?: string
  introduction: string
  learningObjectives?: string[]
  definitions: string[]
  formulas: string[]
  examples: string[]
  importantNotes: string[]
  summaryPoints: string[]
  videos?: LearnerVideo[]
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

  async getSubject(subjectId: string): Promise<LearnerSubjectWithChapters> {
    return apiClient.get<LearnerSubjectWithChapters>(`/api/v1/curriculum/subjects/${subjectId}`)
  },

  async getSubjectChapters(subjectId: string): Promise<LearnerChapter[]> {
    return apiClient.get<LearnerChapter[]>(`/api/v1/curriculum/subjects/${subjectId}/chapters`)
  },

  async getChapter(chapterId: string): Promise<LearnerChapter> {
    return apiClient.get<LearnerChapter>(`/api/v1/curriculum/chapters/${chapterId}`)
  },

  async getTopic(topicId: string): Promise<LearnerTopic> {
    return apiClient.get<LearnerTopic>(`/api/v1/curriculum/topics/${topicId}`)
  },

  async getLessonVideos(lessonId: string): Promise<LearnerVideo[]> {
    return apiClient.get<LearnerVideo[]>(`/api/v1/curriculum/lessons/${lessonId}/videos`)
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

import { curriculumService, type LearnerLessonDetail } from '@/services/curriculum.service'
import { getLessonProgress, saveLessonProgress, LESSON_PROGRESS_STORAGE_KEY } from '@/services/lessonProgress.service'
import type { LessonProgressState } from '@/types/assessment'
import type { CourseOutlineChapter, ExampleItem, ExampleStep, FormulaItem, LessonDetail } from '@/types/lesson'

const LESSON_BOOKMARKS_STORAGE_KEY = 'study_ai.lesson_bookmarks.v1'

function getSavedLessonProgressMap(): Record<string, LessonProgressState> {
  if (typeof window === 'undefined') return {}
  try {
    const raw = localStorage.getItem(LESSON_PROGRESS_STORAGE_KEY)
    return raw ? JSON.parse(raw) : {}
  } catch {
    return {}
  }
}

function getBookmarkedLessons(): Set<string> {
  if (typeof window === 'undefined') return new Set()
  try {
    const raw = localStorage.getItem(LESSON_BOOKMARKS_STORAGE_KEY)
    return raw ? new Set(JSON.parse(raw)) : new Set()
  } catch {
    return new Set()
  }
}

function saveBookmarkedLessons(bookmarks: Set<string>): void {
  if (typeof window === 'undefined') return
  try {
    localStorage.setItem(LESSON_BOOKMARKS_STORAGE_KEY, JSON.stringify(Array.from(bookmarks)))
  } catch {
    // ignore
  }
}

function parseDefinitions(raw: unknown[]): Array<{ term: string; content: string }> {
  if (!Array.isArray(raw)) return []
  return raw.map((item, idx) => {
    if (typeof item === 'string') {
      const colonIdx = item.indexOf(':')
      if (colonIdx > 0) {
        return {
          term: item.substring(0, colonIdx).trim(),
          content: item.substring(colonIdx + 1).trim(),
        }
      }
      return {
        term: `Khái niệm ${idx + 1}`,
        content: item.trim(),
      }
    }
    if (item && typeof item === 'object') {
      const obj = item as Record<string, unknown>
      return {
        term: String(obj.term || obj.title || `Khái niệm ${idx + 1}`),
        content: String(obj.content || obj.description || ''),
      }
    }
    return { term: `Khái niệm ${idx + 1}`, content: String(item) }
  })
}

function parseFormulas(raw: unknown[]): FormulaItem[] {
  if (!Array.isArray(raw)) return []
  return raw.map((item, idx) => {
    if (typeof item === 'string') {
      return {
        id: `form-${idx + 1}`,
        label: `Công thức ${idx + 1}`,
        formula: item,
      }
    }
    if (item && typeof item === 'object') {
      const obj = item as Record<string, unknown>
      return {
        id: String(obj.id || `form-${idx + 1}`),
        label: String(obj.label || obj.name || `Công thức ${idx + 1}`),
        formula: String(obj.formula || obj.math || ''),
        note: obj.note ? String(obj.note) : undefined,
      }
    }
    return {
      id: `form-${idx + 1}`,
      label: `Công thức ${idx + 1}`,
      formula: String(item),
    }
  })
}

function parseExamples(raw: unknown[]): ExampleItem[] {
  if (!Array.isArray(raw)) return []
  return raw.map((item, idx) => {
    if (typeof item === 'string') {
      const colonIdx = item.indexOf(':')
      const title = colonIdx > 0 ? item.substring(0, colonIdx).trim() : `Ví dụ ${idx + 1}`
      const problem = colonIdx > 0 ? item.substring(colonIdx + 1).trim() : item.trim()
      return {
        id: `ex-${idx + 1}`,
        title,
        problem,
        solutionSteps: [],
        conclusion: '',
      }
    }
    if (item && typeof item === 'object') {
      const obj = item as Record<string, unknown>
      return {
        id: String(obj.id || `ex-${idx + 1}`),
        title: String(obj.title || `Ví dụ ${idx + 1}`),
        problem: String(obj.problem || obj.content || ''),
        solutionSteps: Array.isArray(obj.solutionSteps) ? (obj.solutionSteps as ExampleStep[]) : [],
        conclusion: obj.conclusion ? String(obj.conclusion) : '',
      }
    }
    return {
      id: `ex-${idx + 1}`,
      title: `Ví dụ ${idx + 1}`,
      problem: String(item),
      solutionSteps: [],
      conclusion: '',
    }
  })
}

function parseStringList(raw: unknown[]): string[] {
  if (!Array.isArray(raw)) return []
  return raw.map((item) => (typeof item === 'string' ? item : String(item)))
}

function mapLearnerDetailToLessonDetail(
  detail: LearnerLessonDetail,
  courseOrSubjectId: string,
  isCompleted: boolean,
  isBookmarked: boolean
): LessonDetail {
  return {
    id: detail.id,
    courseId: detail.subjectId || courseOrSubjectId,
    courseTitle: `Giáo trình ${detail.subjectName || 'Môn học'}`,
    subjectId: detail.subjectId,
    subjectName: detail.subjectName || 'Môn học',
    chapterId: detail.chapterId,
    chapterTitle: detail.chapterTitle || 'Chương học',
    lessonNumber: detail.orderIndex || 1,
    title: detail.title,
    durationMinutes: 45,
    xp: 50,
    isCompleted,
    isBookmarked,
    content: {
      introduction: detail.introduction || '',
      definitions: parseDefinitions(detail.definitions),
      formulas: parseFormulas(detail.formulas),
      examples: parseExamples(detail.examples),
      importantNotes: parseStringList(detail.importantNotes),
      summaryPoints: parseStringList(detail.summaryPoints),
    },
    learningObjectives: [
      `Hiểu rõ và vận dụng kiến thức lý thuyết của ${detail.title}.`,
      'Vận dụng công thức và phương pháp giải để làm bài tập trắc nghiệm chuẩn đề thi.',
    ],
    curriculumVersion: 'GDPT 2018',
    textbookAlignment: 'general_standard',
  }
}

/**
 * Fetch published lesson detail from backend API (StudyAIDb).
 * Returns null if the lesson is draft, in-review, or not found.
 * STRICT FAIL-CLOSED: Re-throws on server/network error.
 */
export async function getLesson(
  courseOrSubjectId: string,
  lessonId: string
): Promise<LessonDetail | null> {
  try {
    const detail = await curriculumService.getLesson(lessonId)
    if (!detail) return null

    const progressMap = getSavedLessonProgressMap()
    const savedProgress = progressMap[lessonId] || progressMap[detail.id]
    const isCompleted = savedProgress ? savedProgress.overallProgress === 100 : false

    const bookmarkedSet = getBookmarkedLessons()
    const isBookmarked = bookmarkedSet.has(lessonId) || bookmarkedSet.has(detail.id)

    return mapLearnerDetailToLessonDetail(detail, courseOrSubjectId, isCompleted, isBookmarked)
  } catch (err: unknown) {
    const status = (err as { status?: number; response?: { status?: number } })?.status ||
      (err as { response?: { status?: number } })?.response?.status
    if (status === 404) {
      return null
    }
    // Fail-closed
    throw err
  }
}

/**
 * Fetch course outline (chapters and published lessons) from backend API.
 */
export async function getCourseOutline(courseOrSubjectId: string): Promise<CourseOutlineChapter[]> {
  try {
    const chapters = await curriculumService.getSubjectChapters(courseOrSubjectId)
    const progressMap = getSavedLessonProgressMap()

    return chapters.map((chap) => ({
      id: chap.id,
      title: chap.title,
      lessons: (chap.lessons || []).map((l, idx) => {
        const saved = progressMap[l.id]
        const status: 'completed' | 'in-progress' | 'available' | 'locked' = saved
          ? saved.overallProgress === 100
            ? 'completed'
            : saved.overallProgress > 0
              ? 'in-progress'
              : 'available'
          : 'available'

        return {
          id: l.id,
          lessonNumber: l.orderIndex || idx + 1,
          title: l.title,
          status,
          durationMinutes: 45,
        }
      }),
    }))
  } catch (err: unknown) {
    const status = (err as { status?: number; response?: { status?: number } })?.status ||
      (err as { response?: { status?: number } })?.response?.status
    if (status === 404) {
      return []
    }
    throw err
  }
}

export const getSubjectOutline = getCourseOutline

export async function toggleLessonBookmark(lessonId: string): Promise<boolean> {
  const bookmarks = getBookmarkedLessons()
  let nextState: boolean
  if (bookmarks.has(lessonId)) {
    bookmarks.delete(lessonId)
    nextState = false
  } else {
    bookmarks.add(lessonId)
    nextState = true
  }
  saveBookmarkedLessons(bookmarks)
  return nextState
}

export async function markLessonComplete(lessonId: string): Promise<boolean> {
  const existing = getLessonProgress(lessonId)
  saveLessonProgress({
    lessonId,
    subjectId: existing?.subjectId || 'math',
    completedSectionIds: existing?.completedSectionIds || [],
    contentProgress: 80,
    assessmentStatus: 'completed',
    overallProgress: 100,
    updatedAt: new Date().toISOString(),
  })
  return true
}

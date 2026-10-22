import { mockSubjectDetails, mockSubjectsSummary } from '@/data/subjects.mock'
import { LESSON_PROGRESS_STORAGE_KEY } from '@/services/lessonProgress.service'
import type { LessonProgressState } from '@/types/assessment'
import type { SubjectDetail, SubjectSummary } from '@/types/subject'

function getSavedLessonProgressMap(): Record<string, LessonProgressState> {
  if (typeof window === 'undefined') return {}
  try {
    const raw = localStorage.getItem(LESSON_PROGRESS_STORAGE_KEY)
    return raw ? JSON.parse(raw) : {}
  } catch {
    return {}
  }
}

export async function getSubjects(): Promise<SubjectSummary[]> {
  await new Promise((resolve) => setTimeout(resolve, 150))
  return [...mockSubjectsSummary]
}

export async function getSubjectById(subjectId: string): Promise<SubjectDetail | null> {
  await new Promise((resolve) => setTimeout(resolve, 150))
  const detail = mockSubjectDetails[subjectId]
  if (!detail) {
    // If not found in detailed map, try finding summary
    const summary = mockSubjectsSummary.find((s) => s.id === subjectId)
    if (!summary) return null
    return {
      ...summary,
      teacherName: 'Giáo viên phụ trách bộ môn',
      chapters: [],
    }
  }

  const progressMap = getSavedLessonProgressMap()
  const chaptersWithProgress = detail.chapters.map((chap) => ({
    ...chap,
    lessons: chap.lessons.map((lesson) => {
      const saved = progressMap[lesson.id]
      if (saved) {
        const progress = saved.overallProgress
        const status: 'completed' | 'in-progress' | 'available' | 'locked' =
          progress === 100
            ? 'completed'
            : progress > 0
              ? 'in-progress'
              : lesson.status === 'locked'
                ? 'locked'
                : 'available'
        return {
          ...lesson,
          progress,
          status,
        }
      }
      return { ...lesson }
    }),
  }))

  return {
    ...detail,
    chapters: chaptersWithProgress,
  }
}

import { mockLessonsDetail } from '@/data/lessons.mock'
import { mockSubjectDetails } from '@/data/subjects.mock'
import { LESSON_PROGRESS_STORAGE_KEY } from '@/services/lessonProgress.service'
import type { LessonProgressState } from '@/types/assessment'
import type { CourseOutlineChapter, LessonDetail } from '@/types/lesson'

function getSavedLessonProgressMap(): Record<string, LessonProgressState> {
  if (typeof window === 'undefined') return {}
  try {
    const raw = localStorage.getItem(LESSON_PROGRESS_STORAGE_KEY)
    return raw ? JSON.parse(raw) : {}
  } catch {
    return {}
  }
}

function resolveSubjectKey(id: string): string {
  if (id.startsWith('math')) return 'math'
  if (id.startsWith('phy')) return 'physics'
  if (id.startsWith('chem')) return 'chemistry'
  if (id.startsWith('eng')) return 'english'
  return id
}

export async function getLesson(courseOrSubjectId: string, lessonId: string): Promise<LessonDetail | null> {
  await new Promise((resolve) => setTimeout(resolve, 150))
  const progressMap = getSavedLessonProgressMap()
  const savedProgress = progressMap[lessonId]

  const lesson = mockLessonsDetail[lessonId]
  if (!lesson) {
    const subjectKey = resolveSubjectKey(courseOrSubjectId)
    const subject = mockSubjectDetails[subjectKey]

    return {
      id: lessonId,
      courseId: courseOrSubjectId,
      courseTitle: subject ? `Giáo trình ${subject.name} ${subject.grade}` : 'Giáo trình học tập SGK',
      subjectId: subjectKey,
      subjectName: subject?.name || 'Môn học',
      chapterId: 'chap-default',
      chapterTitle: 'Chương 1 · Kiến thức trọng tâm',
      lessonNumber: 1,
      title: 'Nội dung bài học',
      durationMinutes: 45,
      xp: 50,
      isCompleted: savedProgress ? savedProgress.overallProgress === 100 : false,
      content: {
        introduction: 'Bài học trọng tâm thuộc chương trình giáo trình chuẩn SGK.',
        definitions: [
          {
            term: 'Kiến thức cốt lõi',
            content: 'Nắm chắc định nghĩa, tính chất và phương pháp giải nhanh theo chuẩn đề thi.',
          },
        ],
        formulas: [],
        examples: [],
        importantNotes: ['Ôn tập lại các ví dụ và làm bài tập tự luyện ngay sau khi học.'],
        summaryPoints: ['Ghi nhớ các dạng bài quen thuộc trong đề thi các năm gần đây.'],
      },
    }
  }

  return {
    ...lesson,
    isCompleted: savedProgress ? savedProgress.overallProgress === 100 : lesson.isCompleted,
  }
}

export async function getCourseOutline(courseOrSubjectId: string): Promise<CourseOutlineChapter[]> {
  await new Promise((resolve) => setTimeout(resolve, 100))
  const subjectKey = resolveSubjectKey(courseOrSubjectId)
  const subject = mockSubjectDetails[subjectKey]
  if (!subject) return []

  const progressMap = getSavedLessonProgressMap()

  return subject.chapters.map((chap) => ({
    id: chap.id,
    title: chap.title,
    lessons: chap.lessons.map((l, idx) => {
      const saved = progressMap[l.id]
      const status: 'completed' | 'in-progress' | 'available' | 'locked' = saved
        ? saved.overallProgress === 100
          ? 'completed'
          : saved.overallProgress > 0
            ? 'in-progress'
            : l.status === 'locked'
              ? 'locked'
              : 'available'
        : l.status

      return {
        id: l.id,
        lessonNumber: idx + 1,
        title: l.title,
        status,
        durationMinutes: l.durationMinutes,
      }
    }),
  }))
}

export const getSubjectOutline = getCourseOutline

export async function toggleLessonBookmark(lessonId: string): Promise<boolean> {
  await new Promise((resolve) => setTimeout(resolve, 100))
  const lesson = mockLessonsDetail[lessonId]
  if (lesson) {
    lesson.isBookmarked = !lesson.isBookmarked
    return !!lesson.isBookmarked
  }
  return true
}

export async function markLessonComplete(lessonId: string): Promise<boolean> {
  await new Promise((resolve) => setTimeout(resolve, 150))
  const lesson = mockLessonsDetail[lessonId]
  if (lesson) {
    lesson.isCompleted = true
  }
  return true
}

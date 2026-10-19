import { mockCourseDetails } from '@/data/courses.mock'
import { mockLessonsDetail } from '@/data/lessons.mock'
import type { CourseOutlineChapter, LessonDetail } from '@/types/lesson'

export async function getLesson(courseId: string, lessonId: string): Promise<LessonDetail | null> {
  await new Promise((resolve) => setTimeout(resolve, 150))
  const lesson = mockLessonsDetail[lessonId]
  if (!lesson) {
    // If not in detailed mock, provide fallback mock lesson
    return {
      id: lessonId,
      courseId,
      courseTitle: 'Khóa học ôn thi THPT Quốc gia',
      subjectId: 'math',
      subjectName: 'Toán học',
      chapterId: 'chap-default',
      chapterTitle: 'Chuyên đề học tập',
      lessonNumber: 1,
      title: 'Nội dung bài học',
      durationMinutes: 45,
      xp: 50,
      isCompleted: false,
      content: {
        introduction: 'Bài học trọng tâm thuộc chương trình ôn thi THPT Quốc gia.',
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
  return { ...lesson }
}

export async function getCourseOutline(courseId: string): Promise<CourseOutlineChapter[]> {
  await new Promise((resolve) => setTimeout(resolve, 100))
  const course = mockCourseDetails[courseId]
  if (!course) return []

  return course.chapters.map((chap) => ({
    id: chap.id,
    title: chap.title,
    lessons: chap.lessons.map((l, idx) => ({
      id: l.id,
      lessonNumber: idx + 1,
      title: l.title,
      status: l.status,
      durationMinutes: l.durationMinutes,
    })),
  }))
}

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

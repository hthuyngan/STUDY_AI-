import { mockCourseDetails, mockCoursesSummary } from '@/data/courses.mock'
import type { CourseDetail, CourseSummary } from '@/types/course'

export async function getCourses(filters?: {
  subjectId?: string
  status?: string
}): Promise<CourseSummary[]> {
  await new Promise((resolve) => setTimeout(resolve, 150))
  let list = [...mockCoursesSummary]

  if (filters?.subjectId && filters.subjectId !== 'all') {
    list = list.filter((c) => c.subjectId === filters.subjectId)
  }

  if (filters?.status && filters.status !== 'all') {
    list = list.filter((c) => c.status === filters.status)
  }

  return list
}

export async function getCourseById(courseId: string): Promise<CourseDetail | null> {
  await new Promise((resolve) => setTimeout(resolve, 150))
  const course = mockCourseDetails[courseId]
  if (!course) {
    const summary = mockCoursesSummary.find((c) => c.id === courseId)
    if (!summary) return null
    return {
      ...summary,
      instructor: {
        name: 'Giảng viên tổ bộ môn',
        title: 'Giáo viên phụ trách',
        avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80',
      },
      chapters: [],
    }
  }
  return { ...course }
}

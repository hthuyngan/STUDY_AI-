import { mockSubjectDetails, mockSubjectsSummary } from '@/data/subjects.mock'
import { buildLearningStateSnapshot } from '@/services/learningState.service'
import type { LessonStatus, SubjectDetail, SubjectSummary } from '@/types/subject'

export async function getSubjects(): Promise<SubjectSummary[]> {
  await new Promise((resolve) => setTimeout(resolve, 150))
  const snapshot = buildLearningStateSnapshot()
  const hasLearnerData = snapshot.summary.inProgressLessons > 0 || snapshot.summary.completedLessons > 0

  return mockSubjectsSummary.map((base) => {
    if (!hasLearnerData) return base
    const derived = snapshot.subjects[base.id]
    if (!derived) return base
    return {
      ...base,
      progress: derived.progress,
      completedLessons: derived.completedLessons,
      totalLessons: base.totalLessons,
    }
  })
}

export async function getSubjectById(subjectId: string): Promise<SubjectDetail | null> {
  await new Promise((resolve) => setTimeout(resolve, 150))
  const detail = mockSubjectDetails[subjectId]
  if (!detail) {
    const summary = mockSubjectsSummary.find((s) => s.id === subjectId)
    if (!summary) return null
    return {
      ...summary,
      teacherName: 'Giáo viên phụ trách bộ môn',
      chapters: [],
    }
  }

  const snapshot = buildLearningStateSnapshot()
  const derivedSubject = snapshot.subjects[subjectId]

  const chaptersWithProgress = detail.chapters.map((chap) => {
    return {
      ...chap,
      lessons: chap.lessons.map((lesson) => {
        const derivedLesson = snapshot.lessons[lesson.id]
        if (
          derivedLesson &&
          (derivedLesson.overallProgress > 0 || derivedLesson.attemptCount > 0)
        ) {
          const progress = derivedLesson.overallProgress
          const status: LessonStatus =
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
    }
  })

  const hasSubjectLearnerData =
    derivedSubject && (derivedSubject.startedLessons > 0 || derivedSubject.completedLessons > 0)

  return {
    ...detail,
    progress: hasSubjectLearnerData ? derivedSubject.progress : detail.progress,
    completedLessons: hasSubjectLearnerData ? derivedSubject.completedLessons : detail.completedLessons,
    totalLessons: detail.totalLessons,
    chapters: chaptersWithProgress,
  }
}

/**
 * Learning Path Service
 * Personalized sequential learning path, chapter progress, and rule-based next lesson recommendation.
 */

import { mockLearningPath } from '@/data/learningPath.mock'
import { mockSubjectDetails, mockSubjectsSummary } from '@/data/subjects.mock'
import { learningProgressRepository } from '@/repositories/learningProgress.repository'
import type {
  ContinueLearningTarget,
} from '@/types/studyNotes'
import type {
  LearningPathChapterItem,
  LearningPathData,
  LearningPathLessonItem,
  LessonPathStatus,
  SubjectLearningPath,
} from '@/types/learningPath'

/**
 * Returns overall milestone learning path data (for exam countdown / stages).
 */
export async function getLearningPath(): Promise<LearningPathData> {
  await new Promise((resolve) => setTimeout(resolve, 50))
  return { ...mockLearningPath }
}

/**
 * Returns a personalized learning path for a given subject.
 */
export function getSubjectLearningPath(subjectId: string): SubjectLearningPath {
  const detail = mockSubjectDetails[subjectId]
  const summary = mockSubjectsSummary.find((s) => s.id === subjectId)
  const subjectName = detail?.name || summary?.name || 'Môn học'
  const grade = detail?.grade || summary?.grade || 'Lớp 12'

  if (!detail || !detail.chapters || detail.chapters.length === 0) {
    return {
      subjectId,
      subjectName,
      grade,
      totalLessons: 0,
      completedLessons: 0,
      overallProgress: 0,
      recommendedLesson: null,
      chapters: [],
      allCompleted: false,
    }
  }

  const allProgress = learningProgressRepository.getAll()

  let totalLessonCount = 0
  let completedLessonCount = 0
  const flatLessons: LearningPathLessonItem[] = []

  const chapters: LearningPathChapterItem[] = detail.chapters.map((chap, chapIdx) => {
    let chapCompleted = 0
    const chapLessons: LearningPathLessonItem[] = chap.lessons.map((les, lesIdx) => {
      totalLessonCount++
      const progressRecord = allProgress[les.id]
      const progress = progressRecord ? progressRecord.overallProgress : (les.status === 'completed' ? 100 : les.progress || 0)
      
      let status: LessonPathStatus = 'not-started'
      if (progress >= 100) {
        status = 'completed'
        chapCompleted++
        completedLessonCount++
      } else if (progress > 0) {
        status = 'in-progress'
      }

      const item: LearningPathLessonItem = {
        id: les.id,
        subjectId,
        chapterId: chap.id,
        chapterTitle: chap.title,
        title: les.title,
        order: (chapIdx + 1) * 100 + (lesIdx + 1),
        durationMinutes: les.durationMinutes || 30,
        xp: les.durationMinutes ? les.durationMinutes * 2 : 50,
        status,
        progress,
        lastActiveSectionId: progressRecord?.lastActiveSectionId,
      }

      flatLessons.push(item)
      return item
    })

    const chapTotal = chapLessons.length
    const chapProgressPercent = chapTotal > 0 ? Math.round((chapCompleted / chapTotal) * 100) : 0

    return {
      id: chap.id,
      title: chap.title,
      order: chapIdx + 1,
      totalLessons: chapTotal,
      completedLessons: chapCompleted,
      progressPercent: chapProgressPercent,
      lessons: chapLessons,
    }
  })

  const overallProgress = totalLessonCount > 0 ? Math.round((completedLessonCount / totalLessonCount) * 100) : 0
  const allCompleted = totalLessonCount > 0 && completedLessonCount === totalLessonCount

  let recommendedLesson: LearningPathLessonItem | null = null

  if (!allCompleted && flatLessons.length > 0) {
    // Priority 1: In-progress lesson (in-progress dở dang), sorted by updatedAt desc if available
    const inProgressLessons = flatLessons.filter((l) => l.status === 'in-progress')
    if (inProgressLessons.length > 0) {
      inProgressLessons.sort((a, b) => {
        const timeA = allProgress[a.id]?.updatedAt ? new Date(allProgress[a.id].updatedAt).getTime() : 0
        const timeB = allProgress[b.id]?.updatedAt ? new Date(allProgress[b.id].updatedAt).getTime() : 0
        return timeB - timeA
      })
      recommendedLesson = inProgressLessons[0]
    }

    // Priority 2: Next unstarted lesson right after completed lessons in sequence
    if (!recommendedLesson) {
      const firstUnstarted = flatLessons.find((l) => l.status === 'not-started')
      if (firstUnstarted) {
        recommendedLesson = firstUnstarted
      }
    }

    // Priority 3: Fallback to the first lesson if none matched
    if (!recommendedLesson) {
      recommendedLesson = flatLessons[0]
    }
  }

  // Mark recommended
  if (recommendedLesson) {
    recommendedLesson.isRecommendedNext = true
  }

  return {
    subjectId,
    subjectName,
    grade,
    totalLessons: totalLessonCount,
    completedLessons: completedLessonCount,
    overallProgress,
    recommendedLesson,
    chapters,
    allCompleted,
  }
}

/**
 * Returns the recommended "Continue Learning" target across all subjects.
 * Used by Dashboard ContinueLearningCard.
 */
export function getContinueLearningTarget(): ContinueLearningTarget | null {
  const allProgress = learningProgressRepository.getAll()
  const inProgressRecords = Object.values(allProgress)
    .filter((p) => p.overallProgress > 0 && p.overallProgress < 100)
    .sort((a, b) => {
      const timeA = a.updatedAt ? new Date(a.updatedAt).getTime() : 0
      const timeB = b.updatedAt ? new Date(b.updatedAt).getTime() : 0
      return timeB - timeA
    })

  if (inProgressRecords.length > 0) {
    const record = inProgressRecords[0]
    const subject = mockSubjectDetails[record.subjectId] || mockSubjectsSummary.find((s) => s.id === record.subjectId)
    const subjectName = subject?.name || 'Môn học'

    // Find lesson metadata
    let lessonTitle = record.lessonId
    let chapterTitle = ''
    if (mockSubjectDetails[record.subjectId]) {
      for (const chap of mockSubjectDetails[record.subjectId].chapters) {
        const les = chap.lessons.find((l) => l.id === record.lessonId)
        if (les) {
          lessonTitle = les.title
          chapterTitle = chap.title
          break
        }
      }
    }

    return {
      lessonId: record.lessonId,
      subjectId: record.subjectId,
      lessonTitle,
      subjectName,
      chapterTitle: chapterTitle || undefined,
      sectionId: record.lastActiveSectionId,
      sectionTitle: record.lastActiveSectionTitle,
      progress: record.overallProgress,
      lastActivityAt: record.updatedAt || new Date().toISOString(),
    }
  }

  // If no lesson is currently in-progress, pick the recommended next lesson from 'math' or first subject
  const defaultSubjectId = 'math'
  const path = getSubjectLearningPath(defaultSubjectId)
  if (path.recommendedLesson) {
    return {
      lessonId: path.recommendedLesson.id,
      subjectId: defaultSubjectId,
      lessonTitle: path.recommendedLesson.title,
      subjectName: path.subjectName,
      chapterTitle: path.recommendedLesson.chapterTitle,
      sectionId: path.recommendedLesson.lastActiveSectionId,
      progress: path.recommendedLesson.progress,
      lastActivityAt: new Date().toISOString(),
    }
  }

  return null
}

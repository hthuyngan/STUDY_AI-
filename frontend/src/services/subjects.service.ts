import { curriculumService, type LearnerSubject, type LearnerSubjectWithChapters } from '@/services/curriculum.service'
import { buildLearningStateSnapshot } from '@/services/learningState.service'
import type { LessonStatus, SubjectChapter, SubjectDetail, SubjectSummary } from '@/types/subject'

interface SubjectVisualMeta {
  icon: string
  color: string
  bgColor: string
  curriculumLabel: string
  plannedTopics?: string[]
}

const SUBJECT_VISUAL_MAP: Record<string, SubjectVisualMeta> = {
  MATH12: {
    icon: '📐',
    color: '#2563eb',
    bgColor: 'rgba(37, 99, 235, 0.1)',
    curriculumLabel: 'Toán học GDPT 2018',
    plannedTopics: ['Ứng dụng đạo hàm khảo sát hàm số', 'Tọa độ trong không gian Oxyz', 'Xác suất có điều kiện'],
  },
  PHYS12: {
    icon: '⚡',
    color: '#7c3aed',
    bgColor: 'rgba(124, 58, 237, 0.1)',
    curriculumLabel: 'Vật lý GDPT 2018',
    plannedTopics: ['Vật lý nhiệt', 'Khí lý tưởng', 'Từ trường và cảm ứng điện từ'],
  },
  CHEM12: {
    icon: '🧪',
    color: '#059669',
    bgColor: 'rgba(5, 150, 105, 0.1)',
    curriculumLabel: 'Hóa học GDPT 2018',
    plannedTopics: ['Ester - Lipid', 'Carbohydrate', 'Hợp chất chứa nitrogen'],
  },
  BIO12: {
    icon: '🧬',
    color: '#10b981',
    bgColor: 'rgba(16, 185, 129, 0.1)',
    curriculumLabel: 'Sinh học GDPT 2018',
    plannedTopics: ['Di truyền phân tử', 'Quy luật di truyền', 'Tiến hóa và sinh thái'],
  },
  LIT12: {
    icon: '📖',
    color: '#d97706',
    bgColor: 'rgba(217, 119, 6, 0.1)',
    curriculumLabel: 'Ngữ văn GDPT 2018',
    plannedTopics: ['Văn học hiện đại Việt Nam', 'Nghị luận xã hội', 'Thực hành tiếng Việt'],
  },
  ENG12: {
    icon: '🌐',
    color: '#4f46e5',
    bgColor: 'rgba(79, 70, 229, 0.1)',
    curriculumLabel: 'Tiếng Anh GDPT 2018',
    plannedTopics: ['Life Stories', 'Urbanisation', 'The Green Movement'],
  },
  HIST12: {
    icon: '🏛️',
    color: '#e11d48',
    bgColor: 'rgba(225, 29, 72, 0.1)',
    curriculumLabel: 'Lịch sử GDPT 2018',
    plannedTopics: ['Thế giới sau Chiến tranh thế giới thứ hai', 'ASEAN và hội nhập quốc tế', 'Cách mạng Việt Nam'],
  },
  GEO12: {
    icon: '🧭',
    color: '#0d9488',
    bgColor: 'rgba(13, 148, 136, 0.1)',
    curriculumLabel: 'Địa lý GDPT 2018',
    plannedTopics: ['Địa lý tự nhiên Việt Nam', 'Địa lý dân cư và đô thị', 'Địa lý các ngành kinh tế'],
  },
  CIVIC12: {
    icon: '⚖️',
    color: '#0284c7',
    bgColor: 'rgba(2, 132, 199, 0.1)',
    curriculumLabel: 'GDKT & Pháp luật GDPT 2018',
    plannedTopics: ['Pháp luật và đời sống', 'Quyền và nghĩa vụ công dân', 'Hệ thống chính trị Việt Nam'],
  },
}

function resolveVisualMeta(code: string, id: string): SubjectVisualMeta {
  const normalizedCode = (code || '').toUpperCase()
  if (SUBJECT_VISUAL_MAP[normalizedCode]) return SUBJECT_VISUAL_MAP[normalizedCode]

  const fromId = id.replace('sub_', '').toUpperCase()
  if (SUBJECT_VISUAL_MAP[fromId]) return SUBJECT_VISUAL_MAP[fromId]

  return {
    icon: '📚',
    color: '#2563eb',
    bgColor: 'rgba(37, 99, 235, 0.1)',
    curriculumLabel: 'GDPT 2018',
  }
}

function formatGradeLabel(grade: string): string {
  if (!grade) return 'Lớp 12'
  if (grade.startsWith('Lớp')) return grade
  return `Lớp ${grade}`
}

function mapLearnerSubjectToSummary(
  sub: LearnerSubject,
  snapshot = buildLearningStateSnapshot()
): SubjectSummary {
  const visual = resolveVisualMeta(sub.code, sub.id)
  const derived = snapshot.subjects[sub.id] || snapshot.subjects[sub.code.toLowerCase()]
  const isAvailable = sub.lessonCount > 0

  const totalLessons = sub.lessonCount
  const completedLessons = derived ? Math.min(derived.completedLessons, totalLessons) : 0
  const progress =
    totalLessons > 0 ? Math.round((completedLessons / totalLessons) * 100) : 0

  return {
    id: sub.id,
    name: sub.name,
    grade: formatGradeLabel(sub.grade),
    curriculumLabel: visual.curriculumLabel,
    curriculumVersion: 'GDPT 2018',
    icon: visual.icon,
    color: visual.color,
    bgColor: visual.bgColor,
    completedLessons,
    totalLessons,
    progress,
    description: sub.description || `Giáo trình chuẩn hóa ${sub.name} theo khung chương trình GDPT 2018.`,
    availability: isAvailable ? 'available' : 'coming_soon',
    plannedTopics: visual.plannedTopics,
  }
}

/**
 * Fetch all active curriculum subjects from the backend API (StudyAIDb).
 * STRICT FAIL-CLOSED: Re-throws on API error without falling back to mock data.
 */
export async function getSubjects(): Promise<SubjectSummary[]> {
  const data = await curriculumService.getSubjects()
  const snapshot = buildLearningStateSnapshot()
  return data.map((sub) => mapLearnerSubjectToSummary(sub, snapshot))
}

/**
 * Fetch single subject detail with active chapters and published lessons from backend API.
 * Returns null if the subject does not exist or is inactive.
 */
export async function getSubjectById(subjectId: string): Promise<SubjectDetail | null> {
  try {
    const rawSubject: LearnerSubjectWithChapters = await curriculumService.getSubject(subjectId)
    if (!rawSubject) return null

    const snapshot = buildLearningStateSnapshot()
    const summary = mapLearnerSubjectToSummary(rawSubject, snapshot)

    let totalLessonsCount = 0
    let completedLessonsCount = 0

    const chapters: SubjectChapter[] = (rawSubject.chapters || []).map((chap, cIdx) => {
      const lessons = (chap.lessons || []).map((l) => {
        totalLessonsCount += 1
        const derivedLesson = snapshot.lessons[l.id]
        const hasProgress = derivedLesson && (derivedLesson.overallProgress > 0 || derivedLesson.attemptCount > 0)
        const lessonProg = hasProgress ? derivedLesson.overallProgress : 0
        const isCompleted = lessonProg === 100
        if (isCompleted) completedLessonsCount += 1

        const status: LessonStatus = isCompleted
          ? 'completed'
          : lessonProg > 0
            ? 'in-progress'
            : (l.status === 'in-progress' || l.status === 'completed' || l.status === 'locked')
              ? (l.status as LessonStatus)
              : 'available'

        return {
          id: l.id,
          subjectId: rawSubject.id,
          chapterId: chap.id,
          chapterTitle: chap.title,
          title: l.title,
          durationMinutes: 45,
          status,
          progress: lessonProg,
          availability: 'available' as const,
        }
      })

      return {
        id: chap.id,
        chapterNumber: cIdx + 1,
        title: chap.title,
        description: chap.description,
        availability: 'available' as const,
        lessons,
      }
    })

    const effectiveTotal = Math.max(summary.totalLessons, totalLessonsCount)
    const effectiveCompleted = completedLessonsCount
    const effectiveProgress = effectiveTotal > 0 ? Math.round((effectiveCompleted / effectiveTotal) * 100) : 0

    const firstChapterWithIncomplete = chapters.find((c) =>
      c.lessons.some((l) => l.status !== 'completed')
    )
    const currentChapter = firstChapterWithIncomplete?.title || chapters[0]?.title

    return {
      ...summary,
      totalLessons: effectiveTotal,
      completedLessons: effectiveCompleted,
      progress: effectiveProgress,
      currentChapter,
      teacherName: 'Ban Chuyên môn StudyAI',
      chapters,
    }
  } catch (err: unknown) {
    const status = (err as { status?: number; response?: { status?: number } })?.status ||
      (err as { response?: { status?: number } })?.response?.status
    if (status === 404) {
      return null
    }
    // Fail-closed on network/server error
    throw err
  }
}

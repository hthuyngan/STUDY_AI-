import { mockSubjectDetails, mockSubjectsSummary } from '@/data/subjects.mock'
import type { SubjectDetail, SubjectSummary } from '@/types/subject'

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
  return { ...detail }
}

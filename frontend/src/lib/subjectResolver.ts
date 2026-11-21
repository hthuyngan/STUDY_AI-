export interface ResolveSubjectOptions {
  subjectId?: string | null
  grade?: string | null
  lessonId?: string | null
  chapterId?: string | null
}

export interface SubjectResolutionResult {
  success: boolean
  subjectId: string | null
  grade: '10' | '11' | '12' | null
  subjectName?: string
  error?: string
}

export function normalizeGrade(grade?: string | null): '10' | '11' | '12' | null {
  if (!grade) return null
  const cleaned = String(grade).trim().toLowerCase()
  if (cleaned.includes('10')) return '10'
  if (cleaned.includes('11')) return '11'
  if (cleaned.includes('12')) return '12'
  return null
}

export function getCanonicalSubjectIdForGrade(grade: '10' | '11' | '12'): string {
  switch (grade) {
    case '10':
      return 'sub_math10'
    case '11':
      return 'sub_math11'
    case '12':
      return 'sub_math12'
  }
}

export function getSubjectName(subjectId?: string | null): string {
  if (!subjectId) return ''
  switch (subjectId) {
    case 'sub_math10':
      return 'Toán học 10'
    case 'sub_math11':
      return 'Toán học 11'
    case 'sub_math12':
      return 'Toán học 12'
    default:
      return subjectId
  }
}

/**
 * Resolves a subject ID following strict precedence:
 * 1. Explicit valid subject ID
 * 2. User's normalized grade (10 -> sub_math10, 11 -> sub_math11, 12 -> sub_math12)
 * 3. Returns null (NEVER silently falls back to Grade 12 or sub_math12)
 */
export function resolveSubjectId(options: ResolveSubjectOptions): string | null {
  if (options.subjectId && typeof options.subjectId === 'string' && options.subjectId.trim() !== '') {
    const s = options.subjectId.trim()
    if (s.startsWith('sub_') || s.startsWith('MATH') || s.length > 2) {
      return s
    }
  }

  const normGrade = normalizeGrade(options.grade)
  if (normGrade) {
    return getCanonicalSubjectIdForGrade(normGrade)
  }

  return null
}

/**
 * Detailed resolution result with explicit success/failure indicator and message.
 */
export function resolveSubject(options: ResolveSubjectOptions): SubjectResolutionResult {
  if (options.subjectId && typeof options.subjectId === 'string' && options.subjectId.trim() !== '') {
    const s = options.subjectId.trim()
    if (s.startsWith('sub_') || s.startsWith('MATH') || s.length > 2) {
      const grade = s.includes('10') ? '10' : s.includes('11') ? '11' : s.includes('12') ? '12' : null
      return {
        success: true,
        subjectId: s,
        grade,
        subjectName: getSubjectName(s),
      }
    }
  }

  const normGrade = normalizeGrade(options.grade)
  if (normGrade) {
    const subjId = getCanonicalSubjectIdForGrade(normGrade)
    return {
      success: true,
      subjectId: subjId,
      grade: normGrade,
      subjectName: getSubjectName(subjId),
    }
  }

  return {
    success: false,
    subjectId: null,
    grade: null,
    error: 'Không thể xác định môn học từ yêu cầu hoặc khối lớp của người dùng.',
  }
}

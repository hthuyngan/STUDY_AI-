import type {
  AdminTeacherItem,
  AssessmentQuestionItem,
  CurriculumAssessmentItem,
  CurriculumChapterItem,
  CurriculumLessonItem,
  CurriculumSubjectItem,
  CurriculumTopicItem,
  CurriculumLessonVideoItem,
  LearningReportsData,
} from '@/types/education'
import type { ContentStatus } from '@/types/content'
import { apiClient } from '@/lib/apiClient'
import { getAccessToken } from '@/auth/authSession'
import { resolveSubjectIcon } from '@/components/subjects/SubjectIconSvg'

const STORAGE_KEYS = {
  SUBJECTS: 'study_ai_education_subjects',
  CHAPTERS: 'study_ai_education_chapters',
  LESSONS: 'study_ai_education_lessons',
  ASSESSMENTS: 'study_ai_education_assessments',
  TEACHERS: 'study_ai_education_teachers',
}

const INITIAL_SUBJECTS: CurriculumSubjectItem[] = [
  {
    id: 'math',
    name: 'Toán học 12',
    code: 'MATH-12',
    grade: 'Lớp 12',
    icon: '∑',
    description: 'Chương trình Giải tích và Hình học không gian chuẩn Bộ GD&ĐT bám sát kỳ thi THPT Quốc gia.',
    chapterCount: 4,
    lessonCount: 16,
    assessmentCount: 16,
    publishedPercent: 88,
    status: 'published',
    updatedAt: '2026-10-27T08:00:00Z',
  },
  {
    id: 'physics',
    name: 'Vật lý 12',
    code: 'PHYS-12',
    grade: 'Lớp 12',
    icon: '⚛',
    description: 'Dao động điều hòa, sóng cơ, dòng điện xoay chiều và vật lý hạt nhân.',
    chapterCount: 3,
    lessonCount: 12,
    assessmentCount: 10,
    publishedPercent: 75,
    status: 'published',
    updatedAt: '2026-10-25T14:30:00Z',
  },
  {
    id: 'chemistry',
    name: 'Hóa học 12',
    code: 'CHEM-12',
    grade: 'Lớp 12',
    icon: '⚗',
    description: 'Este - Lipit, Cacbohiđrat, Amin - Amino axit - Peptit và kim loại kiềm/thổ.',
    chapterCount: 3,
    lessonCount: 11,
    assessmentCount: 8,
    publishedPercent: 70,
    status: 'published',
    updatedAt: '2026-10-24T11:00:00Z',
  },
  {
    id: 'literature',
    name: 'Ngữ văn 12',
    code: 'LIT-12',
    grade: 'Lớp 12',
    icon: '📖',
    description: 'Văn học hiện đại Việt Nam, nghị luận xã hội và nghị luận văn học.',
    chapterCount: 4,
    lessonCount: 14,
    assessmentCount: 12,
    publishedPercent: 85,
    status: 'published',
    updatedAt: '2026-10-26T16:00:00Z',
  },
  {
    id: 'english',
    name: 'Tiếng Anh 12',
    code: 'ENG-12',
    grade: 'Lớp 12',
    icon: 'A',
    description: 'Ngữ pháp nâng cao, từ vựng học thuật, đọc hiểu chuyên sâu và luyện đề THPT.',
    chapterCount: 4,
    lessonCount: 12,
    assessmentCount: 12,
    publishedPercent: 90,
    status: 'published',
    updatedAt: '2026-10-27T09:15:00Z',
  },
]

const INITIAL_CHAPTERS: CurriculumChapterItem[] = [
  {
    id: 'ch-01',
    subjectId: 'math',
    subjectName: 'Toán học 12',
    title: 'Chương 1: Ứng dụng đạo hàm để khảo sát hàm số',
    order: 1,
    lessonsCount: 8,
    status: 'published',
    updatedAt: '2026-10-27T08:00:00Z',
  },
  {
    id: 'ch-02',
    subjectId: 'math',
    subjectName: 'Toán học 12',
    title: 'Chương 2: Hàm số lũy thừa, hàm số mũ và logarit',
    order: 2,
    lessonsCount: 6,
    status: 'published',
    updatedAt: '2026-10-25T10:00:00Z',
  },
  {
    id: 'ch-03',
    subjectId: 'math',
    subjectName: 'Toán học 12',
    title: 'Chương 3: Nguyên hàm, tích phân và ứng dụng',
    order: 3,
    lessonsCount: 5,
    status: 'published',
    updatedAt: '2026-10-22T14:00:00Z',
  },
  {
    id: 'ch-04',
    subjectId: 'math',
    subjectName: 'Toán học 12',
    title: 'Chương 4: Số phức và phương trình bậc hai',
    order: 4,
    lessonsCount: 4,
    status: 'draft',
    updatedAt: '2026-10-20T11:00:00Z',
  },
  {
    id: 'ch-phy-01',
    subjectId: 'physics',
    subjectName: 'Vật lý 12',
    title: 'Chương 1: Dao động cơ',
    order: 1,
    lessonsCount: 5,
    status: 'published',
    updatedAt: '2026-10-25T14:30:00Z',
  },
  {
    id: 'ch-phy-02',
    subjectId: 'physics',
    subjectName: 'Vật lý 12',
    title: 'Chương 2: Sóng cơ và sóng âm',
    order: 2,
    lessonsCount: 4,
    status: 'published',
    updatedAt: '2026-10-24T16:00:00Z',
  },
  {
    id: 'ch-chm-01',
    subjectId: 'chemistry',
    subjectName: 'Hóa học 12',
    title: 'Chương 1: Este - Lipit',
    order: 1,
    lessonsCount: 4,
    status: 'published',
    updatedAt: '2026-10-24T11:00:00Z',
  },
]

const INITIAL_LESSONS: CurriculumLessonItem[] = [
  {
    id: 'lesson-math-08',
    title: 'Khảo sát và vẽ đồ thị hàm phân thức bậc nhất / bậc nhất',
    subjectId: 'math',
    subjectName: 'Toán học 12',
    chapterId: 'ch-01',
    chapterName: 'Chương 1: Ứng dụng đạo hàm để khảo sát hàm số',
    status: 'published',
    authorName: 'Phạm Văn Nam',
    updatedAt: '2026-10-27T08:30:00Z',
    hasAssessment: true,
    order: 1,
  },
  {
    id: 'lesson-math-01',
    title: 'Sự đồng biến, nghịch biến của hàm số',
    subjectId: 'math',
    subjectName: 'Toán học 12',
    chapterId: 'ch-01',
    chapterName: 'Chương 1: Ứng dụng đạo hàm để khảo sát hàm số',
    status: 'published',
    authorName: 'Phạm Văn Nam',
    updatedAt: '2026-10-20T10:00:00Z',
    hasAssessment: true,
    order: 2,
  },
  {
    id: 'lesson-math-02',
    title: 'Cực trị của hàm số',
    subjectId: 'math',
    subjectName: 'Toán học 12',
    chapterId: 'ch-01',
    chapterName: 'Chương 1: Ứng dụng đạo hàm để khảo sát hàm số',
    status: 'published',
    authorName: 'Nguyễn Thu Trang',
    updatedAt: '2026-10-22T09:15:00Z',
    hasAssessment: true,
    order: 3,
  },
  {
    id: 'lesson-math-09',
    title: 'Tiệm cận đứng và tiệm cận ngang của đồ thị hàm số',
    subjectId: 'math',
    subjectName: 'Toán học 12',
    chapterId: 'ch-01',
    chapterName: 'Chương 1: Ứng dụng đạo hàm để khảo sát hàm số',
    status: 'in-review',
    authorName: 'Phạm Văn Nam',
    updatedAt: '2026-10-27T07:45:00Z',
    hasAssessment: true,
    order: 4,
  },
  {
    id: 'lesson-phy-01',
    title: 'Dao động điều hòa và các đại lượng đặc trưng',
    subjectId: 'physics',
    subjectName: 'Vật lý 12',
    chapterId: 'ch-phy-01',
    chapterName: 'Chương 1: Dao động cơ',
    status: 'published',
    authorName: 'Lê Thanh Thảo',
    updatedAt: '2026-10-25T14:30:00Z',
    hasAssessment: true,
    order: 1,
  },
  {
    id: 'lesson-chem-01',
    title: 'Este - Lipit và phản ứng xà phòng hóa',
    subjectId: 'chemistry',
    subjectName: 'Hóa học 12',
    chapterId: 'ch-chm-01',
    chapterName: 'Chương 1: Este - Lipit',
    status: 'draft',
    authorName: 'Vũ Thị Ngọc',
    updatedAt: '2026-10-26T17:00:00Z',
    hasAssessment: false,
    order: 1,
  },
]

const INITIAL_ASSESSMENTS: CurriculumAssessmentItem[] = [
  {
    id: 'asm-math-08',
    lessonId: 'lesson-math-08',
    lessonTitle: 'Khảo sát và vẽ đồ thị hàm phân thức',
    subjectId: 'math',
    subjectName: 'Toán học 12',
    chapterId: 'ch-01',
    chapterName: 'Chương 1: Ứng dụng đạo hàm để khảo sát hàm số',
    questionCount: 4,
    passingScore: 60,
    durationMinutes: 15,
    status: 'published',
    updatedAt: '2026-10-27T08:30:00Z',
    questions: [
      {
        id: 'q-1',
        prompt: 'Đồ thị hàm phân thức y = (ax + b) / (cx + d) có tâm đối xứng là giao điểm của:',
        topic: 'Tâm đối xứng',
        options: [
          { id: 'opt-a', label: 'A', text: 'Hai trục tọa độ Ox và Oy' },
          { id: 'opt-b', label: 'B', text: 'Hai đường tiệm cận đứng và tiệm cận ngang' },
          { id: 'opt-c', label: 'C', text: 'Điểm cực đại và cực tiểu' },
          { id: 'opt-d', label: 'D', text: 'Trục tung và tiếp tuyến tại gốc tọa độ' },
        ],
        correctOptionId: 'opt-b',
        explanation: 'Hàm số phân thức hữu tỉ bậc nhất luôn nhận giao điểm I(-d/c; a/c) của hai đường tiệm cận làm tâm đối xứng.',
      },
      {
        id: 'q-2',
        prompt: 'Cho hàm số y = (2x + 1)/(x - 1). Tiệm cận đứng của đồ thị hàm số là đường thẳng:',
        topic: 'Tiệm cận đứng',
        options: [
          { id: 'opt-2a', label: 'A', text: 'x = 1' },
          { id: 'opt-2b', label: 'B', text: 'x = -1' },
          { id: 'opt-2c', label: 'C', text: 'y = 2' },
          { id: 'opt-2d', label: 'D', text: 'y = -1' },
        ],
        correctOptionId: 'opt-2a',
        explanation: 'Mẫu số bằng 0 khi x = 1 và tử số khác 0, nên x = 1 là tiệm cận đứng.',
      },
      {
        id: 'q-3',
        prompt: 'Đạo hàm của hàm số y = (ax + b)/(cx + d) được tính theo công thức:',
        topic: 'Đạo hàm phân thức',
        options: [
          { id: 'opt-3a', label: 'A', text: "y' = (ad - bc) / (cx + d)^2" },
          { id: 'opt-3b', label: 'B', text: "y' = (ad + bc) / (cx + d)^2" },
          { id: 'opt-3c', label: 'C', text: "y' = (bc - ad) / (cx + d)^2" },
          { id: 'opt-3d', label: 'D', text: "y' = (a + b) / (cx + d)^2" },
        ],
        correctOptionId: 'opt-3a',
        explanation: "Quy tắc đạo hàm thương u/v cho kết quả y' = (ad - bc) / (cx + d)^2.",
      },
    ],
  },
  {
    id: 'asm-math-01',
    lessonId: 'lesson-math-01',
    lessonTitle: 'Sự đồng biến, nghịch biến của hàm số',
    subjectId: 'math',
    subjectName: 'Toán học 12',
    chapterId: 'ch-01',
    chapterName: 'Chương 1: Ứng dụng đạo hàm để khảo sát hàm số',
    questionCount: 5,
    passingScore: 60,
    durationMinutes: 20,
    status: 'published',
    updatedAt: '2026-10-20T10:00:00Z',
    questions: [
      {
        id: 'q-math-1',
        prompt: "Cho hàm số f(x) có f'(x) > 0 với mọi x thuộc (a; b). Kết luận nào sau đây đúng?",
        topic: 'Tính đơn điệu',
        options: [
          { id: 'opt-1a', label: 'A', text: 'f(x) đồng biến trên khoảng (a; b)' },
          { id: 'opt-1b', label: 'B', text: 'f(x) nghịch biến trên khoảng (a; b)' },
          { id: 'opt-1c', label: 'C', text: 'f(x) đạt cực trị tại x = (a+b)/2' },
          { id: 'opt-1d', label: 'D', text: 'f(x) không đổi trên khoảng (a; b)' },
        ],
        correctOptionId: 'opt-1a',
        explanation: 'Định lý về dấu đạo hàm cấp một: Nếu đạo hàm dương trên khoảng thì hàm số đồng biến trên khoảng đó.',
      },
    ],
  },
  {
    id: 'asm-math-09',
    lessonId: 'lesson-math-09',
    lessonTitle: 'Tiệm cận đứng và tiệm cận ngang',
    subjectId: 'math',
    subjectName: 'Toán học 12',
    chapterId: 'ch-01',
    chapterName: 'Chương 1: Ứng dụng đạo hàm để khảo sát hàm số',
    questionCount: 4,
    passingScore: 70,
    durationMinutes: 15,
    status: 'in-review',
    updatedAt: '2026-10-27T07:45:00Z',
    questions: [],
  },
]

const INITIAL_TEACHERS: AdminTeacherItem[] = [
  {
    id: 'tch-01',
    name: 'Lê Thanh Thảo',
    email: 'thanh.thao@example.com',
    phone: '0912 345 678',
    subject: 'Vật lý 12',
    classes: ['12A1', '12A2'],
    studentCount: 73,
    status: 'active',
    joinedAt: '2026-08-15T11:00:00Z',
    rating: 4.9,
    qualifications: 'Thạc sĩ Vật lý Lý thuyết',
    experienceYears: 6,
    bio: 'Chuyên bồi dưỡng học sinh thi THPT Quốc gia chuyên đề Sóng cơ và Dao động.',
    accountStatus: 'ACTIVE',
  },
  {
    id: 'tch-02',
    name: 'Phạm Văn Nam',
    email: 'nam.pham@example.com',
    phone: '0988 765 432',
    subject: 'Toán học 12',
    classes: ['12A1', '11B1'],
    studentCount: 78,
    status: 'active',
    joinedAt: '2026-07-10T09:00:00Z',
    rating: 4.85,
    qualifications: 'Thạc sĩ Toán ứng dụng',
    experienceYears: 8,
    bio: 'Tác giả nhiều chuyên đề Giải tích 12, phương pháp giải nhanh trắc nghiệm.',
    accountStatus: 'ACTIVE',
  },
  {
    id: 'tch-03',
    name: 'Hoàng Mai Anh',
    email: 'mai.anh@example.com',
    phone: '0977 123 999',
    subject: 'Toán học 12',
    classes: ['12A2'],
    studentCount: 35,
    status: 'pending',
    joinedAt: '2026-10-25T14:00:00Z',
    rating: 4.7,
    qualifications: 'Cử nhân ĐH Sư phạm Hà Nội',
    experienceYears: 2,
    bio: 'Giáo viên trẻ năng động, ứng dụng phương pháp sư phạm kích hoạt tư duy.',
    accountStatus: 'PENDING',
  },
  {
    id: 'tch-04',
    name: 'Lý Quốc Bảo',
    email: 'quoc.bao@example.com',
    phone: '0934 555 777',
    subject: 'Vật lý 12',
    classes: ['11B1'],
    studentCount: 40,
    status: 'active',
    joinedAt: '2026-08-10T09:00:00Z',
    rating: 4.8,
    qualifications: 'Cử nhân Sư phạm Vật lý',
    experienceYears: 4,
    bio: 'Kinh nghiệm luyện thi trắc nghiệm và trực quan hóa thí nghiệm Vật lý số.',
    accountStatus: 'ACTIVE',
  },
  {
    id: 'tch-05',
    name: 'Vũ Thị Ngọc',
    email: 'ngoc.vu@example.com',
    phone: '0903 888 222',
    subject: 'Hóa học 12',
    classes: ['12A1', '12A2'],
    studentCount: 73,
    status: 'active',
    joinedAt: '2026-09-01T08:30:00Z',
    rating: 4.92,
    qualifications: 'Thạc sĩ Hóa học Hữu cơ',
    experienceYears: 7,
    bio: 'Giảng dạy hóa hữu cơ Este - Lipit, sơ đồ chuyển hóa nâng cao THPT.',
    accountStatus: 'ACTIVE',
  },
]

function readStorage<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key)
    if (!raw) return fallback
    return JSON.parse(raw) as T
  } catch {
    return fallback
  }
}

function writeStorage<T>(key: string, data: T): void {
  try {
    localStorage.setItem(key, JSON.stringify(data))
  } catch {
    // ignore
  }
}

export const educationService = {
  // ── SUBJECTS ───────────────────────────────────────────────
  async getSubjects(): Promise<CurriculumSubjectItem[]> {
    if (getAccessToken()) {
      const res = await apiClient.get<{
        items: Array<{
          id: string
          name: string
          code: string
          grade: string
          description?: string
          isActive: boolean
          chapterCount: number
          lessonCount: number
          updatedAt: string
        }>
        total: number
      }>('/api/v1/content/subjects')

      if (res?.items && Array.isArray(res.items)) {
        return res.items.map((s) => ({
          id: s.id,
          name: s.name,
          code: s.code,
          grade: s.grade ? (s.grade.startsWith('Lớp') ? s.grade : `Lớp ${s.grade}`) : 'Lớp 12',
          icon: resolveSubjectIcon(s.code, s.name, undefined, s.description),
          description: s.description || '',
          chapterCount: s.chapterCount || 0,
          lessonCount: s.lessonCount || 0,
          assessmentCount: 0,
          publishedPercent: s.isActive ? 100 : 0,
          status: s.isActive ? 'published' : 'draft',
          updatedAt: s.updatedAt,
        }))
      }
      throw new Error('API môn học trả dữ liệu không hợp lệ')
    }
    return readStorage<CurriculumSubjectItem[]>(STORAGE_KEYS.SUBJECTS, INITIAL_SUBJECTS)
  },

  async getSubjectById(id: string): Promise<CurriculumSubjectItem | undefined> {
    if (getAccessToken()) {
      try {
        const s = await apiClient.get<{
          id: string
          name: string
          code: string
          grade: string
          description?: string
          isActive: boolean
          updatedAt: string
          chapters?: Array<{
            id: string
            lessons?: Array<{ id: string }>
          }>
        }>(`/api/v1/content/subjects/${id}`)

        if (s && s.id) {
          const chapterCount = s.chapters?.length || 0
          const lessonCount = s.chapters?.reduce((sum, ch) => sum + (ch.lessons?.length || 0), 0) || 0
          return {
            id: s.id,
            name: s.name,
            code: s.code,
            grade: s.grade ? (s.grade.startsWith('Lớp') ? s.grade : `Lớp ${s.grade}`) : 'Lớp 12',
            icon: resolveSubjectIcon(s.code, s.name, undefined, s.description),
            description: s.description || '',
            chapterCount,
            lessonCount,
            assessmentCount: 0,
            publishedPercent: s.isActive ? 100 : 0,
            status: s.isActive ? 'published' : 'draft',
            updatedAt: s.updatedAt,
          }
        }
      } catch (err: any) {
        if (err?.response?.status === 404 || err?.status === 404) {
          return undefined
        }
        throw err
      }
    }
    const subjects = await this.getSubjects()
    return subjects.find((s) => s.id === id)
  },

  async createSubject(
    input: Omit<CurriculumSubjectItem, 'id' | 'chapterCount' | 'lessonCount' | 'assessmentCount' | 'publishedPercent' | 'updatedAt'>
  ): Promise<CurriculumSubjectItem> {
    if (getAccessToken()) {
      const gradeNum = input.grade ? input.grade.replace(/[^0-9]/g, '') || '12' : '12'
      const created = await apiClient.post<{
        id: string
        name: string
        code: string
        grade: string
        description?: string
        isActive: boolean
        chapterCount: number
        lessonCount: number
        updatedAt: string
      }>('/api/v1/content/subjects', {
        name: input.name.trim(),
        code: input.code.trim().toUpperCase(),
        grade: gradeNum,
        description: input.description?.trim(),
        isActive: input.status === 'published',
      })

      window.dispatchEvent(new CustomEvent('study_ai_education_change'))
      return {
        id: created.id,
        name: created.name,
        code: created.code,
        grade: created.grade ? (created.grade.startsWith('Lớp') ? created.grade : `Lớp ${created.grade}`) : 'Lớp 12',
        icon: resolveSubjectIcon(created.code, created.name, input.icon, created.description),
        description: created.description || '',
        chapterCount: created.chapterCount || 0,
        lessonCount: created.lessonCount || 0,
        assessmentCount: 0,
        publishedPercent: created.isActive ? 100 : 0,
        status: created.isActive ? 'published' : 'draft',
        updatedAt: created.updatedAt,
      }
    }

    const subjects = await this.getSubjects()
    const id = `subj-${Date.now().toString(36)}`
    const newSubject: CurriculumSubjectItem = {
      ...input,
      id,
      chapterCount: 0,
      lessonCount: 0,
      assessmentCount: 0,
      publishedPercent: input.status === 'published' ? 100 : 0,
      updatedAt: new Date().toISOString(),
    }
    const updated = [newSubject, ...subjects]
    writeStorage(STORAGE_KEYS.SUBJECTS, updated)
    return newSubject
  },

  async updateSubject(
    id: string,
    updates: Partial<CurriculumSubjectItem>
  ): Promise<CurriculumSubjectItem | undefined> {
    if (getAccessToken()) {
      const body: Record<string, any> = {}
      if (updates.name !== undefined) body.name = updates.name.trim()
      if (updates.code !== undefined) body.code = updates.code.trim().toUpperCase()
      if (updates.grade !== undefined) body.grade = updates.grade.replace(/[^0-9]/g, '') || '12'
      if (updates.description !== undefined) body.description = updates.description.trim()
      if (updates.status !== undefined) body.isActive = updates.status === 'published'

      const updated = await apiClient.patch<{
        id: string
        name: string
        code: string
        grade: string
        description?: string
        isActive: boolean
        chapterCount: number
        lessonCount: number
        updatedAt: string
      }>(`/api/v1/content/subjects/${id}`, body)

      window.dispatchEvent(new CustomEvent('study_ai_education_change'))
      return {
        id: updated.id,
        name: updated.name,
        code: updated.code,
        grade: updated.grade ? (updated.grade.startsWith('Lớp') ? updated.grade : `Lớp ${updated.grade}`) : 'Lớp 12',
        icon: resolveSubjectIcon(updated.code, updated.name, updates.icon, updated.description),
        description: updated.description || '',
        chapterCount: updated.chapterCount || 0,
        lessonCount: updated.lessonCount || 0,
        assessmentCount: 0,
        publishedPercent: updated.isActive ? 100 : 0,
        status: updated.isActive ? 'published' : 'draft',
        updatedAt: updated.updatedAt,
      }
    }

    const subjects = await this.getSubjects()
    let found: CurriculumSubjectItem | undefined
    const updated = subjects.map((s) => {
      if (s.id === id) {
        found = {
          ...s,
          ...updates,
          updatedAt: new Date().toISOString(),
        }
        return found
      }
      return s
    })
    writeStorage(STORAGE_KEYS.SUBJECTS, updated)
    return found
  },

  async deleteSubject(id: string): Promise<boolean> {
    if (getAccessToken()) {
      await apiClient.delete(`/api/v1/content/subjects/${id}`)
      window.dispatchEvent(new CustomEvent('study_ai_education_change'))
      return true
    }

    const subjects = await this.getSubjects()
    const filtered = subjects.filter((s) => s.id !== id)
    if (filtered.length !== subjects.length) {
      writeStorage(STORAGE_KEYS.SUBJECTS, filtered)
      return true
    }
    return false
  },

  // ── CHAPTERS ───────────────────────────────────────────────
  async getChapters(subjectId?: string): Promise<CurriculumChapterItem[]> {
    if (getAccessToken()) {
      const queryParams = new URLSearchParams()
      if (subjectId && subjectId !== 'all') {
        queryParams.set('subjectId', subjectId)
      }
      const qs = queryParams.toString() ? `?${queryParams.toString()}` : ''
      const res = await apiClient.get<{
        items: Array<{
          id: string
          subjectId: string
          subjectName: string
          title: string
          description?: string
          orderIndex: number
          isActive: boolean
          lessonCount: number
          createdAt: string
          updatedAt: string
        }>
        total: number
      }>(`/api/v1/content/chapters${qs}`)

      if (res?.items && Array.isArray(res.items)) {
        return res.items.map((c) => ({
          id: c.id,
          subjectId: c.subjectId,
          subjectName: c.subjectName,
          title: c.title,
          description: c.description || '',
          order: c.orderIndex,
          lessonsCount: c.lessonCount,
          status: c.isActive ? 'published' : 'draft',
          updatedAt: c.updatedAt,
        }))
      }
      return []
    }

    let chapters = readStorage<CurriculumChapterItem[]>(STORAGE_KEYS.CHAPTERS, INITIAL_CHAPTERS)
    if (subjectId && subjectId !== 'all') {
      chapters = chapters.filter((c) => c.subjectId === subjectId)
    }
    return chapters.sort((a, b) => a.order - b.order)
  },

  async getChapterById(id: string): Promise<CurriculumChapterItem | undefined> {
    if (getAccessToken()) {
      try {
        const c = await apiClient.get<{
          id: string
          subjectId: string
          subjectName: string
          title: string
          description?: string
          orderIndex: number
          isActive: boolean
          lessonCount: number
          createdAt: string
          updatedAt: string
        }>(`/api/v1/content/chapters/${id}`)

        if (c?.id) {
          return {
            id: c.id,
            subjectId: c.subjectId,
            subjectName: c.subjectName,
            title: c.title,
            description: c.description || '',
            order: c.orderIndex,
            lessonsCount: c.lessonCount,
            status: c.isActive ? 'published' : 'draft',
            updatedAt: c.updatedAt,
          }
        }
        return undefined
      } catch (err: any) {
        if (err?.response?.status === 404 || err?.status === 404) {
          return undefined
        }
        throw err
      }
    }

    const chapters = await this.getChapters()
    return chapters.find((c) => c.id === id)
  },

  async createChapter(
    input: Omit<CurriculumChapterItem, 'id' | 'lessonsCount' | 'updatedAt'>
  ): Promise<CurriculumChapterItem> {
    if (getAccessToken()) {
      const res = await apiClient.post<{
        id: string
        subjectId: string
        subjectName: string
        title: string
        description?: string
        orderIndex: number
        isActive: boolean
        lessonCount: number
        createdAt: string
        updatedAt: string
      }>('/api/v1/content/chapters', {
        subjectId: input.subjectId,
        title: input.title,
        description: input.description ?? '',
        orderIndex: input.order || 1,
        isActive: input.status === 'published',
      })
      if (res?.id) {
        window.dispatchEvent(new CustomEvent('study_ai_education_change'))
        return {
          id: res.id,
          subjectId: res.subjectId,
          subjectName: res.subjectName,
          title: res.title,
          description: res.description ?? '',
          order: res.orderIndex,
          lessonsCount: res.lessonCount,
          status: res.isActive ? 'published' : 'draft',
          updatedAt: res.updatedAt,
        }
      }
      throw new Error('API tạo chương học không trả về kết quả hợp lệ.')
    }

    const chapters = await this.getChapters()
    const id = `ch-${Date.now().toString(36)}`
    const newChapter: CurriculumChapterItem = {
      ...input,
      id,
      lessonsCount: 0,
      updatedAt: new Date().toISOString(),
    }
    const updated = [...chapters, newChapter]
    writeStorage(STORAGE_KEYS.CHAPTERS, updated)

    // Update subject chapterCount
    const subjects = await this.getSubjects()
    const subj = subjects.find((s) => s.id === input.subjectId)
    if (subj) {
      await this.updateSubject(subj.id, { chapterCount: (subj.chapterCount || 0) + 1 })
    }

    return newChapter
  },

  async updateChapter(
    id: string,
    updates: Partial<CurriculumChapterItem>
  ): Promise<CurriculumChapterItem | undefined> {
    if (getAccessToken()) {
      const payload: Record<string, any> = {}
      if (updates.title !== undefined) payload.title = updates.title
      if (updates.description !== undefined) payload.description = updates.description
      if (updates.order !== undefined) payload.orderIndex = updates.order
      if (updates.status !== undefined) payload.isActive = updates.status === 'published'

      const res = await apiClient.patch<{
        id: string
        subjectId: string
        subjectName: string
        title: string
        description?: string
        orderIndex: number
        isActive: boolean
        lessonCount: number
        createdAt: string
        updatedAt: string
      }>(`/api/v1/content/chapters/${id}`, payload)
      if (res?.id) {
        window.dispatchEvent(new CustomEvent('study_ai_education_change'))
        return {
          id: res.id,
          subjectId: res.subjectId,
          subjectName: res.subjectName,
          title: res.title,
          description: res.description ?? '',
          order: res.orderIndex,
          lessonsCount: res.lessonCount,
          status: res.isActive ? 'published' : 'draft',
          updatedAt: res.updatedAt,
        }
      }
      throw new Error('API cập nhật chương học không trả về kết quả hợp lệ.')
    }

    const chapters = await this.getChapters()
    let found: CurriculumChapterItem | undefined
    const updated = chapters.map((c) => {
      if (c.id === id) {
        found = {
          ...c,
          ...updates,
          updatedAt: new Date().toISOString(),
        }
        return found
      }
      return c
    })
    writeStorage(STORAGE_KEYS.CHAPTERS, updated)
    return found
  },

  async deleteChapter(id: string): Promise<boolean> {
    if (getAccessToken()) {
      await apiClient.delete(`/api/v1/content/chapters/${id}`)
      window.dispatchEvent(new CustomEvent('study_ai_education_change'))
      return true
    }

    const chapters = await this.getChapters()
    const toDelete = chapters.find((c) => c.id === id)
    const filtered = chapters.filter((c) => c.id !== id)
    if (filtered.length !== chapters.length) {
      writeStorage(STORAGE_KEYS.CHAPTERS, filtered)
      if (toDelete) {
        const subjects = await this.getSubjects()
        const subj = subjects.find((s) => s.id === toDelete.subjectId)
        if (subj && subj.chapterCount > 0) {
          await this.updateSubject(subj.id, { chapterCount: subj.chapterCount - 1 })
        }
      }
      return true
    }
    return false
  },

  async reorderChapters(subjectId: string, orderedIds: string[]): Promise<CurriculumChapterItem[]> {
    if (getAccessToken()) {
      await apiClient.post('/api/v1/content/chapters/reorder', {
        subjectId,
        chapterIds: orderedIds,
      })
      window.dispatchEvent(new CustomEvent('study_ai_education_change'))
      return this.getChapters(subjectId)
    }

    const allChapters = await this.getChapters()
    const updated = allChapters.map((c) => {
      if (c.subjectId === subjectId) {
        const newOrder = orderedIds.indexOf(c.id) + 1
        if (newOrder > 0) {
          return { ...c, order: newOrder, updatedAt: new Date().toISOString() }
        }
      }
      return c
    })
    writeStorage(STORAGE_KEYS.CHAPTERS, updated)
    return updated.filter((c) => c.subjectId === subjectId).sort((a, b) => a.order - b.order)
  },

  // ── TOPICS ─────────────────────────────────────────────────
  async getTopics(chapterId?: string, search?: string): Promise<CurriculumTopicItem[]> {
    if (getAccessToken()) {
      const params = new URLSearchParams()
      if (chapterId && chapterId !== 'all') params.set('chapterId', chapterId)
      if (search?.trim()) params.set('search', search.trim())
      const qs = params.toString() ? `?${params.toString()}` : ''
      const res = await apiClient.get<{
        items: CurriculumTopicItem[]
        total: number
      }>(`/api/v1/content/topics${qs}`)
      if (res?.items && Array.isArray(res.items)) {
        return res.items
      }
      return []
    }
    return []
  },

  async createTopic(input: {
    chapterId: string
    title: string
    description?: string
    orderIndex?: number
    isActive?: boolean
  }): Promise<CurriculumTopicItem | null> {
    if (getAccessToken()) {
      const res = await apiClient.post<CurriculumTopicItem>('/api/v1/content/topics', {
        chapterId: input.chapterId,
        title: input.title,
        description: input.description || '',
        orderIndex: input.orderIndex || 1,
        isActive: input.isActive ?? true,
      })
      return res
    }
    return null
  },

  async updateTopic(
    id: string,
    updates: {
      title?: string
      description?: string
      orderIndex?: number
      isActive?: boolean
    }
  ): Promise<CurriculumTopicItem | null> {
    if (getAccessToken()) {
      const res = await apiClient.patch<CurriculumTopicItem>(`/api/v1/content/topics/${id}`, updates)
      return res
    }
    return null
  },

  async deleteTopic(id: string): Promise<boolean> {
    if (getAccessToken()) {
      await apiClient.delete(`/api/v1/content/topics/${id}`)
      return true
    }
    return false
  },

  // ── LESSON VIDEOS ──────────────────────────────────────────
  async getLessonVideos(lessonId: string): Promise<CurriculumLessonVideoItem[]> {
    if (getAccessToken()) {
      const res = await apiClient.get<{
        items: CurriculumLessonVideoItem[]
        total: number
      }>(`/api/v1/content/lessons/${lessonId}/videos`)
      if (res?.items && Array.isArray(res.items)) {
        return res.items
      }
      return []
    }
    return []
  },

  async addLessonVideo(
    lessonId: string,
    data: {
      title: string
      sourceUrl: string
      description?: string
      provider?: string
      sortOrder?: number
      isPublished?: boolean
      embedAllowed?: boolean
      language?: string
    }
  ): Promise<CurriculumLessonVideoItem | null> {
    if (getAccessToken()) {
      const res = await apiClient.post<CurriculumLessonVideoItem>(
        `/api/v1/content/lessons/${lessonId}/videos`,
        {
          title: data.title,
          sourceUrl: data.sourceUrl,
          description: data.description,
          provider: data.provider,
          sortOrder: data.sortOrder || 1,
          isPublished: data.isPublished ?? true,
          embedAllowed: data.embedAllowed ?? true,
          language: data.language || 'vi',
        }
      )
      return res
    }
    return null
  },

  async updateLessonVideo(
    videoId: string,
    data: Partial<{
      title: string
      sourceUrl: string
      description?: string
      provider?: string
      sortOrder?: number
      isPublished?: boolean
      embedAllowed?: boolean
      language?: string
    }>
  ): Promise<CurriculumLessonVideoItem | null> {
    if (getAccessToken()) {
      const res = await apiClient.patch<CurriculumLessonVideoItem>(
        `/api/v1/content/videos/${videoId}`,
        data
      )
      return res
    }
    return null
  },

  async deleteLessonVideo(videoId: string): Promise<boolean> {
    if (getAccessToken()) {
      await apiClient.delete(`/api/v1/content/videos/${videoId}`)
      return true
    }
    return false
  },

  // ── LESSONS ────────────────────────────────────────────────
  async getLessons(filter?: {
    subjectId?: string
    chapterId?: string
    topicId?: string
    status?: string
    search?: string
    page?: number
    pageSize?: number
  }): Promise<CurriculumLessonItem[]> {
    if (getAccessToken()) {
      const params = new URLSearchParams()
      if (filter?.subjectId && filter.subjectId !== 'all') params.set('subjectId', filter.subjectId)
      if (filter?.chapterId && filter.chapterId !== 'all') params.set('chapterId', filter.chapterId)
      if (filter?.topicId && filter.topicId !== 'all') params.set('topicId', filter.topicId)
      if (filter?.status && filter.status !== 'all') params.set('status', filter.status)
      if (filter?.search?.trim()) params.set('search', filter.search.trim())
      params.set('page', String(filter?.page || 1))
      params.set('pageSize', String(filter?.pageSize || 100))

      const res = await apiClient.get<{
        items: Array<{
          id: string
          subjectId: string
          subjectName: string
          chapterId: string
          chapterTitle: string
          topicId?: string | null
          topicTitle?: string | null
          title: string
          slug: string
          orderIndex: number
          status: ContentStatus
          difficulty?: string
          estimatedMinutes?: number
          authorName?: string
          questionCount: number
          videoCount?: number
          createdAt: string
          updatedAt: string
        }>
        total: number
      }>(`/api/v1/content/lessons?${params.toString()}`)

      if (res?.items && Array.isArray(res.items)) {
        return res.items.map((l) => ({
          id: l.id,
          title: l.title,
          subjectId: l.subjectId,
          subjectName: l.subjectName,
          chapterId: l.chapterId,
          chapterName: l.chapterTitle,
          topicId: l.topicId || undefined,
          topicTitle: l.topicTitle || undefined,
          status: l.status,
          authorName: l.authorName || 'Quản trị viên',
          updatedAt: l.updatedAt,
          hasAssessment: l.questionCount > 0,
          order: l.orderIndex,
          videos: (l as any).videos || [],
          videoCount: (l as any).videos?.length ?? (l as any).videoCount ?? 0,
        }))
      }
      return []
    }

    let lessons = readStorage<CurriculumLessonItem[]>(STORAGE_KEYS.LESSONS, INITIAL_LESSONS)

    if (filter?.subjectId && filter.subjectId !== 'all') {
      lessons = lessons.filter((l) => l.subjectId === filter.subjectId)
    }
    if (filter?.chapterId && filter.chapterId !== 'all') {
      lessons = lessons.filter((l) => l.chapterId === filter.chapterId)
    }
    if (filter?.status && filter.status !== 'all') {
      lessons = lessons.filter((l) => l.status === filter.status)
    }
    if (filter?.search?.trim()) {
      const q = filter.search.trim().toLowerCase()
      lessons = lessons.filter(
        (l) =>
          l.title.toLowerCase().includes(q) ||
          l.authorName.toLowerCase().includes(q) ||
          l.chapterName.toLowerCase().includes(q)
      )
    }

    return lessons
  },

  async getLessonById(id: string): Promise<CurriculumLessonItem | undefined> {
    if (getAccessToken()) {
      try {
        const res = await apiClient.get<{
          id: string
          chapterId: string
          chapterTitle: string
          subjectId: string
          subjectName: string
          topicId?: string | null
          topicTitle?: string | null
          title: string
          slug: string
          orderIndex: number
          status: ContentStatus
          authorName?: string
          updatedAt: string
          questions?: any[]
        }>(`/api/v1/content/lessons/${id}`)

        if (res?.id) {
          return {
            id: res.id,
            title: res.title,
            subjectId: res.subjectId,
            subjectName: res.subjectName,
            chapterId: res.chapterId,
            chapterName: res.chapterTitle,
            topicId: res.topicId || undefined,
            topicTitle: res.topicTitle || undefined,
            status: res.status,
            authorName: res.authorName || 'Quản trị viên',
            updatedAt: res.updatedAt,
            hasAssessment: (res.questions?.length ?? 0) > 0,
            order: res.orderIndex,
          }
        }
        return undefined
      } catch (err: any) {
        if (err?.response?.status === 404 || err?.status === 404) {
          return undefined
        }
        throw err
      }
    }

    const lessons = await this.getLessons()
    return lessons.find((l) => l.id === id)
  },

  async createLesson(
    input: Omit<CurriculumLessonItem, 'id' | 'updatedAt'>
  ): Promise<CurriculumLessonItem> {
    if (getAccessToken()) {
      const res = await apiClient.post<{
        id: string
        chapterId: string
        chapterTitle: string
        subjectId: string
        subjectName: string
        topicId?: string | null
        topicTitle?: string | null
        title: string
        slug: string
        orderIndex: number
        status: ContentStatus
        authorName?: string
        updatedAt: string
      }>('/api/v1/content/lessons', {
        chapterId: input.chapterId,
        topicId: input.topicId || null,
        title: input.title,
        slug: input.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').slice(0, 40),
        orderIndex: input.order || 1,
        introduction: '',
      })

      if (res?.id) {
        return {
          id: res.id,
          title: res.title,
          subjectId: res.subjectId,
          subjectName: res.subjectName,
          chapterId: res.chapterId,
          chapterName: res.chapterTitle,
          topicId: res.topicId || undefined,
          topicTitle: res.topicTitle || undefined,
          status: res.status,
          authorName: res.authorName || 'Quản trị viên',
          updatedAt: res.updatedAt,
          hasAssessment: false,
          order: res.orderIndex,
        }
      }
      throw new Error('API tạo bài học không trả về kết quả hợp lệ.')
    }

    const lessons = await this.getLessons()
    const id = `lesson-${Date.now().toString(36)}`
    const newLesson: CurriculumLessonItem = {
      ...input,
      id,
      updatedAt: new Date().toISOString(),
    }
    const updated = [newLesson, ...lessons]
    writeStorage(STORAGE_KEYS.LESSONS, updated)

    // Update subject lessonCount
    const subjects = await this.getSubjects()
    const subj = subjects.find((s) => s.id === input.subjectId)
    if (subj) {
      await this.updateSubject(subj.id, { lessonCount: (subj.lessonCount || 0) + 1 })
    }

    // Update chapter lessonCount
    const chapters = await this.getChapters()
    const ch = chapters.find((c) => c.id === input.chapterId)
    if (ch) {
      await this.updateChapter(ch.id, { lessonsCount: (ch.lessonsCount || 0) + 1 })
    }

    return newLesson
  },

  async updateLesson(
    id: string,
    updates: Partial<CurriculumLessonItem>
  ): Promise<CurriculumLessonItem | undefined> {
    if (getAccessToken()) {
      const res = await apiClient.patch<{
        id: string
        chapterId: string
        chapterTitle: string
        subjectId: string
        subjectName: string
        topicId?: string | null
        topicTitle?: string | null
        title: string
        slug: string
        orderIndex: number
        status: ContentStatus
        authorName?: string
        updatedAt: string
      }>(`/api/v1/content/lessons/${id}`, {
        title: updates.title,
        chapterId: updates.chapterId,
        topicId: updates.topicId,
        orderIndex: updates.order,
        status: updates.status,
      })

      if (res?.id) {
        return {
          id: res.id,
          title: res.title,
          subjectId: res.subjectId,
          subjectName: res.subjectName,
          chapterId: res.chapterId,
          chapterName: res.chapterTitle,
          topicId: res.topicId || undefined,
          topicTitle: res.topicTitle || undefined,
          status: res.status,
          authorName: res.authorName || 'Quản trị viên',
          updatedAt: res.updatedAt,
          hasAssessment: updates.hasAssessment ?? false,
          order: res.orderIndex,
        }
      }
      throw new Error('API cập nhật bài học không trả về kết quả hợp lệ.')
    }

    const lessons = await this.getLessons()
    let found: CurriculumLessonItem | undefined
    const updated = lessons.map((l) => {
      if (l.id === id) {
        found = {
          ...l,
          ...updates,
          updatedAt: new Date().toISOString(),
        }
        return found
      }
      return l
    })
    writeStorage(STORAGE_KEYS.LESSONS, updated)
    return found
  },

  async deleteLesson(id: string): Promise<boolean> {
    if (getAccessToken()) {
      await apiClient.delete(`/api/v1/content/lessons/${id}`)
      return true
    }

    const lessons = await this.getLessons()
    const toDelete = lessons.find((l) => l.id === id)
    const filtered = lessons.filter((l) => l.id !== id)
    if (filtered.length !== lessons.length) {
      writeStorage(STORAGE_KEYS.LESSONS, filtered)
      if (toDelete) {
        const subjects = await this.getSubjects()
        const subj = subjects.find((s) => s.id === toDelete.subjectId)
        if (subj && subj.lessonCount > 0) {
          await this.updateSubject(subj.id, { lessonCount: subj.lessonCount - 1 })
        }
        const chapters = await this.getChapters()
        const ch = chapters.find((c) => c.id === toDelete.chapterId)
        if (ch && ch.lessonsCount > 0) {
          await this.updateChapter(ch.id, { lessonsCount: ch.lessonsCount - 1 })
        }
      }
      return true
    }
    return false
  },

  async changeLessonStatus(id: string, status: ContentStatus): Promise<CurriculumLessonItem | undefined> {
    return this.updateLesson(id, { status })
  },

  // ── ASSESSMENTS ────────────────────────────────────────────
  async getAssessments(filter?: {
    subjectId?: string
    status?: string
    search?: string
  }): Promise<CurriculumAssessmentItem[]> {
    let assessments = readStorage<CurriculumAssessmentItem[]>(STORAGE_KEYS.ASSESSMENTS, INITIAL_ASSESSMENTS)

    if (filter?.subjectId && filter.subjectId !== 'all') {
      assessments = assessments.filter((a) => a.subjectId === filter.subjectId)
    }
    if (filter?.status && filter.status !== 'all') {
      assessments = assessments.filter((a) => a.status === filter.status)
    }
    if (filter?.search?.trim()) {
      const q = filter.search.trim().toLowerCase()
      assessments = assessments.filter((a) => a.lessonTitle.toLowerCase().includes(q))
    }

    return assessments
  },

  async getAssessmentById(id: string): Promise<CurriculumAssessmentItem | undefined> {
    const assessments = await this.getAssessments()
    return assessments.find((a) => a.id === id)
  },

  async createAssessment(
    input: Omit<CurriculumAssessmentItem, 'id' | 'updatedAt'>
  ): Promise<CurriculumAssessmentItem> {
    const assessments = await this.getAssessments()
    const id = `asm-${Date.now().toString(36)}`
    const newAssessment: CurriculumAssessmentItem = {
      ...input,
      id,
      updatedAt: new Date().toISOString(),
    }
    const updated = [newAssessment, ...assessments]
    writeStorage(STORAGE_KEYS.ASSESSMENTS, updated)

    // Mark corresponding lesson hasAssessment = true
    await this.updateLesson(input.lessonId, { hasAssessment: true })

    // Update subject assessmentCount
    const subjects = await this.getSubjects()
    const subj = subjects.find((s) => s.id === input.subjectId)
    if (subj) {
      await this.updateSubject(subj.id, { assessmentCount: (subj.assessmentCount || 0) + 1 })
    }

    return newAssessment
  },

  async updateAssessment(
    id: string,
    updates: Partial<CurriculumAssessmentItem>
  ): Promise<CurriculumAssessmentItem | undefined> {
    const assessments = await this.getAssessments()
    let found: CurriculumAssessmentItem | undefined
    const updated = assessments.map((a) => {
      if (a.id === id) {
        found = {
          ...a,
          ...updates,
          questionCount: updates.questions ? updates.questions.length : a.questionCount,
          updatedAt: new Date().toISOString(),
        }
        return found
      }
      return a
    })
    writeStorage(STORAGE_KEYS.ASSESSMENTS, updated)
    return found
  },

  async deleteAssessment(id: string): Promise<boolean> {
    const assessments = await this.getAssessments()
    const filtered = assessments.filter((a) => a.id !== id)
    if (filtered.length !== assessments.length) {
      writeStorage(STORAGE_KEYS.ASSESSMENTS, filtered)
      return true
    }
    return false
  },

  async changeAssessmentStatus(id: string, status: ContentStatus): Promise<CurriculumAssessmentItem | undefined> {
    return this.updateAssessment(id, { status })
  },

  async addQuestionToAssessment(
    assessmentId: string,
    question: Omit<AssessmentQuestionItem, 'id'>
  ): Promise<CurriculumAssessmentItem | undefined> {
    const assessment = await this.getAssessmentById(assessmentId)
    if (!assessment) return undefined

    const newQ: AssessmentQuestionItem = {
      ...question,
      id: `q-${Date.now().toString(36)}`,
    }

    const updatedQuestions = [...assessment.questions, newQ]
    return this.updateAssessment(assessmentId, {
      questions: updatedQuestions,
      questionCount: updatedQuestions.length,
    })
  },

  // ── TEACHERS ───────────────────────────────────────────────
  async getTeachers(filter?: {
    subject?: string
    status?: string
    search?: string
  }): Promise<AdminTeacherItem[]> {
    let teachers = readStorage<AdminTeacherItem[]>(STORAGE_KEYS.TEACHERS, INITIAL_TEACHERS)

    if (filter?.subject && filter.subject !== 'all') {
      teachers = teachers.filter((t) => t.subject.toLowerCase().includes(filter.subject!.toLowerCase()))
    }
    if (filter?.status && filter.status !== 'all') {
      teachers = teachers.filter((t) => t.status === filter.status)
    }
    if (filter?.search?.trim()) {
      const q = filter.search.trim().toLowerCase()
      teachers = teachers.filter(
        (t) => t.name.toLowerCase().includes(q) || t.email.toLowerCase().includes(q)
      )
    }

    return teachers
  },

  async getTeacherById(id: string): Promise<AdminTeacherItem | undefined> {
    const teachers = await this.getTeachers()
    return teachers.find((t) => t.id === id)
  },

  async saveTeacher(data: {
    name: string
    email: string
    phone?: string
    subject: string
    classes?: string[]
    status?: 'active' | 'pending' | 'inactive'
    qualifications?: string
    experienceYears?: number
    bio?: string
  }): Promise<AdminTeacherItem> {
    const teachers = readStorage<AdminTeacherItem[]>(STORAGE_KEYS.TEACHERS, INITIAL_TEACHERS)
    const newTeacher: AdminTeacherItem = {
      id: `tch-${Date.now().toString(36)}`,
      name: data.name,
      email: data.email,
      phone: data.phone || '0901 234 567',
      subject: data.subject,
      classes: data.classes || ['12A1'],
      studentCount: 35,
      status: data.status || 'active',
      joinedAt: new Date().toISOString(),
      rating: 5.0,
      qualifications: data.qualifications || 'Cử nhân Sư phạm',
      experienceYears: data.experienceYears || 3,
      bio: data.bio || 'Giáo viên bộ môn tâm huyết với học sinh.',
      accountStatus: 'ACTIVE',
    }
    const updated = [newTeacher, ...teachers]
    writeStorage(STORAGE_KEYS.TEACHERS, updated)
    return newTeacher
  },

  async updateTeacher(id: string, updates: Partial<AdminTeacherItem>): Promise<AdminTeacherItem> {
    const teachers = readStorage<AdminTeacherItem[]>(STORAGE_KEYS.TEACHERS, INITIAL_TEACHERS)
    const idx = teachers.findIndex((t) => t.id === id)
    if (idx === -1) throw new Error(`Teacher with id ${id} not found`)
    const updatedTeacher = { ...teachers[idx], ...updates }
    teachers[idx] = updatedTeacher
    writeStorage(STORAGE_KEYS.TEACHERS, teachers)
    return updatedTeacher
  },

  async setTeacherStatus(id: string, status: 'active' | 'pending' | 'inactive'): Promise<AdminTeacherItem> {
    return this.updateTeacher(id, { status })
  },

  async toggleTeacherLock(id: string): Promise<AdminTeacherItem> {
    const teacher = await this.getTeacherById(id)
    if (!teacher) throw new Error(`Teacher with id ${id} not found`)
    const nextStatus = teacher.accountStatus === 'LOCKED' ? 'ACTIVE' : 'LOCKED'
    return this.updateTeacher(id, { accountStatus: nextStatus })
  },

  async deleteTeacher(id: string): Promise<boolean> {
    const teachers = readStorage<AdminTeacherItem[]>(STORAGE_KEYS.TEACHERS, INITIAL_TEACHERS)
    const filtered = teachers.filter((t) => t.id !== id)
    writeStorage(STORAGE_KEYS.TEACHERS, filtered)
    return true
  },

  async getTeacherKPIs(): Promise<{
    totalTeachers: number
    activeTeaching: number
    pendingOrLeave: number
    newTeachers: number
  }> {
    const teachers = readStorage<AdminTeacherItem[]>(STORAGE_KEYS.TEACHERS, INITIAL_TEACHERS)
    const totalTeachers = teachers.length
    const activeTeaching = teachers.filter((t) => t.status === 'active').length
    const pendingOrLeave = teachers.filter((t) => t.status !== 'active').length
    const thirtyDaysAgo = Date.now() - 30 * 24 * 60 * 60 * 1000
    const newTeachers = teachers.filter((t) => new Date(t.joinedAt).getTime() > thirtyDaysAgo).length
    return {
      totalTeachers,
      activeTeaching,
      pendingOrLeave,
      newTeachers: Math.max(newTeachers, 1),
    }
  },

  // ── LEARNING REPORTS ───────────────────────────────────────
  async getReports(filter?: {
    timeframe?: string
    subjectId?: string
    classId?: string
  }): Promise<LearningReportsData> {
    // Return realistic analytics with filters applied
    const tf = filter?.timeframe || '30d'
    const days = tf === '7d' ? 7 : tf === 'term' ? 90 : 30

    const activityTrend = []
    const now = new Date()
    for (let i = days - 1; i >= 0; i--) {
      const d = new Date(now)
      d.setDate(d.getDate() - i)
      const dateStr = d.toLocaleDateString('vi-VN', { month: 'numeric', day: 'numeric' })
      const baseActive = 650 + Math.floor(Math.sin(i / 3) * 120) + (i % 5) * 20
      const baseCompleted = 420 + Math.floor(Math.cos(i / 2) * 80) + (i % 4) * 25
      activityTrend.push({
        date: dateStr,
        activeUsers: baseActive,
        lessonsCompleted: baseCompleted,
      })
    }

    const subjectProgress = [
      { subject: 'Toán học 12', progress: 78, learnersCount: 920 },
      { subject: 'Vật lý 12', progress: 65, learnersCount: 780 },
      { subject: 'Hóa học 12', progress: 58, learnersCount: 710 },
      { subject: 'Ngữ văn 12', progress: 82, learnersCount: 840 },
      { subject: 'Tiếng Anh 12', progress: 86, learnersCount: 890 },
    ]

    const scoreDistribution = [
      { range: 'Xuất sắc (9.0 - 10)', count: 340, percent: 27 },
      { range: 'Giỏi (8.0 - 8.9)', count: 520, percent: 41 },
      { range: 'Khá (6.5 - 7.9)', count: 280, percent: 22 },
      { range: 'Trung bình (< 6.5)', count: 140, percent: 10 },
    ]

    return {
      totalLearners: 1280,
      activeLearners: 890,
      completedLessons: 14250,
      completionRatePercent: 76.5,
      averageAssessmentScore: 8.2,
      activityTrend,
      subjectProgress: filter?.subjectId && filter.subjectId !== 'all'
        ? subjectProgress.filter((s) => s.subject.toLowerCase().includes(filter.subjectId!.toLowerCase()))
        : subjectProgress,
      scoreDistribution,
    }
  },

  _resetEducationMockState(): void {
    writeStorage(STORAGE_KEYS.SUBJECTS, INITIAL_SUBJECTS)
    writeStorage(STORAGE_KEYS.CHAPTERS, INITIAL_CHAPTERS)
    writeStorage(STORAGE_KEYS.LESSONS, INITIAL_LESSONS)
    writeStorage(STORAGE_KEYS.ASSESSMENTS, INITIAL_ASSESSMENTS)
    writeStorage(STORAGE_KEYS.TEACHERS, INITIAL_TEACHERS)
  },
}

import type {
  AdminTeacherItem,
  CurriculumAssessmentItem,
  CurriculumChapterItem,
  CurriculumLessonItem,
  CurriculumSubjectItem,
} from '@/types/education'

export const INITIAL_SUBJECTS: CurriculumSubjectItem[] = [
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

export const INITIAL_CHAPTERS: CurriculumChapterItem[] = [
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

export const INITIAL_LESSONS: CurriculumLessonItem[] = [
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

export const INITIAL_ASSESSMENTS: CurriculumAssessmentItem[] = [
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

export const INITIAL_TEACHERS: AdminTeacherItem[] = [
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

export function mockEducationServiceForTesting(educationService: any, vi: any) {
  let subjects = INITIAL_SUBJECTS.map((s) => ({ ...s }))
  let chapters = INITIAL_CHAPTERS.map((c) => ({ ...c }))
  let lessons = INITIAL_LESSONS.map((l) => ({ ...l }))
  let assessments = INITIAL_ASSESSMENTS.map((a) => ({ ...a }))
  let teachers = INITIAL_TEACHERS.map((t) => ({ ...t }))

  vi.spyOn(educationService, 'getSubjects').mockImplementation(async () => [...subjects])
  vi.spyOn(educationService, 'getSubjectById').mockImplementation(async (id: string) => subjects.find((s) => s.id === id))
  vi.spyOn(educationService, 'createSubject').mockImplementation(async (input: any) => {
    const item = {
      ...input,
      id: `subj-${Date.now().toString(36)}`,
      chapterCount: 0,
      lessonCount: 0,
      assessmentCount: 0,
      publishedPercent: input.status === 'published' ? 100 : 0,
      updatedAt: new Date().toISOString(),
    }
    subjects = [item, ...subjects]
    return item
  })
  vi.spyOn(educationService, 'updateSubject').mockImplementation(async (id: string, updates: any) => {
    const idx = subjects.findIndex((s) => s.id === id)
    if (idx !== -1) {
      subjects[idx] = { ...subjects[idx], ...updates, updatedAt: new Date().toISOString() }
      return subjects[idx]
    }
    return undefined
  })
  vi.spyOn(educationService, 'deleteSubject').mockImplementation(async (id: string) => {
    subjects = subjects.filter((s) => s.id !== id)
    return true
  })

  // chapters
  vi.spyOn(educationService, 'getChapters').mockImplementation(async (subjectId?: string) => {
    let res = [...chapters]
    if (subjectId && subjectId !== 'all') res = res.filter((c) => c.subjectId === subjectId)
    return res.sort((a, b) => a.order - b.order)
  })
  vi.spyOn(educationService, 'getChapterById').mockImplementation(async (id: string) => chapters.find((c) => c.id === id))
  vi.spyOn(educationService, 'createChapter').mockImplementation(async (input: any) => {
    const item = {
      ...input,
      id: `ch-${Date.now().toString(36)}`,
      lessonsCount: 0,
      updatedAt: new Date().toISOString(),
    }
    chapters = [...chapters, item]
    return item
  })
  vi.spyOn(educationService, 'updateChapter').mockImplementation(async (id: string, updates: any) => {
    const idx = chapters.findIndex((c) => c.id === id)
    if (idx !== -1) {
      chapters[idx] = { ...chapters[idx], ...updates, updatedAt: new Date().toISOString() }
      return chapters[idx]
    }
    return undefined
  })
  vi.spyOn(educationService, 'deleteChapter').mockImplementation(async (id: string) => {
    chapters = chapters.filter((c) => c.id !== id)
    return true
  })
  vi.spyOn(educationService, 'reorderChapters').mockImplementation(async (subjectId: string, orderedIds: string[]) => {
    chapters = chapters.map((c) => {
      if (c.subjectId === subjectId) {
        const newOrder = orderedIds.indexOf(c.id) + 1
        if (newOrder > 0) return { ...c, order: newOrder }
      }
      return c
    })
    return chapters.filter((c) => c.subjectId === subjectId).sort((a, b) => a.order - b.order)
  })

  // topics
  vi.spyOn(educationService, 'getTopics').mockImplementation(async () => [])

  // lessons
  vi.spyOn(educationService, 'getLessons').mockImplementation(async (filter?: any) => {
    let res = [...lessons]
    if (filter?.subjectId && filter.subjectId !== 'all') res = res.filter((l) => l.subjectId === filter.subjectId)
    if (filter?.chapterId && filter.chapterId !== 'all') res = res.filter((l) => l.chapterId === filter.chapterId)
    if (filter?.status && filter.status !== 'all') res = res.filter((l) => l.status === filter.status)
    if (filter?.search?.trim()) {
      const q = filter.search.trim().toLowerCase()
      res = res.filter((l) => l.title.toLowerCase().includes(q) || l.authorName.toLowerCase().includes(q))
    }
    return res
  })
  vi.spyOn(educationService, 'getLessonById').mockImplementation(async (id: string) => lessons.find((l) => l.id === id))
  vi.spyOn(educationService, 'createLesson').mockImplementation(async (input: any) => {
    const item = {
      ...input,
      id: `lesson-${Date.now().toString(36)}`,
      updatedAt: new Date().toISOString(),
    }
    lessons = [item, ...lessons]
    return item
  })
  vi.spyOn(educationService, 'updateLesson').mockImplementation(async (id: string, updates: any) => {
    const idx = lessons.findIndex((l) => l.id === id)
    if (idx !== -1) {
      lessons[idx] = { ...lessons[idx], ...updates, updatedAt: new Date().toISOString() }
      return lessons[idx]
    }
    return undefined
  })
  vi.spyOn(educationService, 'deleteLesson').mockImplementation(async (id: string) => {
    lessons = lessons.filter((l) => l.id !== id)
    return true
  })
  vi.spyOn(educationService, 'changeLessonStatus').mockImplementation(async (id: string, status: any) => {
    const found = lessons.find((l) => l.id === id)
    if (found) {
      found.status = status
      return found
    }
    return undefined
  })

  // assessments
  vi.spyOn(educationService, 'getAssessments').mockImplementation(async (filter?: any) => {
    let res = [...assessments]
    if (filter?.subjectId && filter.subjectId !== 'all') res = res.filter((a) => a.subjectId === filter.subjectId)
    if (filter?.status && filter.status !== 'all') res = res.filter((a) => a.status === filter.status)
    if (filter?.search?.trim()) {
      const q = filter.search.trim().toLowerCase()
      res = res.filter((a) => a.lessonTitle.toLowerCase().includes(q))
    }
    return res
  })
  vi.spyOn(educationService, 'getAssessmentById').mockImplementation(async (id: string) => assessments.find((a) => a.id === id))
  vi.spyOn(educationService, 'createAssessment').mockImplementation(async (input: any) => {
    const item = {
      ...input,
      id: `asm-${Date.now().toString(36)}`,
      updatedAt: new Date().toISOString(),
    }
    assessments = [item, ...assessments]
    return item
  })
  vi.spyOn(educationService, 'updateAssessment').mockImplementation(async (id: string, updates: any) => {
    const idx = assessments.findIndex((a) => a.id === id)
    if (idx !== -1) {
      assessments[idx] = { ...assessments[idx], ...updates, updatedAt: new Date().toISOString() }
      return assessments[idx]
    }
    return undefined
  })
  vi.spyOn(educationService, 'deleteAssessment').mockImplementation(async (id: string) => {
    assessments = assessments.filter((a) => a.id !== id)
    return true
  })
  vi.spyOn(educationService, 'addQuestionToAssessment').mockImplementation(async (id: string, q: any) => {
    const asm = assessments.find((a) => a.id === id)
    if (asm) {
      const newQ = { ...q, id: `q-${Date.now().toString(36)}` }
      asm.questions = [...(asm.questions || []), newQ]
      asm.questionCount = asm.questions.length
      return asm
    }
    return undefined
  })

  // teachers
  vi.spyOn(educationService, 'getTeachers').mockImplementation(async (filter?: any) => {
    let res = [...teachers]
    if (filter?.status && filter.status !== 'all') res = res.filter((t) => t.status === filter.status)
    if (filter?.search?.trim()) {
      const q = filter.search.trim().toLowerCase()
      res = res.filter((t) => t.name.toLowerCase().includes(q) || t.email.toLowerCase().includes(q))
    }
    return res
  })
  vi.spyOn(educationService, 'getTeacherById').mockImplementation(async (id: string) => teachers.find((t) => t.id === id))
  vi.spyOn(educationService, 'saveTeacher').mockImplementation(async (data: any) => {
    const newT = {
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
      bio: data.bio || '',
      accountStatus: 'ACTIVE',
      _persistedLocally: true,
    }
    teachers = [newT as any, ...teachers]
    return newT as any
  })
  vi.spyOn(educationService, 'updateTeacher').mockImplementation(async (id: string, updates: any) => {
    const idx = teachers.findIndex((t) => t.id === id)
    if (idx !== -1) {
      teachers[idx] = { ...teachers[idx], ...updates }
      return teachers[idx]
    }
    throw new Error('Teacher not found')
  })
  vi.spyOn(educationService, 'getTeacherKPIs').mockImplementation(async () => ({
    totalTeachers: teachers.length,
    activeTeaching: teachers.filter((t) => t.status === 'active').length,
    pendingOrLeave: teachers.filter((t) => t.status !== 'active').length,
    newTeachers: 1,
  }))

  // reports
  vi.spyOn(educationService, 'getReports').mockImplementation(async () => ({
    totalLearners: 120,
    activeLearners: 85,
    completedLessons: 420,
    completionRatePercent: 75.0,
    averageAssessmentScore: 7.8,
    activityTrend: [
      { date: '20/11', activeUsers: 45, completedLessons: 15, lessonsCompleted: 15 },
    ],
    subjectProgress: [],
    scoreDistribution: [],
  }))
}


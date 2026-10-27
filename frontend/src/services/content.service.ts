import type {
  ContentAssessmentSummary,
  ContentLessonItem,
  ContentReviewQueueItem,
  CurriculumSubjectItem,
  LessonEditorData,
} from '@/types/content'

const MOCK_SUBJECTS: CurriculumSubjectItem[] = [
  {
    id: 'math',
    name: 'Toán học 12',
    grade: 'Lớp 12',
    chapterCount: 4,
    lessonCount: 16,
    assessmentCount: 16,
    publishedPercent: 88,
    updatedAt: '2026-10-27T08:00:00Z',
  },
  {
    id: 'physics',
    name: 'Vật lý 12',
    grade: 'Lớp 12',
    chapterCount: 3,
    lessonCount: 12,
    assessmentCount: 10,
    publishedPercent: 75,
    updatedAt: '2026-10-25T14:30:00Z',
  },
  {
    id: 'chemistry',
    name: 'Hóa học 12',
    grade: 'Lớp 12',
    chapterCount: 3,
    lessonCount: 11,
    assessmentCount: 8,
    publishedPercent: 70,
    updatedAt: '2026-10-24T11:00:00Z',
  },
  {
    id: 'literature',
    name: 'Ngữ văn 12',
    grade: 'Lớp 12',
    chapterCount: 4,
    lessonCount: 14,
    assessmentCount: 12,
    publishedPercent: 85,
    updatedAt: '2026-10-26T16:00:00Z',
  },
]

const MOCK_LESSONS: ContentLessonItem[] = [
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
  },
]

const MOCK_ASSESSMENTS: ContentAssessmentSummary[] = [
  {
    id: 'asm-math-08',
    lessonId: 'lesson-math-08',
    lessonTitle: 'Khảo sát và vẽ đồ thị hàm phân thức',
    questionCount: 4,
    passingScore: 60,
    status: 'published',
    updatedAt: '2026-10-27T08:30:00Z',
  },
  {
    id: 'asm-math-01',
    lessonId: 'lesson-math-01',
    lessonTitle: 'Sự đồng biến, nghịch biến của hàm số',
    questionCount: 5,
    passingScore: 60,
    status: 'published',
    updatedAt: '2026-10-20T10:00:00Z',
  },
  {
    id: 'asm-math-09',
    lessonId: 'lesson-math-09',
    lessonTitle: 'Tiệm cận đứng và tiệm cận ngang',
    questionCount: 4,
    passingScore: 70,
    status: 'in-review',
    updatedAt: '2026-10-27T07:45:00Z',
  },
]

const MOCK_REVIEW_QUEUE: ContentReviewQueueItem[] = [
  {
    id: 'rev-1',
    title: 'Tiệm cận đứng và tiệm cận ngang của đồ thị hàm số',
    type: 'lesson',
    subject: 'Toán học 12',
    author: 'Phạm Văn Nam',
    submittedAt: '2026-10-27T07:45:00Z',
    status: 'pending',
    commentsCount: 2,
  },
  {
    id: 'rev-2',
    title: 'Bộ câu hỏi thu hoạch: Tiệm cận đứng và tiệm cận ngang',
    type: 'assessment',
    subject: 'Toán học 12',
    author: 'Phạm Văn Nam',
    submittedAt: '2026-10-27T07:50:00Z',
    status: 'pending',
    commentsCount: 0,
  },
  {
    id: 'rev-3',
    title: 'Phương trình dao động điều hòa của con lắc lò xo',
    type: 'lesson',
    subject: 'Vật lý 12',
    author: 'Lê Thanh Thảo',
    submittedAt: '2026-10-26T15:20:00Z',
    status: 'changes-requested',
    reviewer: 'Trần Ban Giám Định',
    commentsCount: 3,
  },
]

export const contentService = {
  async getDashboardSummary() {
    return {
      draftCount: 6,
      needsReviewCount: 4,
      publishedThisWeek: 8,
      assessmentCoveragePercent: 86,
      reviewQueue: [...MOCK_REVIEW_QUEUE],
      recentLessons: [...MOCK_LESSONS.slice(0, 4)],
    }
  },

  async getSubjects(): Promise<CurriculumSubjectItem[]> {
    return [...MOCK_SUBJECTS]
  },

  async getLessons(subjectFilter = 'all', statusFilter = 'all', search = ''): Promise<ContentLessonItem[]> {
    let list = [...MOCK_LESSONS]
    if (subjectFilter && subjectFilter !== 'all') {
      list = list.filter((l) => l.subjectId === subjectFilter)
    }
    if (statusFilter && statusFilter !== 'all') {
      list = list.filter((l) => l.status === statusFilter)
    }
    if (search) {
      const q = search.toLowerCase()
      list = list.filter((l) => l.title.toLowerCase().includes(q) || l.authorName.toLowerCase().includes(q))
    }
    return list
  },

  async getLessonEditor(lessonId: string): Promise<LessonEditorData> {
    const lesson = MOCK_LESSONS.find((l) => l.id === lessonId)
    return {
      id: lessonId,
      title: lesson ? lesson.title : 'Khảo sát và vẽ đồ thị hàm phân thức bậc nhất / bậc nhất',
      subjectId: lesson ? lesson.subjectId : 'math',
      chapterId: lesson ? lesson.chapterId : 'ch-01',
      status: lesson ? lesson.status : 'draft',
      introduction: 'Hàm số bậc nhất trên bậc nhất y = (ax + b) / (cx + d) (với c khác 0 và ad - bc khác 0) là dạng đồ thị hyperbol quen thuộc trong chương trình Toán 12.',
      definitions: 'Tập xác định D = R \\ {-d/c}. Đạo hàm y\' = (ad - bc) / (cx + d)^2. Do đó hàm số luôn đồng biến hoặc luôn nghịch biến trên từng khoảng xác định.',
      formulas: 'y\' = (ad - bc) / (cx + d)^2\nTiệm cận đứng: x = -d / c\nTiệm cận ngang: y = a / c\nTâm đối xứng: I(-d/c, a/c)',
      examples: 'Ví dụ 1: Khảo sát hàm số y = (2x + 1) / (x - 1).\n- TXĐ: D = R \\ {1}\n- Đạo hàm: y\' = -3 / (x - 1)^2 < 0 với mọi x khác 1.\n- Tiệm cận đứng x = 1, tiệm cận ngang y = 2.',
      notes: 'Lưu ý: Không dùng ký hiệu đồng biến trên R \\ {-d/c} mà phải ghi rõ trên từng khoảng (-vô cùng; -d/c) và (-d/c; +vô cùng).',
      summary: 'Ghi nhớ công thức tính nhanh đạo hàm và xác định tọa độ giao điểm tiệm cận làm tâm đối xứng của hyperbol.',
      assessmentId: 'asm-math-08',
      lastSavedAt: new Date().toISOString(),
    }
  },

  async saveLessonEditor(data: LessonEditorData): Promise<LessonEditorData> {
    return {
      ...data,
      lastSavedAt: new Date().toISOString(),
    }
  },

  async getAssessments(): Promise<ContentAssessmentSummary[]> {
    return [...MOCK_ASSESSMENTS]
  },

  async getReviewQueue(): Promise<ContentReviewQueueItem[]> {
    return [...MOCK_REVIEW_QUEUE]
  },

  async reviewAction(id: string, action: 'approve' | 'request-changes'): Promise<boolean> {
    const item = MOCK_REVIEW_QUEUE.find((r) => r.id === id)
    if (item) {
      item.status = action === 'approve' ? 'approved' : 'changes-requested'
      return true
    }
    return false
  },
}

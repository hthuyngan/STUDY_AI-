import type {
  AdminAssignmentItem,
  AdminClassItem,
  AdminGradeRecord,
  AdminLearningAlert,
  AdminStudentItem,
  AdminSubmissionItem,
  AlertStatus,
  ClassActivityItem,
} from '@/types/classroom'
import type {
  ClassStudentItem,
  StudentAcademicDetail,
  TeacherAssignmentItem,
  TeacherClassItem,
} from '@/types/teacher'

const STORAGE_KEYS = {
  CLASSES: 'study_ai_classes_v4',
  STUDENTS: 'study_ai_students_v4',
  ASSIGNMENTS: 'study_ai_assignments_v4',
  SUBMISSIONS: 'study_ai_submissions_v4',
  ALERTS: 'study_ai_alerts_v4',
  ACTIVITIES: 'study_ai_class_activities_v4',
}

export const INITIAL_CLASSES: AdminClassItem[] = [
  {
    id: 'cls-12a1',
    code: '12A1',
    name: 'Lớp 12A1',
    grade: 'Lớp 12',
    homeroomTeacherId: 'tch-01',
    homeroomTeacherName: 'ThS. Nguyễn Văn Hải',
    room: 'P.302',
    academicYear: '2025 - 2026',
    description: 'Lớp chọn khối A - Định hướng Khoa học Tự nhiên và Công nghệ',
    maxStudents: 40,
    studentCount: 5,
    averageProgress: 72,
    averageScore: 8.2,
    activeAssignments: 2,
    status: 'active',
    createdAt: '2025-09-05T07:30:00Z',
    updatedAt: '2026-10-27T10:15:00Z',
  },
  {
    id: 'cls-12a2',
    code: '12A2',
    name: 'Lớp 12A2',
    grade: 'Lớp 12',
    homeroomTeacherId: 'tch-02',
    homeroomTeacherName: 'Cô Trần Mai Linh',
    room: 'P.304',
    academicYear: '2025 - 2026',
    description: 'Lớp chuẩn Toán - Ngoại ngữ',
    maxStudents: 40,
    studentCount: 4,
    averageProgress: 64,
    averageScore: 7.6,
    activeAssignments: 1,
    status: 'active',
    createdAt: '2025-09-05T07:30:00Z',
    updatedAt: '2026-10-27T09:40:00Z',
  },
  {
    id: 'cls-11b1',
    code: '11B1',
    name: 'Lớp 11B1',
    grade: 'Lớp 11',
    homeroomTeacherId: 'tch-03',
    homeroomTeacherName: 'ThS. Lê Hoàng Nam',
    room: 'P.201',
    academicYear: '2025 - 2026',
    description: 'Lớp nâng cao Toán - Lý 11',
    maxStudents: 45,
    studentCount: 3,
    averageProgress: 58,
    averageScore: 7.1,
    activeAssignments: 2,
    status: 'active',
    createdAt: '2025-09-05T07:30:00Z',
    updatedAt: '2026-10-26T16:20:00Z',
  },
  {
    id: 'cls-10c1',
    code: '10C1',
    name: 'Lớp 10C1',
    grade: 'Lớp 10',
    homeroomTeacherId: 'tch-04',
    homeroomTeacherName: 'Cô Phạm Bích Ngọc',
    room: 'P.105',
    academicYear: '2025 - 2026',
    description: 'Lớp tạo nguồn Toán Tin THPT',
    maxStudents: 40,
    studentCount: 3,
    averageProgress: 80,
    averageScore: 8.5,
    activeAssignments: 1,
    status: 'active',
    createdAt: '2025-09-05T07:30:00Z',
    updatedAt: '2026-10-27T11:00:00Z',
  },
]

export const INITIAL_STUDENTS: AdminStudentItem[] = [
  {
    id: 'stu-1',
    code: 'HV-12001',
    name: 'Nguyễn Minh Anh',
    email: 'minh.anh@example.com',
    phone: '0912 345 678',
    classId: 'cls-12a1',
    className: 'Lớp 12A1',
    grade: 'Lớp 12',
    progress: 88,
    lessonsCompleted: 16,
    averageScore: 9.2,
    totalLearningMinutes: 620,
    lastActive: '2026-10-27T10:15:00Z',
    status: 'on-track',
    strengths: ['Đạo hàm & Vi tích phân', 'Tư duy logic tốt'],
    weakAreas: ['Tích phân từng phần nâng cao'],
  },
  {
    id: 'stu-2',
    code: 'HV-12002',
    name: 'Trần Gia Huy',
    email: 'gia.huy@example.com',
    phone: '0987 654 321',
    classId: 'cls-12a1',
    className: 'Lớp 12A1',
    grade: 'Lớp 12',
    progress: 74,
    lessonsCompleted: 13,
    averageScore: 8.0,
    totalLearningMinutes: 480,
    lastActive: '2026-10-27T08:30:00Z',
    status: 'on-track',
    strengths: ['Hình học giải tích', 'Khảo sát hàm số'],
    weakAreas: ['Tiệm cận xiên của hàm phân thức'],
  },
  {
    id: 'stu-3',
    code: 'HV-12003',
    name: 'Đinh Trọng Phúc',
    email: 'dinh.trong@example.com',
    phone: '0934 112 233',
    classId: 'cls-12a1',
    className: 'Lớp 12A1',
    grade: 'Lớp 12',
    progress: 35,
    lessonsCompleted: 5,
    averageScore: 4.8,
    totalLearningMinutes: 240,
    lastActive: '2026-10-23T14:10:00Z',
    status: 'needs-attention',
    strengths: ['Đại số cơ bản'],
    weakAreas: ['Đạo hàm bậc hai', 'Bất phương trình lượng giác'],
  },
  {
    id: 'stu-4',
    code: 'HV-12004',
    name: 'Võ Thảo My',
    email: 'thao.my@example.com',
    phone: '0903 889 977',
    classId: 'cls-12a1',
    className: 'Lớp 12A1',
    grade: 'Lớp 12',
    progress: 82,
    lessonsCompleted: 15,
    averageScore: 8.5,
    totalLearningMinutes: 590,
    lastActive: '2026-10-26T19:00:00Z',
    status: 'on-track',
    strengths: ['Khảo sát hàm số', 'Tính đơn điệu'],
  },
  {
    id: 'stu-5',
    code: 'HV-12005',
    name: 'Hoàng Hải Đăng',
    email: 'hai.dang@example.com',
    phone: '0978 445 566',
    classId: 'cls-12a1',
    className: 'Lớp 12A1',
    grade: 'Lớp 12',
    progress: 40,
    lessonsCompleted: 6,
    averageScore: 5.0,
    totalLearningMinutes: 280,
    lastActive: '2026-10-24T11:20:00Z',
    status: 'needs-attention',
    weakAreas: ['Khảo sát hàm số bậc 3'],
  },
  {
    id: 'stu-6',
    code: 'HV-12006',
    name: 'Phạm Quỳnh Chi',
    email: 'quynh.chi@example.com',
    phone: '0945 223 344',
    classId: 'cls-12a2',
    className: 'Lớp 12A2',
    grade: 'Lớp 12',
    progress: 68,
    lessonsCompleted: 11,
    averageScore: 7.4,
    totalLearningMinutes: 430,
    lastActive: '2026-10-27T09:10:00Z',
    status: 'on-track',
  },
  {
    id: 'stu-7',
    code: 'HV-12007',
    name: 'Lê Quốc Tuấn',
    email: 'quoc.tuan@example.com',
    phone: '0966 332 211',
    classId: 'cls-12a2',
    className: 'Lớp 12A2',
    grade: 'Lớp 12',
    progress: 45,
    lessonsCompleted: 7,
    averageScore: 5.5,
    totalLearningMinutes: 310,
    lastActive: '2026-10-20T10:00:00Z',
    status: 'idle',
    weakAreas: ['Phương trình lượng giác'],
  },
  {
    id: 'stu-8',
    code: 'HV-11001',
    name: 'Bùi Bảo Ngọc',
    email: 'bao.ngoc@example.com',
    phone: '0922 888 777',
    classId: 'cls-11b1',
    className: 'Lớp 11B1',
    grade: 'Lớp 11',
    progress: 62,
    lessonsCompleted: 10,
    averageScore: 7.2,
    totalLearningMinutes: 410,
    lastActive: '2026-10-26T14:30:00Z',
    status: 'on-track',
  },
  {
    id: 'stu-9',
    code: 'HV-11002',
    name: 'Đỗ Thành Đạt',
    email: 'thanh.dat@example.com',
    phone: '0919 667 889',
    classId: 'cls-11b1',
    className: 'Lớp 11B1',
    grade: 'Lớp 11',
    progress: 30,
    lessonsCompleted: 4,
    averageScore: 4.2,
    totalLearningMinutes: 180,
    lastActive: '2026-10-18T16:00:00Z',
    status: 'needs-attention',
    weakAreas: ['Hình học không gian cổ điển', 'Khoảng cách giữa hai đường thẳng'],
  },
  {
    id: 'stu-10',
    code: 'HV-10001',
    name: 'Vũ Hoàng Long',
    email: 'hoang.long@example.com',
    phone: '0938 991 122',
    classId: 'cls-10c1',
    className: 'Lớp 10C1',
    grade: 'Lớp 10',
    progress: 85,
    lessonsCompleted: 14,
    averageScore: 8.8,
    totalLearningMinutes: 520,
    lastActive: '2026-10-27T11:00:00Z',
    status: 'on-track',
  },
]

export const INITIAL_ASSIGNMENTS: AdminAssignmentItem[] = [
  {
    id: 'asg-1',
    title: 'Khảo sát và vẽ đồ thị hàm phân thức',
    classId: 'cls-12a1',
    className: 'Lớp 12A1',
    subjectId: 'sub-math-12',
    subjectName: 'Toán học 12',
    lessonId: 'les-01',
    lessonTitle: 'Khảo sát và vẽ đồ thị hàm số',
    description: 'Thực hiện đầy đủ các bước tìm tập xác định, giới hạn, tiệm cận, bảng biến thiên và vẽ đồ thị.',
    instructions: 'Trình bày vào vở hoặc xuất file PDF tải lên hệ thống trước hạn chót.',
    dueDate: '2026-10-30T23:59:00Z',
    maxScore: 10,
    submissionsCount: 4,
    totalStudents: 5,
    averageScore: 8.8,
    status: 'active',
    createdAt: '2026-10-20T08:00:00Z',
  },
  {
    id: 'asg-2',
    title: 'Ôn tập chương: Ứng dụng đạo hàm',
    classId: 'cls-12a1',
    className: 'Lớp 12A1',
    subjectId: 'sub-math-12',
    subjectName: 'Toán học 12',
    lessonId: 'les-02',
    lessonTitle: 'Giá trị lớn nhất và nhỏ nhất',
    description: '10 bài toán thực tế ứng dụng đạo hàm tìm GTLN và GTNN.',
    instructions: 'Chú ý đặt ẩn phụ và xác định điều kiện biến số chặt chẽ.',
    dueDate: '2026-11-05T23:59:00Z',
    maxScore: 10,
    submissionsCount: 3,
    totalStudents: 5,
    averageScore: 7.8,
    status: 'active',
    createdAt: '2026-10-22T09:00:00Z',
  },
  {
    id: 'asg-3',
    title: 'Luyện đề trắc nghiệm thu hoạch số 1',
    classId: 'cls-12a2',
    className: 'Lớp 12A2',
    subjectId: 'sub-math-12',
    subjectName: 'Toán học 12',
    description: 'Bộ 20 câu hỏi trắc nghiệm kiểm tra mức độ vận dụng chương 1.',
    dueDate: '2026-10-28T23:59:00Z',
    maxScore: 10,
    submissionsCount: 3,
    totalStudents: 4,
    averageScore: 7.3,
    status: 'active',
    createdAt: '2026-10-21T10:00:00Z',
  },
  {
    id: 'asg-4',
    title: 'Bài tập phương trình lượng giác cơ bản',
    classId: 'cls-11b1',
    className: 'Lớp 11B1',
    subjectId: 'sub-math-11',
    subjectName: 'Toán học 11',
    description: 'Giải các phương trình bậc hai đối với một hàm số lượng giác.',
    dueDate: '2026-11-02T23:59:00Z',
    maxScore: 10,
    submissionsCount: 2,
    totalStudents: 3,
    averageScore: 6.9,
    status: 'active',
    createdAt: '2026-10-23T14:00:00Z',
  },
  {
    id: 'asg-5',
    title: 'Khảo sát chuyển động thẳng biến đổi đều',
    classId: 'cls-10c1',
    className: 'Lớp 10C1',
    subjectId: 'sub-phys-10',
    subjectName: 'Vật lý 10',
    description: 'Tính gia tốc, vận tốc và quãng đường đi được của xe.',
    dueDate: '2026-10-25T23:59:00Z',
    maxScore: 10,
    submissionsCount: 3,
    totalStudents: 3,
    averageScore: 8.7,
    status: 'closed',
    createdAt: '2026-10-15T09:00:00Z',
  },
]

export const INITIAL_SUBMISSIONS: AdminSubmissionItem[] = [
  {
    id: 'sub-1',
    assignmentId: 'asg-1',
    assignmentTitle: 'Khảo sát và vẽ đồ thị hàm phân thức',
    studentId: 'stu-1',
    studentName: 'Nguyễn Minh Anh',
    studentEmail: 'minh.anh@example.com',
    className: 'Lớp 12A1',
    submittedAt: '2026-10-27T10:15:00Z',
    status: 'graded',
    score: 9.5,
    maxScore: 10,
    feedback: 'Bài làm rất tốt, vẽ đồ thị chuẩn xác và lập bảng biến thiên rõ ràng.',
    gradedBy: 'ThS. Nguyễn Văn Hải',
    content: 'Đã hoàn thành bài tập 1, 2, 3 và đính kèm đồ thị vẽ tay theo quy chuẩn.',
  },
  {
    id: 'sub-2',
    assignmentId: 'asg-1',
    assignmentTitle: 'Khảo sát và vẽ đồ thị hàm phân thức',
    studentId: 'stu-2',
    studentName: 'Trần Gia Huy',
    studentEmail: 'gia.huy@example.com',
    className: 'Lớp 12A1',
    submittedAt: '2026-10-27T08:30:00Z',
    status: 'graded',
    score: 8.0,
    maxScore: 10,
    feedback: 'Cần chú ý kết luận tiệm cận xiên chi tiết hơn.',
    gradedBy: 'ThS. Nguyễn Văn Hải',
    content: 'Em đã nộp bài giải câu hỏi 1 và 2 qua file ảnh đính kèm.',
  },
  {
    id: 'sub-3',
    assignmentId: 'asg-1',
    assignmentTitle: 'Khảo sát và vẽ đồ thị hàm phân thức',
    studentId: 'stu-4',
    studentName: 'Võ Thảo My',
    studentEmail: 'thao.my@example.com',
    className: 'Lớp 12A1',
    submittedAt: '2026-10-26T21:10:00Z',
    status: 'graded',
    score: 8.8,
    maxScore: 10,
    feedback: 'Lời giải súc tích, lập luận chặt chẽ.',
    gradedBy: 'ThS. Nguyễn Văn Hải',
    content: 'Bài nộp hoàn chỉnh gồm 3 trang lời giải tự luận.',
  },
  {
    id: 'sub-4',
    assignmentId: 'asg-1',
    assignmentTitle: 'Khảo sát và vẽ đồ thị hàm phân thức',
    studentId: 'stu-5',
    studentName: 'Hoàng Hải Đăng',
    studentEmail: 'hai.dang@example.com',
    className: 'Lớp 12A1',
    submittedAt: '2026-10-28T09:00:00Z',
    status: 'pending',
    maxScore: 10,
    content: 'Em đã nộp bài tập khảo sát đồ thị, mong thầy cô xem xét.',
  },
  {
    id: 'sub-5',
    assignmentId: 'asg-1',
    assignmentTitle: 'Khảo sát và vẽ đồ thị hàm phân thức',
    studentId: 'stu-3',
    studentName: 'Đinh Trọng Phúc',
    studentEmail: 'dinh.trong@example.com',
    className: 'Lớp 12A1',
    status: 'missing',
    maxScore: 10,
  },
]

export const INITIAL_ALERTS: AdminLearningAlert[] = [
  {
    id: 'alert-1',
    studentId: 'stu-3',
    studentName: 'Đinh Trọng Phúc',
    classId: 'cls-12a1',
    className: 'Lớp 12A1',
    severity: 'high',
    type: 'missing_assignments',
    reason: 'Chưa nộp 2 bài tập liên tiếp, điểm bài thu hoạch dưới 50%',
    indicator: 'Chưa nộp bài asg-1, asg-2; điểm thu hoạch 4.5',
    detectedAt: '2026-10-26T08:00:00Z',
    status: 'unresolved',
  },
  {
    id: 'alert-2',
    studentId: 'stu-5',
    studentName: 'Hoàng Hải Đăng',
    classId: 'cls-12a1',
    className: 'Lớp 12A1',
    severity: 'medium',
    type: 'slow_progress',
    reason: 'Dừng tiến độ học bài khảo sát hàm số quá 3 ngày',
    indicator: 'Tiến độ đứng ở mức 40% trong 72 giờ qua',
    detectedAt: '2026-10-27T14:30:00Z',
    status: 'investigating',
  },
  {
    id: 'alert-3',
    studentId: 'stu-9',
    studentName: 'Đỗ Thành Đạt',
    classId: 'cls-11b1',
    className: 'Lớp 11B1',
    severity: 'high',
    type: 'low_score',
    reason: 'Điểm kiểm tra hình không gian dưới 5.0 trong 2 tuần liên tiếp',
    indicator: 'Điểm gần nhất: 4.2 / 10',
    detectedAt: '2026-10-25T11:00:00Z',
    status: 'unresolved',
  },
  {
    id: 'alert-4',
    studentId: 'stu-7',
    studentName: 'Lê Quốc Tuấn',
    classId: 'cls-12a2',
    className: 'Lớp 12A2',
    severity: 'low',
    type: 'inactive',
    reason: 'Không đăng nhập hệ thống trong hơn 7 ngày',
    indicator: 'Lần hoạt động cuối: 20/10/2026',
    detectedAt: '2026-10-27T08:00:00Z',
    status: 'resolved',
    resolutionNote: 'Đã liên hệ phụ huynh, học sinh xin phép nghỉ ốm 3 ngày.',
  },
]

export const INITIAL_ACTIVITIES: ClassActivityItem[] = [
  {
    id: 'act-1',
    classId: 'cls-12a1',
    action: 'Giao bài tập mới',
    detail: 'ThS. Nguyễn Văn Hải đã giao bài "Khảo sát và vẽ đồ thị hàm phân thức"',
    timestamp: '2026-10-20T08:00:00Z',
    actor: 'ThS. Nguyễn Văn Hải',
  },
  {
    id: 'act-2',
    classId: 'cls-12a1',
    action: 'Nộp bài tập',
    detail: 'Nguyễn Minh Anh đã hoàn thành nộp bài tập với điểm số 9.5',
    timestamp: '2026-10-27T10:15:00Z',
    actor: 'Nguyễn Minh Anh',
  },
  {
    id: 'act-3',
    classId: 'cls-12a1',
    action: 'Cảnh báo học tập',
    detail: 'Hệ thống kích hoạt cảnh báo tiến độ cho học viên Đinh Trọng Phúc',
    timestamp: '2026-10-26T08:00:00Z',
    actor: 'Hệ thống tự động',
  },
]

// Storage helpers
function loadFromStorage<T>(key: string, fallback: T): T {
  if (typeof window === 'undefined' || !window.localStorage) return fallback
  try {
    const raw = localStorage.getItem(key)
    return raw ? JSON.parse(raw) : fallback
  } catch {
    return fallback
  }
}

function saveToStorage<T>(key: string, data: T): void {
  if (typeof window === 'undefined' || !window.localStorage) return
  try {
    localStorage.setItem(key, JSON.stringify(data))
  } catch (e) {
    console.error(`Failed to save to localStorage (${key}):`, e)
  }
}

export const classroomService = {
  // ==================== CLASSES ====================
  async getClasses(): Promise<AdminClassItem[]> {
    return loadFromStorage<AdminClassItem[]>(STORAGE_KEYS.CLASSES, INITIAL_CLASSES)
  },

  async getClassById(classId: string): Promise<AdminClassItem | null> {
    const classes = await this.getClasses()
    return classes.find((c) => c.id === classId) || null
  },

  async saveClass(classData: Partial<AdminClassItem>): Promise<AdminClassItem> {
    const classes = await this.getClasses()
    const now = new Date().toISOString()

    // Validate duplicate class code
    const isDuplicate = classes.some(
      (c) => c.code.toLowerCase() === (classData.code || '').trim().toLowerCase() && c.id !== classData.id
    )
    if (isDuplicate) {
      throw new Error(`Mã lớp "${classData.code}" đã tồn tại trên hệ thống`)
    }

    if (classData.id) {
      // Update
      const index = classes.findIndex((c) => c.id === classData.id)
      if (index === -1) throw new Error('Không tìm thấy lớp học')
      const updated: AdminClassItem = {
        ...classes[index],
        ...classData,
        updatedAt: now,
      }
      classes[index] = updated
      saveToStorage(STORAGE_KEYS.CLASSES, classes)
      return updated
    } else {
      // Create
      const newClass: AdminClassItem = {
        id: `cls-${Date.now()}`,
        code: (classData.code || '').trim().toUpperCase(),
        name: (classData.name || '').trim(),
        grade: classData.grade || 'Lớp 12',
        homeroomTeacherId: classData.homeroomTeacherId || 'tch-01',
        homeroomTeacherName: classData.homeroomTeacherName || 'Chưa phân công',
        room: classData.room || 'P.101',
        academicYear: classData.academicYear || '2025 - 2026',
        description: classData.description || '',
        maxStudents: classData.maxStudents || 40,
        studentCount: 0,
        averageProgress: 0,
        averageScore: 0,
        activeAssignments: 0,
        status: classData.status || 'active',
        createdAt: now,
        updatedAt: now,
      }
      const updatedList = [newClass, ...classes]
      saveToStorage(STORAGE_KEYS.CLASSES, updatedList)
      return newClass
    }
  },

  async deleteClass(classId: string): Promise<void> {
    const students = await this.getStudentsByClass(classId)
    if (students.length > 0) {
      throw new Error(`Không thể xóa lớp đang có ${students.length} học viên. Vui lòng chuyển học viên sang lớp khác trước.`)
    }
    const classes = await this.getClasses()
    const filtered = classes.filter((c) => c.id !== classId)
    saveToStorage(STORAGE_KEYS.CLASSES, filtered)
  },

  // ==================== STUDENTS ====================
  async getStudents(): Promise<AdminStudentItem[]> {
    return loadFromStorage<AdminStudentItem[]>(STORAGE_KEYS.STUDENTS, INITIAL_STUDENTS)
  },

  async getStudentById(studentId: string): Promise<AdminStudentItem | null> {
    const students = await this.getStudents()
    return students.find((s) => s.id === studentId) || null
  },

  async getStudentsByClass(classId: string): Promise<AdminStudentItem[]> {
    const students = await this.getStudents()
    return students.filter((s) => s.classId === classId)
  },

  async addStudentToClass(studentData: Omit<AdminStudentItem, 'id'>): Promise<AdminStudentItem> {
    const students = await this.getStudents()
    const newStudent: AdminStudentItem = {
      ...studentData,
      id: `stu-${Date.now()}`,
    }
    const updatedList = [newStudent, ...students]
    saveToStorage(STORAGE_KEYS.STUDENTS, updatedList)
    await this._syncClassCounts()
    return newStudent
  },

  async moveStudentClass(studentId: string, targetClassId: string, targetClassName: string): Promise<AdminStudentItem> {
    const students = await this.getStudents()
    const idx = students.findIndex((s) => s.id === studentId)
    if (idx === -1) throw new Error('Không tìm thấy học viên')
    students[idx] = {
      ...students[idx],
      classId: targetClassId,
      className: targetClassName,
    }
    saveToStorage(STORAGE_KEYS.STUDENTS, students)
    await this._syncClassCounts()
    return students[idx]
  },

  async removeStudentFromClass(studentId: string): Promise<void> {
    const students = await this.getStudents()
    const filtered = students.filter((s) => s.id !== studentId)
    saveToStorage(STORAGE_KEYS.STUDENTS, filtered)
    await this._syncClassCounts()
  },

  // ==================== ASSIGNMENTS ====================
  async getAssignments(): Promise<AdminAssignmentItem[]> {
    return loadFromStorage<AdminAssignmentItem[]>(STORAGE_KEYS.ASSIGNMENTS, INITIAL_ASSIGNMENTS)
  },

  async getAssignmentById(assignmentId: string): Promise<AdminAssignmentItem | null> {
    const assignments = await this.getAssignments()
    return assignments.find((a) => a.id === assignmentId) || null
  },

  async getAssignmentsByClass(classId: string): Promise<AdminAssignmentItem[]> {
    const assignments = await this.getAssignments()
    return assignments.filter((a) => a.classId === classId)
  },

  async saveAssignment(data: Partial<AdminAssignmentItem>): Promise<AdminAssignmentItem> {
    const assignments = await this.getAssignments()
    const now = new Date().toISOString()

    if (data.id) {
      const idx = assignments.findIndex((a) => a.id === data.id)
      if (idx === -1) throw new Error('Không tìm thấy bài tập')
      const updated = { ...assignments[idx], ...data }
      assignments[idx] = updated
      saveToStorage(STORAGE_KEYS.ASSIGNMENTS, assignments)
      return updated
    } else {
      const newAssignment: AdminAssignmentItem = {
        id: `asg-${Date.now()}`,
        title: data.title || 'Bài tập mới',
        classId: data.classId || 'cls-12a1',
        className: data.className || 'Lớp 12A1',
        subjectId: data.subjectId || 'sub-math-12',
        subjectName: data.subjectName || 'Toán học 12',
        lessonId: data.lessonId,
        lessonTitle: data.lessonTitle,
        assessmentId: data.assessmentId,
        description: data.description,
        instructions: data.instructions,
        dueDate: data.dueDate || new Date(Date.now() + 7 * 86400000).toISOString(),
        maxScore: data.maxScore || 10,
        submissionsCount: 0,
        totalStudents: data.totalStudents || 35,
        status: data.status || 'active',
        createdAt: now,
      }
      const updatedList = [newAssignment, ...assignments]
      saveToStorage(STORAGE_KEYS.ASSIGNMENTS, updatedList)
      await this._syncClassCounts()
      return newAssignment
    }
  },

  async deleteAssignment(assignmentId: string): Promise<void> {
    const assignments = await this.getAssignments()
    const filtered = assignments.filter((a) => a.id !== assignmentId)
    saveToStorage(STORAGE_KEYS.ASSIGNMENTS, filtered)
    await this._syncClassCounts()
  },

  // ==================== SUBMISSIONS ====================
  async getSubmissions(assignmentId?: string): Promise<AdminSubmissionItem[]> {
    const all = loadFromStorage<AdminSubmissionItem[]>(STORAGE_KEYS.SUBMISSIONS, INITIAL_SUBMISSIONS)
    if (assignmentId) {
      return all.filter((s) => s.assignmentId === assignmentId)
    }
    return all
  },

  async gradeSubmission(
    submissionId: string,
    score: number,
    feedback: string,
    gradedBy: string = 'Quản trị viên'
  ): Promise<AdminSubmissionItem> {
    const submissions = await this.getSubmissions()
    const idx = submissions.findIndex((s) => s.id === submissionId)
    if (idx === -1) throw new Error('Không tìm thấy bài nộp')
    const updated: AdminSubmissionItem = {
      ...submissions[idx],
      score,
      feedback,
      gradedBy,
      status: 'graded',
      submittedAt: submissions[idx].submittedAt || new Date().toISOString(),
    }
    submissions[idx] = updated
    saveToStorage(STORAGE_KEYS.SUBMISSIONS, submissions)
    return updated
  },

  // ==================== GRADES & ANALYTICS ====================
  async getAllGrades(): Promise<AdminGradeRecord[]> {
    const submissions = await this.getSubmissions()
    const students = await this.getStudents()
    const assignments = await this.getAssignments()

    const grades: AdminGradeRecord[] = []

    submissions.forEach((sub) => {
      if (sub.score !== undefined) {
        const student = students.find((s) => s.id === sub.studentId)
        const assignment = assignments.find((a) => a.id === sub.assignmentId)
        grades.push({
          id: `grd-${sub.id}`,
          studentId: sub.studentId,
          studentName: sub.studentName,
          studentCode: student?.code || 'HV-000',
          classId: student?.classId || 'cls-12a1',
          className: sub.className,
          subjectName: assignment?.subjectName || 'Toán học 12',
          activityTitle: sub.assignmentTitle,
          activityType: 'assignment',
          score: sub.score,
          maxScore: sub.maxScore,
          passed: sub.score >= 5.0,
          date: sub.submittedAt || '2026-10-27T10:15:00Z',
          feedback: sub.feedback,
        })
      }
    })

    // Add some mock assessment grades
    students.forEach((stu) => {
      grades.push({
        id: `grd-ass-${stu.id}`,
        studentId: stu.id,
        studentName: stu.name,
        studentCode: stu.code,
        classId: stu.classId,
        className: stu.className,
        subjectName: 'Toán học 12',
        activityTitle: 'Thu hoạch: Khảo sát tính đơn điệu hàm số',
        activityType: 'assessment',
        score: stu.averageScore,
        maxScore: 10,
        passed: stu.averageScore >= 5.0,
        date: stu.lastActive,
      })
    })

    return grades
  },

  // ==================== ALERTS ====================
  async getAlerts(): Promise<AdminLearningAlert[]> {
    return loadFromStorage<AdminLearningAlert[]>(STORAGE_KEYS.ALERTS, INITIAL_ALERTS)
  },

  async updateAlertStatus(alertId: string, status: AlertStatus, resolutionNote?: string): Promise<AdminLearningAlert> {
    const alerts = await this.getAlerts()
    const idx = alerts.findIndex((a) => a.id === alertId)
    if (idx === -1) throw new Error('Không tìm thấy cảnh báo')
    const updated: AdminLearningAlert = {
      ...alerts[idx],
      status,
      resolutionNote: resolutionNote !== undefined ? resolutionNote : alerts[idx].resolutionNote,
    }
    alerts[idx] = updated
    saveToStorage(STORAGE_KEYS.ALERTS, alerts)
    return updated
  },

  async resolveAllAlerts(): Promise<void> {
    const alerts = await this.getAlerts()
    const resolved = alerts.map((a) => ({
      ...a,
      status: 'resolved' as AlertStatus,
      resolutionNote: a.resolutionNote || 'Quản trị viên đã giải quyết hàng loạt.',
    }))
    saveToStorage(STORAGE_KEYS.ALERTS, resolved)
  },

  // ==================== ACTIVITIES ====================
  async getClassActivities(classId: string): Promise<ClassActivityItem[]> {
    const all = loadFromStorage<ClassActivityItem[]>(STORAGE_KEYS.ACTIVITIES, INITIAL_ACTIVITIES)
    return all.filter((a) => a.classId === classId)
  },

  async addClassActivity(classId: string, action: string, detail: string, actor: string = 'Quản trị viên'): Promise<void> {
    const all = loadFromStorage<ClassActivityItem[]>(STORAGE_KEYS.ACTIVITIES, INITIAL_ACTIVITIES)
    const newAct: ClassActivityItem = {
      id: `act-${Date.now()}`,
      classId,
      action,
      detail,
      timestamp: new Date().toISOString(),
      actor,
    }
    saveToStorage(STORAGE_KEYS.ACTIVITIES, [newAct, ...all])
  },

  // ==================== TEACHER BRIDGE (Requirement 16) ====================
  // Synchronizes teacher mock and admin mock data
  async getTeacherClasses(): Promise<TeacherClassItem[]> {
    const classes = await this.getClasses()
    return classes.map((c) => ({
      id: c.id,
      name: c.name,
      grade: c.grade,
      subject: 'Toán học',
      studentCount: c.studentCount,
      averageProgress: c.averageProgress,
      activeAssignments: c.activeAssignments,
      latestActivity: c.updatedAt,
    }))
  },

  async getTeacherClassStudents(classId: string): Promise<ClassStudentItem[]> {
    const students = await this.getStudentsByClass(classId)
    return students.map((s) => ({
      id: s.id,
      name: s.name,
      email: s.email,
      progress: s.progress,
      lessonsCompleted: s.lessonsCompleted,
      latestScore: s.averageScore * 10,
      lastActive: s.lastActive,
      status: s.status,
    }))
  },

  async getTeacherAssignments(): Promise<TeacherAssignmentItem[]> {
    const assignments = await this.getAssignments()
    return assignments.map((a) => ({
      id: a.id,
      title: a.title,
      classId: a.classId,
      className: a.className,
      subject: a.subjectName,
      lessonIds: a.lessonId ? [a.lessonId] : [],
      dueDate: a.dueDate,
      submissionsCount: a.submissionsCount,
      totalStudents: a.totalStudents,
      status: a.status,
    }))
  },

  async getStudentAcademicDetail(studentId: string): Promise<StudentAcademicDetail | null> {
    const student = await this.getStudentById(studentId)
    if (!student) return null
    return {
      id: student.id,
      name: student.name,
      email: student.email,
      grade: student.grade,
      className: student.className,
      totalLearningMinutes: student.totalLearningMinutes,
      overallProgress: student.progress,
      averageAssessmentScore: student.averageScore * 10,
      recentLessons: [
        {
          id: 'les-01',
          title: 'Sự đồng biến, nghịch biến của hàm số',
          progress: 90,
          lastActive: student.lastActive,
        },
        {
          id: 'les-02',
          title: 'Cực trị của hàm số',
          progress: 75,
          lastActive: '2026-10-25T14:00:00Z',
        },
      ],
      assessmentAttempts: [
        {
          id: 'att-1',
          title: 'Thu hoạch: Khảo sát tính đơn điệu hàm số',
          score: student.averageScore * 10,
          passed: student.averageScore >= 5.0,
          date: student.lastActive,
        },
      ],
      weakAreas: student.weakAreas || ['Đang cập nhật'],
    }
  },

  // Helper to recompute studentCount and activeAssignments
  async _syncClassCounts(): Promise<void> {
    const classes = await this.getClasses()
    const students = await this.getStudents()
    const assignments = await this.getAssignments()

    const updated = classes.map((c) => {
      const classStudents = students.filter((s) => s.classId === c.id)
      const classAssignments = assignments.filter((a) => a.classId === c.id && a.status === 'active')
      const avgProg =
        classStudents.length > 0
          ? Math.round(classStudents.reduce((acc, s) => acc + s.progress, 0) / classStudents.length)
          : 0
      const avgScore =
        classStudents.length > 0
          ? Number((classStudents.reduce((acc, s) => acc + s.averageScore, 0) / classStudents.length).toFixed(1))
          : 0

      return {
        ...c,
        studentCount: classStudents.length,
        activeAssignments: classAssignments.length,
        averageProgress: avgProg,
        averageScore: avgScore,
      }
    })
    saveToStorage(STORAGE_KEYS.CLASSES, updated)
  },

  // Reset helper for testing
  _resetMockState(): void {
    if (typeof window !== 'undefined' && window.localStorage) {
      localStorage.removeItem(STORAGE_KEYS.CLASSES)
      localStorage.removeItem(STORAGE_KEYS.STUDENTS)
      localStorage.removeItem(STORAGE_KEYS.ASSIGNMENTS)
      localStorage.removeItem(STORAGE_KEYS.SUBMISSIONS)
      localStorage.removeItem(STORAGE_KEYS.ALERTS)
      localStorage.removeItem(STORAGE_KEYS.ACTIVITIES)
    }
  },
}

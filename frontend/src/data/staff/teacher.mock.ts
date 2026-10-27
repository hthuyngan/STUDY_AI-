import type {
  ClassStudentItem,
  StudentAcademicDetail,
  TeacherAssignmentItem,
  TeacherClassItem,
} from '@/types/teacher'

export interface TeacherRecentSubmission {
  id: string
  studentName: string
  className: string
  assignmentTitle: string
  score: number
  submittedAt: string
}

export interface TeacherAttentionStudent {
  id: string
  name: string
  className: string
  reason: string
  lastActive: string
}

export const INITIAL_MOCK_CLASSES: TeacherClassItem[] = [
  {
    id: 'cls-12a1',
    name: 'Lớp 12A1',
    grade: 'Lớp 12',
    subject: 'Toán học',
    studentCount: 38,
    averageProgress: 72,
    activeAssignments: 2,
    latestActivity: '2026-10-27T10:15:00Z',
  },
  {
    id: 'cls-12a2',
    name: 'Lớp 12A2',
    grade: 'Lớp 12',
    subject: 'Toán học',
    studentCount: 35,
    averageProgress: 64,
    activeAssignments: 1,
    latestActivity: '2026-10-27T09:40:00Z',
  },
  {
    id: 'cls-11b1',
    name: 'Lớp 11B1',
    grade: 'Lớp 11',
    subject: 'Toán học',
    studentCount: 40,
    averageProgress: 58,
    activeAssignments: 2,
    latestActivity: '2026-10-26T16:20:00Z',
  },
]

export const INITIAL_MOCK_STUDENTS: Record<string, ClassStudentItem[]> = {
  'cls-12a1': [
    {
      id: 'stu-1',
      name: 'Nguyễn Minh Anh',
      email: 'minh.anh@example.com',
      progress: 88,
      lessonsCompleted: 16,
      latestScore: 92,
      lastActive: '2026-10-27T10:15:00Z',
      status: 'on-track',
    },
    {
      id: 'stu-2',
      name: 'Trần Gia Huy',
      email: 'gia.huy@example.com',
      progress: 74,
      lessonsCompleted: 13,
      latestScore: 80,
      lastActive: '2026-10-27T08:30:00Z',
      status: 'on-track',
    },
    {
      id: 'stu-3',
      name: 'Đinh Trọng Phúc',
      email: 'dinh.trong@example.com',
      progress: 35,
      lessonsCompleted: 5,
      latestScore: 45,
      lastActive: '2026-10-23T14:10:00Z',
      status: 'needs-attention',
    },
    {
      id: 'stu-4',
      name: 'Võ Thảo My',
      email: 'thao.my@example.com',
      progress: 82,
      lessonsCompleted: 15,
      latestScore: 85,
      lastActive: '2026-10-26T19:00:00Z',
      status: 'on-track',
    },
    {
      id: 'stu-5',
      name: 'Hoàng Hải Đăng',
      email: 'hai.dang@example.com',
      progress: 40,
      lessonsCompleted: 6,
      latestScore: 50,
      lastActive: '2026-10-24T11:20:00Z',
      status: 'needs-attention',
    },
  ],
}

export const INITIAL_MOCK_ASSIGNMENTS: TeacherAssignmentItem[] = [
  {
    id: 'asg-1',
    title: 'Khảo sát và vẽ đồ thị hàm phân thức',
    classId: 'cls-12a1',
    className: 'Lớp 12A1',
    subject: 'Toán học 12',
    lessonIds: ['lesson-math-08'],
    dueDate: '2026-10-30T23:59:00Z',
    submissionsCount: 28,
    totalStudents: 38,
    status: 'active',
  },
  {
    id: 'asg-2',
    title: 'Ôn tập chương: Ứng dụng đạo hàm',
    classId: 'cls-12a1',
    className: 'Lớp 12A1',
    subject: 'Toán học 12',
    lessonIds: ['lesson-math-01', 'lesson-math-02'],
    dueDate: '2026-11-05T23:59:00Z',
    submissionsCount: 14,
    totalStudents: 38,
    status: 'active',
  },
  {
    id: 'asg-3',
    title: 'Luyện đề trắc nghiệm thu hoạch số 1',
    classId: 'cls-12a2',
    className: 'Lớp 12A2',
    subject: 'Toán học 12',
    lessonIds: ['lesson-math-08'],
    dueDate: '2026-10-28T23:59:00Z',
    submissionsCount: 30,
    totalStudents: 35,
    status: 'active',
  },
]

export const INITIAL_TEACHER_DASHBOARD = {
  classesCount: 3,
  studentsCount: 113,
  activeAssignmentsCount: 5,
  studentsNeedingAttentionCount: 8,
  recentSubmissions: [
    {
      id: 'sub-1',
      studentName: 'Nguyễn Minh Anh',
      className: 'Lớp 12A1',
      assignmentTitle: 'Khảo sát và vẽ đồ thị hàm phân thức',
      score: 95,
      submittedAt: '2026-10-27T10:15:00Z',
    },
    {
      id: 'sub-2',
      studentName: 'Trần Gia Huy',
      className: 'Lớp 12A1',
      assignmentTitle: 'Khảo sát và vẽ đồ thị hàm phân thức',
      score: 80,
      submittedAt: '2026-10-27T08:30:00Z',
    },
    {
      id: 'sub-3',
      studentName: 'Võ Thảo My',
      className: 'Lớp 12A1',
      assignmentTitle: 'Ôn tập chương: Ứng dụng đạo hàm',
      score: 88,
      submittedAt: '2026-10-26T21:10:00Z',
    },
  ],
  attentionStudents: [
    {
      id: 'stu-3',
      name: 'Đinh Trọng Phúc',
      className: 'Lớp 12A1',
      reason: 'Chưa nộp 2 bài tập liên tiếp, điểm bài thu hoạch dưới 50%',
      lastActive: '4 ngày trước',
    },
    {
      id: 'stu-5',
      name: 'Hoàng Hải Đăng',
      className: 'Lớp 12A1',
      reason: 'Dừng tiến độ học bài khảo sát hàm số quá 3 ngày',
      lastActive: '3 ngày trước',
    },
  ],
}

export const INITIAL_STUDENT_ACADEMIC_DETAIL: StudentAcademicDetail = {
  id: 'stu-3',
  name: 'Đinh Trọng Phúc',
  email: 'dinh.trong@example.com',
  grade: 'Lớp 12',
  className: 'Lớp 12A1',
  totalLearningMinutes: 240,
  overallProgress: 35,
  averageAssessmentScore: 48,
  recentLessons: [
    {
      id: 'lesson-math-01',
      title: 'Sự đồng biến, nghịch biến của hàm số',
      progress: 60,
      lastActive: '2026-10-23T14:10:00Z',
    },
    {
      id: 'lesson-math-02',
      title: 'Cực trị của hàm số',
      progress: 20,
      lastActive: '2026-10-22T10:00:00Z',
    },
  ],
  assessmentAttempts: [
    {
      id: 'att-1',
      title: 'Thu hoạch: Khảo sát tính đơn điệu hàm số',
      score: 45,
      passed: false,
      date: '2026-10-23T14:25:00Z',
    },
  ],
  weakAreas: [
    'Xác định dấu của đạo hàm bậc hai',
    'Giải bất phương trình lượng giác',
  ],
}

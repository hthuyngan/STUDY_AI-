import type {
  Achievement,
  ChatMessage,
  DailyActivity,
  DailyGoal,
  Lesson,
  PathNode,
  QuizAttempt,
  Student,
  StudyStreak,
  SubjectProgress,
  Topic,
  WeeklyStats,
} from '@/types'

// ============================================================
// STUDENT PROFILE
// ============================================================

export const mockStudent: Student = {
  id: 'stu-001',
  name: 'Nguyễn Minh Anh',
  avatar: 'https://randomuser.me/api/portraits/women/44.jpg',
  grade: '10A1',
  school: 'THPT Nguyễn Du',
  email: 'minh.anh.nguyen@student.edu.vn',
  joinedAt: '2025-09-01',
}

// ============================================================
// STREAK & DAILY GOAL
// ============================================================

export const mockStreak: StudyStreak = {
  current: 7,
  longest: 14,
  lastStudiedAt: new Date().toISOString(),
}

export const mockDailyGoal: DailyGoal = {
  targetMinutes: 60,
  completedMinutes: 35,
  percentage: Math.round((35 / 60) * 100), // 58%
}

// ============================================================
// SUBJECT PROGRESS
// ============================================================

export const mockSubjectProgress: SubjectProgress[] = [
  {
    subjectId: 'math',
    progress: 68,
    totalLessons: 32,
    completedLessons: 22,
    weeklyMinutes: 145,
    lastStudiedAt: '2026-10-05T08:30:00+07:00',
    avgScore: 7.8,
  },
  {
    subjectId: 'literature',
    progress: 52,
    totalLessons: 28,
    completedLessons: 15,
    weeklyMinutes: 80,
    lastStudiedAt: '2026-10-04T14:00:00+07:00',
    avgScore: 7.2,
  },
  {
    subjectId: 'english',
    progress: 74,
    totalLessons: 36,
    completedLessons: 27,
    weeklyMinutes: 190,
    lastStudiedAt: '2026-10-05T20:15:00+07:00',
    avgScore: 8.5,
  },
  {
    subjectId: 'physics',
    progress: 45,
    totalLessons: 24,
    completedLessons: 11,
    weeklyMinutes: 60,
    lastStudiedAt: '2026-10-03T16:00:00+07:00',
    avgScore: 6.9,
  },
  {
    subjectId: 'chemistry',
    progress: 61,
    totalLessons: 26,
    completedLessons: 16,
    weeklyMinutes: 110,
    lastStudiedAt: '2026-10-04T10:30:00+07:00',
    avgScore: 7.4,
  },
  {
    subjectId: 'biology',
    progress: 57,
    totalLessons: 22,
    completedLessons: 13,
    weeklyMinutes: 95,
    lastStudiedAt: '2026-10-02T09:00:00+07:00',
    avgScore: 7.1,
  },
]

// ============================================================
// DAILY ACTIVITY — 30 ngày gần nhất
// ============================================================

function generateDailyActivity(): DailyActivity[] {
  const activities: DailyActivity[] = []
  const today = new Date('2026-10-05')

  // Pattern thực tế: học thường xuyên với vài ngày nghỉ
  const minutePattern = [
    55, 70, 0, 45, 90, 65, 80,   // tuần -4
    30, 75, 60, 0, 55, 40, 85,   // tuần -3
    70, 60, 0, 90, 50, 65, 45,   // tuần -2
    80, 55, 70, 60, 0, 85, 35,   // tuần -1 (streak 7 ngày)
    90, 35,                       // hôm qua, hôm nay (in progress)
  ]

  for (let i = 29; i >= 0; i--) {
    const date = new Date(today)
    date.setDate(today.getDate() - i)
    const dateStr = date.toISOString().split('T')[0]
    const idx = 29 - i

    activities.push({
      date: dateStr,
      minutes: minutePattern[idx] ?? 0,
    })
  }

  return activities
}

export const mockDailyActivity: DailyActivity[] = generateDailyActivity()

// ============================================================
// WEEKLY STATS
// ============================================================

export const mockWeeklyStats: WeeklyStats = {
  weekLabel: 'Tuần này',
  totalMinutes: 315,
  avgMinutesPerDay: 45,
  daysStudied: 6,
  lessonsCompleted: 8,
  quizzesCompleted: 4,
  avgQuizScore: 7.9,
}

export const mockPrevWeeklyStats: WeeklyStats = {
  weekLabel: 'Tuần trước',
  totalMinutes: 280,
  avgMinutesPerDay: 40,
  daysStudied: 5,
  lessonsCompleted: 7,
  quizzesCompleted: 3,
  avgQuizScore: 7.2,
}

// ============================================================
// RECENT LESSONS — 8 bài học gần nhất
// ============================================================

export const mockRecentLessons: Lesson[] = [
  {
    id: 'les-001',
    subjectId: 'english',
    title: 'Unit 3: Life in the Future',
    description: 'Từ vựng và ngữ pháp tương lai, thì tương lai hoàn thành',
    durationMinutes: 45,
    status: 'in-progress',
    progress: 60,
    difficulty: 2,
    xp: 80,
  },
  {
    id: 'les-002',
    subjectId: 'math',
    title: 'Hàm số bậc hai – Đồ thị parabol',
    description: 'Vẽ đồ thị, xác định trục đối xứng và đỉnh parabol',
    durationMinutes: 60,
    status: 'available',
    progress: 0,
    difficulty: 3,
    xp: 120,
  },
  {
    id: 'les-003',
    subjectId: 'math',
    title: 'Phương trình bậc hai một ẩn',
    description: 'Giải phương trình bằng delta, Viète, đặt ẩn phụ',
    durationMinutes: 55,
    status: 'completed',
    progress: 100,
    difficulty: 2,
    completedAt: '2026-10-05T08:30:00+07:00',
    xp: 90,
  },
  {
    id: 'les-004',
    subjectId: 'chemistry',
    title: 'Bảng tuần hoàn – Cấu tạo nguyên tử',
    description: 'Số hiệu nguyên tử, khối lượng nguyên tử, cấu hình electron',
    durationMinutes: 40,
    status: 'completed',
    progress: 100,
    difficulty: 2,
    completedAt: '2026-10-04T10:30:00+07:00',
    xp: 70,
  },
  {
    id: 'les-005',
    subjectId: 'english',
    title: 'Grammar: Reported Speech',
    description: 'Câu tường thuật trực tiếp và gián tiếp trong tiếng Anh',
    durationMinutes: 35,
    status: 'completed',
    progress: 100,
    difficulty: 2,
    completedAt: '2026-10-04T20:00:00+07:00',
    xp: 65,
  },
  {
    id: 'les-006',
    subjectId: 'physics',
    title: 'Chuyển động thẳng đều – Đồ thị',
    description: 'Phân tích đồ thị s-t, v-t của chuyển động thẳng đều',
    durationMinutes: 50,
    status: 'available',
    progress: 0,
    difficulty: 2,
    xp: 85,
  },
  {
    id: 'les-007',
    subjectId: 'literature',
    title: 'Đọc hiểu: Truyện Kiều – Đoạn trích Trao duyên',
    description: 'Phân tích tâm lý nhân vật, nghệ thuật miêu tả tâm trạng',
    durationMinutes: 50,
    status: 'completed',
    progress: 100,
    difficulty: 3,
    completedAt: '2026-10-03T14:00:00+07:00',
    xp: 100,
  },
  {
    id: 'les-008',
    subjectId: 'biology',
    title: 'Tế bào – Cấu trúc và chức năng',
    description: 'Màng tế bào, nhân, ti thể, lưới nội chất, ribosome',
    durationMinutes: 45,
    status: 'available',
    progress: 0,
    difficulty: 1,
    xp: 60,
  },
]

// ============================================================
// TOPICS — Toán học 10 (ví dụ chi tiết cho một môn)
// ============================================================

export const mockMathTopics: Topic[] = [
  {
    id: 'top-m01',
    subjectId: 'math',
    name: 'Mệnh đề và Tập hợp',
    progress: 100,
    lessons: [
      {
        id: 'les-m01-1',
        subjectId: 'math',
        title: 'Mệnh đề – Mệnh đề phủ định',
        description: 'Khái niệm mệnh đề, mệnh đề phủ định, các phép toán mệnh đề',
        durationMinutes: 40,
        status: 'completed',
        progress: 100,
        difficulty: 1,
        completedAt: '2026-09-10',
        xp: 60,
      },
      {
        id: 'les-m01-2',
        subjectId: 'math',
        title: 'Tập hợp và các phép toán tập hợp',
        description: 'Hợp, giao, hiệu tập hợp; ký hiệu và ứng dụng',
        durationMinutes: 45,
        status: 'completed',
        progress: 100,
        difficulty: 1,
        completedAt: '2026-09-12',
        xp: 65,
      },
    ],
  },
  {
    id: 'top-m02',
    subjectId: 'math',
    name: 'Bất phương trình và Hệ bất phương trình',
    progress: 100,
    lessons: [
      {
        id: 'les-m02-1',
        subjectId: 'math',
        title: 'Bất phương trình bậc nhất một ẩn',
        description: 'Giải bất phương trình, biểu diễn nghiệm trên trục số',
        durationMinutes: 40,
        status: 'completed',
        progress: 100,
        difficulty: 1,
        completedAt: '2026-09-18',
        xp: 60,
      },
      {
        id: 'les-m02-2',
        subjectId: 'math',
        title: 'Hệ bất phương trình bậc nhất',
        description: 'Giải hệ bất phương trình, miền nghiệm trên mặt phẳng tọa độ',
        durationMinutes: 55,
        status: 'completed',
        progress: 100,
        difficulty: 2,
        completedAt: '2026-09-22',
        xp: 80,
      },
    ],
  },
  {
    id: 'top-m03',
    subjectId: 'math',
    name: 'Phương trình bậc hai',
    progress: 85,
    lessons: [
      {
        id: 'les-m03-1',
        subjectId: 'math',
        title: 'Phương trình bậc hai một ẩn',
        description: 'Giải phương trình bậc hai bằng delta và Viète',
        durationMinutes: 55,
        status: 'completed',
        progress: 100,
        difficulty: 2,
        completedAt: '2026-10-01',
        xp: 90,
      },
      {
        id: 'les-m03-2',
        subjectId: 'math',
        title: 'Hệ thức Viète và ứng dụng',
        description: 'Ứng dụng hệ thức Viète trong giải toán thực tế',
        durationMinutes: 50,
        status: 'in-progress',
        progress: 40,
        difficulty: 2,
        xp: 85,
      },
      {
        id: 'les-m03-3',
        subjectId: 'math',
        title: 'Phương trình quy về bậc hai (đặt ẩn phụ)',
        description: 'Phương pháp đặt ẩn phụ cho phương trình bậc cao',
        durationMinutes: 60,
        status: 'locked',
        progress: 0,
        difficulty: 3,
        xp: 120,
      },
    ],
  },
  {
    id: 'top-m04',
    subjectId: 'math',
    name: 'Hàm số và Đồ thị',
    progress: 20,
    lessons: [
      {
        id: 'les-m04-1',
        subjectId: 'math',
        title: 'Khái niệm hàm số – Tập xác định',
        description: 'Định nghĩa hàm số, cách tìm tập xác định',
        durationMinutes: 45,
        status: 'available',
        progress: 0,
        difficulty: 1,
        xp: 65,
      },
      {
        id: 'les-m04-2',
        subjectId: 'math',
        title: 'Hàm số bậc hai – Đồ thị parabol',
        description: 'Vẽ đồ thị, xác định trục đối xứng và đỉnh parabol',
        durationMinutes: 60,
        status: 'locked',
        progress: 0,
        difficulty: 3,
        xp: 120,
      },
    ],
  },
]

// ============================================================
// QUIZ HISTORY — 6 lần làm gần nhất
// ============================================================

export const mockQuizHistory: QuizAttempt[] = [
  {
    id: 'quiz-001',
    subjectId: 'english',
    topicName: 'Grammar: Reported Speech',
    questions: 10,
    correct: 9,
    score: 9.0,
    timeTakenSeconds: 480,
    completedAt: '2026-10-05T09:00:00+07:00',
  },
  {
    id: 'quiz-002',
    subjectId: 'math',
    topicName: 'Phương trình bậc hai – Delta',
    questions: 10,
    correct: 8,
    score: 8.0,
    timeTakenSeconds: 612,
    completedAt: '2026-10-04T15:00:00+07:00',
  },
  {
    id: 'quiz-003',
    subjectId: 'chemistry',
    topicName: 'Cấu tạo nguyên tử',
    questions: 10,
    correct: 7,
    score: 7.0,
    timeTakenSeconds: 540,
    completedAt: '2026-10-03T11:00:00+07:00',
  },
  {
    id: 'quiz-004',
    subjectId: 'physics',
    topicName: 'Chuyển động thẳng đều',
    questions: 10,
    correct: 6,
    score: 6.0,
    timeTakenSeconds: 720,
    completedAt: '2026-10-02T16:00:00+07:00',
  },
  {
    id: 'quiz-005',
    subjectId: 'biology',
    topicName: 'Tế bào nhân thực – Cấu trúc',
    questions: 10,
    correct: 8,
    score: 8.0,
    timeTakenSeconds: 495,
    completedAt: '2026-10-01T10:00:00+07:00',
  },
  {
    id: 'quiz-006',
    subjectId: 'literature',
    topicName: 'Truyện Kiều – Phân tích đoạn trích',
    questions: 8,
    correct: 6,
    score: 7.5,
    timeTakenSeconds: 580,
    completedAt: '2026-09-30T14:00:00+07:00',
  },
]

// ============================================================
// ACHIEVEMENTS
// ============================================================

export const mockAchievements: Achievement[] = [
  // Đã mở khoá
  {
    id: 'ach-001',
    category: 'streak',
    title: 'Lửa Bắt Đầu',
    description: 'Học liên tiếp 3 ngày',
    icon: '🔥',
    unlockedAt: '2026-09-15',
    progress: 100,
    xp: 50,
  },
  {
    id: 'ach-002',
    category: 'streak',
    title: 'Kiên Trì 7 Ngày',
    description: 'Học liên tiếp 7 ngày',
    icon: '🏆',
    unlockedAt: '2026-10-05',
    progress: 100,
    xp: 150,
  },
  {
    id: 'ach-003',
    category: 'quiz',
    title: 'Thiên Tài Anh Văn',
    description: 'Đạt điểm 9+ trong bài quiz Tiếng Anh',
    icon: '⭐',
    unlockedAt: '2026-10-05',
    progress: 100,
    xp: 100,
  },
  {
    id: 'ach-004',
    category: 'progress',
    title: 'Vượt Mức 50%',
    description: 'Hoàn thành hơn 50% ít nhất 3 môn học',
    icon: '🎯',
    unlockedAt: '2026-10-01',
    progress: 100,
    xp: 200,
  },
  {
    id: 'ach-005',
    category: 'time',
    title: 'Buổi Sáng Năng Động',
    description: 'Học trước 8h sáng ít nhất 5 lần',
    icon: '🌅',
    unlockedAt: '2026-09-25',
    progress: 100,
    xp: 75,
  },
  // Chưa mở khoá
  {
    id: 'ach-006',
    category: 'streak',
    title: 'Siêu Kiên Trì',
    description: 'Học liên tiếp 14 ngày',
    icon: '💪',
    unlockedAt: null,
    progress: 50, // 7/14 ngày
    xp: 300,
  },
  {
    id: 'ach-007',
    category: 'progress',
    title: 'Toàn Diện',
    description: 'Đạt tiến độ 70%+ ở tất cả 6 môn',
    icon: '🎓',
    unlockedAt: null,
    progress: 33, // 2/6 môn đã qua 70%
    xp: 500,
  },
  {
    id: 'ach-008',
    category: 'quiz',
    title: 'Thách Thức Khó',
    description: 'Hoàn thành 5 bài quiz độ khó Cao',
    icon: '🧩',
    unlockedAt: null,
    progress: 20, // 1/5
    xp: 250,
  },
  {
    id: 'ach-009',
    category: 'time',
    title: 'Marathon Học Tập',
    description: 'Học hơn 90 phút trong một ngày',
    icon: '⏱️',
    unlockedAt: null,
    progress: 60, // đã có ngày 90 phút nhưng chưa đủ điều kiện xác nhận
    xp: 120,
  },
  {
    id: 'ach-010',
    category: 'social',
    title: 'Chia Sẻ Kiến Thức',
    description: 'Đặt 10 câu hỏi cho AI Tutor',
    icon: '💬',
    unlockedAt: null,
    progress: 70, // 7/10
    xp: 80,
  },
]

// ============================================================
// LEARNING PATH — 10 node gần nhất (Toán)
// ============================================================

export const mockLearningPath: PathNode[] = [
  {
    id: 'node-001',
    subjectId: 'math',
    title: 'Mệnh đề & Tập hợp',
    type: 'lesson',
    status: 'completed',
    xp: 60,
    estimatedMinutes: 40,
  },
  {
    id: 'node-002',
    subjectId: 'math',
    title: 'Quiz: Mệnh đề & Tập hợp',
    type: 'quiz',
    status: 'completed',
    xp: 50,
    estimatedMinutes: 15,
  },
  {
    id: 'node-003',
    subjectId: 'math',
    title: 'Bất phương trình bậc nhất',
    type: 'lesson',
    status: 'completed',
    xp: 65,
    estimatedMinutes: 45,
  },
  {
    id: 'node-004',
    subjectId: 'math',
    title: 'Hệ bất phương trình',
    type: 'lesson',
    status: 'completed',
    xp: 80,
    estimatedMinutes: 55,
  },
  {
    id: 'node-005',
    subjectId: 'math',
    title: 'Ôn tập: Bất phương trình',
    type: 'review',
    status: 'completed',
    xp: 40,
    estimatedMinutes: 20,
  },
  {
    id: 'node-006',
    subjectId: 'math',
    title: 'Phương trình bậc hai – Delta',
    type: 'lesson',
    status: 'completed',
    xp: 90,
    estimatedMinutes: 55,
  },
  {
    id: 'node-007',
    subjectId: 'math',
    title: 'Hệ thức Viète',
    type: 'lesson',
    status: 'current',
    xp: 85,
    estimatedMinutes: 50,
  },
  {
    id: 'node-008',
    subjectId: 'math',
    title: 'Quiz: Phương trình bậc hai',
    type: 'quiz',
    status: 'available',
    xp: 70,
    estimatedMinutes: 20,
  },
  {
    id: 'node-009',
    subjectId: 'math',
    title: 'Đặt ẩn phụ – Phương trình đặc biệt',
    type: 'lesson',
    status: 'locked',
    xp: 120,
    estimatedMinutes: 60,
  },
  {
    id: 'node-010',
    subjectId: 'math',
    title: '🏆 Boss: Kiểm tra Chương 3',
    type: 'boss',
    status: 'locked',
    xp: 200,
    estimatedMinutes: 45,
  },
]

// ============================================================
// AI TUTOR — Demo conversation
// ============================================================

export const mockChatHistory: ChatMessage[] = [
  {
    id: 'msg-001',
    role: 'assistant',
    content:
      'Xin chào Minh Anh! Mình là AI Tutor của bạn 🎓 Hôm nay bạn muốn học hoặc ôn tập môn nào?',
    timestamp: '2026-10-05T08:00:00+07:00',
  },
  {
    id: 'msg-002',
    role: 'user',
    content: 'Em đang học về hệ thức Viète, nhưng chưa hiểu phần ứng dụng lắm.',
    timestamp: '2026-10-05T08:01:00+07:00',
    subjectId: 'math',
  },
  {
    id: 'msg-003',
    role: 'assistant',
    content:
      'Hay lắm! Hệ thức Viète rất hay ứng dụng trong thực tế. Nếu phương trình bậc hai **ax² + bx + c = 0** có hai nghiệm x₁, x₂ thì:\n\n• **x₁ + x₂ = -b/a** (tổng hai nghiệm)\n• **x₁ · x₂ = c/a** (tích hai nghiệm)\n\nBạn có thể dùng điều này để:\n1. **Tìm nghiệm** mà không cần giải phương trình\n2. **Lập phương trình** khi biết hai nghiệm\n3. **Tính giá trị biểu thức** của nghiệm\n\nBạn muốn thử một bài tập ứng dụng không? 😊',
    timestamp: '2026-10-05T08:01:30+07:00',
    subjectId: 'math',
  },
  {
    id: 'msg-004',
    role: 'user',
    content: 'Cho em thử bài tập ví dụ đi ạ.',
    timestamp: '2026-10-05T08:02:00+07:00',
    subjectId: 'math',
  },
  {
    id: 'msg-005',
    role: 'assistant',
    content:
      'Được thôi! Thử bài này:\n\n---\n\n📝 **Bài tập:** Cho phương trình **x² - 5x + 6 = 0** có hai nghiệm x₁, x₂. Tính:\n\na) x₁ + x₂\nb) x₁ · x₂  \nc) x₁² + x₂²\n\n---\n\n*Gợi ý cho câu c): dùng hằng đẳng thức (x₁ + x₂)² - 2x₁x₂*\n\nBạn thử làm rồi mình kiểm tra nhé! 🙌',
    timestamp: '2026-10-05T08:02:30+07:00',
    subjectId: 'math',
  },
]

import type { LessonDetail } from '@/types/lesson'

export const mockLessonsDetail: Record<string, LessonDetail> = {
  'lesson-math-08': {
    id: 'lesson-math-08',
    courseId: 'math-12',
    courseTitle: 'Ứng dụng đạo hàm để khảo sát & vẽ đồ thị hàm số',
    subjectId: 'math',
    subjectName: 'Toán 12',
    chapterId: 'chap-1',
    chapterTitle: 'Chương 1: Khảo sát sự biến thiên của hàm số',
    lessonNumber: 8,
    title: 'Khảo sát sự biến thiên và vẽ đồ thị hàm số',
    durationMinutes: 50,
    xp: 60,
    isCompleted: false,
    isBookmarked: true,
    quizId: 'quiz-math-08',
    previousLessonId: 'lesson-math-04',
    nextLessonId: 'lesson-math-09',
    content: {
      introduction:
        'Khảo sát sự biến thiên và vẽ đồ thị hàm số là bước tổng hợp toàn bộ kiến thức về tập xác định, tính đơn điệu, cực trị và tiệm cận. Đây là nền tảng để giải quyết các bài toán về tương giao, biện luận nghiệm và bài toán thực tế trong đề thi THPT Quốc gia.',
      definitions: [
        {
          term: 'Sơ đồ khảo sát hàm số chuẩn',
          content:
            'Quy trình gồm 3 bước: 1) Tìm tập xác định D; 2) Khảo sát sự biến thiên (tính y\', tìm nghiệm y\'=0, tính giới hạn tại vô cực/tiệm cận, lập bảng biến thiên); 3) Vẽ đồ thị (xác định giao điểm với trục tọa độ Ox, Oy, điểm uốn và tính đối xứng).',
        },
        {
          term: 'Điểm uốn của đồ thị hàm số',
          content:
            'Điểm uốn I(x₀; y₀) là điểm mà tại đó đồ thị đổi chiều từ lồi sang lõm (hoặc ngược lại). Điểm uốn thỏa mãn phương trình đạo hàm cấp hai y\'\'(x₀) = 0 và y\'\' đổi dấu khi qua x₀.',
        },
      ],
      formulas: [
        {
          id: 'f-1',
          label: 'Hàm số bậc ba tổng quát',
          formula: 'y = ax^3 + bx^2 + cx + d \\quad (a \\neq 0)',
          note: 'Đạo hàm: y\' = 3ax^2 + 2bx + c. Đồ thị nhận điểm uốn I(-b/3a; y(-b/3a)) làm tâm đối xứng.',
        },
        {
          id: 'f-2',
          label: 'Hàm phân thức bậc nhất / bậc nhất',
          formula: 'y = \\frac{ax + b}{cx + d} \\quad (c \\neq 0, \\, ad - bc \\neq 0)',
          note: 'Đạo hàm: y\' = (ad - bc) / (cx + d)^2. Tiệm cận đứng x = -d/c; Tiệm cận ngang y = a/c. Giao điểm hai tiệm cận I(-d/c; a/c) là tâm đối xứng.',
        },
      ],
      examples: [
        {
          id: 'ex-1',
          title: 'Ví dụ 1: Khảo sát hàm số bậc ba y = x³ - 3x² + 2',
          problem: 'Khảo sát sự biến thiên và vẽ đồ thị (C) của hàm số y = x³ - 3x² + 2.',
          solutionSteps: [
            {
              step: 1,
              explanation: 'Tập xác định: D = ℝ.',
              math: 'D = \\mathbb{R}',
            },
            {
              step: 2,
              explanation: 'Tính đạo hàm y\' và tìm điểm dừng:',
              math: 'y\' = 3x^2 - 6x = 3x(x - 2); \\quad y\' = 0 \\iff x = 0 \\text{ hoặc } x = 2.',
            },
            {
              step: 3,
              explanation: 'Xác định khoảng đơn điệu và cực trị: Hàm số đồng biến trên (-∞; 0) và (2; +∞), nghịch biến trên (0; 2). Cực đại tại (0; 2), cực tiểu tại (2; -2).',
            },
            {
              step: 4,
              explanation: 'Tính đạo hàm cấp hai tìm tâm đối xứng (điểm uốn):',
              math: 'y\'\' = 6x - 6 = 0 \\iff x = 1 \\implies y(1) = 0. \\text{ Điểm uốn } I(1; 0).',
            },
          ],
          conclusion: 'Đồ thị là đường cong hình chữ N uốn quanh tâm I(1; 0), cắt trục Oy tại (0; 2) và trục Ox tại 3 điểm phân biệt.',
        },
      ],
      importantNotes: [
        'Không bao giờ quên điều kiện mẫu số khác 0 đối với hàm phân thức hữu tỉ.',
        'Đồ thị hàm phân thức bậc nhất không bao giờ có cực trị (do đạo hàm luôn dương hoặc luôn âm trên từng khoảng xác định).',
        'Khi kết luận khoảng đồng biến / nghịch biến của hàm phân thức, dùng từ "và" hoặc liệt kê từng khoảng riêng biệt, tuyệt đối không dùng ký hiệu hợp ∪.',
      ],
      summaryPoints: [
        'Hàm bậc 3: Luôn có 1 điểm uốn làm tâm đối xứng, có 2 điểm cực trị khi Δ_y\' > 0, hoặc không có cực trị khi Δ_y\' ≤ 0.',
        'Hàm phân thức bậc nhất: Có 1 TCĐ, 1 TCN, tâm đối xứng là giao điểm 2 tiệm cận, không có cực trị.',
        'Hàm trùng phương bậc 4: Nhận trục tung Oy làm trục đối xứng, có 1 hoặc 3 điểm cực trị.',
      ],
    },
  },
  'lesson-math-02': {
    id: 'lesson-math-02',
    courseId: 'math-12',
    courseTitle: 'Ứng dụng đạo hàm để khảo sát & vẽ đồ thị hàm số',
    subjectId: 'math',
    subjectName: 'Toán 12',
    chapterId: 'chap-1',
    chapterTitle: 'Chương 1: Khảo sát sự biến thiên của hàm số',
    lessonNumber: 2,
    title: 'Cực trị của hàm số',
    durationMinutes: 45,
    xp: 50,
    isCompleted: true,
    isBookmarked: false,
    quizId: 'quiz-math-02',
    previousLessonId: 'lesson-math-01',
    nextLessonId: 'lesson-math-03',
    content: {
      introduction:
        'Cực trị của hàm số là một trong những khái niệm quan trọng nhất của Giải tích 12, mô tả các điểm cao nhất hoặc thấp nhất mang tính cục bộ của đồ thị hàm số.',
      definitions: [
        {
          term: 'Điểm cực đại và cực tiểu',
          content:
            'Điểm x₀ được gọi là điểm cực đại của hàm số f nếu tồn tại một khoảng (a; b) chứa x₀ sao cho f(x) < f(x₀) với mọi x ∈ (a; b) \\ {x₀}. Tương tự với điểm cực tiểu.',
        },
      ],
      formulas: [
        {
          id: 'f-ext-1',
          label: 'Quy tắc 1 (Dấu của đạo hàm cấp một)',
          formula: 'y\'(x_0) = 0 \\text{ và } y\' \\text{ đổi dấu từ dương sang âm qua } x_0 \\implies x_0 \\text{ là điểm cực đại.}',
        },
        {
          id: 'f-ext-2',
          label: 'Quy tắc 2 (Dùng đạo hàm cấp hai)',
          formula: 'y\'(x_0) = 0 \\text{ và } y\'\'(x_0) < 0 \\implies x_0 \\text{ là điểm cực đại; } y\'\'(x_0) > 0 \\implies x_0 \\text{ là điểm cực tiểu.}',
        },
      ],
      examples: [
        {
          id: 'ex-ext-1',
          title: 'Tìm cực trị của hàm số y = -x³ + 3x - 1',
          problem: 'Tìm các điểm cực trị của hàm số y = -x³ + 3x - 1.',
          solutionSteps: [
            {
              step: 1,
              explanation: 'Tập xác định D = ℝ. Tính đạo hàm y\' = -3x² + 3.',
              math: 'y\' = -3x^2 + 3 = 0 \\iff x^2 = 1 \\iff x = 1 \\text{ hoặc } x = -1.',
            },
            {
              step: 2,
              explanation: 'Dùng đạo hàm cấp hai: y\'\' = -6x.',
              math: 'y\'\'(-1) = 6 > 0 \\implies x = -1 \\text{ là điểm cực tiểu}; \\, y\'\'(1) = -6 < 0 \\implies x = 1 \\text{ là điểm cực đại}.',
            },
          ],
          conclusion: 'Hàm số đạt cực tiểu tại x = -1 với y_CT = -3; đạt cực đại tại x = 1 với y_CD = 1.',
        },
      ],
      importantNotes: [
        'Điểm cực trị của hàm số là x₀. Giá trị cực trị là f(x₀). Điểm cực trị của đồ thị là cặp tọa độ M(x₀; f(x₀)).',
      ],
      summaryPoints: [
        'Hàm số có thể đạt cực trị tại điểm mà đạo hàm không tồn tại (nhưng liên tục).',
        'Nếu y\' không đổi dấu khi qua x₀ thì x₀ không phải là điểm cực trị.',
      ],
    },
  },
  'lesson-phy-04': {
    id: 'lesson-phy-04',
    courseId: 'phy-12',
    courseTitle: 'Dao động cơ học & Các hệ dao động điều hòa',
    subjectId: 'physics',
    subjectName: 'Vật lý 12',
    chapterId: 'phy-chap-1',
    chapterTitle: 'Chương 1: Dao động điều hòa',
    lessonNumber: 4,
    title: 'Con lắc lò xo và phương trình dao động điều hòa',
    durationMinutes: 40,
    xp: 50,
    isCompleted: false,
    quizId: 'quiz-physics-ac',
    content: {
      introduction:
        'Con lắc lò xo gồm một vật nhỏ khối lượng m gắn vào lò xo có độ cứng k. Đây là mô hình vật lý cơ bản để nghiên cứu dao động điều hòa và sự chuyển hóa năng lượng.',
      definitions: [
        {
          term: 'Con lắc lò xo',
          content: 'Hệ gồm vật nặng m và lò xo nhẹ có độ cứng k, bỏ qua mọi ma sát và lực cản của môi trường.',
        },
      ],
      formulas: [
        {
          id: 'f-phy-1',
          label: 'Tần số góc và chu kỳ',
          formula: '\\omega = \\sqrt{\\frac{k}{m}}, \\quad T = 2\\pi \\sqrt{\\frac{m}{k}}',
        },
        {
          id: 'f-phy-2',
          label: 'Cơ năng của con lắc lò xo',
          formula: 'W = W_t + W_d = \\frac{1}{2} k x^2 + \\frac{1}{2} m v^2 = \\frac{1}{2} k A^2 = \\text{const}',
        },
      ],
      examples: [
        {
          id: 'ex-phy-1',
          title: 'Tính chu kỳ dao động',
          problem: 'Một con lắc lò xo có m = 100g, k = 100 N/m. Lấy π² = 10. Tính chu kỳ dao động.',
          solutionSteps: [
            {
              step: 1,
              explanation: 'Đổi đơn vị: m = 0.1 kg, k = 100 N/m.',
            },
            {
              step: 2,
              explanation: 'Áp dụng công thức chu kỳ:',
              math: 'T = 2\\pi \\sqrt{\\frac{0.1}{100}} = 2\\pi \\sqrt{\\frac{1}{1000}} = 0.2\\text{ giây}.',
            },
          ],
          conclusion: 'Chu kỳ dao động của con lắc là T = 0.2 s.',
        },
      ],
      importantNotes: ['Cơ năng của con lắc lò xo tỉ lệ thuận với bình phương biên độ dao động.'],
      summaryPoints: ['Khi vật qua VTCB: thế năng = 0, động năng cực đại. Khi vật ở biên: động năng = 0, thế năng cực đại.'],
    },
  },
}

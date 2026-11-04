import type { LessonAssessment } from '@/types/assessment'

export const mockAssessments: Record<string, LessonAssessment> = {
  // Lesson 1: Tính đơn điệu và cực trị
  'lesson-math-12-01': {
    id: 'assessment-math-12-01',
    lessonId: 'lesson-math-12-01',
    subjectId: 'math',
    title: 'Bài tập thu hoạch · Tính đơn điệu và cực trị của hàm số',
    description:
      'Bài tập thu hoạch gồm 5 câu hỏi kiểm tra mức độ nắm vững dấu của đạo hàm, khoảng đồng biến/nghịch biến và các quy tắc tìm cực trị.',
    estimatedMinutes: 8,
    passingScorePercent: 60,
    questions: [
      {
        id: 'q-math-01-1',
        type: 'single-choice',
        prompt:
          'Cho hàm số y = f(x) có đạo hàm f\'(x) = x(x - 2)². Khoảng đồng biến của hàm số là khoảng nào sau đây?',
        topic: 'Tính đơn điệu của hàm số',
        options: [
          { id: 'opt-01-1-a', label: 'A', text: '(0; +∞)' },
          { id: 'opt-01-1-b', label: 'B', text: '(-∞; 0)' },
          { id: 'opt-01-1-c', label: 'C', text: '(0; 2)' },
          { id: 'opt-01-1-d', label: 'D', text: '(2; +∞)' },
        ],
        correctOptionId: 'opt-01-1-a',
        explanation:
          'Ta có f\'(x) = 0 ⇔ x = 0 hoặc x = 2 (nghiệm bội chẵn). Vì (x - 2)² ≥ 0 với mọi x, dấu của f\'(x) chỉ phụ thuộc vào x. Do đó f\'(x) > 0 khi x > 0 (với x ≠ 2 thì f\' > 0, tại x = 2 thì f\' = 0). Theo định lý mở rộng, hàm số đồng biến trên (0; +∞).',
      },
      {
        id: 'q-math-01-2',
        type: 'single-choice',
        prompt:
          'Cho hàm số y = f(x) có đạo hàm f\'(x) = (x - 1)(x + 2)³(x - 3)⁴. Số điểm cực trị của hàm số đã cho là:',
        topic: 'Số điểm cực trị của hàm số',
        options: [
          { id: 'opt-01-2-a', label: 'A', text: '1' },
          { id: 'opt-01-2-b', label: 'B', text: '2' },
          { id: 'opt-01-2-c', label: 'C', text: '3' },
          { id: 'opt-01-2-d', label: 'D', text: '4' },
        ],
        correctOptionId: 'opt-01-2-b',
        explanation:
          'Điểm cực trị là điểm mà tại đó đạo hàm f\'(x) đổi dấu. f\'(x) đổi dấu qua nghiệm bội lẻ x = 1 (bậc 1) và x = -2 (bậc 3). Qua nghiệm x = 3 (bội chẵn bậc 4), f\'(x) không đổi dấu. Vậy hàm số có đúng 2 điểm cực trị.',
      },
      {
        id: 'q-math-01-3',
        type: 'single-choice',
        prompt:
          'Hàm số y = -x³ + 3x - 1 đạt cực đại tại điểm nào sau đây?',
        topic: 'Điểm cực đại của hàm số',
        options: [
          { id: 'opt-01-3-a', label: 'A', text: 'x = 1' },
          { id: 'opt-01-3-b', label: 'B', text: 'x = -1' },
          { id: 'opt-01-3-c', label: 'C', text: 'y = 1' },
          { id: 'opt-01-3-d', label: 'D', text: '(1; 1)' },
        ],
        correctOptionId: 'opt-01-3-a',
        explanation:
          'Ta có y\' = -3x² + 3 = 0 ⇔ x = ±1. y\'\' = -6x. Tại x = 1, y\'\'(1) = -6 < 0 nên theo quy tắc 2, hàm số đạt cực đại tại điểm x = 1.',
      },
      {
        id: 'q-math-01-4',
        type: 'true-false',
        prompt:
          'Đúng hay Sai: Nếu hàm số y = f(x) có đạo hàm tại x0 và f\'(x0) = 0 thì x0 nhất thiết phải là điểm cực trị của hàm số?',
        topic: 'Điều kiện cần của cực trị',
        options: [
          { id: 'opt-01-4-t', label: 'Đúng', text: 'Đúng, đạo hàm bằng 0 luôn là điểm cực trị.' },
          { id: 'opt-01-4-f', label: 'Sai', text: 'Sai, f\'(x0) = 0 chỉ là điều kiện cần; đạo hàm phải đổi dấu khi qua x0.' },
        ],
        correctOptionId: 'opt-01-4-f',
        explanation:
          'f\'(x0) = 0 chỉ là điều kiện cần. Ví dụ hàm y = x³ có y\'(0) = 0 nhưng y\' = 3x² ≥ 0 không đổi dấu qua 0 nên x = 0 không phải điểm cực trị.',
      },
      {
        id: 'q-math-01-5',
        type: 'single-choice',
        prompt:
          'Hàm số phân thức y = (2x - 1) / (x + 1) có tính đơn điệu như thế nào?',
        topic: 'Đơn điệu hàm phân thức',
        options: [
          { id: 'opt-01-5-a', label: 'A', text: 'Đồng biến trên từng khoảng (-∞; -1) và (-1; +∞)' },
          { id: 'opt-01-5-b', label: 'B', text: 'Đồng biến trên ℝ \\ {-1}' },
          { id: 'opt-01-5-c', label: 'C', text: 'Nghịch biến trên (-∞; -1) ∪ (-1; +∞)' },
          { id: 'opt-01-5-d', label: 'D', text: 'Nghịch biến trên ℝ' },
        ],
        correctOptionId: 'opt-01-5-a',
        explanation:
          'Tập xác định D = ℝ \\ {-1}. Ta có y\' = (2·1 - (-1)·1) / (x + 1)² = 3 / (x + 1)² > 0 với mọi x ≠ -1. Do đó hàm số đồng biến trên từng khoảng xác định (-∞; -1) và (-1; +∞).',
      },
    ],
  },

  // Lesson 2: GTLN & GTNN
  'lesson-math-12-02': {
    id: 'assessment-math-12-02',
    lessonId: 'lesson-math-12-02',
    subjectId: 'math',
    title: 'Bài tập thu hoạch · Giá trị lớn nhất và nhỏ nhất của hàm số',
    description:
      'Bài tập thu hoạch gồm 5 câu hỏi kiểm tra kỹ năng tìm GTLN, GTNN trên đoạn đóng, trên khoảng mở và bài toán tối ưu thực tiễn.',
    estimatedMinutes: 8,
    passingScorePercent: 60,
    questions: [
      {
        id: 'q-math-02-1',
        type: 'single-choice',
        prompt:
          'Giá trị nhỏ nhất của hàm số f(x) = x³ - 3x² + 2 trên đoạn [-1; 3] bằng bao nhiêu?',
        topic: 'GTNN trên đoạn đóng',
        options: [
          { id: 'opt-02-1-a', label: 'A', text: '-2' },
          { id: 'opt-02-1-b', label: 'B', text: '2' },
          { id: 'opt-02-1-c', label: 'C', text: '0' },
          { id: 'opt-02-1-d', label: 'D', text: '-4' },
        ],
        correctOptionId: 'opt-02-1-a',
        explanation:
          'f\'(x) = 3x² - 6x = 0 ⇔ x = 0, x = 2 thuộc (-1; 3). Tính f(-1) = -2, f(0) = 2, f(2) = -2, f(3) = 2. Giá trị nhỏ nhất là -2.',
      },
      {
        id: 'q-math-02-2',
        type: 'single-choice',
        prompt:
          'Giá trị lớn nhất của hàm số y = (x - 2) / (x + 1) trên đoạn [0; 2] là:',
        topic: 'GTLN hàm phân thức trên đoạn',
        options: [
          { id: 'opt-02-2-a', label: 'A', text: '0' },
          { id: 'opt-02-2-b', label: 'B', text: '-2' },
          { id: 'opt-02-2-c', label: 'C', text: '1' },
          { id: 'opt-02-2-d', label: 'D', text: '2' },
        ],
        correctOptionId: 'opt-02-2-a',
        explanation:
          'y\' = (1·1 - (-2)·1) / (x + 1)² = 3 / (x + 1)² > 0 với mọi x thuộc [0; 2]. Hàm số luôn đồng biến trên [0; 2] nên GTLN đạt tại x = 2: y(2) = (2 - 2)/(2 + 1) = 0.',
      },
      {
        id: 'q-math-02-3',
        type: 'single-choice',
        prompt:
          'Cho hàm số y = x + 4/x trên khoảng (0; +∞). Giá trị nhỏ nhất của hàm số trên khoảng này là:',
        topic: 'GTNN trên khoảng bằng Cauchy',
        options: [
          { id: 'opt-02-3-a', label: 'A', text: '4' },
          { id: 'opt-02-3-b', label: 'B', text: '2' },
          { id: 'opt-02-3-c', label: 'C', text: '5' },
          { id: 'opt-02-3-d', label: 'D', text: 'Không tồn tại' },
        ],
        correctOptionId: 'opt-02-3-a',
        explanation:
          'Áp dụng bất đẳng thức Cauchy cho hai số dương x và 4/x: y = x + 4/x ≥ 2√(x · 4/x) = 4. Dấu bằng xảy ra khi x = 4/x ⇔ x² = 4 ⇔ x = 2 (do x > 0). Vậy min y = 4.',
      },
      {
        id: 'q-math-02-4',
        type: 'true-false',
        prompt:
          'Đúng hay Sai: Một hàm số f(x) liên tục trên khoảng mở (a; b) thì luôn luôn có giá trị lớn nhất và giá trị nhỏ nhất trên khoảng đó?',
        topic: 'Điều kiện đạt max/min trên khoảng',
        options: [
          { id: 'opt-02-4-t', label: 'Đúng', text: 'Đúng, hàm liên tục luôn có max và min.' },
          { id: 'opt-02-4-f', label: 'Sai', text: 'Sai, định lý chỉ đảm bảo trên đoạn đóng [a; b], trên khoảng mở có thể không có.' },
        ],
        correctOptionId: 'opt-02-4-f',
        explanation:
          'Sai. Định lý Weierstrass chỉ đảm bảo trên đoạn đóng [a; b]. Trên khoảng mở, ví dụ hàm y = 1/x trên (0; 1) có lim khi x→0+ là +∞ nên không có GTLN.',
      },
      {
        id: 'q-math-02-5',
        type: 'single-choice',
        prompt:
          'Một bác nông dân muốn rào một khu vườn hình chữ nhật có một cạnh là bờ sông (không cần rào) bằng 40m lưới rào. Diện tích lớn nhất của khu vườn là:',
        topic: 'Bài toán tối ưu hóa thực tiễn',
        options: [
          { id: 'opt-02-5-a', label: 'A', text: '200 m²' },
          { id: 'opt-02-5-b', label: 'B', text: '100 m²' },
          { id: 'opt-02-5-c', label: 'C', text: '400 m²' },
          { id: 'opt-02-5-d', label: 'D', text: '150 m²' },
        ],
        correctOptionId: 'opt-02-5-a',
        explanation:
          'Gọi chiều rộng vuông góc với bờ sông là x (m, x > 0). Chiều dài song song với bờ sông là 40 - 2x. Diện tích S(x) = x(40 - 2x) = -2x² + 40x. Ta có S\'(x) = -4x + 40 = 0 ⇔ x = 10. Khi đó S_max = 10 · 20 = 200 m².',
      },
    ],
  },

  // Lesson 3: Khảo sát và vẽ đồ thị
  'lesson-math-12-03': {
    id: 'assessment-math-12-03',
    lessonId: 'lesson-math-12-03',
    subjectId: 'math',
    title: 'Bài tập thu hoạch · Khảo sát sự biến thiên và vẽ đồ thị hàm số',
    description:
      'Bài tập thu hoạch gồm 5 câu hỏi kiểm tra mức độ nắm vững các bước khảo sát hàm số, tính đơn điệu, cực trị, tiệm cận và tâm đối xứng.',
    estimatedMinutes: 8,
    passingScorePercent: 60,
    questions: [
      {
        id: 'q-math-08-1',
        type: 'single-choice',
        prompt:
          'Cho hàm số y = ax³ + bx² + cx + d (a ≠ 0). Điểm uốn I(x₀; y₀) của đồ thị hàm số có hoành độ x₀ thỏa mãn phương trình nào sau đây?',
        topic: 'Điểm uốn đồ thị hàm số',
        options: [
          { id: 'opt-1-a', label: 'A', text: "y'(x₀) = 0" },
          { id: 'opt-1-b', label: 'B', text: "y''(x₀) = 0 và y'' đổi dấu khi qua x₀" },
          { id: 'opt-1-c', label: 'C', text: 'y(x₀) = 0' },
          { id: 'opt-1-d', label: 'D', text: "y'(x₀) > 0" },
        ],
        correctOptionId: 'opt-1-b',
        explanation:
          "Điểm uốn I(x₀; y₀) là điểm mà tại đó đồ thị đổi chiều từ lồi sang lõm (hoặc ngược lại). Điều kiện cần và đủ là đạo hàm cấp hai y''(x₀) = 0 và y'' đổi dấu khi đi qua x₀.",
      },
      {
        id: 'q-math-08-2',
        type: 'single-choice',
        prompt:
          'Đồ thị hàm số phân thức bậc nhất y = (ax + b) / (cx + d) với c ≠ 0, ad - bc ≠ 0 có tâm đối xứng là giao điểm của:',
        topic: 'Tâm đối xứng hàm phân thức',
        options: [
          { id: 'opt-2-a', label: 'A', text: 'Hai trục tọa độ Ox và Oy' },
          { id: 'opt-2-b', label: 'B', text: 'Hai đường tiệm cận đứng và tiệm cận ngang' },
          { id: 'opt-2-c', label: 'C', text: 'Điểm cực đại và điểm cực tiểu' },
          { id: 'opt-2-d', label: 'D', text: 'Trục đối xứng song song với Oy' },
        ],
        correctOptionId: 'opt-2-b',
        explanation:
          'Hàm số phân thức hữu tỉ bậc nhất y = (ax+b)/(cx+d) luôn nhận giao điểm I(-d/c; a/c) của hai đường tiệm cận đứng x = -d/c và tiệm cận ngang y = a/c làm tâm đối xứng.',
      },
      {
        id: 'q-math-08-3',
        type: 'single-choice',
        prompt:
          'Cho hàm số y = x³ - 3x² + 2. Khoảng nghịch biến của hàm số là khoảng nào sau đây?',
        topic: 'Tính đơn điệu của hàm số',
        options: [
          { id: 'opt-3-a', label: 'A', text: '(-∞; 0)' },
          { id: 'opt-3-b', label: 'B', text: '(0; 2)' },
          { id: 'opt-3-c', label: 'C', text: '(2; +∞)' },
          { id: 'opt-3-d', label: 'D', text: '(-∞; 2)' },
        ],
        correctOptionId: 'opt-3-b',
        explanation:
          "Ta có y' = 3x² - 6x = 3x(x - 2). y' = 0 ⇔ x = 0 hoặc x = 2. Trong khoảng (0; 2), y' < 0 nên hàm số nghịch biến trên (0; 2).",
      },
      {
        id: 'q-math-08-4',
        type: 'single-choice',
        prompt:
          'Đồ thị hàm số y = ax⁴ + bx² + c (a ≠ 0) có đặc điểm đối xứng nào sau đây?',
        topic: 'Tính đối xứng hàm trùng phương',
        options: [
          { id: 'opt-4-a', label: 'A', text: 'Nhận gốc tọa độ O làm tâm đối xứng' },
          { id: 'opt-4-b', label: 'B', text: 'Nhận trục hoành Ox làm trục đối xứng' },
          { id: 'opt-4-c', label: 'C', text: 'Nhận trục tung Oy làm trục đối xứng' },
          { id: 'opt-4-d', label: 'D', text: 'Không có trục hoặc tâm đối xứng' },
        ],
        correctOptionId: 'opt-4-c',
        explanation:
          'Hàm số y = ax⁴ + bx² + c là hàm số chẵn vì f(-x) = f(x) với mọi x ∈ ℝ. Do đó, đồ thị của nó luôn nhận trục tung Oy làm trục đối xứng.',
      },
      {
        id: 'q-math-08-5',
        type: 'single-choice',
        prompt:
          'Cho hàm số y = f(x) có đồ thị (C) như đã khảo sát với cực đại tại (0; 2) và cực tiểu tại (2; -2). Phương trình f(x) = m có đúng 3 nghiệm thực phân biệt khi và chỉ khi:',
        topic: 'Sự tương giao của đồ thị',
        options: [
          { id: 'opt-5-a', label: 'A', text: '-2 < m < 2' },
          { id: 'opt-5-b', label: 'B', text: 'm > 2' },
          { id: 'opt-5-c', label: 'C', text: 'm < -2' },
          { id: 'opt-5-d', label: 'D', text: 'm = -2 hoặc m = 2' },
        ],
        correctOptionId: 'opt-5-a',
        explanation:
          'Số nghiệm của phương trình f(x) = m là số giao điểm giữa đồ thị (C) và đường thẳng y = m. Đường thẳng y = m cắt (C) tại 3 điểm phân biệt khi và chỉ khi y_CT < m < y_CD, tức là -2 < m < 2.',
      },
    ],
  },
}

// Backward-compatible aliases
mockAssessments['lesson-math-01'] = mockAssessments['lesson-math-12-01']
mockAssessments['lesson-math-02'] = mockAssessments['lesson-math-12-02']
mockAssessments['lesson-math-08'] = mockAssessments['lesson-math-12-03']
mockAssessments['les-math-12-01'] = mockAssessments['lesson-math-12-03']

export function getMockAssessmentByLessonId(
  lessonId: string,
  subjectId: string = 'math',
  lessonTitle: string = 'Bài học'
): LessonAssessment {
  if (mockAssessments[lessonId]) {
    return mockAssessments[lessonId]
  }

  // Fallback for any other lesson ID
  return {
    id: `assessment-${lessonId}`,
    lessonId,
    subjectId,
    title: `Bài tập thu hoạch · ${lessonTitle}`,
    description:
      'Bài tập thu hoạch cuối bài gồm các câu hỏi trắc nghiệm kiến thức cốt lõi. Hãy hoàn thành để đạt 100% tiến độ bài học.',
    estimatedMinutes: 6,
    passingScorePercent: 60,
    questions: [
      {
        id: `q-${lessonId}-1`,
        type: 'single-choice',
        prompt: `Khái niệm trọng tâm được giới thiệu trong "${lessonTitle}" nhằm mục tiêu nào?`,
        topic: 'Kiến thức cốt lõi',
        options: [
          { id: 'opt-fb-1-a', label: 'A', text: 'Xác định điều kiện và tính chất nền tảng của bài học' },
          { id: 'opt-fb-1-b', label: 'B', text: 'Chỉ áp dụng cho trường hợp đặc biệt' },
          { id: 'opt-fb-1-c', label: 'C', text: 'Thay thế hoàn toàn định lý cơ bản' },
          { id: 'opt-fb-1-d', label: 'D', text: 'Không liên quan đến đề thi THPT' },
        ],
        correctOptionId: 'opt-fb-1-a',
        explanation:
          'Khái niệm trọng tâm giúp người học nắm chắc nền tảng lý thuyết và điều kiện áp dụng chuẩn xác trong bài thi.',
      },
      {
        id: `q-${lessonId}-2`,
        type: 'single-choice',
        prompt: 'Khi giải quyết bài toán dạng này, bước đầu tiên quan trọng nhất là gì?',
        topic: 'Phương pháp giải',
        options: [
          { id: 'opt-fb-2-a', label: 'A', text: 'Xác định tập xác định và điều kiện có nghĩa của bài toán' },
          { id: 'opt-fb-2-b', label: 'B', text: 'Biến đổi biểu thức ngay lập tức không cần điều kiện' },
          { id: 'opt-fb-2-c', label: 'C', text: 'Bỏ qua các trường hợp biên' },
          { id: 'opt-fb-2-d', label: 'D', text: 'Chọn ngẫu nhiên nghiệm' },
        ],
        correctOptionId: 'opt-fb-2-a',
        explanation:
          'Xác định tập xác định và điều kiện có nghĩa là nguyên tắc tiên quyết để tránh bẫy nghiệm ngoại lai.',
      },
      {
        id: `q-${lessonId}-3`,
        type: 'true-false',
        prompt: 'Đúng hay Sai: Cần ghi nhớ các công thức tính nhanh và ví dụ mẫu trước khi làm bài tập tự luyện?',
        topic: 'Kỹ năng làm bài',
        options: [
          { id: 'opt-fb-3-t', label: 'Đúng', text: 'Đúng, ghi nhớ công thức và phương pháp giúp tiết kiệm thời gian.' },
          { id: 'opt-fb-3-f', label: 'Sai', text: 'Sai, chỉ cần đoán mò đáp án.' },
        ],
        correctOptionId: 'opt-fb-3-t',
        explanation:
          'Nắm vững công thức và ví dụ giải mẫu giúp người học tăng tốc độ và độ chính xác khi giải đề trắc nghiệm.',
      },
    ],
  }
}

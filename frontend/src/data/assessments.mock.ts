import type { LessonAssessment } from '@/types/assessment'

export const mockAssessments: Record<string, LessonAssessment> = {
  'lesson-math-08': {
    id: 'assessment-math-08',
    lessonId: 'lesson-math-08',
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
          'Đồ thị hàm số bậc bốn trùng phương y = ax⁴ + bx² + c (a ≠ 0) luôn có trục đối xứng là trục nào?',
        topic: 'Tính đối xứng hàm trùng phương',
        options: [
          { id: 'opt-4-a', label: 'A', text: 'Trục hoành Ox' },
          { id: 'opt-4-b', label: 'B', text: 'Trục tung Oy' },
          { id: 'opt-4-c', label: 'C', text: 'Đường thẳng y = x' },
          { id: 'opt-4-d', label: 'D', text: 'Không có trục đối xứng' },
        ],
        correctOptionId: 'opt-4-b',
        explanation:
          'Vì y = f(x) = ax⁴ + bx² + c là hàm số chẵn (f(-x) = f(x) với mọi x ∈ ℝ) nên đồ thị luôn nhận trục tung Oy làm trục đối xứng.',
      },
      {
        id: 'q-math-08-5',
        type: 'true-false',
        prompt:
          'Nhận định sau đây Đúng hay Sai: "Đồ thị của mọi hàm số bậc ba luôn cắt trục hoành Ox tại ít nhất một điểm."',
        topic: 'Sự tương giao của đồ thị',
        options: [
          { id: 'opt-5-true', label: 'Đúng', text: 'Đúng, hàm bậc ba luôn có ít nhất một nghiệm thực.' },
          { id: 'opt-5-false', label: 'Sai', text: 'Sai, hàm bậc ba có thể vô nghiệm thực.' },
        ],
        correctOptionId: 'opt-5-true',
        explanation:
          'Đúng. Vì lim(x→-∞) f(x) và lim(x→+∞) f(x) luôn trái dấu nhau đối với đa thức bậc ba f(x), do tính liên tục trên ℝ nên đồ thị hàm số luôn cắt trục hoành tại ít nhất 1 điểm (định lý giá trị trung gian).',
      },
    ],
  },
}

/**
 * Helper to retrieve assessment for a given lesson ID.
 * Generates an automatic fallback assessment if a dedicated mock does not exist yet.
 */
export function getMockAssessmentByLessonId(
  lessonId: string,
  subjectId: string,
  lessonTitle: string
): LessonAssessment {
  if (mockAssessments[lessonId]) {
    return mockAssessments[lessonId]
  }

  // Fallback assessment for any other lesson
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

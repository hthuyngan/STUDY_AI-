import type { QuestionItem } from '@/types/questionBank'

/**
 * Standardized Question Bank Data — GDPT 2018 (Toán 12 — Tập 1, Chương 1)
 * Bộ sách: Kết nối tri thức với cuộc sống.
 *
 * Tổng cộng: 22 câu hỏi mẫu kiểm chứng toán học:
 *  - 12 câu Multiple Choice (MCQ) có 4 phương án A, B, C, D
 *  - 4 nhóm True / False Group (TF Group) với đúng 4 nhận định a, b, c, d mỗi câu (16 nhận định độc lập)
 *  - 6 câu Short Answer (SA) với chuẩn hoá chuỗi & giá trị số học
 *
 * Phân bổ trạng thái:
 *  - 20 câu approved (được kiểm chứng đầy đủ)
 *  - 2 câu needs_review (đánh dấu cần tổ chuyên môn duyệt bổ sung, không lọt vào bài kiểm tra chính thức)
 */

export const mockQuestions: QuestionItem[] = [
  /* =========================================================================
   * PHẦN 1: MULTIPLE CHOICE (12 CÂU)
   * ========================================================================= */

  // 1. Xét dấu đạo hàm & Tính đơn điệu (Nhận biết)
  {
    id: 'qb-math-12-mcq-01',
    subjectId: 'math',
    chapterId: 'chap-math-12-01',
    lessonId: 'lesson-math-12-01',
    skillIds: ['SKILL-MATH-12-DERIV-SIGN', 'SKILL-MATH-12-MONOTONICITY'],
    type: 'multiple_choice',
    stem: 'Cho hàm số $y = f(x)$ có bảng xét dấu đạo hàm như sau:\n\n$$\\begin{array}{c|ccccccc} x & -\\infty & & -1 & & 2 & & +\\infty \\\\ \\hline f\'(x) & & + & 0 & - & 0 & + & \\end{array}$$\n\nHàm số đã cho nghịch biến trên khoảng nào dưới đây?',
    difficulty: 'easy',
    cognitiveLevel: 'recognition',
    options: [
      { id: 'A', text: '(-1; 2)' },
      { id: 'B', text: '(-\\infty; -1)' },
      { id: 'C', text: '(2; +\\infty)' },
      { id: 'D', text: '(-1; +\\infty)' },
    ],
    correctAnswer: 'A',
    explanation: 'Dựa vào bảng xét dấu đạo hàm, ta thấy $f\'(x) < 0$ trên khoảng $(-1; 2)$. Theo định lý về mối liên hệ giữa dấu đạo hàm và tính đơn điệu, hàm số nghịch biến trên khoảng $(-1; 2)$.',
    source: 'Tổ Toán THPT Chuyên môn STUDY_AI',
    reviewStatus: 'approved',
    createdAt: '2026-11-06T10:00:00Z',
    updatedAt: '2026-11-06T10:00:00Z',
  },

  // 2. Nghiệm bội chẵn và tính đơn điệu (Thông hiểu)
  {
    id: 'qb-math-12-mcq-02',
    subjectId: 'math',
    chapterId: 'chap-math-12-01',
    lessonId: 'lesson-math-12-01',
    skillIds: ['SKILL-MATH-12-DERIV-SIGN', 'SKILL-MATH-12-MONOTONICITY'],
    type: 'multiple_choice',
    stem: 'Cho hàm số $y = f(x)$ có đạo hàm $f\'(x) = x(x - 2)^2(x + 1)$ với mọi $x \\in \\mathbb{R}$. Khoảng nghịch biến của hàm số là:',
    difficulty: 'medium',
    cognitiveLevel: 'comprehension',
    options: [
      { id: 'A', text: '(-1; 0)' },
      { id: 'B', text: '(0; 2)' },
      { id: 'C', text: '(-\\infty; -1)' },
      { id: 'D', text: '(0; +\\infty)' },
    ],
    correctAnswer: 'A',
    explanation: 'Ta có $(x - 2)^2 \\ge 0$ với mọi $x$ và triệt tiêu tại $x = 2$ (nghiệm bội chẵn). Do đó dấu của $f\'(x)$ phụ thuộc vào tích $x(x + 1)$.\n- $x(x + 1) < 0 \\iff -1 < x < 0$. Do đó $f\'(x) < 0$ trên $(-1; 0)$.\n- Vậy hàm số nghịch biến trên khoảng $(-1; 0)$.',
    source: 'Đề rèn luyện nâng cao GDPT 2018',
    reviewStatus: 'approved',
    createdAt: '2026-11-06T10:00:00Z',
    updatedAt: '2026-11-06T10:00:00Z',
  },

  // 3. Số điểm cực trị qua đạo hàm (Thông hiểu)
  {
    id: 'qb-math-12-mcq-03',
    subjectId: 'math',
    chapterId: 'chap-math-12-01',
    lessonId: 'lesson-math-12-01',
    skillIds: ['SKILL-MATH-12-EXTREMUM'],
    type: 'multiple_choice',
    stem: 'Cho hàm số $y = f(x)$ xác định và liên tục trên $\\mathbb{R}$ có $f\'(x) = (x - 1)^3(x + 2)^2(x - 4)$. Số điểm cực trị của hàm số đã cho là:',
    difficulty: 'medium',
    cognitiveLevel: 'comprehension',
    options: [
      { id: 'A', text: '2' },
      { id: 'B', text: '3' },
      { id: 'C', text: '1' },
      { id: 'D', text: '4' },
    ],
    correctAnswer: 'A',
    explanation: 'Điểm cực trị là điểm mà tại đó đạo hàm $f\'(x)$ đổi dấu qua nghiệm:\n- $x = 1$: nghiệm bội lẻ (bậc 3) $\\implies$ đạo hàm đổi dấu $\\implies$ là điểm cực trị.\n- $x = -2$: nghiệm bội chẵn (bậc 2) $\\implies$ đạo hàm không đổi dấu $\\implies$ không là điểm cực trị.\n- $x = 4$: nghiệm đơn (bậc 1) $\\implies$ đạo hàm đổi dấu $\\implies$ là điểm cực trị.\nVậy hàm số có đúng 2 điểm cực trị.',
    source: 'Tổ Toán THPT Chuyên môn STUDY_AI',
    reviewStatus: 'approved',
    createdAt: '2026-11-06T10:00:00Z',
    updatedAt: '2026-11-06T10:00:00Z',
  },

  // 4. Cực trị hàm đa thức bậc 3 (Nhận biết)
  {
    id: 'qb-math-12-mcq-04',
    subjectId: 'math',
    chapterId: 'chap-math-12-01',
    lessonId: 'lesson-math-12-01',
    skillIds: ['SKILL-MATH-12-EXTREMUM'],
    type: 'multiple_choice',
    stem: 'Hàm số $y = x^3 - 3x + 2$ đạt cực tiểu tại điểm:',
    difficulty: 'easy',
    cognitiveLevel: 'recognition',
    options: [
      { id: 'A', text: 'x = 1' },
      { id: 'B', text: 'x = -1' },
      { id: 'C', text: 'y = 0' },
      { id: 'D', text: 'x = 0' },
    ],
    correctAnswer: 'A',
    explanation: 'Ta có $y\' = 3x^2 - 3 = 3(x - 1)(x + 1)$. $y\' = 0 \\iff x = 1$ hoặc $x = -1$.\nĐạo hàm bậc hai $y\'\' = 6x$.\n- Tại $x = 1: y\'\'(1) = 6 > 0 \\implies x = 1$ là điểm cực tiểu của hàm số.\n- Tại $x = -1: y\'\'(-1) = -6 < 0 \\implies x = -1$ là điểm cực đại.',
    source: 'SGK Toán 12 Kết nối tri thức',
    reviewStatus: 'approved',
    createdAt: '2026-11-06T10:00:00Z',
    updatedAt: '2026-11-06T10:00:00Z',
  },

  // 5. Giá trị lớn nhất trên đoạn (Thông hiểu)
  {
    id: 'qb-math-12-mcq-05',
    subjectId: 'math',
    chapterId: 'chap-math-12-01',
    lessonId: 'lesson-math-12-02',
    skillIds: ['SKILL-MATH-12-MINMAX-SEGMENT'],
    type: 'multiple_choice',
    stem: 'Giá trị lớn nhất của hàm số $f(x) = x^4 - 2x^2 + 3$ trên đoạn $[0; 2]$ bằng:',
    difficulty: 'medium',
    cognitiveLevel: 'comprehension',
    options: [
      { id: 'A', text: '11' },
      { id: 'B', text: '3' },
      { id: 'C', text: '2' },
      { id: 'D', text: '5' },
    ],
    correctAnswer: 'A',
    explanation: 'Hàm số $f(x)$ liên tục trên $[0; 2]$. Ta có:\n- $f\'(x) = 4x^3 - 4x = 4x(x^2 - 1) = 0 \\iff x = 0$ hoặc $x = 1$ (do xét trên $[0; 2]$, loại $x = -1$).\n- Tính các giá trị:\n  * $f(0) = 3$\n  * $f(1) = 1 - 2 + 3 = 2$\n  * $f(2) = 16 - 8 + 3 = 11$\nSo sánh ta được $\\max_{[0; 2]} f(x) = 11$ tại $x = 2$.',
    source: 'Tổ Toán THPT Chuyên môn STUDY_AI',
    reviewStatus: 'approved',
    createdAt: '2026-11-06T10:00:00Z',
    updatedAt: '2026-11-06T10:00:00Z',
  },

  // 6. Giá trị nhỏ nhất trên khoảng mở (Vận dụng)
  {
    id: 'qb-math-12-mcq-06',
    subjectId: 'math',
    chapterId: 'chap-math-12-01',
    lessonId: 'lesson-math-12-02',
    skillIds: ['SKILL-MATH-12-MINMAX-INTERVAL'],
    type: 'multiple_choice',
    stem: 'Cho hàm số $y = x + \\frac{9}{x}$ với $x > 0$. Khẳng định nào sau đây đúng?',
    difficulty: 'medium',
    cognitiveLevel: 'application',
    options: [
      { id: 'A', text: '\\min_{(0; +\\infty)} y = 6' },
      { id: 'B', text: '\\min_{(0; +\\infty)} y = 3' },
      { id: 'C', text: '\\max_{(0; +\\infty)} y = 6' },
      { id: 'D', text: 'Hàm số không có giá trị nhỏ nhất trên (0; +\\infty)' },
    ],
    correctAnswer: 'A',
    explanation: 'Với $x > 0$, áp dụng bất đẳng thức Cauchy (AM-GM) cho hai số dương $x$ và $\\frac{9}{x}$:\n$$y = x + \\frac{9}{x} \\ge 2\\sqrt{x \\cdot \\frac{9}{x}} = 2 \\cdot 3 = 6$$\nDấu đẳng thức xảy ra khi $x = \\frac{9}{x} \\iff x^2 = 9 \\iff x = 3 > 0$.\nVậy giá trị nhỏ nhất của hàm số trên $(0; +\\infty)$ bằng 6.',
    source: 'Tổ Toán THPT Chuyên môn STUDY_AI',
    reviewStatus: 'approved',
    createdAt: '2026-11-06T10:00:00Z',
    updatedAt: '2026-11-06T10:00:00Z',
  },

  // 7. Tiệm cận đứng và tiệm cận ngang (Nhận biết)
  {
    id: 'qb-math-12-mcq-07',
    subjectId: 'math',
    chapterId: 'chap-math-12-01',
    lessonId: 'lesson-math-12-03',
    skillIds: ['SKILL-MATH-12-ASYMPTOTE'],
    type: 'multiple_choice',
    stem: 'Đồ thị hàm số $y = \\frac{2x - 3}{x + 1}$ có tiệm cận đứng là đường thẳng:',
    difficulty: 'easy',
    cognitiveLevel: 'recognition',
    options: [
      { id: 'A', text: 'x = -1' },
      { id: 'B', text: 'y = 2' },
      { id: 'C', text: 'x = 1' },
      { id: 'D', text: 'y = -3' },
    ],
    correctAnswer: 'A',
    explanation: 'Ta có $\\lim_{x \\to (-1)^+} \\frac{2x - 3}{x + 1} = -\\infty$ và $\\lim_{x \\to (-1)^-} \\frac{2x - 3}{x + 1} = +\\infty$.\nDo đó đường thẳng $x = -1$ là tiệm cận đứng của đồ thị hàm số.',
    source: 'SGK Toán 12 Kết nối tri thức',
    reviewStatus: 'approved',
    createdAt: '2026-11-06T10:00:00Z',
    updatedAt: '2026-11-06T10:00:00Z',
  },

  // 8. Tiệm cận ngang hàm phân thức (Nhận biết)
  {
    id: 'qb-math-12-mcq-08',
    subjectId: 'math',
    chapterId: 'chap-math-12-01',
    lessonId: 'lesson-math-12-03',
    skillIds: ['SKILL-MATH-12-ASYMPTOTE'],
    type: 'multiple_choice',
    stem: 'Tiệm cận ngang của đồ thị hàm số $y = \\frac{3x + 1}{1 - x}$ là đường thẳng:',
    difficulty: 'easy',
    cognitiveLevel: 'recognition',
    options: [
      { id: 'A', text: 'y = -3' },
      { id: 'B', text: 'y = 3' },
      { id: 'C', text: 'x = 1' },
      { id: 'D', text: 'y = 1' },
    ],
    correctAnswer: 'A',
    explanation: 'Ta có $\\lim_{x \\to +\\infty} \\frac{3x + 1}{-x + 1} = \\frac{3}{-1} = -3$ và $\\lim_{x \\to -\\infty} \\frac{3x + 1}{-x + 1} = -3$.\nVậy tiệm cận ngang là đường thẳng $y = -3$.',
    source: 'Tổ Toán THPT Chuyên môn STUDY_AI',
    reviewStatus: 'approved',
    createdAt: '2026-11-06T10:00:00Z',
    updatedAt: '2026-11-06T10:00:00Z',
  },

  // 9. Nhận dạng đồ thị hàm số bậc ba (Thông hiểu)
  {
    id: 'qb-math-12-mcq-09',
    subjectId: 'math',
    chapterId: 'chap-math-12-01',
    lessonId: 'lesson-math-12-03',
    skillIds: ['SKILL-MATH-12-GRAPH-SKETCHING'],
    type: 'multiple_choice',
    stem: 'Đường cong trong hình vẽ là đồ thị của hàm số nào dưới đây?\n*(Đồ thị chữ N ngược đi xuống khi $x \\to +\\infty$, cắt trục tung tại $(0; -1)$, có cực trị tại $x = -1$ và $x = 1$)*',
    difficulty: 'medium',
    cognitiveLevel: 'comprehension',
    options: [
      { id: 'A', text: 'y = -x^3 + 3x - 1' },
      { id: 'B', text: 'y = x^3 - 3x - 1' },
      { id: 'C', text: 'y = -x^3 - 3x - 1' },
      { id: 'D', text: 'y = -x^4 + 2x^2 - 1' },
    ],
    correctAnswer: 'A',
    explanation: 'Nhánh ngoài cùng bên phải đi xuống khi $x \\to +\\infty \\implies a < 0$. Do đó loại B. Đồ thị có hai điểm cực trị nên loại C (hàm bậc ba có $y\' = -3x^2 - 3 < 0$ vô nghiệm). Đồ thị có dạng bậc ba nên loại D. Vậy hàm số là $y = -x^3 + 3x - 1$.',
    source: 'Tổ Toán THPT Chuyên môn STUDY_AI',
    reviewStatus: 'approved',
    createdAt: '2026-11-06T10:00:00Z',
    updatedAt: '2026-11-06T10:00:00Z',
  },

  // 10. Tìm tham số m để hàm bậc ba đơn điệu trên R (Vận dụng)
  {
    id: 'qb-math-12-mcq-10',
    subjectId: 'math',
    chapterId: 'chap-math-12-01',
    lessonId: 'lesson-math-12-01',
    skillIds: ['SKILL-MATH-12-MONOTONICITY'],
    type: 'multiple_choice',
    stem: 'Tìm tất cả các giá trị thực của tham số $m$ để hàm số $y = \\frac{1}{3}x^3 - mx^2 + (m + 2)x - 5$ đồng biến trên $\\mathbb{R}$.',
    difficulty: 'hard',
    cognitiveLevel: 'application',
    options: [
      { id: 'A', text: '-1 \\le m \\le 2' },
      { id: 'B', text: 'm < -1 \\text{ hoặc } m > 2' },
      { id: 'C', text: '-2 \\le m \\le 1' },
      { id: 'D', text: 'm \\le 2' },
    ],
    correctAnswer: 'A',
    explanation: 'Ta có $y\' = x^2 - 2mx + (m + 2)$.\nHàm số đồng biến trên $\\mathbb{R} \\iff y\' \\ge 0$ với mọi $x \\in \\mathbb{R}$.\nĐiều này tương đương:\n$$\\Delta\' = m^2 - 1(m + 2) = m^2 - m - 2 \\le 0 \\iff -1 \\le m \\le 2$$\nVậy $-1 \\le m \\le 2$.',
    source: 'Đề rèn luyện tốt nghiệp THPT chuẩn GDPT 2018',
    reviewStatus: 'approved',
    createdAt: '2026-11-06T10:00:00Z',
    updatedAt: '2026-11-06T10:00:00Z',
  },

  // 11. Ứng dụng thực tế: Thể tích cực đại của hộp chữ nhật (Vận dụng cao)
  {
    id: 'qb-math-12-mcq-11',
    subjectId: 'math',
    chapterId: 'chap-math-12-01',
    lessonId: 'lesson-math-12-02',
    skillIds: ['SKILL-MATH-12-MINMAX-SEGMENT', 'SKILL-MATH-12-MINMAX-INTERVAL'],
    type: 'multiple_choice',
    stem: 'Từ một tấm tôn hình vuông cạnh $12\\text{ cm}$, người ta cắt bỏ 4 hình vuông bằng nhau ở 4 góc rồi gấp thành chiếc hộp không nắp. Để thể tích chiếc hộp lớn nhất thì cạnh của hình vuông cắt bỏ bằng bao nhiêu?',
    difficulty: 'hard',
    cognitiveLevel: 'high_application',
    options: [
      { id: 'A', text: '2\\text{ cm}' },
      { id: 'B', text: '3\\text{ cm}' },
      { id: 'C', text: '4\\text{ cm}' },
      { id: 'D', text: '1.5\\text{ cm}' },
    ],
    correctAnswer: 'A',
    explanation: 'Gọi $x$ (cm) là cạnh hình vuông bị cắt bỏ ($0 < x < 6$).\nKích thước đáy hộp là $12 - 2x$, chiều cao hộp là $x$.\nThể tích hộp: $V(x) = x(12 - 2x)^2 = 4x(6 - x)^2$.\nXét hàm $V(x)$ trên khoảng $(0; 6)$:\n$$V\'(x) = 4[(6 - x)^2 - 2x(6 - x)] = 4(6 - x)(6 - 3x) = 12(6 - x)(2 - x)$$\nVới $x \\in (0; 6)$, $V\'(x) = 0 \\iff x = 2$.\nBảng biến thiên cho thấy $V(x)$ đạt cực đại tại $x = 2$, thể tích lớn nhất khi đó là $V(2) = 2 \\cdot 8^2 = 128\\text{ cm}^3$.',
    source: 'Toán học thực tiễn — GDPT 2018',
    reviewStatus: 'approved',
    createdAt: '2026-11-06T10:00:00Z',
    updatedAt: '2026-11-06T10:00:00Z',
  },

  // 12. Bảng biến thiên hàm hợp (Vận dụng cao - Needs Review)
  {
    id: 'qb-math-12-mcq-12',
    subjectId: 'math',
    chapterId: 'chap-math-12-01',
    lessonId: 'lesson-math-12-01',
    skillIds: ['SKILL-MATH-12-EXTREMUM', 'SKILL-MATH-12-VARIATION-TABLE'],
    type: 'multiple_choice',
    stem: 'Cho hàm số $y = f(x)$ liên tục trên $\\mathbb{R}$ và có đồ thị đạo hàm $f\'(x)$ cắt trục hoành tại các điểm $x = -2, x = 1, x = 3$. Hàm số $g(x) = f(x^2 - 2)$ có bao nhiêu điểm cực trị?',
    difficulty: 'very_hard',
    cognitiveLevel: 'high_application',
    options: [
      { id: 'A', text: '5' },
      { id: 'B', text: '3' },
      { id: 'C', text: '7' },
      { id: 'D', text: '4' },
    ],
    correctAnswer: 'A',
    explanation: 'Ta có $g\'(x) = 2x \\cdot f\'(x^2 - 2)$.\n$g\'(x) = 0 \\iff x = 0$ hoặc $x^2 - 2 \\in \\{-2, 1, 3\\}$.\n- $x = 0$ (nghiệm bội lẻ bậc 1).\n- $x^2 - 2 = -2 \\iff x^2 = 0 \\iff x = 0$ (kết hợp làm nghiệm $x = 0$ thành nghiệm bội 3, vẫn đổi dấu).\n- $x^2 - 2 = 1 \\iff x^2 = 3 \\iff x = \\pm\\sqrt{3}$ (2 nghiệm đơn).\n- $x^2 - 2 = 3 \\iff x^2 = 5 \\iff x = \\pm\\sqrt{5}$ (2 nghiệm đơn).\nTổng cộng $g\'(x)$ đổi dấu tại 5 điểm phân biệt: $0, \\pm\\sqrt{3}, \\pm\\sqrt{5}$. Do đó hàm số $g(x)$ có 5 điểm cực trị.',
    source: 'Đề bồi dưỡng học sinh giỏi phân hóa',
    reviewStatus: 'needs_review',
    reviewerNote: 'Cần kiểm tra thêm giả thiết về tính đổi dấu của f\'(x) tại nghiệm x = -2 trong đồ thị đề bài trước khi xuất bản.',
    createdAt: '2026-11-06T10:00:00Z',
    updatedAt: '2026-11-06T10:00:00Z',
  },

  /* =========================================================================
   * PHẦN 2: TRUE / FALSE GROUP (4 NHÓM = 16 NHẬN ĐỊNH ĐỘC LẬP)
   * ========================================================================= */

  // Nhóm 1: Khảo sát hàm đa thức bậc 3
  {
    id: 'qb-math-12-tfg-01',
    subjectId: 'math',
    chapterId: 'chap-math-12-01',
    lessonId: 'lesson-math-12-01',
    skillIds: ['SKILL-MATH-12-DERIV-SIGN', 'SKILL-MATH-12-MONOTONICITY', 'SKILL-MATH-12-EXTREMUM'],
    type: 'true_false_group',
    stem: 'Cho hàm số $y = f(x) = -x^3 + 3x^2 - 4$. Xét tính đúng/sai của các khẳng định sau:',
    difficulty: 'medium',
    cognitiveLevel: 'comprehension',
    explanation: 'Ta có $f\'(x) = -3x^2 + 6x = -3x(x - 2)$. $f\'(x) = 0 \\iff x = 0$ hoặc $x = 2$.\nBảng biến thiên cho thấy:\n- Hàm số đồng biến trên $(0; 2)$, nghịch biến trên $(-\\infty; 0)$ và $(2; +\\infty)$.\n- Cực tiểu tại $x = 0, y_{CT} = -4$; cực đại tại $x = 2, y_{CĐ} = 0$.',
    source: 'Đề kiểm tra định kỳ Toán 12 GDPT 2018',
    reviewStatus: 'approved',
    createdAt: '2026-11-06T10:00:00Z',
    updatedAt: '2026-11-06T10:00:00Z',
    subItems: [
      {
        id: 'a',
        statement: 'Đạo hàm của hàm số là $f\'(x) = -3x^2 + 6x$.',
        isCorrect: true,
        explanation: 'Ta tính đạo hàm $(-x^3 + 3x^2 - 4)\' = -3x^2 + 6x$. Khẳng định đúng.',
      },
      {
        id: 'b',
        statement: 'Hàm số đồng biến trên khoảng $(0; 2)$.',
        isCorrect: true,
        explanation: 'Với $x \\in (0; 2)$, $f\'(x) = -3x(x - 2) > 0$ nên hàm số đồng biến. Khẳng định đúng.',
      },
      {
        id: 'c',
        statement: 'Hàm số đạt cực đại tại điểm $x = 0$.',
        isCorrect: false,
        explanation: 'Tại $x = 0$, $f\'(x)$ đổi dấu từ âm sang dương nên $x = 0$ là điểm cực tiểu, không phải cực đại. Khẳng định sai.',
      },
      {
        id: 'd',
        statement: 'Giá trị cực đại của hàm số bằng $0$.',
        isCorrect: true,
        explanation: 'Hàm số đạt cực đại tại $x = 2$, giá trị cực đại $y_{CĐ} = f(2) = -8 + 12 - 4 = 0$. Khẳng định đúng.',
      },
    ],
  },

  // Nhóm 2: Khảo sát hàm phân thức bậc nhất / bậc nhất
  {
    id: 'qb-math-12-tfg-02',
    subjectId: 'math',
    chapterId: 'chap-math-12-01',
    lessonId: 'lesson-math-12-03',
    skillIds: ['SKILL-MATH-12-MONOTONICITY', 'SKILL-MATH-12-ASYMPTOTE', 'SKILL-MATH-12-GRAPH-SKETCHING'],
    type: 'true_false_group',
    stem: 'Cho hàm số $y = \\frac{2x + 1}{x - 1}$ có đồ thị là $(C)$. Xét tính đúng/sai của các khẳng định sau:',
    difficulty: 'medium',
    cognitiveLevel: 'comprehension',
    explanation: 'Tập xác định $D = \\mathbb{R} \\setminus \\{1\\}$.\n- Đạo hàm $y\' = \\frac{2(-1) - 1(1)}{(x - 1)^2} = \\frac{-3}{(x - 1)^2} < 0$ với mọi $x \\ne 1$.\n- Tiệm cận đứng $x = 1$, tiệm cận ngang $y = 2$.\n- Tâm đối xứng $I(1; 2)$.',
    source: 'SGK Toán 12 Kết nối tri thức',
    reviewStatus: 'approved',
    createdAt: '2026-11-06T10:00:00Z',
    updatedAt: '2026-11-06T10:00:00Z',
    subItems: [
      {
        id: 'a',
        statement: 'Tập xác định của hàm số là $D = \\mathbb{R} \\setminus \\{1\\}$.',
        isCorrect: true,
        explanation: 'Mẫu số triệt tiêu khi $x = 1$. Do đó $D = \\mathbb{R} \\setminus \\{1\\}$. Khẳng định đúng.',
      },
      {
        id: 'b',
        statement: 'Hàm số nghịch biến trên $\\mathbb{R} \\setminus \\{1\\}$.',
        isCorrect: false,
        explanation: 'Sai về mặt ký hiệu tập hợp: Hàm số chỉ nghịch biến trên từng khoảng xác định $(-\\infty; 1)$ và $(1; +\\infty)$, không kết luận nghịch biến trên $\\mathbb{R} \\setminus \\{1\\}$. Khẳng định sai.',
      },
      {
        id: 'c',
        statement: 'Đồ thị $(C)$ có tiệm cận đứng là $x = 1$ và tiệm cận ngang là $y = 2$.',
        isCorrect: true,
        explanation: '$\\lim_{x \\to 1^+} y = +\\infty$ nên $x = 1$ là TCĐ; $\\lim_{x \\to \\pm\\infty} y = 2$ nên $y = 2$ là TCN. Khẳng định đúng.',
      },
      {
        id: 'd',
        statement: 'Giao điểm của hai đường tiệm cận là $I(1; 2)$ và là tâm đối xứng của đồ thị $(C)$.',
        isCorrect: true,
        explanation: 'Đồ thị hàm phân thức hữu tỉ nhận giao điểm hai đường tiệm cận $I(1; 2)$ làm tâm đối xứng. Khẳng định đúng.',
      },
    ],
  },

  // Nhóm 3: Giá trị lớn nhất & nhỏ nhất trên đoạn [-1; 2]
  {
    id: 'qb-math-12-tfg-03',
    subjectId: 'math',
    chapterId: 'chap-math-12-01',
    lessonId: 'lesson-math-12-02',
    skillIds: ['SKILL-MATH-12-MINMAX-SEGMENT'],
    type: 'true_false_group',
    stem: 'Cho hàm số $f(x) = x^3 - 3x^2 + 2$ trên đoạn $[-1; 2]$. Xét tính đúng/sai của các mệnh đề sau:',
    difficulty: 'medium',
    cognitiveLevel: 'application',
    explanation: 'Hàm số $f(x)$ liên tục trên $[-1; 2]$.\n- $f\'(x) = 3x^2 - 6x = 3x(x - 2)$. $f\'(x) = 0 \\iff x = 0$ hoặc $x = 2$ (cả hai đều thuộc $[-1; 2]$).\n- Các giá trị:\n  * $f(-1) = -1 - 3 + 2 = -2$\n  * $f(0) = 2$\n  * $f(2) = 8 - 12 + 2 = -2$',
    source: 'Tổ Toán THPT Chuyên môn STUDY_AI',
    reviewStatus: 'approved',
    createdAt: '2026-11-06T10:00:00Z',
    updatedAt: '2026-11-06T10:00:00Z',
    subItems: [
      {
        id: 'a',
        statement: 'Đạo hàm $f\'(x) = 0$ có hai nghiệm phân biệt trên đoạn $[-1; 2]$.',
        isCorrect: true,
        explanation: 'Nghiệm $x = 0$ và $x = 2$ đều thuộc $[-1; 2]$. Khẳng định đúng.',
      },
      {
        id: 'b',
        statement: 'Giá trị lớn nhất của hàm số trên đoạn $[-1; 2]$ bằng $2$.',
        isCorrect: true,
        explanation: 'Trong các giá trị $\\{-2, 2, -2\\}$, số lớn nhất là $2$ tại $x = 0$. Khẳng định đúng.',
      },
      {
        id: 'c',
        statement: 'Giá trị nhỏ nhất của hàm số trên đoạn $[-1; 2]$ bằng $-1$.',
        isCorrect: false,
        explanation: 'Giá trị nhỏ nhất là $-2$ (đạt tại $x = -1$ và $x = 2$), không phải $-1$. Khẳng định sai.',
      },
      {
        id: 'd',
        statement: 'Tổng giá trị lớn nhất và giá trị nhỏ nhất của hàm số trên đoạn $[-1; 2]$ bằng $0$.',
        isCorrect: true,
        explanation: 'Ta có $\\max f(x) + \\min f(x) = 2 + (-2) = 0$. Khẳng định đúng.',
      },
    ],
  },

  // Nhóm 4: Bài toán tiếp tuyến và tiệm cận (Vận dụng cao - Needs Review)
  {
    id: 'qb-math-12-tfg-04',
    subjectId: 'math',
    chapterId: 'chap-math-12-01',
    lessonId: 'lesson-math-12-03',
    skillIds: ['SKILL-MATH-12-ASYMPTOTE', 'SKILL-MATH-12-GRAPH-SKETCHING'],
    type: 'true_false_group',
    stem: 'Cho hàm số $y = \\frac{x^2 - x + 1}{x - 1}$ có đồ thị $(C)$. Xét tính đúng/sai của các khẳng định sau:',
    difficulty: 'hard',
    cognitiveLevel: 'high_application',
    explanation: 'Ta biến đổi: $y = \\frac{x(x - 1) + 1}{x - 1} = x + \\frac{1}{x - 1}$.\n- Tiệm cận đứng $x = 1$.\n- Tiệm cận xiên $y = x$ vì $\\lim_{x \\to \\pm\\infty} [y - x] = \\lim_{x \\to \\pm\\infty} \\frac{1}{x - 1} = 0$.',
    source: 'Đề bồi dưỡng thi học sinh giỏi cấp trường',
    reviewStatus: 'needs_review',
    reviewerNote: 'Khái niệm đường tiệm cận xiên được giới thiệu trong SGK KNTT tập 1; cần đối chiếu phạm vi giảm tải của đề thi tốt nghiệp GDPT 2018.',
    createdAt: '2026-11-06T10:00:00Z',
    updatedAt: '2026-11-06T10:00:00Z',
    subItems: [
      {
        id: 'a',
        statement: 'Đồ thị $(C)$ có đường tiệm cận đứng là $x = 1$.',
        isCorrect: true,
        explanation: '$\\lim_{x \\to 1^+} y = +\\infty$. Khẳng định đúng.',
      },
      {
        id: 'b',
        statement: 'Đồ thị $(C)$ có đường tiệm cận ngang là $y = 1$.',
        isCorrect: false,
        explanation: 'Khi $x \\to \\pm\\infty$, $y \\to \\pm\\infty$ nên đồ thị không có tiệm cận ngang. Khẳng định sai.',
      },
      {
        id: 'c',
        statement: 'Đồ thị $(C)$ có đường tiệm cận xiên là $y = x$.',
        isCorrect: true,
        explanation: 'Do $\\lim_{x \\to \\pm\\infty} [y - x] = 0$. Khẳng định đúng.',
      },
      {
        id: 'd',
        statement: 'Hàm số đã cho có hai điểm cực trị nằm về cùng một phía đối với tiệm cận đứng.',
        isCorrect: false,
        explanation: 'Đạo hàm $y\' = 1 - \\frac{1}{(x - 1)^2} = 0 \\iff (x - 1)^2 = 1 \\iff x = 0$ hoặc $x = 2$. Điểm $x = 0 < 1$ và $x = 2 > 1$ nằm về hai phía khác nhau của tiệm cận đứng $x = 1$. Khẳng định sai.',
      },
    ],
  },

  /* =========================================================================
   * PHẦN 3: SHORT ANSWER (6 CÂU)
   * ========================================================================= */

  // 1. Số điểm cực trị của hàm bậc 4 trùng phương
  {
    id: 'qb-math-12-sa-01',
    subjectId: 'math',
    chapterId: 'chap-math-12-01',
    lessonId: 'lesson-math-12-01',
    skillIds: ['SKILL-MATH-12-EXTREMUM'],
    type: 'short_answer',
    stem: 'Hàm số $y = x^4 - 4x^2 + 3$ có bao nhiêu điểm cực trị?',
    difficulty: 'easy',
    cognitiveLevel: 'recognition',
    acceptedAnswers: ['3', '3.0', 'ba'],
    displayAnswer: '3',
    explanation: 'Ta có $y\' = 4x^3 - 8x = 4x(x^2 - 2)$. Phương trình $y\' = 0$ có 3 nghiệm đơn phân biệt: $x = 0, x = \\sqrt{2}, x = -\\sqrt{2}$. Do đó hàm số có đúng 3 điểm cực trị.',
    source: 'Tổ Toán THPT Chuyên môn STUDY_AI',
    reviewStatus: 'approved',
    createdAt: '2026-11-06T10:00:00Z',
    updatedAt: '2026-11-06T10:00:00Z',
  },

  // 2. Giá trị cực đại của hàm số
  {
    id: 'qb-math-12-sa-02',
    subjectId: 'math',
    chapterId: 'chap-math-12-01',
    lessonId: 'lesson-math-12-01',
    skillIds: ['SKILL-MATH-12-EXTREMUM'],
    type: 'short_answer',
    stem: 'Tìm giá trị cực đại của hàm số $y = -x^3 + 3x + 2$.',
    difficulty: 'medium',
    cognitiveLevel: 'comprehension',
    acceptedAnswers: ['4', '4.0'],
    displayAnswer: '4',
    explanation: 'Ta có $y\' = -3x^2 + 3 = 0 \\iff x = \\pm 1$.\n$y\'\' = -6x$. Tại $x = 1$, $y\'\'(1) = -6 < 0 \\implies$ hàm số đạt cực đại tại $x = 1$.\nGiá trị cực đại tương ứng là $y_{CĐ} = y(1) = -1 + 3 + 2 = 4$.',
    source: 'Tổ Toán THPT Chuyên môn STUDY_AI',
    reviewStatus: 'approved',
    createdAt: '2026-11-06T10:00:00Z',
    updatedAt: '2026-11-06T10:00:00Z',
  },

  // 3. Giá trị nhỏ nhất của hàm số trên đoạn
  {
    id: 'qb-math-12-sa-03',
    subjectId: 'math',
    chapterId: 'chap-math-12-01',
    lessonId: 'lesson-math-12-02',
    skillIds: ['SKILL-MATH-12-MINMAX-SEGMENT'],
    type: 'short_answer',
    stem: 'Tìm giá trị nhỏ nhất của hàm số $f(x) = x^3 - 3x^2 + 1$ trên đoạn $[1; 3]$.',
    difficulty: 'medium',
    cognitiveLevel: 'comprehension',
    acceptedAnswers: ['-3', '-3.0'],
    displayAnswer: '-3',
    explanation: 'Hàm số liên tục trên $[1; 3]$.\n$f\'(x) = 3x^2 - 6x = 3x(x - 2) = 0 \\iff x = 0$ (loại) hoặc $x = 2$ (nhận vì $2 \\in [1; 3]$).\nTính giá trị:\n- $f(1) = 1 - 3 + 1 = -1$\n- $f(2) = 8 - 12 + 1 = -3$\n- $f(3) = 27 - 27 + 1 = 1$\nVậy giá trị nhỏ nhất của hàm số là $-3$ tại $x = 2$.',
    source: 'SGK Toán 12 Kết nối tri thức',
    reviewStatus: 'approved',
    createdAt: '2026-11-06T10:00:00Z',
    updatedAt: '2026-11-06T10:00:00Z',
  },

  // 4. Số đường tiệm cận của đồ thị hàm phân thức
  {
    id: 'qb-math-12-sa-04',
    subjectId: 'math',
    chapterId: 'chap-math-12-01',
    lessonId: 'lesson-math-12-03',
    skillIds: ['SKILL-MATH-12-ASYMPTOTE'],
    type: 'short_answer',
    stem: 'Đồ thị hàm số $y = \\frac{2x - 1}{x + 3}$ có tổng số đường tiệm cận đứng và tiệm cận ngang là bao nhiêu?',
    difficulty: 'easy',
    cognitiveLevel: 'recognition',
    acceptedAnswers: ['2', '2.0', 'hai'],
    displayAnswer: '2',
    explanation: 'Đồ thị hàm số phân thức bậc nhất / bậc nhất có:\n- 1 đường tiệm cận đứng: $x = -3$\n- 1 đường tiệm cận ngang: $y = 2$\nTổng số đường tiệm cận là $1 + 1 = 2$.',
    source: 'Tổ Toán THPT Chuyên môn STUDY_AI',
    reviewStatus: 'approved',
    createdAt: '2026-11-06T10:00:00Z',
    updatedAt: '2026-11-06T10:00:00Z',
  },

  // 5. Giá trị nhỏ nhất của hàm số trên khoảng (Phân số / số thập phân)
  {
    id: 'qb-math-12-sa-05',
    subjectId: 'math',
    chapterId: 'chap-math-12-01',
    lessonId: 'lesson-math-12-02',
    skillIds: ['SKILL-MATH-12-MINMAX-INTERVAL'],
    type: 'short_answer',
    stem: 'Tìm giá trị nhỏ nhất của hàm số $y = x + \\frac{1}{x}$ trên khoảng $(0; +\\infty)$.',
    difficulty: 'medium',
    cognitiveLevel: 'comprehension',
    acceptedAnswers: ['2', '2.0'],
    displayAnswer: '2',
    explanation: 'Áp dụng bất đẳng thức AM-GM cho hai số dương $x$ và $\\frac{1}{x}$:\n$$y = x + \\frac{1}{x} \\ge 2\\sqrt{x \\cdot \\frac{1}{x}} = 2$$\nDấu bằng xảy ra khi $x = \\frac{1}{x} \\iff x = 1 > 0$. Vậy giá trị nhỏ nhất là 2.',
    source: 'Tổ Toán THPT Chuyên môn STUDY_AI',
    reviewStatus: 'approved',
    createdAt: '2026-11-06T10:00:00Z',
    updatedAt: '2026-11-06T10:00:00Z',
  },

  // 6. Hoành độ giao điểm của tiệm cận (Số nguyên)
  {
    id: 'qb-math-12-sa-06',
    subjectId: 'math',
    chapterId: 'chap-math-12-01',
    lessonId: 'lesson-math-12-03',
    skillIds: ['SKILL-MATH-12-ASYMPTOTE', 'SKILL-MATH-12-GRAPH-SKETCHING'],
    type: 'short_answer',
    stem: 'Gọi $I(x_0; y_0)$ là tâm đối xứng của đồ thị hàm số $y = \\frac{3x - 2}{x - 4}$. Giá trị của $x_0 + y_0$ bằng bao nhiêu?',
    difficulty: 'medium',
    cognitiveLevel: 'application',
    acceptedAnswers: ['7', '7.0'],
    displayAnswer: '7',
    explanation: 'Tâm đối xứng $I$ của đồ thị hàm phân thức $y = \\frac{ax + b}{cx + d}$ là giao điểm của tiệm cận đứng và tiệm cận ngang:\n- Tiệm cận đứng: $x = 4 \\implies x_0 = 4$.\n- Tiệm cận ngang: $y = 3 \\implies y_0 = 3$.\nVậy $x_0 + y_0 = 4 + 3 = 7$.',
    source: 'Tổ Toán THPT Chuyên môn STUDY_AI',
    reviewStatus: 'approved',
    createdAt: '2026-11-06T10:00:00Z',
    updatedAt: '2026-11-06T10:00:00Z',
  },
]

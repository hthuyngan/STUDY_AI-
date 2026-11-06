/**
 * Master Curriculum Data — STUDY_AI Phase 9
 * Standardized 9-Subject Structure according to Vietnam GDPT 2018.
 * Provides deep sample content for Math 12 (Ứng dụng đạo hàm để khảo sát hàm số).
 */

import type { CurriculumSubject, Skill } from '@/types/curriculum'

export const MASTER_SKILLS: Skill[] = [
  // Math 12 - Chapter 1 Core Standardized Skill Clusters (GDPT 2018)
  {
    id: 'sk-math-12-deriv-sign',
    code: 'SKILL-MATH-12-DERIV-SIGN',
    name: 'Xét dấu đạo hàm',
    subjectId: 'math',
    grade: '12',
    description: 'Tính đạo hàm và lập bảng xét dấu đạo hàm cấp một để xác định chiều biến thiên của hàm số.',
    category: 'conceptual',
  },
  {
    id: 'sk-math-12-mono',
    code: 'SKILL-MATH-12-MONOTONICITY',
    name: 'Xét tính đơn điệu',
    subjectId: 'math',
    grade: '12',
    description: 'Vận dụng định lý đạo hàm cấp một để kết luận khoảng đồng biến, nghịch biến của hàm số.',
    category: 'conceptual',
  },
  {
    id: 'sk-math-12-extr',
    code: 'SKILL-MATH-12-EXTREMUM',
    name: 'Xác định cực trị',
    subjectId: 'math',
    grade: '12',
    description: 'Tìm điểm cực đại, cực tiểu và tính giá trị cực trị dựa vào quy tắc 1 hoặc quy tắc 2.',
    category: 'procedural',
  },
  {
    id: 'sk-math-12-var-table',
    code: 'SKILL-MATH-12-VARIATION-TABLE',
    name: 'Lập và đọc bảng biến thiên',
    subjectId: 'math',
    grade: '12',
    description: 'Lập bảng biến thiên hoàn chỉnh (tập xác định, dấu đạo hàm, chiều mũi tên) và đọc thông tin cực trị, tiệm cận.',
    category: 'procedural',
  },
  {
    id: 'sk-math-12-graph-sketch',
    code: 'SKILL-MATH-12-GRAPH-SKETCHING',
    name: 'Khảo sát và vẽ đồ thị hàm số',
    subjectId: 'math',
    grade: '12',
    description: 'Thực hiện quy trình 3 bước khảo sát sự biến thiên và vẽ đồ thị các hàm số đa thức và phân thức hữu tỉ.',
    category: 'application',
  },
  // Detailed sub-skills
  {
    id: 'sk-math-12-extr-1',
    code: 'SKILL-MATH-12-EXTREMUM-1',
    name: 'Tìm cực trị hàm số bằng quy tắc 1',
    subjectId: 'math',
    grade: '12',
    description: 'Tìm điểm cực đại, cực tiểu dựa vào sự đổi dấu của đạo hàm cấp một trên bảng biến thiên.',
    category: 'procedural',
  },
  {
    id: 'sk-math-12-extr-2',
    code: 'SKILL-MATH-12-EXTREMUM-2',
    name: 'Tìm cực trị hàm số bằng quy tắc 2',
    subjectId: 'math',
    grade: '12',
    description: 'Sử dụng đạo hàm cấp hai tại điểm dừng f\'(x0) = 0 để phân loại cực đại (f\'\' < 0) và cực tiểu (f\'\' > 0).',
    category: 'procedural',
  },
  {
    id: 'sk-math-12-minmax-seg',
    code: 'SKILL-MATH-12-MINMAX-SEGMENT',
    name: 'Tìm GTLN và GTNN trên đoạn',
    subjectId: 'math',
    grade: '12',
    description: 'Thực hiện quy trình so sánh giá trị hàm số tại các mút đoạn và các điểm dừng trong khoảng mở.',
    category: 'procedural',
  },
  {
    id: 'sk-math-12-minmax-int',
    code: 'SKILL-MATH-12-MINMAX-INTERVAL',
    name: 'Tìm GTLN và GTNN trên khoảng bằng BBT',
    subjectId: 'math',
    grade: '12',
    description: 'Lập bảng biến thiên và đánh giá giới hạn tại vô cực hoặc biên để xác định max/min trên khoảng.',
    category: 'conceptual',
  },
  {
    id: 'sk-math-12-opt-word',
    code: 'SKILL-MATH-12-OPTIMIZATION-WORD',
    name: 'Ứng dụng tối ưu hóa giải bài toán thực tế',
    subjectId: 'math',
    grade: '12',
    description: 'Xây dựng hàm mục tiêu và tìm cực trị / max min cho các bài toán kinh tế, hình học, chi phí sản xuất.',
    category: 'application',
  },
  {
    id: 'sk-math-12-asym',
    code: 'SKILL-MATH-12-ASYMPTOTE',
    name: 'Xác định đường tiệm cận đứng, ngang và xiên',
    subjectId: 'math',
    grade: '12',
    description: 'Tính giới hạn một bên và giới hạn tại vô cực để tìm phương trình các đường tiệm cận của đồ thị hàm số.',
    category: 'conceptual',
  },
  {
    id: 'sk-math-12-graph-cubic',
    code: 'SKILL-MATH-12-GRAPH-CUBIC',
    name: 'Khảo sát và vẽ đồ thị hàm số bậc ba',
    subjectId: 'math',
    grade: '12',
    description: 'Thực hiện 3 bước khảo sát hàm bậc ba, xác định điểm uốn tâm đối xứng và giao điểm trục tọa độ.',
    category: 'procedural',
  },
  {
    id: 'sk-math-12-graph-rat',
    code: 'SKILL-MATH-12-GRAPH-RATIONAL',
    name: 'Khảo sát đồ thị hàm phân thức hữu tỉ',
    subjectId: 'math',
    grade: '12',
    description: 'Khảo sát hàm phân thức bậc nhất trên bậc nhất, nhận biết giao điểm 2 tiệm cận là tâm đối xứng.',
    category: 'procedural',
  },
  {
    id: 'sk-math-12-intersect',
    code: 'SKILL-MATH-12-INTERSECTION',
    name: 'Biện luận nghiệm qua tương giao đồ thị',
    subjectId: 'math',
    grade: '12',
    description: 'Sử dụng đồ thị hàm số để xác định số nghiệm phương trình f(x) = m và tìm điều kiện tham số.',
    category: 'application',
  },
]

export const MASTER_CURRICULUM_SUBJECTS: CurriculumSubject[] = [
  // 1. TOÁN HỌC
  {
    id: 'math',
    name: 'Toán học',
    shortName: 'Toán',
    icon: '📐',
    color: 'var(--subject-math-color)',
    bgColor: 'var(--subject-math-bg)',
    borderColor: '#818cf8',
    description: 'Chương trình Giải tích và Hình học không gian chuẩn GDPT 2018, bám sát cấu trúc đề thi THPT Quốc gia.',
    availability: 'available',
    plannedTopics: [
      'Ứng dụng đạo hàm để khảo sát và vẽ đồ thị hàm số',
      'Vectơ và hệ trục tọa độ trong không gian',
      'Các số đặc trưng đo mức độ phân tán cho mẫu số liệu ghép nhóm',
      'Nguyên hàm. Tích phân.',
      'Phương pháp tọa độ trong không gian',
      'Xác suất có điều kiện',
    ],
    metadata: {
      curriculumVersion: 'GDPT_2018',
      textbookAlignment: 'general_standard',
      textbookLabel: 'Bộ GD&ĐT · Chuẩn GDPT 2018',
      authorName: 'Hội đồng chuyên môn Toán STUDY_AI',
      reviewStatus: 'published',
      reviewedAt: '2026-10-15T08:00:00Z',
      lastUpdatedAt: '2026-11-04T12:00:00Z',
      licenseNotice: 'Nội dung biên soạn sư phạm độc lập bởi STUDY_AI, tham chiếu khung chương trình GDPT 2018.',
    },
    grades: [
      {
        grade: '12',
        label: 'Lớp 12',
        availability: 'available',
        chapters: [
          {
            id: 'math-chap-1',
            subjectId: 'math',
            grade: '12',
            chapterNumber: 1,
            title: 'Chương 1: Ứng dụng đạo hàm để khảo sát và vẽ đồ thị của hàm số',
            description: 'Tính đơn điệu, cực trị, giá trị lớn nhất - nhỏ nhất, đường tiệm cận và khảo sát sự biến thiên của hàm số.',
            availability: 'available',
            estimatedHours: 24,
            totalLessons: 3,
            lessons: [
              // Lesson 1: Monotonicity & Extremum
              {
                id: 'lesson-math-12-01',
                chapterId: 'math-chap-1',
                subjectId: 'math',
                grade: '12',
                lessonNumber: 1,
                title: 'Tính đơn điệu và cực trị của hàm số',
                description: 'Mối liên hệ giữa dấu đạo hàm và tính đồng biến, nghịch biến; quy tắc tìm điểm cực đại, cực tiểu.',
                durationMinutes: 45,
                xp: 50,
                availability: 'available',
                quizId: 'quiz-math-01',
                assessmentId: 'assessment-math-12-01',
                learningObjectives: [
                  'Hiểu và giải thích được mối liên hệ giữa dấu của đạo hàm cấp một và tính đơn điệu của hàm số trên một khoảng.',
                  'Thành thạo kỹ năng lập bảng biến thiên để xác định các khoảng đồng biến, nghịch biến của hàm số đa thức và phân thức.',
                  'Nắm vững quy tắc 1 (đổi dấu đạo hàm) và quy tắc 2 (đạo hàm cấp hai) để tìm điểm cực trị của hàm số.',
                  'Phân biệt rõ ràng giữa điểm cực trị của hàm số, giá trị cực trị và điểm cực trị của đồ thị hàm số.',
                ],
                skills: [
                  {
                    skillId: 'sk-math-12-deriv-sign',
                    skillCode: 'SKILL-MATH-12-DERIV-SIGN',
                    skillName: 'Xét dấu đạo hàm',
                    level: 'core',
                  },
                  {
                    skillId: 'sk-math-12-mono',
                    skillCode: 'SKILL-MATH-12-MONOTONICITY',
                    skillName: 'Xét tính đơn điệu',
                    level: 'core',
                  },
                  {
                    skillId: 'sk-math-12-extr',
                    skillCode: 'SKILL-MATH-12-EXTREMUM',
                    skillName: 'Xác định cực trị',
                    level: 'core',
                  },
                  {
                    skillId: 'sk-math-12-var-table',
                    skillCode: 'SKILL-MATH-12-VARIATION-TABLE',
                    skillName: 'Lập và đọc bảng biến thiên',
                    level: 'supporting',
                  },
                  {
                    skillId: 'sk-math-12-extr-1',
                    skillCode: 'SKILL-MATH-12-EXTREMUM-1',
                    skillName: 'Tìm cực trị hàm số bằng quy tắc 1',
                    level: 'core',
                  },
                  {
                    skillId: 'sk-math-12-extr-2',
                    skillCode: 'SKILL-MATH-12-EXTREMUM-2',
                    skillName: 'Tìm cực trị hàm số bằng quy tắc 2',
                    level: 'supporting',
                  },
                ],
                metadata: {
                  curriculumVersion: 'GDPT_2018',
                  textbookAlignment: 'general_standard',
                  textbookLabel: 'Toán 12 · GDPT 2018',
                  authorName: 'Tổ Toán STUDY_AI',
                  reviewStatus: 'published',
                  reviewedAt: '2026-10-15T08:00:00Z',
                  lastUpdatedAt: '2026-11-04T12:00:00Z',
                  licenseNotice: 'Nội dung biên soạn sư phạm độc lập bởi STUDY_AI.',
                },
                nextLessonId: 'lesson-math-12-02',
                content: {
                  introduction:
                    'Đạo hàm là công cụ then chốt trong Giải tích để khảo sát chiều biến thiên của hàm số. Bằng cách xét dấu đạo hàm f\'(x), ta biết chính xác khi nào hàm số tăng, khi nào giảm và tìm được các đỉnh cực đại, đáy cực tiểu của đồ thị mà không cần phải vẽ toàn bộ đường cong.',
                  definitions: [
                    {
                      term: 'Tính đơn điệu của hàm số',
                      content:
                        'Cho hàm số y = f(x) xác định trên khoảng (a; b). Hàm số được gọi là đồng biến trên (a; b) nếu với mọi x1, x2 thuộc (a; b) mà x1 < x2 thì f(x1) < f(x2). Hàm số gọi là nghịch biến nếu x1 < x2 kéo theo f(x1) > f(x2).',
                    },
                    {
                      term: 'Khái niệm điểm cực trị',
                      content:
                        'Điểm x0 được gọi là điểm cực đại của hàm số f nếu tồn tại một khoảng (a; b) chứa x0 sao cho f(x) < f(x0) với mọi x thuộc (a; b) khác x0. Khi đó f(x0) gọi là giá trị cực đại. Tương tự cho khái niệm điểm cực tiểu.',
                    },
                    {
                      term: 'Phân biệt thuật ngữ cực trị',
                      content:
                        '1) Điểm cực trị của hàm số là x0; 2) Giá trị cực trị (hay cực trị) của hàm số là y0 = f(x0); 3) Điểm cực trị của đồ thị hàm số là điểm M(x0; f(x0)) trên mặt phẳng tọa độ Oxy.',
                    },
                  ],
                  formulas: [
                    {
                      id: 'f-mono-1',
                      label: 'Định lý mở rộng về tính đơn điệu',
                      formula: 'f\'(x) \\ge 0, \\, \\forall x \\in (a; b) \\text{ (bằng 0 tại hữu hạn điểm)} \\implies f(x) \\text{ đồng biến trên } (a; b)',
                      note: 'Đạo hàm dương thì hàm đồng biến; đạo hàm âm thì hàm nghịch biến.',
                    },
                    {
                      id: 'f-extr-1',
                      label: 'Quy tắc 1 tìm cực trị (Đổi dấu đạo hàm cấp một)',
                      formula: 'f\'(x) \\text{ đổi dấu từ } (+) \\to (-) \\text{ qua } x_0 \\implies x_0 \\text{ là điểm cực đại}',
                      note: 'Nếu f\'(x) đổi dấu từ (-) sang (+) qua x0 thì x0 là điểm cực tiểu. Nếu không đổi dấu, x0 không phải cực trị.',
                    },
                    {
                      id: 'f-extr-2',
                      label: 'Quy tắc 2 tìm cực trị (Dùng đạo hàm cấp hai)',
                      formula: 'f\'(x_0) = 0 \\text{ và } f\'\'(x_0) < 0 \\implies x_0 \\text{ là điểm cực đại}; \\quad f\'\'(x_0) > 0 \\implies x_0 \\text{ là cực tiểu}',
                      note: 'Áp dụng hiệu quả với các hàm lượng giác hoặc đa thức có lũy thừa phức tạp.',
                    },
                  ],
                  examples: [
                    {
                      id: 'ex-math-01',
                      title: 'Ví dụ: Xét chiều biến thiên và tìm cực trị của hàm bậc ba',
                      problem: 'Tìm các khoảng đơn điệu và các điểm cực trị của hàm số y = -x³ + 3x - 1.',
                      solutionSteps: [
                        {
                          step: 1,
                          explanation: 'Tập xác định của hàm số là tập số thực D = ℝ.',
                          math: 'D = \\mathbb{R}',
                        },
                        {
                          step: 2,
                          explanation: 'Tính đạo hàm bậc nhất và giải phương trình y\' = 0:',
                          math: 'y\' = -3x^2 + 3 = -3(x^2 - 1); \\quad y\' = 0 \\iff x = 1 \\text{ hoặc } x = -1.',
                        },
                        {
                          step: 3,
                          explanation: 'Lập bảng xét dấu đạo hàm y\': Vì hệ số a = -3 < 0, nên y\' > 0 trên khoảng (-1; 1) và y\' < 0 trên hai khoảng (-∞; -1) và (1; +∞).',
                          math: 'y\' > 0 \\iff x \\in (-1; 1); \\quad y\' < 0 \\iff x \\in (-\\infty; -1) \\cup (1; +\\infty)',
                        },
                        {
                          step: 4,
                          explanation: 'Tính giá trị cực trị: Tại x = -1, y(-1) = -1 - 3(-1) - 1 = -3; tại x = 1, y(1) = -1 + 3 - 1 = 1.',
                          math: 'y_{CT} = y(-1) = -3; \\quad y_{CD} = y(1) = 1.',
                        },
                      ],
                      conclusion:
                        'Hàm số đồng biến trên (-1; 1), nghịch biến trên (-∞; -1) và (1; +∞). Điểm cực đại của hàm số là x = 1 (yCD = 1); điểm cực tiểu là x = -1 (yCT = -3).',
                    },
                    {
                      id: 'ex-math-02',
                      title: 'Ví dụ: Cực trị hàm phân thức bậc nhất trên bậc nhất',
                      problem: 'Khảo sát chiều biến thiên và sự tồn tại cực trị của hàm số y = (2x - 1) / (x + 1).',
                      solutionSteps: [
                        {
                          step: 1,
                          explanation: 'Tập xác định D = ℝ \\ {-1}.',
                          math: 'D = \\mathbb{R} \\setminus \\{-1\\}',
                        },
                        {
                          step: 2,
                          explanation: 'Tính đạo hàm y\' theo công thức (ad - bc) / (cx + d)²:',
                          math: 'y\' = \\frac{2 \\cdot 1 - (-1) \\cdot 1}{(x + 1)^2} = \\frac{3}{(x + 1)^2} > 0, \\quad \\forall x \\ne -1.',
                        },
                        {
                          step: 3,
                          explanation: 'Kết luận tính đơn điệu và cực trị:',
                          math: 'y\' > 0, \\, \\forall x \\in D \\implies \\text{hàm số đồng biến trên từng khoảng } (-\\infty; -1) \\text{ và } (-1; +\\infty).',
                        },
                      ],
                      conclusion:
                        'Hàm số đồng biến trên từng khoảng xác định (-∞; -1) và (-1; +∞). Vì y\' > 0 với mọi x thuộc D nên hàm số KHÔNG có cực trị.',
                    },
                  ],
                  variationTables: [
                    {
                      id: 'bbt-math-12-01-cubic',
                      title: 'Bảng biến thiên hàm số bậc ba y = -x³ + 3x - 1',
                      functionMath: 'y = -x^3 + 3x - 1',
                      columns: [
                        { x: '-\\infty', yPrime: '', y: { value: '+\\infty', position: 'top' } },
                        { x: '', yPrime: '-', y: { value: '', arrow: 'down' } },
                        { x: '-1', yPrime: '0', y: { value: '-3 \\text{ (CT)}', position: 'bottom' } },
                        { x: '', yPrime: '+', y: { value: '', arrow: 'up' } },
                        { x: '1', yPrime: '0', y: { value: '1 \\text{ (CĐ)}', position: 'top' } },
                        { x: '', yPrime: '-', y: { value: '', arrow: 'down' } },
                        { x: '+\\infty', yPrime: '', y: { value: '-\\infty', position: 'bottom' } },
                      ],
                      note: 'Đạo hàm đổi dấu từ (-) sang (+) qua x = -1 nên x = -1 là điểm cực tiểu; đổi dấu từ (+) sang (-) qua x = 1 nên x = 1 là điểm cực đại.',
                    },
                    {
                      id: 'bbt-math-12-01-rational',
                      title: 'Bảng biến thiên hàm phân thức y = (2x - 1)/(x + 1)',
                      functionMath: 'y = \\frac{2x - 1}{x + 1}',
                      columns: [
                        { x: '-\\infty', yPrime: '', y: { value: '2', position: 'bottom' } },
                        { x: '', yPrime: '+', y: { value: '', arrow: 'up' } },
                        { x: '', yPrime: '', y: { value: '+\\infty', position: 'top' } },
                        { x: '-1', yPrime: '||', y: { value: '||' } },
                        { x: '', yPrime: '', y: { value: '-\\infty', position: 'bottom' } },
                        { x: '', yPrime: '+', y: { value: '', arrow: 'up' } },
                        { x: '+\\infty', yPrime: '', y: { value: '2', position: 'top' } },
                      ],
                      note: 'Tại x = -1 hàm số gián đoạn (ký hiệu ||). Đạo hàm y\' > 0 trên từng khoảng xác định nên hàm đồng biến trên (-∞; -1) và (-1; +∞), không có cực trị.',
                    },
                  ],
                  commonMistakes: [
                    {
                      title: 'Dùng ký hiệu hợp ∪ khi kết luận khoảng đơn điệu',
                      mistake: 'Kết luận hàm số đồng biến trên (-∞; -1) ∪ (-1; +∞).',
                      correctExplanation: 'Theo định nghĩa, tính đơn điệu chỉ xét trên từng khoảng rời nhau. Phải viết: "Hàm số đồng biến trên các khoảng (-∞; -1) và (-1; +∞)". Tuyệt đối không dùng ký hiệu hợp ∪.',
                    },
                    {
                      title: 'Nhầm lẫn giữa các thuật ngữ cực trị',
                      mistake: 'Nói "Hàm số đạt cực đại bằng 1 tại y = 1" hoặc nhầm xCT với yCT.',
                      correctExplanation: 'Quy ước chuẩn SGK GDPT 2018: "Điểm cực trị của hàm số" là x; "Cực trị (hoặc giá trị cực trị)" là y = f(x); "Điểm cực trị của đồ thị" là tọa độ điểm M(x; y) trên mặt phẳng Oxy.',
                    },
                    {
                      title: 'Vội kết luận cực trị khi đạo hàm bằng 0',
                      mistake: 'Thấy f\'(x0) = 0 liền kết luận ngay x0 là điểm cực trị.',
                      correctExplanation: 'Điều kiện cần và đủ để x0 là điểm cực trị là đạo hàm f\'(x) phải ĐỔI DẤU khi đi qua x0. Nếu f\'(x0) = 0 nhưng f\'(x) không đổi dấu (ví dụ y = x³ tại x = 0) thì x0 không phải cực trị.',
                    },
                  ],
                  importantNotes: [
                    'Khi kết luận các khoảng nghịch biến hoặc đồng biến của hàm số phân thức, luôn viết riêng rẽ từng khoảng hoặc dùng từ "và", TUYỆT ĐỐI không dùng ký hiệu hợp ∪.',
                    'Hàm số có thể đạt cực trị tại điểm x0 mà tại đó đạo hàm không xác định, miễn là hàm số liên tục tại x0 và đạo hàm đổi dấu khi đi qua x0.',
                    'Nếu y\' = 0 nhưng y\' không đổi dấu khi qua x0 (ví dụ y = x³ có y\'(0) = 0 nhưng y\' = 3x² ≥ 0) thì x0 KHÔNG PHẢI là điểm cực trị.',
                  ],
                  summaryPoints: [
                    'Dấu của đạo hàm bậc một quyết định chiều biến thiên: f\'(x) > 0 là đồng biến, f\'(x) < 0 là nghịch biến.',
                    'Cực trị xảy ra khi đạo hàm đổi dấu: (+) sang (-) là cực đại, (-) sang (+) là cực tiểu.',
                    'Điểm cực trị hàm số: x0; Cực trị hàm số: f(x0); Điểm cực trị đồ thị: M(x0; f(x0)).',
                  ],
                },
              },

              // Lesson 2: Max / Min
              {
                id: 'lesson-math-12-02',
                chapterId: 'math-chap-1',
                subjectId: 'math',
                grade: '12',
                lessonNumber: 2,
                title: 'Giá trị lớn nhất và giá trị nhỏ nhất của hàm số',
                description: 'Quy trình tìm GTLN, GTNN trên đoạn [a; b], trên khoảng mở và ứng dụng giải toán tối ưu hóa.',
                durationMinutes: 45,
                xp: 50,
                availability: 'available',
                quizId: 'quiz-math-02',
                assessmentId: 'assessment-math-12-02',
                previousLessonId: 'lesson-math-12-01',
                nextLessonId: 'lesson-math-12-03',
                learningObjectives: [
                  'Nắm vững định nghĩa chính xác về giá trị lớn nhất (GTLN) và giá trị nhỏ nhất (GTNN) của hàm số trên một tập hợp số.',
                  'Thành thạo thuật toán tìm GTLN, GTNN của hàm số liên tục trên một đoạn [a; b] không cần vẽ bảng biến thiên.',
                  'Biết cách tìm max/min trên khoảng mở (a; b) hoặc nửa khoảng bằng cách lập bảng biến thiên và tính giới hạn.',
                  'Vận dụng mô hình hóa toán học để giải quyết các bài toán thực tiễn tối ưu hóa (chi phí, diện tích, thể tích).',
                ],
                skills: [
                  {
                    skillId: 'sk-math-12-var-table',
                    skillCode: 'SKILL-MATH-12-VARIATION-TABLE',
                    skillName: 'Lập và đọc bảng biến thiên',
                    level: 'supporting',
                  },
                  {
                    skillId: 'sk-math-12-minmax-seg',
                    skillCode: 'SKILL-MATH-12-MINMAX-SEGMENT',
                    skillName: 'Tìm GTLN và GTNN trên đoạn',
                    level: 'core',
                  },
                  {
                    skillId: 'sk-math-12-minmax-int',
                    skillCode: 'SKILL-MATH-12-MINMAX-INTERVAL',
                    skillName: 'Tìm GTLN và GTNN trên khoảng bằng BBT',
                    level: 'supporting',
                  },
                  {
                    skillId: 'sk-math-12-opt-word',
                    skillCode: 'SKILL-MATH-12-OPTIMIZATION-WORD',
                    skillName: 'Ứng dụng tối ưu hóa giải bài toán thực tế',
                    level: 'advanced',
                  },
                ],
                metadata: {
                  curriculumVersion: 'GDPT_2018',
                  textbookAlignment: 'general_standard',
                  textbookLabel: 'Toán 12 · GDPT 2018',
                  authorName: 'Tổ Toán STUDY_AI',
                  reviewStatus: 'published',
                  reviewedAt: '2026-10-15T08:00:00Z',
                  lastUpdatedAt: '2026-11-04T12:00:00Z',
                  licenseNotice: 'Nội dung biên soạn sư phạm độc lập bởi STUDY_AI.',
                },
                content: {
                  introduction:
                    'Tìm giá trị lớn nhất (GTLN) và giá trị nhỏ nhất (GTNN) là một trong những ứng dụng quan trọng và gần gũi nhất của đạo hàm trong đời sống. Từ việc tối ưu hóa chi phí sản xuất, tìm kích thước hộp quà tốn ít nguyên liệu nhất, đến xác định liều lượng thuốc tối ưu, toán học giải quyết trọn vẹn thông qua bài toán cực trị toàn cục.',
                  definitions: [
                    {
                      term: 'Định nghĩa Giá trị lớn nhất (Max)',
                      content:
                        'Cho hàm số y = f(x) xác định trên tập D. Số M được gọi là giá trị lớn nhất của hàm số f trên D nếu: 1) f(x) ≤ M với mọi x thuộc D; và 2) Tồn tại ít nhất một phần tử x0 thuộc D sao cho f(x0) = M. Ký hiệu: M = max f(x) trên D.',
                    },
                    {
                      term: 'Định nghĩa Giá trị nhỏ nhất (Min)',
                      content:
                        'Cho hàm số y = f(x) xác định trên tập D. Số m được gọi là giá trị nhỏ nhất của hàm số f trên D nếu: 1) f(x) ≥ m với mọi x thuộc D; và 2) Tồn tại ít nhất một phần tử x0 thuộc D sao cho f(x0) = m. Ký hiệu: m = min f(x) trên D.',
                    },
                    {
                      term: 'Định lý Weierstrass về tính đạt max/min',
                      content:
                        'Mọi hàm số liên tục trên một đoạn đóng [a; b] thì luôn luôn đạt được giá trị lớn nhất và giá trị nhỏ nhất trên đoạn đó.',
                    },
                  ],
                  formulas: [
                    {
                      id: 'f-minmax-1',
                      label: 'Quy tắc tìm GTLN, GTNN trên đoạn [a; b]',
                      formula: '\\max_{[a; b]} f(x) = \\max \\{f(a), f(b), f(x_i)\\}, \\quad \\min_{[a; b]} f(x) = \\min \\{f(a), f(b), f(x_i)\\}',
                      note: 'Trong đó xi là các điểm trong khoảng mở (a; b) mà tại đó f\'(xi) = 0 hoặc f\'(xi) không xác định.',
                    },
                    {
                      id: 'f-minmax-2',
                      label: 'Bất đẳng thức điều kiện Max/Min',
                      formula: 'm \\le f(x) \\le M, \\, \\forall x \\in D \\quad \\text{và } \\exists x_1, x_2 \\in D: f(x_1) = m, \\, f(x_2) = M',
                      note: 'Bắt buộc phải chỉ ra vị trí dấu bằng xảy ra thì giá trị đó mới được công nhận là max/min.',
                    },
                  ],
                  examples: [
                    {
                      id: 'ex-minmax-01',
                      title: 'Ví dụ: Tìm GTLN và GTNN của hàm số trên đoạn [-1; 3]',
                      problem: 'Tìm giá trị lớn nhất và nhỏ nhất của hàm số f(x) = x³ - 3x² + 2 trên đoạn [-1; 3].',
                      solutionSteps: [
                        {
                          step: 1,
                          explanation: 'Hàm số đa thức liên tục trên toàn ℝ nên liên tục trên đoạn [-1; 3]. Đạo hàm:',
                          math: 'f\'(x) = 3x^2 - 6x = 3x(x - 2)',
                        },
                        {
                          step: 2,
                          explanation: 'Tìm các nghiệm của đạo hàm thuộc khoảng mở (-1; 3):',
                          math: 'f\'(x) = 0 \\iff x = 0 \\in (-1; 3) \\quad \\text{hoặc} \\quad x = 2 \\in (-1; 3)',
                        },
                        {
                          step: 3,
                          explanation: 'Tính giá trị của f(x) tại hai đầu mút và tại các điểm dừng vừa tìm được:',
                          math: 'f(-1) = (-1)^3 - 3(-1)^2 + 2 = -2; \\quad f(0) = 2; \\quad f(2) = 2^3 - 3(2)^2 + 2 = -2; \\quad f(3) = 3^3 - 3(3)^2 + 2 = 2.',
                        },
                        {
                          step: 4,
                          explanation: 'So sánh các giá trị: Trong các số {-2, 2, -2, 2}, số lớn nhất là 2 và số nhỏ nhất là -2.',
                          math: '\\max_{[-1; 3]} f(x) = 2 \\quad \\text{tại } x = 0, x = 3; \\qquad \\min_{[-1; 3]} f(x) = -2 \\quad \\text{tại } x = -1, x = 2.',
                        },
                      ],
                      conclusion: 'GTLN của hàm số trên đoạn [-1; 3] bằng 2; GTNN của hàm số bằng -2.',
                    },
                  ],
                  variationTables: [
                    {
                      id: 'bbt-math-12-02-segment',
                      title: 'Bảng biến thiên tìm GTLN, GTNN trên đoạn [-1; 3]',
                      functionMath: 'f(x) = x^3 - 3x^2 + 2 \\text{ trên } [-1; 3]',
                      columns: [
                        { x: '-1', yPrime: '', y: { value: '-2', position: 'bottom' } },
                        { x: '', yPrime: '+', y: { value: '', arrow: 'up' } },
                        { x: '0', yPrime: '0', y: { value: '2 \\text{ (Max)}', position: 'top' } },
                        { x: '', yPrime: '-', y: { value: '', arrow: 'down' } },
                        { x: '2', yPrime: '0', y: { value: '-2 \\text{ (Min)}', position: 'bottom' } },
                        { x: '', yPrime: '+', y: { value: '', arrow: 'up' } },
                        { x: '3', yPrime: '', y: { value: '2 \\text{ (Max)}', position: 'top' } },
                      ],
                      note: 'Trên đoạn [-1; 3], hàm số đạt GTLN bằng 2 tại 2 điểm x = 0 và x = 3; đạt GTNN bằng -2 tại x = -1 và x = 2.',
                    },
                  ],
                  commonMistakes: [
                    {
                      title: 'Tính giá trị tại các điểm dừng nằm ngoài đoạn [a; b]',
                      mistake: 'Giải f\'(x) = 0 ra nghiệm x3 nằm ngoài [a; b] nhưng vẫn tính f(x3) và đưa vào tập so sánh.',
                      correctExplanation: 'Quy trình chuẩn: Chỉ xét các nghiệm của đạo hàm f\'(x) = 0 nằm TRONG KHOẢNG MỞ (a; b). Mọi nghiệm ngoài đoạn hoặc ở đầu mút đều phải loại bỏ trước khi tính.',
                    },
                    {
                      title: 'Đồng nhất Giá trị lớn nhất với Cực đại',
                      mistake: 'Cho rằng điểm cực đại luôn là giá trị lớn nhất của hàm số trên toàn tập xác định.',
                      correctExplanation: 'Cực đại chỉ mang tính địa phương trong một lân cận nhỏ quanh x0. Trên toàn miền D, giá trị hàm số tại các điểm khác hoặc tại biên hoàn toàn có thể lớn hơn giá trị cực đại.',
                    },
                    {
                      title: 'Quên kiểm tra dấu bằng khi tìm Max/Min',
                      mistake: 'Chứng minh được f(x) ≤ M nhưng không chỉ ra được điểm x0 nào để f(x0) = M.',
                      correctExplanation: 'Theo định nghĩa, số M chỉ được công nhận là GTLN khi và chỉ khi tồn tại ít nhất một phần tử x0 thuộc miền D sao cho f(x0) = M. Nếu không có x0, M chỉ là một chặn trên.',
                    },
                  ],
                  importantNotes: [
                    'Khi tìm max/min trên đoạn [a; b], KHÔNG tính giá trị tại các nghiệm x của đạo hàm nằm ngoài khoảng mở (a; b).',
                    'Trên khoảng mở (a; b) hoặc nửa khoảng, hàm số có thể KHÔNG CÓ max hoặc KHÔNG CÓ min nếu giới hạn tiến về vô cực hoặc tiệm cận tại biên không đạt được.',
                    'Nếu bài toán yêu cầu max/min của hàm trị tuyệt đối |f(x)| trên [a; b], hãy tìm M = max f(x) và m = min f(x), khi đó max |f(x)| = max(|M|, |m|).',
                  ],
                  summaryPoints: [
                    'Trên đoạn đóng [a; b]: Chỉ cần tính f tại 2 đầu mút và tại các điểm dừng xi ∈ (a; b), sau đó so sánh.',
                    'Trên khoảng mở: Bắt buộc phải lập bảng biến thiên đầy đủ kèm tính giới hạn lim tại hai biên.',
                    'Bài toán thực tế: Đặt ẩn số x, tìm khoảng điều kiện của x, lập hàm f(x) và khảo sát để tìm điểm tối ưu.',
                  ],
                },
              },

              // Lesson 3: Curve Sketching & Asymptotes
              {
                id: 'lesson-math-12-03',
                chapterId: 'math-chap-1',
                subjectId: 'math',
                grade: '12',
                lessonNumber: 3,
                title: 'Khảo sát sự biến thiên và vẽ đồ thị của hàm số',
                description: 'Quy trình 3 bước khảo sát hàm số, đường tiệm cận, tâm đối xứng và ứng dụng tương giao giải phương trình.',
                durationMinutes: 50,
                xp: 60,
                availability: 'available',
                quizId: 'quiz-math-08',
                assessmentId: 'assessment-math-12-03',
                previousLessonId: 'lesson-math-12-02',
                learningObjectives: [
                  'Xác định chính xác các đường tiệm cận đứng, tiệm cận ngang và tiệm cận xiên của đồ thị hàm số phân thức.',
                  'Nắm vững và thực hiện thành thạo sơ đồ 3 bước chuẩn khảo sát sự biến thiên và vẽ đồ thị hàm số.',
                  'Nhận dạng đúng hình dáng đồ thị, trục đối xứng, tâm đối xứng của hàm số bậc ba, hàm phân thức bậc nhất / bậc nhất.',
                  'Ứng dụng đồ thị đã vẽ để biện luận số nghiệm của phương trình f(x) = m và giải quyết bài toán tương giao đồ thị.',
                ],
                skills: [
                  {
                    skillId: 'sk-math-12-graph-sketch',
                    skillCode: 'SKILL-MATH-12-GRAPH-SKETCHING',
                    skillName: 'Khảo sát và vẽ đồ thị hàm số',
                    level: 'core',
                  },
                  {
                    skillId: 'sk-math-12-var-table',
                    skillCode: 'SKILL-MATH-12-VARIATION-TABLE',
                    skillName: 'Lập và đọc bảng biến thiên',
                    level: 'core',
                  },
                  {
                    skillId: 'sk-math-12-asym',
                    skillCode: 'SKILL-MATH-12-ASYMPTOTE',
                    skillName: 'Xác định đường tiệm cận đứng, ngang và xiên',
                    level: 'core',
                  },
                  {
                    skillId: 'sk-math-12-graph-cubic',
                    skillCode: 'SKILL-MATH-12-GRAPH-CUBIC',
                    skillName: 'Khảo sát và vẽ đồ thị hàm số bậc ba',
                    level: 'core',
                  },
                  {
                    skillId: 'sk-math-12-graph-rat',
                    skillCode: 'SKILL-MATH-12-GRAPH-RATIONAL',
                    skillName: 'Khảo sát đồ thị hàm phân thức hữu tỉ',
                    level: 'supporting',
                  },
                  {
                    skillId: 'sk-math-12-intersect',
                    skillCode: 'SKILL-MATH-12-INTERSECTION',
                    skillName: 'Biện luận nghiệm qua tương giao đồ thị',
                    level: 'advanced',
                  },
                ],
                metadata: {
                  curriculumVersion: 'GDPT_2018',
                  textbookAlignment: 'general_standard',
                  textbookLabel: 'Toán 12 · GDPT 2018',
                  authorName: 'Tổ Toán STUDY_AI',
                  reviewStatus: 'published',
                  reviewedAt: '2026-10-15T08:00:00Z',
                  lastUpdatedAt: '2026-11-04T12:00:00Z',
                  licenseNotice: 'Nội dung biên soạn sư phạm độc lập bởi STUDY_AI.',
                },
                content: {
                  introduction:
                    'Khảo sát sự biến thiên và vẽ đồ thị hàm số là bước tổng hợp cao nhất của toàn bộ chương Đạo hàm. Nó liên kết tập xác định, tính đơn điệu, cực trị, tiệm cận và tâm đối xứng thành một bức tranh hình học trực quan, giúp người học giải quyết nhanh chóng các câu hỏi tương giao và biện luận tham số trong đề thi.',
                  definitions: [
                    {
                      term: 'Quy trình khảo sát hàm số 3 bước chuẩn',
                      content:
                        '1) Bước 1: Tìm tập xác định D của hàm số. 2) Bước 2: Khảo sát sự biến thiên (tính đạo hàm y\', tìm điểm dừng, tính giới hạn và tìm tiệm cận, lập bảng biến thiên kết luận chiều biến thiên & cực trị). 3) Bước 3: Vẽ đồ thị (xác định các điểm đặc biệt giao Ox, Oy, điểm uốn tâm đối xứng, vẽ đường cong trơn).',
                    },
                    {
                      term: 'Đường tiệm cận đứng và tiệm cận ngang',
                      content:
                        'Đường thẳng x = x0 là tiệm cận đứng nếu ít nhất một trong các giới hạn một bên lim (khi x → x0+ hoặc x → x0-) của f(x) bằng ±∞. Đường thẳng y = y0 là tiệm cận ngang nếu lim (khi x → +∞ hoặc x → -∞) của f(x) bằng y0.',
                    },
                    {
                      term: 'Tâm đối xứng và trục đối xứng của đồ thị',
                      content:
                        'Đồ thị hàm số bậc ba luôn nhận điểm uốn I(-b/3a; f(-b/3a)) làm tâm đối xứng. Đồ thị hàm phân thức bậc nhất y = (ax+b)/(cx+d) luôn nhận giao điểm I(-d/c; a/c) của hai đường tiệm cận làm tâm đối xứng.',
                    },
                  ],
                  formulas: [
                    {
                      id: 'f-graph-1',
                      label: 'Hàm số bậc ba tổng quát',
                      formula: 'y = ax^3 + bx^2 + cx + d \\quad (a \\ne 0); \\qquad y\' = 3ax^2 + 2bx + c',
                      note: 'Tâm đối xứng là điểm uốn I có hoành độ x_I = -b / (3a). Có 2 cực trị khi Δ_y\' > 0.',
                    },
                    {
                      id: 'f-graph-2',
                      label: 'Hàm phân thức bậc nhất / bậc nhất',
                      formula: 'y = \\frac{ax + b}{cx + d} \\quad (c \\ne 0, \\, ad - bc \\ne 0); \\qquad y\' = \\frac{ad - bc}{(cx + d)^2}',
                      note: 'Tiệm cận đứng x = -d/c; Tiệm cận ngang y = a/c. Giao điểm I(-d/c; a/c) là tâm đối xứng.',
                    },
                    {
                      id: 'f-graph-3',
                      label: 'Tiệm cận xiên (GDPT 2018 mới)',
                      formula: '\\lim_{x \\to \\pm\\infty} [f(x) - (ax + b)] = 0 \\implies y = ax + b \\text{ là đường tiệm cận xiên}',
                      note: 'Trong đó a = lim f(x)/x khi x → ±∞ và b = lim [f(x) - ax].',
                    },
                  ],
                  examples: [
                    {
                      id: 'ex-graph-01',
                      title: 'Ví dụ: Khảo sát hàm số bậc ba y = x³ - 3x² + 2',
                      problem: 'Khảo sát sự biến thiên và vẽ đồ thị (C) của hàm số y = x³ - 3x² + 2.',
                      solutionSteps: [
                        {
                          step: 1,
                          explanation: 'Tập xác định D = ℝ.',
                          math: 'D = \\mathbb{R}',
                        },
                        {
                          step: 2,
                          explanation: 'Tính đạo hàm và tìm điểm dừng:',
                          math: 'y\' = 3x^2 - 6x = 3x(x - 2); \\quad y\' = 0 \\iff x = 0 \\text{ hoặc } x = 2.',
                        },
                        {
                          step: 3,
                          explanation: 'Xét giới hạn tại vô cực:',
                          math: '\\lim_{x \\to -\\infty} y = -\\infty; \\quad \\lim_{x \\to +\\infty} y = +\\infty.',
                        },
                        {
                          step: 4,
                          explanation: 'Bảng biến thiên: Hàm số đồng biến trên (-∞; 0) và (2; +∞), nghịch biến trên (0; 2). Cực đại tại (0; 2), cực tiểu tại (2; -2).',
                        },
                        {
                          step: 5,
                          explanation: 'Tìm tâm đối xứng: y\'\' = 6x - 6 = 0 ⇔ x = 1 ⇒ y(1) = 0. Tâm đối xứng I(1; 0).',
                          math: 'y\'\' = 6x - 6 = 0 \\iff x = 1 \\implies I(1; 0)',
                        },
                      ],
                      conclusion:
                        'Đồ thị (C) là đường cong uốn lượn hình chữ N, cắt Oy tại (0; 2), cắt Ox tại 3 điểm phân biệt, nhận điểm uốn I(1; 0) làm tâm đối xứng.',
                    },
                  ],
                  variationTables: [
                    {
                      id: 'bbt-math-12-03-cubic',
                      title: 'Bảng biến thiên hoàn chỉnh hàm số bậc ba y = x³ - 3x² + 2',
                      functionMath: 'y = x^3 - 3x^2 + 2',
                      columns: [
                        { x: '-\\infty', yPrime: '', y: { value: '-\\infty', position: 'bottom' } },
                        { x: '', yPrime: '+', y: { value: '', arrow: 'up' } },
                        { x: '0', yPrime: '0', y: { value: '2 \\text{ (CĐ)}', position: 'top' } },
                        { x: '', yPrime: '-', y: { value: '', arrow: 'down' } },
                        { x: '2', yPrime: '0', y: { value: '-2 \\text{ (CT)}', position: 'bottom' } },
                        { x: '', yPrime: '+', y: { value: '', arrow: 'up' } },
                        { x: '+\\infty', yPrime: '', y: { value: '+\\infty', position: 'top' } },
                      ],
                      note: 'Hàm số đồng biến trên (-∞; 0) và (2; +∞), nghịch biến trên (0; 2). Cực đại tại (0; 2), cực tiểu tại (2; -2).',
                    },
                    {
                      id: 'bbt-math-12-03-rational',
                      title: 'Bảng biến thiên hàm phân thức y = (2x - 1)/(x + 1) với tiệm cận',
                      functionMath: 'y = \\frac{2x - 1}{x + 1}',
                      columns: [
                        { x: '-\\infty', yPrime: '', y: { value: '2 \\text{ (TCN)}', position: 'bottom' } },
                        { x: '', yPrime: '+', y: { value: '', arrow: 'up' } },
                        { x: '', yPrime: '', y: { value: '+\\infty', position: 'top' } },
                        { x: '-1', yPrime: '||', y: { value: '||' } },
                        { x: '', yPrime: '', y: { value: '-\\infty', position: 'bottom' } },
                        { x: '', yPrime: '+', y: { value: '', arrow: 'up' } },
                        { x: '+\\infty', yPrime: '', y: { value: '2 \\text{ (TCN)}', position: 'top' } },
                      ],
                      note: 'Tiệm cận đứng x = -1, tiệm cận ngang y = 2. Giao điểm 2 tiệm cận I(-1; 2) là tâm đối xứng của đồ thị.',
                    },
                  ],
                  functionGraphs: [
                    {
                      id: 'graph-math-12-03-cubic',
                      title: 'Đồ thị hàm số bậc ba y = -x³ + 3x - 1',
                      functionFormula: 'y = -x^3 + 3x - 1',
                      functionType: 'cubic',
                      domain: [-2.6, 2.6],
                      range: [-4.5, 3.5],
                      keyPoints: [
                        { x: -1, y: -3, label: 'CT(-1; -3)', type: 'min' },
                        { x: 1, y: 1, label: 'CĐ(1; 1)', type: 'max' },
                        { x: 0, y: -1, label: 'I(0; -1)', type: 'inflection' },
                      ],
                      note: 'Đường cong nhận điểm uốn I(0; -1) làm tâm đối xứng, có tiếp tuyến nằm ngang tại các điểm cực trị.',
                    },
                    {
                      id: 'graph-math-12-03-rational',
                      title: 'Đồ thị hàm phân thức hữu tỉ y = (2x - 1)/(x + 1)',
                      functionFormula: 'y = \\frac{2x - 1}{x + 1}',
                      functionType: 'rational',
                      domain: [-4.5, 3.5],
                      range: [-4, 6],
                      asymptotes: [
                        { type: 'vertical', value: -1, label: 'x = -1' },
                        { type: 'horizontal', value: 2, label: 'y = 2' },
                      ],
                      keyPoints: [
                        { x: 0, y: -1, label: '(0; -1)', type: 'intercept' },
                        { x: 0.5, y: 0, label: '(0.5; 0)', type: 'intercept' },
                        { x: -1, y: 2, label: 'I(-1; 2)', type: 'asymptote_center' },
                      ],
                      note: 'Đồ thị là hai nhánh hypebol nhận giao điểm 2 tiệm cận I(-1; 2) làm tâm đối xứng, không bao giờ cắt đường tiệm cận đứng.',
                    },
                  ],
                  commonMistakes: [
                    {
                      title: 'Xác định sai phương trình tiệm cận đứng và tiệm cận ngang',
                      mistake: 'Viết tiệm cận đứng là y = -1 và tiệm cận ngang là x = 2 (nhầm trục).',
                      correctExplanation: 'Quy tắc: Tiệm cận đứng luôn có dạng x = x0 (ứng với mẫu số bằng 0); Tiệm cận ngang luôn có dạng y = y0 (ứng với giới hạn lim khi x tiến về vô cực).',
                    },
                    {
                      title: 'Vẽ đồ thị cắt qua đường tiệm cận đứng',
                      mistake: 'Vẽ đường cong đâm xuyên qua đường x = -1.',
                      correctExplanation: 'Tại điểm x0 của tiệm cận đứng, hàm số hoàn toàn không xác định (x0 ∉ D). Vì vậy đồ thị không bao giờ được phép cắt hay chạm vào đường tiệm cận đứng.',
                    },
                    {
                      title: 'Quên kiểm tra nghiệm trùng giữa tử số và mẫu số',
                      mistake: 'Cho hàm y = (x² - 1)/(x - 1) rồi kết luận có tiệm cận đứng x = 1.',
                      correctExplanation: 'Nếu x0 là nghiệm của mẫu số nhưng cũng là nghiệm của tử số với bội lớn hơn hoặc bằng, phân thức bị triệt tiêu và đồ thị chỉ có một "điểm thủng", không có tiệm cận đứng.',
                    },
                  ],
                  importantNotes: [
                    'Đồ thị hàm phân thức bậc nhất trên bậc nhất y = (ax+b)/(cx+d) KHÔNG BAO GIỜ có cực trị vì đạo hàm ad - bc / (cx+d)² luôn cùng dấu.',
                    'Giao điểm của đồ thị hàm số với trục tung Oy luôn tìm bằng cách cho x = 0; giao điểm với trục hoành Ox tìm bằng cách giải phương trình y = 0.',
                    'Số nghiệm của phương trình f(x) = m chính là số giao điểm giữa đồ thị y = f(x) và đường thẳng nằm ngang y = m.',
                  ],
                  summaryPoints: [
                    'Khảo sát hàm số gồm: 1) TXĐ, 2) Sự biến thiên (y\', nghiệm, giới hạn, tiệm cận, BBT), 3) Đồ thị & tâm đối xứng.',
                    'Hàm bậc ba luôn có duy nhất một điểm uốn I(-b/3a; yI) là tâm đối xứng.',
                    'Hàm phân thức bậc nhất có 2 tiệm cận x = -d/c và y = a/c; giao điểm 2 tiệm cận là tâm đối xứng.',
                  ],
                },
              },
            ],
          },
          {
            id: 'math-chap-2',
            subjectId: 'math',
            grade: '12',
            chapterNumber: 2,
            title: 'Chương 2: Vectơ và hệ trục tọa độ trong không gian',
            description: 'Vectơ trong không gian, các phép toán vectơ, tọa độ vectơ và tọa độ điểm trong không gian Oxyz.',
            availability: 'preview',
            estimatedHours: 18,
            totalLessons: 4,
            lessons: [],
          },
          {
            id: 'math-chap-3',
            subjectId: 'math',
            grade: '12',
            chapterNumber: 3,
            title: 'Chương 3: Các số đặc trưng đo mức độ phân tán cho mẫu số liệu ghép nhóm',
            description: 'Khoảng biến thiên, khoảng tứ phân vị, phương sai và độ lệch chuẩn của số liệu ghép nhóm.',
            availability: 'preview',
            estimatedHours: 12,
            totalLessons: 3,
            lessons: [],
          },
          {
            id: 'math-chap-4',
            subjectId: 'math',
            grade: '12',
            chapterNumber: 4,
            title: 'Chương 4: Nguyên hàm. Tích phân.',
            description: 'Khái niệm nguyên hàm, các phương pháp tính nguyên hàm, tích phân và ứng dụng hình học tính diện tích, thể tích.',
            availability: 'preview',
            estimatedHours: 22,
            totalLessons: 5,
            lessons: [],
          },
          {
            id: 'math-chap-5',
            subjectId: 'math',
            grade: '12',
            chapterNumber: 5,
            title: 'Chương 5: Phương pháp tọa độ trong không gian',
            description: 'Phương trình mặt phẳng, phương trình đường thẳng và phương trình mặt cầu trong không gian Oxyz.',
            availability: 'preview',
            estimatedHours: 20,
            totalLessons: 4,
            lessons: [],
          },
          {
            id: 'math-chap-6',
            subjectId: 'math',
            grade: '12',
            chapterNumber: 6,
            title: 'Chương 6: Xác suất có điều kiện',
            description: 'Xác suất có điều kiện, công thức xác suất toàn phần và công thức Bayes trong giải quyết bài toán thực tế.',
            availability: 'preview',
            estimatedHours: 14,
            totalLessons: 3,
            lessons: [],
          },
        ],
      },
      {
        grade: '11',
        label: 'Lớp 11',
        availability: 'preview',
        chapters: [],
      },
      {
        grade: '10',
        label: 'Lớp 10',
        availability: 'preview',
        chapters: [],
      },
    ],
  },

  // 2. NGỮ VĂN
  {
    id: 'literature',
    name: 'Ngữ văn',
    shortName: 'Ngữ văn',
    icon: '📚',
    color: 'var(--subject-literature-color)',
    bgColor: 'var(--subject-literature-bg)',
    description: 'Đọc hiểu văn bản văn học, kỹ năng viết bài nghị luận xã hội và nghị luận văn học theo chuẩn đổi mới GDPT 2018.',
    availability: 'coming_soon',
    plannedTopics: [
      'Văn học hiện thực và lãng mạn Việt Nam',
      'Kỹ năng viết đoạn văn nghị luận xã hội 200 chữ',
      'Đọc hiểu văn bản thông tin và văn bản nghị luận',
      'Phân tích tác phẩm văn xuôi và thơ ca hiện đại',
    ],
    metadata: {
      curriculumVersion: 'GDPT_2018',
      textbookAlignment: 'general_standard',
      textbookLabel: 'Ngữ văn 12 · GDPT 2018',
      authorName: 'Hội đồng chuyên môn Ngữ văn STUDY_AI',
      reviewStatus: 'draft',
      licenseNotice: 'Nội dung biên soạn sư phạm độc lập bởi STUDY_AI, tham chiếu khung chương trình GDPT 2018.',
    },
    grades: [
      { grade: '12', label: 'Lớp 12', availability: 'coming_soon', chapters: [] },
      { grade: '11', label: 'Lớp 11', availability: 'coming_soon', chapters: [] },
      { grade: '10', label: 'Lớp 10', availability: 'coming_soon', chapters: [] },
    ],
  },

  // 3. TIẾNG ANH
  {
    id: 'english',
    name: 'Tiếng Anh',
    shortName: 'Tiếng Anh',
    icon: '🌐',
    color: 'var(--subject-english-color)',
    bgColor: 'var(--subject-english-bg)',
    description: 'Hệ thống ngữ pháp học thuật, từ vựng theo chủ đề thời sự toàn cầu, kỹ năng đọc hiểu và phân tích lỗi đề thi THPT.',
    availability: 'coming_soon',
    plannedTopics: [
      'Academic Grammar: Complex Clauses & Inversion',
      'Topical Vocabulary: Green Living & Lifelong Learning',
      'Reading Comprehension: Inference & Fact/Opinion Analysis',
      'Lexico-Grammar & Error Identification Strategies',
    ],
    metadata: {
      curriculumVersion: 'GDPT_2018',
      textbookAlignment: 'general_standard',
      textbookLabel: 'Tiếng Anh 12 · GDPT 2018',
      authorName: 'Hội đồng chuyên môn Ngoại ngữ STUDY_AI',
      reviewStatus: 'draft',
      licenseNotice: 'Nội dung biên soạn sư phạm độc lập bởi STUDY_AI, tham chiếu khung chương trình GDPT 2018.',
    },
    grades: [
      { grade: '12', label: 'Lớp 12', availability: 'coming_soon', chapters: [] },
      { grade: '11', label: 'Lớp 11', availability: 'coming_soon', chapters: [] },
      { grade: '10', label: 'Lớp 10', availability: 'coming_soon', chapters: [] },
    ],
  },

  // 4. VẬT LÍ
  {
    id: 'physics',
    name: 'Vật lí',
    shortName: 'Vật lí',
    icon: '⚛',
    color: 'var(--subject-physics-color)',
    bgColor: 'var(--subject-physics-bg)',
    description: 'Vật lí nhiệt, khí lí tưởng, từ trường, cảm ứng điện từ và vật lí hạt nhân gắn với ứng dụng công nghệ hiện đại.',
    availability: 'coming_soon',
    plannedTopics: [
      'Vật lí nhiệt và sự chuyển thể của các chất',
      'Khí lí tưởng và các định luật thực nghiệm chất khí',
      'Từ trường và hiện tượng cảm ứng điện từ',
      'Vật lí hạt nhân: Năng lượng liên kết và phóng xạ',
    ],
    metadata: {
      curriculumVersion: 'GDPT_2018',
      textbookAlignment: 'general_standard',
      textbookLabel: 'Vật lí 12 · GDPT 2018',
      authorName: 'Tổ Vật lí STUDY_AI',
      reviewStatus: 'draft',
      licenseNotice: 'Nội dung biên soạn sư phạm độc lập bởi STUDY_AI.',
    },
    grades: [
      { grade: '12', label: 'Lớp 12', availability: 'coming_soon', chapters: [] },
      { grade: '11', label: 'Lớp 11', availability: 'coming_soon', chapters: [] },
      { grade: '10', label: 'Lớp 10', availability: 'coming_soon', chapters: [] },
    ],
  },

  // 5. HÓA HỌC
  {
    id: 'chemistry',
    name: 'Hóa học',
    shortName: 'Hóa học',
    icon: '🧪',
    color: 'var(--subject-chemistry-color)',
    bgColor: 'var(--subject-chemistry-bg)',
    description: 'Hợp chất hữu cơ este - lipit, carbohydrate, amine - amino acid - protein, pin điện hóa và phức chất kim loại chuyển tiếp.',
    availability: 'coming_soon',
    plannedTopics: [
      'Este - Lipit và xà phòng tổng hợp',
      'Carbohydrate: Glucose, Fructose, Saccharose, Tinh bột',
      'Hợp chất chứa Nitơ: Amine, Amino acid, Peptide & Protein',
      'Pin điện và điện phân trong công nghiệp',
    ],
    metadata: {
      curriculumVersion: 'GDPT_2018',
      textbookAlignment: 'general_standard',
      textbookLabel: 'Hóa học 12 · GDPT 2018',
      authorName: 'Tổ Hóa học STUDY_AI',
      reviewStatus: 'draft',
      licenseNotice: 'Nội dung biên soạn sư phạm độc lập bởi STUDY_AI.',
    },
    grades: [
      { grade: '12', label: 'Lớp 12', availability: 'coming_soon', chapters: [] },
      { grade: '11', label: 'Lớp 11', availability: 'coming_soon', chapters: [] },
      { grade: '10', label: 'Lớp 10', availability: 'coming_soon', chapters: [] },
    ],
  },

  // 6. SINH HỌC
  {
    id: 'biology',
    name: 'Sinh học',
    shortName: 'Sinh học',
    icon: '🧬',
    color: 'var(--subject-biology-color)',
    bgColor: 'var(--subject-biology-bg)',
    description: 'Di truyền học phân tử, quy luật di truyền Men-đen, di truyền quần thể, thuyết tiến hóa hiện đại và sinh thái học.',
    availability: 'coming_soon',
    plannedTopics: [
      'Cơ chế di truyền và biến dị ở cấp độ phân tử (DNA, RNA, Protein)',
      'Quy luật di truyền và di truyền liên kết giới tính',
      'Di truyền học quần thể và công nghệ tế bào / gen',
      'Sinh thái học, chuỗi thức ăn và bảo vệ sinh quyển',
    ],
    metadata: {
      curriculumVersion: 'GDPT_2018',
      textbookAlignment: 'general_standard',
      textbookLabel: 'Sinh học 12 · GDPT 2018',
      authorName: 'Tổ Sinh học STUDY_AI',
      reviewStatus: 'draft',
      licenseNotice: 'Nội dung biên soạn sư phạm độc lập bởi STUDY_AI.',
    },
    grades: [
      { grade: '12', label: 'Lớp 12', availability: 'coming_soon', chapters: [] },
      { grade: '11', label: 'Lớp 11', availability: 'coming_soon', chapters: [] },
      { grade: '10', label: 'Lớp 10', availability: 'coming_soon', chapters: [] },
    ],
  },

  // 7. LỊCH SỬ
  {
    id: 'history',
    name: 'Lịch sử',
    shortName: 'Lịch sử',
    icon: '🏛',
    color: 'var(--subject-history-color)',
    bgColor: 'var(--subject-history-bg)',
    description: 'Lịch sử thế giới hiện đại sau 1945, quan hệ quốc tế, phong trào giải phóng dân tộc và công cuộc Đổi mới tại Việt Nam.',
    availability: 'coming_soon',
    plannedTopics: [
      'Trật tự thế giới hai cực Ianta và Chiến tranh Lạnh',
      'Phong trào giải phóng dân tộc Á - Phi - Mỹ Latinh',
      'Cách mạng giải phóng dân tộc Việt Nam (1930 - 1975)',
      'Công cuộc Đổi mới và hội nhập quốc tế từ 1986 đến nay',
    ],
    metadata: {
      curriculumVersion: 'GDPT_2018',
      textbookAlignment: 'general_standard',
      textbookLabel: 'Lịch sử 12 · GDPT 2018',
      authorName: 'Tổ Lịch sử STUDY_AI',
      reviewStatus: 'draft',
      licenseNotice: 'Nội dung biên soạn sư phạm độc lập bởi STUDY_AI.',
    },
    grades: [
      { grade: '12', label: 'Lớp 12', availability: 'coming_soon', chapters: [] },
      { grade: '11', label: 'Lớp 11', availability: 'coming_soon', chapters: [] },
      { grade: '10', label: 'Lớp 10', availability: 'coming_soon', chapters: [] },
    ],
  },

  // 8. ĐỊA LÍ
  {
    id: 'geography',
    name: 'Địa lí',
    shortName: 'Địa lí',
    icon: '🌍',
    color: 'var(--subject-geography-color)',
    bgColor: 'var(--subject-geography-bg)',
    description: 'Địa lí kinh tế - xã hội thế giới, địa lí tự nhiên và dân cư Việt Nam, chuyển dịch cơ cấu ngành và phát triển kinh tế vùng.',
    availability: 'coming_soon',
    plannedTopics: [
      'Toàn cầu hóa và khu vực hóa kinh tế thế giới',
      'Đặc điểm tự nhiên, tài nguyên thiên nhiên Việt Nam',
      'Chuyển dịch cơ cấu ngành kinh tế (Nông nghiệp, Công nghiệp, Dịch vụ)',
      'Phát triển kinh tế các vùng trọng điểm và bảo vệ chủ quyền biển đảo',
    ],
    metadata: {
      curriculumVersion: 'GDPT_2018',
      textbookAlignment: 'general_standard',
      textbookLabel: 'Địa lí 12 · GDPT 2018',
      authorName: 'Tổ Địa lí STUDY_AI',
      reviewStatus: 'draft',
      licenseNotice: 'Nội dung biên soạn sư phạm độc lập bởi STUDY_AI.',
    },
    grades: [
      { grade: '12', label: 'Lớp 12', availability: 'coming_soon', chapters: [] },
      { grade: '11', label: 'Lớp 11', availability: 'coming_soon', chapters: [] },
      { grade: '10', label: 'Lớp 10', availability: 'coming_soon', chapters: [] },
    ],
  },

  // 9. GIÁO DỤC KINH TẾ VÀ PHÁP LUẬT
  {
    id: 'economic-law',
    name: 'Giáo dục kinh tế và pháp luật',
    shortName: 'GDKT & PL',
    icon: '⚖',
    color: 'var(--subject-economic-law-color)',
    bgColor: 'var(--subject-economic-law-bg)',
    description: 'Quy luật kinh tế thị trường, quản lí tài chính cá nhân, hệ thống pháp luật Việt Nam, quyền và nghĩa vụ công dân.',
    availability: 'coming_soon',
    plannedTopics: [
      'Nền kinh tế và các quy luật kinh tế thị trường cơ bản',
      'Thị trường lao động, việc làm và an sinh xã hội',
      'Quyền và nghĩa vụ của công dân trong hoạt động kinh doanh',
      'Pháp luật về bình đẳng giới và an toàn bảo hộ lao động',
    ],
    metadata: {
      curriculumVersion: 'GDPT_2018',
      textbookAlignment: 'general_standard',
      textbookLabel: 'GDKT & PL 12 · GDPT 2018',
      authorName: 'Tổ Giáo dục kinh tế và pháp luật STUDY_AI',
      reviewStatus: 'draft',
      licenseNotice: 'Nội dung biên soạn sư phạm độc lập bởi STUDY_AI.',
    },
    grades: [
      { grade: '12', label: 'Lớp 12', availability: 'coming_soon', chapters: [] },
      { grade: '11', label: 'Lớp 11', availability: 'coming_soon', chapters: [] },
      { grade: '10', label: 'Lớp 10', availability: 'coming_soon', chapters: [] },
    ],
  },
]

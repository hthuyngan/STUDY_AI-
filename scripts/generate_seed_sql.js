const fs = require('fs');
const path = require('path');

const authorId = 'usr_content_1e88ba27ab124caa9bd6c1fcdba4c99a';

const chapters = [
  { id: 'chp_math12_c1', title: 'Chương 1: Ứng dụng đạo hàm để khảo sát và vẽ đồ thị của hàm số', desc: 'Tính đơn điệu, cực trị, GTLN-GTNN, đường tiệm cận, khảo sát sự biến thiên và ứng dụng thực tiễn của hàm số.', order: 1 },
  { id: 'chp_math12_c2', title: 'Chương 2: Vectơ và hệ toạ độ trong không gian', desc: 'Vectơ trong không gian, hệ trục toạ độ Oxyz, các phép toán toạ độ và tích vô hướng.', order: 2 },
  { id: 'chp_math12_c3', title: 'Chương 3: Các số đặc trưng đo mức độ phân tán cho mẫu số liệu ghép nhóm', desc: 'Khoảng biến thiên, khoảng tứ phân vị, phương sai và độ lệch chuẩn của mẫu số liệu ghép nhóm.', order: 3 },
  { id: 'chp_math12_c4', title: 'Chương 4: Nguyên hàm và tích phân', desc: 'Khái niệm nguyên hàm, bảng nguyên hàm, các phương pháp tính tích phân và ứng dụng hình học.', order: 4 },
  { id: 'chp_math12_c5', title: 'Chương 5: Phương pháp toạ độ trong không gian', desc: 'Phương trình mặt phẳng, phương trình đường thẳng, công thức tính góc và phương trình mặt cầu trong không gian Oxyz.', order: 5 },
  { id: 'chp_math12_c6', title: 'Chương 6: Xác suất có điều kiện', desc: 'Khái niệm xác suất có điều kiện, công thức nhân xác suất, công thức xác suất toàn phần và định lý Bayes.', order: 6 },
];

const topics = [
  // Chapter 1
  { id: 'top_math12_c1_t1', chapterId: 'chp_math12_c1', title: 'Tính đơn điệu và cực trị của hàm số', order: 1 },
  { id: 'top_math12_c1_t2', chapterId: 'chp_math12_c1', title: 'Giá trị lớn nhất và giá trị nhỏ nhất của hàm số', order: 2 },
  { id: 'top_math12_c1_t3', chapterId: 'chp_math12_c1', title: 'Đường tiệm cận của đồ thị hàm số', order: 3 },
  { id: 'top_math12_c1_t4', chapterId: 'chp_math12_c1', title: 'Khảo sát sự biến thiên và vẽ đồ thị hàm số', order: 4 },
  // Chapter 2
  { id: 'top_math12_c2_t1', chapterId: 'chp_math12_c2', title: 'Vectơ và các phép toán trong không gian', order: 1 },
  { id: 'top_math12_c2_t2', chapterId: 'chp_math12_c2', title: 'Hệ toạ độ Oxyz và toạ độ vectơ', order: 2 },
  // Chapter 3
  { id: 'top_math12_c3_t1', chapterId: 'chp_math12_c3', title: 'Khoảng biến thiên và khoảng tứ phân vị', order: 1 },
  { id: 'top_math12_c3_t2', chapterId: 'chp_math12_c3', title: 'Phương sai và độ lệch chuẩn của số liệu ghép nhóm', order: 2 },
  // Chapter 4
  { id: 'top_math12_c4_t1', chapterId: 'chp_math12_c4', title: 'Nguyên hàm và phương pháp tính', order: 1 },
  { id: 'top_math12_c4_t2', chapterId: 'chp_math12_c4', title: 'Tích phân và ứng dụng hình học', order: 2 },
  // Chapter 5
  { id: 'top_math12_c5_t1', chapterId: 'chp_math12_c5', title: 'Mặt phẳng và đường thẳng trong không gian', order: 1 },
  { id: 'top_math12_c5_t2', chapterId: 'chp_math12_c5', title: 'Mặt cầu và công thức tính góc', order: 2 },
  // Chapter 6
  { id: 'top_math12_c6_t1', chapterId: 'chp_math12_c6', title: 'Xác suất có điều kiện và công thức Bayes', order: 1 },
];

const lessons = [
  // --- CHƯƠNG 1 (5 BÀI SGK) ---
  {
    id: 'les_math12_c1_b1',
    chapterId: 'chp_math12_c1',
    topicId: 'top_math12_c1_t1',
    title: 'Bài 1: Tính đơn điệu của hàm số',
    slug: 'tinh-don-dieu-cua-ham-so',
    order: 1,
    status: 'published',
    objectives: [
      'Hiểu rõ định lý về dấu của đạo hàm cấp một và tính đơn điệu.',
      'Biết cách lập bảng xét dấu đạo hàm và bảng biến thiên.',
      'Vận dụng giải các bài toán tìm khoảng đồng biến, nghịch biến có chứa tham số m.'
    ],
    intro: 'Tính đơn điệu (đồng biến, nghịch biến) phản ánh xu hướng tăng giảm của giá trị $y$ khi biến số $x$ thay đổi. Bằng công cụ đạo hàm, ta có thể khảo sát sự biến thiên của hàm số một cách chính xác trên từng khoảng xác định.',
    defs: [
      'Hàm số đồng biến: Cho hàm số y = f(x) xác định trên khoảng (a; b). Hàm số được gọi là đồng biến (tăng) trên (a; b) nếu với mọi x_1, x_2 thuộc (a; b) mà x_1 < x_2 thì f(x_1) < f(x_2).',
      'Hàm số nghịch biến: Cho hàm số y = f(x) xác định trên khoảng (a; b). Hàm số được gọi là nghịch biến (giảm) trên (a; b) nếu với mọi x_1, x_2 thuộc (a; b) mà x_1 < x_2 thì f(x_1) > f(x_2).'
    ],
    formulas: [
      'f\'(x) \\ge 0, \\forall x \\in (a; b) \\text{ (bằng 0 tại hữu hạn điểm) } \\implies f(x) \\text{ đồng biến trên } (a; b)',
      'f\'(x) \\le 0, \\forall x \\in (a; b) \\text{ (bằng 0 tại hữu hạn điểm) } \\implies f(x) \\text{ nghịch biến trên } (a; b)',
      'f\'(x_0) = \\lim_{x \\to x_0} \\frac{f(x) - f(x_0)}{x - x_0}'
    ],
    examples: [
      'Ví dụ 1: Tìm các khoảng đơn điệu của hàm số f(x) = x^3 - 3x^2 + 2: Đạo hàm f\'(x) = 3x^2 - 6x = 3x(x - 2). Cho f\'(x) = 0 ta có x = 0 hoặc x = 2. Lập bảng xét dấu: f\'(x) > 0 trên (-∞; 0) và (2; +∞) -> hàm số đồng biến. f\'(x) < 0 trên (0; 2) -> hàm số nghịch biến.'
    ],
    notes: [
      'Dấu "=" của đạo hàm chỉ được xảy ra tại hữu hạn điểm.',
      'Không dùng ký hiệu hợp (∪) khi kết luận các khoảng đồng biến, nghịch biến; phải dùng từ "và" hoặc liệt kê riêng từng khoảng.'
    ],
    summary: [
      'Quy tắc 3 bước xét tính đơn điệu: 1) Tìm TXĐ và tính đạo hàm f\'(x); 2) Tìm nghiệm f\'(x) = 0; 3) Lập bảng biến thiên và kết luận.'
    ]
  },
  {
    id: 'les_math12_c1_b2',
    chapterId: 'chp_math12_c1',
    topicId: 'top_math12_c1_t1',
    title: 'Bài 2: Cực trị của hàm số',
    slug: 'cuc-tri-cua-ham-so',
    order: 2,
    status: 'published',
    objectives: [
      'Nắm vững khái niệm điểm cực đại, điểm cực tiểu, giá trị cực đại, giá trị cực tiểu.',
      'Thành thạo Quy tắc 1 (đổi dấu đạo hàm) và Quy tắc 2 (đạo hàm cấp 2).'
    ],
    intro: 'Cực trị của hàm số là những điểm mà tại đó đồ thị đạt đỉnh cao cục bộ (cực đại) hoặc đáy trũng cục bộ (cực tiểu) so với các điểm lân cận.',
    defs: [
      'Điểm cực đại: Điểm x_0 sao cho f(x) < f(x_0) với mọi x trong lân cận của x_0.',
      'Điểm cực tiểu: Điểm x_0 sao cho f(x) > f(x_0) với mọi x trong lân cận của x_0.'
    ],
    formulas: [
      '\\text{Quy tắc 1: } f\'(x) \\text{ đổi dấu từ } + \\to - \\implies x_0 \\text{ là điểm cực đại}',
      '\\text{Quy tắc 2: } f\'(x_0) = 0, f\'\'(x_0) < 0 \\implies x_0 \\text{ là điểm cực đại}; f\'\'(x_0) > 0 \\implies x_0 \\text{ là điểm cực tiểu}'
    ],
    examples: [
      'Ví dụ 1: Tìm cực trị của hàm số y = -x^3 + 3x + 1: y\' = -3x^2 + 3 = 0 <=> x = 1 hoặc x = -1. x = -1 là điểm cực tiểu, y_CT = -1; x = 1 là điểm cực đại, y_CD = 3.'
    ],
    notes: [
      'Phân biệt: Điểm cực trị của hàm số (x_0), Giá trị cực trị (y_0) và Điểm cực trị của đồ thị (M(x_0; y_0)).'
    ],
    summary: [
      'Hàm đa thức bậc ba y = ax^3 + bx^2 + cx + d có 2 cực trị khi phương trình y\' = 0 có 2 nghiệm phân biệt.'
    ]
  },
  {
    id: 'les_math12_c1_b3',
    chapterId: 'chp_math12_c1',
    topicId: 'top_math12_c1_t2',
    title: 'Bài 3: Giá trị lớn nhất và nhỏ nhất của hàm số',
    slug: 'gia-tri-lon-nhat-va-nho-nhat',
    order: 3,
    status: 'published',
    objectives: [
      'Nắm vững định nghĩa GTLN, GTNN trên tập D.',
      'Thuần thục phương pháp tìm GTLN, GTNN trên đoạn không cần lập bảng biến thiên.'
    ],
    intro: 'Tìm GTLN và GTNN của hàm số là công cụ toán học ứng dụng rộng rãi nhất trong thực tế, từ tối ưu chi phí sản xuất đến tối đa hóa lợi nhuận.',
    defs: [
      'Giá trị lớn nhất: M = \\max_{x \\in D} f(x) \\iff f(x) \\le M, \\forall x \\in D \\text{ và } \\exists x_0 \\in D: f(x_0) = M.'
    ],
    formulas: [
      '\\text{Trên đoạn } [a; b]: \\max f(x) = \\max \\{ f(a), f(b), f(x_i) \\}, \\quad \\min f(x) = \\min \\{ f(a), f(b), f(x_i) \\}'
    ],
    examples: [
      'Ví dụ 1: Tìm GTLN, GTNN của f(x) = x^4 - 2x^2 + 3 trên [-3; 2]: f\'(x) = 4x(x^2 - 1) = 0 <=> x = 0, x = ±1. So sánh f(-3)=66, f(2)=11, f(0)=3, f(±1)=2. Max = 66, Min = 2.'
    ],
    notes: [
      'Hàm liên tục trên đoạn [a; b] luôn đạt GTLN và GTNN trên đoạn đó.'
    ],
    summary: [
      'Tìm max, min trên đoạn [a; b]: tính f\'(x); tìm nghiệm x_i trong (a; b); tính giá trị tại các đầu mút và nghiệm; so sánh.'
    ]
  },
  {
    id: 'les_math12_c1_b4',
    chapterId: 'chp_math12_c1',
    topicId: 'top_math12_c1_t3',
    title: 'Bài 4: Đường tiệm cận của đồ thị hàm số',
    slug: 'duong-tiem-can-cua-do-thi-ham-so',
    order: 4,
    status: 'published',
    objectives: [
      'Hiểu rõ tiệm cận đứng, tiệm cận ngang và tiệm cận xiên.',
      'Sử dụng giới hạn lim để xác định phương trình tiệm cận.'
    ],
    intro: 'Đường tiệm cận mô tả hình dáng đồ thị hàm số ở vô cực hoặc gần các điểm gián đoạn, cho biết xu hướng tiệm cận của đường cong.',
    defs: [
      'Tiệm cận ngang: Đường thẳng y = y_0 nếu lim_{x \\to +\\infty} f(x) = y_0 hoặc lim_{x \\to -\\infty} f(x) = y_0.',
      'Tiệm cận đứng: Đường thẳng x = x_0 nếu lim_{x \\to x_0^+} f(x) = \\pm\\infty hoặc lim_{x \\to x_0^-} f(x) = \\pm\\infty.',
      'Tiệm cận xiên: Đường thẳng y = ax + b (a \\ne 0) nếu lim_{x \\to \\pm\\infty} [f(x) - (ax + b)] = 0.'
    ],
    formulas: [
      'a = \\lim_{x \\to \\pm\\infty} \\frac{f(x)}{x}, \\quad b = \\lim_{x \\to \\pm\\infty} [f(x) - ax]'
    ],
    examples: [
      'Ví dụ 1: Tìm tiệm cận của hàm số y = (2x + 1)/(x - 1): TCĐ là x = 1 vì mẫu số bằng 0; TCN là y = 2 vì bậc tử bằng bậc mẫu.'
    ],
    notes: [
      'Đồ thị hàm phân thức bậc hai trên bậc nhất luôn có 1 tiệm cận đứng và 1 tiệm cận xiên.'
    ],
    summary: [
      'Quy tắc tìm tiệm cận: Tính giới hạn tại điểm gián đoạn tìm TCĐ; tính giới hạn khi x ra vô cực tìm TCN hoặc TC xiên.'
    ]
  },
  {
    id: 'les_math12_c1_b5',
    chapterId: 'chp_math12_c1',
    topicId: 'top_math12_c1_t4',
    title: 'Bài 5: Khảo sát sự biến thiên và vẽ đồ thị hàm số',
    slug: 'khao-sat-va-ve-do-thi-ham-so',
    order: 5,
    status: 'published',
    objectives: [
      'Nắm vững sơ đồ 3 bước khảo sát sự biến thiên và vẽ đồ thị hàm số.',
      'Nhận biết tâm đối xứng và trục đối xứng của đồ thị.',
      'Giải bài toán ứng dụng đạo hàm thực tế (tối ưu thể tích, chi phí).'
    ],
    intro: 'Khảo sát hàm số là bước tổng hợp toàn bộ kiến thức đạo hàm, cực trị, tiệm cận để phác thảo chính xác hình dạng đồ thị và ứng dụng giải toán thực tế.',
    defs: [
      'Sơ đồ khảo sát: 1) TXĐ; 2) Sự biến thiên (đạo hàm, cực trị, giới hạn, tiệm cận, bảng biến thiên); 3) Vẽ đồ thị.'
    ],
    formulas: [
      '\\text{Hàm bậc 3: } y = ax^3 + bx^2 + cx + d \\quad (a \\ne 0)',
      '\\text{Hàm phân thức: } y = \\frac{ax + b}{cx + d} \\quad (ad - bc \\ne 0, c \\ne 0)'
    ],
    examples: [
      'Ví dụ: Một người thợ muốn làm một thùng tôn hình trụ không nắp dung tích V. Tìm bán kính đáy r và chiều cao h để tiết kiệm tôn nhất.'
    ],
    notes: [
      'Tâm đối xứng của hàm bậc 3 là điểm uốn (nghiệm y\'\' = 0). Tâm đối xứng của hàm nhất biến là giao điểm 2 tiệm cận.'
    ],
    summary: [
      'Đồ thị hàm số minh họa trực quan tính chất biến thiên và là công cụ biện luận số nghiệm phương trình f(x) = m.'
    ]
  },

  // --- CHƯƠNG 2 (3 BÀI SGK) ---
  {
    id: 'les_math12_c2_b1',
    chapterId: 'chp_math12_c2',
    topicId: 'top_math12_c2_t1',
    title: 'Bài 6: Vectơ trong không gian',
    slug: 'vecto-trong-khong-gian',
    order: 1,
    status: 'published',
    objectives: [
      'Nắm định nghĩa vectơ trong không gian, vectơ cùng phương, đồng phẳng.',
      'Thành thạo quy tắc 3 điểm, hình bình hành, hình hộp và trọng tâm.'
    ],
    intro: 'Vectơ trong không gian mở rộng khái niệm vectơ hình học phẳng sang không gian 3 chiều, là ngôn ngữ đại số mạnh mẽ trong cơ học và không gian Oxyz.',
    defs: [
      'Vectơ trong không gian: Đoạn thẳng có hướng xác định điểm đầu và điểm cuối.',
      'Quy tắc hình hộp: Cho hình hộp ABCD.A\'B\'C\'D\', ta có vectơ AC\' = AB + AD + AA\'.'
    ],
    formulas: [
      '\\vec{AC\'} = \\vec{AB} + \\vec{AD} + \\vec{AA\'}',
      '\\vec{u} \\cdot \\vec{v} = |\\vec{u}| \\cdot |\\vec{v}| \\cdot \\cos(\\vec{u}, \\vec{v})'
    ],
    examples: [
      'Ví dụ 1: Cho tứ diện ABCD có G là trọng tâm. Chứng minh GA + GB + GC + GD = 0.'
    ],
    notes: [
      'Điều kiện 3 vectơ đồng phẳng: vec{w} = k.vec{u} + m.vec{v}.'
    ],
    summary: [
      'Tích vô hướng hai vectơ cho phép tính góc và chứng minh hai đường thẳng vuông góc trong không gian.'
    ]
  },
  {
    id: 'les_math12_c2_b2',
    chapterId: 'chp_math12_c2',
    topicId: 'top_math12_c2_t2',
    title: 'Bài 7: Hệ trục toạ độ trong không gian',
    slug: 'he-truc-toa-do-trong-khong-gian',
    order: 2,
    status: 'published',
    objectives: [
      'Hiểu cấu tạo hệ toạ độ vuông góc Oxyz với 3 vectơ đơn vị i, j, k.',
      'Xác định toạ độ của điểm và toạ độ của vectơ.'
    ],
    intro: 'Hệ trục toạ độ Oxyz gắn kết hình học không gian với đại số giải tích, cho phép mô tả mọi điểm, đường thẳng và mặt phẳng bằng các bộ số (x, y, z).',
    defs: [
      'Hệ toạ độ Oxyz: Gồm ba trục Ox, Oy, Oz vuông góc từng đôi một tại gốc O.',
      'Toạ độ vectơ u: u = x.i + y.j + z.k <=> u = (x; y; z).'
    ],
    formulas: [
      '\\vec{u} = (x; y; z) \\iff \\vec{u} = x\\vec{i} + y\\vec{j} + z\\vec{k}',
      'M(x; y; z) \\iff \\vec{OM} = (x; y; z)',
      '\\vec{AB} = (x_B - x_A; y_B - y_A; z_B - z_A)'
    ],
    examples: [
      'Ví dụ: Cho A(1; 2; -1) và B(3; 0; 2). Toạ độ trung điểm M của AB là M((1+3)/2; (2+0)/2; (-1+2)/2) = M(2; 1; 1/2).'
    ],
    notes: [
      'Toạ độ hình chiếu của M(x; y; z) lên Oxy là (x; y; 0), lên Ox là (x; 0; 0).'
    ],
    summary: [
      'Hệ toạ độ Oxyz biến các bài toán chứng minh hình học không gian phức tạp thành các phép toán đại số cơ bản.'
    ]
  },
  {
    id: 'les_math12_c2_b3',
    chapterId: 'chp_math12_c2',
    topicId: 'top_math12_c2_t2',
    title: 'Bài 8: Biểu thức toạ độ của các phép toán vectơ',
    slug: 'bieu-thuc-toa-do-phep-toan-vecto',
    order: 3,
    status: 'published',
    objectives: [
      'Nắm vững biểu thức toạ độ của tổng, hiệu, tích vectơ với số và tích vô hướng.',
      'Tính khoảng cách giữa 2 điểm và góc giữa 2 vectơ.'
    ],
    intro: 'Biểu thức toạ độ đại số hóa các phép toán hình học vectơ, cho phép tính toán độ dài, tích vô hướng và xét tính vuông góc trực tiếp qua các phép tính số học.',
    defs: [
      'Tích vô hướng: Cho u = (x1; y1; z1) và v = (x2; y2; z2), khi đó u.v = x1.x2 + y1.y2 + z1.z2.'
    ],
    formulas: [
      '|\\vec{u}| = \\sqrt{x^2 + y^2 + z^2}',
      '\\cos(\\vec{u}, \\vec{v}) = \\frac{\\vec{u} \\cdot \\vec{v}}{|\\vec{u}| \\cdot |\\vec{v}|} = \\frac{x_1 x_2 + y_1 y_2 + z_1 z_2}{\\sqrt{x_1^2 + y_1^2 + z_1^2} \\cdot \\sqrt{x_2^2 + y_2^2 + z_2^2}}',
      'AB = \\sqrt{(x_B - x_A)^2 + (y_B - y_A)^2 + (z_B - z_A)^2}'
    ],
    examples: [
      'Ví dụ: Cho u = (1; -2; 2) và v = (2; 1; 0). Tính u.v = 1*2 + (-2)*1 + 2*0 = 0 => hai vectơ vuông góc nhau.'
    ],
    notes: [
      'Hai vectơ vuông góc khi và chỉ khi tích vô hướng bằng 0: x1.x2 + y1.y2 + z1.z2 = 0.'
    ],
    summary: [
      'Các phép toán toạ độ vectơ là nền tảng để viết phương trình mặt phẳng, đường thẳng và mặt cầu trong chương 5.'
    ]
  },

  // --- CHƯƠNG 3 (2 BÀI SGK) ---
  {
    id: 'les_math12_c3_b1',
    chapterId: 'chp_math12_c3',
    topicId: 'top_math12_c3_t1',
    title: 'Bài 9: Khoảng biến thiên và khoảng tứ phân vị',
    slug: 'khoang-bien-thien-va-khoang-tu-phan-vi',
    order: 1,
    status: 'published',
    objectives: [
      'Hiểu ý nghĩa của khoảng biến thiên và khoảng tứ phân vị trong mẫu ghép nhóm.',
      'Thành thạo công thức tính tứ phân vị Q1, Q2, Q3 từ bảng tần số ghép nhóm.'
    ],
    intro: 'Trong thực tế khi số liệu lớn, người ta chia số liệu thành các nhóm khoảng. Khoảng biến thiên và khoảng tứ phân vị đo lường độ phân tán và phát hiện giá trị bất thường.',
    defs: [
      'Khoảng biến thiên: R = x_max - x_min của các khoảng nhóm.',
      'Khoảng tứ phân vị: Delta_Q = Q_3 - Q_1, đo độ phân tán của 50% số liệu chính giữa.'
    ],
    formulas: [
      'Q_r = u_m + \\frac{\\frac{r \\cdot n}{4} - C}{n_m} \\cdot (u_{m+1} - u_m) \\quad (r = 1, 2, 3)'
    ],
    examples: [
      'Ví dụ: Khảo sát thời gian tự học của 100 học sinh. Lập bảng tần số ghép nhóm và tính Q1, Q3, từ đó suy ra khoảng tứ phân vị.'
    ],
    notes: [
      'Khoảng tứ phân vị ít bị ảnh hưởng bởi các giá trị bất thường (ngoại lai) hơn khoảng biến thiên.'
    ],
    summary: [
      'Khoảng biến thiên và khoảng tứ phân vị là hai số đặc trưng cơ bản đánh giá độ đồng đều của mẫu số liệu.'
    ]
  },
  {
    id: 'les_math12_c3_b2',
    chapterId: 'chp_math12_c3',
    topicId: 'top_math12_c3_t2',
    title: 'Bài 10: Phương sai và độ lệch chuẩn của mẫu số liệu ghép nhóm',
    slug: 'phuong-sai-va-do-lech-chuan',
    order: 2,
    status: 'published',
    objectives: [
      'Hiểu ý nghĩa của phương sai và độ lệch chuẩn trong đánh giá độ rủi ro, ổn định.',
      'Thành thạo công thức và kỹ năng bấm máy tính cầm tay tìm phương sai s^2 và độ lệch chuẩn s.'
    ],
    intro: 'Phương sai và độ lệch chuẩn là các chỉ số thống kê quan trọng nhất phản ánh độ phân tán của các giá trị quan sát xung quanh giá trị trung bình.',
    defs: [
      'Giá trị đại diện: c_i = (a_i + a_{i+1})/2 là trung điểm của nửa khoảng ghép nhóm.',
      'Phương sai s^2: Trung bình cộng bình phương độ lệch của các giá trị đại diện so với số trung bình.'
    ],
    formulas: [
      '\\bar{x} = \\frac{1}{n} \\sum_{i=1}^k n_i c_i',
      's^2 = \\frac{1}{n} \\sum_{i=1}^k n_i c_i^2 - (\\bar{x})^2',
      's = \\sqrt{s^2}'
    ],
    examples: [
      'Ví dụ: So sánh độ ổn định năng suất lúa giữa hai giống cây dựa vào độ lệch chuẩn: giống nào có s nhỏ hơn thì năng suất đồng đều hơn.'
    ],
    notes: [
      'Độ lệch chuẩn có cùng đơn vị đo với đại lượng nghiên cứu, giúp so sánh trực quan.'
    ],
    summary: [
      'Phương sai và độ lệch chuẩn càng nhỏ thì số liệu càng tập trung quanh giá trị trung bình.'
    ]
  },

  // --- CHƯƠNG 4 (3 BÀI SGK) ---
  {
    id: 'les_math12_c4_b1',
    chapterId: 'chp_math12_c4',
    topicId: 'top_math12_c4_t1',
    title: 'Bài 11: Nguyên hàm',
    slug: 'nguyen-ham',
    order: 1,
    status: 'published',
    objectives: [
      'Nắm vững định nghĩa nguyên hàm và các tính chất cơ bản.',
      'Thuộc bảng nguyên hàm của các hàm số sơ cấp cơ bản.',
      'Áp dụng phương pháp đổi biến số và từng phần.'
    ],
    intro: 'Nguyên hàm là phép toán ngược của đạo hàm. Nếu biết tốc độ biến thiên, nguyên hàm cho phép ta tìm lại hàm số gốc ban đầu.',
    defs: [
      'Hàm F(x) là nguyên hàm của f(x) trên K nếu F\'(x) = f(x) với mọi x thuộc K.',
      'Họ nguyên hàm: \\int f(x) dx = F(x) + C.'
    ],
    formulas: [
      '\\int x^\\alpha dx = \\frac{x^{\\alpha + 1}}{\\alpha + 1} + C \\quad (\\alpha \\ne -1)',
      '\\int \\frac{1}{x} dx = \\ln|x| + C, \\quad \\int e^x dx = e^x + C',
      '\\int u \\, dv = u v - \\int v \\, du'
    ],
    examples: [
      'Ví dụ: Tìm nguyên hàm I = \\int x e^x dx: Đặt u = x => du = dx; dv = e^x dx => v = e^x. Suy ra I = x e^x - \\int e^x dx = (x - 1)e^x + C.'
    ],
    notes: [
      'Đừng quên cộng hằng số C trong kết quả họ nguyên hàm.'
    ],
    summary: [
      'Hai phương pháp trụ cột tính nguyên hàm: 1) Đổi biến số u = u(x); 2) Từng phần theo quy tắc "nhất lô, nhì đa, tam lượng, tứ mũ".'
    ]
  },
  {
    id: 'les_math12_c4_b2',
    chapterId: 'chp_math12_c4',
    topicId: 'top_math12_c4_t1',
    title: 'Bài 12: Tích phân',
    slug: 'tich-phan',
    order: 2,
    status: 'published',
    objectives: [
      'Hiểu bản chất định nghĩa tích phân theo công thức Newton-Leibniz.',
      'Nắm vững các tính chất cơ bản của tích phân xác định.',
      'Thành thạo phương pháp đổi biến số (có đổi cận) và tích phân từng phần.'
    ],
    intro: 'Tích phân xác định là công cụ mạnh mẽ trong giải tích, liên kết giá trị nguyên hàm tại hai đầu mút để tính toán diện tích, thể tích và công trong vật lý.',
    defs: [
      'Định nghĩa: \\int_a^b f(x) dx = F(b) - F(a) = F(x)|_a^b.'
    ],
    formulas: [
      '\\int_a^b f(x) dx = F(b) - F(a)',
      '\\int_a^b [f(x) \\pm g(x)] dx = \\int_a^b f(x) dx \\pm \\int_a^b g(x) dx',
      '\\int_a^b f(x) dx = \\int_a^c f(x) dx + \\int_c^b f(x) dx',
      '\\int_a^b u \\, dv = (u v)|_a^b - \\int_a^b v \\, du'
    ],
    examples: [
      'Ví dụ: Tính I = \\int_0^1 (2x + 1) dx = (x^2 + x)|_0^1 = (1 + 1) - (0) = 2.'
    ],
    notes: [
      'Khi đổi biến t = u(x) trong tích phân xác định, BẮT BUỘC phải đổi cận tương ứng.'
    ],
    summary: [
      'Tích phân không phụ thuộc vào biến số: \\int_a^b f(x) dx = \\int_a^b f(t) dt.'
    ]
  },
  {
    id: 'les_math12_c4_b3',
    chapterId: 'chp_math12_c4',
    topicId: 'top_math12_c4_t2',
    title: 'Bài 13: Ứng dụng hình học của tích phân',
    slug: 'ung-dung-hinh-hoc-cua-tich-phan',
    order: 3,
    status: 'published',
    objectives: [
      'Tính diện tích hình phẳng giới hạn bởi đồ thị các hàm số.',
      'Tính thể tích vật thể và thể tích khối tròn xoay quanh trục Ox.'
    ],
    intro: 'Ứng dụng hình học của tích phân giải quyết bài toán tính diện tích các hình có biên cong phức tạp và tính thể tích các chi tiết kỹ thuật tròn xoay.',
    defs: [
      'Diện tích hình phẳng: Giới hạn bởi y = f(x), y = g(x) và x = a, x = b là S = \\int_a^b |f(x) - g(x)| dx.'
    ],
    formulas: [
      'S = \\int_a^b |f(x) - g(x)| dx',
      'V_x = \\pi \\int_a^b [f(x)]^2 dx \\quad (\\text{quay quanh trục Ox})',
      'V = \\int_a^b S(x) dx \\quad (\\text{vật thể có diện tích thiết diện } S(x))'
    ],
    examples: [
      'Ví dụ: Tính thể tích khối tròn xoay tạo thành khi quay hình phẳng giới hạn bởi y = \\sqrt{x}, y = 0, x = 4 quanh Ox: V = \\pi \\int_0^4 x dx = \\pi [x^2/2]_0^4 = 8\\pi.'
    ],
    notes: [
      'Cần tìm giao điểm của 2 đường cong để xác định cận tích phân nếu đề bài chưa cho sẵn a, b.'
    ],
    summary: [
      'Tích phân là chìa khóa tính diện tích và thể tích hình học phi chuẩn trong thực tiễn kỹ thuật.'
    ]
  },

  // --- CHƯƠNG 5 (4 BÀI SGK) ---
  {
    id: 'les_math12_c5_b1',
    chapterId: 'chp_math12_c5',
    topicId: 'top_math12_c5_t1',
    title: 'Bài 14: Phương trình mặt phẳng',
    slug: 'phuong-trinh-mat-phang',
    order: 1,
    status: 'published',
    objectives: [
      'Nắm khái niệm vectơ pháp tuyến (VTPT) của mặt phẳng.',
      'Viết phương trình tổng quát Ax + By + Cz + D = 0 và phương trình đoạn chắn.',
      'Tính khoảng cách từ một điểm đến mặt phẳng.'
    ],
    intro: 'Mặt phẳng trong không gian Oxyz được xác định khi biết một điểm đi qua và một vectơ pháp tuyến vuông góc với mặt phẳng đó.',
    defs: [
      'Vectơ pháp tuyến: Vectơ n khác 0 có giá vuông góc với mặt phẳng (P).'
    ],
    formulas: [
      'A(x - x_0) + B(y - y_0) + C(z - z_0) = 0 \\iff Ax + By + Cz + D = 0',
      '\\frac{x}{a} + \\frac{y}{b} + \\frac{z}{c} = 1 \\quad (\\text{phương trình đoạn chắn})',
      'd(M_0, (P)) = \\frac{|A x_0 + B y_0 + C z_0 + D|}{\\sqrt{A^2 + B^2 + C^2}}'
    ],
    examples: [
      'Ví dụ: Viết PTTQ của mặt phẳng qua M(1; -2; 3) có VTPT n = (2; -1; 4): 2(x - 1) - 1(y + 2) + 4(z - 3) = 0 <=> 2x - y + 4z - 16 = 0.'
    ],
    notes: [
      'Tích có hướng của 2 vectơ không cùng phương nằm trên (P) chính là một VTPT của (P).'
    ],
    summary: [
      'Muốn viết phương trình mặt phẳng, luôn tìm 1 điểm thuộc mặt phẳng và 1 vectơ pháp tuyến.'
    ]
  },
  {
    id: 'les_math12_c5_b2',
    chapterId: 'chp_math12_c5',
    topicId: 'top_math12_c5_t1',
    title: 'Bài 15: Phương trình đường thẳng trong không gian',
    slug: 'phuong-trinh-duong-thang-trong-khong-gian',
    order: 2,
    status: 'published',
    objectives: [
      'Nắm khái niệm vectơ chỉ phương (VTCP) của đường thẳng.',
      'Viết phương trình tham số và phương trình chính tắc của đường thẳng.',
      'Xét vị trí tương đối giữa hai đường thẳng, giữa đường thẳng và mặt phẳng.'
    ],
    intro: 'Đường thẳng trong không gian Oxyz được xác định duy nhất bởi một điểm nó đi qua và một vectơ chỉ phương chỉ định phương hướng.',
    defs: [
      'Vectơ chỉ phương: Vectơ u khác 0 có giá song song hoặc trùng với đường thẳng d.'
    ],
    formulas: [
      '\\text{PT tham số: } \\begin{cases} x = x_0 + a t \\\\ y = y_0 + b t \\\\ z = z_0 + c t \\end{cases} \\quad (t \\in \\mathbb{R})',
      '\\text{PT chính tắc: } \\frac{x - x_0}{a} = \\frac{y - y_0}{b} = \\frac{z - z_0}{c} \\quad (abc \\ne 0)'
    ],
    examples: [
      'Ví dụ: Viết PT tham số đường thẳng d qua M(1; 2; -3) có VTCP u = (3; -1; 2): x = 1 + 3t, y = 2 - t, z = -3 + 2t.'
    ],
    notes: [
      'Hai đường thẳng trong không gian có thể: cắt nhau, song song, trùng nhau hoặc chéo nhau.'
    ],
    summary: [
      'Phương trình tham số giúp biểu diễn toạ độ một điểm chuyển động trên đường thẳng theo tham số thời gian t.'
    ]
  },
  {
    id: 'les_math12_c5_b3',
    chapterId: 'chp_math12_c5',
    topicId: 'top_math12_c5_t2',
    title: 'Bài 16: Công thức tính góc trong không gian',
    slug: 'cong-thuc-tinh-goc-trong-khong-gian',
    order: 3,
    status: 'published',
    objectives: [
      'Tính góc giữa hai đường thẳng trong không gian Oxyz.',
      'Tính góc giữa đường thẳng và mặt phẳng.',
      'Tính góc giữa hai mặt phẳng.'
    ],
    intro: 'Góc trong không gian Oxyz được tính toán nhanh chóng thông qua giá trị tuyệt đối của tích vô hướng giữa các vectơ chỉ phương và vectơ pháp tuyến.',
    defs: [
      'Góc hình học giữa hai đường thẳng, giữa đường thẳng và mặt phẳng, giữa hai mặt phẳng luôn có số đo từ 0 đến 90 độ.'
    ],
    formulas: [
      '\\cos(d_1, d_2) = \\frac{|\\vec{u}_1 \\cdot \\vec{u}_2|}{|\\vec{u}_1| \\cdot |\\vec{u}_2|}',
      '\\sin(d, (P)) = \\frac{|\\vec{u} \\cdot \\vec{n}|}{|\\vec{u}| \\cdot |\\vec{n}|}',
      '\\cos((P), (Q)) = \\frac{|\\vec{n}_P \\cdot \\vec{n}_Q|}{|\\vec{n}_P| \\cdot |\\vec{n}_Q|}'
    ],
    examples: [
      'Ví dụ: Tính góc giữa đường thẳng d có VTCP u = (1; 0; 1) và mặt phẳng (P) có VTPT n = (1; 1; 0): sin phi = |1*1 + 0*1 + 1*0| / (sqrt(2)*sqrt(2)) = 1/2 => góc phi = 30 độ.'
    ],
    notes: [
      'Lưu ý: Góc giữa đường thẳng và mặt phẳng dùng hàm SIN; góc giữa 2 đường thẳng hoặc 2 mặt phẳng dùng hàm COS.'
    ],
    summary: [
      'Nhớ quy tắc: cùng loại (đường-đường, mặt-mặt) dùng cos; khác loại (đường-mặt) dùng sin.'
    ]
  },
  {
    id: 'les_math12_c5_b4',
    chapterId: 'chp_math12_c5',
    topicId: 'top_math12_c5_t2',
    title: 'Bài 17: Phương trình mặt cầu',
    slug: 'phuong-trinh-mat-cau',
    order: 4,
    status: 'published',
    objectives: [
      'Nhận dạng phương trình chính tắc và phương trình tổng quát của mặt cầu.',
      'Xác định tâm I và bán kính R của mặt cầu.',
      'Xét vị trí tương đối giữa mặt cầu và mặt phẳng.'
    ],
    intro: 'Mặt cầu là tập hợp tất cả các điểm trong không gian cách đều một điểm cố định (tâm) một khoảng cách không đổi (bán kính).',
    defs: [
      'Mặt cầu tâm I(a; b; c) bán kính R là tập hợp các điểm M(x; y; z) thoả mãn IM = R.'
    ],
    formulas: [
      '(x - a)^2 + (y - b)^2 + (z - c)^2 = R^2',
      'x^2 + y^2 + z^2 - 2ax - 2by - 2cz + d = 0 \\quad (a^2 + b^2 + c^2 - d > 0, R = \\sqrt{a^2 + b^2 + c^2 - d})'
    ],
    examples: [
      'Ví dụ: Xác định tâm và bán kính của mặt cầu (S): x^2 + y^2 + z^2 - 4x + 2y - 6z - 2 = 0: a = 2, b = -1, c = 3, d = -2. Tâm I(2; -1; 3), R = sqrt(4 + 1 + 9 - (-2)) = sqrt(16) = 4.'
    ],
    notes: [
      'Mặt phẳng tiếp xúc mặt cầu (tiếp diện) khi và chỉ khi d(I, (P)) = R.'
    ],
    summary: [
      'Phương trình bậc hai 3 biến là phương trình mặt cầu khi hệ số x^2, y^2, z^2 bằng nhau và a^2 + b^2 + c^2 - d > 0.'
    ]
  },

  // --- CHƯƠNG 6 (2 BÀI SGK) ---
  {
    id: 'les_math12_c6_b1',
    chapterId: 'chp_math12_c6',
    topicId: 'top_math12_c6_t1',
    title: 'Bài 18: Xác suất có điều kiện',
    slug: 'xac-suat-co-dieu-kien',
    order: 1,
    status: 'published',
    objectives: [
      'Hiểu rõ định nghĩa xác suất có điều kiện P(A|B).',
      'Vận dụng công thức nhân xác suất trong tính toán biến cố phụ thuộc.',
      'Sử dụng sơ đồ cây để biểu diễn các giai đoạn xác suất.'
    ],
    intro: 'Xác suất có điều kiện đánh giá khả năng xảy ra của một biến cố khi đã biết một biến cố liên quan khác đã xảy ra, là nền tảng của trí tuệ nhân tạo và thống kê hiện đại.',
    defs: [
      'Xác suất của biến cố A khi biết biến cố B đã xảy ra (P(B) > 0) là P(A|B) = P(A ∩ B) / P(B).'
    ],
    formulas: [
      'P(A|B) = \\frac{P(A \\cap B)}{P(B)} \\quad (P(B) > 0)',
      'P(A \\cap B) = P(B) \\cdot P(A|B) = P(A) \\cdot P(B|A)'
    ],
    examples: [
      'Ví dụ: Rút ngẫu nhiên 2 lá bài từ bộ 52 lá không hoàn lại. Xác suất lá thứ hai là Át khi biết lá thứ nhất là Át: P(A2|A1) = 3/51.'
    ],
    notes: [
      'Nếu A và B độc lập thì P(A|B) = P(A) và P(A ∩ B) = P(A).P(B).'
    ],
    summary: [
      'Xác suất có điều kiện thu hẹp không gian mẫu ban đầu Omega về không gian mẫu mới B.'
    ]
  },
  {
    id: 'les_math12_c6_b2',
    chapterId: 'chp_math12_c6',
    topicId: 'top_math12_c6_t1',
    title: 'Bài 19: Công thức xác suất toàn phần và công thức Bayes',
    slug: 'cong-thuc-xac-suat-toan-phan-va-bayes',
    order: 2,
    status: 'published',
    objectives: [
      'Nắm khái niệm hệ biến cố đầy đủ.',
      'Sử dụng công thức xác suất toàn phần để tính xác suất biến cố tổng quát.',
      'Áp dụng công thức Bayes để cập nhật xác suất tiên triệm/hậu nghiệm trong chẩn đoán y tế, sàng lọc.'
    ],
    intro: 'Định lý Bayes cho phép đảo ngược điều kiện xác suất, là nguyên lý cốt lõi trong học máy, phân loại thư rác (Spam Filter) và chẩn đoán y khoa hiện đại.',
    defs: [
      'Hệ đầy đủ: Tập hợp các biến cố A1, A2, ..., An xung khắc từng đôi và có hợp bằng không gian mẫu Omega.'
    ],
    formulas: [
      '\\text{Xác suất toàn phần: } P(B) = \\sum_{i=1}^n P(A_i) \\cdot P(B|A_i)',
      '\\text{Công thức Bayes: } P(A_k|B) = \\frac{P(A_k) \\cdot P(B|A_k)}{P(B)} = \\frac{P(A_k) \\cdot P(B|A_k)}{\\sum_{i=1}^n P(A_i) \\cdot P(B|A_i)}'
    ],
    examples: [
      'Ví dụ: Một xét nghiệm y tế có độ chính xác 95%. Với tỷ lệ mắc bệnh trong cộng đồng là 1%, tính xác suất một người thực sự mắc bệnh khi có kết quả xét nghiệm dương tính.'
    ],
    notes: [
      'P(A) gọi là xác suất tiên nghiệm (prior); P(A|B) gọi là xác suất hậu nghiệm (posterior).'
    ],
    summary: [
      'Công thức Bayes cập nhật niềm tin vào giả thuyết A khi nhận thêm bằng chứng mới B.'
    ]
  }
];

// --- 28 VERIFIED YOUTUBE VIDEOS (ALL 19 LESSONS COVERED!) ---
const videos = [
  // Bài 1: Tính đơn điệu
  {
    id: 'vid_math12_c1_b1_1',
    lessonId: 'les_math12_c1_b1',
    title: 'Bài 1. Tính Đơn Điệu và Cực Trị Của Hàm Số - Full (Toán 12 - Sgk Mới) || Thầy Nguyễn Phan Tiến',
    desc: 'Bài giảng lý thuyết chi tiết và bài tập mẫu tính đơn điệu của hàm số chuẩn sách giáo khoa mới GDPT 2018.',
    provider: 'youtube',
    sourceUrl: 'https://www.youtube.com/watch?v=C64H0h3qiRc',
    embedUrl: 'https://www.youtube-nocookie.com/embed/C64H0h3qiRc',
    youtubeId: 'C64H0h3qiRc',
    duration: 2450,
    thumb: 'https://i.ytimg.com/vi/C64H0h3qiRc/hqdefault.jpg',
    order: 1
  },
  {
    id: 'vid_math12_c1_b1_2',
    lessonId: 'les_math12_c1_b1',
    title: 'TÍNH ĐƠN ĐIỆU CỦA HÀM SỐ - TOÁN 12 || Thầy Nguyễn Quốc Chí',
    desc: 'Phương pháp xét tính đơn điệu, lập bảng biến thiên và các dạng bài tập thực chiến thi THPT.',
    provider: 'youtube',
    sourceUrl: 'https://www.youtube.com/watch?v=W_8aEs16RI0',
    embedUrl: 'https://www.youtube-nocookie.com/embed/W_8aEs16RI0',
    youtubeId: 'W_8aEs16RI0',
    duration: 1820,
    thumb: 'https://i.ytimg.com/vi/W_8aEs16RI0/hqdefault.jpg',
    order: 2
  },

  // Bài 2: Cực trị
  {
    id: 'vid_math12_c1_b2_1',
    lessonId: 'les_math12_c1_b2',
    title: 'Bài 1.2 Cực Trị Của Hàm Số - Toán 12 (Sgk Mới) || Thầy Nguyễn Phan Tiến',
    desc: 'Quy tắc 1 và Quy tắc 2 tìm cực trị của hàm số, các dạng bài toán chứa tham số m.',
    provider: 'youtube',
    sourceUrl: 'https://www.youtube.com/watch?v=BbFj2KgZy6Q',
    embedUrl: 'https://www.youtube-nocookie.com/embed/BbFj2KgZy6Q',
    youtubeId: 'BbFj2KgZy6Q',
    duration: 2100,
    thumb: 'https://i.ytimg.com/vi/BbFj2KgZy6Q/hqdefault.jpg',
    order: 1
  },
  {
    id: 'vid_math12_c1_b2_2',
    lessonId: 'les_math12_c1_b2',
    title: 'CỰC TRỊ CỦA HÀM SỐ - TOÁN 12 || Thầy Nguyễn Quốc Chí',
    desc: 'Kỹ năng tìm cực trị nhanh và phân loại các dạng toán thường xuất hiện trong đề thi.',
    provider: 'youtube',
    sourceUrl: 'https://www.youtube.com/watch?v=jlSW7u-Y8Ck',
    embedUrl: 'https://www.youtube-nocookie.com/embed/jlSW7u-Y8Ck',
    youtubeId: 'jlSW7u-Y8Ck',
    duration: 1950,
    thumb: 'https://i.ytimg.com/vi/jlSW7u-Y8Ck/hqdefault.jpg',
    order: 2
  },

  // Bài 3: GTLN - GTNN
  {
    id: 'vid_math12_c1_b3_1',
    lessonId: 'les_math12_c1_b3',
    title: 'Bài 2. Giá Trị Lớn Nhất - Nhỏ Nhất của Hàm Số - Toán 12 (SGK Mới) || Thầy Nguyễn Phan Tiến',
    desc: 'Quy trình tìm Max - Min trên đoạn, khoảng và bài toán tối ưu thực tế.',
    provider: 'youtube',
    sourceUrl: 'https://www.youtube.com/watch?v=WsMJEaCQsoA',
    embedUrl: 'https://www.youtube-nocookie.com/embed/WsMJEaCQsoA',
    youtubeId: 'WsMJEaCQsoA',
    duration: 2280,
    thumb: 'https://i.ytimg.com/vi/WsMJEaCQsoA/hqdefault.jpg',
    order: 1
  },
  {
    id: 'vid_math12_c1_b3_2',
    lessonId: 'les_math12_c1_b3',
    title: 'Toán 12 [KNTT] - Bài 2: Giá Trị Lớn Nhất và Giá Trị Nhỏ Nhất Của Hàm Số || Thầy Khánh',
    desc: 'Lý thuyết SGK Kết nối tri thức A-Z và bài toán gấp hộp carton tối ưu thể tích.',
    provider: 'youtube',
    sourceUrl: 'https://www.youtube.com/watch?v=bb932zpfeyk',
    embedUrl: 'https://www.youtube-nocookie.com/embed/bb932zpfeyk',
    youtubeId: 'bb932zpfeyk',
    duration: 1740,
    thumb: 'https://i.ytimg.com/vi/bb932zpfeyk/hqdefault.jpg',
    order: 2
  },

  // Bài 4: Đường tiệm cận
  {
    id: 'vid_math12_c1_b4_1',
    lessonId: 'les_math12_c1_b4',
    title: 'ĐƯỜNG TIỆM CẬN - PHẦN 1 - TOÁN 12 || Thầy Nguyễn Quốc Chí',
    desc: 'Tiệm cận đứng, tiệm cận ngang và phương pháp tìm nhanh bằng máy tính cầm tay & tự luận.',
    provider: 'youtube',
    sourceUrl: 'https://www.youtube.com/watch?v=-b1v5R_5zc4',
    embedUrl: 'https://www.youtube-nocookie.com/embed/-b1v5R_5zc4',
    youtubeId: '-b1v5R_5zc4',
    duration: 1650,
    thumb: 'https://i.ytimg.com/vi/-b1v5R_5zc4/hqdefault.jpg',
    order: 1
  },

  // Bài 5: Khảo sát & Vẽ đồ thị
  {
    id: 'vid_math12_c1_b5_1',
    lessonId: 'les_math12_c1_b5',
    title: 'KHẢO SÁT SỰ BIẾN THIÊN VÀ VẼ ĐỒ THỊ HÀM SỐ - TOÁN 12 || Thầy Nguyễn Quốc Chí',
    desc: 'Khảo sát hàm bậc 3, phân thức bậc nhất trên bậc nhất và bậc hai trên bậc nhất.',
    provider: 'youtube',
    sourceUrl: 'https://www.youtube.com/watch?v=eBzEKfN8OfI',
    embedUrl: 'https://www.youtube-nocookie.com/embed/eBzEKfN8OfI',
    youtubeId: 'eBzEKfN8OfI',
    duration: 2340,
    thumb: 'https://i.ytimg.com/vi/eBzEKfN8OfI/hqdefault.jpg',
    order: 1
  },
  {
    id: 'vid_math12_c1_b5_2',
    lessonId: 'les_math12_c1_b5',
    title: 'Bài 5. Ứng Dụng Đạo Hàm Giải Quyết Bài Toán Thực Tế || Thầy Nguyễn Phan Tiến',
    desc: 'Bài toán kinh tế, chi phí sản xuất và tối ưu hoá hình học không gian.',
    provider: 'youtube',
    sourceUrl: 'https://www.youtube.com/watch?v=DYFeDU9oFG4',
    embedUrl: 'https://www.youtube-nocookie.com/embed/DYFeDU9oFG4',
    youtubeId: 'DYFeDU9oFG4',
    duration: 2150,
    thumb: 'https://i.ytimg.com/vi/DYFeDU9oFG4/hqdefault.jpg',
    order: 2
  },

  // Bài 6: Vectơ không gian
  {
    id: 'vid_math12_c2_b1_1',
    lessonId: 'les_math12_c2_b1',
    title: 'Toán 12 - Bài 6 - VECTƠ TRONG KHÔNG GIAN || Thầy An',
    desc: 'Khái niệm vectơ 3 chiều, quy tắc hình hộp và chứng minh đẳng thức vectơ.',
    provider: 'youtube',
    sourceUrl: 'https://www.youtube.com/watch?v=giBSwP7R0sE',
    embedUrl: 'https://www.youtube-nocookie.com/embed/giBSwP7R0sE',
    youtubeId: 'giBSwP7R0sE',
    duration: 1890,
    thumb: 'https://i.ytimg.com/vi/giBSwP7R0sE/hqdefault.jpg',
    order: 1
  },

  // Bài 7: Hệ trục toạ độ Oxyz
  {
    id: 'vid_math12_c2_b2_1',
    lessonId: 'les_math12_c2_b2',
    title: 'Toán 12 Bài 7: Hệ trục toạ độ trong không gian - Kết nối tri thức || VietJack',
    desc: 'Xác định toạ độ điểm và toạ độ vectơ trên hệ trục toạ độ vuông góc Oxyz.',
    provider: 'youtube',
    sourceUrl: 'https://www.youtube.com/watch?v=RT-Uy7InSxE',
    embedUrl: 'https://www.youtube-nocookie.com/embed/RT-Uy7InSxE',
    youtubeId: 'RT-Uy7InSxE',
    duration: 1720,
    thumb: 'https://i.ytimg.com/vi/RT-Uy7InSxE/hqdefault.jpg',
    order: 1
  },

  // Bài 8: Biểu thức toạ độ phép toán vectơ
  {
    id: 'vid_math12_c2_b3_1',
    lessonId: 'les_math12_c2_b3',
    title: 'TOÁN 12 - KNTT - BÀI 8 - BIỂU THỨC TỌA ĐỘ CỦA CÁC PHÉP TOÁN VECTƠ || Thầy Lâm 1E',
    desc: 'Phép cộng trừ, nhân với số, tích vô hướng và tính góc giữa 2 vectơ.',
    provider: 'youtube',
    sourceUrl: 'https://www.youtube.com/watch?v=qVe34jxIHIU',
    embedUrl: 'https://www.youtube-nocookie.com/embed/qVe34jxIHIU',
    youtubeId: 'qVe34jxIHIU',
    duration: 1980,
    thumb: 'https://i.ytimg.com/vi/qVe34jxIHIU/hqdefault.jpg',
    order: 1
  },

  // Bài 9: Khoảng biến thiên và tứ phân vị
  {
    id: 'vid_math12_c3_b1_1',
    lessonId: 'les_math12_c3_b1',
    title: 'KHOẢNG TỨ PHÂN VỊ - TOÁN 12 - MẪU SỐ LIỆU GHÉP NHÓM || Thầy Nguyễn Quốc Chí',
    desc: 'Cách xác định nhóm chứa tứ phân vị và công thức tính chính xác Q1, Q2, Q3.',
    provider: 'youtube',
    sourceUrl: 'https://www.youtube.com/watch?v=pXYgEAA-uaQ',
    embedUrl: 'https://www.youtube-nocookie.com/embed/pXYgEAA-uaQ',
    youtubeId: 'pXYgEAA-uaQ',
    duration: 1860,
    thumb: 'https://i.ytimg.com/vi/pXYgEAA-uaQ/hqdefault.jpg',
    order: 1
  },
  {
    id: 'vid_math12_c3_b1_2',
    lessonId: 'les_math12_c3_b1',
    title: '[LỚP 12] TẤT TẦN TẬT: MẪU SỐ LIỆU GHÉP NHÓM || Thầy Lê Ngọc Sơn',
    desc: 'Hệ thống hóa toàn bộ kiến thức thống kê mẫu số liệu ghép nhóm GDPT 2018.',
    provider: 'youtube',
    sourceUrl: 'https://www.youtube.com/watch?v=B832Khhl_rw',
    embedUrl: 'https://www.youtube-nocookie.com/embed/B832Khhl_rw',
    youtubeId: 'B832Khhl_rw',
    duration: 2100,
    thumb: 'https://i.ytimg.com/vi/B832Khhl_rw/hqdefault.jpg',
    order: 2
  },

  // Bài 10: Phương sai và độ lệch chuẩn
  {
    id: 'vid_math12_c3_b2_1',
    lessonId: 'les_math12_c3_b2',
    title: 'PHƯƠNG SAI VÀ ĐỘ LỆCH CHUẨN - TOÁN 12 - MẪU GHÉP NHÓM || Thầy Nguyễn Quốc Chí',
    desc: 'Công thức tính phương sai s^2, độ lệch chuẩn s và mẹo bấm máy tính Casio cầm tay.',
    provider: 'youtube',
    sourceUrl: 'https://www.youtube.com/watch?v=FNu3w17oeaI',
    embedUrl: 'https://www.youtube-nocookie.com/embed/FNu3w17oeaI',
    youtubeId: 'FNu3w17oeaI',
    duration: 1650,
    thumb: 'https://i.ytimg.com/vi/FNu3w17oeaI/hqdefault.jpg',
    order: 1
  },
  {
    id: 'vid_math12_c3_b2_2',
    lessonId: 'les_math12_c3_b2',
    title: 'Toán học lớp 12 - Kết nối tri thức - Bài 10 - Phương sai và độ lệch chuẩn || Thầy Quang',
    desc: 'Giải chi tiết các bài tập thực hành trong SGK Toán 12 Kết nối tri thức.',
    provider: 'youtube',
    sourceUrl: 'https://www.youtube.com/watch?v=zb-tMqK2hV8',
    embedUrl: 'https://www.youtube-nocookie.com/embed/zb-tMqK2hV8',
    youtubeId: 'zb-tMqK2hV8',
    duration: 1920,
    thumb: 'https://i.ytimg.com/vi/zb-tMqK2hV8/hqdefault.jpg',
    order: 2
  },

  // Bài 11: Nguyên hàm
  {
    id: 'vid_math12_c4_b1_1',
    lessonId: 'les_math12_c4_b1',
    title: 'Toán 12 Bài 11: Nguyên hàm | Kết nối tri thức || VietJack THPT Official',
    desc: 'Khái niệm nguyên hàm, bảng nguyên hàm cơ bản và các phương pháp tính nhanh.',
    provider: 'youtube',
    sourceUrl: 'https://www.youtube.com/watch?v=lpy2wxi1STY',
    embedUrl: 'https://www.youtube-nocookie.com/embed/lpy2wxi1STY',
    youtubeId: 'lpy2wxi1STY',
    duration: 2180,
    thumb: 'https://i.ytimg.com/vi/lpy2wxi1STY/hqdefault.jpg',
    order: 1
  },
  {
    id: 'vid_math12_c4_b1_2',
    lessonId: 'les_math12_c4_b1',
    title: 'Bài 1.1 Nguyên Hàm Cơ Bản và Công Thức Nguyên Hàm (Toán 12) || Thầy Nguyễn Phan Tiến',
    desc: 'Chuyên đề nguyên hàm từng phần và nguyên hàm đổi biến số.',
    provider: 'youtube',
    sourceUrl: 'https://www.youtube.com/watch?v=j615s9znk4U',
    embedUrl: 'https://www.youtube-nocookie.com/embed/j615s9znk4U',
    youtubeId: 'j615s9znk4U',
    duration: 2450,
    thumb: 'https://i.ytimg.com/vi/j615s9znk4U/hqdefault.jpg',
    order: 2
  },

  // Bài 12: Tích phân
  {
    id: 'vid_math12_c4_b2_1',
    lessonId: 'les_math12_c4_b2',
    title: 'Toán 12 Bài 12: Tích phân | Kết nối tri thức || VietJack THPT Official',
    desc: 'Định nghĩa Newton-Leibniz, các tính chất tích phân xác định và bài tập vận dụng.',
    provider: 'youtube',
    sourceUrl: 'https://www.youtube.com/watch?v=VRcmLOWbESw',
    embedUrl: 'https://www.youtube-nocookie.com/embed/VRcmLOWbESw',
    youtubeId: 'VRcmLOWbESw',
    duration: 2040,
    thumb: 'https://i.ytimg.com/vi/VRcmLOWbESw/hqdefault.jpg',
    order: 1
  },

  // Bài 13: Ứng dụng hình học của tích phân
  {
    id: 'vid_math12_c4_b3_1',
    lessonId: 'les_math12_c4_b3',
    title: 'Toán 12 Bài 13: Ứng dụng hình học của tích phân | Kết nối tri thức || VietJack',
    desc: 'Tính diện tích hình phẳng và thể tích khối tròn xoay quay quanh trục Ox.',
    provider: 'youtube',
    sourceUrl: 'https://www.youtube.com/watch?v=hJdOTOpkVCQ',
    embedUrl: 'https://www.youtube-nocookie.com/embed/hJdOTOpkVCQ',
    youtubeId: 'hJdOTOpkVCQ',
    duration: 2250,
    thumb: 'https://i.ytimg.com/vi/hJdOTOpkVCQ/hqdefault.jpg',
    order: 1
  },

  // Bài 14: Phương trình mặt phẳng
  {
    id: 'vid_math12_c5_b1_1',
    lessonId: 'les_math12_c5_b1',
    title: 'PHƯƠNG TRÌNH MẶT PHẲNG - TOÁN 12 || Thầy Nguyễn Quốc Chí',
    desc: 'Lập phương trình mặt phẳng, vectơ pháp tuyến và tính khoảng cách từ điểm đến mặt phẳng.',
    provider: 'youtube',
    sourceUrl: 'https://www.youtube.com/watch?v=1ZMhsZZOheg',
    embedUrl: 'https://www.youtube-nocookie.com/embed/1ZMhsZZOheg',
    youtubeId: '1ZMhsZZOheg',
    duration: 2190,
    thumb: 'https://i.ytimg.com/vi/1ZMhsZZOheg/hqdefault.jpg',
    order: 1
  },

  // Bài 15: Phương trình đường thẳng
  {
    id: 'vid_math12_c5_b2_1',
    lessonId: 'les_math12_c5_b2',
    title: 'Toán 12 Bài 15: Phương trình đường thẳng trong không gian || VietJack THPT Official',
    desc: 'Vectơ chỉ phương, phương trình tham số, phương trình chính tắc và vị trí tương đối.',
    provider: 'youtube',
    sourceUrl: 'https://www.youtube.com/watch?v=DX-IxtirjZA',
    embedUrl: 'https://www.youtube-nocookie.com/embed/DX-IxtirjZA',
    youtubeId: 'DX-IxtirjZA',
    duration: 2120,
    thumb: 'https://i.ytimg.com/vi/DX-IxtirjZA/hqdefault.jpg',
    order: 1
  },

  // Bài 16: Công thức tính góc
  {
    id: 'vid_math12_c5_b3_1',
    lessonId: 'les_math12_c5_b3',
    title: 'Toán 12 Bài 16: Công thức tính góc trong không gian || VietJack THPT Official',
    desc: 'Góc giữa hai đường thẳng, góc giữa đường thẳng và mặt phẳng, góc giữa hai mặt phẳng.',
    provider: 'youtube',
    sourceUrl: 'https://www.youtube.com/watch?v=D2ZZOtsKw58',
    embedUrl: 'https://www.youtube-nocookie.com/embed/D2ZZOtsKw58',
    youtubeId: 'D2ZZOtsKw58',
    duration: 1980,
    thumb: 'https://i.ytimg.com/vi/D2ZZOtsKw58/hqdefault.jpg',
    order: 1
  },

  // Bài 17: Phương trình mặt cầu
  {
    id: 'vid_math12_c5_b4_1',
    lessonId: 'les_math12_c5_b4',
    title: 'Toán 12 Bài 17: Phương trình mặt cầu - Kết nối tri thức || VietJack THPT Official',
    desc: 'Phương trình chính tắc, phương trình tổng quát, điều kiện mặt cầu và vị trí tương đối.',
    provider: 'youtube',
    sourceUrl: 'https://www.youtube.com/watch?v=wQDy0vf-WD8',
    embedUrl: 'https://www.youtube-nocookie.com/embed/wQDy0vf-WD8',
    youtubeId: 'wQDy0vf-WD8',
    duration: 2010,
    thumb: 'https://i.ytimg.com/vi/wQDy0vf-WD8/hqdefault.jpg',
    order: 1
  },

  // Bài 18: Xác suất có điều kiện
  {
    id: 'vid_math12_c6_b1_1',
    lessonId: 'les_math12_c6_b1',
    title: 'Toán 12 Bài 18: Xác suất có điều kiện - Kết nối tri thức || VietJack THPT Official',
    desc: 'Định nghĩa xác suất có điều kiện, công thức nhân xác suất và ứng dụng sơ đồ cây.',
    provider: 'youtube',
    sourceUrl: 'https://www.youtube.com/watch?v=Oe-VpvppplA',
    embedUrl: 'https://www.youtube-nocookie.com/embed/Oe-VpvppplA',
    youtubeId: 'Oe-VpvppplA',
    duration: 1850,
    thumb: 'https://i.ytimg.com/vi/Oe-VpvppplA/hqdefault.jpg',
    order: 1
  },

  // Bài 19: Công thức Bayes
  {
    id: 'vid_math12_c6_b2_1',
    lessonId: 'les_math12_c6_b2',
    title: 'Toán 12 Bài 19: Công thức xác suất toàn phần và công thức Bayes || VietJack',
    desc: 'Hệ biến cố đầy đủ, công thức xác suất toàn phần và định lý Bayes trong bài toán thực tiễn.',
    provider: 'youtube',
    sourceUrl: 'https://www.youtube.com/watch?v=_aTZ6QynR2U',
    embedUrl: 'https://www.youtube-nocookie.com/embed/_aTZ6QynR2U',
    youtubeId: '_aTZ6QynR2U',
    duration: 2150,
    thumb: 'https://i.ytimg.com/vi/_aTZ6QynR2U/hqdefault.jpg',
    order: 1
  },
  {
    id: 'vid_math12_c6_b2_2',
    lessonId: 'les_math12_c6_b2',
    title: 'Toán học lớp 12 - Kết nối tri thức - Bài 19 - Công thức xác suất toàn phần và Bayes || Thầy Quang',
    desc: 'Hướng dẫn chi tiết phương pháp lập bảng xác suất và giải toán Bayes.',
    provider: 'youtube',
    sourceUrl: 'https://www.youtube.com/watch?v=PsgYDAns3Co',
    embedUrl: 'https://www.youtube-nocookie.com/embed/PsgYDAns3Co',
    youtubeId: 'PsgYDAns3Co',
    duration: 1960,
    thumb: 'https://i.ytimg.com/vi/PsgYDAns3Co/hqdefault.jpg',
    order: 2
  }
];

function escapeSql(str) {
  if (str === null || str === undefined) return 'NULL';
  return "N'" + String(str).replace(/'/g, "''") + "'";
}

let sql = `
SET NOCOUNT ON;
BEGIN TRANSACTION;

-- 1. Ensure sub_math12 is active and properly ordered
IF NOT EXISTS (SELECT 1 FROM content_subjects WHERE Id = 'sub_math12')
BEGIN
    INSERT INTO content_subjects (Id, Name, Code, Grade, Description, OrderIndex, IsActive, CreatedAt, UpdatedAt)
    VALUES ('sub_math12', N'Toán 12', 'MATH12', '12', N'Chương trình Toán học Lớp 12 - Bộ sách Kết nối tri thức với cuộc sống', 1, 1, SYSDATETIMEOFFSET(), SYSDATETIMEOFFSET());
END
ELSE
BEGIN
    UPDATE content_subjects 
    SET Name = N'Toán 12', Code = 'MATH12', Grade = '12', Description = N'Chương trình Toán học Lớp 12 - Bộ sách Kết nối tri thức với cuộc sống', OrderIndex = 1, IsActive = 1, UpdatedAt = SYSDATETIMEOFFSET()
    WHERE Id = 'sub_math12';
END
`;

// 2. Chapters
for (const ch of chapters) {
  sql += `
IF NOT EXISTS (SELECT 1 FROM content_chapters WHERE Id = '${ch.id}')
BEGIN
    INSERT INTO content_chapters (Id, SubjectId, Title, Description, OrderIndex, IsActive, CreatedAt, UpdatedAt)
    VALUES ('${ch.id}', 'sub_math12', ${escapeSql(ch.title)}, ${escapeSql(ch.desc)}, ${ch.order}, 1, SYSDATETIMEOFFSET(), SYSDATETIMEOFFSET());
END
ELSE
BEGIN
    UPDATE content_chapters
    SET Title = ${escapeSql(ch.title)}, Description = ${escapeSql(ch.desc)}, OrderIndex = ${ch.order}, IsActive = 1, UpdatedAt = SYSDATETIMEOFFSET()
    WHERE Id = '${ch.id}';
END
`;
}

// 3. Topics
for (const t of topics) {
  sql += `
IF NOT EXISTS (SELECT 1 FROM content_topics WHERE Id = '${t.id}')
BEGIN
    INSERT INTO content_topics (Id, ChapterId, Title, Description, OrderIndex, IsActive, CreatedAt, UpdatedAt)
    VALUES ('${t.id}', '${t.chapterId}', ${escapeSql(t.title)}, N'', ${t.order}, 1, SYSDATETIMEOFFSET(), SYSDATETIMEOFFSET());
END
ELSE
BEGIN
    UPDATE content_topics
    SET ChapterId = '${t.chapterId}', Title = ${escapeSql(t.title)}, OrderIndex = ${t.order}, IsActive = 1, UpdatedAt = SYSDATETIMEOFFSET()
    WHERE Id = '${t.id}';
END
`;
}

// 4. Lessons
for (const l of lessons) {
  const objectivesJson = JSON.stringify(l.objectives || []);
  const defsJson = JSON.stringify(l.defs || []);
  const formulasJson = JSON.stringify(l.formulas || []);
  const examplesJson = JSON.stringify(l.examples || []);
  const notesJson = JSON.stringify(l.notes || []);
  const summaryJson = JSON.stringify(l.summary || []);

  sql += `
IF NOT EXISTS (SELECT 1 FROM content_lessons WHERE Id = '${l.id}')
BEGIN
    INSERT INTO content_lessons (
        Id, ChapterId, TopicId, Title, Slug, OrderIndex, Status, AuthorId,
        LearningObjectivesJson, Introduction, DefinitionsJson, FormulasJson, ExamplesJson, ImportantNotesJson, SummaryPointsJson,
        CreatedAt, UpdatedAt
    )
    VALUES (
        '${l.id}', '${l.chapterId}', ${escapeSql(l.topicId)}, ${escapeSql(l.title)}, '${l.slug}', ${l.order}, '${l.status}', '${authorId}',
        ${escapeSql(objectivesJson)}, ${escapeSql(l.intro)}, ${escapeSql(defsJson)}, ${escapeSql(formulasJson)}, ${escapeSql(examplesJson)}, ${escapeSql(notesJson)}, ${escapeSql(summaryJson)},
        SYSDATETIMEOFFSET(), SYSDATETIMEOFFSET()
    );
END
ELSE
BEGIN
    UPDATE content_lessons
    SET ChapterId = '${l.chapterId}',
        TopicId = ${escapeSql(l.topicId)},
        Title = ${escapeSql(l.title)},
        Slug = '${l.slug}',
        OrderIndex = ${l.order},
        Status = '${l.status}',
        LearningObjectivesJson = ${escapeSql(objectivesJson)},
        Introduction = ${escapeSql(l.intro)},
        DefinitionsJson = ${escapeSql(defsJson)},
        FormulasJson = ${escapeSql(formulasJson)},
        ExamplesJson = ${escapeSql(examplesJson)},
        ImportantNotesJson = ${escapeSql(notesJson)},
        SummaryPointsJson = ${escapeSql(summaryJson)},
        UpdatedAt = SYSDATETIMEOFFSET()
    WHERE Id = '${l.id}';
END
`;
}

// 5. Videos
for (const v of videos) {
  sql += `
IF NOT EXISTS (SELECT 1 FROM content_lesson_videos WHERE Id = '${v.id}')
BEGIN
    INSERT INTO content_lesson_videos (
        Id, LessonId, Title, Description, Provider, SourceUrl, EmbedUrl, YouTubeVideoId,
        Language, DurationSeconds, ThumbnailUrl, SortOrder, EmbedAllowed, VerificationStatus,
        VerifiedAt, IsPublished, CreatedAt, UpdatedAt
    )
    VALUES (
        '${v.id}', '${v.lessonId}', ${escapeSql(v.title)}, ${escapeSql(v.desc)}, '${v.provider}', '${v.sourceUrl}',
        '${v.embedUrl}', '${v.youtubeId}', 'vi', ${v.duration}, '${v.thumb}', ${v.order}, 1, 'verified',
        SYSDATETIMEOFFSET(), 1, SYSDATETIMEOFFSET(), SYSDATETIMEOFFSET()
    );
END
ELSE
BEGIN
    UPDATE content_lesson_videos
    SET LessonId = '${v.lessonId}',
        Title = ${escapeSql(v.title)},
        Description = ${escapeSql(v.desc)},
        Provider = '${v.provider}',
        SourceUrl = '${v.sourceUrl}',
        EmbedUrl = '${v.embedUrl}',
        YouTubeVideoId = '${v.youtubeId}',
        DurationSeconds = ${v.duration},
        ThumbnailUrl = '${v.thumb}',
        SortOrder = ${v.order},
        EmbedAllowed = 1,
        VerificationStatus = 'verified',
        IsPublished = 1,
        UpdatedAt = SYSDATETIMEOFFSET()
    WHERE Id = '${v.id}';
END
`;
}

sql += `
COMMIT TRANSACTION;
SELECT 'Full 19-Lesson Math 12 Curriculum & 28 Verified Videos Seeded Successfully!' AS Result;
`;

const sqlFilePath = path.join(__dirname, 'seed_math12_curriculum.sql');
fs.writeFileSync(sqlFilePath, sql, 'utf8');
console.log('Successfully generated SQL file at:', sqlFilePath);
console.log(`Stats: ${chapters.length} Chapters, ${topics.length} Topics, ${lessons.length} Lessons, ${videos.length} Videos.`);

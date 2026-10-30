import type { ChatConversation, SuggestedPrompt } from '@/types/aiTutor'

export interface SubjectOption {
  id: string
  name: string
}

export const SUBJECT_OPTIONS: SubjectOption[] = [
  { id: 'all', name: 'Không chọn môn' },
  { id: 'toan-12', name: 'Toán 12' },
  { id: 'vat-ly-12', name: 'Vật lý 12' },
  { id: 'hoa-hoc-12', name: 'Hóa học 12' },
  { id: 'tieng-anh', name: 'Tiếng Anh' },
]

export const mockSuggestedPrompts: (SuggestedPrompt & { subjectLabel?: string })[] = [
  {
    id: 'giai-thich-toan-12',
    title: 'Đạo hàm & Cực trị hàm số',
    subject: 'toan-12',
    subjectLabel: 'Toán 12',
    prompt: 'Giải thích cho mình vì sao đạo hàm f\'(x) = 0 tại các điểm cực trị của hàm số khả vi?',
    icon: '∑',
  },
  {
    id: 'quiz-vat-ly-12',
    title: 'Quiz Định luật Newton',
    subject: 'vat-ly-12',
    subjectLabel: 'Vật lý 12',
    prompt: 'Tạo giúp mình 3 câu hỏi trắc nghiệm kèm lời giải về các định luật chuyển động Newton.',
    icon: '⚛',
  },
  {
    id: 'tom-tat-ly-12',
    title: 'Tóm tắt Dao động điều hòa',
    subject: 'vat-ly-12',
    subjectLabel: 'Vật lý 12',
    prompt: 'Tóm tắt các công thức cốt lõi và các đại lượng đặc trưng của con lắc lò xo dao động điều hòa.',
    icon: '⚛',
  },
  {
    id: 'xac-suat-12',
    title: 'Giải bài Xác suất có điều kiện',
    subject: 'toan-12',
    subjectLabel: 'Toán 12',
    prompt: 'Hướng dẫn phương pháp tư duy và các bước giải dạng bài xác suất có điều kiện trong đề thi tốt nghiệp.',
    icon: '∑',
  },
  {
    id: 'english-grammar',
    title: 'Mệnh đề quan hệ Tiếng Anh',
    subject: 'tieng-anh',
    subjectLabel: 'Tiếng Anh',
    prompt: 'Phân biệt và cho ví dụ so sánh mệnh đề quan hệ xác định (defining) và không xác định (non-defining).',
    icon: 'A',
  },
]

export const SUGGESTED_PROMPTS = mockSuggestedPrompts

export const mockInitialConversations: ChatConversation[] = [
  {
    id: 'conv-001',
    title: 'Đạo hàm cực trị & tiếp tuyến',
    subject: 'toan-12',
    createdAt: '2026-10-17T08:30:00Z',
    updatedAt: '2026-10-17T08:35:00Z',
    messages: [
      {
        id: 'msg-1',
        role: 'user',
        content: 'Giải thích cho mình vì sao đạo hàm bằng 0 ở cực trị?',
        createdAt: '2026-10-17T08:30:00Z',
        status: 'done',
        subjectContext: 'Toán 12',
      },
      {
        id: 'msg-2',
        role: 'assistant',
        content: `Theo định lý Fermat, nếu hàm số f(x) có đạo hàm tại x₀ và đạt cực trị tại x₀, thì f'(x₀) = 0.

1. Ý nghĩa hình học:
Đạo hàm f'(x₀) là hệ số góc của tiếp tuyến tại (x₀, f(x₀)). Tại đỉnh cực đại hoặc đáy cực tiểu, đồ thị đổi chiều biến thiên, do đó tiếp tuyến nằm ngang song song trục Ox (hệ số góc = 0).

2. Lưu ý quan trọng:
Điều kiện f'(x₀) = 0 là điều kiện cần chứ chưa đủ.
Ví dụ: Với f(x) = x³, ta có f'(0) = 0 nhưng x = 0 không phải điểm cực trị vì f'(x) không đổi dấu qua điểm 0.

3. Dấu hiệu nhận biết cực trị:
Điểm x₀ là cực trị khi và chỉ khi đạo hàm f'(x) đổi dấu khi đi qua x₀ (từ dương sang âm: cực đại; từ âm sang dương: cực tiểu).`,
        createdAt: '2026-10-17T08:31:00Z',
        status: 'done',
        suggestedActions: [
          'Giải thích đơn giản hơn',
          'Cho ví dụ bài tập trắc nghiệm',
          'Tạo 3 câu quiz luyện tập',
        ],
      },
    ],
  },
  {
    id: 'conv-002',
    title: 'Định luật II Newton & Phương pháp động lực học',
    subject: 'vat-ly-12',
    createdAt: '2026-10-16T14:10:00Z',
    updatedAt: '2026-10-16T14:15:00Z',
    messages: [
      {
        id: 'msg-3',
        role: 'user',
        content: 'Định luật II Newton phát biểu thế nào và áp dụng giải bài ra sao?',
        createdAt: '2026-10-16T14:10:00Z',
        status: 'done',
        subjectContext: 'Vật lý 12',
      },
      {
        id: 'msg-4',
        role: 'assistant',
        content: `Định luật II Newton là nền tảng của động lực học cổ điển:

Gia tốc của một vật cùng hướng với lực tác dụng lên vật. Độ lớn của gia tốc tỉ lệ thuận với độ lớn của lực và tỉ lệ nghịch với khối lượng của vật:
F = m · a

Quy trình 4 bước giải bài tập động lực học:
1. Xác định vật khảo sát và phân tích tất cả các lực tác dụng lên vật (Trọng lực P, Phản lực N, Lực ma sát Fms, Lực kéo F).
2. Chọn hệ trục tọa độ Oxy thích hợp (thường Ox theo chiều chuyển động, Oy vuông góc).
3. Áp dụng phương trình định luật II: ∑ F = m · a.
4. Chiếu phương trình vectơ lên các trục tọa độ để giải ra gia tốc a hoặc đại lượng cần tìm.`,
        createdAt: '2026-10-16T14:11:00Z',
        status: 'done',
        suggestedActions: [
          'Ví dụ bài tập mặt phẳng nghiêng',
          'Tạo 3 câu quiz trắc nghiệm',
        ],
      },
    ],
  },
]

export const MOCK_CONVERSATIONS = mockInitialConversations

export const MOCK_STREAMING_RESPONSES = {
  default: `Chào bạn! Mình là AI Tutor. Mình đã ghi nhận câu hỏi của bạn.

Để giải quyết vấn đề này, chúng ta tiếp cận theo các bước sau:
1. Xác định rõ giả thiết và mục tiêu của bài toán.
2. Áp dụng các định lý hoặc công thức liên quan.
3. Kiểm tra lại điều kiện xác định và kết quả.

Bạn muốn mình giải thích chi tiết hơn ở phần nào?`,

  dao_ham: `Về **đạo hàm và tính đơn điệu của hàm số**:

1. Bản chất ý nghĩa:
Đạo hàm f'(x) đo lường tốc độ biến thiên tức thời của hàm số tại điểm x.
- Khi f'(x) > 0 trên khoảng (a, b): Hàm số đồng biến (đồ thị đi lên từ trái sang phải).
- Khi f'(x) < 0 trên khoảng (a, b): Hàm số nghịch biến (đồ thị đi xuống từ trái sang phải).
- Khi f'(x) = 0 và đổi dấu qua x₀: Hàm số đạt cực trị tại x₀.

2. Phương pháp giải bài toán tìm cực trị:
- Bước 1: Tìm tập xác định D của hàm số.
- Bước 2: Tính đạo hàm f'(x), tìm các điểm mà f'(x) = 0 hoặc f'(x) không xác định.
- Bước 3: Lập bảng biến thiên và kết luận điểm cực đại, cực tiểu.`,

  newton: `Về **3 Định luật chuyển động của Newton**:

1. Định luật I (Định luật quán tính):
Một vật nếu không chịu tác dụng của lực nào hoặc chịu tác dụng của các lực có hợp lực bằng không, thì vật đang đứng yên sẽ tiếp tục đứng yên, đang chuyển động sẽ tiếp tục chuyển động thẳng đều.

2. Định luật II (Định luật cơ bản động lực học):
Vectơ gia tốc tỉ lệ thuận với vectơ hợp lực và tỉ lệ nghịch với khối lượng:
F_hl = m · a

3. Định luật III (Tương tác giữa hai vật):
Khi vật A tác dụng lên vật B một lực, thì vật B cũng tác dụng lại vật A một lực cùng giá, cùng độ lớn nhưng ngược chiều:
F_AB = - F_BA`,

  xac_suat: `Về **phương pháp giải bài toán xác suất biến cố**:

1. Công thức cổ điển của xác suất:
P(A) = n(A) / n(Ω)
Trong đó n(A) là số kết quả thuận lợi cho biến cố A, n(Ω) là số phần tử không gian mẫu.

2. Quy tắc đếm cần nhớ:
- Quy tắc cộng: Dùng khi các phương án độc lập, hoàn thành công việc theo từng phương án.
- Quy tắc nhân: Dùng khi công việc gồm nhiều giai đoạn liên tiếp.

3. Biến cố đối:
P(A) = 1 - P(Ā) (Rất hữu hiệu khi đề bài có từ khóa "có ít nhất một").`,

  quiz: `Dưới đây là 3 câu hỏi trắc nghiệm kiểm tra kiến thức:

**Câu 1:** Đạo hàm của hàm số y = x⁴ - 2x² + 1 tại x = 1 bằng bao nhiêu?
A. 0
B. 2
C. -2
D. 4
*Đáp án đúng: A (Vì y' = 4x³ - 4x; tại x=1 thì y'(1) = 0)*

**Câu 2:** Định luật II Newton được biểu diễn bởi hệ thức nào sau đây?
A. F = m / a
B. F = m · a
C. a = m / F
D. P = m · g · h
*Đáp án đúng: B*

**Câu 3:** Một hộp có 5 bi xanh và 3 bi đỏ. Xác suất lấy ngẫu nhiên 1 viên bi đỏ là:
A. 5/8
B. 3/8
C. 3/5
D. 1/3
*Đáp án đúng: B (3 / (5+3) = 3/8)*`,

  pythagore: `Về **Định lý Pythagore (Pythagoras)**:

1. Phát biểu định lý:
Trong một tam giác vuông, bình phương độ dài cạnh huyền bằng tổng bình phương độ dài hai cạnh góc vuông:
**a² + b² = c²** (trong đó c là cạnh huyền đối diện góc vuông).

2. Ví dụ trực quan:
Xét tam giác vuông có hai cạnh góc vuông lần lượt là a = 3 cm và b = 4 cm.
- Bình phương các cạnh: 3² + 4² = 9 + 16 = 25
- Cạnh huyền: c = √25 = 5 cm.
Bộ ba số (3, 4, 5) được gọi là bộ ba số Pythagore kinh điển.

3. Ứng dụng thực tế:
- Tính khoảng cách gián tiếp trong trắc địa và bản đồ học.
- Xác định góc vuông 90° trong xây dựng công trình.`,

  quang_hop: `Về **Quá trình quang hợp ở thực vật**:

1. Phương trình tổng quát:
6 CO₂ + 6 H₂O + Năng lượng ánh sáng → C₆H₁₂O₆ (Glucose) + 6 O₂

2. Hai pha chính của quang hợp:
- **Pha sáng (tại Tilacôit):**
  + Diệp lục hấp thụ năng lượng photon ánh sáng.
  + Quang phân ly nước: giải phóng khí O₂ vào khí quyển và tạo lực khử NADPH, năng lượng ATP.
- **Pha tối / Chu trình Calvin (tại Chất nền Stroma):**
  + Sử dụng ATP và NADPH từ pha sáng để cố định CO₂ thành hợp chất hữu cơ (đường Glucose).

3. Ý nghĩa sinh học:
Cung cấp nguồn chất hữu cơ nuôi sống hầu hết sinh vật trên Trái Đất và điều hòa hàm lượng oxy trong khí quyển.`,

  on_tap: `Dưới đây là **kế hoạch ôn tập hiệu quả theo phương pháp khoa học**:

1. Chiến lược phân bổ thời gian (Pomodoro 50/10):
- Mỗi buổi ôn tập kéo dài 50 phút tập trung cao độ, nghỉ 10 phút.
- Mỗi ngày ôn tối đa 2-3 môn để tránh quá tải não bộ.

2. Phương pháp lặp lại ngắt quãng (Spaced Repetition):
- Ngày 1: Học lý thuyết và làm 5 câu ví dụ cơ bản.
- Ngày 2: Ôn lại công thức và giải bài tập nâng cao.
- Ngày 4: Tự kiểm tra bằng đề mini-test 15 phút không mở sách.
- Ngày 7: Tổng ôn dạng bài sai và rút kinh nghiệm.

3. Sử dụng sơ đồ tư duy (Mindmap):
Hệ thống hóa kiến thức từng chương thành một trang giấy duy nhất để nắm trọn bức tranh toàn cảnh.`,

  code_sample: `Dưới đây là ví dụ mã nguồn minh họa thuật toán:

\`\`\`python
# Thuật toán tìm nghiệm phương trình bậc hai: ax^2 + bx + c = 0
import math

def giai_phuong_trinh_bac_hai(a, b, c):
    if a == 0:
        return "Phương trình bậc nhất: x = " + str(-c / b) if b != 0 else "Vô nghiệm"
    
    delta = b**2 - 4*a*c
    if delta > 0:
        x1 = (-b + math.sqrt(delta)) / (2*a)
        x2 = (-b - math.sqrt(delta)) / (2*a)
        return f"2 nghiệm phân biệt: x1 = {x1}, x2 = {x2}"
    elif delta == 0:
        return f"Nghiệm kép: x = {-b / (2*a)}"
    else:
        return "Phương trình vô nghiệm thực"

print(giai_phuong_trinh_bac_hai(1, -3, 2))
\`\`\`
Đoạn mã trên xử lý đầy đủ các trường hợp nghiệm của tam thức bậc hai.`,
}

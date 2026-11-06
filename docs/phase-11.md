# STUDY_AI — Phase 11: Question Bank Foundation & Verified Math Assessment Items

## 1. Mục tiêu & Bối cảnh

- **Workspace**: `D:\TN`
- **Frontend Stack**: React 19, TypeScript, Vite, Bun, KaTeX, Lucide Icons
- **Thiết kế**: Navy Notebook (`#102A43`, `#F4B942`, `#FFF9EA`, `#F0F4F8`)
- **Chương trình**: GDPT 2018, Toán 12 (Tập 1, Sách Kết nối tri thức với cuộc sống), Chương 1: "Ứng dụng đạo hàm để khảo sát và vẽ đồ thị hàm số".
- **Mục tiêu đạt được**:
  1. Xây dựng mô hình Schema câu hỏi chuẩn hóa (`QuestionItem`) bằng TypeScript Discriminated Union cho 3 định dạng thi trắc nghiệm GDPT 2018: Multiple Choice (MCQ 4 lựa chọn), True/False Group (Đúng/Sai theo cụm 4 nhận định), và Short Answer (Trả lời ngắn số học/phân số).
  2. Xây dựng bộ chuẩn hoá và đánh giá biểu thức toán học an toàn (`mathAnswerNormalizer.ts`), xử lý dấu âm Unicode, dấu phẩy/chấm thập phân tiếng Việt, phân số tối giản, không sử dụng `eval()` hoặc mã thực thi tùy ý.
  3. Xây dựng bộ ngân hàng 22 câu hỏi mẫu kiểm chứng toán học cho Chương 1, gắn trực tiếp với hệ thống mã năng lực kỹ năng chuẩn GDPT 2018 từ Phase 9 & 10.
  4. Triển khai kiến trúc `QuestionBankRepository` và `QuestionBankService` có khả năng thay thế In-memory/LocalStorage bằng FastAPI REST API adapter về sau.
  5. Thiết kế các UI Components tái sử dụng cao (`QuestionItemView`, `MultipleChoiceItem`, `TrueFalseGroupItem`, `ShortAnswerItem`, `QuestionBankFilterBar`) phục vụ cho thi cử và luyện tập ở Phase 12.
  6. Xây dựng giao diện Ngân hàng câu hỏi (`QuestionBankPage.tsx`) phong cách Navy Notebook, hỗ trợ tìm kiếm, lọc theo 4 mức độ nhận thức, 4 mức độ khó, dạng câu hỏi, và chuyển tiếp ngữ cảnh AI Tutor mà không làm thay đổi tiến độ học tập.

---

## 2. Kiến trúc Question Bank & Schema

### A. Mô hình Discriminated Union (`types/questionBank.ts`)
- **`MultipleChoiceQuestion`**: Bắt buộc mảng đúng 4 lựa chọn `[MultipleChoiceOption, MultipleChoiceOption, MultipleChoiceOption, MultipleChoiceOption]` với nhãn `A | B | C | D`, đáp án đúng `correctAnswer` và lời giải chi tiết KaTeX.
- **`TrueFalseGroupQuestion`**: Bắt buộc mảng đúng 4 mệnh đề `[TrueFalseSubItem, TrueFalseSubItem, TrueFalseSubItem, TrueFalseSubItem]` với nhãn `a | b | c | d`. Mỗi mệnh đề có cờ `isCorrect: boolean` độc lập và lời giải riêng. Không biến thành 4 câu trắc nghiệm rời rạc.
- **`ShortAnswerQuestion`**: Khai báo danh sách các biến thể số học được chấp nhận `acceptedAnswers: string[]`, chuỗi hiển thị mẫu `displayAnswer: string` (KaTeX) và dung sai thực nghiệm `tolerance`.
- **Phân loại nhận thức**: `recognition` (Nhận biết), `comprehension` (Thông hiểu), `application` (Vận dụng), `high_application` (Vận dụng cao).
- **Trạng thái kiểm duyệt**: `draft`, `needs_review`, `approved`, `rejected`. Chỉ câu hỏi `approved` mới được dùng cho bài thi và luyện tập chính thức.

### B. Chuẩn hoá toán học an toàn (`services/mathAnswerNormalizer.ts`)
- Thay thế ký tự trừ Unicode: `\u2212` (−), `\u2013` (–), `\u2014` (—) thành `-`.
- Chuẩn hóa dấu phẩy thập phân kiểu Việt Nam `3,14` $\to$ `3.14`.
- Phân tích số nguyên, số thực và phân số dạng $a/b$ mà không dùng `eval()`.
- Kiểm tra sự tương đương số học trong phạm vi dung sai $\varepsilon = 10^{-6}$.

---

## 3. Thống kê bộ câu hỏi mẫu Toán 12 Chương 1

| Tiêu chí | Số lượng | Chi tiết |
| :--- | :---: | :--- |
| **Tổng số câu hỏi** | **22** | 100% có lời giải KaTeX từng bước và mã kỹ năng GDPT 2018 |
| **Trắc nghiệm 4 lựa chọn (MCQ)** | **12** | 11 approved, 1 needs_review (hàm hợp đồ thị đạo hàm) |
| **Đúng / Sai theo cụm (TF Group)** | **4** | 16 nhận định độc lập (3 approved, 1 needs_review về tiệm cận xiên) |
| **Trả lời ngắn (Short Answer)** | **6** | 100% approved, hỗ trợ số nguyên, số âm, cực trị, tiệm cận |
| **Đã duyệt (Approved)** | **20** | Đã sẵn sàng cho bài thi / bài tập thực tế |
| **Cần duyệt bổ sung (Needs Review)** | **2** | Đánh dấu cho tổ chuyên môn xác minh phạm vi thi |

### Danh sách Skill Codes được liên kết:
- `SKILL-MATH-12-DERIV-SIGN`: Xét dấu đạo hàm và lập bảng xét dấu.
- `SKILL-MATH-12-MONOTONICITY`: Xét tính đơn điệu (đồng biến/nghịch biến) trên các khoảng xác định.
- `SKILL-MATH-12-EXTREMUM`: Xác định điểm cực trị, giá trị cực trị qua quy tắc 1 và quy tắc 2.
- `SKILL-MATH-12-MINMAX-SEGMENT`: Tìm giá trị lớn nhất và nhỏ nhất trên đoạn đóng.
- `SKILL-MATH-12-MINMAX-INTERVAL`: Tìm giá trị lớn nhất và nhỏ nhất trên khoảng mở bằng đạo hàm và BĐT AM-GM.
- `SKILL-MATH-12-VARIATION-TABLE`: Đọc và phân tích bảng biến thiên.
- `SKILL-MATH-12-ASYMPTOTE`: Xác định tiệm cận đứng, tiệm cận ngang và tâm đối xứng của đồ thị.
- `SKILL-MATH-12-GRAPH-SKETCHING`: Nhận dạng hình dáng đồ thị hàm bậc ba và hàm phân thức.

---

## 4. Kiểm thử & Đảm bảo chất lượng

- **Linter (oxlint)**:
  - Lệnh: `bun run lint`
  - Kết quả: `Found 0 warnings and 0 errors` trên toàn bộ 364 files.
- **Unit & Integration Tests (Vitest)**:
  - Lệnh: `bun run test`
  - Kết quả: **41 test files passed (100%), 307 unit tests passed**.
  - Bộ test mới `QuestionBank.test.tsx` (16 tests) xác nhận:
    * MathAnswerNormalizer: Chuẩn hoá phân số, số thập phân, unicode minus an toàn không eval.
    * Đủ 22 câu hỏi với ID duy nhất, không trùng lặp.
    * Tỷ lệ 12 MCQ, 4 TF Group, 6 Short Answer.
    * Toàn bộ câu hỏi liên kết đúng Skill Codes chuẩn GDPT 2018.
    * Invariant Repository: Không bao giờ trả về câu hỏi khác khi ID không tồn tại.
    * Filter chính xác theo loại câu, độ khó, trạng thái approved/needs_review.
    * Giao diện UI: Hiển thị đúng 4 phương án MCQ, 4 nhận định a,b,c,d, ô input trả lời ngắn, và toggle lời giải chi tiết.
- **Production Build**:
  - Lệnh: `bun run build` (`tsc -b && vite build`)
  - Kết quả: **Thành công trong 1.71s**, toàn bộ TypeScript types và KaTeX font bundles được nén tối ưu.
- **Playwright Visual QA Evidence**:
  - Ghi nhận đầy đủ tại `docs/visual-qa/phase-11/`:
    * `question_bank_listing_desktop.png` (1.08 MB)
    * `filter_true_false_group.png` (456 KB)
    * `filter_short_answer.png` (397 KB)
    * `question_explanation_drawer.png` (44 KB)
    * `question_bank_mobile_390px.png` (1.12 MB)

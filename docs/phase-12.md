# STUDY_AI — Phase 12: Practice & Assessment Engine
## Real Attempts, Reliable Scoring, Learning History & Skill-Level Results

---

## 1. Mục tiêu & Bối cảnh dự án

- **Workspace**: `D:\TN`
- **Frontend Stack**: React 19, TypeScript, Vite, Bun, KaTeX, Lucide Icons
- **Thiết kế**: Navy Notebook (`#102A43` Navy, `#F4B942` Gold/Amber, `#FFF9EA` Paper Canvas)
- **Chương trình**: GDPT 2018, Toán 12 (Tập 1, Sách Kết nối tri thức với cuộc sống), Chương 1: "Ứng dụng đạo hàm để khảo sát và vẽ đồ thị hàm số".
- **Kế thừa từ Phase 11**: Ngân hàng câu hỏi gồm 22 câu hỏi kiểm chứng (12 MCQ, 4 True/False Groups, 6 Short Answers) với 20 câu `approved`.
- **Mục tiêu đạt được của Phase 12**:
  1. Xây dựng quy trình làm bài thực tế: Thiết lập luyện tập $\to$ Tạo session với question IDs cố định $\to$ Trả lời 3 dạng câu hỏi $\to$ Tự động lưu nháp $\to$ Khôi phục trạng thái sau reload $\to$ Hộp thoại xác nhận nộp bài $\to$ Chấm điểm xác định theo chuẩn thi GDPT 2018 $\to$ Bảng kết quả & hướng dẫn giải chi tiết KaTeX $\to$ Thống kê điểm số theo kỹ năng năng lực $\to$ Lịch sử làm bài thực tế.
  2. Tuyệt đối không tạo điểm giả, không tạo số liệu thống kê hoặc tỷ lệ hoàn thành giả. Toàn bộ dữ liệu phản ánh chính xác câu trả lời của học sinh.
  3. Bảo toàn 100% các tính năng cũ (LessonPage, LessonAssessment, QuestionBank, AI Tutor, Bookmarks, Notes).

---

## 2. Kiến trúc Practice Engine & Domain Model

Khai báo tại [`frontend/src/types/practice.ts`](file:///d:/TN/frontend/src/types/practice.ts):

### A. Thực thể Session (`PracticeSession`)
```typescript
export interface PracticeSession {
  id: string
  mode: PracticeSessionMode // 'lesson' | 'skill' | 'mixed' | 'custom'
  subjectId: string
  chapterId: string
  lessonId?: string
  selectedSkillIds: string[]
  questionIds: string[] // Danh sách ID câu hỏi cố định của phiên
  status: 'in_progress' | 'submitted' | 'abandoned'
  startedAt: string
  updatedAt: string
  submittedAt?: string
  answers: Record<string, StudentAnswer>
  resultId?: string
  schemaVersion: number
}
```

### B. Discriminated Union cho câu trả lời học sinh (`StudentAnswer`)
- **`MultipleChoiceAnswer`**: `selectedOption: 'A' | 'B' | 'C' | 'D' | null`
- **`TrueFalseGroupAnswer`**: `subItemAnswers: Record<'a' | 'b' | 'c' | 'd', boolean | null>` (phân biệt rạch ròi giữa `true`: Đúng, `false`: Sai, và `null`: Chưa chọn).
- **`ShortAnswerAnswer`**: `rawInput: string` (lưu nguyên văn chuỗi học sinh nhập, chống submit nhầm khi bấm phím Enter).

### C. Thực thể Kết quả (`PracticeResult`)
- Lưu trữ đầy đủ kết quả chi tiết từng câu `questionResults: ScoredQuestionResult[]`.
- `earnedPoints`, `maxPoints`, `percentage`, `skillBreakdown: SkillScoreBreakdown[]`.
- Điểm số được làm tròn số thực ổn định qua hàm `roundPoints` để chống lỗi floating point binary (`0.1 + 0.25 = 0.35`).

---

## 3. Quy tắc chấm điểm xác định (Deterministic Scoring Engine)

Triển khai tại [`frontend/src/services/scoringEngine.ts`](file:///d:/TN/frontend/src/services/scoringEngine.ts):

### A. Trắc nghiệm 4 lựa chọn (Multiple Choice)
- Đúng: 1.0 điểm.
- Sai hoặc bỏ trống: 0.0 điểm.

### B. Đúng / Sai theo cụm 4 ý (True / False Group)
Chấm điểm cả cụm 4 nhận định độc lập theo đúng quy tắc cấu trúc đề thi tốt nghiệp THPT GDPT 2018 của Bộ GD&ĐT:
- **0 ý đúng**: 0.0 điểm.
- **1 ý đúng**: 0.1 điểm.
- **2 ý đúng**: 0.25 điểm.
- **3 ý đúng**: 0.5 điểm.
- **4 ý đúng**: 1.0 điểm.
- *Quy tắc bất biến*: Nhận định bỏ trống (`null`) tuyệt đối không được tính là đúng và không bị đồng nhất với `false`.

### C. Điền đáp án ngắn số học (Short Answer)
- Đúng: 1.0 điểm.
- Sai hoặc để trống: 0.0 điểm.
- So sánh qua module [`mathAnswerNormalizer.ts`](file:///d:/TN/frontend/src/services/mathAnswerNormalizer.ts) an toàn không eval: chuẩn hoá dấu trừ Unicode (`−`, `–`), chuẩn hoá dấu phẩy/chấm thập phân Việt Nam (`3,5` $\to$ `3.5`), phân số tối giản và rút gọn (`6/2` $\to$ `3`), dung sai số thực $\varepsilon = 10^{-6}$.

### D. Chính sách phân bổ điểm theo kỹ năng (Skill Allocation Policy)
Khi một câu hỏi gắn với nhiều `skillIds` (ví dụ: vừa xét dấu đạo hàm, vừa xét tính đơn điệu), điểm số đạt được và điểm tối đa của câu hỏi được chia đều cho các kỹ năng liên quan:
$$\text{weight} = \frac{1}{|\text{skillIds}|}, \quad \text{earnedSkill} = \text{earnedPoints} \times \text{weight}$$
*Đảm bảo bất biến*: Tổng điểm phân bổ theo kỹ năng $\le$ tổng điểm thực tế của bài làm.

---

## 4. Tự động lưu nháp & Khôi phục trạng thái (Auto-Save & Resume)

Triển khai tại [`frontend/src/repositories/practice.repository.ts`](file:///d:/TN/frontend/src/repositories/practice.repository.ts) và [`frontend/src/services/practice.service.ts`](file:///d:/TN/frontend/src/services/practice.service.ts):
- **Namespace riêng**: `study_ai_practice_sessions_v1` và `study_ai_practice_results_v1`.
- **Tự động lưu**: Mỗi khi học sinh chọn đáp án, đổi phương án hoặc chuyển câu, câu trả lời lập tức được ghi vào repository.
- **Khôi phục (Resume)**: Khi reload trình duyệt hoặc quay lại trang `/practice`, hệ thống hiển thị banner bài làm dở kèm số câu hỏi và nút "Tiếp tục làm bài".
- **Chống nộp hai lần (Idempotent / Anti Double-Submit)**: Khi một session đã chuyển sang trạng thái `submitted`, gọi `submitSession()` lần nữa sẽ trả về ngay kết quả đã tạo trước đó mà không sinh thêm bản ghi kết quả trùng lặp.
- **Khóa chỉnh sửa**: Phiên đã nộp hoặc bị hủy (`abandoned`) bị từ chối sửa câu trả lời.

---

## 5. Các màn hình giao diện người dùng

1. **Practice Setup Screen** (`components/practice/PracticeSetup.tsx`):
   - Dropdown chọn bài học (Bài 1, Bài 2, Bài 3 hoặc Toàn bộ Chương 1).
   - Dropdown chọn kỹ năng năng lực.
   - Dropdown chọn định dạng câu hỏi (MCQ, Đúng/Sai, Trả lời ngắn).
   - Bộ chọn số lượng câu (5, 10, 15, 20 câu).
   - Bộ đếm thời gian thực hiển thị số câu `approved` sẵn có trong ngân hàng dữ liệu.
2. **Practice Session Runner** (`pages/Practice/PracticeSessionPage.tsx`):
   - Banner trạng thái "Đang làm bài · Tự động lưu nháp".
   - Bảng palette số câu hỏi tương tác (đổi màu khi đã trả lời hoặc đang xem).
   - Thẻ câu hỏi KaTeX display với input tương ứng từng dạng câu. Chặn sự kiện phím Enter trên ô trả lời ngắn để tránh nộp nhầm.
   - Hộp thoại `ConfirmDialog` xác nhận nộp bài: hiển thị rõ số câu còn bỏ sót trước khi nộp.
3. **Practice Result View** (`pages/Practice/PracticeResultPage.tsx`):
   - Vòng tròn hiển thị điểm số và tỷ lệ phần trăm điểm đạt.
   - Thống kê 4 khối: Đúng tuyệt đối, Đúng một phần, Sai, Chưa trả lời.
   - Bảng phân tích kỹ năng năng lực (mã kỹ năng, số câu, điểm đạt, thanh tiến độ %).
   - Bảng đối chiếu câu trả lời của học sinh vs đáp án chuẩn.
   - Ngăn kéo hướng dẫn giải chi tiết KaTeX từng bước.
   - Nút "Hỏi AI giải thích" cho từng câu: đóng gói context snapshot chính xác vào `learningContextService` và chuyển sang `/ai-tutor`.
4. **Practice History View** (`pages/Practice/PracticeHubPage.tsx`):
   - Tab lịch sử hiển thị danh sách các lượt làm bài thật kèm thời gian làm, số phút/giây, số câu đúng/sai và điểm số.
   - Nút "Xem lại" mở lại trang kết quả đã lưu.
   - Empty State thân thiện khi học sinh chưa thực hiện bài luyện tập nào.

---

## 6. Kiểm thử tự động & Bằng chứng Visual QA

### A. Kiểm thử Lint, Unit & Integration Tests
- **Linter (`oxlint --deny-warnings`)**:
  - **PASSED**: 0 warnings, 0 errors trên toàn bộ 374 files.
- **Unit & Integration Tests (`bun run test`)**:
  - **PASSED**: 42/42 test files, **320/320 tests passed** (100%).
  - File test mới [`frontend/src/pages/Practice/PracticeEngine.test.tsx`](file:///d:/TN/frontend/src/pages/Practice/PracticeEngine.test.tsx) đạt 13/13 tests:
    * Chấm MCQ: đúng = 1đ, sai = 0đ, bỏ trống = 0đ.
    * Chấm True/False Group: kiểm thử đủ 5 mức điểm (0đ, 0.1đ, 0.25đ, 0.5đ, 1.0đ).
    * Phân biệt rạch ròi `null` vs `false` trong TF Group.
    * Chấm Short Answer với số nguyên, số thập phân, phân số rút gọn.
    * Chống lỗi làm tròn floating point.
    * Lưu và khôi phục session, không mất câu trả lời.
    * Không fallback câu hỏi khác khi session không tồn tại.
    * Chống nộp bài hai lần (idempotent double-submit).
    * Phân bổ điểm kỹ năng không vượt quá tổng điểm bài làm.
    * Lịch sử bài làm phản ánh 100% dữ liệu thật.
- **Production Build (`bun run build`)**:
  - **PASSED**: `tsc -b && vite build` hoàn thành trong 1.71s không có lỗi TypeScript hay Vite bundler.

### B. Bằng chứng Visual QA Playwright
Đã thực thi kịch bản [`scripts/capture_phase12_evidence.ts`](file:///d:/TN/scripts/capture_phase12_evidence.ts) và lưu toàn bộ ảnh chụp tại [`docs/visual-qa/phase-12/`](file:///d:/TN/docs/visual-qa/phase-12):
- `01_practice_setup_desktop.png` (214 KB): Giao diện thiết lập bài luyện tập.
- `02_practice_session_mcq.png` (113 KB): Giao diện làm bài trắc nghiệm MCQ.
- `03_practice_session_q2.png` (102 KB): Chuyển câu hỏi trong session.
- `04_practice_resume_after_reload.png` (114 KB): Khôi phục nguyên vẹn câu trả lời sau khi reload trang.
- `05_practice_submit_confirm_dialog.png` (152 KB): Hộp thoại cảnh báo số câu chưa làm trước khi nộp.
- `06_practice_result_desktop.png` (405 KB): Màn hình kết quả chấm điểm xác định & bảng phân tích kỹ năng.
- `07_practice_result_explanation.png` (33 KB): Hướng dẫn giải chi tiết KaTeX từng bước.
- `08_practice_history_desktop.png` (175 KB): Tab lịch sử các lượt làm bài thật.
- `09_practice_setup_mobile_390px.png` (137 KB): Bố cục responsive hoàn chỉnh trên thiết bị di động 390px.

---

## 7. Giới hạn hiện tại & Hướng phát triển Phase 13

1. **Giới hạn hiện tại**:
   - Dữ liệu câu hỏi mới bao phủ Toán 12 Chương 1 (20 câu approved).
   - Tỷ lệ kỹ năng trong bài luyện tập phụ thuộc vào số lượng câu hỏi trong ngân hàng dữ liệu.
   - Chưa tích hợp đồng bộ lịch sử luyện tập lên cơ sở dữ liệu backend FastAPI.
2. **Đề xuất phát triển Phase 13 (Learner Analytics, Diagnostic Assessment & Mastery Progression)**:
   - Tổng hợp kết quả từ nhiều phiên luyện tập thành chỉ số năng lực kỹ năng lâu dài (Longitudinal Mastery Curve).
   - Tự động gợi ý các câu hỏi cần ôn tập dựa trên các kỹ năng học sinh thường làm sai trong lịch sử làm bài.
   - Đồng bộ hóa các lượt làm bài với cơ sở dữ liệu PostgreSQL thông qua FastAPI backend.

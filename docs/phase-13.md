# STUDY_AI — Phase 13 Documentation
# Personalized Learning Engine: Evidence-Based Mastery, Knowledge Gap Detection & Adaptive Learning Paths

> **Trạng thái:** Hoàn thành & Sẵn sàng bàn giao  
> **Repository:** https://github.com/hthuyngan/STUDY_AI-  
> **Workspace:** `D:\TN`  
> **Branch:** `main`  
> **Tiêu chuẩn thiết kế:** Navy Notebook (Navy `#102A43`, Gold `#F4B942`, Paper `#FFF9EA`) — Flat, compact, trung thực, zero KPI ảo.

---

## 1. Tổng quan & Triết lý Thiết kế

Phase 13 kiến tạo hệ thống **Personalized Learning Engine** hoạt động độc lập và xác định (deterministic) dựa trên **dữ liệu thực nghiệm 100%** từ các phiên làm bài luyện tập (`PracticeResult`) của Phase 12 và Ngân hàng câu hỏi chuẩn GDPT 2018 (Phase 11).

```
Practice Results (Phase 12)
       │
       ▼
Evidence Aggregation Engine ──► Reject mock / duplicate / invalid data
       │
       ▼
Skill Performance Engine ────► Score Ratio & Statistical Confidence Model
       │
       ▼
Knowledge Gap Detection ─────► Evidence-based Weaknesses (No mind-reading guesses)
       │
       ▼
Pedagogical Recommendations ─► Prioritized Concrete Actions (Review, Practice, Diagnostic)
       │
       ▼
Adaptive Learning Path ──────► Dynamic 3-5 Step Sequential Roadmap
       │
       ▼
Updated upon each new authentic practice attempt
```

### Nguyên tắc bất biến (Core Invariants):
1. **Zero Fake Metrics**: Tuyệt đối không tạo điểm số thành thạo giả lập (fake mastery), chuỗi ngày học giả lập (fake streak), hoặc số lượt luyện tập ảo. Khi chưa có dữ liệu làm bài thực tế, hệ thống hiển thị Empty State trung thực hướng dẫn học sinh làm bài lần đầu.
2. **Sparse Data Handling (Xử lý dữ liệu ít)**: Không đưa ra kết luận năng lực mạnh khi số câu hỏi hoặc số lượt làm bài còn ít. Học sinh làm đúng hay sai 1 câu đơn lẻ đều được đánh dấu độ tin cậy `insufficient` ("Cần thêm dữ liệu đánh giá").
3. **Repeated Question Penalization**: Học sinh làm đi làm lại cùng 1 câu hỏi nhiều lần không được tính là nhiều bằng chứng độc lập (`uniqueQuestionIds.length === 1`). Độ tin cậy không tăng chỉ bằng việc lặp lại cùng một câu hỏi.
4. **Data Immutability**: Engine hoạt động như một chuỗi hàm thuần túy (pure transformations), tuyệt đối không sửa đổi `PracticeResult` gốc trong LocalStorage.

---

## 2. Giải quyết 3 Vấn đề Kỹ thuật từ Phase 12

### 2.1. Short Answer Tolerance
- **Trước Phase 13**: Hàm `scoreShortAnswer` tự động gán mặc định dung sai `tolerance ?? 1e-6` cho mọi câu hỏi trả lời ngắn.
- **Đã khắc phục**:
  - `isMathAnswerCorrect` trong [`mathAnswerNormalizer.ts`](file:///D:/TN/frontend/src/services/mathAnswerNormalizer.ts) chỉ áp dụng dung sai số thực khi câu hỏi có khai báo trường `tolerance` trong metadata (`typeof tolerance === 'number' && Number.isFinite(tolerance)`).
  - Khi câu hỏi không khai báo `tolerance`, hệ thống thực hiện so sánh số học chính xác tuyệt đối sau chuẩn hóa: `userNum === acceptedNum`. (Ví dụ: `3.0000001` không được coi là đúng với đáp án `3`).
  - Kiểm thử bổ sung: Đã thêm các ca kiểm thử trong [`PracticeEngine.test.tsx`](file:///D:/TN/frontend/src/pages/Practice/PracticeEngine.test.tsx) xác minh phân biệt câu hỏi có dung sai và không dung sai.

### 2.2. Skill Breakdown Precision
- **Trước Phase 13**: `calculateSkillBreakdown` gọi `roundPoints` quá sớm ở tầng data, dẫn đến nguy cơ lệch số thập phân khi câu hỏi được gán cho 3 kỹ năng ($1/3 + 1/3 + 1/3 = 0.99 \neq 1.0$).
- **Đã khắc phục**:
  - Bảo tồn độ chính xác số thực dấu phẩy động trong quá trình phân bổ điểm giữa các `skillIds`.
  - Tầng trình bày UI ([`PracticeResultPage.tsx`](file:///D:/TN/frontend/src/pages/Practice/PracticeResultPage.tsx)) thực hiện làm tròn phục vụ hiển thị bằng `roundPoints(sk.earnedPoints)` và `roundPoints(sk.maxPoints)`.
  - Đã bổ sung unit tests kiểm tra câu hỏi gắn 2, 3 và 4 kỹ năng trong [`PracticeEngine.test.tsx`](file:///D:/TN/frontend/src/pages/Practice/PracticeEngine.test.tsx), đảm bảo tổng điểm phân bổ bảo toàn chính xác $\sum \text{earned} = \text{totalEarned}$.

### 2.3. Cấu hình Linter (`oxlint`)
- **Trước Phase 13**: Lệnh `bun run lint` ở root báo `0 rules checked` do oxlint chạy không đúng thư mục cấu hình.
- **Đã khắc phục**:
  - Cấu hình root `package.json` với script `"lint": "cd frontend && bun run lint"`.
  - Chạy `oxlint --deny-warnings` kiểm tra đầy đủ **384 files** với **116 rules** kích hoạt trên TypeScript, React Hooks và JSX. Đạt chuẩn 0 warnings, 0 errors.

---

## 3. Kiến trúc Chi tiết & Các Engine Thành phần

### 3.1. Evidence Aggregation Engine
Tệp: [`frontend/src/services/evidenceAggregationEngine.ts`](file:///D:/TN/frontend/src/services/evidenceAggregationEngine.ts)
- **Đầu vào**: Mảng `PracticeResult[]` từ `practiceRepository.getAllResults()`.
- **Bộ lọc an toàn**:
  - Bỏ qua các session chưa nộp, session bị hủy (`abandoned`).
  - Chống trùng lặp (Anti-duplicate): Mỗi `sessionId` chỉ lấy một bản ghi duy nhất.
  - Bỏ qua dữ liệu LocalStorage hỏng (xử lý an toàn `null`, `undefined`, cấu trúc thiếu `questionResults`).
  - Loại trừ các câu hỏi chưa được duyệt (`needs_review`, `draft`, `rejected`) hoặc câu hỏi thiếu khỏi phân tích năng lực.
- **Tập hợp dữ liệu theo kỹ năng (`SkillEvidence`)**:
  - `attemptCount`: Số lượt làm bài có chứa kỹ năng.
  - `questionCount`: Tổng số lượt trả lời câu hỏi thuộc kỹ năng.
  - `uniqueQuestionIds`: Danh sách các câu hỏi phân biệt thực tế.
  - `repeatedQuestionCount`: $\max(0, \text{questionCount} - \text{uniqueQuestionIds.length})$.
  - `earnedPoints` & `maxPoints`: Điểm phân bổ theo trọng số $1 / |\text{skillIds}|$.
  - `chronologicalAttempts`: Chuỗi lịch sử trả lời theo mốc thời gian để phục vụ phân tích xu hướng.

### 3.2. Skill Performance Engine & Confidence Model
Tệp: [`frontend/src/services/skillPerformanceEngine.ts`](file:///D:/TN/frontend/src/services/skillPerformanceEngine.ts)
- **Tỷ lệ điểm quan sát được**:
  $$\text{scoreRatio} = \frac{\text{earnedPoints}}{\text{maxPoints}}$$
  *Lưu ý sư phạm*: Không gọi tỷ lệ này là "xác suất thành thạo" vì cỡ mẫu chưa đủ lớn theo mô hình IRT.
- **Mô hình độ tin cậy thống kê (`ConfidenceLevel`)**:
  - `insufficient`: Khi $\text{uniqueQuestions} < 2$ hoặc $\text{questionCount} < 2$.
  - `low`: Khi $2 \le \text{uniqueQuestions} \le 3$.
  - `moderate`: Khi $\text{uniqueQuestions} \ge 4$ và $\text{attemptCount} \ge 2$.
  - `high`: Khi $\text{uniqueQuestions} \ge 6$ và $\text{attemptCount} \ge 3$ trên các session khác nhau.
- **Phân loại trạng thái năng lực (`PerformanceStatus`)**:
  - Nếu `confidence === 'insufficient'`: Trạng thái bắt buộc là `'insufficient_data'` ("Chưa đủ dữ liệu đánh giá").
  - Khi độ tin cậy từ `low` trở lên:
    - $\text{scoreRatio} < 0.60$: `'needs_review'` ("Cần ôn tập").
    - $0.60 \le \text{scoreRatio} < 0.80$: `'reinforcing'` ("Cần củng cố").
    - $\text{scoreRatio} \ge 0.80$: `'proficient'` ("Đạt mức luyện tập hiện tại").
- **Phân tích xu hướng (`PerformanceTrend`)**:
  - So sánh nửa đầu và nửa sau của chuỗi `chronologicalAttempts`.
  - $\Delta > +0.10 \implies$ `'improving'` (Tiến bộ).
  - $\Delta < -0.10 \implies$ `'declining'` (Giảm sút).
  - $|\Delta| \le 0.10 \implies$ `'stable'` (Ổn định).
  - Khi ít hơn 2 lần làm bài: `'insufficient_data'`.

### 3.3. Knowledge Gap Detection Engine
Tệp: [`frontend/src/services/knowledgeGapDetectionEngine.ts`](file:///D:/TN/frontend/src/services/knowledgeGapDetectionEngine.ts)
- **Nguyên tắc nhận diện**: Chỉ tạo Knowledge Gap khi có bằng chứng thực tế về câu trả lời sai trên câu hỏi approved ($\text{questionCount} - \text{fullyCorrectCount} \ge 1$) và $\text{scoreRatio} < 0.70$.
- **Mức độ nghiêm trọng (`gapLevel`)**:
  - `critical`: $\text{scoreRatio} < 0.40$ và có ít nhất 2 lượt sai.
  - `moderate`: $\text{scoreRatio} < 0.60$.
  - `minor`: $\text{scoreRatio} < 0.75$.
- **Mô tả sư phạm trung thực**:
  - Ví dụ: *"Trả lời chưa chính xác ở 2/3 lượt câu hỏi liên quan đến Cực trị của hàm số (tỷ lệ điểm đạt 33%)."*
  - Tuyệt đối không suy đoán tâm lý hoặc lỗi tư duy không có dữ liệu chứng minh (như "học sinh quên quy tắc tính đạo hàm").

### 3.4. Personalized Recommendation Engine
Tệp: [`frontend/src/services/recommendationEngine.ts`](file:///D:/TN/frontend/src/services/recommendationEngine.ts)
- **Thứ tự ưu tiên khuyến nghị**:
  1. `high`: Lỗ hổng nghiêm trọng $\to$ Khuyến nghị **Đọc lại bài học lý thuyết** (`review_lesson`) và **Luyện tập 5 câu khắc phục** (`practice_skill`).
  2. `medium`: Kỹ năng thiếu dữ liệu $\to$ Khuyến nghị **Làm bài đánh giá chẩn đoán** (`diagnostic_practice`).
  3. `medium`: Kỹ năng đang củng cố $\to$ Khuyến nghị **Luyện tập củng cố** (`reinforcement`).
  4. `low`: Kỹ năng đạt kết quả tốt $\to$ Khuyến nghị **Tiếp tục bài học mới trong chương trình** (`continue_learning`).
- **Ràng buộc an toàn**: Chỉ khuyến nghị bài học thực sự tồn tại trong curriculum và chỉ khuyến nghị luyện tập những kỹ năng có câu hỏi approved trong Question Bank.

### 3.5. Adaptive Learning Path Service
Tệp: [`frontend/src/services/adaptiveLearningPathService.ts`](file:///D:/TN/frontend/src/services/adaptiveLearningPathService.ts)
- Xây dựng lộ trình tinh gọn gồm 3–5 bước học tập hành động được:
  - **Bước 1**: Ôn tập lý thuyết cho kỹ năng có lỗ hổng lớn nhất (hoặc bài học trọng điểm).
  - **Bước 2**: Luyện tập 5 câu hỏi kiểm chứng cho kỹ năng đó.
  - **Bước 3**: Đánh giá chẩn đoán để nâng cao độ tin cậy đánh giá.
  - **Bước 4**: Tiếp tục bài học tiếp theo của Chương 1 GDPT 2018.
- **Tự động tái tính toán**: Khi học sinh hoàn thành thêm một bài luyện tập mới, lộ trình tự động cập nhật độ ưu tiên và các bước học.

---

## 4. Tích hợp Giao diện Người dùng (UI/UX)

### 4.1. Giao diện Learning Analytics (`/learning-analytics`)
- Tích hợp thêm Tab: **"Năng lực thực chứng & Cá nhân hóa"** hiển thị component [`PersonalizedAnalyticsView.tsx`](file:///D:/TN/frontend/src/components/personalization/PersonalizedAnalyticsView.tsx):
  1. **Summary Strip**: 4 thẻ KPI thực tế (Lượt làm bài thật, Câu hỏi phân biệt đã làm, Tỷ lệ điểm quan sát được, Số lỗ hổng kiến thức nhận diện).
  2. **Adaptive Learning Path Timeline**: Lộ trình 3–5 bước với mục tiêu rõ ràng và nút "Bắt đầu bước này".
  3. **Bảng đánh giá hiệu suất kỹ năng**: Hiển thị tỷ lệ điểm, thanh tiến độ trực quan, huy hiệu độ tin cậy, biểu tượng xu hướng và nút "Luyện tập".
  4. **Danh mục lỗ hổng kiến thức**: Card chi tiết mức độ ưu tiên, bằng chứng thực tế, nút "Ôn bài học", nút "Luyện tập 5 câu", và nút "Hỏi AI Tutor".
  5. **Đề xuất học tập sư phạm**: Các khối khuyến nghị có phân cấp độ ưu tiên và hành động điều hướng trực tiếp.
  6. **Empty State**: Khi chưa có dữ liệu, hiển thị thông báo trung thực và nút chuyển tới `/practice`.

### 4.2. Giao diện Lộ trình học tập (`/learning-path`)
- Cung cấp bộ chuyển chế độ (Mode Switcher):
  - **Lộ trình thích ứng cá nhân (Thực chứng)**: Dẫn xuất trực tiếp từ các bài luyện tập của học sinh. Hiển thị Empty State nếu chưa làm bài.
  - **Khung chương trình GDPT 2018**: Hiển thị phân phối chương trình các giai đoạn học tập chuẩn.

### 4.3. Giao diện Sổ tay kiến thức cần củng cố (`/knowledge-gaps`)
- Hiển thị khối chuyên biệt: **"Lỗ hổng từ bài luyện tập thực tế"** với bằng chứng đo lường chính xác, liên kết trực tiếp sang bài học, phòng thi luyện tập và AI Tutor.

---

## 5. Kết quả Kiểm thử & Visual QA

### 5.1. Unit & Integration Tests (100% Pass)
```bash
$ bun run test
 ✓ src/services/personalization.test.ts (17 tests)
 ✓ src/pages/Practice/PracticeEngine.test.tsx (15 tests)
 ✓ src/pages/LearningAnalytics/LearningAnalyticsPage.test.tsx (5 tests)
 ✓ src/pages/KnowledgeGaps/KnowledgeGapsPage.test.tsx (3 tests)
 ...
 Test Files  43 passed (43)
      Tests  339 passed (339)
   Duration  40.88s
```
*Tất cả 24 yêu cầu kiểm thử trong Section 14 của đề bài đều được kiểm chứng tự động.*

### 5.2. Linter & Static Analysis
```bash
$ bun run lint
$ cd frontend && bun run lint
$ oxlint --deny-warnings
Found 0 warnings and 0 errors.
Finished in 414ms on 384 files with 116 rules using 8 threads.
```

### 5.3. Production Build
```bash
$ bun run build
$ tsc -b && vite build
✓ 2841 modules transformed.
dist/index.html                           1.08 kB │ gzip:   0.64 kB
dist/assets/index-YGv_K-Y6.js         2,162.80 kB │ gzip: 545.62 kB
dist/assets/index-BVuItSWE.css          416.42 kB │ gzip:  65.35 kB
✓ built in 1.27s
```

### 5.4. Bằng chứng Playwright Visual QA
Thư mục: [`docs/visual-qa/phase-13/`](file:///D:/TN/docs/visual-qa/phase-13/)

| STT | Tên tệp ảnh | Nội dung kiểm chứng | Độ phân giải |
| :--- | :--- | :--- | :--- |
| 1 | `01-analytics-empty-state-desktop.png` | Empty State trung thực tại `/learning-analytics` khi chưa có dữ liệu làm bài | Desktop (1440x900) |
| 2 | `02-analytics-empty-state-mobile.png` | Empty State responsive trên thiết bị di động | Mobile (390x844) |
| 3 | `03-learning-path-adaptive-empty.png` | Empty State của Lộ trình thích ứng tại `/learning-path` | Desktop (1440x900) |
| 4 | `04-analytics-populated-desktop.png` | Bảng điều khiển phân tích học tập sau khi có bài luyện tập thật (4 KPIs, bảng kỹ năng, confidence, trend) | Desktop (1440x900) |
| 5 | `05-knowledge-gaps-section.png` | Mục lỗ hổng kiến thức thực tế tại `/knowledge-gaps` kèm các nút hành động | Desktop (1440x900) |
| 6 | `06-personalized-recommendations.png` | Các đề xuất học tập có bằng chứng và thứ tự ưu tiên | Desktop (1440x900) |
| 7 | `07-adaptive-learning-path.png` | Lộ trình thích ứng cá nhân hóa 4 bước hành động tại `/learning-path` | Desktop (1440x900) |
| 8 | `08-adaptive-path-mobile.png` | Lộ trình thích ứng cá nhân hóa hiển thị trên Mobile | Mobile (390x844) |
| 9 | `09-recalculated-after-new-attempt.png` | Tự động tính toán lại lộ trình và phân tích sau khi nộp thêm bài luyện tập thứ 2 | Desktop (1440x900) |

---

## 6. Hạn chế Hiện tại & Khuyến nghị Phase 14

1. **Quy mô Ngân hàng câu hỏi**: Hiện tại ngân hàng có 22 câu hỏi Chương 1 Toán 12; cần tiếp tục mở rộng ngân hàng câu hỏi sang Chương 2 (Tọa độ trong không gian) và Chương 3 (Các số đặc trưng đo mức độ phân tán của mẫu số liệu ghép nhóm) để lộ trình học tập phủ rộng toàn bộ học kỳ 1.
2. **Đồng bộ hóa Đám mây (Cloud Sync)**: Kết quả luyện tập hiện lưu trữ tại LocalStorage của trình duyệt học sinh. Trong Phase 14 hoặc giai đoạn tích hợp FastAPI, cần xây dựng endpoint đồng bộ dữ liệu đánh giá và hồ sơ năng lực lên cơ sở dữ liệu PostgreSQL.

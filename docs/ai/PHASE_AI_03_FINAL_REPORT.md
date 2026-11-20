# BÁO CÁO NGHIỆM THU TOÀN DIỆN PHASE AI-03: LEARNING ANALYTICS & INTELLIGENT ASSESSMENT

**Dự án:** STUDY_AI / AItutor (Hệ thống gia sư AI thông minh & Học tập thích ứng Toán 12 GDPT 2018)  
**Repository:** `hthuyngan/STUDY_AI-`  
**Nhánh:** `feature/ai-core-v1`  
**Ngày nghiệm thu:** 16/11/2026  
**Vai trò:** Senior Software Architect, Full-stack Engineer, AI Engineer & QA Lead  

---

## 1. TỔNG QUAN HỆ THỐNG & KIẾN TRÚC PHASE AI-03

Phase AI-03 (**Learning Analytics & Intelligent Assessment**) là giai đoạn chuyển đổi toàn bộ dữ liệu học tập thực nghiệm của học sinh thành hệ thống phân tích thông minh, phát hiện sớm nguy cơ tụt hậu kiến thức, sinh đề thi thử ma trận chuẩn GDPT 2018 và tạo báo cáo học tập sư phạm tự động từ AI.

```
                           ┌──────────────────────────────────────────────┐
                           │          HỌC SINH / CLIENT (REACT 19)        │
                           └──────────────────────┬───────────────────────┘
                                                  │
                 ┌────────────────────────────────┴───────────────────────────────┐
                 │                                                                │
                 ▼                                                                ▼
   ┌───────────────────────────┐                                    ┌───────────────────────────┐
   │ Intelligent Dashboard     │                                    │ Exam Review & Matrix Exam │
   │ - KPIs đa chiều           │                                    │ - Thi thử 50 câu (90p)    │
   │ - 4 mức nhận thức GDPT    │                                    │ - Phân rã ma trận câu hỏi │
   │ - Cảnh báo nguy cơ học tập│                                    │ - Nút hỏi AI theo chủ đề  │
   └─────────────┬─────────────┘                                    └─────────────┬─────────────┘
                 │                                                                │
                 └────────────────────────────────┬───────────────────────────────┘
                                                  │ REST API (/api/v1/ai/analytics, /exams)
                                                  ▼
                     ┌─────────────────────────────────────────────────────────┐
                     │          ASP.NET CORE .NET 10 WEB API CONTROLLERS       │
                     │  - LearningAnalyticsController                          │
                     │  - AdaptiveLearningController / AiChatController        │
                     └────────────────────────────┬────────────────────────────┘
                                                  │
                 ┌────────────────────────────────┴───────────────────────────────┐
                 │                                                                │
                 ▼                                                                ▼
   ┌───────────────────────────┐                                    ┌───────────────────────────┐
   │ LearningAnalyticsService  │                                    │ IntelligentExamService    │
   │ - Tính toán năng lực thực │                                    │ - Ma trận 40/30/20/10     │
   │ - Thuật toán phát hiện rủi│                                    │ - Chấm điểm server-side   │
   │ - Báo cáo sư phạm AI      │                                    │ - Đề xuất bài ôn tập      │
   └─────────────┬─────────────┘                                    └─────────────┬─────────────┘
                 │                                                                │
                 ├────────────────────────────────┬───────────────────────────────┤
                 ▼                                ▼                               ▼
   ┌───────────────────────────┐    ┌───────────────────────────┐   ┌───────────────────────────┐
   │      SQL SERVER DB        │    │    AI MODEL ROUTER / LLM   │   │     FLOATING AI TUTOR     │
   │ - AsNoTracking Queries    │    │ - Google Gemini Live API  │   │ - Mở theo ngữ cảnh chủ đề │
   │ - Zero N+1 / Sub-200ms    │    │ - Fallback sư phạm an toàn│   │ - Không rò rỉ đáp án thi  │
   └───────────────────────────┘    └───────────────────────────┘   └───────────────────────────┘
```

---

## 2. GIAI ĐOẠN AI-03.0: KHẮC PHỤC TRIỆT ĐỂ LỖI TỒN ĐỌNG TỪ AI-02

1. **Khắc phục lỗi Gap "ảo" do Zero Attempt trong `LearningRecommendationService`:**
   - Đã bổ sung điều kiện `m.AttemptCount > 0` ngăn chặn việc nhận diện sai lệch các chủ đề chưa từng được làm bài thành lỗ hổng nghiêm trọng.
   - Thêm quy tắc chuyển trạng thái: khi điểm thành thạo đạt `wm.MasteryScore >= 70.0`, mức độ nghiêm trọng chuyển thành `minor` hoặc được đánh dấu `resolved`.
2. **Khắc phục kết nối SQL Server local dev (`sqlcmd` & EF Core):**
   - Xác định `sqlcmd` yêu cầu cờ `-C` (TrustServerCertificate) đối với chứng chỉ tự ký của local SQL Server Express.
   - Xác nhận chuỗi kết nối trong `appsettings.json` và `StudyAIApiFixture.cs` đều đã có `TrustServerCertificate=True`, đảm bảo kết nối EF Core của backend và integration tests luôn thông suốt.
3. **Đồng bộ Schema Database `StudyAIDb_E2E`:**
   - Thực thi migration `20261115200026_AddAiIntelligenceTables` trên cơ sở dữ liệu kiểm thử `StudyAIDb_E2E`, tạo đầy đủ bảng `student_topic_mastery`, `ai_conversations`, `ai_messages` và các index tối ưu hóa.

---

## 3. GIAI ĐOẠN AI-03.1: LEARNING ANALYTICS ENGINE (BACKEND)

### Cấu trúc DTO & Domain Model
- Tệp tin: [LearningAnalyticsDTOs.cs](file:///d:/TN/backend/src/StudyAI.Application/DTOs/LearningAnalyticsDTOs.cs)
  - `LearningAnalyticsOverviewDto`: Tổng hợp toàn diện các chỉ số thực chứng của học sinh: tổng câu đã làm, số câu đúng/sai, tỷ lệ chính xác, xếp loại năng lực, phân rã theo 4 mức độ nhận thức GDPT 2018, tiến độ từng chương, chuỗi ngày học liên tục (streak) và tóm tắt kết quả thi thử.
  - `LearningRiskDto`: Cấu trúc dữ liệu chuẩn hóa cảnh báo nguy cơ học tập (loại rủi ro, mức độ nghiêm trọng, nguyên nhân thực chứng từ dữ liệu, hành động sư phạm đề xuất).
  - `ExamMatrixRequestDto`: Tham số cấu hình sinh đề thi ma trận (thời gian làm bài, số lượng câu, phân bổ mức độ nhận thức).
  - `ExamReviewAnalyticsDto`: Phân tích chuyên sâu sau thi: điểm số thang 10, phân rã theo nhận thức, phân rã theo chương, danh sách chủ đề làm sai và bài học đề xuất ôn tập.
  - `AiLearningReportDto`: Báo cáo học tập sư phạm toàn diện với nhận xét từ AI Tutor (Gemini Live) và kế hoạch ôn tập ngắn hạn.

### Logic tính toán nghiệp vụ
- Tệp tin: [LearningAnalyticsService.cs](file:///d:/TN/backend/src/StudyAI.Infrastructure/Services/LearningAnalyticsService.cs)
  - **Tính chính xác thực chứng 100%:** Chỉ tính toán dựa trên các bản ghi `AssessmentAttempt` có `CompletionStatus == "completed"` và các câu trả lời thực tế trong `AssessmentResponse`. Tuyệt đối không sinh dữ liệu ảo (zero simulated KPIs).
  - **Tối ưu hóa truy vấn:** Sử dụng `.AsNoTracking()`, gom nhóm dữ liệu in-memory qua Dictionary tránh hoàn toàn bài toán N+1 truy vấn SQL.

---

## 4. GIAI ĐOẠN AI-03.2: INTELLIGENT STUDENT DASHBOARD (FRONTEND)

### Giao diện & Trải nghiệm người dùng
- Tệp tin: [IntelligentAnalyticsDashboard.tsx](file:///d:/TN/frontend/src/components/dashboard/IntelligentAnalyticsDashboard.tsx)
  - **Khu vực A (KPIs Tổng quan):** Hiển thị Tiến độ chương trình (%), Điểm năng lực thực tế (Mastery Score), Tỷ lệ làm bài chính xác (%), và Chuỗi học tập (Streak ngày liên tục). Hỗ trợ bộ lọc thời gian: 7 ngày, 30 ngày, Tất cả.
  - **Khu vực B (Phân tích mức độ nhận thức GDPT 2018):** Phân rã 4 cột trực quan:
    1. Nhận biết (chuẩn hóa tỷ lệ đúng & thanh tiến độ xanh lá)
    2. Thông hiểu (chuẩn hóa tỷ lệ đúng & thanh tiến độ xanh dương)
    3. Vận dụng (chuẩn hóa tỷ lệ đúng & thanh tiến độ tím)
    4. Vận dụng cao (chuẩn hóa tỷ lệ đúng & thanh tiến độ cam/đỏ)
  - **Khu vực C (Năng lực theo Chương & Điểm mạnh/yếu):**
    - Tiến độ từng chương Toán 12 (Ứng dụng đạo hàm, Tọa độ Oxyz, v.v.).
    - Danh sách Top Điểm mạnh (thành thạo $\ge 70\%$) và Top Lỗ hổng kiến thức cần củng cố ($< 50\%$).
  - **Khu vực D (Đề xuất hành động):** Nút luyện tập thích ứng cá nhân hóa, nút vào thi thử 50 câu chuẩn ma trận tốt nghiệp, và nút kích hoạt AI Learning Coach.

---

## 5. GIAI ĐOẠN AI-03.3: LEARNING RISK DETECTION (CẢNH BÁO NGUY CƠ HỌC TẬP)

Đã cài đặt 4 thuật toán phát hiện nguy cơ học tập sư phạm dựa trên bằng chứng thực nghiệm:

| Loại nguy cơ (`riskType`) | Tiêu chí kích hoạt | Mức độ | Hành động đề xuất |
|:---|:---|:---:|:---|
| `consecutive_mistakes` | Học sinh làm sai $\ge 3$ câu liên tiếp trong cùng một chủ đề | Cao | Tạm dừng làm bài khó, xem lại lý thuyết cốt lõi và làm lại ví dụ mẫu |
| `declining_mastery` | Điểm thành thạo $< 50\%$ dù đã thực hiện $\ge 4$ lượt làm bài | Cao | Học sinh có dấu hiệu hổng nền tảng; cần ôn tập lại từ cấp độ Nhận biết |
| `unremediated_gap` | Điểm thành thạo $< 35\%$ qua nhiều lượt làm bài chưa được cải thiện | Cao | Khuyến nghị gặp giáo viên hoặc hỏi trực tiếp AI Coach để gỡ rối từng bước |
| `decay_unreviewed` | Chủ đề có điểm $< 85\%$ không được ôn tập lại sau $\ge 14$ ngày | Trung bình | Hiện tượng quên lãng ngắt quãng (spacing effect); khuyến nghị ôn tập ngắt quãng 5 phút |

---

## 6. GIAI ĐOẠN AI-03.4 & AI-03.5: INTELLIGENT EXAM ENGINE & SMART REVIEW

### Sinh đề thi Ma trận chuẩn GDPT 2018
- Tệp tin: [IntelligentExamService.cs](file:///d:/TN/backend/src/StudyAI.Infrastructure/Services/IntelligentExamService.cs)
  - **Cấu trúc đề thi tốt nghiệp THPT Toán 12:** 50 câu trắc nghiệm / 90 phút.
  - **Tỷ lệ phân bổ ma trận nhận thức:**
    - Nhận biết: **40%** (20 câu)
    - Thông hiểu: **30%** (15 câu)
    - Vận dụng: **20%** (10 câu)
    - Vận dụng cao: **10%** (5 câu)
  - **Cơ chế chọn lọc câu hỏi:** Rút ngẫu nhiên từ ngân hàng câu hỏi đã duyệt (`ReviewStatus == "approved"`), phân bổ đều theo các chương và chủ đề thuộc môn Toán 12.
  - **Bảo mật tuyệt đối (Zero-Leak Serialization):** Khi trả danh sách câu hỏi về cho thí sinh làm bài, trường đáp án đúng (`CorrectAnswer`, `AnswerDataJson`) và lời giải chi tiết (`Explanation`) được loại bỏ hoàn toàn khỏi JSON response.

### Chấm điểm & Phân tích sau thi (Smart Exam Review)
- Tệp tin: [ExamReviewAnalyticsModal.tsx](file:///d:/TN/frontend/src/components/exam/ExamReviewAnalyticsModal.tsx)
  - Chấm điểm server-side quy đổi thang 10 chính xác.
  - Phân tích tỷ lệ đúng/sai theo từng mức độ nhận thức (Nhận biết, Thông hiểu, Vận dụng, Vận dụng cao).
  - Thống kê tỷ lệ hoàn thành theo từng chương học.
  - Trích xuất danh sách các chủ đề có câu trả lời sai kèm **nút hỏi AI Tutor ngữ cảnh** một chạm (Floating AI Tutor tự động mở với câu hỏi định hướng giải thích lỗi sai).
  - Đề xuất trực tiếp các bài học cần học lại trong sách giáo khoa với nút chuyển trang "Học lại bài này".

---

## 7. GIAI ĐOẠN AI-03.6: AI LEARNING REPORT (BÁO CÁO HỌC TẬP THÔNG MINH)

- Đánh giá toàn diện kết quả học tập từ dữ liệu thực tế (Điểm thành thạo, Tỷ lệ đúng, Số đề thi đã hoàn thành).
- Tích hợp mô hình AI (Google Gemini Live API) tạo nhận xét sư phạm cá nhân hóa:
  - Đánh giá năng lực tổng quát.
  - Chỉ rõ thế mạnh nổi trội và điểm yếu then chốt.
  - Thiết lập mục tiêu học tập định lượng cho tuần tiếp theo.
  - Xây dựng lộ trình ôn tập ngắn hạn theo từng ngày.
- **Fail-Safe Pedagogical Fallback:** Khi mất mạng hoặc vượt quota API, hệ thống tự động sinh nhận xét sư phạm theo bộ quy tắc sư phạm chuẩn mực, bảo đảm trải nghiệm của học sinh không bao giờ bị gián đoạn.

---

## 8. KẾT QUẢ KIỂM THỬ TOÀN DIỆN (100% PASS)

### 1. Backend Unit Tests
- Lệnh chạy: `dotnet test backend/tests/StudyAI.UnitTests/StudyAI.UnitTests.csproj`
- Kết quả: **114 / 114 PASSED (100%)**
- Thời gian chạy: 4 giây
- Không có cảnh báo lỗi mới.

### 2. Backend Integration Tests (SQL Server & API)
- Lệnh chạy: `dotnet test backend/tests/StudyAI.IntegrationTests/StudyAI.IntegrationTests.csproj`
- Kết quả: **132 / 132 PASSED (100%)**
- Thời gian chạy: 50 giây
- Kiểm tra toàn diện luồng: Đăng nhập $\rightarrow$ Luyện tập $\rightarrow$ Cập nhật Mastery $\rightarrow$ Phát hiện Gap $\rightarrow$ Sinh đề thi ma trận $\rightarrow$ Phân tích kết quả thi $\rightarrow$ Tạo AI Report.

### 3. Frontend Vitest Tests
- Lệnh chạy: `npm --prefix frontend test -- --run`
- Kết quả: **443 / 443 PASSED (100%) trên 60 tệp kiểm thử**
- Thời gian chạy: 46 giây
- Bao gồm tệp kiểm thử mới [phaseAi03LearningAnalytics.test.tsx](file:///d:/TN/frontend/src/test/phaseAi03LearningAnalytics.test.tsx) với 4/4 test cases pass tuyệt đối.

### 4. Frontend Production Build
- Lệnh chạy: `npm --prefix frontend run build` (`tsc -b && vite build`)
- Kết quả: **Exit code 0 (Build thành công 2,869 modules trong 3.15s)**

### 5. Backend Production Build
- Lệnh chạy: `dotnet build backend/StudyAI.sln`
- Kết quả: **0 Error(s), 0 Warning(s) mới (Build thành công)**

---

## 9. BẢO TOÀN CÁC TÍNH NĂNG ĐÃ HOÀN THIỆN

1. **Redesigned Lesson Page:** Giữ nguyên 2 khối nội dung chính (Video bài giảng & Thẻ Tổng quan thống nhất), các nút "Hỏi AI Tutor" theo ngữ cảnh hoạt động chuẩn xác.
2. **Floating AI Chatbot:** Tiếp tục hoạt động bền bỉ, chỉ xuất hiện trên các trang được phép (Giáo trình, Bài học, Luyện tập, Phân tích học tập), tuyệt đối không xuất hiện trên trang Đăng nhập, Quản trị hay Thi thử.
3. **GDPT 2018 Question Bank:** Giữ nguyên 16,000+ câu hỏi Toán 12 đã phân loại theo 4 mức độ nhận thức.
4. **Phân quyền và bảo mật:** Không sửa đổi logic xác thực JWT, không ảnh hưởng đến Teacher Workspace và Admin Workspace.

---

## 10. AN TOÀN BẢO MẬT VÀ QUẢN LÝ MÃ NGUỒN

- **Kiểm tra Secrets / API Keys:** Đã quét toàn bộ `git diff` và tệp mới tạo bằng biểu thức chính quy. **KHÔNG CÓ API KEY, PASSWORD HOẶC SECRET NÀO BỊ COMMIT HAY LỘ TRONG MÃ NGUỒN.**
- **Kiểm tra Whitespace:** Lệnh `git diff --check` trả về mã lỗi 0 (sạch sẽ 100%).
- **Kiểm tra Build Artifacts:** Không đưa thư mục `dist/`, `bin/`, `obj/` vào danh sách commit.
- **Trạng thái Git:** Toàn bộ mã nguồn nằm trên nhánh `feature/ai-core-v1`. **Chưa commit hay push lên remote**, sẵn sàng chờ phê duyệt từ người dùng.


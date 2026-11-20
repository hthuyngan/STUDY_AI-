# STUDY_AI — PHASE AI-01 ARCHITECTURE SPECIFICATION
**Tài liệu Kiến trúc Hệ thống Trợ lý Học tập Thông minh (Intelligent Learning System)**
*Phiên bản: 1.0 — Ngày lập: 16/11/2026 — Nhánh Git: feature/ai-core-v1*

---

## 1. TỔNG QUAN HỆ THỐNG HIỆN TẠI VÀ KẾT QUẢ KIỂM TOÁN (AUDIT)

### 1.1 Khảo sát hiện trạng Công nghệ
- **Frontend**: React 18 + TypeScript + Vite + KaTeX + TailwindCSS/CSS Modules.
- **Backend**: ASP.NET Core (.NET 10) RESTful Web API, phân tầng Clean Architecture (`StudyAI.Api`, `StudyAI.Application`, `StudyAI.Domain`, `StudyAI.Infrastructure`).
- **Cơ sở dữ liệu**: Microsoft SQL Server (`.\\SQLEXPRESS`, database: `StudyAIDb`).
- **Bảo mật & Phân quyền**: JWT Bearer Tokens (`sub`, `role`), Refresh Token xoay vòng (rotating refresh cookies/sessions), RBAC (`learner`, `teacher`, `admin`, `content_manager`).
- **Nội dung giáo trình**: Toán lớp 12 - Bộ sách *Kết nối tri thức với cuộc sống* (6 chương, 12 chủ đề, bài học có công thức LaTeX và video YouTube bài giảng).
- **Hệ thống đánh giá**: Ngân hàng câu hỏi trắc nghiệm GDPT 2018 (`ContentQuestions`), phiên luyện tập (`assessment_attempts`), chi tiết câu trả lời (`assessment_responses`).
- **Vấn đề Popup đồng bộ tiến độ**: Đã được **xóa bỏ triệt để ở cấp gốc** trong phiên trước (không còn `MigrationDialog` hay `checkAndPromptMigration`), dữ liệu tiến độ người dùng được tải trực tiếp từ SQL Server sau khi đăng nhập và cách ly tuyệt đối giữa các tài khoản.

### 1.2 Các thành phần AI đã tồn tại
- `ai_conversations` & `ai_messages` đã có trong database và EF Core.
- `AiChatController` hỗ trợ CRUD hội thoại AI và gửi tin nhắn gia sư AI.
- `AiTutorService` hỗ trợ xây dựng system prompt sư phạm bám sát ngữ cảnh bài học (`ContentLesson`).
- `OpenAiLlmProvider` hỗ trợ kết nối API OpenAI hoặc API tương thích OpenAI, có cơ chế che giấu dữ liệu nhạy cảm (`MaskSensitiveData`).
- `FakeLlmProvider` phục vụ môi trường kiểm thử tự động và phát triển cục bộ không phát sinh chi phí.
- `AdaptiveLearningController` hỗ trợ bước đầu gợi ý 3 cấp độ, đánh giá năng lực cơ bản và đề xuất lộ trình.

### 1.3 Khoảng trống cần hoàn thiện trong Phase AI-01
1. **Lưu trữ & Truy vết Sử dụng (Usage Tracking)**: Chưa có bảng lưu log token tiêu thụ, chi phí ước tính và nhật ký sử dụng của từng tính năng AI (`ai_usage_logs`).
2. **Theo dõi sử dụng Hint (Hint Tracking)**: Chưa có bảng lưu lịch sử học sinh mở gợi ý từng câu hỏi (`ai_hint_usage`) để làm đầu vào cho thuật toán chấm điểm năng lực.
3. **Mô hình Năng lực Thực tế (Student Topic Mastery)**: Cần bảng `student_topic_mastery` lưu trữ trạng thái năng lực chuẩn xác theo từng chủ đề/kỹ năng (`insufficient_data`, `needs_reinforcement`, `progressing`, `proficient`, `mastered`).
4. **Đề xuất Học tập Đã xác thực (Learning Recommendations)**: Cần bảng `ai_learning_recommendations` lưu các đề xuất bài học tiếp theo và bài ôn tập dựa trên bài học có thật trong CSDL.
5. **Phân tích Lỗi sai (AI Error Analysis)**: Cần dịch vụ chuyên trách phân tích nguyên nhân sai lầm dựa trên dữ liệu làm bài thực tế của học sinh (`AssessmentResponse`), phân biệt lỗi suy đoán và lỗi xác nhận, gợi ý phương pháp giải đúng.
6. **Kiểm soát Bảo mật & Quyền truy cập Hint**: Kiểm tra chế độ làm bài (bài thi chính thức không được mở gợi ý AI).
7. **Giao diện Người dùng (Frontend UX)**:
   - Tích hợp khay gợi ý 3 cấp độ vào thẻ câu hỏi làm bài (`PracticeQuestionCard`).
   - Tích hợp khối phân tích lỗi sai AI vào trang kết quả làm bài (`PracticeResultPage`).
   - Tích hợp biểu đồ năng lực chủ đề và lộ trình đề xuất vào Dashboard.
   - Thêm trang Quản trị AI (`AdminAiDashboard`) cho Admin theo dõi token, chi phí và cấu hình bật/tắt tính năng.

---

## 2. KIẾN TRÚC MỤC TIÊU PHASE AI-01

```
┌────────────────────────────────────────────────────────────────────────┐
│                        REACT FRONTEND (STUDENT & ADMIN)               │
│                                                                        │
│  [Lesson AI Tutor]    [Practice AI Hint]    [AI Error Analysis Card]  │
│  [Topic Mastery Radar][Adaptive Path]       [Admin AI Management]     │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │ HTTPS + JWT Bearer
                                    ▼
┌────────────────────────────────────────────────────────────────────────┐
│                        ASP.NET CORE WEB API                           │
│                                                                        │
│  [AiChatController]   [AdaptiveLearningController]  [AiAdminController]│
│  - /conversations     - /hints (Level 1,2,3)        - /status         │
│  - /messages          - /error-analysis             - /usage-stats    │
│  - /chat              - /mastery                    - /config         │
│                       - /learning-path                                 │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │
┌───────────────────────────────────▼────────────────────────────────────┐
│                  APPLICATION & ORCHESTRATION LAYER                     │
│                                                                        │
│  IAiTutorService             IAiHintService         IAiAnalysisService │
│  IStudentMasteryService      ILearningRecommendationService            │
│  IAiUsageService             ILlmProvider (OpenAI / Fake Mock)         │
│                                                                        │
│  - Resilience: Polly Timeout, Exponential Backoff, CancellationTokens  │
│  - Security: JWT Validation, Ownership Check, Prompt Injection Defense │
│  - Token Budget: Quotas, Per-feature Tracking, Redaction               │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │
┌───────────────────────────────────▼────────────────────────────────────┐
│                    SQL SERVER DATABASE (StudyAIDb)                    │
│                                                                        │
│  ai_conversations            ai_messages                               │
│  ai_usage_logs (NEW)         student_topic_mastery (NEW)               │
│  ai_learning_recommendations (NEW)                                     │
│  ai_hint_usage (NEW)                                                   │
│  content_lessons / topics / questions / assessment_responses           │
└────────────────────────────────────────────────────────────────────────┘
```

---

## 3. THIẾT KẾ DỮ LIỆU SQL SERVER (AI DATA SCHEMA)

### 3.1 Bảng `ai_usage_logs`
Ghi nhận mọi lượt gọi mô hình ngôn ngữ lớn để phục vụ kiểm toán chi phí, giám sát hiệu năng và giới hạn hạn mức người dùng:
- `Id` (NVARCHAR(64), Primary Key)
- `UserId` (NVARCHAR(64), Foreign Key -> users(Id))
- `Feature` (NVARCHAR(32), e.g. `tutor_chat`, `hint_level_1`, `hint_level_2`, `hint_level_3`, `error_analysis`, `recommendation`)
- `Provider` (NVARCHAR(32), e.g. `OpenAI`, `FakeLlmProvider`)
- `Model` (NVARCHAR(64), e.g. `gpt-4o-mini`, `fake-pedagogical-v1`)
- `InputTokens` (INT)
- `OutputTokens` (INT)
- `EstimatedCostUsd` (DECIMAL(10, 6))
- `LatencyMs` (INT)
- `Status` (NVARCHAR(32), e.g. `success`, `timeout`, `error`)
- `ErrorMessage` (NVARCHAR(500), nullable)
- `CreatedAt` (DATETIMEOFFSET)

### 3.2 Bảng `student_topic_mastery`
Lưu trữ hồ sơ năng lực xác định (Deterministic Competency Profiling) theo từng chủ đề môn học:
- `Id` (NVARCHAR(64), Primary Key)
- `UserId` (NVARCHAR(64), Foreign Key -> users(Id))
- `SubjectId` (NVARCHAR(64), Foreign Key -> content_subjects(Id))
- `TopicId` (NVARCHAR(64), nullable, Foreign Key -> content_topics(Id))
- `TopicName` (NVARCHAR(255))
- `AttemptCount` (INT, số câu đã làm)
- `CorrectCount` (INT, số câu trả lời đúng)
- `HintCount` (INT, số lần sử dụng gợi ý trong chủ đề này)
- `MasteryScore` (FLOAT, 0.0 -> 100.0)
- `Status` (NVARCHAR(32), e.g. `insufficient_data`, `needs_reinforcement`, `progressing`, `proficient`, `mastered`)
- `LastAttemptAt` (DATETIMEOFFSET, nullable)
- `UpdatedAt` (DATETIMEOFFSET)

### 3.3 Bảng `ai_hint_usage`
Ghi nhận từng lần học sinh mở gợi ý theo cấp độ để đảm bảo tính minh bạch và đánh giá trung thực:
- `Id` (NVARCHAR(64), Primary Key)
- `UserId` (NVARCHAR(64), Foreign Key -> users(Id))
- `QuestionId` (NVARCHAR(64), Foreign Key -> content_questions(Id))
- `SessionId` (NVARCHAR(64), nullable)
- `HintLevel` (INT, 1: Approach, 2: Method/Steps, 3: Key Transformation)
- `CreatedAt` (DATETIMEOFFSET)

### 3.4 Bảng `ai_learning_recommendations`
Lưu vết các đề xuất bài học tiếp theo và bài ôn củng cố:
- `Id` (NVARCHAR(64), Primary Key)
- `UserId` (NVARCHAR(64), Foreign Key -> users(Id))
- `LessonId` (NVARCHAR(64), Foreign Key -> content_lessons(Id))
- `TopicId` (NVARCHAR(64), nullable)
- `Reason` (NVARCHAR(500))
- `Priority` (NVARCHAR(32), e.g. `high`, `medium`, `standard`)
- `Status` (NVARCHAR(32), e.g. `pending`, `accepted`, `completed`, `dismissed`)
- `CreatedAt` (DATETIMEOFFSET)

---

## 4. CHIẾN LƯỢC SƯ PHẠM VÀ AN TOÀN AI (AI SAFETY & PEDAGOGY)

1. **Phương pháp Socratic & Bậc thang Gợi ý**:
   - Level 1: Định hướng tư duy, nhận diện dạng toán và nhắc định lý liên quan. Tuyệt đối không hé lộ đáp số.
   - Level 2: Phương pháp tổng quát, các bước biến đổi trung gian và công thức áp dụng.
   - Level 3: Mấu chốt biến đổi bước cuối. Chỉ áp dụng cho chế độ luyện tập tự do; khóa hoàn toàn ở chế độ kiểm tra đánh giá/thi thử.
2. **Không để AI tự bịa số liệu**:
   - Điểm số và tỷ lệ làm bài hoàn toàn tính từ grading engine backend (`scoringEngine.ts` / `PracticeController`).
   - Mọi đề xuất bài học (`LessonId`) phải đối chiếu và tồn tại trong bảng `content_lessons`.
3. **Phòng chống Tiêm mã Prompt (Prompt Injection Defense)**:
   - Nội dung học sinh nhập và nội dung câu hỏi trắc nghiệm được đóng gói trong trường dữ liệu có rào phân cách (delimiters).
   - System instruction luôn giữ quyền tối thượng, nghiêm cấm người dùng ép mô hình đổi vai trò, tiết lộ API key hoặc truy vấn dữ liệu trái phép.
4. **Bảo mật Thông tin Xác thực**:
   - Khóa bí mật (`Llm:ApiKey`) được đọc từ biến môi trường `STUDY_AI_LLM_API_KEY` hoặc cấu hình máy chủ an toàn.
   - Tuyệt đối không gửi API key về frontend; mặt nạ (`***REDACTED***`) được tự động áp dụng cho các thông báo lỗi nếu có.

---

## 5. KẾ HOẠCH TRIỂN KHAI VÀ TÍCH HỢP

- **Module A**: Khởi tạo Schema DB, Entities, DbContext và Migration trong `StudyAI.Domain` & `StudyAI.Infrastructure`.
- **Module B**: Triển khai tầng Application Services (`AiUsageService`, `AiHintService`, `AiAnalysisService`, `StudentMasteryService`, `LearningRecommendationService`).
- **Module C**: Cập nhật Controllers API và cấu hình bảo mật.
- **Module D**: Triển khai Unit Tests backend đảm bảo 100% logic đạt chuẩn.
- **Module E**: Nâng cấp Frontend (Khay AI Hint trong `PracticeQuestionCard`, AI Error Analysis trong `PracticeResultPage`, Dashboard Mastery & Learning Path, Trang Quản trị AI).
- **Module F**: Kiểm thử hồi quy và E2E bằng Playwright, xác minh toàn bộ luồng học viên.
- **Module G**: Commit Git, push nhánh `feature/ai-core-v1` và lập báo cáo `docs/ai/AI01_IMPLEMENTATION_REPORT.md`.


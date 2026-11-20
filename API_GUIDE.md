# STUDY_AI — HƯỚNG DẪN KIẾN TRÚC API & TÀI LIỆU OPENAPI / SWAGGER UI

Tài liệu này dành cho **AI Agent**, **Kỹ sư Backend**, và **Kỹ sư Frontend** để tra cứu, điều hướng, và kiểm thử toàn bộ hệ thống API của nền tảng STUDY_AI theo chuẩn chương trình GDPT 2018.

---

## 1. THÔNG TIN TRUY CẬP VÀ MÔI TRƯỜNG

| Mục | Địa chỉ / Cấu hình | Mô tả |
| :--- | :--- | :--- |
| **Swagger UI Explorer** | `http://localhost:8000/swagger` | Giao diện đồ họa tương tác, kiểm thử trực tiếp các API |
| **OpenAPI 3.x Document** | `http://localhost:8000/openapi/v1.json` | Định dạng JSON OpenAPI chuẩn hóa phục vụ AI Agent đọc và sinh code |
| **Môi trường hoạt động** | `Development` only | Swagger UI và OpenAPI spec chỉ kích hoạt trong môi trường Development (`app.Environment.IsDevelopment()`) |
| **Base URL API** | `http://localhost:8000/api/v1` | Chuẩn tiền tố cho toàn bộ tài nguyên nghiệp vụ |
| **Cơ chế xác thực** | `Authorization: Bearer <token>` | JWT Access Token thời hạn 30 phút, phát hành bởi `JwtTokenService` |

---

## 2. HƯỚNG DẪN XÁC THỰC JWT BEARER CHO AGENT & DEVELOPER

### 2.1. Phân quyền và các vai trò (Roles)
Hệ thống sử dụng Role-Based Access Control (RBAC):
- `admin`: Toàn quyền hệ thống, quản lý người dùng, xem audit log (`AdminOnly`).
- `content`: Biên tập viên chương trình học, duyệt môn/chương/bài/câu hỏi (`ContentStaff`).
- `teacher`: Giáo viên tạo lớp học, giao bài tập, chấm điểm tự luận.
- `student`: Học sinh tham gia học tập, luyện tập trắc nghiệm, nhận hỗ trợ từ AI Tutor.
- `support`: Nhân viên hỗ trợ người dùng.

### 2.2. Luồng lấy Token và kiểm thử trên Swagger UI
1. Gọi `POST /api/v1/auth/login` với thông tin đăng nhập:
   ```json
   {
     "email": "content@studyai.internal",
     "password": "Content@123456"
   }
   ```
2. Nhận kết quả JSON chứa `accessToken`:
   ```json
   {
     "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
     "tokenType": "bearer",
     "expiresIn": 1800,
     "user": { ... }
   }
   ```
3. Bấm nút **Authorize 🔓** ở góc trên bên phải Swagger UI.
4. Nhập chuỗi `accessToken` vào ô Value (không cần gõ tiền tố `Bearer `, Swagger đã tự động thêm tiền tố HTTP).
5. Swagger UI sẽ lưu token qua các lần tải trang nhờ cấu hình `EnablePersistAuthorization()`.

---

## 3. BẢN ĐỒ KIẾN TRÚC ENDPOINT, CONTROLLER, DTO VÀ SERVICE

Hệ thống hiện phát hiện **121 API Operations** được phân nhóm thành **15 Domain chính**:

```
backend/src/
├── StudyAI.Api/
│   └── Controllers/
│       ├── AuthController.cs            <--> Nhóm 1: Xác thực & Quản lý phiên
│       ├── CurriculumController.cs      <--> Nhóm 2: Chương trình học cho Học sinh
│       ├── PracticeController.cs        <--> Nhóm 3: Luyện tập thích ứng & Ngân hàng câu hỏi
│       ├── AdaptiveLearningController.cs<--> Nhóm 4: Đánh giá năng lực & AI Gợi ý
│       ├── AiChatController.cs          <--> Nhóm 5: Trò chuyện và hướng dẫn với AI Tutor
│       ├── ContentController.cs         <--> Nhóm 6: Quản lý Nội dung & Ngân hàng câu hỏi
│       ├── CurriculumImportController.cs<--> Nhóm 7: Nhập khẩu dữ liệu SGK / JSON
│       ├── ClassroomsController.cs      <--> Nhóm 8: Quản lý Lớp học trực tuyến
│       ├── AssignmentsController.cs     <--> Nhóm 9: Giao bài tập & Chấm điểm
│       ├── LearningDataControllers.cs   <--> Nhóm 10, 11, 12: Tiến độ & Nhật ký học tập
│       ├── MeController.cs              <--> Nhóm 13: Dữ liệu cá nhân của người dùng đăng nhập
│       ├── AdminController.cs           <--> Nhóm 14: Quản trị tài khoản & Hệ thống
│       └── HealthController.cs          <--> Nhóm 15: Kiểm tra trạng thái máy chủ & DB
├── StudyAI.Application/
│   ├── Common/Interfaces/               <--> IApplicationDbContext, ILlmProvider, IAiTutorService
│   ├── DTOs/                            <--> Toàn bộ Data Transfer Objects
│   └── Services/                        <--> PasswordHasher, JwtTokenService, ImportParsers
├── StudyAI.Domain/
│   └── Entities/                        <--> Question, Subject, Chapter, Lesson, User, Session
└── StudyAI.Infrastructure/
    ├── Persistence/StudyAIDbContext.cs  <--> EF Core Database Context (SQL Server)
    └── Services/AiTutorService.cs       <--> Tích hợp mô hình AI Tutor
```

---

### BẢNG TRA CỨU CHI TIẾT THEO MODULE

| Nhóm | Controller | File Path | DTO liên quan | Service / Repository | Ghi chú & Quyền hạn |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Auth** | `AuthController` | `Controllers/AuthController.cs` | `LoginRequest`, `RegisterRequest`, `TokenResponse` | `IJwtTokenService`, `IPasswordHasher` | Đăng ký, đăng nhập, refresh token, xem profile |
| **Curriculum** | `CurriculumController` | `Controllers/CurriculumController.cs` | `SubjectDto`, `LessonDto`, `QuestionDto` | `IApplicationDbContext` | Public API cho học sinh tra cứu môn, chương, bài |
| **Practice** | `PracticeController` | `Controllers/PracticeController.cs` | `StartSessionRequest`, `SubmitAnswerRequest` | `IApplicationDbContext` | Luyện tập thích ứng, trắc nghiệm từ kho VNHSGE |
| **Adaptive Learning** | `AdaptiveLearningController` | `Controllers/AdaptiveLearningController.cs` | `HintRequest`, `HintResponse`, `MasterySummary` | `IAiTutorService` | Bản đồ năng lực, phát hiện lỗ hổng kiến thức |
| **AI Chat** | `AiChatController` | `Controllers/AiChatController.cs` | `SendMessageRequest`, `ChatConversationDto` | `IAiTutorService`, `ILlmProvider` | Hội thoại với gia sư AI theo từng câu hỏi / bài học |
| **Content** | `ContentController` | `Controllers/ContentController.cs` | `CreateQuestionDto`, `SubjectDetailDto` | `IApplicationDbContext` | Quyền `ContentStaff`: Thêm sửa xóa duyệt câu hỏi |
| **Curriculum Import** | `CurriculumImportController` | `Controllers/CurriculumImportController.cs` | `ImportPreviewRequest`, `ConfirmImportRequest` | `ICurriculumImportValidator` | Quyền `ContentStaff`: Import dữ liệu cấu trúc SGK |
| **Classrooms** | `ClassroomsController` | `Controllers/ClassroomsController.cs` | `CreateClassroomRequest`, `ClassroomDto` | `IApplicationDbContext` | Quyền `teacher`: Quản lý danh sách lớp học |
| **Assignments** | `AssignmentsController` | `Controllers/AssignmentsController.cs` | `CreateAssignmentRequest`, `GradeSubmissionRequest` | `IApplicationDbContext` | Quyền `teacher` / `student`: Nộp bài & chấm bài |
| **Learning Progress** | `LearningDataControllers` | `Controllers/LearningDataControllers.cs` | `LessonProgressDto`, `LearningEventBatchDto` | `IApplicationDbContext` | Lưu trữ sự kiện học tập và lịch sử làm bài |
| **Me** | `MeController` | `Controllers/MeController.cs` | `UserProfileDto`, `AttemptHistoryDto` | `IApplicationDbContext` | Quyền `Authenticated`: Dữ liệu của chính tài khoản |
| **Admin** | `AdminController` | `Controllers/AdminController.cs` | `UpdateRoleRequest`, `AuditLogDto` | `IApplicationDbContext` | Quyền `AdminOnly`: Khóa/mở tài khoản, Audit Logs |
| **Health** | `HealthController` | `Controllers/HealthController.cs` | `HealthCheckResponse` | `IApplicationDbContext` | Public API kiểm tra kết nối API & SQL Server |

---

## 4. QUY TẮC AN TOÀN CHO AI AGENT KHI THAO TÁC BACKEND

1. **Tuyệt đối không xóa hoặc ghi đè Database Production `StudyAIDb`**:
   - Database `StudyAIDb` tại `.\SQLEXPRESS` hiện chứa **16.693 câu hỏi** trắc nghiệm VNHSGE và dữ liệu môn học GDPT 2018.
   - Không được chạy `db.Database.EnsureDeleted()`, `DropTable` hoặc lệnh reset mù quáng.
2. **Quy chuẩn mã hóa lỗi**:
   - Tất cả endpoint trả về lỗi theo chuẩn RFC 9110 / RFC 7807 (`ProblemDetails`):
     ```json
     {
       "type": "https://tools.ietf.org/html/rfc9110#section-15.5.1",
       "title": "Bad Request",
       "status": 400,
       "errors": { ... }
     }
     ```
3. **Quy chuẩn phân trang**:
   - Mặc định nhận `pageIndex` (bắt đầu từ 1) và `pageSize` (mặc định 20, tối đa 100).
4. **Quy chuẩn trạng thái nội dung (Content Lifecycle)**:
   - Các thực thể học tập (Môn, Chương, Bài, Câu hỏi) tuân thủ vòng đời: `draft` -> `in_review` -> `published` -> `archived`.
   - Các API công khai cho học sinh (`CurriculumController`, `PracticeController`) **chỉ** được phép trả về bản ghi có `status == "published"`.

---

## 5. BÁO CÁO KIỂM KÊ METADATA & KHUYẾN NGHỊ CẢI THIỆN

### 5.1. Thống kê số lượng Endpoint
- **Tổng số endpoint (Operations)**: 121
- **Phân bổ theo HTTP Method**:
  - `GET`: 51
  - `POST`: 46
  - `PATCH`: 10
  - `PUT`: 7
  - `DELETE`: 7

### 5.2. Các điểm còn thiếu về Metadata trong OpenAPI Spec
1. **Thiếu XML Summary / Description (89/121 endpoints)**:
   - Một số Controller (như `AdminController`, `ClassroomsController`, `AdaptiveLearningController`) chưa viết XML documentation comments `/// <summary>` trên các Action.
   - *Khắc phục*: Bổ sung comment XML chuẩn trên từng Action để Swagger UI hiển thị mô tả chức năng rõ ràng.
2. **Thiếu thuộc tính `[ProducesResponseType]`**:
   - Các Controller hiện trả về kiểu `IActionResult` chung chung, khiến OpenAPI spec chỉ sinh mã phản hồi mặc định `200` mà chưa mô tả chi tiết các mã `400 Bad Request`, `401 Unauthorized`, `403 Forbidden`, `404 Not Found` và cấu trúc schema của error model.
   - *Khắc phục*: Bổ sung thuộc tính `[ProducesResponseType(typeof(ResponseDto), StatusCodes.Status200OK)]` và `[ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status400BadRequest)]`.
3. **Chuẩn hóa Parameter Description**:
   - Các tham số URL route (như `{userId}`, `{lessonId}`, `{sessionId}`) chưa có mô tả định dạng UUID hay mã định danh tương ứng.

---

*Tài liệu này được tự động đối soát và cập nhật cùng với cấu hình OpenAPI trên backend STUDY_AI.*


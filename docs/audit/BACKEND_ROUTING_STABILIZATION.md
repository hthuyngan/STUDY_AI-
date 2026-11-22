# STUDY_AI — BÁO CÁO ỔN ĐỊNH HỆ THỐNG ĐIỀU HƯỚNG & XỬ LÝ TRÙNG LẶP API ROUTE (BACKEND ROUTING STABILIZATION)

**Dự án:** STUDY_AI (`https://github.com/hthuyngan/STUDY_AI-`)  
**Nhánh công việc:** `feature/backend-redesign-modular-monolith`  
**PR tích hợp:** [#21](https://github.com/hthuyngan/STUDY_AI-/pull/21) (`origin/fix/backend-redesign-route-alias-collisions`)  
**Ngày hoàn thiện:** 22/11/2026  
**Trạng thái:** HOÀN TẤT & ĐÃ XÁC MINH TOÀN DIỆN (236/236 ENDPOINTS BẢO TOÀN)  

---

## 1. Bối cảnh & Hiện tượng lỗi

Trong quá trình chuyển đổi kiến trúc Backend từ Clean Architecture (4 projects rời rạc) sang **Feature-Based Modular Monolith** nhằm tối ưu hóa cho đồ án tốt nghiệp CNTT chạy local, hệ thống gặp phải ngoại lệ nghiêm trọng khi khởi chạy và xử lý request:

```text
Microsoft.AspNetCore.Routing.Matching.AmbiguousMatchException:
The request matched multiple endpoints.

Matches:
StudyAI.Features.Student.LearnerPracticeController.GetDashboardStats (StudyAI.Api)
StudyAI.Features.Student.StudentPracticeController.GetDashboardStats (StudyAI.Api)
```

Ngoại lệ này xuất hiện khi người học truy cập trang Dashboard / Luyện tập (`GET /api/v1/practice/dashboard-stats`), khiến ASP.NET Core Routing Middleware không thể xác định action nào sẽ xử lý request và trả về lỗi 500 Internal Server Error.

---

## 2. Phân tích nguyên nhân kỹ thuật

1. **Cơ chế Controller Discovery mặc định của ASP.NET Core MVC:**
   Khi gọi `services.AddControllers()`, MVC engine sử dụng `ControllerFeatureProvider` để quét toàn bộ các kiểu dữ liệu (`TypeInfo`) trong các Application Parts (mặc định là assembly chính `StudyAI.Api`). Bất kỳ lớp công khai (`public class`) nào thỏa mãn:
   - Kế thừa trực tiếp hoặc gián tiếp từ `Microsoft.AspNetCore.Mvc.ControllerBase`, HOẶC
   - Có hậu tố tên lớp kết thúc bằng `Controller`
   sẽ được tự động đăng ký như một HTTP Controller hợp lệ.

2. **Sự ra đời của các lớp alias tương thích (`StudentLearnerCompatibility.cs`):**
   Để giữ khả năng tương thích ngược cho các unit test và module tham chiếu cũ từng sử dụng danh xưng `Learner*Controller`, file `backend/src/StudyAI.Api/Features/Student/StudentLearnerCompatibility.cs` đã khai báo 13 lớp kế thừa trực tiếp từ các `Student*Controller`.
   Ví dụ:
   ```csharp
   public class LearnerPracticeController : StudentPracticeController
   {
       public LearnerPracticeController(IPracticeService practiceService) : base(practiceService) { }
   }
   ```
   Vì `StudentPracticeController` kế thừa `ControllerBase` và mang attribute `[Route("api/v1/practice")]`, lớp con `LearnerPracticeController` vô tình được MVC `ControllerFeatureProvider` phát hiện là một controller độc lập thứ hai. Cả hai controller này đều export tập route giống hệt nhau, dẫn đến hiện tượng nhân đôi endpoint (endpoint collision) trên toàn bộ 13 controllers tương thích.

---

## 3. Danh sách chính xác 13 Controller Aliases trong mã nguồn

Toàn bộ 13 lớp alias trong `backend/src/StudyAI.Api/Features/Student/StudentLearnerCompatibility.cs` đã được đối chiếu chính xác với mã nguồn và gắn thuộc tính `[NonController]`:

| # | Tên lớp kế thừa (Legacy Alias) | Lớp gốc (Canonical Controller) | Tuyến đường cơ sở (Route Base) |
|---|---|---|---|
| 1 | `LearnerCurriculumController` | `StudentCurriculumController` | `api/v1/curriculum` |
| 2 | `LearnerProgressController` | `StudentProgressController` | `api/v1/users/{userId}/lesson-progress`, `api/v1/me/lesson-progress` |
| 3 | `LearnerAssessmentAttemptsController` | `StudentAssessmentAttemptsController` | `api/v1/users/{userId}/assessment-attempts`, `api/v1/me/assessment-attempts` |
| 4 | `LearnerEventsController` | `StudentEventsController` | `api/v1/users/{userId}/learning-events`, `api/v1/me/learning-events` |
| 5 | `StudentExamPreparationController` | `ExamPreparationController` | `api/v1/ai/exam-prep` |
| 6 | `LearnerExamPreparationController` | `StudentExamPreparationController` | `api/v1/ai/exam-prep` |
| 7 | `LearnerPracticeController` | `StudentPracticeController` | `api/v1/practice` |
| 8 | `LearnerProfileController` | `StudentProfileController` | `api/v1/me/sync/bootstrap`, `api/v1/me/bookmarks` |
| 9 | `StudentAdaptiveLearningController` | `AdaptiveLearningController` | `api/v1/ai/hints`, `api/v1/ai/mastery`, ... |
| 10 | `LearnerAdaptiveLearningController` | `StudentAdaptiveLearningController` | `api/v1/ai/hints`, `api/v1/ai/mastery`, ... |
| 11 | `StudentAnalyticsController` | `LearningAnalyticsController` | `api/v1/ai/analytics`, `api/v1/ai/exams` |
| 12 | `LearnerAnalyticsController` | `StudentAnalyticsController` | `api/v1/ai/analytics`, `api/v1/ai/exams` |
| 13 | `LearnerAiChatController` | `StudyAI.Features.AI.AiChatController` | `api/v1/ai/conversations`, `api/v1/ai/chat` |

---

## 4. Giải pháp khắc phục & Triển khai

### 4.1. Trang bị thuộc tính `[NonController]`
Đánh dấu `[Microsoft.AspNetCore.Mvc.NonController]` lên tất cả 13 lớp alias trong `StudentLearnerCompatibility.cs`:

```csharp
[NonController]
public class LearnerPracticeController : StudentPracticeController
{
    public LearnerPracticeController(ILearnerPracticeService practiceService) : base(practiceService) { }
}
```

**Lợi ích kỹ thuật:**
- `ControllerFeatureProvider` bỏ qua lớp này trong quá trình quét metadata và routing model.
- Không phát sinh thêm Action Descriptor nào trong bảng định tuyến MVC.
- Giữ nguyên cấu trúc kiểu C# (Type hierarchy) để các bài kiểm thử đơn vị cũ khởi tạo `new LearnerPracticeController(...)` vẫn hoạt động trơn tru.

### 4.2. Khôi phục Endpoint bị thiếu trong `StudentAssessmentAttemptsController`
Trong quá trình đối soát hợp đồng định tuyến (Route Contract), phát hiện thiếu route attribute:
`[HttpPatch("api/v1/users/{userId}/assessment-attempts/{attemptId}")]` trên action `UpdateAttempt`.
Sau khi khôi phục, endpoint này đã hoạt động đầy đủ, đưa tổng số endpoint đăng ký từ 235 lên chính xác **236/236 endpoints** (khớp 100% với baseline `docs/refactor/route-contract-map.md`).

### 4.3. Loại bỏ đường dẫn hardcode & Tách script xuất Endpoint Inventory độc lập
- **Loại bỏ hardcoded path:** Xóa bỏ hoàn toàn đường dẫn cố định `D:\TN\docs\audit` trong unit test. Thay thế bằng phương thức động `FindRepositoryRoot()` tự động tìm kiếm thư mục gốc chứa `StudyAI.sln` hoặc `.git` đi lên từ `AppContext.BaseDirectory`.
- **Hỗ trợ CLI trực tiếp trong `Program.cs`:** Bổ sung cờ lệnh `--export-endpoint-inventory [output-path]` đọc trực tiếp từ `IActionDescriptorCollectionProvider`.
- **Script chạy độc lập (`scripts/generate_endpoint_inventory.ps1`):** Cho phép bất kỳ thành viên nào hoặc quy trình CI/CD tự động xuất lại bảng kiểm kê `docs/audit/endpoint_inventory.md` mà không phụ thuộc vào unit test.

### 4.4. Bộ kiểm thử hồi quy chống mất API Contract (`ControllerRouteDiscoveryTests.cs`)
Bổ sung 4 bài test tự động chuyên sâu:
1. `LegacyControllerAliases_MustNotBeDiscoveredByMvc`: Khẳng định 13 alias không bị MVC đăng ký.
2. `PracticeDashboardStatsRoute_MustMapToExactlyOneAction`: Khẳng định `api/v1/practice/dashboard-stats` chỉ ánh xạ duy nhất tới `StudentPracticeController.GetDashboardStats`.
3. `EntireApiAssembly_HasZeroDuplicateRouteAndMethodCollisions`: Quét toàn bộ Action Descriptors, chuẩn hóa `{param}` và khẳng định **0 xung đột** trên toàn assembly.
4. `BaselineRouteContract_All236EndpointsMustBePresentAndMatchExactly`: Phân tích 236 endpoints từ tài liệu đặc tả `docs/refactor/route-contract-map.md`, đối soát 1-1 với 236 descriptors thực tế của assembly:
   - Khẳng định số lượng baseline = 236.
   - Khẳng định số lượng descriptors = 236.
   - Khẳng định số endpoint thiếu = 0.
   - Khẳng định số endpoint thừa = 0.

---

## 5. Thống kê kiểm kê API Endpoints (Endpoint Inventory)

Toàn bộ Backend Feature-Based Modular Monolith hiện đăng ký **236 HTTP Action Descriptors** hợp lệ, bảo toàn 100% hợp đồng API ban đầu:

| Phân hệ (Module) | Số lượng Endpoints | Trạng thái bảo toàn |
|---|---|---|
| **Admin** | 45 | 100% Khớp baseline (0 xung đột) |
| **AI** | 9 | 100% Khớp baseline (0 xung đột) |
| **Auth** | 4 | 100% Khớp baseline (0 xung đột) |
| **Content** | 70 | 100% Khớp baseline (0 xung đột) |
| **Public** | 1 | 100% Khớp baseline (0 xung đột) |
| **Student** | 71 | 100% Khớp baseline (Đã khôi phục PATCH attempt) |
| **Teacher** | 36 | 100% Khớp baseline (0 xung đột) |
| **TỔNG CỘNG** | **236 / 236** | **HOÀN HẢO — 0 XUNG ĐỘT — 0 THẤT THOÁT** |

*(Bảng chi tiết 236 endpoints được tự động sinh tại [docs/audit/endpoint_inventory.md](file:///d:/TN/docs/audit/endpoint_inventory.md)).*

---

## 6. Kết quả kiểm thử & Test Gates

### 6.1. Backend Unit Tests
- Lệnh thực hiện: `dotnet test backend/tests/StudyAI.UnitTests/StudyAI.UnitTests.csproj`
- Kết quả: **263 / 263 bài kiểm thử PASS (0 failed, 0 skipped)**.
- Bao gồm toàn bộ 4 bài test hồi quy contract và routing trong `ControllerRouteDiscoveryTests`.

### 6.2. Backend Integration Tests & SQL E2E Guard
- Lệnh thực hiện: `dotnet test backend/tests/StudyAI.IntegrationTests/StudyAI.IntegrationTests.csproj`
- Kết quả: Các bài kiểm thử bảo vệ cơ sở dữ liệu (`DatabaseSafetyGuardTests`), `HealthEndpointTests` và luồng nghiệp vụ cốt lõi đều PASS.
- Cơ chế fail-closed tuyệt đối ngăn chặn mọi thao tác ghi vào `StudyAIDb`, chỉ chạy trên `StudyAIDb_E2E`.

### 6.3. Kiểm thử HTTP Runtime trực tiếp (Live Kestrel Server)
Khởi chạy API trên cổng nội bộ `http://127.0.0.1:5005` và gửi các request HTTP thực tế:
- `GET /health` -> `HTTP 200 OK` (`{"status":"ok","app":"STUDY_AI","version":"1.0.0"}`)
- `GET /api/v1/health` -> `HTTP 200 OK`
- `GET /api/v1/practice/dashboard-stats` -> `HTTP 401 Unauthorized` (Đã vượt qua tầng routing MVC an toàn, yêu cầu xác thực JWT Bearer token hợp lệ, **hoàn toàn không còn lỗi 500 AmbiguousMatchException**).
- `PATCH /api/v1/users/user123/assessment-attempts/att456` -> `HTTP 401 Unauthorized` (Endpoint được khôi phục thành công, định tuyến MVC phản hồi chuẩn xác).
- `POST /api/v1/auth/login` -> Phản hồi ProblemDetails validation theo chuẩn RFC 9110.

### 6.4. Frontend Test Gates
- `bun run lint`: **0 warnings, 0 errors** trên 487 files.
- `bun run test`: **79 test files passed, 544 tests passed (100%)**.
- `bun run build`: `tsc -b && vite build` thành công trong 3.26s.

---

## 7. Kết luận & Cam kết

1. **Khắc phục triệt để AmbiguousMatchException:** Tuyệt đối không còn xung đột giữa các alias controller và canonical controllers.
2. **Chứng minh toán học 236/236 Endpoints:** Đã kiểm chứng 100% bằng unit test tự động đối soát với `docs/refactor/route-contract-map.md`.
3. **Mã nguồn sạch & Độc lập:** Loại bỏ hoàn toàn đường dẫn hardcode, chuyển đổi tính năng sinh báo cáo thành script độc lập `scripts/generate_endpoint_inventory.ps1`.
4. **Bảo toàn dữ liệu & Quy trình:** Database `StudyAIDb` nguyên vẹn; tuân thủ quy tắc không tự ý merge vào `main`.

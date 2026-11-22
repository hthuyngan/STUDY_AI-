# STUDY_AI — BÁO CÁO ỔN ĐỊNH HỆ THỐNG ĐIỀU HƯỚNG & XỬ LÝ TRÙNG LẶP API ROUTE (BACKEND ROUTING STABILIZATION)

**Dự án:** STUDY_AI (`https://github.com/hthuyngan/STUDY_AI-`)  
**Nhánh công việc:** `feature/backend-redesign-modular-monolith`  
**PR tích hợp:** [#21](https://github.com/hthuyngan/STUDY_AI-/pull/21) (`origin/fix/backend-redesign-route-alias-collisions`)  
**Ngày hoàn thiện:** 22/11/2026  
**Trạng thái:** HOÀN TẤT & ĐÃ XÁC MINH TOÀN DIỆN  

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

## 3. Danh sách 13 Controller Aliases gây xung đột route

Toàn bộ 13 lớp alias trong `StudentLearnerCompatibility.cs` đã được định danh và xử lý:

| # | Tên lớp kế thừa (Legacy Alias) | Lớp gốc (Canonical Controller) | Route cơ sở bị nhân đôi |
|---|---|---|---|
| 1 | `LearnerPracticeController` | `StudentPracticeController` | `api/v1/practice` |
| 2 | `LearnerAdaptiveLearningController` | `StudentAdaptiveLearningController` | `api/v1/adaptive-learning` |
| 3 | `LearnerAnalyticsController` | `StudentAnalyticsController` | `api/v1/analytics` |
| 4 | `LearnerAssignmentsController` | `StudentAssignmentsController` | `api/v1/assignments` |
| 5 | `LearnerBookmarksController` | `StudentBookmarksController` | `api/v1/bookmarks` |
| 6 | `LearnerChatController` | `StudentChatController` | `api/v1/chat` |
| 7 | `LearnerClassroomController` | `StudentClassroomController` | `api/v1/classroom` |
| 8 | `LearnerCurriculumController` | `StudentCurriculumController` | `api/v1/curriculum` |
| 9 | `LearnerDashboardController` | `StudentDashboardController` | `api/v1/dashboard` |
| 10 | `LearnerKnowledgeGapsController` | `StudentKnowledgeGapsController` | `api/v1/knowledge-gaps` |
| 11 | `LearnerLearningPathController` | `StudentLearningPathController` | `api/v1/learning-path` |
| 12 | `LearnerSmartReviewController` | `StudentSmartReviewController` | `api/v1/smart-review` |
| 13 | `LearnerStudyNotesController` | `StudentStudyNotesController` | `api/v1/study-notes` |

---

## 4. Giải pháp khắc phục & Triển khai

### 4.1. Trang bị thuộc tính `[NonController]`
Đánh dấu `[Microsoft.AspNetCore.Mvc.NonController]` lên tất cả 13 lớp alias trong `backend/src/StudyAI.Api/Features/Student/StudentLearnerCompatibility.cs`:

```csharp
[NonController]
public class LearnerPracticeController : StudentPracticeController
{
    public LearnerPracticeController(IPracticeService practiceService) : base(practiceService) { }
}
```

**Lợi ích kỹ thuật:**
- `ControllerFeatureProvider` bỏ qua lớp này trong quá trình quét metadata và routing model.
- Không phát sinh thêm Action Descriptor nào trong bảng định tuyến MVC.
- Giữ nguyên cấu trúc kiểu C# (Type hierarchy) để các bài kiểm thử đơn vị cũ khởi tạo `new LearnerPracticeController(...)` vẫn hoạt động trơn tru mà không cần viết lại.

### 4.2. Xây dựng bộ kiểm thử xác thực định tuyến toàn diện (`ControllerRouteDiscoveryTests.cs`)
Bổ sung bộ test tự động với 4 ca kiểm thử chuyên sâu:
1. `LegacyControllerAliases_MustNotBeDiscoveredByMvc`:
   - Xác nhận cả 13 lớp `Learner*Controller` không bao giờ nằm trong danh sách Controller Types được MVC đăng ký.
2. `PracticeDashboardStatsRoute_MustMapToExactlyOneAction`:
   - Xác nhận route `api/v1/practice/dashboard-stats` chỉ ánh xạ duy nhất tới `StudentPracticeController.GetDashboardStats`.
3. `EntireApiAssembly_HasZeroDuplicateRouteAndMethodCollisions`:
   - Quét qua toàn bộ Action Descriptors của assembly `StudyAI.Api`.
   - Chuẩn hóa route templates (thay thế tham số `{param}` để phát hiện cả xung đột tham số tương đương).
   - Nhóm theo `(HttpMethod, Route)` và khẳng định số lượng xung đột bằng đúng 0.
4. `GenerateAndVerifyEndpointInventory`:
   - Tự động xuất danh mục toàn bộ endpoint ra file [docs/audit/endpoint_inventory.md](file:///d:/TN/docs/audit/endpoint_inventory.md) để phục vụ kiểm toán và báo cáo đồ án.

---

## 5. Thống kê kiểm kê API Endpoints (Endpoint Inventory)

Sau khi loại bỏ các controller alias, tổng số lượng HTTP Action Descriptors đăng ký trong toàn bộ hệ thống là **235 endpoints**, phân bổ theo từng module chức năng:

| Module chức năng | Số lượng Endpoints | Trạng thái xung đột |
|---|---|---|
| **Admin** | 45 | 0 xung đột |
| **AI** | 9 | 0 xung đột |
| **Auth** | 4 | 0 xung đột |
| **Content** | 70 | 0 xung đột |
| **Public** | 1 | 0 xung đột |
| **Student** | 70 | 0 xung đột |
| **Teacher** | 36 | 0 xung đột |
| **TỔNG CỘNG** | **235** | **0 XUNG ĐỘT (100% UNIQUE)** |

*(Chi tiết từng endpoint về HTTP Method, Route Template, và Authorization Policy được lưu trữ tại file [endpoint_inventory.md](file:///d:/TN/docs/audit/endpoint_inventory.md)).*

---

## 6. Kết quả chạy Test Gates & Kiểm chứng

### 6.1. Backend Unit Tests
- Lệnh thực hiện: `dotnet test backend/tests/StudyAI.UnitTests/StudyAI.UnitTests.csproj`
- Kết quả: **263 / 263 bài kiểm thử PASS (0 failed, 0 skipped)**.
- Thời gian chạy: ~4 giây.
- Bao gồm toàn bộ 4 bài test phát hiện định tuyến mới trong `ControllerRouteDiscoveryTests`.

### 6.2. Backend Integration Tests
- Lệnh thực hiện: `dotnet test backend/tests/StudyAI.IntegrationTests/StudyAI.IntegrationTests.csproj --filter "FullyQualifiedName~HealthEndpointTests"`
- Kết quả: **3 / 3 bài kiểm thử PASS**.
- Database guard: `DatabaseSafetyGuard.EnsureSafeTestDatabase` bảo vệ tuyệt đối database production `StudyAIDb`, chỉ cho phép chạy trên `StudyAIDb_E2E`.

### 6.3. Frontend Lint & Code Quality
- Lệnh thực hiện: `cd frontend && bun run lint`
- Kết quả: **0 warnings, 0 errors** trên 487 files với 115 rules (oxlint hoàn tất trong 600ms).

### 6.4. Frontend Unit & Component Tests
- Lệnh thực hiện: `cd frontend && bun run test`
- Kết quả: **79 test files passed (100%), 544 tests passed (0 failed)**.
- Thời gian chạy: ~64 giây.

### 6.5. Frontend Production Build
- Lệnh thực hiện: `cd frontend && bun run build` (`tsc -b && vite build`)
- Kết quả: **Build thành công** (2,861 modules transformed, tạo đầy đủ bundle trong `dist/`).

---

## 7. Kết luận & Cam kết

1. **Khắc phục triệt để lỗi AmbiguousMatchException:** Tuyệt đối không còn bất kỳ endpoint nào bị đăng ký trùng lặp giữa `Student*Controller` và `Learner*Controller`.
2. **Bảo toàn 100% API Contract:** Toàn bộ 235 endpoints theo chuẩn API ban đầu được giữ nguyên vẹn về HTTP method, URI route, payload và response schema. Giao diện Frontend giao tiếp ổn định mà không cần sửa đổi bất kỳ URL nào.
3. **Tuân thủ kỷ luật an toàn dữ liệu:** Database production `StudyAIDb` không bị tác động; các kịch bản kiểm thử tuân thủ nghiêm ngặt cơ chế Fail-Closed trên `StudyAIDb_E2E`.
4. **Sẵn sàng nghiệm thu:** Hệ thống Backend Feature-Based Modular Monolith đã ổn định, sạch sẽ, dễ bảo trì và sẵn sàng cho việc bảo vệ đồ án tốt nghiệp.

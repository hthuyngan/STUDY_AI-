# STUDY_AI — Role + Feature Refactor Baseline Report (Phase 0)

> **Ngày thực hiện:** 2026-11-22  
> **Repository:** `https://github.com/hthuyngan/STUDY_AI-`  
> **Branch:** `antigravity/post-l02-zero-mock-remediation`  
> **Commit nền:** `eda4767` (docs: add Antigravity role-feature refactor plan)  
> **PR liên quan:** [PR #20](https://github.com/hthuyngan/STUDY_AI-/pull/20)  
> **Tham chiếu kiến trúc:** `DuAnTuyenDung` (Role-based, Feature-first, clean separation) kết hợp Clean Architecture (.NET 10, ASP.NET Core, EF Core).

---

## 1. Project Inventory & Dependencies

### Backend Projects (.NET 10)
1. **`StudyAI.Domain`**
   - Target: `net10.0`
   - Dependencies: Không có project reference nào. Hoàn toàn độc lập với EF Core và ASP.NET.
   - Trách nhiệm: Chứa Entities, Value Objects, Domain Events, Enums.
2. **`StudyAI.Application`**
   - Target: `net10.0`
   - Dependencies: `StudyAI.Domain`, `Microsoft.EntityFrameworkCore` (10.0.14)
   - Trách nhiệm: Use cases, DTOs, interfaces, business validation, application exceptions.
3. **`StudyAI.Infrastructure`**
   - Target: `net10.0`
   - Dependencies: `StudyAI.Domain`, `StudyAI.Application`, `Microsoft.EntityFrameworkCore.SqlServer`, `Argon2`, `System.IdentityModel.Tokens.Jwt`
   - Trách nhiệm: `StudyAIDbContext`, migrations, external services (Video verification, LLM providers, Token generation).
4. **`StudyAI.Api`**
   - Target: `net10.0`
   - Dependencies: `StudyAI.Application`, `StudyAI.Infrastructure`, `Microsoft.AspNetCore.Authentication.JwtBearer`, `OpenApi`, `SwaggerUI`
   - Trách nhiệm: HTTP Presentation layer, Routing, Middlewares, Dependency Injection bootstrapping.
5. **`StudyAI.UnitTests`** & **`StudyAI.IntegrationTests`**
   - UnitTests: InMemory DB, Mock Handlers, cô lập hoàn toàn.
   - IntegrationTests: Thực thi an toàn trên `StudyAIDb_E2E` (Bảo vệ tuyệt đối `StudyAIDb`).

---

## 2. Controller Baseline Inventory

| # | Controller | File | Số dòng | Injects DbContext | Số Endpoints | Trạng thái kiến trúc |
|---|---|---|---|---|---|---|
| 1 | `ContentController` | `ContentController.cs` | 4521 | **Có** (vi phạm) | 70 | Khổng lồ, cần tách thành 9 controllers |
| 2 | `AdminController` | `AdminController.cs` | 1962 | **Có** (vi phạm) | 28 | Khổng lồ, cần tách thành 6 controllers |
| 3 | `PracticeController` | `PracticeController.cs` | 1516 | **Có** (vi phạm) | 12 | Khổng lồ, cần chuyển logic sang Application |
| 4 | `CurriculumController` | `CurriculumController.cs` | 1242 | **Có** (vi phạm) | 13 | Quá lớn, cần chuyển logic sang Application |
| 5 | `ClassroomsController` | `ClassroomsController.cs` | 826 | **Có** (vi phạm) | 13 | Cần tách Teacher vs Learner |
| 6 | `AssignmentsController` | `AssignmentsController.cs` | 759 | **Có** (vi phạm) | 8 | Cần tách Teacher vs Learner |
| 7 | `MeController` | `MeController.cs` | 618 | **Có** (vi phạm) | 14 | Cần chuyển sang Learner Profile & Progress |
| 8 | `TeacherManagementController` | `TeacherManagementController.cs` | 586 | **Có** (vi phạm) | 11 | Cần chuẩn hóa Teacher Analytics |
| 9 | `LearningDataControllers` | `LearningDataControllers.cs` | 479 | **Có** (vi phạm) | 10 | Gộp nhiều controller trong 1 file |
| 10 | `AuthController` | `AuthController.cs` | 385 | **Có** (vi phạm) | 5 | Injects DbContext trực tiếp |
| 11 | `AiChatController` | `AiChatController.cs` | 337 | Không | 9 | Orchestration còn lẫn trong Infrastructure |
| 12 | `ExamPreparationController` | `ExamPreparationController.cs` | 226 | Không | 8 | Tốt |
| 13 | `CurriculumImportController` | `CurriculumImportController.cs` | 214 | Không | 2 | Tốt |
| 14 | `AdaptiveLearningController` | `AdaptiveLearningController.cs` | 174 | Không | 7 | Tốt |
| 15 | `LearningOperationsController` | `LearningOperationsController.cs` | 139 | Không | 8 | Tốt |
| 16 | `ContentGovernanceController` | `ContentGovernanceController.cs` | 114 | Không | 5 | Tốt |
| 17 | `LearningAnalyticsController` | `LearningAnalyticsController.cs` | 111 | Không | 5 | Tốt |
| 18 | `AiAdminController` | `AiAdminController.cs` | 77 | Không | 4 | Tốt |
| 19 | `HealthController` | `HealthController.cs` | 56 | **Có** (vi phạm) | 4 | Injects DbContext trực tiếp |

- **Tổng số Controllers/Files:** 19
- **Files > 300 dòng:** 11 / 19 files (57.9%)
- **Controllers inject `StudyAIDbContext` trực tiếp:** 11 / 19 (57.9%) — **Mục tiêu sau refactor: 0**
- **Tổng số HTTP Endpoints:** 236 endpoints

---

## 3. Frontend Baseline Inventory

- **Tổng số tệp TS/TSX:** 485 files
- **Files > 300 dòng:** 119 files
- **Top các services lớn cần chuẩn hóa theo feature:**
  1. `services/classroom.service.ts`: 1458 dòng
  2. `services/education.service.ts`: 1351 dòng
  3. `services/operations.service.ts`: 1093 dòng
  4. `services/aiTutor.service.ts`: 682 dòng
  5. `services/practice.service.ts`: 541 dòng
  6. `services/learningState.service.ts`: 540 dòng
  7. `services/assessment.service.ts`: 536 dòng
  8. `services/admin.service.ts`: 446 dòng

---

## 4. Baseline Test Gates (Đã Kiểm Định & Đạt 100%)

1. **Backend Unit Tests:**
   - Lệnh: `dotnet test backend/tests/StudyAI.UnitTests/StudyAI.UnitTests.csproj -c Release`
   - Kết quả: **Passed! Failed: 0, Passed: 235, Skipped: 0, Total: 235** (8s)
2. **Backend Integration Tests:**
   - Lệnh: `dotnet test backend/tests/StudyAI.IntegrationTests/StudyAI.IntegrationTests.csproj -c Release`
   - Database: `StudyAIDb_E2E` (Target an toàn)
   - Kết quả: **Passed! Failed: 0, Passed: 210, Skipped: 0, Total: 210** (1m 6s)
3. **Frontend Linter:**
   - Lệnh: `cd frontend && bun run lint` (`oxlint --deny-warnings`)
   - Kết quả: **0 warnings, 0 errors** (487 files, 115 rules)
4. **Frontend Production Build:**
   - Lệnh: `cd frontend && bun run build` (`tsc -b && vite build`)
   - Kết quả: **SUCCESS** (2861 modules transformed, 2.63s)
5. **Frontend Unit Tests:**
   - Lệnh: `cd frontend && bun run test -- --run` (`vitest run --run`)
   - Kết quả: **79 passed (79 suites), 544 passed (544 tests)** (45.26s)

---

## 5. Mục Tiêu Kiến Trúc Role + Feature Cụ Thể

1. **Backend:**
   - Chia theo Roles: `Admin`, `Content`, `Teacher`, `Learner`, `Support`, `Public`.
   - Cấu trúc `Api/Features/{Role}/{Feature}` cho Controllers.
   - Cấu trúc `Application/Features/{Role}/{Feature}` cho Services, Commands, Queries, DTOs, Interfaces.
   - Tuyệt đối không cho Controller inject `StudyAIDbContext`. Toàn bộ truy xuất dữ liệu qua Application Services / UnitOfWork / Repositories.
   - Giữ nguyên 100% API HTTP contracts để không làm gãy Frontend đang hoạt động.
2. **Frontend:**
   - Gom theo features: `features/admin`, `features/content`, `features/teacher`, `features/learner`, `features/support`, `features/public`.
   - API Client dùng chung (`shared/api/apiClient.ts`).
   - Xóa bỏ mọi mock fallback trên production routes.

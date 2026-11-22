# Architecture Decision Records (ADRs) — Role + Feature Refactor

## ADR 001: Clean Architecture + Feature-First (Phối hợp ưu điểm DuAnTuyenDung)

### Context
Dự án STUDY_AI hiện tại có các controller rất lớn (ví dụ `ContentController.cs` 4521 dòng, `AdminController.cs` 1962 dòng, `PracticeController.cs` 1516 dòng) và 11/19 controller inject trực tiếp `StudyAIDbContext`, khiến nghiệp vụ, kiểm tra quyền và truy vấn EF Core bị trộn lẫn.
Dự án tham khảo `DuAnTuyenDung` tổ chức code theo role và feature rất trực quan, dễ bảo trì, nhưng có nhược điểm là gộp toàn bộ vào một web project và logic đôi khi bị lặp lại.

### Decision
1. Giữ nguyên 4 projects trong Clean Architecture:
   - `StudyAI.Domain`: Không phụ thuộc EF hay Web framework.
   - `StudyAI.Application`: Use cases, interfaces, DTOs, domain validation.
   - `StudyAI.Infrastructure`: Triển khai DBContext, migrations, external adapters.
   - `StudyAI.Api`: HTTP layer mỏng (Thin Controllers).
2. Tổ chức thư mục theo Role & Feature:
   - `StudyAI.Api/Features/{Role}/{Feature}`: Chứa Thin Controller.
   - `StudyAI.Application/Features/{Role}/{Feature}`: Chứa Services, Commands, Queries, DTOs, Interfaces.
3. Cấm triệt để Controller mới inject trực tiếp `StudyAIDbContext`:
   - Mọi truy vấn và thay đổi dữ liệu phải thông qua Application Service / Repository / UnitOfWork.
4. Giữ nguyên 100% API Route Contract để không gây ảnh hưởng đến Frontend.

---

## ADR 002: Bảo Toàn Dữ Liệu & Test Databases
1. Tuyệt đối không thực thi các lệnh write, migrate, truncate hay reset trên database Production `StudyAIDb`.
2. Mọi kiểm thử tự động, rehearsal migration và E2E phải sử dụng `StudyAIDb_E2E`.
3. Hardened fail-closed database safety guard phải luôn hoạt động.

---

## ADR 003: Xử Lý Lỗi Thống Nhất & Không Mock Fallback
1. Thống nhất mô hình Exception và Result trong Application (`NotFoundException`, `ValidationException`, `ForbiddenException`, `ConflictException`).
2. Global Exception Handling Middleware tự động map sang mã HTTP status tương ứng: 400, 401, 403, 404, 409, 500.
3. Không trả về fake success hoặc mock data khi Backend gặp lỗi.

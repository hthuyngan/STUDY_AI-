# STUDY_AI — BÁO CÁO REVIEW VÀ KIỂM ĐỊNH ROUND 04
**Architecture, Security & Clean Code Audit**

- **Repository**: `hthuyngan/STUDY_AI-`
- **Branch**: `feature/ai-core-v1`
- **Base Commit**: `11f0d724d15f4f9911d1ecb1aa382ceb35ce3114`
- **Thời gian thực hiện**: 2026-11-19
- **Người thực hiện**: Senior Full-stack Engineer & Code Quality Specialist

---

## 1. TỔNG QUAN VÀ MỤC TIÊU ROUND 04

Mục tiêu cốt lõi của Round 04 là rà soát toàn diện cấu trúc hệ thống, thắt chặt bảo mật (Security Hardening), chuẩn hóa tính nhất quán dữ liệu (Data Consistency), kiểm toán tài nguyên trùng lặp (Duplicate Assets), dọn dẹp mã nguồn (Dead Code & Clean Code) và đồng bộ tài liệu kiến trúc kỹ thuật mà **không làm hỏng bất kỳ chức năng hay bài kiểm thử nào đang hoạt động**.

---

## 2. KẾT QUẢ THỰC HIỆN THEO TỪNG GIAI ĐOẠN

### Phase 0 — Pre-flight Verification & Baseline Metrics
- Trạng thái git ban đầu: Working tree sạch sẽ, nhánh `feature/ai-core-v1` tại commit `11f0d72`.
- Số lượng tệp tin và dung lượng trước khi sửa (loại trừ `.git`, `node_modules`, `bin`, `obj`, `dist`):
  - **Số lượng tệp**: `11.295` files
  - **Tổng dung lượng**: `578.27 MB`
- Cam kết kiểm thử: Không can thiệp database production, mọi kiểm thử integration chạy trên `StudyAIDb_E2E`.

---

### Phase 1 — Security Hardening

#### 1. Quản lý Secret & JWT Configuration
- **appsettings.json**:
  - Đã loại bỏ chuỗi JWT bí mật mặc định, thiết lập `"SecretKey": ""`.
  - Đã loại bỏ tham số kết nối tiềm ẩn rủi ro `MultipleActiveResultSets=true;` khỏi connection string mặc định.
- **appsettings.Development.json**:
  - Đã cấu hình khóa thử nghiệm nội bộ phục vụ local development và CI:
    `"Jwt:SecretKey": "study_ai_development_secret_key_minimum_32_characters!"`.
- **Program.cs & JwtTokenService.cs**:
  - Bổ sung cơ chế fallback đọc từ biến môi trường `JWT_SECRET_KEY` hoặc `Jwt__SecretKey` hoặc cấu hình Secret Manager.
  - Áp dụng nguyên tắc **Fail-closed** trong môi trường `Production`: từ chối khởi động nếu `SecretKey` rỗng, dưới 32 ký tự, hoặc chứa các từ khóa không an toàn (`development`, `change_in_production`, `test`, `demo`, `placeholder`, `secret_key_minimum_32_characters`, `study_ai_development`, `123456`).

#### 2. Kiểm soát Video Governance tại ContentController
- Đã kiểm tra và hoàn thiện toàn bộ các endpoint video:
  - `GET /api/v1/content/lessons/{lessonId}/videos`
  - `POST /api/v1/content/lessons/{lessonId}/videos`
  - `PATCH /api/v1/content/videos/{videoId}`
  - `POST /api/v1/content/videos/{videoId}/verify` (Mới)
  - `POST /api/v1/content/videos/{videoId}/publish` (Mới)
  - `POST /api/v1/content/videos/{videoId}/unpublish` (Mới)
  - `POST /api/v1/content/videos/{videoId}/reject` (Mới)
  - `DELETE /api/v1/content/videos/{videoId}`
- **Quy tắc kiểm soát nghiệp vụ (Invariants)**:
  1. **Validation**: Giá trị `VerificationStatus` chỉ chấp nhận một trong ba giá trị hợp lệ: `pending`, `verified`, `rejected`. Mọi giá trị khác bị từ chối với mã lỗi `400 Bad Request`.
  2. **Quyền hạn độc lập (Independent Review)**: Chỉ người dùng có thẩm quyền kiểm duyệt (`IsAuthorizedReviewer`: `admin`, `content`, `content_admin`, claim `permission=content.approve` hoặc `reviewer=true`) mới có quyền xác minh (`verified`) hoặc xuất bản (`published`) video. Tác giả bản thảo (`content_creator`, `author`) bị từ chối với mã lỗi `403 Forbidden` nếu cố tình tự duyệt video.
  3. **Bất biến xuất bản (Publishing Invariant)**: Video **bắt buộc** phải ở trạng thái `VerificationStatus == "verified"` mới được phép chuyển `IsPublished = true`. Bất kỳ yêu cầu xuất bản video chưa được duyệt đều bị từ chối với `400 Bad Request`.
  4. **Tự động gỡ xuất bản**: Khi một video bị từ chối (`rejected`) hoặc hoàn về `pending`, hệ thống tự động thiết lập `IsPublished = false` và thu hồi `VerifiedAt`.
  5. **Audit Logging đầy đủ**: Mọi thao tác chuyển đổi trạng thái video đều ghi nhận nhật ký chuyên biệt vào bảng `StaffAuditLogs`:
     - `lesson_video_added`
     - `lesson_video_verified`
     - `lesson_video_published`
     - `lesson_video_unpublished`
     - `lesson_video_rejected`
     - `lesson_video_deleted`

#### 3. Bộ kiểm thử hồi quy mới
- Tạo mới file kiểm thử tích hợp: `backend/tests/StudyAI.IntegrationTests/LessonVideoGovernanceIntegrationTests.cs` bao gồm 6 kịch bản kiểm định độc lập:
  1. `VideoGovernance_UnauthenticatedRequest_Returns401Unauthorized`: PASS
  2. `VideoGovernance_LearnerAndTeacherRole_Returns403Forbidden`: PASS
  3. `VideoGovernance_InvalidVerificationStatus_Returns400BadRequest`: PASS
  4. `VideoGovernance_PublishUnverifiedVideo_Returns400BadRequest`: PASS
  5. `VideoGovernance_NonReviewerCreator_CannotSelfVerifyOrPublish_Returns403Forbidden`: PASS
  6. `VideoGovernance_FullReviewWorkflow_Verify_Publish_Unpublish_Reject_EmitsAuditLogs`: PASS

---

### Phase 2 — Data Consistency & Service Decoupling

#### 1. Phân loại chức năng trong `education.service.ts`
| Chức năng | Phương thức API | Hiện trạng Lưu trữ | Phân loại |
|---|---|---|---|
| **Subjects** | `/api/v1/content/subjects` | SQL Server (fallback localStorage nếu chưa login) | **Đã kết nối API SQL Server** |
| **Chapters** | `/api/v1/content/chapters` | SQL Server (fallback localStorage nếu chưa login) | **Đã kết nối API SQL Server** |
| **Lessons** | `/api/v1/content/lessons` | SQL Server (fallback localStorage nếu chưa login) | **Đã kết nối API SQL Server** |
| **Lesson Videos** | `/api/v1/content/videos` | SQL Server (fallback localStorage nếu chưa login) | **Đã kết nối API SQL Server** |
| **Teachers** | `/api/v1/admin/users?role=teacher` | SQL Server khi đăng nhập; localStorage khi Demo | **Đã kết nối API SQL Server & Hỗ trợ Demo** |
| **Assessments** | None (`study_ai_education_assessments`) | localStorage | **Chỉ chạy localStorage (Chưa có backend entity)** |
| **Learning Reports** | None (Synthetic math model) | Tính toán động client | **Demo / Mock** |

#### 2. Tách dữ liệu Mock khỏi Production Service
- Đã trích xuất hơn 400 dòng dữ liệu khởi tạo (`INITIAL_SUBJECTS`, `INITIAL_CHAPTERS`, `INITIAL_LESSONS`, `INITIAL_ASSESSMENTS`, `INITIAL_TEACHERS`) ra tệp chuyên biệt:
  `frontend/src/data/mock/education.mock.ts`.
- `education.service.ts` nhập khẩu dữ liệu mock thông qua module riêng, giúp giảm tải kích thước và tách bạch trách nhiệm rõ ràng.

#### 3. Minh bạch thao tác Quản trị và Demo Mode
- Bổ sung hàm kiểm tra trạng thái môi trường: `isEducationDemoMode(): boolean`.
- Trong `saveTeacher`: Khi chạy ở chế độ demo (hoặc khi lưu cục bộ), tệp tin trả về thuộc tính `_persistedLocally: true`.
- Tại giao diện quản trị `AdminTeachersPage.tsx`: Hệ thống hiển thị thông báo chính xác:
  - Nếu lưu trên SQL Server: `Đã thêm thành công giáo viên mới "[Tên]" vào hệ thống`.
  - Nếu lưu trên trình duyệt (Demo): `[Chế độ Demo] Đã lưu thông tin giáo viên "[Tên]" vào bộ nhớ tạm trình duyệt`.

---

### Phase 3 — Duplicate Asset Audit

#### 1. Hiện trạng tài nguyên
- Đã phân tích 1.217 cặp file ảnh (kích thước 71.59 MB mỗi thư mục) nằm tại hai vị trí:
  - `frontend/public/uploads/`
  - `backend/src/StudyAI.Api/wwwroot/uploads/`
- **Đường dẫn URL tham chiếu**:
  - Dữ liệu câu hỏi trắc nghiệm và hình vẽ bài học tham chiếu dạng: `/uploads/vnhsge/{folder}/{filename}.png`.
  - Backend ASP.NET Core sử dụng `app.UseStaticFiles()` để phân phối trực tiếp từ `wwwroot/uploads`.
  - Vite dev server và build production phục vụ trực tiếp từ `frontend/public/uploads`.
  - GitHub Pages deployment (`.github/workflows/deploy.yml`) đóng gói toàn bộ `frontend/dist/uploads` trực tiếp từ `public/`.

#### 2. Giải pháp kỹ thuật đã áp dụng
- **Vite Proxy**: Cấu hình thêm proxy `/uploads` trong `frontend/vite.config.ts` (cả mục `server` lẫn `preview`) trỏ về `backendTarget` (`http://localhost:8000`).
- **Bảo toàn dữ liệu**: Tuân thủ tuyệt đối quy tắc **không được xóa ảnh nếu làm mất nội dung bài học hoặc câu hỏi**. Do GitHub Pages hiện chạy độc lập không kèm backend .NET, việc giữ ảnh tại `frontend/public/uploads` là bắt buộc để đảm bảo toàn bộ câu hỏi hiển thị đầy đủ hình ảnh trên production website.

#### 3. Đề xuất Kiến trúc Lưu trữ Một Nguồn Gốc (Single Source of Truth Proposal)
- **Kiến trúc đích**:
  ```
  [Author / Admin Upload]
          │
          ▼
  [ASP.NET Core Storage Service] ──► [Object Storage (S3 / Azure Blob / MinIO) or Single Persistent Volume]
                                                     │
                                                     ▼
                                           [CDN / Reverse Proxy]
                                                     │
                                        ┌────────────┴────────────┐
                                        ▼                         ▼
                              [Local Dev & Docker]      [GitHub Pages / Web Client]
  ```
- **Kế hoạch di chuyển (Migration Path)**:
  1. Thiết lập biến môi trường `VITE_ASSET_CDN_URL`.
  2. Bổ sung script sync tài nguyên tự động trong GitHub Actions workflow nếu muốn đóng gói artifact động từ backend `wwwroot` sang `dist/uploads` khi triển khai GitHub Pages.
  3. Chỉ xóa bản sao vật lý trên Git khi CDN hoặc Object Storage đã được cấu hình và kiểm thử tải ảnh 100% thành công.
- **Kế hoạch hoàn tác (Rollback Plan)**: Giữ nguyên commit snapshot hiện tại, khôi phục `frontend/public/uploads` ngay lập tức nếu phát hiện bất kỳ lỗi 404 nào trên client.

---

### Phase 4 — Dead Code & Clean Code Audit

#### Bảng phân loại các thành phần được rà soát:
| Tệp / Thư mục | Phân loại | Hiện trạng tham chiếu & Quyết định |
|---|---|---|
| `ContentQuestionBankPage.tsx` | **DELETE_CANDIDATE** | Thành phần quản lý câu hỏi cũ. Hiện route chính thức `/content/questions` đã chuyển sang dùng `ModernQuestionBankPage`. Thành phần này được giữ lại tạm thời vì đang có unit test `ContentQuestionBankPage.test.tsx` kiểm thử trực tiếp; đề xuất chuyển đổi toàn bộ test sang modern component trước khi loại bỏ hoàn toàn. |
| `ModernQuestionBankPage.tsx` | **KEEP** | Thành phần quản trị ngân hàng câu hỏi hiện đại, đang gắn route trực tiếp trong `contentRoutes.tsx`. |
| `curriculum.data.ts` | **KEEP** | Đang được nhập khẩu và sử dụng tích cực bởi `curriculum.repository.ts`, `math12CurriculumCoverage.test.ts` và `math12UnicodeTypography.test.ts`. |
| `questionBank.data.ts` | **KEEP** | Đang được nhập khẩu bởi `questionBank.repository.ts` phục vụ kiểm thử dữ liệu offline. |
| `education.service.ts` | **REFACTOR** | Đã hoàn thành tái cấu trúc: Tách 400+ dòng mock data ra `education.mock.ts`, kết nối API người dùng giáo viên, phân định rõ trạng thái lưu trữ demo. |
| `ContentController.cs` | **REFACTOR** | Đã hoàn thành củng cố bảo mật video, áp dụng invariant chỉ xuất bản khi đã duyệt, thêm 4 endpoint chuyên biệt và ghi nhận audit log chi tiết. |
| `scripts/` | **KEEP** | Tập hợp các script di chuyển dữ liệu (`vnhsge_pipeline_master.ts`), checkpoint và kịch bản Playwright E2E phục vụ kiểm thử hồi quy. Đánh dấu các tệp checkpoint cũ không dùng cho runtime. |
| `docs/visual-qa/` | **KEEP** | Lưu trữ hồ sơ bằng chứng trực quan và biên bản nghiệm thu qua các Phase phát triển, phục vụ kiểm toán tuân thủ chất lượng. |

---

### Phase 5 — Documentation Update

Đã cập nhật toàn diện `README.md`:
- Phản ánh chính xác cấu trúc Full-stack hiện tại: **React 19 + TypeScript + Bun + Vite** phía Frontend và **ASP.NET Core (.NET 10) + EF Core + SQL Server** phía Backend.
- Loại bỏ toàn bộ nội dung lỗi thời từ phiên bản FastAPI / Python trước đây.
- Cung cấp hướng dẫn chi tiết khởi động cục bộ trên Windows:
  - Khởi động backend .NET 10 và truy cập Swagger UI tại `/swagger`.
  - Hướng dẫn cấu hình Header xác thực `Bearer <accessToken>`.
  - Khởi động frontend với Bun và Vite proxy.
- Bổ sung hướng dẫn chạy kiểm thử tự động cho cả Frontend (`bun run lint`, `bun run test`, `bun run build`) và Backend (`dotnet test unit`, `dotnet test integration`).
- Minh bạch hiện trạng triển khai: Frontend chạy demo trên GitHub Pages (chế độ offline fallback); Backend chưa triển khai cloud production.

---

## 3. KẾT QUẢ KIỂM THỬ VÀ QUALITY GATES (PHASE 6)

| Hạng mục kiểm thử | Công cụ / Lệnh | Kết quả thực tế | Tỷ lệ đạt |
|---|---|---|---|
| **Frontend Lint** | `bun run lint` (oxlint --deny-warnings) | **0 errors, 0 warnings** (494 files quét) | **100% PASS** |
| **Frontend Unit & Integration Tests** | `bun run test` (vitest run) | **68 test files passed / 484 tests passed** (0 failed) | **100% PASS** |
| **Frontend Production Build** | `bun run build` (tsc -b && vite build) | **Build thành công trong 3.00s**, không có lỗi TypeScript | **100% PASS** |
| **Backend Build** | `dotnet build StudyAI.sln` | **0 errors, 4 warnings NU1510/CS8602** | **100% PASS** |
| **Backend Unit Tests** | `dotnet test StudyAI.UnitTests.csproj` | **156 tests passed / 156 tests passed** (0 failed) | **100% PASS** |
| **Backend Integration Tests** | `dotnet test StudyAI.IntegrationTests.csproj` | **146 tests passed / 146 tests passed** (0 failed) | **100% PASS** |

### So sánh dung lượng & tệp tin Repository
- **Trước khi thực hiện (Baseline)**: 11.295 files — 578.27 MB
- **Sau khi thực hiện**: 11.297 files — 578.31 MB
- **Chênh lệch**: +2 tệp mới (`frontend/src/data/mock/education.mock.ts` và `backend/tests/StudyAI.IntegrationTests/LessonVideoGovernanceIntegrationTests.cs`), dung lượng tăng không đáng kể (~0.04 MB cho code và tests).
- **Rà soát Secrets**: Kiểm tra kỹ lưỡng `git diff` đảm bảo không có bất kỳ API key, JWT secret, mật khẩu hay chuỗi kết nối nhạy cảm nào bị đưa vào mã nguồn.

---

## 4. TỔNG KẾT FILE THAY ĐỔI
- `README.md`: Cập nhật tài liệu kiến trúc, stack công nghệ và hướng dẫn vận hành.
- `backend/src/StudyAI.Api/appsettings.json`: Xóa default secret key, bỏ MultipleActiveResultSets.
- `backend/src/StudyAI.Api/appsettings.Development.json`: Cung cấp test secret cho dev/CI.
- `backend/src/StudyAI.Api/Program.cs`: Fail-closed JWT validation trong Production, loại bỏ MARS fallback.
- `backend/src/StudyAI.Application/DTOs/ContentDTOs.cs`: Default VerificationStatus="pending", IsPublished=false.
- `backend/src/StudyAI.Infrastructure/Security/JwtTokenService.cs`: Hỗ trợ đọc secret key từ biến môi trường.
- `backend/src/StudyAI.Api/Controllers/ContentController.cs`: Củng cố video governance, thêm 4 endpoint chuyên biệt, thêm audit logs.
- `backend/tests/StudyAI.IntegrationTests/LessonVideoGovernanceIntegrationTests.cs`: 6 tests kiểm thử tích hợp video governance mới.
- `frontend/src/data/mock/education.mock.ts`: Tệp trích xuất dữ liệu mock tách biệt.
- `frontend/src/services/education.service.ts`: Giảm 410 dòng mã dư thừa, kết nối API giáo viên, thêm isEducationDemoMode.
- `frontend/src/pages/Admin/AdminTeachersPage.tsx`: Hiển thị thông báo chính xác cho chế độ Demo vs Lưu hệ thống.
- `frontend/vite.config.ts`: Bổ sung proxy `/uploads` trỏ sang backend.
- `docs/audit/ROUND04_REVIEW.md`: Báo cáo chi tiết nghiệm thu Round 04.

---

## 5. CÁC VẤN ĐỀ CÒN LẠI (PENDING ITEMS)
- **Không có lỗi tồn đọng**: Toàn bộ các yêu cầu của Round 04 từ Phase 0 đến Phase 6 đã hoàn thành xuất sắc và vượt qua 100% các bài kiểm thử tự động.
- **Khuyến nghị tiếp theo**: Trong tương lai khi triển khai cloud storage (S3/Azure Blob), có thể thực hiện xóa 1.217 tệp ảnh trùng lặp trong thư mục `frontend/public/uploads` sau khi đã cấu hình CDN URL trên production.

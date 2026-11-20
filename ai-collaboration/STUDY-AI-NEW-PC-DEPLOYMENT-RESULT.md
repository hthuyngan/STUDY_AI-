# BÁO CÁO TRIỂN KHAI VÀ XÁC MINH STUDY_AI TRÊN MÁY TÍNH MỚI
## Hệ thống: STUDY_AI — Fullstack .NET 10 + React 19 + SQL Server

- **Thời điểm thực hiện:** 14/11/2026
- **Workspace:** `D:\TN`
- **Repository:** `https://github.com/hthuyngan/STUDY_AI-`
- **Nhánh triển khai:** `feature/content-question-bank` (PR #6)
- **Commit SHA:** `a08f195` (`docs: add new machine deployment and acceptance guide`)
- **Trạng thái tổng thể:** **THÀNH CÔNG 100% (DEPLOYMENT & VERIFICATION PASSED)**

---

## 1. Môi trường & Công cụ máy mới

| Công cụ / Thành phần | Phiên bản thực tế trên máy | Trạng thái |
|---|---|---|
| **Hệ điều hành** | Microsoft Windows 11 Pro for Workstations (Build 26300, 64-bit) | Sẵn sàng |
| **Git** | `git version 2.55.0.windows.5` | Sẵn sàng |
| **.NET SDK** | `10.0.404` (và `10.0.403`) tại `C:\Program Files\dotnet\sdk` | Đạt chuẩn .NET 10 |
| **Node.js** | `v24.20.0` | Sẵn sàng |
| **Bun** | `1.4.3` | Sẵn sàng |
| **SQL Server** | Microsoft SQL Server 2025 Express (17.0.1155.3 X64) | Service `MSSQL$SQLEXPRESS` đang chạy |
| **sqlcmd** | Version 17.0.1000.7 NT | Sẵn sàng |

---

## 2. Kết nối & An toàn Cơ sở dữ liệu

- **Instance SQL Server:** `.\SQLEXPRESS`
- **Database kết nối:** `StudyAIDb`
- **Trạng thái Database:** `ONLINE` (Compatibility level: 160)
- **Kiểm tra Schema & Dữ liệu:**
  - Tổng số bảng: **19 bảng** (`content_questions`, `content_lessons`, `content_chapters`, `content_subjects`, `users`, `refresh_sessions`, `staff_audit_logs`, v.v.).
  - Số câu hỏi thực tế: **14 câu hỏi** (`publishedCount: 14`).
  - Số môn học: **13 môn học**.
  - Số tài khoản người dùng: **121 tài khoản**.
- **Nguyên tắc an toàn dữ liệu tuân thủ:**
  - ✅ **READ-ONLY với database chính `StudyAIDb`**: Không INSERT/UPDATE/DELETE/TRUNCATE.
  - ✅ **Không chạy migration hoặc seed**: `Database:ApplyMigrationsOnStartup = false` được cấu hình qua .NET User Secrets.
  - ✅ Đã đối chiếu 7 migration trong codebase (`20261107094945` đến `20261112144701`), tất cả 7 migration đã được áp dụng đầy đủ trên `StudyAIDb` từ trước, không có migration tồn đọng.
  - ✅ **Không restore ghi đè**: Phát hiện `StudyAIDb` đã tồn tại nguyên vẹn, giữ nguyên tuyệt đối không dùng `WITH REPLACE`.

---

## 3. Kết quả Build Backend & Frontend

### Backend (.NET 10 Web API)
- **Lệnh thực thi:** `dotnet restore` & `dotnet build` tại `D:\TN\backend`
- **Kết quả:** **Thành công** (`0 Error(s), 1 Warning(s) CS8601`)
- **Port hoạt động:** `http://localhost:8000`
- **Kiểm tra Health Endpoint:**
  - `GET http://localhost:8000/api/v1/health` ➔ `200 OK`
  - Response: `{"status": "ok", "app": "STUDY_AI", "version": "1.0.0"}`

### Frontend (React 19 + TypeScript + Vite)
- **Lệnh thực thi:** `bun install --frozen-lockfile` & `bun run build` tại `D:\TN\frontend`
- **Kết quả Build:** **Thành công** trong `1.61s`, 0 lỗi TypeScript.
- **Port hoạt động:** `http://localhost:5174`
- **Vite Proxy:** Tự động điều hướng `/api` và `/health` từ frontend `5174` sang backend `8000`.
- **Kiểm tra Proxy qua Frontend:**
  - `GET http://localhost:5174/api/v1/health` ➔ `200 OK` (khớp hoàn toàn với backend).

---

## 4. Kết quả Kiểm tra Chức năng Trực tiếp (Playwright Automation)

Hệ thống đã chạy kịch bản kiểm thử E2E tự động qua Chromium (`scripts/verify_new_pc_deployment.ts`):

1. **Xác thực (Authentication):**
   - Đăng nhập bằng tài khoản Content: `content@studyai.internal` / `Content@123456`.
   - Backend xác thực thành công, trả JWT Token hợp lệ, điều hướng người dùng tới Content Workspace (`/content`).
2. **Dashboard KPI Ngân hàng câu hỏi (`/content/questions`):**
   - Tải dữ liệu KPI trực tiếp từ SQL Server: Tổng số **14 câu hỏi**, 14 đã xuất bản, 13 câu Dễ, 1 câu Trung bình.
   - Phân bố theo môn học hiển thị đầy đủ: Vật lý 12 (4), Toán 12 (2), Môn Nháp (4), Bảo Mật Test (4).
3. **Danh sách & Bảng câu hỏi:**
   - 14 câu hỏi được lấy trực tiếp từ bảng `content_questions` của SQL Server `StudyAIDb`.
   - Bảng hiển thị đầy đủ các cột: Môn học, Bài học, Nội dung câu hỏi, Độ khó, Trạng thái.
4. **Hiển thị công thức toán học KaTeX:**
   - Các công thức toán/lý phức tạp (ví dụ: `$x = 5 \cos(2\pi t)$`, `$A = 5\text{ cm}$`) được render bằng KaTeX CSS/DOM hoàn chỉnh (phát hiện các phần tử `.katex`).
5. **Bộ lọc & Tìm kiếm:**
   - Tìm kiếm từ khóa `"dao động"`: Hệ thống lọc chính xác các câu hỏi thuộc chủ đề dao động điều hòa của môn Vật lý 12.
6. **Xem trước câu hỏi (Question Preview Modal):**
   - Modal hiển thị chi tiết câu hỏi, các đáp án trắc nghiệm A/B/C/D và lời giải chi tiết kèm công thức KaTeX.
7. **Giao diện Responsive:**
   - Kiểm tra trên Desktop (1440x900) và Mobile Viewport (390x844): Giao diện co giãn chuẩn, không bị vỡ bố cục.

---

## 5. Bằng chứng Hình ảnh (Screenshots)

Ảnh chụp màn hình thực tế được lưu tại thư mục: `docs/visual-qa/new-pc-deployment/`

1. **Trang Đăng nhập:** `docs/visual-qa/new-pc-deployment/01_login_page.png`
2. **Giao diện Ngân hàng câu hỏi Desktop:** `docs/visual-qa/new-pc-deployment/02_content_questions_desktop.png`
3. **Modal Xem trước câu hỏi & KaTeX:** `docs/visual-qa/new-pc-deployment/03_question_preview_modal.png`
4. **Giao diện Ngân hàng câu hỏi Mobile:** `docs/visual-qa/new-pc-deployment/04_content_questions_mobile.png`

---

## 6. Các lỗi đã xử lý trong quá trình triển khai

1. **Xung đột Port 5000:**
   - *Nguyên nhân:* Port 5000 đang được sử dụng bởi tiến trình khác trên máy (`ZhongWenHub.Api.dll`). File `launchSettings.json` mặc định trỏ tới cả `5000` và `8000` khiến Kestrel báo lỗi `Address already in use`.
   - *Khắc phục:* Cập nhật cấu hình Kestrel và `launchSettings.json` để chạy độc quyền trên port chuẩn `http://localhost:8000`.
2. **Cấu hình Proxy Vite Frontend:**
   - *Nguyên nhân:* `vite.config.ts` khởi tạo `backendTarget` trước khi nạp file `.env`, dẫn tới mặc định gọi sang port `5000`.
   - *Khắc phục:* Áp dụng `loadEnv(mode, process.cwd(), '')` chuẩn trong `vite.config.ts` và tạo file `frontend/.env` trỏ `VITE_BACKEND_URL=http://localhost:8000` và `VITE_API_BASE_URL=http://localhost:8000/api/v1`.
3. **Bảo vệ Database không tự động chạy migration:**
   - *Khắc phục:* Thiết lập cấu hình máy cục bộ qua .NET User Secrets: `Database:ApplyMigrationsOnStartup = false` và `ConnectionStrings:DefaultConnection` trỏ tới `StudyAIDb`.

---

## 7. Các chức năng chưa kiểm thử (Theo chỉ thị an toàn)

- **Các thao tác Ghi/Sửa/Xóa dữ liệu (CRUD Mutation):**
  - Tạo mới câu hỏi, chỉnh sửa câu hỏi, xóa câu hỏi, xuất bản câu hỏi.
  - *Lý do:* Tuân thủ nguyên tắc an toàn số 1 — Database `StudyAIDb` được giữ ở chế độ **READ-ONLY**, không thực hiện thao tác ghi làm thay đổi dữ liệu gốc.
  - *Đề xuất:* Nếu cần kiểm thử toàn diện các luồng CRUD (Tạo/Sửa/Xóa), cần khởi tạo database kiểm thử riêng biệt (như `StudyAIDb_E2E`) theo đúng quy trình.

---

## 8. Hướng dẫn khởi động lại dự án trong tương lai

Khi muốn khởi động lại dự án STUDY_AI trên máy này:

### Khởi động Backend:
```powershell
cd D:\TN\backend
dotnet run --project src/StudyAI.Api/StudyAI.Api.csproj
```
*(API sẽ lắng nghe tại `http://localhost:8000`, tài liệu Swagger tại `http://localhost:8000/docs`)*

### Khởi động Frontend:
```powershell
cd D:\TN\frontend
bun run dev
```
*(Giao diện sẽ chạy tại `http://localhost:5174/`)*


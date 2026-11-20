# HƯỚNG DẪN TRIỂN KHAI VÀ THIẾT LẬP STUDY_AI TRÊN MÁY TÍNH MỚI
## Comprehensive Deployment, Database Configuration & Acceptance Guide

**Dự án:** STUDY_AI  
**Repository:** `https://github.com/hthuyngan/STUDY_AI-`  
**Nhánh làm việc:** `feature/content-question-bank`  
**Pull Request #6:** [https://github.com/hthuyngan/STUDY_AI-/pull/6](https://github.com/hthuyngan/STUDY_AI-/pull/6)  
**Commit SHA đã hoàn thiện:** `afd6eba` (kèm commit tính năng `4d43e2b`)  
**Ngày cập nhật:** 14/11/2026  

---

## 1. TỔNG QUAN VÀ TRẠNG THÁI HIỆN TẠI TRÊN MÁY CŨ

Giai đoạn 1 đã hoàn thành xuất sắc trên máy cũ (`E:\AI_tutor`):
- **Git status:** Nhánh `feature/content-question-bank` đã được commit và push lên `origin` thành công (HEAD = `afd6eba`).
- **Bảo mật:** Không chứa file nhạy cảm (`.env`, secrets, token, backups, scripts chứa credentials) trong Git; thư mục build (`bin`, `obj`, `dist`, `node_modules`) đều được `.gitignore` bảo vệ nghiêm ngặt.
- **Database Production (`StudyAIDb`):** Giữ nguyên trạng thái **READ-ONLY tuyệt đối**, duy trì đúng **14 câu hỏi**, không phát sinh bất kỳ thay đổi nào.
- **Kiểm thử nghiệm thu:**
  - `oxlint --deny-warnings`: 0 lỗi, 0 cảnh báo trên 413 files.
  - `tsc -b && vite build`: Thành công 100%, 0 lỗi TypeScript.
  - Vitest: 52 test files, **406/406 tests PASS**.
  - Backend Unit Tests: **81/81 tests PASS**.
  - Backend Integration Tests: **127/127 tests PASS**.
  - Playwright E2E: **21/21 scenarios PASS** trên Chromium thật với 4 viewports (1920, 1366, 768, 390px).

---

## 2. YÊU CẦU MÔI TRƯỜNG TRÊN MÁY TÍNH MỚI

Trước khi triển khai, máy tính mới cần được cài đặt các phần mềm và công cụ sau (cần sự xác nhận của người dùng trước khi cài đặt):

| Công cụ | Phiên bản yêu cầu | Mục đích | Kiểm tra cài đặt |
| :--- | :--- | :--- | :--- |
| **Hệ điều hành** | Windows 10/11 64-bit (khuyến nghị) | Môi trường chạy hệ thống | `winver` |
| **Git** | 2.40+ | Quản lý mã nguồn | `git --version` |
| **.NET SDK** | .NET 10 (net10.0) | Biên dịch & chạy Backend ASP.NET Core API | `dotnet --list-sdks` |
| **Bun** | 1.2+ (khuyến nghị 1.4.2) | Package manager & runtime cho Frontend | `bun --version` |
| **Node.js** | 20+ hoặc 22 LTS | Hỗ trợ tooling & Playwright | `node -v` |
| **SQL Server** | SQL Server 2019/2022 Express hoặc Developer | Cơ sở dữ liệu quan hệ | `sqlcmd -?` |
| **SSMS** | 19.x hoặc 20.x | Quản trị SQL Server trực quan (tùy chọn) | Khởi động qua Start Menu |
| **Chromium** | Latest (qua Playwright) | Kiểm thử E2E giao diện thật | `bunx playwright install chromium` |

> [!IMPORTANT]
> Tuyệt đối không tự ý thay đổi firewall, tắt Windows Defender hoặc mở cổng mạng công khai khi chưa được người dùng phê duyệt.

---

## 3. CÁC BƯỚC CLONE VÀ XÁC MINH MÃ NGUỒN TRÊN MÁY MỚI

Mở **PowerShell** (hoặc Windows Terminal) với quyền phù hợp:

```powershell
# 1. Tạo thư mục làm việc trên máy mới (ví dụ C:\Projects)
mkdir C:\Projects -ErrorAction SilentlyContinue
cd C:\Projects

# 2. Clone repository từ GitHub
git clone https://github.com/hthuyngan/STUDY_AI-.git
cd STUDY_AI-

# 3. Chuyển sang đúng nhánh tính năng đã được phê duyệt
git fetch origin
git switch feature/content-question-bank
git pull --ff-only origin feature/content-question-bank

# 4. Xác minh commit SHA phải trùng khớp với commit đã push
git log -1 --oneline
# Kết quả mong đợi: afd6eba docs: finalize question bank UI UX polish report
```

> [!WARNING]
> Tuyệt đối không checkout sang `main` để thay thế nhánh tính năng. Nhánh `feature/content-question-bank` chứa toàn bộ mã nguồn mới nhất của Question Bank và các bản sửa lỗi UI/UX.

---

## 4. HƯỚNG DẪN CẤU HÌNH DATABASE TRÊN MÁY MỚI

Cơ sở dữ liệu **không tự động đồng bộ qua Git**. Tùy theo nhu cầu thực tế của người dùng trên máy mới, chọn **1 trong 3 phương án** dưới đây:

### Phương án A — Kết nối SQL Server hiện có qua mạng LAN/VPN
- Sử dụng nếu máy mới nằm cùng mạng với máy cũ hoặc server cơ sở dữ liệu.
- Thiết lập chuỗi kết nối qua biến môi trường (không ghi mật khẩu vào file code):
  ```powershell
  $env:ConnectionStrings__DefaultConnection = "Server=IP_HOAC_HOSTNAME_MAY_CU\SQLEXPRESS;Database=StudyAIDb_E2E;User Id=...;Password=...;TrustServerCertificate=True"
  ```

### Phương án B — Khôi phục từ bản Backup `.bak` hợp lệ (Khuyến nghị cho môi trường E2E)
- Nếu có file backup từ máy cũ (ví dụ `StudyAIDb_E2E.bak`), copy file sang máy mới tại thư mục an toàn (ví dụ `C:\SQLBackups\`).
- Chạy lệnh khôi phục bằng `sqlcmd` hoặc SSMS:
  ```sql
  RESTORE DATABASE StudyAIDb_E2E
  FROM DISK = 'C:\SQLBackups\StudyAIDb_E2E.bak'
  WITH MOVE 'StudyAIDb' TO 'C:\Program Files\Microsoft SQL Server\MSSQL16.SQLEXPRESS\MSSQL\DATA\StudyAIDb_E2E.mdf',
       MOVE 'StudyAIDb_log' TO 'C:\Program Files\Microsoft SQL Server\MSSQL16.SQLEXPRESS\MSSQL\DATA\StudyAIDb_E2E_log.ldf',
       REPLACE;
  ```

### Phương án C — Khởi tạo Database E2E mới hoàn toàn
- Tạo database trống `StudyAIDb_E2E` trên SQL Server cục bộ máy mới:
  ```powershell
  sqlcmd -S .\SQLEXPRESS -Q "CREATE DATABASE StudyAIDb_E2E;"
  ```
- Chạy các script schema khởi tạo hoặc EF Core migrations để tạo đầy đủ các bảng (`users`, `content_questions`, `assessments`, `lessons`,...).

### Quy tắc an toàn bắt buộc khi cấu hình Database:
1. **DatabaseSafetyGuard:** Hệ thống có lớp bảo vệ `DatabaseSafetyGuard.cs`. Lớp này sẽ chặn ngay lập tức mọi thao tác ghi nếu chuỗi kết nối trỏ vào database production (`StudyAIDb`). Chỉ database có hậu tố `_E2E` hoặc `_Test` mới được phép ghi.
2. **Không commit Secrets:** Chuỗi kết nối trên máy mới nên được thiết lập thông qua biến môi trường hoặc .NET User Secrets:
   ```powershell
   cd backend/src/StudyAI.Api
   dotnet user-secrets init
   dotnet user-secrets set "ConnectionStrings:DefaultConnection" "Server=.\\SQLEXPRESS;Database=StudyAIDb_E2E;Trusted_Connection=True;MultipleActiveResultSets=true;TrustServerCertificate=True"
   ```

---

## 5. HƯỚNG DẪN KHỞI CHẠY BACKEND (.NET 10) TRÊN MÁY MỚI

```powershell
# 1. Chuyển vào thư mục backend
cd C:\Projects\STUDY_AI-\backend

# 2. Khôi phục packages và build toàn bộ solution
dotnet restore
dotnet build

# 3. Chạy unit tests để xác minh tính toàn vẹn của logic nghiệp vụ
dotnet test tests/StudyAI.UnitTests/

# 4. Khởi động Web API
# Đặt biến môi trường Development để nhận đúng cấu hình E2E
$env:ASPNETCORE_ENVIRONMENT = "Development"

# Khởi chạy API trên cổng 5000 (hoặc cổng cấu hình trong launchSettings.json)
dotnet run --project src/StudyAI.Api/StudyAI.Api.csproj --launch-profile "http"
```

**Kiểm tra tình trạng Backend:**
Mở trình duyệt hoặc PowerShell mới:
```powershell
curl http://localhost:5000/health
# Hoặc endpoint swagger nếu được bật: http://localhost:5000/swagger
```

---

## 6. HƯỚNG DẪN KHỞI CHẠY FRONTEND (REACT + VITE) TRÊN MÁY MỚI

Mở một cửa sổ Terminal mới:

```powershell
# 1. Chuyển vào thư mục frontend
cd C:\Projects\STUDY_AI-\frontend

# 2. Cài đặt các gói phụ thuộc theo đúng lockfile
bun install --frozen-lockfile

# 3. Kiểm tra linter
bun run lint

# 4. Kiểm tra TypeScript & build thử nghiệm
bun run build

# 5. Khởi chạy dev server
bun run dev
```

**Kiểm tra tình trạng Frontend:**
- Terminal sẽ hiển thị địa chỉ cục bộ (thường là `http://localhost:3000` hoặc `http://localhost:5173`).
- Mở trình duyệt truy cập địa chỉ trên.

---

## 7. QUY TRÌNH NGHIỆM THU NGÂN HÀNG CÂU HỎI TRÊN MÁY MỚI (CHECKLIST 12 TIÊU CHÍ)

Đăng nhập bằng tài khoản Content Specialist hợp lệ (ví dụ `content@gmail.com` hoặc `content@studyai.internal`), điều hướng đến `/content/questions`:

- [ ] **1. Tải trang:** Trang Ngân hàng câu hỏi hiển thị đầy đủ, không có lỗi màn hình trắng hay lỗi console đỏ.
- [ ] **2. KPI Dashboard:** 6 thẻ chỉ số (Tổng câu hỏi, Bản nháp, Chờ duyệt, Đã duyệt, Đã xuất bản, Thùng rác) hiển thị số liệu thực tế lấy từ API backend. Thẻ "Tổng câu hỏi" có phụ đề giải thích rõ ràng số lượng bản ghi SQL.
- [ ] **3. Bảng 5 cột tinh gọn:** Bảng hiển thị đúng 5 cột: `[Mã câu]`, `[Môn / Lớp]`, `[Nội dung câu hỏi]`, `[Trạng thái]`, `[Thao tác]`.
- [ ] **4. Chip siêu dữ liệu:** Dưới đề bài có các chip hiển thị Dạng câu hỏi, Độ khó, Nguồn gốc (VNHSGE Sparkles hoặc Thủ công).
- [ ] **5. Công thức toán học (MathView):** Các câu hỏi có công thức KaTeX (`$y = x^2$`, phân số, ký hiệu hóa học) hiển thị đẹp mắt, văn bản tiếng Việt thường không bị in nghiêng và không bị mất dấu cách giữa các từ.
- [ ] **6. Không trùng nút:** Chỉ có duy nhất 1 nút `+ Soạn câu hỏi mới` màu Navy nằm ở thanh công cụ lọc của bảng.
- [ ] **7. Menu ba chấm (`MoreVertical`):** Nhấp vào nút 3 chấm mở ra dropdown chứa các thao tác tương ứng với trạng thái (Sửa, Gửi duyệt, Duyệt, Từ chối, Xuất bản, Gỡ xuất bản, Xóa mềm, Khôi phục). Menu không bị cắt cụt bởi mép bảng.
- [ ] **8. Xem trước 1-click:** Bấm biểu tượng con mắt mở ngay Master-Detail Preview panel hoặc modal xem chi tiết câu hỏi kèm lời giải KaTeX.
- [ ] **9. Thao tác CRUD thực tế:** Thử tạo 1 câu hỏi mới dạng draft -> Sửa nội dung -> Gửi duyệt -> Phê duyệt -> Xuất bản -> Gỡ xuất bản -> Xóa mềm vào Thùng rác -> Khôi phục thành công.
- [ ] **10. Bộ lọc & Tìm kiếm:** Lọc theo Môn học, Khối lớp, Độ khó, Dạng câu và tìm kiếm theo từ khóa hoạt động mượt mà.
- [ ] **11. Bảo mật vai trò (RBAC):** Đăng nhập tài khoản Learner truy cập `/content/questions` bị chặn với thông báo 403 Forbidden.
- [ ] **12. Responsive:** Co giãn trình duyệt ở các kích thước 1920px, 1366px, 768px, 390px kiểm tra không bị tràn thanh cuộn ngang trang (Zero horizontal overflow).

---

## 8. HƯỚNG DẪN CHẠY PLAYWRIGHT E2E TỰ ĐỘNG TRÊN MÁY MỚI

Để kiểm thử tự động toàn diện bằng Playwright trên máy mới:

```powershell
cd C:\Projects\STUDY_AI-

# 1. Cài đặt trình duyệt Chromium cho Playwright nếu chưa có
bunx playwright install chromium

# 2. Chạy toàn bộ 21 kịch bản E2E
bun run scripts/e2e_question_bank_playwright.ts
```

Toàn bộ ảnh chụp nghiệm thu tự động sẽ được ghi nhận vào thư mục `docs/visual-qa/question-bank/`.

---

## 9. QUY TẮC AN TOÀN VÀ ĐIỀU KHOẢN MIỄN TRỪ

1. **Không merge vào `main`:** Mọi thay đổi chỉ nằm trên nhánh `feature/content-question-bank`.
2. **Không deploy production:** Không thực hiện bất kỳ lệnh deploy nào lên máy chủ production.
3. **Không ghi dữ liệu vào `StudyAIDb`:** Mọi thao tác kiểm thử, nhập liệu và thử nghiệm bắt buộc chỉ thực hiện trên `StudyAIDb_E2E`.
4. **Bảo toàn dữ liệu VNHSGE:** Mọi bản ghi câu hỏi VNHSGE giữ nguyên vẹn `sourceType = 'vnhsge'` và `sourceUrl` để đảm bảo truy xuất nguồn gốc hợp lệ.

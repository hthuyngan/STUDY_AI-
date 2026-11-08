# STUDY_AI — MA TRẬN PHÂN QUYỀN VAI TRÒ (RBAC MATRIX)

**Hệ thống**: Backend ASP.NET Core (.NET 10) + Frontend React 19  
**Giai đoạn**: Phase 15 — Complete Real Authentication & RBAC  

---

## 1. DANH SÁCH VAI TRÒ HỆ THỐNG

| Vai trò (Role) | Mô tả trách nhiệm | Quyền hạn cấp phát |
|---|---|---|
| `learner` | Học sinh học tập theo chương trình GDPT 2018 | Tự đăng ký mặc định. Chỉ truy cập dữ liệu cá nhân của chính mình. |
| `admin` | Quản trị viên hệ thống | Toàn quyền quản trị tài khoản, phân quyền, xem thống kê, nhật ký kiểm toán. |
| `teacher` | Giáo viên quản lý lớp và chấm bài | Truy cập phân hệ giáo viên (Phase 16). |
| `content` | Ban biên tập và kiểm duyệt nội dung | Quản lý môn học, chương, bài học và luồng duyệt bài GDPT 2018. |
| `support` | Nhân viên hỗ trợ người học | Xử lý ticket và yêu cầu trợ giúp (Phase 16). |

---

## 2. MA TRẬN PHÂN QUYỀN API BACKEND (AUTHORIZATION POLICIES)

| Phân hệ / Endpoint | Learner | Content | Teacher | Support | Admin | Cơ chế kiểm soát |
|---|:---:|:---:|:---:|:---:|:---:|---|
| **Auth Operations** | | | | | | |
| `POST /api/v1/auth/register` | ✔ | ✔ | ✔ | ✔ | ✔ | Công khai. Gán cứng role `learner`. |
| `POST /api/v1/auth/login` | ✔ | ✔ | ✔ | ✔ | ✔ | Công khai. Kiểm tra mật khẩu Argon2id. |
| `POST /api/v1/auth/refresh` | ✔ | ✔ | ✔ | ✔ | ✔ | Xác thực qua HttpOnly Cookie. |
| `POST /api/v1/auth/logout` | ✔ | ✔ | ✔ | ✔ | ✔ | Xác thực qua Cookie, thu hồi phiên. |
| `GET /api/v1/auth/me` | ✔ | ✔ | ✔ | ✔ | ✔ | Yêu cầu `[Authorize]`, lấy từ token sub. |
| **Personal Learning Data** | | | | | | |
| `GET/PUT /api/v1/me/lesson-progress` | ✔ (Self) | ✖ | ✖ | ✖ | ✖ | Bắt buộc `UserId == CurrentUserId`. |
| `GET/POST /api/v1/me/assessment-attempts` | ✔ (Self) | ✖ | ✖ | ✖ | ✖ | Bắt buộc `UserId == CurrentUserId`. |
| `POST /api/v1/me/learning-events/batch` | ✔ (Self) | ✖ | ✖ | ✖ | ✖ | Bắt buộc `UserId == CurrentUserId`. |
| `GET /api/v1/users/{id}/lesson-progress` | ✔ (Self) | ✖ | ✖ | ✖ | ✔ | Cho phép chính chủ hoặc Admin. |
| **Curriculum Content Management** | | | | | | |
| `GET /api/v1/content/subjects` | ✔ | ✔ | ✔ | ✔ | ✔ | Công khai / Người học xem bài giảng. |
| `GET /api/v1/content/lessons/{id}` | ✔ | ✔ | ✔ | ✔ | ✔ | Công khai / Người học xem nội dung. |
| `POST/PATCH /api/v1/content/lessons` | ✖ | ✔ | ✖ | ✖ | ✔ | Chính sách `[Authorize(Roles = "admin,content")]`. |
| `POST /lessons/{id}/submit-review` | ✖ | ✔ | ✖ | ✖ | ✔ | Chính sách `ContentStaff`. |
| `POST /lessons/{id}/approve` | ✖ | ✔ | ✖ | ✖ | ✔ | Chính sách `ContentStaff`. |
| **Administration & System Oversight** | | | | | | |
| `GET /api/v1/admin/dashboard` | ✖ | ✖ | ✖ | ✖ | ✔ | Chính sách `[Authorize(Roles = "admin")]`. |
| `GET /api/v1/admin/users` | ✖ | ✖ | ✖ | ✖ | ✔ | Chính sách `AdminOnly`. |
| `PATCH /api/v1/admin/users/{id}/role` | ✖ | ✖ | ✖ | ✖ | ✔ | AdminOnly + Chặn hạ quyền Admin cuối cùng. |
| `PATCH /api/v1/admin/users/{id}/status` | ✖ | ✖ | ✖ | ✖ | ✔ | AdminOnly + Chặn khóa Admin cuối cùng. |
| `POST /api/v1/admin/users/{id}/revoke-sessions` | ✖ | ✖ | ✖ | ✖ | ✔ | AdminOnly. |
| `GET /api/v1/admin/system/health` | ✖ | ✖ | ✖ | ✖ | ✔ | AdminOnly. |
| **Teacher & Support (Deferred)** | | | | | | |
| `Teacher Endpoints` (classes, assignments) | ✖ | ✖ | *Hoãn* | ✖ | *Hoãn* | **DEFERRED (Phase 16)**. Frontend dùng mock. |
| `Support Endpoints` (tickets, messages) | ✖ | ✖ | ✖ | *Hoãn* | *Hoãn* | **DEFERRED (Phase 16)**. Frontend dùng mock. |

---

## 3. CÁC QUY TẮC AN TOÀN BẮT BUỘC

1. **Thực thi phân quyền tại Backend**: Mọi quyết định cấp quyền đều được thẩm định nghiêm ngặt tại Controller / Policy của ASP.NET Core thông qua thuộc tính `[Authorize(Roles = "...")]` và logic `CanAccess(targetUserId)`. Frontend Guard (`RoleGuard`, `PermissionGuard`) chỉ phục vụ định tuyến giao diện người dùng.
2. **Không tự cấp quyền (No Privilege Escalation)**: Người dùng tự đăng ký qua `POST /api/v1/auth/register` luôn được gán cứng vai trò `Role = "learner"`. Mọi tham số role gửi từ client đều bị bỏ qua.
3. **Bảo vệ Quản trị viên Cuối cùng (Last Active Admin Protection)**: API từ chối hạ vai trò (`UpdateUserRole`) hoặc khóa tài khoản (`UpdateUserStatus`) nếu tài khoản đó là Admin hoạt động duy nhất trong hệ thống (`activeAdmins <= 1`).
4. **Cô lập dữ liệu tuyệt đối giữa các tài khoản**: Mỗi người học chỉ được phép đọc và ghi dữ liệu học tập thuộc quyền sở hữu của chính mình (`p.UserId == CurrentUserId`). Mọi nỗ lực truy cập dữ liệu của học sinh khác đều bị chặn với HTTP 403 Forbidden.

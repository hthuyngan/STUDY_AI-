# Kiểm soát An toàn & Bảo mật Thao tác Quản trị (Admin User Operations Security)

## 1. Nguyên tắc An toàn & Quyền hạn (Principle of Least Privilege)

Mọi thao tác quản lý tài khoản người dùng đều được thực thi và kiểm soát nghiêm ngặt tại Backend ASP.NET Core:
- Tất cả endpoints quản trị thuộc route `/api/v1/admin/*` đều được bảo vệ bởi attribute `[Authorize(Roles = "admin")]`.
- Người dùng có vai trò `learner`, `teacher`, `content`, hoặc `support` khi gọi bất kỳ API quản trị nào đều bị từ chối ngay tại tầng middleware với mã `HTTP 403 Forbidden`.
- Giao diện Frontend chỉ đóng vai trò hỗ trợ trải nghiệm người dùng (UX Guard), quyền hạn bắt buộc phải được thẩm định độc lập tại máy chủ.

---

## 2. Kiểm soát An toàn Mật khẩu & Xác thực

1. **Thuật toán Băm Mật khẩu**:
   - Sử dụng **Argon2id** với tham số an toàn cao:
     - Memory: 64 MB (65,536 KB)
     - Iterations: 3 passes
     - Parallelism: 1 lane
     - Salt: 16 bytes ngẫu nhiên từ `RandomNumberGenerator`
2. **Sinh Mật khẩu Tạm An toàn**:
   - Khi tạo người dùng mới hoặc đặt lại mật khẩu mà Admin không nhập mật khẩu cụ thể, hệ thống sinh mật khẩu ngẫu nhiên:
     - Tối thiểu 12 ký tự
     - Đầy đủ 4 nhóm ký tự: Chữ in hoa (`ABCDEFGHJKLMNPQRSTUVWXYZ`), chữ thường (`abcdefghijkmnopqrstuvwxyz`), chữ số (`23456789`), ký tự đặc biệt (`!@#$%^&*`).
     - Trộn ngẫu nhiên (Fisher-Yates / `RandomNumberGenerator.Shuffle`).
3. **Chống Rò rỉ Thông tin Mật khẩu**:
   - Mật khẩu gốc và `PasswordHash` **không bao giờ** xuất hiện trong database logs, application logs hay response DTO thông thường (`AdminUserDto`, `UserResponseDto`).
   - Mật khẩu tạm chỉ xuất hiện trong phản hồi tức thời của lệnh tạo tài khoản hoặc đặt lại mật khẩu để Admin gửi cho người dùng.

---

## 3. Thu hồi Phiên & Chống Tấn công Tái sử dụng (Session Revocation)

1. **Thu hồi Tức thời khi Khóa / Xóa Tài khoản**:
   - Khi tài khoản chuyển sang trạng thái `suspended` hoặc `disabled`, hoặc bị xóa mềm (`IsDeleted = true`):
     - Mọi bản ghi trong bảng `refresh_sessions` liên kết với `userId` đều bị xóa hoặc đánh dấu vô hiệu hóa lập tức.
     - Lần gọi `/refresh` hoặc API tiếp theo của trình duyệt mục tiêu sẽ thất bại.
2. **Thu hồi khi Đặt lại Mật khẩu**:
   - Khi mật khẩu được đặt lại bởi Admin, toàn bộ phiên đăng nhập cũ trên mọi thiết bị (Mobile, Tablet, Desktop) của người dùng đó bị thu hồi toàn bộ, bắt buộc người dùng phải đăng nhập lại bằng mật khẩu mới.
3. **Phát hiện Tái sử dụng Refresh Token (RFC 6819)**:
   - Nếu một token đã thu hồi được gửi lên, hệ thống phát hiện hành vi chiếm đoạt phiên và tự động thu hồi toàn bộ các phiên hoạt động còn lại của tài khoản đó.

---

## 4. Chính sách Nhật ký Kiểm toán (Staff Audit Logging Policy)

Mọi thao tác quản trị tài khoản đều tự động ghi lại bản ghi kiểm toán trong bảng `staff_audit_logs`:

| Trường dữ liệu | Kiểu dữ liệu | Ý nghĩa |
| :--- | :--- | :--- |
| `Id` | `nvarchar(64)` | Định danh duy nhất của bản ghi log (`log_{guid}`). |
| `ActorUserId` | `nvarchar(64)` | Định danh Admin thực hiện thao tác (trích xuất từ JWT Claims). |
| `Action` | `nvarchar(64)` | Loại hành động (`user_created`, `user_updated`, `role_changed`, `user_suspended`, `user_activated`, `sessions_revoked`, `password_reset_by_admin`, `user_soft_deleted`). |
| `TargetType` | `nvarchar(64)` | Loại đối tượng chịu tác động (`user`). |
| `TargetId` | `nvarchar(64)` | Định danh người dùng bị tác động. |
| `Payload` | `nvarchar(max)` | Dữ liệu chi tiết trước và sau thay đổi (JSON). Tuyệt đối **không** chứa mật khẩu, JWT hay refresh token. |
| `CreatedAt` | `datetimeoffset` | Thời điểm UTC chính xác của thao tác. |

---

## 5. Cấu hình CORS & Cookie Security

1. **Allowlist Môi trường Development**:
   - Tự động cho phép các origin phát triển nội bộ trên `localhost` và `127.0.0.1` (Vite dev server, Vite preview server, test runner ports).
2. **Strict Origin Allowlist Môi trường Production**:
   - Đọc chặt chẽ từ cấu hình `Cors:AllowedOrigins` trong `appsettings.json` hoặc biến môi trường `Cors__AllowedOrigins__*`.
3. **Cờ Cookie Bảo vệ**:
   - `HttpOnly`: Client JavaScript không thể đọc được cookie chứa refresh token.
   - `SameSite=Lax`: Ngăn ngừa tấn công Cross-Site Request Forgery (CSRF).
   - `Secure`: Tự động kích hoạt khi chạy qua giao thức HTTPS.

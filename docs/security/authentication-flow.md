# STUDY_AI — QUY TRÌNH XÁC THỰC VÀ QUẢN LÝ ĐỊNH DANH (AUTHENTICATION FLOW)

**Hệ thống**: Backend ASP.NET Core (.NET 10) + Frontend React 19  
**Giai đoạn**: Phase 15 — Complete Real Authentication & RBAC  
**Tác giả**: Senior Security Architect & Fullstack Engineer  

---

## 1. TỔNG QUAN LUỒNG XÁC THỰC HAI LỚP (DUAL-TOKEN ARCHITECTURE)

STUDY_AI áp dụng mô hình bảo mật Token kép kết hợp Cookie HttpOnly nhằm loại trừ hoàn toàn các nguy cơ tấn công XSS và đánh cắp phiên:

1. **Access Token (JWT Bearer)**:
   - Thời hạn: 30 phút (`Jwt:AccessTokenExpireMinutes: 30`).
   - Lưu trữ: **Chỉ lưu trong bộ nhớ RAM (`inMemoryAccessToken`)**. Tuyệt đối không ghi vào `localStorage`, `sessionStorage` hay `IndexedDB`.
   - Vận chuyển: Gửi qua tiêu đề `Authorization: Bearer <token>` trên mỗi HTTP request.
   - Claims: `sub` (User ID), `email`, `role`, `type: "access"`, `iss: "StudyAI.Api"`, `aud: "StudyAI.Client"`.

2. **Refresh Token (Opaque Cryptographic Token)**:
   - Độ dài: 48 bytes ngẫu nhiên mật mã cao sinh bởi `RandomNumberGenerator`.
   - Lưu trữ phía Client: **HttpOnly, Secure Cookie** (`study_ai_refresh_token`). JavaScript không thể đọc được.
   - Lưu trữ phía Server: Chỉ lưu mã băm **SHA-256** (`TokenHash`) trong bảng `refresh_sessions` trên SQL Server.
   - Thời hạn: 7 ngày (`Jwt:RefreshTokenExpireDays: 7`).

---

## 2. QUY TRÌNH ĐĂNG KÝ TÀI KHOẢN (REGISTRATION FLOW)

```
[User] -> (Form Đăng ký) -> POST /api/v1/auth/register
                                 │
                                 ├── 1. Kiểm tra Email format & chuẩn hóa ToLowerInvariant()
                                 ├── 2. Kiểm tra DisplayName non-empty
                                 ├── 3. Kiểm tra độ dài mật khẩu (8 - 128 ký tự)
                                 ├── 4. Kiểm tra trùng email trên SQL Server (Unique Index)
                                 ├── 5. Băm mật khẩu bằng Argon2id (m=64MB, t=3, p=4)
                                 ├── 6. Gán cứng Role = "learner", Status = "active"
                                 ├── 7. Lưu User & RefreshSession vào SQL Server
                                 ├── 8. Đặt HttpOnly Cookie & trả về JWT Access Token + User DTO
                                 ▼
                     Frontend: setAccessToken() & chuyển về /dashboard
```

---

## 3. QUY TRÌNH ĐĂNG NHẬP (LOGIN FLOW & BRUTE FORCE DEFENSE)

```
[User] -> (Form Đăng nhập) -> POST /api/v1/auth/login
                                 │
                                 ├── 1. Kiểm tra Lockout trong bộ nhớ (_loginAttempts)
                                 │      └── Nếu >= 5 lần sai liên tiếp: Trả về HTTP 429 Too Many Requests
                                 │
                                 ├── 2. Tìm User theo EmailNormalized trên SQL Server
                                 ├── 3. Đối soát mật khẩu qua Argon2id Constant-time
                                 │      └── Nếu sai: Tăng số lần lỗi, khóa 5 phút nếu đạt 5 lần, trả 401
                                 │
                                 ├── 4. Xóa bản ghi lỗi nếu xác thực thành công
                                 ├── 5. Kiểm tra trạng thái tài khoản:
                                 │      └── Nếu status in ("suspended", "disabled"): Trả về 403 Forbidden
                                 │
                                 ├── 6. Cập nhật LastLoginAt, tạo RefreshSession & Access Token
                                 ├── 7. Ghi StaffAuditLog nếu tài khoản có vai trò Staff/Admin
                                 ├── 8. Gửi HttpOnly Cookie & trả về Access Token + User Info (Status: active)
                                 ▼
                     Frontend: setAccessToken(), setAuthUser(), chuyển trang theo vai trò
```

---

## 4. QUY TRÌNH KHÔI PHỤC PHIÊN LÀM VIỆC (SESSION RESTORATION & ROTATION)

Khi người dùng mở lại trình duyệt hoặc tải lại trang (F5):
1. `AuthProvider` gửi `POST /api/v1/auth/refresh` kèm cookie `study_ai_refresh_token` (`credentials: 'include'`).
2. Server băm token từ cookie bằng SHA-256 và tra cứu trong bảng `refresh_sessions`.
3. **Phát hiện tái sử dụng (RFC 6819 Reuse Detection)**:
   - Nếu `session.RevokedAt != null`, server nhận diện dấu hiệu token cũ bị kẻ tấn công gửi lại.
   - Lập tức **thu hồi toàn bộ mọi phiên đang hoạt động của người dùng**, xóa cookie và trả về 401.
4. Nếu session hợp lệ:
   - Đánh dấu thu hồi session hiện tại (`RevokedAt = UtcNow`).
   - Tạo session mới với token 48 bytes mới (Rotation).
   - Đặt lại cookie mới và trả về Access Token mới cùng thông tin người dùng.

---

## 5. QUY TRÌNH ĐĂNG XUẤT (LOGOUT FLOW)

1. Client gọi `POST /api/v1/auth/logout`.
2. Server tra cứu session qua token hash trong cookie và đánh dấu `RevokedAt = UtcNow`.
3. Ghi `staff_logout` vào `staff_audit_logs` nếu là tài khoản quản trị/nhân sự.
4. Xóa Cookie `study_ai_refresh_token` với `Expires = UtcNow.AddDays(-1)`.
5. Frontend xóa sạch token trong bộ nhớ (`clearAuthSession`), chuyển trạng thái người dùng về `guest`.

# STUDY_AI — QUẢN LÝ PHIÊN LÀM VIỆC VÀ COOKIE AN TOÀN (SESSION MANAGEMENT)

**Hệ thống**: Backend ASP.NET Core (.NET 10) + Frontend React 19  
**Giai đoạn**: Phase 15 — Complete Real Authentication & RBAC  

---

## 1. THÔNG SỐ VÀ CẤU HÌNH COOKIE

Cookie phiên làm việc được thiết lập tự động bởi ASP.NET Core API trên các phản hồi đăng nhập, đăng ký và làm mới phiên:

- **Tên Cookie**: `study_ai_refresh_token`
- **HttpOnly**: `true` (Trình duyệt chặn hoàn toàn các đoạn mã JavaScript truy cập cookie, miễn nhiễm trước tấn công XSS).
- **Secure**: `Request.IsHttps` (Bật cờ Secure bắt buộc khi chạy qua giao thức HTTPS trên Staging/Production).
- **SameSite**: 
  - Môi trường HTTPS: `SameSiteMode.None` (cho phép mang cookie qua các domain khác nhau giữa API và Web).
  - Môi trường HTTP Cục bộ: `SameSiteMode.Lax` (đảm bảo tương thích với các trình duyệt chặn SameSite=None trên kết nối không bảo mật).
- **Path**: `/` (áp dụng toàn bộ phạm vi domain).
- **Thời hạn**: 7 ngày (`Jwt:RefreshTokenExpireDays: 7`).

---

## 2. BẢNG CƠ SỞ DỮ LIỆU `refresh_sessions`

Mỗi phiên đăng nhập tương ứng với một bản ghi trên bảng `refresh_sessions` trong Microsoft SQL Server:

```sql
CREATE TABLE [refresh_sessions] (
    [Id] nvarchar(64) NOT NULL,
    [UserId] nvarchar(64) NOT NULL,
    [TokenHash] nvarchar(64) NOT NULL,
    [CreatedAt] datetimeoffset NOT NULL,
    [ExpiresAt] datetimeoffset NOT NULL,
    [RevokedAt] datetimeoffset NULL,
    [ReplacedByTokenHash] nvarchar(64) NULL,
    [UserAgent] nvarchar(max) NULL,
    [LastUsedAt] datetimeoffset NULL,
    CONSTRAINT [PK_refresh_sessions] PRIMARY KEY ([Id]),
    CONSTRAINT [FK_refresh_sessions_users_UserId] FOREIGN KEY ([UserId]) REFERENCES [users] ([Id]) ON DELETE CASCADE
);
CREATE INDEX [IX_refresh_sessions_TokenHash] ON [refresh_sessions] ([TokenHash]);
CREATE INDEX [IX_refresh_sessions_UserId] ON [refresh_sessions] ([UserId]);
```

- **Nguyên tắc không lưu Plaintext**: Token thô được băm bằng SHA-256 (`_jwtTokenService.HashRefreshToken`) trước khi ghi vào cột `TokenHash`. Kẻ tấn công ngay cả khi truy cập được cơ sở dữ liệu cũng không thể mạo danh phiên người dùng.

---

## 3. CƠ CHẾ XOAY VÒNG PHIÊN (REFRESH TOKEN ROTATION)

1. Mỗi lần endpoint `POST /api/v1/auth/refresh` được gọi:
   - Token cũ được đánh dấu `RevokedAt = DateTimeOffset.UtcNow`.
   - Một chuỗi ngẫu nhiên 48 bytes mới được sinh ra (`GenerateRefreshToken`).
   - Tạo mới một bản ghi `RefreshSession` trong SQL Server.
   - Ghi đè cookie `study_ai_refresh_token` trên trình duyệt bằng giá trị mới.
2. Điều này đảm bảo một Refresh Token chỉ được sử dụng đúng một lần duy nhất.

---

## 4. PHÁT HIỆN TÁI SỬ DỤNG TOKEN (RFC 6819 TOKEN REUSE DETECTION)

Theo khuyến nghị bảo mật OAuth 2.0 Threat Model (RFC 6819, Mục 5.2.2.3):
- Nếu một request gửi lên refresh token mà session tương ứng trong SQL Server đã có `RevokedAt != null`:
  - Hệ thống xác định đây là hành vi replay token (do bị kẻ xấu đánh cắp hoặc tấn công trung gian).
  - Lập tức kích hoạt lệnh thu hồi khẩn cấp:
    ```csharp
    var activeSessions = await _db.RefreshSessions
        .Where(s => s.UserId == session.UserId && s.RevokedAt == null)
        .ToListAsync();

    foreach (var s in activeSessions)
    {
        s.RevokedAt = DateTimeOffset.UtcNow;
    }
    await _db.SaveChangesAsync();
    ClearRefreshCookie();
    ```
  - Mọi phiên đăng nhập của người dùng trên toàn bộ các thiết bị khác đều bị hủy bỏ lập tức.

---

## 5. XỬ LÝ CONCURRENT REFRESH & MULTI-TAB PHÍA FRONTEND

Phía Frontend React 19 trong [`apiClient.ts`](file:///e:/AI_tutor/frontend/src/lib/apiClient.ts):
- Triển khai hàng đợi xử lý duy nhất (Single In-flight Refresh Promise):
  - Khi có nhiều request API đồng thời nhận mã lỗi 401, chỉ có **duy nhất một request đầu tiên** kích hoạt gọi `/api/v1/auth/refresh`.
  - Các request còn lại xếp hàng đợi kết quả của request đầu tiên.
  - Sau khi refresh thành công, toàn bộ các request đang chờ được gán lại Access Token mới và thử lại (Retry) mà không gây ra xung đột race-condition xoay vòng token.
- Khi người dùng đăng xuất ở một tab: Cookie bị xóa, các tab khác khi gọi request tiếp theo sẽ tự động chuyển về trạng thái `guest` mà không rơi vào vòng lặp vô tận.

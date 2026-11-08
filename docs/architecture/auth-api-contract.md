# STUDY_AI — HỢP ĐỒNG GIAO DIỆN API XÁC THỰC (AUTH API CONTRACT)

**Hệ thống**: Backend ASP.NET Core (.NET 10)  
**Tiêu chuẩn định dạng**: JSON, CamelCase, RFC 7807 (Problem Details / Clean Error Objects)  

---

## 1. POST /api/v1/auth/register

Tạo mới tài khoản người học trong hệ thống.

- **Authentication**: Không yêu cầu (Public).
- **Request Headers**: `Content-Type: application/json`
- **Request Body**:
```json
{
  "email": "student@studyai.internal",
  "password": "SecurePassword@123",
  "displayName": "Nguyễn Thu Uyên",
  "grade": "Lớp 12"
}
```
- **Validation Rules**:
  - `email`: Bắt buộc, định dạng email chuẩn, không trùng lặp.
  - `displayName`: Bắt buộc, không được để trống hoặc chỉ có khoảng trắng.
  - `password`: Bắt buộc, độ dài từ 8 đến 128 ký tự.
- **Success Response (HTTP 201 Created)**:
  - **Set-Cookie**: `study_ai_refresh_token=<raw_token>; Path=/; HttpOnly; SameSite=Lax`
```json
{
  "accessToken": "eyJhbGciOiJIUzI1NiIsIn...",
  "tokenType": "bearer",
  "expiresIn": 1800,
  "user": {
    "id": "usr_9b1deb4d3b7d4bad9bdd2b0d7b3dcb6d",
    "email": "student@studyai.internal",
    "displayName": "Nguyễn Thu Uyên",
    "grade": "Lớp 12",
    "role": "learner",
    "status": "active",
    "createdAt": "2026-11-08T14:30:00.000Z"
  }
}
```
- **Error Responses**:
  - `HTTP 400 Bad Request`: `{"detail": "Email đã được sử dụng."}` hoặc `{"detail": "Mật khẩu phải chứa ít nhất 8 ký tự..."}`.

---

## 2. POST /api/v1/auth/login

Xác thực thông tin tài khoản và khởi tạo phiên đăng nhập mới.

- **Authentication**: Không yêu cầu (Public).
- **Request Headers**: `Content-Type: application/json`
- **Request Body**:
```json
{
  "email": "student@studyai.internal",
  "password": "SecurePassword@123"
}
```
- **Success Response (HTTP 200 OK)**:
  - **Set-Cookie**: `study_ai_refresh_token=<raw_token>; Path=/; HttpOnly; SameSite=Lax`
```json
{
  "accessToken": "eyJhbGciOiJIUzI1NiIsIn...",
  "tokenType": "bearer",
  "expiresIn": 1800,
  "user": {
    "id": "usr_9b1deb4d3b7d4bad9bdd2b0d7b3dcb6d",
    "email": "student@studyai.internal",
    "displayName": "Nguyễn Thu Uyên",
    "grade": "Lớp 12",
    "role": "learner",
    "status": "active",
    "createdAt": "2026-11-08T14:30:00.000Z"
  }
}
```
- **Error Responses**:
  - `HTTP 401 Unauthorized`: `{"detail": "Email hoặc mật khẩu không chính xác."}`.
  - `HTTP 403 Forbidden`: `{"detail": "Tài khoản của bạn đã bị khóa hoặc vô hiệu hóa. Vui lòng liên hệ hỗ trợ."}` (khi status là `suspended` hoặc `disabled`).
  - `HTTP 429 Too Many Requests`: `{"detail": "Tài khoản tạm thời bị khóa do nhập sai nhiều lần. Vui lòng thử lại sau 300 giây."}` (khi thất bại 5 lần liên tiếp).

---

## 3. POST /api/v1/auth/refresh

Làm mới JWT Access Token và xoay vòng Refresh Token Cookie.

- **Authentication**: Xác thực thông qua Cookie `study_ai_refresh_token`.
- **Request Headers**: Không yêu cầu Bearer token.
- **Success Response (HTTP 200 OK)**:
  - **Set-Cookie**: Ghi đè Cookie `study_ai_refresh_token` với token xoay vòng mới.
```json
{
  "accessToken": "eyJhbGciOiJIUzI1NiIsIn...",
  "tokenType": "bearer",
  "expiresIn": 1800,
  "user": {
    "id": "usr_9b1deb4d3b7d4bad9bdd2b0d7b3dcb6d",
    "email": "student@studyai.internal",
    "displayName": "Nguyễn Thu Uyên",
    "grade": "Lớp 12",
    "role": "learner",
    "status": "active",
    "createdAt": "2026-11-08T14:30:00.000Z"
  }
}
```
- **Error Responses**:
  - `HTTP 401 Unauthorized`: Phiên làm việc đã hết hạn, cookie không hợp lệ, hoặc phát hiện tái sử dụng token (RFC 6819).

---

## 4. POST /api/v1/auth/logout

Hủy phiên làm việc hiện tại và thu hồi cookie.

- **Authentication**: Không yêu cầu Bearer token, đọc cookie `study_ai_refresh_token`.
- **Success Response (HTTP 200 OK)**:
  - **Set-Cookie**: `study_ai_refresh_token=; Path=/; Expires=Thu, 01 Jan 1970 00:00:00 GMT`
```json
{
  "message": "Logged out successfully"
}
```

---

## 5. GET /api/v1/auth/me

Lấy thông tin danh tính của người dùng đang đăng nhập.

- **Authentication**: Bắt buộc `Authorization: Bearer <access_token>`.
- **Success Response (HTTP 200 OK)**:
```json
{
  "id": "usr_9b1deb4d3b7d4bad9bdd2b0d7b3dcb6d",
  "email": "student@studyai.internal",
  "displayName": "Nguyễn Thu Uyên",
  "grade": "Lớp 12",
  "role": "learner",
  "status": "active",
  "createdAt": "2026-11-08T14:30:00.000Z"
}
```
- **Error Responses**:
  - `HTTP 401 Unauthorized`: Token thiếu, không hợp lệ, hết hạn, sai claim `type != "access"`, hoặc tài khoản bị suspended/disabled trên SQL Server.

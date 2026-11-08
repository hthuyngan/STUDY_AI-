# Hợp đồng API Quản trị Hệ thống (Admin API Contract)

Base Path: `/api/v1/admin`  
Authorization: `Bearer <Admin JWT Access Token>`  
Response Content-Type: `application/json`

---

## 1. Danh sách Endpoints Quản trị

| Method | Endpoint | Quyền hạn | Mô tả chức năng |
| :--- | :--- | :--- | :--- |
| `GET` | `/users` | `AdminOnly` | Lấy danh sách người dùng phân trang từ SQL Server |
| `GET` | `/users/{id}` | `AdminOnly` | Xem thông tin chi tiết một tài khoản |
| `POST` | `/users` | `AdminOnly` | Tạo mới tài khoản (Learner, Teacher, Content, Support, Admin) |
| `PATCH` | `/users/{id}` | `AdminOnly` | Cập nhật thông tin tài khoản (Tên, Lớp, Vai trò, Trạng thái) |
| `PATCH` | `/users/{id}/role` | `AdminOnly` | Cập nhật riêng vai trò của tài khoản |
| `PATCH` | `/users/{id}/status` | `AdminOnly` | Khóa hoặc mở khóa tài khoản |
| `POST` | `/users/{id}/revoke-sessions` | `AdminOnly` | Thu hồi toàn bộ phiên đăng nhập của người dùng |
| `POST` | `/users/{id}/reset-password` | `AdminOnly` | Đặt lại mật khẩu và cấp mật khẩu tạm thời |
| `DELETE` | `/users/{id}` | `AdminOnly` | Xóa mềm tài khoản và bảo lưu lịch sử học tập |
| `GET` | `/dashboard` | `AdminOnly` | Lấy số liệu thống kê thực tế từ SQL Server |
| `GET` | `/audit-logs` | `AdminOnly` | Lấy danh sách nhật ký kiểm toán quản trị |
| `GET` | `/system/health` | `AdminOnly` | Kiểm tra kết nối cơ sở dữ liệu và hạ tầng |

---

## 2. Chi tiết Request & Response Contracts

### 2.1. GET `/api/v1/admin/users`
**Query Parameters**:
- `search` (string, optional): Từ khóa tìm kiếm theo tên, email, lớp, hoặc id.
- `role` (string, optional): `admin`, `teacher`, `content`, `support`, `learner`, hoặc `all`.
- `status` (string, optional): `active`, `suspended`, `disabled`, hoặc `all`.
- `includeDeleted` (bool, optional): Mặc định `false`.
- `sortBy` (string, optional): `createdAt`, `displayName`, `email`, `role`, `status`.
- `sortOrder` (string, optional): `asc`, `desc`.
- `page` (int, default: 1): Trang hiện tại.
- `pageSize` (int, default: 20): Số bản ghi mỗi trang.

**Response 200 OK**:
```json
{
  "items": [
    {
      "id": "usr_admin_1",
      "email": "admin@studyai.internal",
      "displayName": "Quản trị viên Hệ thống",
      "grade": "12",
      "role": "admin",
      "status": "active",
      "isDeleted": false,
      "deletedAt": null,
      "createdAt": "2026-11-08T10:00:00Z",
      "lastLoginAt": "2026-11-08T14:30:00Z"
    }
  ],
  "page": 1,
  "pageSize": 20,
  "total": 1,
  "totalPages": 1
}
```

---

### 2.2. POST `/api/v1/admin/users`
**Request Body**:
```json
{
  "email": "teacher.duc@studyai.internal",
  "displayName": "Thầy Hoàng Văn Đức",
  "role": "teacher",
  "status": "active",
  "grade": "12",
  "password": null
}
```

**Response 201 Created**:
```json
{
  "user": {
    "id": "usr_9f1b2c...",
    "email": "teacher.duc@studyai.internal",
    "displayName": "Thầy Hoàng Văn Đức",
    "grade": "12",
    "role": "teacher",
    "status": "active",
    "isDeleted": false,
    "deletedAt": null,
    "createdAt": "2026-11-08T15:00:00Z",
    "lastLoginAt": null
  },
  "temporaryPassword": "StudyAI!9fX2aK7p",
  "message": "Người dùng đã được tạo thành công."
}
```

**Response 409 Conflict** (Khi trùng email):
```json
{
  "detail": "Email đã được sử dụng."
}
```

---

### 2.3. PATCH `/api/v1/admin/users/{id}`
**Request Body**:
```json
{
  "displayName": "Thầy Hoàng Văn Đức (Cập nhật)",
  "grade": "12",
  "role": "teacher",
  "status": "active"
}
```

**Response 200 OK**:
```json
{
  "id": "usr_9f1b2c...",
  "email": "teacher.duc@studyai.internal",
  "displayName": "Thầy Hoàng Văn Đức (Cập nhật)",
  "grade": "12",
  "role": "teacher",
  "status": "active",
  "isDeleted": false,
  "deletedAt": null,
  "createdAt": "2026-11-08T15:00:00Z",
  "lastLoginAt": null
}
```

---

### 2.4. POST `/api/v1/admin/users/{id}/reset-password`
**Request Body**:
```json
{
  "newPassword": null
}
```

**Response 200 OK**:
```json
{
  "success": true,
  "userId": "usr_9f1b2c...",
  "temporaryPassword": "StudyAI!k8D3mQ1v",
  "message": "Mật khẩu đã được đặt lại thành công. Tất cả phiên đăng nhập cũ đã được thu hồi."
}
```

---

### 2.5. DELETE `/api/v1/admin/users/{id}`
**Response 200 OK**:
```json
{
  "success": true,
  "userId": "usr_9f1b2c...",
  "message": "Đã xóa mềm người dùng thành công. Lịch sử học tập được bảo lưu toàn vẹn."
}
```

**Response 400 BadRequest** (Khi xóa Admin cuối cùng):
```json
{
  "detail": "Không thể xóa quản trị viên hoạt động duy nhất của hệ thống."
}
```

---

### 2.6. GET `/api/v1/admin/dashboard`
**Response 200 OK**:
```json
{
  "metrics": {
    "totalUsers": 24,
    "activeUsers": 21,
    "suspendedUsers": 2,
    "disabledUsers": 1,
    "learnersCount": 18,
    "teachersCount": 3,
    "contentCount": 1,
    "supportCount": 1,
    "adminsCount": 1,
    "recentNewUsersCount": 6,
    "systemStatus": "healthy"
  },
  "recentActivities": [
    {
      "id": "log_a1b2c3",
      "action": "user_created",
      "actor": "Quản trị viên Hệ thống",
      "targetType": "user",
      "targetId": "usr_9f1b2c...",
      "payload": "{\"email\":\"teacher.duc@studyai.internal\",\"role\":\"teacher\",\"status\":\"active\"}",
      "timestamp": "2026-11-08T15:00:00Z"
    }
  ]
}
```

# STUDY_AI-

[![CI](https://github.com/hthuyngan/STUDY_AI-/actions/workflows/ci.yml/badge.svg)](https://github.com/hthuyngan/STUDY_AI-/actions/workflows/ci.yml)
[![Deploy to GitHub Pages](https://github.com/hthuyngan/STUDY_AI-/actions/workflows/deploy.yml/badge.svg)](https://github.com/hthuyngan/STUDY_AI-/actions/workflows/deploy.yml)

🌐 **Production Website**: [https://hthuyngan.github.io/STUDY_AI-/](https://hthuyngan.github.io/STUDY_AI-/)

STUDY_AI- là nền tảng gia sư & trợ lý học tập thông minh sử dụng AI, cung cấp giao diện hiện đại, hệ thống phân tích học tập thực tế và kiến trúc dữ liệu ngoại tuyến (Offline-First) kết hợp đồng bộ máy chủ backend.

---

## 🏗 Kiến trúc Hệ thống (Architecture Summary)

```
Browser UI (React 19 + TypeScript)
      │
      ├── Auth Layer (AuthProvider + in-memory JWT + HttpOnly refresh cookie)
      │
      ▼
Learning State Engine (Pure Aggregation & Derived Snapshot)
      │
      ▼
Repository Layer Abstraction (Identity-Aware Scoped Namespaces)
   ├── Local Persistence (study_ai.<identity>.*.v2 - Zero UI Latency & Multi-user isolation)
   ├── Remote Sync Queue (study_ai.<identity>.sync_queue.v2 - Resilient Background Dispatch)
   └── Protected Remote API (FastAPI + JWT Bearer + /api/v1/me/* canonical routes)
             │
             ▼
       Database (Argon2id hashes, refresh_sessions, SQLite Local / PostgreSQL-ready)
```

### Identity & Persistence Modes (Chế độ danh tính & lưu trữ)

1. **Guest Mode (Mặc định trên GitHub Pages & người dùng chưa đăng nhập)**:
   - Danh tính cục bộ ổn định (`guest_<random>_<timestamp>`).
   - Lưu trữ dữ liệu học tập vào namespace riêng `study_ai.<guest_id>.*.v2`.
   - Di chuyển tự động từ schema cũ `v1` sang guest namespace mà không gây gián đoạn hay mất mát dữ liệu.
   - Khi không có `VITE_API_BASE_URL`: hoạt động hoàn toàn offline, 0ms latency, không lỗi mạng console spam.

2. **Authenticated Mode (Đăng nhập bảo mật & Đồng bộ đám mây)**:
   - **Xác thực Backend-Native**: FastAPI + SQLAlchemy + Argon2id hash mật khẩu.
   - **Mô hình Token kép**:
     - *Access Token*: JWT ngắn hạn (15 phút), lưu **in-memory** duy nhất (không bao giờ lưu vào localStorage/sessionStorage/IndexedDB).
     - *Refresh Token*: Chuỗi ngẫu nhiên opaque (`secrets.token_urlsafe`), băm SHA-256 lưu trong bảng `refresh_sessions`. Client nhận qua **HttpOnly cookie** (`SameSite`, `Secure` tại production).
     - *Cơ chế quay vòng (Rotation)*: Mỗi lần gọi `POST /api/v1/auth/refresh`, refresh token cũ lập tức bị thu hồi và cấp token mới.
   - **API học tập bảo vệ**: Toàn bộ dữ liệu gắn với token (`/api/v1/me/lesson-progress`, `/api/v1/me/assessment-attempts`, `/api/v1/me/learning-events`, `/api/v1/me/sync/bootstrap`). Client không thể tự truyền `userId` để giả mạo danh tính.
   - **Cô lập nhiều người dùng**: User A và User B trên cùng máy tính lưu trữ ở các namespace `study_ai.<user_id>.*.v2` độc lập. Đăng xuất ẩn cache tài khoản, không để rò rỉ dữ liệu chéo.

3. **Guest → Account Data Migration**:
   - Khi khách có tiến độ trên thiết bị đăng nhập/đăng ký tài khoản, hệ thống hiển thị hộp thoại xác nhận rõ ràng:
     - `[ Đồng bộ vào tài khoản ]`: Hợp nhất tiến độ bài học, bài thu hoạch, lịch sử học tập lên `/api/v1/me/sync/bootstrap` theo quy tắc server newer-wins và không hạ cấp trạng thái đã hoàn thành.
     - `[ Giữ riêng trên thiết bị ]`: Không tải dữ liệu khách lên đám mây; tài khoản bắt đầu từ dữ liệu của chính tài khoản đó.

---

## 🛠 Tech Stack

### Frontend
- **Framework**: [React 19](https://react.dev/) + [Vite](https://vite.dev/)
- **Language**: [TypeScript](https://www.typescriptlang.org/)
- **State & Data**: AuthProvider (in-memory access token), Repository Pattern, Identity-Aware Sync Queue, Unified Learning State Engine
- **Styling**: Vanilla CSS tokens & Design System (Navy Notebook theme, dark mode support)
- **Testing & Quality**: Vitest (67 unit/integration tests), Oxlint (0 warnings)
- **Package Manager**: [Bun](https://bun.sh/)

### Backend
- **Framework**: [FastAPI](https://fastapi.tiangolo.com/) (Python 3.12+)
- **Security & Auth**: Argon2id password hashing (`argon2-cffi`), PyJWT short-lived access tokens, opaque rotating refresh sessions in HttpOnly cookies
- **ORM & Database**: [SQLAlchemy 2.x](https://www.sqlalchemy.org/) + [Alembic](https://alembic.sqlalchemy.org/) (Migrations 001 + 002)
- **Schemas & Config**: [Pydantic v2](https://docs.pydantic.dev/) + `pydantic-settings`
- **Testing**: Pytest + HTTPX TestClient (19 API integration tests across auth, isolation, and learning)
- **Database Engine**: SQLite cục bộ (`data/study_ai.db`), kiến trúc sẵn sàng kết nối PostgreSQL

---

## 🚀 Cài đặt & Chạy cục bộ (Local Full-stack Setup)

### 1. Khởi động Backend (FastAPI)

```bash
# Di chuyển vào thư mục backend
cd backend

# Cài đặt dependencies (yêu cầu Python 3.12+)
python -m pip install -e ".[dev]"

# Chạy migration database (tạo bảng SQLite)
alembic upgrade head

# Khởi động máy chủ backend tại cổng 8000
uvicorn app.main:app --reload --port 8000
```
- API Health: `http://localhost:8000/api/v1/health`
- Swagger UI Documentation: `http://localhost:8000/docs`

### 2. Khởi động Frontend (React)

```bash
# Di chuyển vào thư mục frontend
cd frontend

# Cài đặt dependencies
bun install --frozen-lockfile

# (Tùy chọn) Bật chế độ Hybrid kết nối backend:
# Thêm vào file frontend/.env:
# VITE_API_BASE_URL=http://localhost:8000/api/v1

# Khởi chạy frontend server
bun run dev
```
- Ứng dụng chạy tại: `http://localhost:5173/`

### 3. Chạy kiểm thử chất lượng

```bash
# Kiểm thử Frontend
cd frontend
bun run lint
bun run test
bun run build

# Kiểm thử Backend
cd backend
pytest -v
alembic current
```

---

## 🔄 Luồng CI/CD Tự Động (GitHub Actions)

1. **Pull Request (`feature/* -> main`)**:
   - Chạy job Frontend: Lint (`oxlint`), Test (`vitest`), Typecheck & Build.
   - Chạy job Backend: Setup Python 3.12, cài đặt dependencies, chạy migration `alembic upgrade head`, chạy toàn bộ `pytest`.
2. **Push vào `main`**:
   - CI kiểm tra hợp lệ toàn bộ Frontend + Backend.
   - Deploy tự động frontend production lên [GitHub Pages](https://hthuyngan.github.io/STUDY_AI-/).
   - *Lưu ý*: GitHub Pages là static hosting nên backend production chưa deploy (`Backend production deployment: NOT CONFIGURED`). Frontend trên GitHub Pages tự động vận hành ở chế độ Local Offline Fallback mượt mà 100%.

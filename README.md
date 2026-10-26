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
      ▼
Learning State Engine (Pure Aggregation & Derived Snapshot)
      │
      ▼
Repository Layer Abstraction
   ├── Local Persistence (localStorage - Zero UI Latency & Offline Fallback)
   ├── Remote Sync Queue (study_ai.sync_queue.v1 - Resilient Background Dispatch)
   └── Remote API (FastAPI + Pydantic v2 + SQLAlchemy 2.x)
             │
             ▼
       Database (SQLite Local / PostgreSQL Production-ready)
```

### Persistence Modes (Chế độ lưu trữ)

1. **Local Mode (Mặc định trên GitHub Pages & Offline)**:
   - Khi không cấu hình biến môi trường `VITE_API_BASE_URL`.
   - Toàn bộ dữ liệu học tập (Lesson Progress, Assessment Attempts, Learning Events) lưu tức thì vào trình duyệt.
   - Hoàn toàn không phát sinh lỗi mạng hoặc console spam.

2. **Hybrid Mode (Full-stack Local Development & Server Integration)**:
   - Khi cấu hình `VITE_API_BASE_URL=http://localhost:8000/api/v1`.
   - **Ghi**: Lưu cục bộ lập tức (0ms UI latency) + đưa tác vụ vào hàng đợi đồng bộ bất đồng bộ (`SyncQueue`).
   - **Đọc**: Khôi phục từ remote và hợp nhất với dữ liệu cục bộ chưa đồng bộ (quy tắc: server newer-wins, không hạ cấp bài thi đã nộp 100%).
   - **Tự phục hồi**: Tự động thử lại khi trình duyệt online trở lại (`window.online`) hoặc khi người dùng thao tác mới.
   - **Bootstrap tự động**: Di chuyển dữ liệu cũ từ `localStorage` lên máy chủ lần đầu tiên (`POST /users/{id}/sync/bootstrap`).

---

## 🛠 Tech Stack

### Frontend
- **Framework**: [React 19](https://react.dev/) + [Vite](https://vite.dev/)
- **Language**: [TypeScript](https://www.typescriptlang.org/)
- **State & Data**: Repository Pattern, Hybrid Offline-First Sync Queue, Unified Learning State Engine
- **Styling**: Vanilla CSS tokens & Design System
- **Testing & Quality**: Vitest (59 unit/integration tests), Oxlint (0 warnings)
- **Package Manager**: [Bun](https://bun.sh/)

### Backend
- **Framework**: [FastAPI](https://fastapi.tiangolo.com/) (Python 3.12+)
- **ORM & Database**: [SQLAlchemy 2.x](https://www.sqlalchemy.org/) + [Alembic](https://alembic.sqlalchemy.org/)
- **Schemas & Config**: [Pydantic v2](https://docs.pydantic.dev/) + `pydantic-settings`
- **Testing**: Pytest + HTTPX TestClient (10 API integration tests)
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

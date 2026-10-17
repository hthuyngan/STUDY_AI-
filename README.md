# STUDY_AI-

[![CI](https://github.com/hthuyngan/STUDY_AI-/actions/workflows/ci.yml/badge.svg)](https://github.com/hthuyngan/STUDY_AI-/actions/workflows/ci.yml)
[![Deploy to GitHub Pages](https://github.com/hthuyngan/STUDY_AI-/actions/workflows/deploy.yml/badge.svg)](https://github.com/hthuyngan/STUDY_AI-/actions/workflows/deploy.yml)

🌐 **Production Website**: [https://hthuyngan.github.io/STUDY_AI-/](https://hthuyngan.github.io/STUDY_AI-/)

STUDY_AI- là nền tảng gia sư & trợ lý học tập thông minh sử dụng AI, cung cấp giao diện hiện đại, hệ thống phân tích học tập và thư viện Design System tối ưu cho học sinh/sinh viên.

---

## 🛠 Tech Stack

- **Framework**: [React 19](https://react.dev/) + [Vite](https://vite.dev/)
- **Language**: [TypeScript](https://www.typescriptlang.org/)
- **Routing**: [React Router](https://reactrouter.com/) (hỗ trợ SPA trên GitHub Pages với fallback 404)
- **Linter**: [Oxlint](https://oxc.rs/docs/guide/usage/linter.html)
- **Package Manager**: [Bun](https://bun.sh/)
- **CI/CD**: GitHub Actions + GitHub Pages Auto Deployment

---

## 🚀 Cài đặt & Chạy cục bộ (Local Development)

### Yêu cầu
- Đã cài đặt [Bun](https://bun.sh/) (phiên bản >= 1.0)

### Các bước thực hiện
```bash
# 1. Di chuyển vào thư mục frontend
cd frontend

# 2. Cài đặt dependencies (sử dụng bun.lock)
bun install --frozen-lockfile

# 3. Khởi chạy server phát triển
bun run dev

# 4. Kiểm tra lint
bun run lint

# 5. Build production bundle
bun run build
```

---

## 🔄 Luồng CI/CD Tự Động (GitHub Actions)

Hệ thống được cấu hình tự động 100%:
1. **Pull Request (`feature/* -> main`)**:
   - Tự động kích hoạt workflow **CI** (`.github/workflows/ci.yml`).
   - Kiểm tra Lint (`oxlint`), Typecheck (`tsc`), và Build để đảm bảo code không có lỗi.
   - **Không** deploy lên production.
2. **Push / Merge vào `main`**:
   - Tự động kích hoạt workflow **Deploy to GitHub Pages** (`.github/workflows/deploy.yml`).
   - Tự động chạy lại quy trình Validate và Build.
   - Deploy bundle `frontend/dist` lên [GitHub Pages](https://hthuyngan.github.io/STUDY_AI-/).
   - Website production tự động cập nhật phiên bản mới nhất mà không cần thao tác thủ công.

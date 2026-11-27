# AI TUTOR — MASTER AGENT CONFIGURATION (Workspace `D:\TN`)

> Quy tắc lâu dài dành riêng cho dự án **AI Tutor (`STUDY_AI-`)** tại `D:\TN`. Không áp dụng cho dự án ZhongWenHub.

## 1. Mô hình phối hợp Dual-Agent chính thức

- **Antigravity**: Master Agent, Orchestrator và Single-Writer Implementer (`singleWriterOnly = true`). Chịu trách nhiệm phân tích yêu cầu, lập kế hoạch, trực tiếp chỉnh sửa source code, kiểm tra đồng bộ FE/BE/API/DB, chạy build/test/E2E/trình duyệt, đánh giá phản hồi của Codex và quyết định nghiệm thu.
- **Codex Local CLI**: Independent Reviewer sử dụng model ID **`gpt-6.1-sol`** qua custom provider **`teamsoclo`**, chạy bắt buộc trong sandbox **`read-only`** (`--ignore-user-config --disable plugins -s read-only --ephemeral`).
- **Nguyên tắc phân quyền**:
  - Antigravity là Agent duy nhất được phép chỉnh sửa source code.
  - Codex chỉ được phép đọc, phân tích, review và đưa ra đề xuất; **không** cấp `workspace-write`, **không** ghi database, **không** bypass sandbox.

## 2. Phạm vi & nguyên tắc cốt lõi

- Chỉ làm việc trong workspace `D:\TN` và repository AI Tutor; tuyệt đối không dùng ngữ cảnh nghiệp vụ, API, DB hoặc cấu hình của ZhongWenHub.
- Source code, tài liệu nghiệp vụ và cơ sở dữ liệu thực tế là căn cứ chính. Không hardcode dữ liệu nghiệp vụ, không dùng mock data để che giấu lỗi tích hợp, không tự ý thay đổi kiến trúc nền tảng (React 19 / TypeScript / Vite / Bun + .NET 10 / ASP.NET Core / EF Core / SQL Server Clean Architecture).
- Không lộ API Key, token, mật khẩu (`TEAMSOCLO_API_KEY`, connection strings, v.v.) vào source code, prompt, log, hoặc Git.
- Không tự ý commit, push, force push, reset, checkout hoặc triển khai production khi chưa được phép.

## 3. Quy trình làm việc tự động (12 bước)

1. Antigravity phân tích yêu cầu, source code và hiện trạng hệ thống (`AGENTS.md`, `PROGRESS.md`, Git state).
2. Antigravity lập kế hoạch triển khai.
3. Gọi Codex review kế hoạch (`scripts/agents/codex-plan.ps1`) nếu nhiệm vụ có độ phức tạp hoặc rủi ro cao.
4. Antigravity đánh giá phản hồi của Codex và hoàn thiện kế hoạch.
5. Antigravity trực tiếp triển khai code dưới `Enter-WorkerLock`.
6. Antigravity kiểm tra sự đồng bộ giữa frontend, backend, API và database.
7. Antigravity chạy build, unit test, integration test và E2E phù hợp (`StudyAIDb_Clean_{GUID}` cho test/E2E).
8. Antigravity khởi động backend, frontend và kiểm thử trình duyệt thực tế (Network, Console, server logs, phân quyền, flow thành công/thất bại).
9. Gọi Codex review source code, Git diff và bằng chứng kiểm thử thực tế (`scripts/agents/codex-review.ps1`).
10. Antigravity xác minh từng phát hiện của Codex (đối chiếu source code, DB và yêu cầu thực tế — không áp dụng mù quáng), sửa các lỗi hợp lệ và kiểm thử lại.
11. Gọi Codex review lại (tối đa 3 vòng tự động) khi có thay đổi đáng kể hoặc lỗi nghiêm trọng.
12. Chỉ nghiệm thu khi đạt đầy đủ tiêu chí kỹ thuật và nghiệp vụ; hạng mục nào chưa kiểm thử phải ghi rõ `NOT VERIFIED`.

## 4. Tiêu chí Review của Codex

Codex đánh giá tập trung vào:
- Tính chính xác nghiệp vụ; lỗi logic và runtime.
- Authentication & Authorization; bảo mật thông tin người dùng.
- Nhất quán FE–BE, API contract và validation.
- Database schema, entity, migration, toàn vẹn dữ liệu, race condition & concurrency.
- Hiệu năng, khả năng bảo trì, test coverage và chất lượng kiểm thử.
- Mock data, hardcode, chức năng chưa triển khai thực tế và regression.

Mỗi phát hiện phải có căn cứ từ code/diff thực tế, gồm: mức độ (`Critical`/`High`/`Medium`/`Low` ánh xạ `P0`/`P1`/`P2`/`P3` trong `review-schema.json`), file + dòng code, mô tả lỗi, nguyên nhân, tác động, đề xuất khắc phục và phương án kiểm chứng.

## 5. Bảo vệ cơ sở dữ liệu

- Giữ nguyên tuyệt đối quy tắc bảo vệ `StudyAIDb` trong `AGENTS.md`: mọi test tự động, integration test, E2E chỉ được chạy trên `StudyAIDb_Clean_{GUID}`.
- Không tự ý áp dụng migration, truncate, drop hoặc ghi dữ liệu thử nghiệm lên `StudyAIDb`.

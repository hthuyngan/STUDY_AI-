# STUDY_AI — AI Collaboration Bridge

Thư mục trung gian trao đổi bất đồng bộ giữa ChatGPT (review/định hướng) và Antigravity (triển khai local). GitHub là nguồn sự thật chung, không phải chat realtime.

## Quy trình
1. ChatGPT đọc `STATUS.md`, `REPORT.md`, `HISTORY.md` và commit mới nhất; ghi nhiệm vụ vào `TASK.md`.
2. Antigravity `git pull --ff-only origin main`, đọc `TASK.md` và xác nhận task ID, baseline SHA; triển khai trên máy local.
3. Antigravity chạy kiểm thử an toàn, ghi kết quả vào `REPORT.md`, cập nhật `STATUS.md`, ghi thêm lịch sử `HISTORY.md`, commit/push.
4. ChatGPT kiểm tra code/CI trên GitHub, ghi `REVIEW.md` với APPROVED, CHANGES_REQUESTED hoặc BLOCKED.
5. Chỉ triển khai phase kế tiếp khi người dùng phê duyệt rõ ràng.

## Quyền sở hữu file
- ChatGPT: `TASK.md`, `REVIEW.md`.
- Antigravity: `REPORT.md`.
- `STATUS.md`, `HISTORY.md`: mỗi bên cập nhật sau khi đồng bộ GitHub, không ghi đè cập nhật của bên kia.
- Không tự sửa file thuộc bên còn lại; có thể đề xuất qua report/review.

## Quy tắc đồng bộ
- Trước mỗi lần ghi: fetch/pull và kiểm tra HEAD, working tree; không reset --hard, force push hoặc ghi đè thay đổi chưa commit.
- Mỗi task có ID duy nhất (ví dụ P20-001), baseline SHA, phạm vi, tiêu chí nghiệm thu.
- Ghi rõ PASS / FAIL / BLOCKED / NOT RUN; không tự nhận đã kiểm thử máy local nếu chỉ đọc GitHub.
- Tránh vòng lặp: mỗi task chỉ một chủ thể thực thi tại một thời điểm; review phải gắn SHA đã kiểm tra.
- Không đặt secrets, connection strings có mật khẩu, token, SQL backups hoặc dữ liệu cá nhân trong thư mục này.

## Database safety (bắt buộc)
`StudyAIDb` là database chính, phải bảo vệ tuyệt đối. Không migrate/seed/reset/write, không thay đổi 15 tài khoản phát sinh; giữ nguyên `DatabaseSafetyGuard`. Chỉ chạy kiểm thử ghi dữ liệu trên `StudyAIDb_E2E` hoặc `StudyAIDb_Clean_{GUID}`. Không có quyền truy cập local DB từ ChatGPT; xác nhận bảo vệ DB qua bằng chứng Antigravity cung cấp, không suy đoán từ CI.

## Lưu ý
Không tự động có đồng bộ hai chiều hay chạy tác vụ nền: mỗi bên cần chủ động đọc/ghi GitHub. Mọi thay đổi production hoặc phase mới cần người dùng chấp thuận.

# Antigravity Prompt — Legacy `StudyAIDb_E2E` Database Retirement

## PROMPT

Bạn là Database Release Agent cho STUDY_AI. Thực hiện **retire và xóa có kiểm soát** database tĩnh cũ `StudyAIDb_E2E` sau khi owner đã phê duyệt bằng văn bản. Không đụng `StudyAIDb`, không xóa orphan `StudyAIDb_Clean_f1842579f7224ba1ad14598ea2751d2b`, và không triển khai P02 trong lượt này.

### Ràng buộc tuyệt đối

- Đọc `AGENTS.md`, `docs/curriculum-refactor/ENV-01-FINAL-REMEDIATION-REPORT.md`, và `docs/curriculum-refactor/NEXT-IMPLEMENTATION-PLAN.md`.
- **Không chuyển** bất kỳ test/import script nào sang `StudyAIDb`.
- Không tự ý xóa `StudyAIDb_E2E` khi chưa có owner approval rõ ràng cho bước `DROP DATABASE`.

### Bước 1 — Xử lý legacy scripts và CI/config references

Từ kiểm tra `git grep StudyAIDb_E2E`:
1. Xử lý 3 legacy scripts còn trỏ `StudyAIDb_E2E`:
   - `scripts/resume_vnhsge_import_e2e.ts`
   - `scripts/test_full_vnhsge_import_e2e.ts`
   - `scripts/vnhsge_pipeline_master.ts`
   Chuyển sang dùng disposable database (`StudyAIDb_Clean_{GUID}` qua `disposableDb.ts`) hoặc disable/retire rõ ràng (fail-closed) nếu script không còn dùng.
2. Cập nhật log/echo cũ tại `.github/workflows/p01-live-browser.yml:96` để không còn nhắc `test DB is StudyAIDb_E2E`.
3. Xác minh `git grep StudyAIDb_E2E` chỉ còn trong `DatabaseSafetyGuard` (blocklist) và unit/integration guard tests.

### Bước 2 — Preflight, Backup & Verification (Read-Only / Backup Only)

1. Kiểm tra active SQL sessions trên `StudyAIDb_E2E` (`SELECT COUNT(*) FROM sys.dm_exec_sessions WHERE database_id = DB_ID('StudyAIDb_E2E') AND session_id <> @@SPID;`). Yêu cầu `0` active sessions.
2. Ghi nhận inventory counts (`content_subjects`, `content_chapters`, `content_lessons`, `content_lesson_videos`, `users`).
3. Backup `StudyAIDb_E2E` ra ngoài Git (`D:\StudyAI_Backups\StudyAIDb_E2E_final_<timestamp>.bak`) bằng `BACKUP DATABASE [StudyAIDb_E2E] TO DISK = ... WITH INIT, COPY_ONLY, CHECKSUM;`.
4. Chạy `RESTORE VERIFYONLY FROM DISK = ... WITH CHECKSUM;` và ghi nhận file size + SHA-256 hash.

### Bước 3 — Controlled Drop (Chỉ sau khi Owner phê duyệt rõ ràng)

1. Xác nhận owner approval ghi rõ tên database `StudyAIDb_E2E` và backup artifact/hash đã verify.
2. Thực thi `DROP DATABASE [StudyAIDb_E2E];` (tuyệt đối không dùng wildcard/prefix drop).
3. Xác minh `StudyAIDb` vẫn `ONLINE` và nguyên vẹn, `StudyAIDb_E2E` không còn tồn tại, và orphan `StudyAIDb_Clean_f1842579f7224ba1ad14598ea2751d2b` không bị chạm tới.

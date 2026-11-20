# STUDY_AI — Kế hoạch triển khai AI Tutor cá nhân hóa môn Toán 10–12

Ngày lập: 2026-11-20  
Phạm vi: Học sinh THPT, môn Toán lớp 10/11/12; dữ liệu thật; CRUD/Admin; adaptive learning; tài liệu; lỗi sai; lộ trình tự động; UI Evondev; kiểm thử theo từng chức năng.  
**Baseline bắt buộc**: `feature/ai-core-v1` @ `9b610795a5c2f32a52c20f79f10ec63e43ac6c6d`. KHÔNG coi `main` là mã mới nhất. Kiểm tra lại HEAD trước triển khai.  
**PR cần đối chiếu**: #12 (audit lỗi hiện có), #13 (Admin real-data), #6 (question-bank real CRUD), #9 (CSS/UI). Không cherry-pick hoặc merge hàng loạt khi chưa kiểm tra xung đột.

## 0. Nguyên tắc không được vi phạm

1. GIỮ nguyên React 19 + TypeScript + Vite + Bun, ASP.NET Core .NET 10 + EF Core + SQL Server. Không tự ý đổi stack, viết lại app hay sinh service trùng.
2. **NO MOCK DATA IN PRODUCTION**: frontend không tự khởi tạo danh sách môn, nội dung, câu hỏi, điểm, số liệu, thành tích hoặc câu trả lời AI mô phỏng. Unit test có thể dùng fixture/mock trong thư mục test, nhưng không cấp dữ liệu giả cho UI runtime. API lỗi phải là error/retry hoặc offline rõ ràng, không hiển thị như dữ liệu thật.
3. **Bảo toàn DB**: `StudyAIDb` là database được bảo vệ, không INSERT/UPDATE/DELETE/seed/migrate/reset/restore qua tác vụ phát triển hoặc kiểm thử. Mọi thay đổi DB/migration/import/test ghi chạy trên `StudyAIDb_E2E` tách biệt, hoặc database disposable; chuẩn bị backup, kế hoạch rollout và chờ người vận hành phê duyệt trước deploy production.
4. Dữ liệu học sinh là dữ liệu cá nhân, nhiều học sinh là vị thành niên: phân quyền/ownership chặt, tối thiểu hóa dữ liệu, quyền xóa/xuất phù hợp, không đưa thông tin riêng vào prompt LLM khi không cần; chặn truy xuất tài liệu/hội thoại của người khác.
5. Dữ liệu giảng dạy phải có nguồn và giấy phép/quyền sử dụng, trạng thái kiểm duyệt, phiên bản, mã kiến thức, lớp, các năng lực liên quan. Không tự nhận toàn bộ dữ liệu đã đầy đủ chỉ vì có file JSON hay AI sinh.
6. Không commit secrets, mật khẩu, khóa API, thông tin DB thật hoặc tài liệu học sinh. Không hardcode tính năng `math`/Toán 12 khi có ID thực trong CSDL.
7. **Mỗi PR nhỏ, hoàn thành một lát cắt FE + API + DB + tests + visual QA**. Không triển khai 8 module cùng lúc. Không merge khi chưa qua CI, kiểm thử E2E và review.
8. Áp dụng skill tại `.agents/skills/ui-ux/SKILL.md`, nhánh “dựng luôn/just build it” với brief UI giản dị đã được người dùng xác định: sáng, tối giản, ít màu, thân thiện học sinh, không hiệu ứng thừa; reuse components/token cũ, không redesign toàn hệ thống.

## 1. Hiện trạng cần tôn trọng (static audit, chưa chứng nhận runtime)

- `backend/src/StudyAI.Api/Controllers/ContentController.cs`: đã có CRUD content; `CurriculumImportController.cs`: preview/confirm JSON, CSV, XLSX; tái sử dụng trước khi làm mới.
- `backend/src/StudyAI.Api/Controllers/AdaptiveLearningController.cs`: API hints, error-analysis, mastery, knowledge-profile, learning-path, recommendations, knowledge-gaps. `PracticeController.cs`: practice/session và adaptive mode. Kiểm tra các service, DTO và EF trước khi mở rộng.
- `frontend/src/services/adaptiveLearningPathService.ts`: có tính toán theo evidence. `frontend/src/services/learningPath.service.ts` vẫn import mock và có default subject cố định; cần xử lý.
- `frontend/src/services/aiTutor.service.ts` vẫn có mock conversations/demo; `frontend/src/services/education.service.ts` có offline/mock fallback. Dỡ bỏ runtime fallback giả trong các luồng sản phẩm, nhưng không được vô tình xóa dữ liệu người dùng đang có trong local cache.
- `docs/audit/FULL_SYSTEM_PRE_FIX_AUDIT_20261119.md` trong PR #12 có ledger P0/P1 cần xử lý trước. PR #13 có công việc chuyển Admin sang API thật, tránh đè lên.
- Định hướng core curriculum Toán 10–12 theo Chương trình GDPT 2018 (đối chiếu văn bản hợp nhất/sửa đổi hiện hành), không đồng nhất sách giáo khoa với chương trình.

## 2. Nguồn nạp dữ liệu thật

**Nguồn chuẩn chương trình:** Bộ GD&ĐT, Chương trình GDPT 2018 môn Toán và văn bản cập nhật/văn bản hợp nhất chính thức: 
- https://moet.gov.vn/content/tintuc/Lists/News/Attachments/8421/chuong-trinh-tong-the-ctgdpt-2018.pdf (chương trình tổng thể, KHÔNG phải danh mục chi tiết mọi bài Toán)
- https://moet.gov.vn/content/vanban/Lists/VBPQ/Attachments/1483/vbhn-ttu-322018-202021-132022-ttbgddt.pdf
- Chương trình môn Toán (phụ lục) cần tìm bản công khai chính thức, ghi URL và phiên bản văn bản chính xác vào source registry.

**Nguồn content:** ưu tiên bài giảng, định nghĩa, ví dụ và lời giải **tự biên soạn có thẩm định**. Kiểm kê ngân hàng câu hỏi hiện có (VNHSGE nêu trong docs/nhánh phát triển), xác minh bản quyền, nguồn, chất lượng, số lượng và khối lớp bằng SQL read-only; không tuyên bố số liệu lịch sử là số liệu DB hiện tại.

**Pipeline nhập dữ liệu**: source registry + license → thu thập/biên soạn → cấu trúc JSON/CSV/XLSX có schema → validation (grade, topic, skill, LaTeX, answer, provenance, duplicate, copyright) → review nội dung → dry-run/preview → confirm import vào DB_E2E → integration test → publish có phê duyệt. Import phải idempotent, upsert theo external/source key, ghi audit và rollback được. Không scrape/in nguyên SGK có bản quyền.

**Phủ nội dung**:
- Phân cấp Toán lớp 10, 11, 12 theo 3 mạch: Số/Đại số/Giải tích; Hình học/Đo lường; Thống kê/Xác suất.
- Với mỗi yêu cầu cần đạt/chủ đề: ít nhất metadata `grade, curriculumStandard, strand, chapter, topic, lesson, learningObjective, skills, prerequisiteSkills, explanation, workedExamples, commonErrors, source, reviewStatus`.
- Câu hỏi: loại, độ khó, kỹ năng, đáp án, lời giải từng bước, lỗi sai mục tiêu, version, source/license, status. Không công bố bài/đề chưa kiểm chứng.
- Tạo báo cáo độ phủ `coverage-report` lớp→mạch→chủ đề→yêu cầu→bài học→câu hỏi; thiếu mục nào ghi rõ `missing` và chặn gắn nhãn “đầy đủ”. Xây trước nội dung tối thiểu chạy dọc, mở rộng độ phủ qua nhiều import batches.

## 3. Mô hình dữ liệu (migrate có điều kiện, tránh bảng trùng)

Tái sử dụng `content_subjects, content_chapters, content_lessons, content_questions, content_assessments, assessment_attempts, assessment_responses, learning_events, lesson_progress, users` và những bảng/DTO hiện có trên nhánh mới. Audit lược đồ trước khi thêm entity.

Các năng lực cần có (chỉ thêm bảng nếu hiện chưa đáp ứng):
- `curriculum_standards, curriculum_objectives, skills, skill_prerequisites, question_skills, content_sources, content_import_batches, content_revisions`.
- `student_skill_mastery, mastery_evidence, error_taxonomy, student_error_events, adaptive_practice_sessions, learning_plans, learning_plan_steps, recommendation_explanations, review_schedule`.
- `learning_documents, document_pages, document_chunks, document_access, document_processing_jobs`, gồm trạng thái phân tích/citation page/chunk, owner và quyền truy cập.
- Ràng buộc unique (mã lớp-môn-kỹ năng), foreign keys, audit, optimistic concurrency/row version, source provenance; soft delete/archiving cho records có tiến độ học viên; index phục vụ query phân trang.

## 4. Menu học viên và Admin

Học viên (giữ/ghép route hiện có, tránh duplicate):
1. Tổng quan.
2. Học Toán (lọc Toán 10/11/12, chương, bài).
3. **Học tập thích ứng** (assessment đầu vào, mục tiêu, gợi ý bài hôm nay, luyện tập thích ứng).
4. **Lộ trình của tôi** (timeline tuần, hành động, tiến độ thực, nút tiếp tục).
5. **Phân tích lỗi sai** (lỗi theo kỹ năng, xem bài sai, tại sao sai, luyện lại).
6. **Học từ tài liệu** (upload PDF/DOCX/ảnh nếu được hỗ trợ, viewer và hỏi đáp có trích nguồn trang).
7. Gia sư AI (gợi mở, không làm hộ; có ngữ cảnh từ bài/tài liệu).
8. Tiến độ học tập (không tự bịa chỉ số).
Ẩn/hạ mức các môn khác chưa có nội dung chuẩn, không giả là đã hoàn thành.

Admin/Content: `Chương trình Toán 10–12`, `Chủ đề/Kỹ năng`, `Bài học`, `Ngân hàng câu hỏi`, `Đợt import & kiểm duyệt`, `Tài liệu`, `Nguồn và bản quyền`, `Báo cáo độ phủ`, `Cấu hình AI`, `Audit`. Mọi CRUD phải kết nối API + SQL, có loading/error/empty, search/filter/pagination, validation, preview, publish state, quyền role.

## 5. Lộ trình triển khai: một vertical slice và một PR ở mỗi checkpoint

| Phase | Module | Hoàn thành khi |
|---|---|---|
| P00 | Baseline/audit & an toàn | So HEAD và PR #12/#13/#6/#9; inventory API/UI/DB; liệt kê P0; thử CI trên DB_E2E; không sửa prod DB |
| P01 | Sửa P0 và bỏ false-success | Admin/content/assessment không nuốt lỗi, không giả thành công; negative API tests, security tests và Playwright pass |
| P02 | Toán 10–12: cấu trúc chuẩn + Admin CRUD | 3 khối lớp có dữ liệu thực vào DB_E2E, CRUD có quyền, refresh vẫn giữ dữ liệu; content không publish trước review |
| P03 | Import + biên soạn + kiểm toán độ phủ | Có nguồn, license, schema, idempotent importer, dry run, duplicate detection, công cụ xuất coverage report; batch real data kiểm chứng |
| P04 | Học bài & luyện tập live | Học sinh đọc lesson/KaTeX, làm bài, server chấm/lưu/khôi phục; chưa có câu hỏi hiển thị trạng thái rỗng thật; không lộ đáp án trước nộp |
| P05 | Assessment đầu vào & Student Mastery | Score theo từng skill dựa bài làm có độ tin cậy; trạng thái “chưa đủ dữ liệu”, audit; không suy luận tuyệt đối từ 1 lần sai |
| P06 | Học tập thích ứng + menu | Gợi ý bài/difficulty đúng kỹ năng yếu, knowledge prerequisites; menu dẫn đến trang thật; lý do đề xuất hiển thị được; không hardcode Toán 12 |
| P07 | Phân tích lỗi sai | Phân loại lỗi (kiến thức, biến đổi, dấu, phép tính, điều kiện, đọc đề, chưa xác định), trích bằng chứng và bài ôn; chấm Toán kiểm chứng nơi có thể |
| P08 | Lộ trình tự động | Khởi tạo theo mục tiêu, thời gian, mastery; lưu ở DB, tự cập nhật theo bài làm; người học đổi mục tiêu/có thể điều chỉnh; không bịa ngày/tiến độ |
| P09 | Học từ tài liệu | Upload an toàn, text extraction/OCR có điều kiện, phân đoạn theo trang, access control, RAG có citation, trạng thái xử lý; xóa tài liệu xóa/thu hồi index |
| P10 | AI Tutor liên thông & UX hoàn thiện | AI lấy đúng context, nguồn/trang, mức học; hoạt động khi LLM có cấu hình, không fake trong prod; UX responsive/keyboard; dashboard thực |
| P11 | End-to-end release readiness | Regression, phân quyền đa tài khoản, tải/dữ liệu lớn, privacy, performance, coverage/AI evaluation, CI xanh; vận hành phê duyệt rollout |

**Tài liệu sau mỗi phase:** `docs/implementation/PHASE-Pxx.md` ghi mục tiêu, file thay đổi, migrations, dữ liệu nguồn, API contracts, test command & kết quả, screenshot desktop/mobile, known risks, PR URL, commit SHA, rollback. Dừng phase khi không đạt acceptance, không chuyển sang phase kế tiếp.

## 6. Test bắt buộc với từng chức năng

- BE: unit business rule; integration HTTP + EF + SQL Server disposable, RBAC, ownership, transaction, retry/idempotency, 400/401/403/404/409/500, migration up/down khi an toàn.
- FE: Vitest + Testing Library cho loading/empty/error/success, form CRUD, route guards, API mapping, correctness of 0 metrics; accessibility keyboard/labels; snapshots chỉ khi hữu ích.
- E2E: Playwright đăng nhập học sinh và Admin/Content thật **trên DB_E2E**. Mỗi feature ít nhất: happy path, validation fail, unauthorized, no-data, API failure, refresh persistence, mobile 390px + desktop. Test học viên A không đọc dữ liệu học viên B.
- AI: golden set Toán từng chủ đề, kiểm tra đáp án (SymPy hoặc cơ chế tương đương chỉ khi áp dụng được), hallucination, nguồn đúng, prompt injection ở tài liệu, không lộ đáp án/PII, không lấy tài liệu người khác; khi model unavailable hiển thị trạng thái lỗi thật.
- CI tối thiểu: `cd frontend && bun install --frozen-lockfile && bun run lint && bun run test && bun run build`; `cd backend && dotnet restore StudyAI.sln && dotnet build StudyAI.sln && dotnet test StudyAI.sln`. Với SQL tests phải đặt `ConnectionStrings__DefaultConnection` đến DB_E2E. Đọc workflow CI hiện có, không chạy mặc định vào `StudyAIDb`.
- **Không claim PASS** nếu chưa thực thi có log/CI artifact. Không xóa tests để pass. Cần kiểm tra server business rules, không chỉ FE.

## 7. UI Evondev: brief đã duyệt

- Sử dụng `.agents/skills/ui-ux/SKILL.md` và `references` liên quan (app, tables, forms, chart, chat, file-upload, empty-state, responsive); mode `dựng luôn`.
- Chữ tiếng Việt rõ ràng, layout tối giản như LMS nghiêm túc, navy/neutral sáng + 1 màu nhấn; không gradient cầu vồng, glassmorphism, dashboard sticker AI, animation dư; spacing/typography nhất quán.
- Thành phần chính: breadcrumbs, sidebar gọn, một hành động chính/màn, cards vừa đủ, bảng lọc rõ, lesson viewer có KaTeX đọc dễ, error & empty state thật, trạng thái dữ liệu live/offline minh bạch; mobile 390px.
- Luôn dùng component/token đang có và visual regressions; không thay đổi route khác nếu không liên quan.

## 8. GitHub & Codex review

- Anti đọc repo + PR đang mở, tạo nhánh mới `feature/math10-12-pXX-<slug>` từ **baseline cập nhật đã xác nhận** (không tự ý checkout/overwrite production), một tính năng/PR.
- Commit có ý nghĩa, push lên GitHub; mở PR dạng draft, thêm checklist, hướng dẫn test, log, screenshots và liệt kê database chịu tác động; không push thẳng main.
- Khi CI pass và code đã thay đổi, yêu cầu Codex review PR bằng `@codex review` **nếu integration Code Review đã được bật cho repo**; hoặc yêu cầu review bằng Codex từ giao diện. Không coi comment là bằng chứng Codex đã chạy; phải thấy nhận xét/review thật.
- Xử lý issue nghiêm trọng, commit fix, chạy lại CI/E2E, yêu cầu re-review nếu cần. Không auto merge; người quản trị duyệt.
- Repo chứa nhiều PR lớn có base không đồng nhất: không merge/cherry-pick khi chưa kiểm tra diff, contract và migration conflicts.

## 9. Tiêu chí DONE tổng thể

- Toán 10–12: độ phủ cấu trúc 100% so với ma trận chương trình được duyệt; độ phủ nội dung/bài tập được đo đếm, không đánh đồng với “đầy đủ”.
- Mọi thông tin học viên và nội dung chính đến từ API & DB thật; không có fallback mock đánh lừa người dùng.
- CRUD/Admin + import + workflow review/publish hoạt động qua refresh, account và DB_E2E.
- Adaptive, lỗi sai, lộ trình, tài liệu, AI Tutor nối chung hồ sơ năng lực; UI chỉ hiện số liệu có bằng chứng.
- Không ghi `StudyAIDb` qua test/dev; tất cả kiểm thử đều có log CI; review Codex và approval trước merge.

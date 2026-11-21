# PHASE L02 — BIG INTEGRATED DELIVERY: Toán 10–12 + Adaptive AI Tutor + Real Operations
**Ngày xác minh:** 2026-11-20  
**Repository:** `hthuyngan/STUDY_AI-`  
**Nhánh triển khai:** `feature/math10-12-integrated-learner-ai-fullstack`  
**Upstream/stacked base:** `feature/math10-12-p00-foundation`, khởi điểm `f28780053dbbd03fd2060b041d0382e4a54b9b13` (Draft PR #15 vào `feature/ai-core-v1`).  
**Phạm vi duy nhất:** Một BIG PHASE, một nhánh, một Draft PR, triển khai liên tục đến khi các luồng nghiệp vụ end-to-end hoàn chỉnh. Có thể chia commit theo workstream để kiểm soát rủi ro, **không tách thành hàng chục PR sửa lẻ tẻ**.

> **Trạng thái khi tạo kế hoạch:** Chỉ mới audit & lập kế hoạch. KHÔNG tuyên bố đã triển khai các chức năng dưới đây. Antigravity phải tự đọc mã hiện tại, sửa, chạy test thực, rồi cập nhật trạng thái. Phiên bản HEAD của PR #15 có [CI cơ bản PASS](https://github.com/hthuyngan/STUDY_AI-/actions/runs/44718306877) nhưng [Live Browser FAIL](https://github.com/hthuyngan/STUDY_AI-/actions/runs/44718306868) tại `scripts/e2e_p01_live_browser_playwright.ts:309` (Assessment sau reload mất/không thấy “Tiếp tục bài tập”). Commit cũ `11bfa85` có E2E PASS, không thay thế kiểm chứng HEAD.

## 1. Vì sao chuyển từ nhiều phase nhỏ sang BIG PHASE
Yêu cầu mới của chủ dự án: **hoàn thành trọn mỗi chức năng FE → API → SQL → test → UI và tích hợp thành một luồng thống nhất, đẩy nhanh tiến độ, hạn chế việc lập kế hoạch/PR/CI lặp lại cho từng chỉnh sửa nhỏ**. Kế hoạch này là chỉ đạo mới ưu tiên hơn các đoạn “1 vertical slice/1 PR” trong kế hoạch P02–P10 cũ, nhưng vẫn bắt buộc xác minh chất lượng và không phá dữ liệu. **BIG PHASE không có nghĩa làm tất cả chức năng theo kiểu nửa vời**: mỗi workstream được hoàn tất bằng vòng đời thật trước khi chuyển workstream; tất cả hợp nhất trong một PR.

Kế thừa `AGENTS.md`, `docs/plans/AI_TUTOR_MATH10_12_IMPLEMENTATION_PLAN.md`, `docs/prompts/ANTIGRAVITY_MATH10_12_MASTER_PROMPT.md`, và skill Evondev `.agents/skills/ui-ux/SKILL.md`. Không thay stack: React 19/TypeScript/Vite/Bun; ASP.NET Core .NET 10/EF Core/SQL Server. Không tự viết lại ứng dụng.

## 2. Bằng chứng repo tại baseline
| Trục | Vị trí đã kiểm tra | Hiện trạng được chứng minh / nhiệm vụ |
|---|---|---|
| Review PR | [PR #15](https://github.com/hthuyngan/STUDY_AI-/pull/15) | 26 review threads chưa marked resolved; 24 outdated, **2 không outdated** (class transfer & teacher status filter). Outdated KHÔNG mặc nhiên là verified; phân loại từng thread bằng mã + regression. |
| Assessment | `scripts/e2e_p01_live_browser_playwright.ts:309` | HEAD fail khi chờ “Tiếp tục bài tập” sau network failure + reload. Điều tra hydration/session, race và trạng thái persisted; test cũ PASS có thể flaky. |
| Dashboard | `frontend/src/services/dashboard.service.ts:2,57` | Vẫn import `mockDashboardData`; kiểm tra authenticated/guest path và loại dữ liệu giả khỏi luồng user thật. |
| Learning path | `frontend/src/services/learningPath.service.ts:7-8,24-35,159-230` | `getLearningPath()` trả `mockLearningPath`; học phần từ `subjects.mock`, mặc định `math`, `sub_math12`; phải dùng grade/subject/user/DB thật. |
| Admin Users | `frontend/src/services/admin.service.ts:243-269` | Khi authenticated GET Users lỗi, `catch` rơi về `mockUsers`, che lỗi và hiển thị tài khoản ảo. Đây là lỗi P1/P0 false-success/read, cần sửa. |
| Teacher Admin | `frontend/src/services/education.service.ts:1087-1169` | GET teachers lỗi server fallback storage; POST teachers lỗi 4xx/5xx rơi vào tạo giáo viên localStorage có hồ sơ/sĩ số bịa. Phải fail-closed. |
| Practice | `frontend/src/pages/Practice/PracticeHubPage.tsx:110-122` | Tiêu đề “Toán 12” hardcoded; backend có `PracticeController` sessions/answers/submit/mistakes. Cần grade 10/11/12 và 2 luồng cơ bản/thích ứng. |
| Supporting pages | `frontend/src/services/supporting.service.ts:1-91` | Exercises, library, achievements, profile và settings lấy `supporting.mock`/localStorage. Cần DB/API hoặc trạng thái chưa có thực. |
| AI Tutor | `frontend/src/services/aiTutor.service.ts:304,518` | Có generator mock và guest/demo fallback; backend có chat, provider status, mastery, recommendations. Tách demo rõ ràng; authenticated không nhận câu AI giả. |
| Learner Dashboard | `frontend/src/pages/Dashboard/DashboardPage.tsx:90-107` | Có AdaptiveLearningWidget + KnowledgeGapsWidget; `/subjects/math` fallback tại ~98; cần daily weak lessons từ evidence thật. |
| Content CRUD | `backend/src/StudyAI.Api/Controllers/ContentController.cs` | Có subjects/chapters/topics/lessons/questions + review/publish endpoints; **reuse** thay vì sinh controllers trùng. |
| Support role | `frontend/src/App.tsx:61-64` | `/support/*` redirect về Dashboard; current tree không có `supportRoutes.tsx`. Chưa phải workspace support thật; xây role/ticket khi được yêu cầu, dựa schema hiện có. |
| AI admin | `backend/src/StudyAI.Api/Controllers/AiAdminController.cs` | Có status, usage-stats, logs, feature-toggle; cần cấu hình API/provider có RBAC/audit/redaction, không “tạo endpoint code mới” bằng form. |
| Data provenance | `DbInitializer.cs`, `CurriculumImportController.cs` | Có mẫu lesson Math12 và import preview/confirm; chưa có bằng chứng coverage chính thức đủ Toán 10–12. |
| Runtime E2E | `.github/workflows/p01-live-browser.yml` | SQL 2022 cô lập, 4 browser scenarios, artifacts; cần làm test deterministic, không sửa test để qua bằng cách bỏ assertion. |

**Giới hạn audit:** Repository có khoảng 3.952 tracked blobs, 564 `frontend/src`, 1.359 `backend/src`, 19 API controllers, ~40 FE services (thống kê cây Git tại baseline). Đã rà soát cây, API/route, kế hoạch, PR và các dịch vụ trọng yếu; **đây không phải tuyên bố đã đọc từng dòng của toàn bộ 3.952 blobs**. Antigravity đang ở workspace địa phương phải tiếp tục scan toàn bộ dependencies/call sites và lập trace matrix.

## 3. Phạm vi chức năng bắt buộc — hoàn tất lần lượt trong CÙNG BIG PHASE

### WS0 — Gate P01: Khôi phục E2E & integrity (BLOCKING)
- Điều tra rehydration trạng thái assessment (memory/session/repository/sync order) sau HTTP POST bị abort và browser reload; xác minh test retry deterministic trên SQL test, tránh race/timeout tùy tiện; test negative + replay + không tạo double completion.
- Đối chiếu 26 Codex review threads: classify `FIXED_VERIFIED`, `ACTIVE`, `OUTDATED_FIXED`, `NEEDS_TEST`; hai thread không-outdated bắt buộc nêu bằng chứng file/line và test; không auto resolve bằng suy đoán.
- Sửa ngay nhánh authenticated mock/false success nêu trên để các WS sau không xây lên nguồn sai.
- Quality gate: CI cơ bản + Live Browser cùng HEAD phải PASS trước khi xác nhận P01 ready. Không merge PR #15 tự động.

### WS1 — Curriculum + nguồn thật + Content/Admin CRUD (P02–P03)
- Kiểm kê ContentSubjects/Chapters/Topics/Lessons/Questions, videos, requirements, skills, prerequisites, publication review, import pipeline, index/migrations; reuse existing `ContentController`, `CurriculumController`, `CurriculumImportController`.
- Xây `Math 10`, `Math 11`, `Math 12` theo GDPT 2018 và sửa đổi chính thức; phân biệt chương trình/chuẩn đầu ra với SGK bản quyền. Nguồn: URL, cơ quan, phiên bản, ngày truy cập, license, provenance, review status. Không tự bịa 100% giáo trình. Tạo coverage matrix `grade → strand → topic → skill/competency → lesson → questions`; trường hợp thiếu hiển thị thiếu và export report.
- FE Content/Admin: CRUD đầy đủ list/search/page/filter/create/edit/reorder/archive/restore/review/approve/publish/unpublish, server RBAC, audit, reject duplicate/prerequisite cycles; bài chưa duyệt không lộ cho learner.
- Import: validate magic type/schema, JSON/CSV/XLSX nếu đã hỗ trợ, sample preview, dry-run, idempotent dedup, FK, answer validation, transaction rollback; ghi chỉ DB_E2E. Content chuyên môn có quyền duyệt cuối, Admin giám sát.
- E2E: tạo grade 10/11/12, lesson + question → review → publish → learner sees; cross-role 403; duplicate/invalid answer returns 4xx; hard refresh survives.

### WS2 — Học viên + Practice Basic & Adaptive + Diagnostic & Mastery (P04–P06)
- Practice menu phân **(1) Bài cơ bản theo chủ đề/kỹ năng/lớp** và **(2) Bài AI đề xuất dựa lỗi yếu thật**; có nút bắt đầu/tiếp tục/xem kết quả, lọc lớp 10/11/12/độ khó/thời gian. Không để menu/CTA dead end.
- Dùng ngân hàng câu hỏi verified/publication status; server chọn câu theo skill/difficulty/prereq và quyền; không expose `CorrectAnswer`/explanation trước lúc kiểm tra hợp lệ; answer validation + điểm thang 10; lưu từng câu/server session/resume, idempotent submit, conflict, integrity transaction.
- Diagnostic đầu vào: test năng lực từ câu thật; lưu learner, attempt, `skillEvidence` với thời điểm, độ khó, mức hint, số lần thử; `StudentMastery` không gán phần trăm nếu chưa đủ dữ liệu; thuật toán giải thích được và config, clamp điểm, confidence/insufficient-data.
- Auto adaptive: mỗi learner có daily weak-skill recommendations (1–3 bài cụ thể) với `reason, evidenceCount, lastAssessedAt, related skill, prerequisite, estimatedMinutes, questionCount, actionUrl`; không hardcode Math12; không lấy dữ liệu người khác. Học xong → mastery/weak skill/dashboard cập nhật thật, refresh & account isolation.
- Dashboard: **“Bài học nên ôn hôm nay / Kiến thức còn yếu”** là phần nổi bật; khi chưa có dữ liệu thì nói “Hãy làm bài đánh giá đầu vào”, không tạo điểm/lịch giả.

### WS3 — Mistake Review + Gia sư AI hợp nhất (P07 + P10)
- Lưu mỗi lỗi sai: user, question, attempt, selected answer, *server-verified* correct answer, topic/skill, timestamp, misconception taxonomy, revision status, provenance. Lỗi sai không được lộ đáp án đang làm ở bài thi khác.
- Chế độ giải thích AI theo 3 mức hint: hướng tư duy → gợi bước → giải có kiểm chứng, Math/LaTeX đúng; không tạo “đáp án đúng” giả, guard malformed LLM output, model unavailable phải báo thật; mỗi câu trả lời có context, source/citation khi có.
- Tutor chat + tài liệu + lesson + question + diagnostic cùng dùng identity token và context scoped; chống cross-tenant, prompt injection, leak secret, giant context, prompt logs có PII; streaming/retry/rate limit/quota.
- Role/Admin kiểm soát providers/features: xem model, quotas, logs đã redact; thêm/cập nhật **cấu hình provider/integration** an toàn (secret server-side encryption/vault; metadata only on FE), enable/disable/circuit breaker/audit. Không nhầm “Admin thêm API” với tạo route thực thi arbitrary code.

### WS4 — Learning Roadmap + Document Tutor (P08–P09)
- Tạo roadmap SQL từ grade 10/11/12, mục tiêu, đánh giá đầu vào, mastery, điều kiện học, quỹ thời gian, deadline; lưu phiên bản/lịch sử và reason; điều chỉnh tự động sau attempt hoàn thành; không bịa streak/date/certainty; học viên được cập nhật mục tiêu, dời lịch, resume.
- PDF/DOCX/image uploads nếu được chấp thuận: validate MIME + magic bytes, size/page/quota/virus, store path không public, ownership check trước download/view/delete/chunks; extract text/page, OCR chỉ khi cần. RAG scoped `userId + documentId` có page citation, retrieval lọc quyền trước tìm kiếm, không đưa uploads vào curriculum tự động.
- Trạng thái `queued/processing/ready/failed`, retry, delete purges chunks/index, xóa/ẩn khỏi mọi retrieval; AI answer không tìm thấy nguồn phải nói thiếu.

### WS5 — Staff Operations: Admin, Teacher, Content và Support
- **Admin:** Users/RBAC/role management, profile, teacher lock/status, content oversight, report filters, audit pagination/export, system health, settings concurrency, notifications, API/provider registry & usage; toàn bộ CRUD có BE/SQL thật, filter server side, fail-closed và audit.
- **Teacher:** lớp, enrollment/transfer có source ownership, assignment, student progress, rubric/grade, AI recommended homework/remedial based on skill evidence, roster và completion; kiểm tra khối lớp đúng.
- **Content:** chương trình/lesson/question bank/video validation/review/publish, provenance, CRUD, import, history, reject/rollback và role gating.
- **Support:** App hiện redirect `/support/*`; triển khai **nếu scope Support đã xác nhận là yêu cầu chính thức**: tạo ticket/report từ learner/teacher/content/admin, inbox theo assignment/status, messages/attachments validation, timeline/status transitions, feedback, permissions và privacy. Nếu không thuộc sản phẩm hiện tại, ghi rõ EXCLUDED thay vì dựng trang giả.
- Role nào được phép “gửi báo cáo lỗi” phải có cách gửi → ticket SQL → support/admin đọc và trả lời → người gửi xem trạng thái; không đánh dấu gửi thành công khi API lỗi.

### WS6 — UI/contract/QA/hardening
- Mọi menu/route CTA có route thật và không vô tình redirect khỏi role; chuẩn hóa loading/error/empty/denied, responsive 390px + desktop, keyboard/ARIA, Evondev existing tokens; không đại tu UI thừa, không phá screens working.
- Trace matrix `ROLE → MENU → PAGE → ACTION → FE hook/service → METHOD/ENDPOINT → DTO → ENTITY/TABLE → AUTH → TEST → UI E2E`. Đánh dấu mỗi action: `LIVE_PASS`, `FIXED_NOT_VERIFIED`, `MISSING`, `BLOCKED`, `OUT_OF_SCOPE`.
- Không còn authenticated path nào nuốt 400/401/403/409/500/network và rơi vào fake success; tests chặn regression.
- OpenAPI/Swagger (chỉ expose dev theo bảo mật), sinh type-safe TypeScript client nếu phù hợp dự án hiện tại; không tự sinh 2 SDK/client trùng. DB migrations forward/rollback, index, pagination, concurrency/rowversion, API telemetry, audit logs, zero secrets in FE.

## 4. Quy trình tốc độ cao nhưng khép kín
**1 nhánh + 1 draft PR + nhiều workstreams + commit có kiểm soát.** Mỗi workstream có hợp đồng/DB + BE + FE + tests + E2E hoàn chỉnh rồi mới đổi. Không gửi từng câu hỏi nhỏ; tự ra quyết định không phá dữ liệu. Nếu blockers thực sự là quyền truy cập/licensing/secrets thì ghi BLOCKED và hoàn tất phần độc lập.

1. Preflight: `git status --short`; `git fetch --all --prune`; `git branch -avv`; `git log --oneline --decorate -20`; `git remote -v`; `git diff --name-status`; `gh pr view 15 --comments`; check upstream HEAD/merge base, worktrees. **Không reset/clean/force push** work in progress.
2. Anti dùng nhánh này; nếu checkout local chưa có: `git fetch origin feature/math10-12-integrated-learner-ai-fullstack && git switch --track origin/feature/math10-12-integrated-learner-ai-fullstack` (chỉ khi working tree sạch; nếu bẩn thì lưu branch/worktree riêng).
3. Lock contracts/schema & design maps; ưu tiên reuse code hiện có, git grep imports/references trước khi tạo/xóa file; **không sinh service trùng**. Bắt đầu WS0 rồi WS1–WS6 liên tục, không báo COMPLETE khi chưa hết scope.
4. Verify từng workstream với focused tests; **CI đầy đủ trên milestones có ý nghĩa** (sau WS0, WS2/WS3, WS6), tránh push thừa làm chạy liên tiếp cùng CI; không rerun thành công, không spam `@codex review` khi quota thiếu.
5. `git diff --check`; frontend `bun run lint`, `bunx tsc -b`, `bun run test`, `bun run build`; backend `dotnet build backend/StudyAI.sln`, unit + integration; live Playwright thật trên SQL E2E với role fixtures & negative tests.
6. Database guard **trước** migration/integration: kiểm tra actual `ConnectionStrings__DefaultConnection` của process + database name/server, refuse production/unknown; không dựa một biến env giả. DB production `StudyAIDb` tuyệt đối zero writes/migrations/seeds/resets/imports; mọi nghiên cứu production read-only nếu có quyền riêng.
7. Commits by workstream: `feat(l02/ws0): ...`, `feat(l02/ws1): ...` ... `test(l02): ...`, `docs(l02): ...`; push cùng branch; một Draft PR lên `feature/math10-12-p00-foundation` hoặc sau khi #15 merge thì rebase có kiểm soát lên `feature/ai-core-v1` (không tự merge/rebase phá công việc).
8. Sau mỗi 1–2 workstreams cập nhật **một bảng tiến độ chung** trong `docs/implementation/PHASE-L02-IMPLEMENTATION.md`: Completed/Blocked/Tests/DB/commit, không sinh 10 báo cáo nhỏ. Chỉ báo Final Acceptance khi tất cả mandatory gates PASS.

## 5. Definition of DONE (đo được)
- [ ] `StudyAIDb` production không có writes; actual connection string guard verified.
- [ ] Latest HEAD: CI and Live Browser E2E both PASS (Assessment reload deterministic; run test lại đủ để thấy không flaky).
- [ ] Math10/11/12 source-backed coverage matrix + CRUD/approval/publish/import dry-run; không tự nhận đủ SGK/100% khi thiếu.
- [ ] Học viên tạo/tiếp tục luyện cơ bản + luyện AI theo điểm yếu; no leaked answers; grading/resume/unique attempts; SQL readback after reload.
- [ ] Dashboard mỗi người hiển thị bài yếu hôm nay dựa evidence; 0 evidence = honest empty state; isolation A/B.
- [ ] Mastery, mistake taxonomy, adaptive recommendations, roadmap có nguồn dữ liệu thật/độ tin cậy/lý do/thu hồi phù hợp.
- [ ] Document Tutor authorized uploads/retrieval/citations/delete; không cross-user; AI unavailable fail-closed.
- [ ] Admin/Teacher/Content các CRUD liên quan có đủ 401/403/404/409/500 cases + audit; Support nếu in-scope phải có ticket lifecycle thật.
- [ ] FE/BE/OpenAPI contract tests; UI desktop+390px; no error swallowing, no mock authenticated path; evidence link trên PR.
- [ ] Không có file rác/duplicate service, không thay framework, không phá nhánh khác. Open review threads phân loại và phản hồi bằng evidence.
- [ ] Một Draft PR với tổng hợp, không auto merge; approve/release production chỉ bởi con người.

**Khác biệt giữa tài liệu này và prompt cũ:** Chủ dự án đã yêu cầu 1 BIG PHASE thay vì từng PR nhỏ. Đây là thay đổi về đóng gói delivery; tiêu chí chất lượng/data safety/human approval vẫn giữ nguyên.

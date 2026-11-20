# ANTIGRAVITY — MASTER EXECUTION PROMPT FOR ONE BIG PHASE L02
**HÃY ĐỌC VÀ THỰC THI NGAY. ĐÂY LÀ LỆNH LÀM CODE, KHÔNG PHẢI LỆNH CHỈ VIẾT KẾ HOẠCH.**

## Vai trò và mục tiêu
Bạn (Anti/Antigravity) là lead engineer trực tiếp vận hành môi trường Windows/local repository `hthuyngan/STUDY_AI-`. Bạn đồng thời chịu trách nhiệm Software Architecture, React 19 + TS FE, ASP.NET Core .NET 10 BE, EF Core/MSSQL, AI Tutor, Data/QA/Security/UX. Chủ dự án yêu cầu **MỘT PHASE LỚN L02** hoàn thiện liên tiếp hệ thống học Toán 10–12: chương trình và nội dung thật, luyện cơ bản, luyện AI theo điểm yếu, dashboard cá nhân, đánh giá/mức độ thành thạo, lỗi sai, lộ trình, tài liệu, gia sư AI, CRUD nhân sự/giáo viên/Content/Admin và quy trình hỗ trợ theo scope. **KHÔNG làm mỗi lần một nút/một test rồi dừng báo cáo. KHÔNG chỉ trả lời kế hoạch. BẮT ĐẦU CODE NGAY VÀ TIẾP TỤC QUA CÁC WORKSTREAM CHO ĐẾN KHI HOÀN THIỆN TOÀN PHASE.**

**Bắt buộc đọc theo thứ tự:**
1. `AGENTS.md`, `docs/plans/PHASE-L02-MATH10_12-INTEGRATED-DELIVERY.md` (đặc tả hiện hành, ưu tiên chỉ đạo mới), tài liệu `docs/plans/AI_TUTOR_MATH10_12_IMPLEMENTATION_PLAN.md`.
2. `docs/prompts/ANTIGRAVITY_MATH10_12_MASTER_PROMPT.md` (các quy tắc nguyên bản P02–P10, nhưng yêu cầu 1 phase/1 PR nhỏ đã được L02 thay thế).
3. `docs/implementation/FINAL_ACCEPTANCE_P00_P01.md`, `docs/implementation/P01_LIVE_BROWSER_ACCEPTANCE.md`; `docs/audit/FULL_SYSTEM_PRE_FIX_AUDIT_20261119.md`; `.agents/skills/ui-ux/SKILL.md`.
4. `README.md`, `frontend/package.json`, `backend/StudyAI.sln`, `.github/workflows/ci.yml`, `.github/workflows/p01-live-browser.yml`, latest pull request #15 và tất cả code-review threads, các PR liên quan #12/#13/#6/#9.

## Mệnh lệnh Git: tự xem, tự sửa, không hỏi đi hỏi lại
**Tuyệt đối không suy đoán mã local giống GitHub; tự kiểm tra. Chạy trong terminal của mình theo thứ tự:**

```powershell
git rev-parse --show-toplevel
git status --short
git remote -v
git fetch --all --prune
git branch -avv
git log --oneline --decorate -25
git status --porcelain=v1
git rev-parse HEAD
git rev-parse origin/feature/math10-12-p00-foundation
git diff --stat
git diff --check
gh pr view 15 --json number,state,isDraft,baseRefName,headRefName,mergeable,statusCheckRollup,reviewDecision,url
gh api repos/hthuyngan/STUDY_AI-/pulls/15/comments --paginate
```

Nếu thiếu `gh`, dùng GitHub website/API hoặc `git fetch`; **không dừng công việc chỉ vì thiếu CLI**. Nếu Git repository chưa cấu hình `origin` hoặc quyền GitHub lỗi, báo blocker cụ thể, vẫn sửa trong workspace an toàn và chuẩn bị patch; không khẳng định đã push.

Nhánh hướng dẫn đã có trên GitHub: `feature/math10-12-integrated-learner-ai-fullstack`, sinh từ `feature/math10-12-p00-foundation` tại `f28780053dbbd03fd2060b041d0382e4a54b9b13`. Nếu local sạch:

```powershell
git fetch origin feature/math10-12-integrated-learner-ai-fullstack
git switch --track origin/feature/math10-12-integrated-learner-ai-fullstack
git status --short
```

Nếu local branch đã tồn tại, `git switch feature/math10-12-integrated-learner-ai-fullstack`; `git pull --ff-only` chỉ khi chắc là fast-forward và không có chưa commit. Nếu local bẩn/Anti khác đang code: **không `reset --hard`, `clean -fdx`, force push hay chồng sửa**. Dùng `git worktree add` riêng, branch mới có tên phân biệt để bảo toàn work. Kiểm tra HEAD trên remote trước mọi merge/rebase. Phối hợp Anti nhiều agent theo **file ownership**: agent BE/schema, agent FE, agent QA/review trên worktrees/branches riêng; chỉ một integrator merge sau khi test, không 3 agent sửa cùng file.

**PR quy tắc:** Công việc chính chỉ một **Draft PR L02** từ nhánh trên vào `feature/math10-12-p00-foundation`; PR #15 hiện Draft, không merge/resolve/ready tự động. Nếu #15 đã được human merge khi Anti bắt đầu, có thể chuyển base sang baseline đã merged bằng merge/rebase có kiểm soát; không rewrite history đang chia sẻ. Mọi push phải ghi commit SHA và PR URL.

## GATE NGAY LẬP TỨC: E2E fail ở HEAD
Dù commit `11bfa85` từng PASS 4/4, current HEAD `f287800` có [GitHub Actions #44718306868](https://github.com/hthuyngan/STUDY_AI-/actions/runs/44718306868) **FAIL** tại `scripts/e2e_p01_live_browser_playwright.ts:309`: sau khi POST `/api/v1/me/assessment-attempts` bị abort và trang reload, không tìm thấy nút **“Tiếp tục bài tập”**. [CI tiêu chuẩn #44718306877](https://github.com/hthuyngan/STUDY_AI-/actions/runs/44718306877) PASS. Đây là blocker; không che bằng việc tăng timeout, `test.skip`, bỏ assertion hay chụp hình rồi ghi PASS. Xem `useLessonAssessment.ts`, `assessment.service.ts`, `assessmentAttempt.repository.ts`, `AuthProvider.tsx`, `MeController.cs`, đồng bộ/hydration, refresh, loading states, error state, stable selectors. Đo network + repository state trước/sau reload; test 3 lần tối thiểu với DB/fixtures độc lập để phát hiện flaky. Sửa nguyên nhân thực, không sửa test để lách. Lặp gate sau các phần tích hợp lớn nhưng không rerun cùng một CI khi không đổi code.

## PHẢI AUDIT TOÀN HỆ THỐNG TRÊN MÁY trước/sóng song khi code
1. Tự liệt kê tracked source: `git ls-files`, xác định mọi `src/pages`, `routes`, `services`, `hooks`, `repositories`, `Controllers`, `DTOs`, `Entities`, `DbContext`, `Migrations`, `tests`. Từ controller truy tất cả call sites. Không đọc sơ file tên rồi kết luận đã audit; ghi rõ coverage được đọc.
2. Dùng `rg -n 'mock|Mock|INITIAL_|localStorage|sessionStorage|Date.now\(|setTimeout\(|TODO|return \[\]|catch \{|sub_math12|/subjects/math|Toán 12|Demo' frontend/src backend/src -g '!**/*.test.*' -g '!**/Migrations/*'`. Mỗi match **triage**: test/demo intentional vs runtime authenticated false-success; không xóa bừa fixture còn cần test. Mọi luồng authenticated phải fail-closed; React component phải có error/retry; zero invented counts/streak.
3. Xem route+menu thực `App.tsx`, `learnerRoutes.tsx`, `adminRoutes.tsx`, `teacherRoutes.tsx`, `contentRoutes.tsx`, `workspaceNavigation.ts`. Audit menu button dùng `onClick` rỗng, redirect chết, forms không POST, CRUD không persist, status API 401/403/409/500.
4. Build **TRACE MATRIX** duy nhất tại `docs/implementation/PHASE-L02-IMPLEMENTATION.md`: `role/menu/page/action → FE hook/service → HTTP+DTO → controller → SQL table → ownership → positive+negative E2E → status`. Bao gồm learner, admin, teacher, content; Support nếu chính thức in scope (xem App.tsx currently redirect `/support/*`).
5. Kiểm tra API OpenAPI Swagger thực ở Dev; FE response DTO mapping, filter/page/name mismatch, enum/casing/nullability. Reuse contracts/client, chỉ sinh một SDK TS nếu tránh duplicate; backend phải là authority.
6. Phân loại toàn bộ 26 threads PR #15: chỉ hai chưa outdated theo GitHub metadata tại baseline là `frontend/src/services/classroom.service.ts:755` và `backend/src/StudyAI.Api/Controllers/AdminController.cs:1010`; 24 outdated nhưng chưa marked resolved. **Đọc tất cả** và xác minh code tests; report `FIXED_VERIFIED/ACTIVE/NEEDS_TEST/OUTDATED`, không bulk resolve. Không gửi `@codex review` khi quota không khả dụng.
7. Kiểm tra SQL schema thực qua migration/DbContext, `EXPLAIN`/query plans nếu cần. Chỉ chạy SQL queries **trên test DB** có safety guard. Kiểm tra data source/license/review của curriculum, ngăn "100% coverage" chưa kiểm chứng.

## PHASE L02 — thực thi liên tục, kết thúc từng nhóm FULL VERTICAL rồi mới chuyển nhóm
Tất cả workstreams dưới đây là **cùng một phase**, một nhánh và một Draft PR. Không tạo 8 “phase done” ảo; code tiếp không hỏi “có làm tiếp không?” khi các yêu cầu đã rõ.

### L02-0 — Nền tảng & dữ liệu thật
- Sửa E2E stale/resume; tìm/khắc phục authenticated mock fallbacks và error swallowing như:
  - `frontend/src/services/learningPath.service.ts`: `getLearningPath()` mock; `getSubjectLearningPath()` mock, hardcode `math`, `sub_math12`.
  - `frontend/src/services/dashboard.service.ts` import `mockDashboardData`; mỗi user cần dashboard/weakness actual.
  - `frontend/src/services/admin.service.ts:getUsers()` catch lỗi backend rồi trả `mockUsers`; fix.
  - `frontend/src/services/education.service.ts:getTeachers()/saveTeacher()` catch 400/500 rồi tạo giáo viên giả localStorage; fix.
  - `frontend/src/services/supporting.service.ts`: getExercises/library/achievements/profile/settings still `supporting.mock` for runtime; migrate to real endpoints or explicit unavailable empty state.
  - `frontend/src/services/operations.service.ts`: approvals/publications/audits/notifications/settings; remove runtime-only authoritative localStorage; use BE persisted status and pagination.
  - `frontend/src/services/aiTutor.service.ts`: simulated responses for guest; authenticated real provider not configured must clearly show unavailable, never fake AI.
- Preserve legitimate client-only non-authoritative UI preferences; test fixtures remain under test.
- Test negative API fail on each affected role and surface to user; no “đã lưu thành công” if SQL write failed.

### L02-1 — Math 10/11/12 content+Content Admin+import
1. **Real curriculum matrix** from official GDPT 2018 requirements, not copied textbook: grade/strand/chapter/topic/objective/skill/prerequisite/lesson/question/source/license/review coverage; uncertainty flagged `NOT_VERIFIED`. Do not claim full content without evidence. Full source provenance and rights.
2. CRUD Content/Admin real: subject/chapter/topic/lesson/question/video/assessment, search/filter/page/sort/reorder/archive/restore, draft→review→approved→published, versioning and audit; FE must persist after reload. Teacher cannot publish as Content Reviewer unless authorized. Server validates answer membership, prerequisites acyclic, no duplicate codes, protected delete with attempts.
3. Import pipeline: preview/dry-run/checksum/idempotency, validators, dedup, rollback and no partial publish. Generate teaching examples originally; verification Math via tests/SymPy off-runtime where useful; LLM output invalid = reject.
4. No backend schema duplication: extend existing `ContentController.cs`, `CurriculumImportController.cs`, `CurriculumController.cs`; inspect ContentSubjects etc first.
5. Finish with real E2E: Content publishes verified lesson in Math10 and Math11; learner reads it, unapproved invisible; archive and restore semantics, 403 cross-role, SQL readback.

### L02-2 — Practice hub with 2 actual modules: Basic vs Adaptive
1. New clear menu `Luyện cơ bản` (grade, chapter, skill/topic, difficulty, question count) and `Luyện theo điểm yếu – AI` (recommendations from actual user mistakes/mastery/prerequisites).
2. Personalize by user's grade (10/11/12) and selected subject ID returned by DB, not hardcoded Toán 12. Reuse `PracticeController` session/create/answer/check/submit/mistakes; do not spawn duplicate practice engine.
3. Strict server-authoritative question selection/grading; no answer/explanation leakage while exam open; persist autosave/resume & interrupted submission; idempotency key; each attempt counted once; score normalized to 10 (and raw/correct-count separately); atomic updates to mastery/activity/mistakes.
4. UI end-to-end: set up → work → save/resume → submit → review mistakes → recommended next practice. Each state loading/empty/error/forbidden consistent.

### L02-3 — Diagnostic, personalized mastery, weaknesses today
1. Initial evaluation based on verified question bank and prereq; user mastery model by skill+grade+subject+confidence+evidence count, updated after actual attempts, no fake 100% progress if absent.
2. Deterministic recommendation engine ranked by weakness/prereq/recency/difficulty/time budget/goals; response includes `reason`, `evidenceId/count`, `confidence`, `skillId`, `lessonId`, `actionUrl`. Protect learner isolation in API and DB.
3. Dashboard has dedicated section **“Hôm nay nên học gì?” / “Kiến thức em còn yếu”** with real weak lessons and action buttons to lesson, targeted practice, mistake review. 0 evidence: “Làm đánh giá đầu vào để xác định điểm mạnh/điểm yếu.”
4. Teacher sees class-level aggregation only for authorized class; no other teacher's students. Reports genuine and scope-filtered, honest zero values.

### L02-4 — Smart mistakes + unified AI Tutor
1. Every wrong answer persisted with `userId,attemptId,questionId,selected,serverCorrect,skill,misconceptionType,verifiedAt,reviewStatus`. Ensure no cross-exam answer leak.
2. AI Tutor shared context for student+lesson+question+skill weakness+optional private doc; 3-level hints, citations, LaTeX, Socratic approach; user can flag inaccurate AI explanation. Role-scope every chat/document; no cross-user.
3. LLM errors: malformed answer/question, model unavailable, rate limit, timeout, wrong mathematical result → explicit blocked/retry, not fabricate correct answers. Review question output before publish.
4. Feedback loop: attempt → mastery evidence → mistake categories → targeted exercises → next-day dashboard.

### L02-5 — Roadmap + document tutoring
1. SQL-backed plan personalized from grade, target exam/score, time budget, deadline, prerequisite/mastery; edit/replan/pause/progress/schedule, never invented study dates/streak. Recalculate after trusted attempt; show why.
2. Upload doc PDF/DOCX/image only with validated MIME+magic bytes, size/quota; secure object storage/access path; extract page sections/OCR when justified; retrieval scoped to owner, citation to page and source. Process lifecycle, delete purges index/chunks, cross-user 403, prompt injection mitigation. Published curriculum is independent of uploaded docs.
3. If dependency (virus scan/vector index/LLM API) lacks credentials, implement safe adapters+tests & mark `BLOCKED_EXTERNAL_DEPENDENCY`; do not fake real RAG/AI.

### L02-6 — Admin/Teacher/Content & Support lifecycle + API controls
1. Admin Users/Roles/Teacher lock/status, reports filters/daily counts, audit logs pagination, settings concurrent version, announcements metadata. All FE CRUD to BE SQL and proper status/ownership; read-back after reload.
2. Teacher classroom CRUD/enroll/transfer/assign/homework/grading/class progress/AI weak-skill homework; check source+target ownership, transaction when deleting classroom/assignment with dependent submissions.
3. Content existing editor/publish/import workflows integrated to learner/teacher, review status and provenance enforced by backend.
4. Support role is NOT active now: `App.tsx` redirects `/support/*`. If owner scope includes support, build user reports → SQL tickets → assigned support inbox → threaded replies → reporter status/reopen → admin oversight; RBAC, attachments, audit; no localStorage official tickets. If support role not approved, mark **OUT_OF_SCOPE** explicitly rather than dummy menu.
5. **API administration**: show OpenAPI endpoint registry + external provider/integration configs, enable/disable permitted integrations, quotas, rate-limits, usage logs and health, server-side secret encryption/redaction; **not** arbitrary dynamic route-code creation through Admin form, not expose credentials in frontend/Swagger.

### L02-7 — Quality, UI, operational polish
- UI Evondev light, minimal, consistent with existing design, readable desktop/mobile 390px, shared components, no unrelated massive redesign, keyboard and screenreader support. Every button/menu link live.
- SQL indexes/constraints, EF migrations with rollback tested on disposable SQL only; RBAC for all roles, 401/403/404/409/422/500, pagination, concurrent writes, idempotency, failure injection, user A ≠ user B.
- OpenAPI schema/client contract tests, no stale DTO mismatches, no real secrets logged.
- E2E Playwright real backend/real SQL for workflows (zero mock API `route.fulfill`). Unit/component tests can mock. Add screenshot artifact without secrets; do not leak browser trace token.
- Audit unused files before deletion using `rg` and import graph; never remove active file or bulk delete from vague “unused”.

## Chi tiết test bắt buộc — không chỉ “CI xanh”
Test matrix mandatory:
- Guest/learner/teacher/content/admin/support (if enabled) permissions (401/403) and tenant ownership 2 users, 2 teachers, 2 classes.
- Content Math10/11/12 create/edit/publish/deny-unpublished/duplicate/rollback; data grade code, licenses.
- Learner basic practice + adaptive practice, mid-answer refresh/reconnect, final submission exactly-once, server grading, anti-answer-leak.
- Diagnostic + empty evidence + personalized weak skill; compare 2 accounts, dashboard today no cross-contamination.
- Mistakes re-study & mastery recalc; teacher recommendation & assignment read-back.
- Roadmap set/change goal, change after mastery, E2E refresh.
- Upload document valid/invalid/oversize, unauthorized read/search, delete vector/chunk; if unavailable, assert fail-closed.
- Admin CRUD and audit: user, teacher, account lock/login, filter, settings 2 Admin sessions concurrent 200+409, system metrics real, reporting pagination/export; workflow tickets cross roles if enabled.
- AI provider unavailable, timeout, malformed JSON, throttling and no fabricated AI responses.
- Latest P01 Assessment E2E **3 independent repeats** on disposable DB to show no flaky failure; full CI + screenshots.

Test commands adapted to actual repo; usually:
```powershell
cd frontend
bun install --frozen-lockfile
bun run lint
bunx tsc -b
bun run test
bun run build
cd ..
dotnet restore backend/StudyAI.sln
dotnet build backend/StudyAI.sln -c Release
dotnet test backend/tests/StudyAI.UnitTests/StudyAI.UnitTests.csproj -c Release
# Trước integration: CHỨNG MINH backend/test process resolved SQL connection is StudyAIDb_E2E.
dotnet test backend/tests/StudyAI.IntegrationTests/StudyAI.IntegrationTests.csproj -c Release
# Browser tests run only with a guarded, disposable SQL, ASP.NET host, and Vite.
bun run test:e2e:p01:live
```
Không chạy integration vào local/remote production; không tự viết helper tắt guard. Nếu không có local SQL, CI disposable SQL là nguồn chứng cứ; ghi thật trạng thái local not run.

## Quy tắc bảo mật dữ liệu — KHÔNG NGOẠI LỆ
- `StudyAIDb` = production protected. **TUYỆT ĐỐI KHÔNG ghi, reset, migrate, seed, import, restore, delete, truncate, cleanup vào `StudyAIDb`.** Chỉ dùng `StudyAIDb_E2E`/isolated disposable. DatabaseSafetyGuard cần kiểm tra actual EF DbContext connection và môi trường, không chỉ biến `E2E_DB_NAME`; không tự disable guard cho green test.
- Không commit `appsettings.*` secrets, JWT, password thực, SQL dumps, logs/chụp màn hình có PII; fixture độc lập.
- Không thay stack, không tự động merge, không auto deploy production, không override role/curriculum ownership.

## Điều hành thông minh để NHANH, ít lặp và không báo cáo lẻ tẻ
1. Sau git preflight, tạo/ghi **một** ledger `docs/implementation/PHASE-L02-IMPLEMENTATION.md`; mỗi workstream có checklist status, files, API, migration, test evidence, blockers, commit.
2. Tự phân nhóm và code liên tục từ L02-0 đến L02-7; commit sau mỗi nhóm hoàn chỉnh; chỉ một Draft PR. Không viết 100 TODO thay vì code; không chỉ chạy test cũ rồi nói xong.
3. Ưu tiên số lượng file thay đổi hợp lý, reuse API/schema/components. Không đưa lại nhiều tool calls poll CI khi chưa có trạng thái mới; **không spam Codex review/quota**, không tạo các workflow CI lặp lại vô ích. Chỉ một full CI sau các milestone lớn; tập trung test liên quan trong local trước push.
4. Khi tool quota hết: dừng công cụ bị quota, tiếp tục công việc local độc lập; không hướng dẫn nâng gói là giải pháp kỹ thuật, không tự rerun 20 lần. Ghi `NOT_CHECKED_DUE_TO_QUOTA`.
5. Sau một workstream đạt acceptance tự bắt đầu workstream tiếp theo. Không hỏi người dùng các quyết định kỹ thuật không phá dữ liệu. Chỉ chờ người duyệt khi đụng production, bí mật, bản quyền, scope thực sự chưa xác định.
6. Nếu agent không thể chạy tiếp vì giới hạn phiên, xuất **checkpoint actionable**: HEAD SHA, workstream hiện tại, changed files, tests thực, blocker, exact next command. Không tuyên bố “đã hoàn tất phase” khi còn mục bắt buộc.

## Trước khi báo hoàn tất bắt buộc nộp hồ sơ
- `docs/implementation/PHASE-L02-IMPLEMENTATION.md` có trace matrix đủ các nút/menu actions; bảng status `PASS/FAIL/BLOCKED/OUT_OF_SCOPE`.
- `docs/implementation/PHASE-L02-FINAL-ACCEPTANCE.md` ghi SQL schema/migration, OpenAPI, test log/links, CI HEAD URLs, 390px/desktop screenshots, coverage curriculum chính xác, AI limitations, security/privacy, rollback.
- Draft PR một lần với full changelog/acceptance, check conflicts với #15, tests GREEN trên **latest HEAD** và human review pending.
- Báo cuối: (A) git branch/HEAD/PR, (B) workstreams implemented vs blocked, (C) named FE/API/SQL flows verified, (D) exact test counts/CI URLs, (E) safety evidence, (F) review thread dispositions, (G) open risks. Không dùng từ “100%” nếu có bất kỳ failure/untested/blocker.

**BẮT ĐẦU NGAY:** thực hiện git preflight, đọc code, khôi phục E2E thất bại tại HEAD, và **CODE TỪNG MODULE FULL-STACK** theo thứ tự workstream trong cùng một phase L02 đến khi đạt nghiệm thu. Không trả lời chỉ bằng lời hứa.

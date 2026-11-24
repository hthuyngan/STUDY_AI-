# ANTIGRAVITY — Targeted FE/BE Remediation, Verification and GitHub Handoff

> Repository duy nhất: `https://github.com/hthuyngan/STUDY_AI-`  
> Branch: `feature/backend-redesign-modular-monolith`  
> Baseline tối thiểu: `1b16f6b122132a944c81fb89612dbb7d69d2f9c8`  
> Không làm việc trên ZhongWenHub. Không merge, không force-push. Không ghi/migrate/seed `StudyAIDb`.

## 1. Mục tiêu

Antigravity tự chủ thực hiện toàn bộ quy trình: xác minh lại lỗi, sửa đúng file/logic, thêm regression test, chạy quality gates, cập nhật báo cáo và push lên GitHub để Codex review.

Không sửa chỉ để làm test xanh. Mỗi thay đổi phải có defect tái hiện được, root cause, acceptance criteria và bằng chứng sau sửa. Không refactor lan man, không đổi kiến trúc toàn hệ thống, không xóa hàng loạt CSS hoặc fixture test.

## 2. Preflight bắt buộc

```bash
git fetch origin
git checkout feature/backend-redesign-modular-monolith
git pull --ff-only origin feature/backend-redesign-modular-monolith
git status --short --branch
git rev-parse HEAD
git remote -v
```

Dừng nếu repository không phải `hthuyngan/STUDY_AI-`, branch sai, worktree có thay đổi không thuộc nhiệm vụ, hoặc database test resolve khác `StudyAIDb_E2E`/database disposable được guard cho phép.

Đọc trước khi sửa:

- `AGENTS.md`
- `docs/audit/2026-11-24_ANTIGRAVITY_SYSTEM_STATUS_CODEX_REVIEW_GATE.md`
- `docs/audit/ANTIGRAVITY_CURRENT_SYSTEM_STATUS_REPORT.md`
- `docs/plans/AI_TUTOR_MATH10_12_IMPLEMENTATION_PLAN.md`
- `docs/prompts/ANTIGRAVITY_MATH10_12_MASTER_PROMPT.md`

## 3. Phase A — Chuẩn hóa bằng chứng trước khi sửa

### A1. Integration failures

Không coi 31 test fail của full suite là 31 runtime defects ngay lập tức.

1. Chạy full suite một lần trên `StudyAIDb_E2E` an toàn và lưu `.trx`/console log đã loại secret.
2. Trích danh sách test fail.
3. Chạy **từng test fail riêng biệt** trên trạng thái test database được fixture reset đúng quy định.
4. Chạy lại theo class để phát hiện test-order/database-pollution.
5. Phân loại từng test:
   - `FAILS_ALONE_RUNTIME_DEFECT`
   - `PASSES_ALONE_FAILS_IN_SUITE_TEST_ISOLATION`
   - `STALE_ASSERTION_OR_CONTRACT_DECISION`
   - `ENVIRONMENT_BLOCKED`
6. Chỉ sửa runtime cho `FAILS_ALONE_RUNTIME_DEFECT`. Lỗi isolation phải sửa fixture/cleanup/unique test data, không thay business logic.

Artifact được commit dưới `docs/audit/evidence/`:

- `integration-full-summary.md`
- `integration-isolated-rerun-matrix.md`
- `.trx` nếu không chứa secret và dung lượng hợp lý; nếu quá lớn, lưu checksum + đường dẫn CI artifact.

Không ghi connection string, password, JWT, refresh cookie hoặc API key.

### A2. Endpoint evidence

Sửa `ANTIGRAVITY_CURRENT_SYSTEM_STATUS_REPORT.md`:

- Endpoint chỉ là `VERIFIED_WORKING` khi có test ID hoặc live E2E artifact cụ thể.
- Endpoint tồn tại nhưng không có evidence phải là `IMPLEMENTED_NOT_E2E_VERIFIED`.
- Thêm cột `Evidence Test/Artifact` và không tự bịa FE consumer.
- `/api/v1/health` không được gán cho `PublicCurriculumPage` nếu `rg` không tìm thấy call site.
- Không đếm một full-suite failure vừa là một finding tổng vừa là nhiều finding con. Thống kê phải không trùng lặp.

## 4. Phase B — FE targeted remediation

### B1. Dead Exercises implementation

Files cần kiểm tra:

- `frontend/src/routes/learnerRoutes.tsx`
- `frontend/src/pages/Exercises/ExercisesPage.tsx` và CSS liên quan
- `frontend/src/services/supporting.service.ts`
- `frontend/src/hooks/useSupporting.ts`
- navigation config và tests

Logic:

- Giữ `/exercises` và `/exercises/:exerciseId` làm alias tới `PracticeHubPage` nếu còn liên kết tương thích.
- Xác minh bằng `rg` rằng `ExercisesPage`, `getExercises`, types/hooks tương ứng không còn consumer.
- Xóa đúng dead component/service/hook/type/CSS không còn dùng; không xóa Practice thật.
- Thêm route test chứng minh `/exercises` render Practice thật và không render empty mock.

### B2. Achievements chưa có backend

- Không tạo huy hiệu hoặc XP giả.
- Ẩn liên kết Achievements khỏi learner navigation cho tới khi có persistence thật.
- Direct URL phải hiển thị trạng thái unavailable trung thực hoặc redirect có chủ đích; không báo “0 thành tích” như dữ liệu đã tải thành công.
- Thêm test guest/authenticated và navigation visibility.

### B3. Education runtime bundle contamination

Files:

- `frontend/src/services/education.service.ts`
- `frontend/src/data/mock/education.mock.ts`
- tests đang phụ thuộc `INITIAL_*`

Logic:

- Standard runtime service chỉ dùng API và fail closed khi thiếu auth/permission.
- Không import `education.mock.ts` từ production service graph.
- Di chuyển fixture sang test fixture/factory và cập nhật test inject/mock API phù hợp.
- Không chỉ xóa PHYS/CHEM rồi giữ cơ chế fallback; phải loại dependency mock khỏi runtime bundle.
- Xác minh production bundle không chứa tên/ID fixture bằng search trên `dist/assets`.

### B4. Mock reset hygiene

Files:

- `AdminSettingsPage.tsx`
- `admin`, `classroom`, `content`, `operations`, `teacher` services
- tests gọi `_resetMockState`

Logic:

- Gỡ test-only call khỏi production page.
- Chuyển reset helper vào test utility hoặc reset thông qua mocked adapters.
- Không làm thay đổi behavior “xóa cache client” thật.

### B5. WorkspaceShell hard-code và identity

- Xóa/hide badge count, danh sách thông báo và timestamp hard-code cho đến khi có API thật; không tự xây notification backend ngoài phạm vi.
- Không hiển thị `staff@study-ai.edu.vn`, “Nhân viên” như identity thật.
- Trong authenticated staff route, identity lấy từ auth session; session thiếu/invalid phải về login hoặc error state.
- `FE Prototype` pill chỉ hiển thị khi compile-time development prototype thực sự bật.
- Thêm component tests cho admin/teacher/content, missing user, và standard production mode.

### B6. Fail-closed service errors

Files:

- `frontend/src/services/supporting.service.ts`
- hooks/pages Library và Profile

Logic:

- Chỉ map 204 hoặc contract-defined empty response thành `[]`.
- 401/403/5xx/network phải giữ lỗi có cấu trúc để page hiển thị error/retry.
- Profile stats lỗi không được biến thành số 0 giả.
- Test tối thiểu: success, empty, 401, 403, 500, timeout/network.

### B7. Prototype/preview safety

Files:

- `frontend/src/config/prototype.ts`
- `RoleGuard.tsx`, `PermissionGuard.tsx`
- guard tests và production-build test

Logic:

- Không cho `window.__STUDY_AI_PROTOTYPE_MODE__` bật bypass trong production.
- Prototype chỉ hợp lệ khi `import.meta.env.DEV` và explicit dev flag cùng đúng.
- BE vẫn là authority; live test phải chứng minh direct API nhận 401/403 khi không đúng quyền.
- Test production build: truy cập `/admin`, `/teacher`, `/content` không session phải redirect login; API protected phải 401/403.

### B8. Playwright responsive

File: `scripts/e2e_responsive_light_mode_playwright.ts`.

- Biến overflow, hamburger, drawer, close button và collapse invariants thành assertion làm process exit 1 khi sai.
- Không truy cập staff route nhờ prototype bypass. Login bằng account E2E theo role hoặc kiểm tra redirect 401/403 có chủ đích.
- Viewports: 375, 390, 768, 1024, 1366, 1920; kiểm tra horizontal overflow, keyboard Escape, focus, backdrop/body scroll.
- Không commit hàng nghìn screenshot; giữ manifest và ảnh lỗi/đại diện.

### B9. Notes và bookmarks

Authenticated notes/bookmarks là dữ liệu người dùng, phải có ownership phía BE và đồng bộ đa thiết bị. Thực hiện thành workstream riêng sau các P0:

- Entity/migration tối thiểu cho user note và section bookmark.
- API dưới `/api/v1/me/...`, userId lấy từ claims, không nhận userId tin cậy từ client.
- CRUD, pagination/filter nếu cần, unique constraint bookmark, validation và audit timestamps.
- FE authenticated dùng API; guest có thể local-only với nhãn rõ.
- Thiết kế migrate/merge guest data idempotent sau login; không ghi đè dữ liệu server âm thầm.
- Integration tests hai user chống đọc/sửa/xóa chéo.
- Migration/test chỉ trên `StudyAIDb_E2E` hoặc disposable database; không chạm `StudyAIDb`.

## 5. Phase C — BE defects đã tái hiện độc lập

Chỉ thực hiện mục nào được Phase A xác nhận `FAILS_ALONE_RUNTIME_DEFECT`.

### C1. Exam integrity và practice RBAC

Files dự kiến: Student practice controller/service và DTOs liên quan.

- Exam mode không được tiết lộ correct answer/explanation trước submit.
- Result của session chưa completed phải fail closed.
- Ownership và role được kiểm tra server-side.
- Không đổi HTTP status chỉ để khớp test nếu contract sản phẩm nói khác; cập nhật contract + test cùng lý do.
- Test: happy, unauthenticated, wrong role, cross-user, in-progress, completed, refresh.

### C2. Admin settings concurrency

- Kiểm tra entity/DTO hiện có `Version`, `UpdatedAt`, rowversion/ETag trước khi thêm schema mới.
- Dùng cơ chế nhỏ nhất bảo đảm compare-and-swap; stale update trả 409 và không làm mất write trước.
- Nếu cần migration, tạo migration duy nhất, kiểm thử clean migration và rollback trên disposable/E2E DB.
- Test hai admin song song, stale request, retry với version mới.

### C3. Admin user integrity

- Sửa 405/FK/duplicate/revoke-session theo root cause thực tế, không đổi route hàng loạt.
- Bảo toàn lịch sử học tập; soft delete không cascade/xóa dữ liệu ngoài yêu cầu.
- Quy tắc last-admin phải được service/domain enforce và controller map status/message nhất quán.
- Test hai admin, last-admin, existing progress, active refresh sessions, idempotent retry.

### C4. Auth/content/question-bank failures

- Phân biệt stale string assertion với business defect.
- Ưu tiên error code ổn định; localization text không phải API contract duy nhất.
- Không làm suy yếu copyright/provenance/four-eyes guard để test pass.
- Question restore/count phải được kiểm tra với dữ liệu test unique và database sạch trước khi sửa query.

## 6. Phase D — Không sửa hàng loạt nếu chưa có bằng chứng

- Dark selectors: đo bundle và visual coverage trước; chỉ xóa selector đã chứng minh unreachable, theo từng component và có screenshot/regression test. Không xóa 181 dòng trong một sweep.
- Learning prerequisites: không chuyển heuristic sang DB nếu schema/provenance chưa được duyệt; lập task riêng với dữ liệu nguồn rõ.
- Fake LLM: production phải fail closed/unconfigured; dev fake phải explicit. Có thể loại concrete type check bằng contract/capability, nhưng không làm AI giả xuất hiện như AI thật.
- Bundle splitting: chỉ làm sau correctness; đo trước/sau và tránh đổi behavior.

## 7. Quality gates bắt buộc

```bash
cd frontend
bun install --frozen-lockfile
bun run lint
bun x tsc -b
bun run test
bun run build

cd ../backend
dotnet restore StudyAI.sln
dotnet build StudyAI.sln -c Release --no-restore
dotnet test tests/StudyAI.UnitTests/StudyAI.UnitTests.csproj -c Release --no-build
# Integration chỉ sau khi log database name = StudyAIDb_E2E/disposable, không log secret
dotnet test tests/StudyAI.IntegrationTests/StudyAI.IntegrationTests.csproj -c Release --no-build --logger "trx"
```

Chạy targeted tests sau mỗi workstream, full gates ở cuối. Playwright phải bao gồm happy/error/401/403/empty/refresh/two-user/mobile phù hợp với phần đã sửa.

## 8. Commit strategy và báo cáo

Mỗi commit chỉ chứa một concern, ví dụ:

1. `test(audit): classify isolated integration failures`
2. `fix(frontend): remove unreachable exercise mock flow`
3. `fix(frontend): fail closed for learner support data`
4. `fix(auth): constrain prototype bypass to development`
5. `test(e2e): enforce responsive and staff auth assertions`
6. `fix(practice): enforce exam integrity and role ownership`
7. `fix(admin): preserve settings and user data integrity`
8. `feat(notes): persist authenticated notes and bookmarks`
9. `docs(audit): publish remediation verification report`

Không gộp tất cả thành một commit khổng lồ. Trước mỗi push: `git diff --check`, xem `git status`, fetch/rebase remote; không force-push.

Tạo/cập nhật:

- `docs/audit/ANTIGRAVITY_CURRENT_SYSTEM_STATUS_REPORT.md`
- `docs/audit/ANTIGRAVITY_TARGETED_REMEDIATION_REPORT.md`
- evidence tối thiểu dưới `docs/audit/evidence/`

Báo cáo cuối phải có:

- baseline/final SHA và danh sách commit;
- file đã sửa theo workstream;
- root cause, before/after, acceptance criteria;
- test command, exit code, pass/fail/skip và artifact;
- endpoint classification đã sửa, không suy diễn;
- DB resolved name và xác nhận guard;
- mục còn chưa làm/blocked, không tuyên bố hoàn thành giả;
- working tree sạch và GitHub link.

## 9. Stop conditions

Dừng và báo blocker nếu database không an toàn, thiếu requirement có thể đổi schema/business behavior, test chỉ fail trong full suite nhưng chưa rõ isolation, remote branch có thay đổi xung đột, hoặc cần xóa dữ liệu thật.

Sau khi push tất cả commit và báo cáo, **dừng để Codex review; không merge**.

# PROMPT CHO ANTIGRAVITY — HOÀN THIỆN STUDY_AI ZERO-MOCK END-TO-END

Bạn đang làm việc trên repository `hthuyngan/STUDY_AI-`. Hãy thực hiện một phase remediation đầy đủ sau PR #18 để biến toàn bộ route authenticated từ prototype/hybrid thành hệ thống BE–FE thật, có persistence và bằng chứng kiểm thử.

Đọc bắt buộc trước khi sửa:

1. `AGENTS.md`
2. `docs/audit/2026-11-21_FULL_SYSTEM_POST_L02_REVIEW.md`
3. `docs/plans/PHASE-L02-MATH10_12-INTEGRATED-DELIVERY.md`
4. `docs/implementation/PHASE-L02-IMPLEMENTATION.md`
5. `docs/implementation/FINAL_ACCEPTANCE_P00_P01.md`
6. `docs/prompts/ANTIGRAVITY_L02_BIG_PHASE_EXECUTION_PROMPT.md`

## Mục tiêu bất biến

- Authenticated Admin/Content/Teacher/Learner chỉ hiển thị dữ liệu thật từ API/DB hoặc honest empty/error state.
- Tuyệt đối không fallback sang fixture/mock/localStorage khi request authenticated lỗi.
- LocalStorage chỉ được dùng cho preference giao diện không nhạy cảm hoặc guest mode được gắn nhãn rõ; không dùng cho approval, publication, role, grade, assignment, alert, audit, profile hoặc learning truth.
- Không hard-code lớp 12 khi grade/subject chưa xác định.
- Mọi mutation phải tồn tại sau reload và phiên trình duyệt thứ hai.
- Không làm suy yếu `DatabaseSafetyGuard`.
- Cấm migration/seed/test write vào `StudyAIDb`; chỉ dùng `StudyAIDb_E2E` hoặc database disposable được ủy quyền.
- Không push thẳng `main`; tạo branch riêng, commit nhỏ có ý nghĩa và mở PR.

## Baseline phải chạy trước

Ghi SHA bắt đầu, `git status`, version toolchain và kết quả:

```bash
cd frontend
bun install --frozen-lockfile
bun run lint
bun run test -- --run
bun run build

cd ../backend
dotnet restore StudyAI.sln
dotnet build StudyAI.sln -c Release --no-restore
dotnet test tests/StudyAI.UnitTests/StudyAI.UnitTests.csproj -c Release --no-build
```

Nếu có SQL Server E2E đã xác nhận an toàn, chạy integration test với connection string trỏ chính xác vào `StudyAIDb_E2E`. Nếu không có, ghi BLOCKED, không giả vờ đã chạy và không đổi sang `StudyAIDb`.

## Workstream A — Inventory có thể kiểm chứng

Tạo script/check CI liệt kê dependency graph của route authenticated và fail nếu phát hiện import từ:

- `*.mock.*`
- `data/mock/**`
- `data/staff/**` chứa fixture runtime
- `INITIAL_MOCK_*`, `INITIAL_*` demo dataset
- repository local-only dùng làm nguồn sự thật nghiệp vụ

Phân biệt rõ fixture chỉ dùng trong test với runtime import. Xuất bảng route → page → hook → service → endpoint → table → test. Không đánh dấu “real” nếu chỉ có UI hoặc chỉ gọi API nhưng response lại được thay bằng dữ liệu dựng.

## Workstream B — Content review, publication và editor thật

### Backend

Thiết kế/persist tối thiểu:

- review event/history cho lesson và question;
- reviewer, note/reason, transition, timestamp;
- publication record/version/changelog;
- rollback có optimistic concurrency/idempotency;
- lesson editor payload đầy đủ: introduction, definitions, formulas, examples, notes, summary, objectives, videos và assessment link;
- audit log append-only cho mọi mutation.

Tái sử dụng endpoint hiện có trong `ContentController` khi đúng contract:

- submit review;
- approve;
- request changes/reject;
- publish/unpublish;
- question workflow.

Bổ sung endpoint query còn thiếu cho review queue, review detail, publication history và version detail. Enforce state machine ở BE, không tin trạng thái FE. Trả 409 cho transition sai, 403 cho thiếu quyền, 404 cho ID không tồn tại.

### Frontend

Xóa runtime dependency vào `INITIAL_APPROVALS`, `INITIAL_PUBLICATIONS`, `INITIAL_MOCK_LESSON_CONTENT` và `mockLessonContents` trên route authenticated.

Sửa:

- `operations.service.ts`
- `content.service.ts`
- `education.service.ts`
- các Content Review/Approval/Publications/Lesson Editor pages và hooks liên quan.

`assessmentCoveragePercent` phải tính từ DB hoặc bỏ KPI; cấm hard-code 86%. Khi API lỗi, hiển thị `PageErrorState` + retry. Khi chưa có dữ liệu, hiển thị empty state đúng sự thật.

### Test bắt buộc

- content user submit → reviewer thấy ở phiên khác;
- reviewer request changes → author thấy note;
- approve → publish → learner thấy nội dung;
- transition sai bị 409;
- unauthorized bị 403;
- reload và browser session thứ hai vẫn thấy history;
- rollback khôi phục đúng version, audit log không mất.

## Workstream C — Teacher/classroom zero-mock

Loại `INITIAL_CLASSES`, `INITIAL_STUDENTS`, `INITIAL_ASSIGNMENTS`, `INITIAL_SUBMISSIONS`, `INITIAL_ALERTS`, `INITIAL_ACTIVITIES` khỏi mọi authenticated path.

Hoàn thiện API/persistence cho:

- class activities;
- learning alerts: create/detect, acknowledge, resolve, resolve-all;
- grade list theo assignment/submission thật;
- student academic detail từ lesson progress + assessment attempts + assignments;
- teacher dashboard summary và at-risk list;
- enrollment/move/remove student có transaction và audit.

Không dựng recent lesson, assessment attempt, weak area hoặc tên “Toán 12”. Nếu chưa có dữ liệu, trả danh sách rỗng + metadata đủ để UI hiển thị empty state.

Test ownership: teacher A không đọc/sửa lớp của teacher B; admin có quyền theo policy; learner chỉ thấy dữ liệu của chính mình.

## Workstream D — Learner zero-mock

### Question bank

Thay `questionBank.repository.ts` local fixture bằng API đọc `ContentQuestions` đã published/approved. Map đầy đủ MCQ, true/false group, short answer, difficulty, cognitive level, explanation và skill/topic. Server thực hiện filter/pagination; FE không công bố “22 câu kiểm chứng” từ fixture.

### Dashboard và learning path

Xóa các dữ liệu dựng khi authenticated:

- subject list fallback cứng;
- avatar/grade từ mock dashboard;
- continue lesson dựng từ assessment attempt;
- rank 1 leaderboard giả;
- lesson title/chapter giả;
- `mockSubjectDetails`/`mockSubjectsSummary` trong learning path authenticated.

Bổ sung/điều chỉnh endpoint dashboard để trả đúng continue-learning, activity theo ngày, daily goal progress, subject metadata và leaderboard thật; nếu sản phẩm chưa có leaderboard thì bỏ widget.

### Profile, settings, achievements

Tạo API và persistence cho:

- cập nhật display name/grade/school/study goal với validation;
- learner preferences và notification preferences;
- achievement definitions + idempotent unlock ledger + unlockedAt thật.

Không dùng `new Date()` làm ngày unlock suy diễn. Không tính XP nếu backend chưa có XP ledger; bỏ nhãn/field thay vì dựng số.

### Quiz legacy

Giữ redirect quiz cũ sang practice engine thật hoặc xóa toàn bộ dead quiz page/service/data sau khi chứng minh không còn link/import. Không tái kích hoạt `quiz.service.ts` mock.

### AI Tutor

Authenticated conversation/message/status phải fail-closed. Guest demo nếu giữ phải có nhãn “Demo/không lưu máy chủ” rõ ràng và không trộn vào tài khoản sau login nếu người dùng chưa xác nhận migration.

## Workstream E — Subject/grade resolver duy nhất

Tìm toàn repo các default `sub_math12`, “Toán 12”, “Lớp 12”, ternary dạng “10/11/else 12”. Phân loại:

- seed/curriculum identity hợp lệ;
- default request không hợp lệ;
- copy UI không theo context;
- test fixture.

Tạo resolver tập trung dựa trên thứ tự:

1. subject ID explicit đã validate;
2. entity/attempt/question/lesson relation;
3. authenticated user grade và active subject trong DB;
4. nếu không resolve được: validation error hoặc honest unknown, tuyệt đối không tự chọn lớp 12.

Áp dụng cho mastery, analytics, exam prep, revision, spaced repetition, AI Tutor, teacher management và các service FE. Test matrix lớp 10, 11, 12, unknown, subject không tồn tại và user không có grade.

## Workstream F — Admin roles thật hoặc read-only đúng sự thật

Chọn một trong hai và ghi ADR:

1. Nếu RBAC là code-defined: bỏ tab sandbox/mutation, hiển thị read-only policy và commit/version nguồn policy.
2. Nếu RBAC là data-driven: tạo schema role-permission, endpoint GET/PUT có concurrency, audit và invalidate authorization cache.

Không được tiếp tục lưu permission simulation vào localStorage trên trang quản trị như một chức năng thật.

## Workstream G — Support workspace

Hiện `/support/*` chỉ redirect. Nếu Support nằm trong scope sản phẩm, triển khai tối thiểu ticket CRUD, assignment, status transition, comment, audit, RBAC và notification; nếu không nằm trong scope, xóa role/link/route/copy gây hiểu nhầm và ghi ADR “out of scope”. Không để route chết nhưng tuyên bố đã triển khai.

## Workstream H — UI/UX và accessibility

- Dùng token/component hiện có; không đưa UI kit mới.
- Thay `alert()` bằng toast/inline validation/confirm dialog accessible.
- Tất cả form có label, loading, disabled, error, retry và empty state.
- Mobile 360 px và desktop 1440 px không overflow.
- Dark mode không mất tương phản.
- Không dùng giant card/gradient/shadow để che thiếu dữ liệu.
- Chạy browser thật cho route chính của bốn role.

## Workstream I — Hiệu năng và test hygiene

- Route-level lazy loading cho từng workspace/page lớn.
- Tách Recharts/KaTeX/editor khỏi main chunk nếu không cần ở first load.
- Sửa ineffective dynamic import của `apiClient.ts`.
- Mục tiêu main initial JS < 500 KB gzip hoặc ghi budget/exception có đo lường.
- Test frontend không được gọi localhost/network thật; giữ default fetch stub và mock contract rõ ràng.

## Acceptance gate bắt buộc

### Static/runtime

- CI zero-match runtime mock import trên authenticated graph.
- Không mutation nghiệp vụ staff nào ghi localStorage.
- Không default unknown grade thành lớp 12.
- Không `alert()` trên route production chính.

### Backend

- Release build 0 warning, 0 error.
- Unit test 100% pass.
- Integration test 100% pass trên `StudyAIDb_E2E`/disposable DB.
- Database safety tests vẫn chặn `StudyAIDb`.
- Có authorization, ownership, validation, idempotency/concurrency test cho mutation quan trọng.

### Frontend

- lint, typecheck, unit/component test và production build đều pass.
- Không log `ECONNREFUSED`/AbortError do test gọi network ngoài ý muốn.
- Browser E2E cho ít nhất:
  - Admin user status/delete/system health;
  - Content edit/submit/review/publish;
  - Teacher class/assignment/grade/alert;
  - Learner curriculum/practice/assignment/question bank/profile.

### Persistence proof

Với mỗi mutation, lưu bằng chứng:

1. request/response status;
2. reload trang;
3. đăng nhập phiên thứ hai;
4. query/read API xác nhận;
5. DB E2E row/audit row xác nhận, không ghi secret/PII vào artifact.

## GitHub delivery

1. Tạo branch ví dụ `antigravity/post-l02-zero-mock-real-data`.
2. Commit theo workstream, không gộp một commit khổng lồ.
3. Push branch lên GitHub; không push thẳng `main`.
4. Mở PR vào `main` và ghi:
   - before/after architecture;
   - migration list;
   - endpoint contract list;
   - test commands + kết quả thật;
   - browser screenshots cho desktop/mobile;
   - database safety evidence;
   - danh sách mock đã xóa;
   - limitation/blocker còn lại.
5. Gắn exact commit SHA trong báo cáo nghiệm thu.

## Quy tắc báo cáo

Không dùng các câu “đã hoàn thiện”, “real data”, “production-ready” nếu chưa có test/persistence proof tương ứng. Nếu bị chặn bởi database, secret, browser hoặc API contract, ghi `BLOCKED` với bằng chứng và tiếp tục phần không bị chặn; không thay bằng mock để làm UI trông như hoạt động.

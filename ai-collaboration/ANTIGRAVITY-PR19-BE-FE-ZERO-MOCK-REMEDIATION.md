# Prompt thực thi cho Antigravity: sửa BE/FE, xóa mock và bảo vệ dữ liệu người học

> Repository duy nhất: `hthuyngan/STUDY_AI-` (StudyAI), không phải ZhongwenHub.
>
> Nhánh cần sửa: `antigravity/post-l02-zero-mock-real-data`.
>
> Baseline đã review: `d893ccf4470870590410b3ed7c81ec21778a8ef8`.

## Vai trò và mục tiêu

Bạn là senior full-stack engineer chịu trách nhiệm hoàn thiện StudyAI từ database đến giao diện. Hãy sửa trực tiếp mã nguồn, migration, contract, test và tài liệu; không chỉ phân tích hoặc viết thêm TODO.

Mục tiêu cuối cùng:

1. Sửa toàn bộ lỗi BE/FE được nêu trong tài liệu này.
2. Xóa mock/demo/fake data khỏi mọi runtime flow của admin, giáo viên và người học.
3. Dữ liệu cá nhân chỉ được tải và hiển thị sau khi xác thực thành công.
4. Guest không nhìn thấy tiến độ, điểm, thành tích, lớp học, lịch sử, gợi ý cá nhân hoặc dữ liệu thi đua giả.
5. Gỡ widget thi đua/leaderboard khỏi dashboard người học và xóa dữ liệu leaderboard mock. Không thay nó bằng một bộ số giả khác.
6. Chứng minh chức năng hoạt động với SQL thật, integration test, browser E2E và CI xanh.

## Quy tắc không được vi phạm

- Không fallback sang mock/localStorage khi API lỗi, timeout, trả 401/403/404/500 hoặc trả payload sai schema.
- Không dùng `Math.random()`, mảng `INITIAL_*`, tên “Demo Admin”, số đếm cố định, rating/lượt xem giả hoặc dữ liệu được dựng từ frontend để giả lập kết quả server.
- Không bắt mọi exception rồi trả dữ liệu mẫu/rỗng như thể thành công. Phải phân biệt `loading`, `empty`, `unauthenticated`, `forbidden` và `error`.
- Không hardcode `sub_math12`, “Toán học 12”, grade, subject hoặc user ID trong runtime flow.
- Mock/fixture chỉ được tồn tại trong file test, test factory hoặc development fixture tách biệt và tuyệt đối không được import từ production bundle.
- Không nới lỏng `DatabaseSafetyGuard`. Mọi migration/E2E chỉ chạy với database cô lập như `StudyAIDb_E2E`, không được chạy vào `StudyAIDb` production.
- Không log token, refresh token, mật khẩu hoặc dữ liệu cá nhân nhạy cảm.
- Giữ nguyên các thay đổi hợp lệ đang có; không reset/rewrite lịch sử hoặc ghi đè công việc của người khác.

## Hành vi bắt buộc theo trạng thái đăng nhập

| Khu vực | Guest/chưa đăng nhập | Đã đăng nhập |
|---|---|---|
| Trang chủ công khai | Chỉ nội dung giới thiệu, môn học công khai và CTA đăng nhập | Có thể điều hướng vào workspace cá nhân |
| Tiến độ học tập | Không render component, không gọi API tiến độ | Lấy từ BE theo user trong token |
| Tiếp tục học | Ẩn hoàn toàn | Hiển thị bài gần nhất từ SQL; không có thì empty state |
| Điểm/thống kê/thành tích | Ẩn hoàn toàn | Hiển thị dữ liệu SQL của chính user |
| Lớp/bài tập/lịch sử | Yêu cầu đăng nhập | Kiểm tra membership/ownership ở BE |
| Gợi ý cá nhân/AI context | Không dựng hồ sơ giả | Dùng grade/subject/mastery của user thật |
| Thi đua/leaderboard | Không hiển thị | Gỡ khỏi dashboard trong phạm vi công việc này; không gọi endpoint leaderboard |

Trong lúc auth đang hydrate, dùng skeleton trung tính; không được chớp dữ liệu mock hoặc dữ liệu của user trước đó. Khi logout phải xóa cache/query state chứa dữ liệu người dùng.

## P0 — Sửa bảo mật và contract trước

### P0.1 Phân quyền và ownership cho Content

Vị trí chính:

- `backend/src/StudyAI.Api/Controllers/ContentController.cs`
- Các service/repository/entity liên quan content, subject, chapter, lesson và moderation.

Hiện controller dùng class-level roles gồm `author` và `content_creator`, khiến các role này có thể gọi cả endpoint quản trị subject/chapter và sửa/xóa lesson bất kỳ.

Yêu cầu:

1. Tách policy theo action, ưu tiên policy-based authorization thay vì chuỗi role rải rác.
2. Chỉ admin/content_admin được tạo, sửa, xóa subject/chapter và thực hiện thao tác quản trị toàn cục.
3. Author/content_creator chỉ được tạo/sửa nội dung trong phạm vi được giao và chỉ sửa bản ghi mình sở hữu, trừ khi có quyền review rõ ràng.
4. Reviewer không được tự duyệt nội dung của chính mình nếu quy trình yêu cầu four-eyes approval.
5. Mọi GET/PUT/DELETE theo ID phải kiểm tra tenant/scope/ownership ở server, không tin ID hoặc role do FE gửi.
6. Thêm test 401, 403, ownership chéo giữa hai author, self-approval và admin success.

### P0.2 Chuẩn hóa DTO Publication/Approval

Vị trí chính:

- `backend/src/StudyAI.Api/Controllers/ContentController.cs`
- `frontend/src/types/operations.ts`
- `frontend/src/services/operations.service.ts`
- `frontend/src/pages/Admin/AdminPublicationsPage.tsx`
- `frontend/src/pages/Content/ContentPublicationsPage.tsx`

Hiện BE trả `publisherName` và `status = published`, còn FE đọc `publishedBy` và chỉ hiểu `active | archived | superseded`. Điều này có thể gây `undefined.toLowerCase()` và hiển thị sai trạng thái.

Yêu cầu:

1. Định nghĩa DTO BE duy nhất, sinh/đồng bộ type FE hoặc mapper có test contract.
2. Chọn một vocabulary trạng thái duy nhất và dùng xuyên suốt DB → BE → FE.
3. Không dùng optional chaining để che payload sai; validate response tại boundary và hiện error state có retry.
4. Bổ sung contract/integration test cho list, search, filter, display status và người xuất bản.

### P0.3 Làm rollback phiên bản thật

Hiện rollback chỉ đổi status về draft, không dùng `targetVersion`, không khôi phục snapshot và FE có thể báo lỗi sau khi server đã mutate.

Yêu cầu:

1. Thiết kế migration/entity version history, ví dụ `ContentRevision` gồm content ID, version, snapshot hoặc các trường versioned, author, reason, created time và source revision.
2. Mỗi publish/update quan trọng tạo revision bất biến trong một transaction.
3. Rollback nhận `targetVersion`/revision ID trong request body, kiểm tra revision thuộc đúng content, tạo revision mới từ snapshot cũ và trả DTO mới.
4. Không xóa lịch sử cũ; rollback cũng là một revision có audit trail.
5. FE chỉ báo thành công sau response thành công; invalidate/refetch query thay vì tìm publication vừa bị loại khỏi list published.
6. Test transaction rollback, revision không tồn tại, cross-content revision, concurrent update và UI success/error.

## P1 — Xóa mock và khóa dữ liệu cá nhân theo auth

### P1.1 Lập inventory và xóa runtime mock

Kiểm tra tối thiểu các vị trí sau:

- `frontend/src/services/admin.service.ts`
- `frontend/src/services/classroom.service.ts`
- `frontend/src/services/operations.service.ts`
- `frontend/src/services/content.service.ts`
- `frontend/src/services/supporting.service.ts`
- `frontend/src/services/dashboard.service.ts`
- `frontend/src/services/learningState.service.ts`
- `frontend/src/services/lessonProgress.service.ts`
- `frontend/src/services/quiz.service.ts`
- `frontend/src/repositories/questionBank.repository.ts`
- `frontend/src/repositories/curriculum.repository.ts`
- `frontend/src/data/dashboard.mock.ts`
- mọi file có `mock`, `demo`, `fake`, `sample`, `INITIAL_`, `Math.random`, `localStorage` hoặc số liệu hardcode.

Yêu cầu thực hiện:

1. Lập bảng inventory trước khi sửa: file, symbol, màn hình sử dụng, endpoint thay thế, schema/database source.
2. Thay từng runtime mock bằng API thật. Nếu BE thiếu API thì triển khai BE, authorization, validation và test trước khi nối FE.
3. Xóa import, data file, adapter, fallback và localStorage demo khi không còn consumer.
4. Không giữ mock “phòng khi API hỏng”. API hỏng phải hiện error state trung thực.
5. Không tự tạo điểm, submission, duration, rating, view count, active user, subject/grade hoặc achievement ở FE.
6. Sau khi sửa, chạy scan toàn production source và phân loại từng kết quả còn lại. Chỉ chấp nhận fixture dưới test.

### P1.2 Admin phải dùng dữ liệu thật hoàn toàn

Admin users/roles/classes/content/analytics/settings/audit/announcements/publications/approvals phải lấy từ BE và SQL.

- Không import các bộ admin mock trong `admin.service.ts`.
- Không reset “demo data”. Reset phải là chức năng nghiệp vụ được bảo vệ hoặc bị xóa.
- Analytics phải aggregate từ SQL với time range/filter thật; khi không có dữ liệu trả số 0 và danh sách rỗng đúng schema.
- Mutation phải refetch/invalidate cache, xử lý concurrency và hiển thị lỗi server.
- Audit log do server tạo từ actor trong token; FE không gửi “Demo Admin” hoặc tự dựng actor.

### P1.3 Dữ liệu người học chỉ sau đăng nhập

Kiểm tra và sửa tối thiểu:

- `frontend/src/pages/Dashboard/DashboardPage.tsx`
- `frontend/src/components/dashboard/StatsStrip.tsx`
- `frontend/src/hooks/useDashboard.ts`
- `frontend/src/pages/Profile/ProfilePage.tsx`
- `frontend/src/pages/Achievements/AchievementsPage.tsx`
- `frontend/src/pages/LearningPath/LearningPathPage.tsx`
- `frontend/src/pages/Assignments/LearnerAssignmentsPage.tsx`
- lesson/progress/quiz/AI tutor hooks và services.

Yêu cầu:

1. Chỉ bật query cá nhân khi auth state đã hydrate và có authenticated user hợp lệ.
2. Guest truy cập route riêng tư phải được chuyển tới login hoặc thấy CTA đăng nhập, không thấy dữ liệu mẫu.
3. Dashboard guest/public không render StatsStrip, continue learning, streak, mastery, achievement, assignment hoặc recent activity.
4. Không dùng profile/grade mặc định khi API thiếu dữ liệu. Yêu cầu user hoàn thiện hồ sơ hoặc hiện trạng thái chưa có dữ liệu.
5. Cache key phải chứa user ID khi phù hợp; logout và đổi tài khoản phải clear dữ liệu cá nhân để không rò dữ liệu giữa hai user.
6. Thêm E2E hai tài khoản chứng minh user B không nhìn thấy dữ liệu của user A.

### P1.4 Gỡ thi đua/leaderboard mock

Vị trí tối thiểu:

- `frontend/src/components/dashboard/LeaderboardCard.tsx`
- `frontend/src/pages/Dashboard/DashboardPage.tsx`
- `frontend/src/services/dashboard.service.ts`
- `frontend/src/data/dashboard.mock.ts`
- route/link `/leaderboard`
- `backend/src/StudyAI.Api/Controllers/PracticeController.cs` nếu endpoint không còn consumer.

Yêu cầu:

1. Gỡ `LeaderboardCard` khỏi dashboard người học.
2. Xóa link chết `/leaderboard`, dữ liệu leaderboard mock và logic `correctAnswers * 10` giả làm XP.
3. Không gọi endpoint leaderboard từ dashboard.
4. Nếu giữ endpoint BE cho tương lai, đánh dấu rõ chưa dùng, không gọi nó “tuần này” khi query là all-time và không công khai tên người học nếu chưa có privacy/opt-in design.
5. Xóa component/service/type không còn dùng hoặc giữ type dùng chung chỉ khi có consumer thật và test.

## P2 — Hoàn thiện các chức năng BE/FE đang dở

### P2.1 Classroom alerts phải persist

Vị trí chính:

- `backend/src/StudyAI.Api/Controllers/TeacherManagementController.cs`
- `frontend/src/services/classroom.service.ts`

Hiện GET dựng lại alert với status `new`; resolve chỉ ghi audit log nên reload làm alert xuất hiện lại.

Yêu cầu:

1. Tạo entity/migration hoặc trạng thái persistence phù hợp cho alert: ID ổn định, class/student scope, type, status, detected/resolved time, resolved by và optional note.
2. Resolve một alert và resolve-all phải transaction-safe, idempotent và kiểm tra alert tồn tại/thuộc lớp giáo viên quản lý.
3. GET phải trả trạng thái đã lưu; không dựng ID/status thay đổi qua mỗi request.
4. Thêm integration test resolve → reload vẫn resolved, cross-teacher 403, unknown ID 404 và resolve-all đúng scope.

### P2.2 Grades/submissions/classes không được dựng giả

Trong `classroom.service.ts`, xóa logic “Add some mock assessment grades”, local collections và các mapping ép mọi assignment thành `sub-math-12`/“Toán học 12”.

Yêu cầu:

1. BE trả đầy đủ subject/grade/class/assignment metadata cần cho FE.
2. FE map đúng DTO, không bổ sung điểm hoặc submission không tồn tại.
3. Endpoint submission không được yêu cầu FE có assignmentId nếu màn hình nghiệp vụ cần danh sách toàn bộ; bổ sung endpoint/filter đúng mục đích.
4. Academic detail phải có dữ liệu progress/time thật hoặc trường nullable rõ ràng, không trả `0` hardcode để che việc chưa triển khai.

### P2.3 Question Bank contract và filter

Vị trí chính:

- `backend/src/StudyAI.Api/Controllers/CurriculumController.cs`
- `frontend/src/types/questionBank.ts`
- `frontend/src/repositories/questionBank.repository.ts`
- `frontend/src/pages/QuestionBank/QuestionBankPage.tsx`
- `frontend/src/components/question-bank/TrueFalseGroupItem.tsx`
- `frontend/src/components/question-bank/ShortAnswerItem.tsx`

Yêu cầu:

1. BE trả đúng discriminated union theo `type`:
   - multiple choice: options + correct answer theo contract;
   - true/false group: `subItems` đầy đủ;
   - short answer: `acceptedAnswers` và `displayAnswer`.
2. Không trả đáp án cho learner trước khi được phép xem; tách author/admin DTO và learner DTO nếu cần.
3. FE không mặc định gửi `subjectId=math` nếu DB dùng `sub_math10/11/12`. Lấy subject ID thật từ curriculum/profile/filter.
4. Guest có thể gọi endpoint public nếu nghiệp vụ cho phép; không chuyển sang `mockQuestions` chỉ vì không có token.
5. Nếu Question Bank yêu cầu đăng nhập, BE và route FE phải cùng enforce; không có hai hành vi mâu thuẫn.
6. Thêm integration + component test cho đủ mọi question type và responsive layout.

### P2.4 Subject/grade resolver phải được dùng toàn hệ thống

Thay các default còn lại trong:

- `AssignmentsController.cs`
- `PracticeController.cs`
- `LearningAnalyticsService.cs`
- `ExamBlueprintService.cs`
- `StudentMasteryService.cs`
- `IntelligentExamService.cs`
- `LearningRecommendationService.cs`
- `TeacherManagementService.cs`
- mapping tương ứng ở FE.

Yêu cầu:

1. Không tự chọn Toán 12 khi thiếu subject/grade.
2. Resolver nhận context rõ ràng từ user profile, enrollment, class, request hoặc entity liên quan.
3. Trường hợp thiếu/không hợp lệ trả validation/domain error có mã rõ ràng hoặc trạng thái cần hoàn thiện hồ sơ.
4. Test độc lập lớp 10, 11, 12 và hai user khác grade để ngăn rò/fallback chéo.

### P2.5 Moderation history không được tổng hợp giả

Không gán cố định version `v1.0`, submitted time bằng created time, hoặc biến mọi draft thành `changes-requested`.

Yêu cầu:

1. Model workflow event thật: submitted, approved, rejected/changes requested, published, archived, rolled back.
2. Approval queue chỉ chứa item thực sự đã submit.
3. History lấy từ immutable workflow/audit events và revision records.
4. Các số views/rating/activeUsers chỉ xuất hiện khi có bảng/event thật; nếu chưa có thì bỏ khỏi UI/DTO, không điền số cố định.

## P3 — UI/UX và trạng thái dữ liệu

1. Sửa Question Bank không tràn ngang ở 375, 390, 430, 768, 1024 và desktop.
2. Công thức dài phải wrap/scroll trong phạm vi card, không làm rộng toàn trang.
3. Filter chuyển layout phù hợp ở tablet; modal/menu/notification không rộng hơn viewport.
4. Sửa warning KaTeX khi chuỗi tiếng Việt bị đưa vào math mode; chỉ render biểu thức toán trong delimiter phù hợp và render văn bản bằng text mode.
5. Mọi trang data-driven phải có bốn trạng thái riêng: loading, empty, error có retry, success.
6. Empty state phải nói đúng “chưa có dữ liệu”, không tự thêm card mẫu.
7. Kiểm tra keyboard, focus, label, tap target và reduced motion; không phá design token hiện tại.

## Kế hoạch commit bắt buộc

Thực hiện theo thứ tự, mỗi commit nhỏ, có test tương ứng và không trộn refactor không liên quan:

1. `fix(authz): enforce content policies and ownership`
2. `fix(content): align publication contracts and real revision rollback`
3. `fix(classroom): persist alerts and remove fabricated grades`
4. `fix(question-bank): align SQL DTOs filters and question variants`
5. `fix(subjects): remove hardcoded grade and subject fallbacks`
6. `fix(learner): gate personal data behind authenticated state`
7. `refactor(data): remove admin learner and operations runtime mocks`
8. `fix(dashboard): remove mock competition and dead leaderboard UI`
9. `fix(ui): resolve responsive overflow and math rendering warnings`
10. `test(e2e): prove SQL persistence RBAC privacy and zero-mock flows`

Nếu migration phụ thuộc lẫn nhau, có thể điều chỉnh ranh giới commit nhưng không được gom toàn bộ vào một commit khó review.

## Kiểm thử và bằng chứng bắt buộc

### Backend

- Release build toàn solution.
- Toàn bộ unit tests.
- Integration tests trên `StudyAIDb_E2E` cô lập, gồm migration từ database trống.
- Test RBAC/ownership cho admin, content admin, author, reviewer, teacher, student và anonymous.
- Test persistence bằng cách mutate → tạo DbContext/request mới → GET lại.

### Frontend

- Install bằng lockfile, lint, typecheck, unit/component tests và production build.
- E2E browser với ít nhất:
  1. guest;
  2. student A;
  3. student B khác grade;
  4. teacher;
  5. content author;
  6. admin.
- Chụp/ghi trace các màn hình dashboard, profile, achievements, learning path, assignments, question bank, classroom alerts, publications và rollback.
- Chứng minh guest không gọi API cá nhân và không thấy dữ liệu cá nhân/mock.
- Chứng minh logout/login tài khoản khác không giữ cache tài khoản cũ.

### Scan zero-mock

Chạy tối thiểu:

```bash
rg -n --glob '!**/*.test.*' --glob '!**/*.spec.*' --glob '!**/tests/**' \
  '(mock|demo|fake|sample|Math\.random|INITIAL_|Demo Admin|sub_math12|Toán học 12|localStorage)' \
  frontend/src backend/src
```

Không được chỉ báo “0 kết quả” bằng cách đổi tên symbol. Với từng kết quả còn lại, ghi rõ vì sao nó không phải runtime fake data. Static enum/config hợp lệ phải được phân biệt với dữ liệu nghiệp vụ giả.

## Definition of Done

Chỉ được tuyên bố hoàn thành khi tất cả điều kiện sau đúng:

- Không còn runtime mock/fallback demo trong admin, teacher hoặc learner flows.
- Guest không thấy và không tải dữ liệu tiến độ/cá nhân.
- Dashboard không còn thi đua/leaderboard mock, link chết hoặc XP tự tính giả.
- RBAC và ownership có test âm/dương đầy đủ.
- Publication DTO đồng nhất và rollback khôi phục revision thật.
- Alert đã resolve không quay lại sau reload/process mới.
- Mọi loại câu hỏi render từ SQL thật mà không crash.
- Không còn hardcode subject/grade mặc định trong runtime.
- BE/FE build, lint, unit, integration và E2E đều xanh.
- GitHub Actions/PR checks xanh; không được bỏ qua check đỏ hoặc chỉ báo kết quả local.
- PR mô tả migration, API contract thay đổi, danh sách mock đã xóa, bằng chứng E2E và rủi ro còn lại.

## Nội dung phản hồi cuối cùng của Antigravity

Phản hồi phải bao gồm:

1. URL PR và exact commit SHA.
2. Danh sách file/schema/API đã sửa theo từng workstream.
3. Bảng mock đã xóa và nguồn dữ liệu thật thay thế.
4. Bảng hành vi guest/authenticated trước và sau sửa.
5. Lệnh test đã chạy cùng số lượng pass/fail thực tế.
6. Link GitHub Actions checks xanh.
7. Bằng chứng SQL integration và browser E2E.
8. Mọi giới hạn còn lại; không được dùng câu “hoàn thành 100%” nếu còn TODO, skipped test, mocked runtime, check đỏ hoặc chức năng chưa được chứng minh.


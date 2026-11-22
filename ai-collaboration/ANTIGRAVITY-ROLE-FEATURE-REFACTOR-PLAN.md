# ANTIGRAVITY EXECUTION PROMPT — REFACTOR BE/FE THEO ROLE + FEATURE

> Trạng thái: READY FOR IMPLEMENTATION  
> Repository bắt buộc: `https://github.com/hthuyngan/STUDY_AI-`  
> Branch bắt buộc: `antigravity/post-l02-zero-mock-remediation`  
> PR hiện tại: `https://github.com/hthuyngan/STUDY_AI-/pull/20`  
> Commit nền tối thiểu: `0e5fdb5a652a9cacf8738d25cc6cfd45e929cebb`  
> Repository tham khảo cách tổ chức feature: `https://github.com/nguyendz2k4/DuAnTuyenDung`  
> Commit tham khảo đã audit: `19998ad`

## Progress Checklist & Tracking
- [x] **Phase 0 — Inventory và Architecture Guard** (Baseline, docs, route snapshot, architecture tests pass)
- [ ] **Phase 1 — Common Foundation** (CurrentUser, Permissions, Result/Exception model, Global Exception Middleware, UnitOfWork, AuditWriter)
- [ ] **Phase 2 — Public và Identity/Admin Users** (Auth, Health, Admin split thin controllers, Application services)
- [ ] **Phase 3 — Content/Curriculum** (Curriculum & Content controllers split, Application workflow services)
- [ ] **Phase 4 — Teacher** (Classroom, Student ownership, Assignment, Submissions, Grading, Analytics)
- [ ] **Phase 5 — Learner** (Profile, Progress, Assessment attempts, Learning events, Practice, Assignments, Dashboard)
- [ ] **Phase 6 — AI Tutor và Support** (Orchestration separation, LLM provider adapters, Support workspace)
- [ ] **Phase 7 — Cleanup & Verification** (0 DbContext in controllers, remove legacy dead code, 100% test gates pass, final docs)

## 1. Mệnh lệnh thực thi

Antigravity phải đọc toàn bộ tài liệu này trước khi sửa code. Hãy refactor toàn bộ Backend STUDY_AI theo cách tổ chức quen thuộc của `DuAnTuyenDung`: code được nhóm theo role/workspace và feature, Controller/DTO/interface/service dễ tìm cạnh nhau về mặt đường dẫn logic. Đồng thời tối ưu Frontend theo cùng feature và API Backend.

Không sao chép máy móc nhược điểm của dự án tham khảo. STUDY_AI phải tiếp tục giữ bốn project `Domain`, `Application`, `Infrastructure`, `Api`; không được gộp về một Web project. Mục tiêu là kết hợp:

- Clean dependency giữa các project.
- Feature-first giống `DuAnTuyenDung`.
- Role/workspace rõ ràng: Admin, Content, Teacher, Learner, Support, Public.
- Controller mỏng, không truy cập `StudyAIDbContext` trực tiếp.
- Không đổi API contract ngoài những thay đổi đã ghi rõ và có migration tương thích.
- Không tái tạo mock data hoặc synthetic success.

Không làm một lần bằng thao tác di chuyển cơ học khổng lồ. Thực hiện tuần tự từng phase, build và test sau mỗi phase, commit riêng từng phase.

## 2. Đồng bộ và bảo vệ working tree

Thực hiện:

```bash
git fetch origin
git checkout antigravity/post-l02-zero-mock-remediation
git pull --ff-only origin antigravity/post-l02-zero-mock-remediation
git status
git log -1 --oneline
```

Yêu cầu:

- HEAD phải chứa commit `0e5fdb5` hoặc commit mới hơn trên cùng lịch sử.
- Nếu working tree không sạch, không reset, không checkout đè và không xóa thay đổi của người dùng.
- Đọc `AGENTS.md`, solution, project reference, route FE/BE và tài liệu trong `ai-collaboration` trước khi hành động.
- Ghi inventory hiện trạng vào `docs/refactor/role-feature-baseline.md`.

## 3. Baseline bắt buộc trước refactor

Ghi lại:

- Tất cả project và dependency.
- Tất cả Controller, route, HTTP verb, request/response DTO.
- Tất cả service và DI registration.
- Tất cả entity, migration và quan hệ database.
- Tất cả FE page, hook, service đang gọi mỗi endpoint.
- Số dòng của từng Controller/service; đánh dấu file trên 300 dòng.
- Mọi chỗ Controller inject `StudyAIDbContext`.
- Mọi chỗ role/permission/ownership được kiểm tra rải rác.
- Mọi mock/localStorage/fallback production còn sót.

Chạy baseline:

```bash
dotnet build backend/StudyAI.sln -c Release
dotnet test backend/tests/StudyAI.UnitTests/StudyAI.UnitTests.csproj -c Release
cd frontend
npm run lint
npm run build
npm run test -- --run
```

Không được tiếp tục nếu baseline lỗi mà chưa ghi rõ lỗi đó là lỗi có sẵn hay lỗi môi trường.

## 4. Nguyên tắc lấy từ DuAnTuyenDung

Áp dụng các ưu điểm:

- Feature có Controller, DTO, interface và service dễ tìm theo cùng tên feature.
- Controller gọi abstraction/service thay vì tự chứa toàn bộ nghiệp vụ.
- Response/result và pagination dùng chung.
- Role/workspace thể hiện rõ trong cấu trúc thư mục.

Không áp dụng các nhược điểm:

- Không gộp toàn bộ thành một project.
- Không tạo constructor phụ rồi tự `new Service(...)`.
- Không hard-code JWT secret hoặc connection string.
- Không seed demo data trong request hoặc Controller.
- Không để service/controller 500–800 dòng.
- Không đặt DTO, EF query, file I/O, transaction và HTTP response mapping chung trong một class.
- Không tạo bản sao cùng nghiệp vụ cho từng role.

## 5. Cấu trúc Backend mục tiêu

```text
backend/src/
├── StudyAI.Domain/
│   ├── Identity/
│   ├── Curriculum/
│   ├── ContentGovernance/
│   ├── Assessments/
│   ├── Learning/
│   ├── Classrooms/
│   ├── Assignments/
│   ├── AiTutor/
│   ├── Audit/
│   └── Shared/
│
├── StudyAI.Application/
│   ├── Common/
│   │   ├── Authorization/
│   │   ├── Exceptions/
│   │   ├── Results/
│   │   ├── Pagination/
│   │   ├── Behaviors/
│   │   └── Interfaces/
│   └── Features/
│       ├── Admin/
│       │   ├── Dashboard/
│       │   ├── Users/
│       │   ├── Settings/
│       │   ├── AuditLogs/
│       │   └── SystemHealth/
│       ├── Content/
│       │   ├── Subjects/
│       │   ├── Chapters/
│       │   ├── Topics/
│       │   ├── Lessons/
│       │   ├── Videos/
│       │   ├── Questions/
│       │   ├── Assessments/
│       │   ├── ReviewQueue/
│       │   └── CurriculumImport/
│       ├── Teacher/
│       │   ├── Classrooms/
│       │   ├── Students/
│       │   ├── Assignments/
│       │   ├── Grading/
│       │   └── Analytics/
│       ├── Learner/
│       │   ├── Dashboard/
│       │   ├── Curriculum/
│       │   ├── Progress/
│       │   ├── Practice/
│       │   ├── Assessments/
│       │   ├── Assignments/
│       │   ├── AiTutor/
│       │   └── Profile/
│       ├── Support/
│       ├── Public/
│       │   ├── Auth/
│       │   └── Health/
│       └── Shared/
│           ├── CurriculumQueries/
│           └── Notifications/
│
├── StudyAI.Infrastructure/
│   ├── Persistence/
│   │   ├── Configurations/
│   │   ├── Repositories/
│   │   ├── Migrations/
│   │   └── Seeding/
│   ├── Authentication/
│   ├── Authorization/
│   ├── AI/
│   ├── VideoProviders/
│   ├── FileStorage/
│   └── DependencyInjection.cs
│
└── StudyAI.Api/
    ├── Features/
    │   ├── Admin/
    │   ├── Content/
    │   ├── Teacher/
    │   ├── Learner/
    │   ├── Support/
    │   └── Public/
    ├── Middleware/
    ├── Filters/
    ├── Contracts/
    └── Program.cs
```

### Quy tắc chia role và feature

- `Api/Features/{Role}/{Feature}` chứa Controller và HTTP contract của workspace đó.
- `Application/Features/{Role}/{Feature}` chứa use case, DTO kết quả, interface và validation.
- Nghiệp vụ dùng chung không được sao chép theo role; đặt trong `Application/Features/Shared` hoặc domain feature tương ứng.
- Domain không được có thư mục Admin/Teacher/Learner; Domain mô tả nghiệp vụ, không mô tả màn hình.
- Infrastructure không tổ chức theo role mà theo adapter kỹ thuật.

## 6. Mapping Controller hiện tại

Tách nhưng giữ nguyên route hiện hữu trong giai đoạn tương thích:

### AdminController

Tách thành:

- `AdminDashboardController`
- `AdminUsersController`
- `AdminSettingsController`
- `AdminAuditLogsController`
- `AdminAnnouncementsController`
- `AdminSystemController`

### ContentController

Tách thành:

- `ContentSubjectsController`
- `ContentChaptersController`
- `ContentTopicsController`
- `ContentLessonsController`
- `ContentVideosController`
- `ContentQuestionsController`
- `ContentAssessmentsController`
- `ContentReviewController`
- `ContentPublicationsController`

### Teacher/Classroom/Assignment

Tách theo quyền sở hữu:

- `TeacherClassroomsController`
- `TeacherStudentsController`
- `TeacherAssignmentsController`
- `TeacherSubmissionsController`
- `TeacherGradingController`
- `TeacherAnalyticsController`
- `LearnerAssignmentsController` cho phía người học.

### Learner

- `LearnerCurriculumController`
- `LearnerProgressController`
- `LearnerAssessmentAttemptsController`
- `LearnerLearningEventsController`
- `LearnerProfileController`
- `LearnerAiTutorController`

### Public

- `AuthController`
- `HealthController`

Không đổi URL chỉ vì đổi thư mục. Nếu muốn chuẩn hóa URL, phải tạo compatibility route, cập nhật FE đồng bộ và có contract test.

## 7. Quy tắc gọn code Backend

- Controller không được inject `StudyAIDbContext`.
- Controller mục tiêu 50–150 dòng; tối đa 250 dòng có lý do.
- Service/handler tối đa khoảng 300 dòng; lớn hơn phải tách query/command/workflow.
- Một file chỉ nên có một public class chính.
- Không tạo `GenericRepository<TEntity>` che toàn bộ EF rồi buộc nghiệp vụ dùng API chung vô nghĩa.
- Tạo repository/read store theo aggregate quan trọng: Identity, Curriculum, Classroom, Assignment, Learning, Audit.
- Query phức tạp có thể dùng read service chuyên biệt.
- Transaction nằm trong Application workflow thông qua abstraction, implementation ở Infrastructure.
- Audit log dùng `IAuditWriter`, không lặp `new StaffAuditLog` trong mọi Controller.
- User hiện tại dùng `ICurrentUser`; không tự đọc claim lặp lại.
- Thời gian dùng `IClock`; không rải `DateTimeOffset.UtcNow` trong nghiệp vụ.
- ID dùng `IIdGenerator` nếu cần kiểm thử ổn định.
- Validation và status transition nằm trong Application/Domain.
- Controller chỉ map HTTP request -> use case -> HTTP response.

## 8. Common building blocks

Tạo hoặc chuẩn hóa:

```text
Application/Common/
├── Authorization/
│   ├── Permissions.cs
│   ├── RolePermissionMap.cs
│   └── ICurrentUser.cs
├── Exceptions/
│   ├── ValidationException.cs
│   ├── NotFoundException.cs
│   ├── ForbiddenException.cs
│   └── ConflictException.cs
├── Results/
│   ├── Result.cs
│   └── ResultOfT.cs
├── Pagination/
│   ├── PageRequest.cs
│   └── PagedResult.cs
└── Interfaces/
    ├── IAuditWriter.cs
    ├── IUnitOfWork.cs
    ├── IClock.cs
    └── IIdGenerator.cs
```

API phải có global exception handler chuyển lỗi thống nhất:

- Validation -> 400
- Unauthorized -> 401
- Forbidden -> 403
- Not found -> 404
- Conflict -> 409
- Unexpected -> 500 với correlation ID, không lộ stack trace production.

Không bắt buộc dùng MediatR. Nếu thêm dependency chỉ để chuyển một method call thì không thêm. Ưu tiên service/use-case rõ ràng giống cách người dùng đã quen trong `DuAnTuyenDung`.

## 9. Permission và ownership

Thay role check rải rác bằng permission policy:

```text
users.read
users.write
users.change_role
settings.manage
audit.read
content.read
content.create
content.update
content.submit
content.review
content.publish
content.rollback
content.archive
classrooms.read
classrooms.manage
assignments.manage
submissions.grade
learning.read_own
learning.update_own
ai_tutor.use
```

Yêu cầu:

- Teacher phải sở hữu lớp hoặc được phân công mới được thao tác.
- Learner chỉ được xem/sửa dữ liệu của chính mình.
- Content author không tự duyệt nội dung của mình nếu four-eyes rule áp dụng.
- Admin có quyền hệ thống nhưng mọi mutation phải có audit.
- Support mặc định read-only, không được sửa điểm hoặc xuất bản nội dung.

## 10. Domain và EF Core

- Domain không tham chiếu EF Core, ASP.NET hoặc Infrastructure.
- Chuẩn hóa status string quan trọng thành enum/value object hoặc central constants có validation.
- Đưa transition bài học/câu hỏi vào Domain/Application, không cho Controller gán status tùy ý.
- Tách `StudyAIDbContext.OnModelCreating` thành `IEntityTypeConfiguration<TEntity>` trong `Infrastructure/Persistence/Configurations`.
- Migration tiếp tục nằm trong Infrastructure.
- Không sửa migration cũ đã áp dụng; tạo migration mới khi schema thay đổi.
- Không thay đổi schema chỉ để phục vụ việc di chuyển thư mục.

## 11. AI Tutor

- Chuyển orchestration nghiệp vụ AI Tutor từ Infrastructure sang `Application/Features/Learner/AiTutor`.
- Infrastructure chỉ giữ adapter/provider như OpenAI và persistence implementation.
- Application chỉ phụ thuộc `ILlmProvider`, không kiểm tra concrete type bằng `is OpenAiLlmProvider` hoặc `is FakeLlmProvider`.
- Không bật fake provider ở production.
- Không tạo câu trả lời AI giả khi provider lỗi.

## 12. Cấu trúc Frontend mục tiêu theo Backend

```text
frontend/src/
├── app/
│   ├── router/
│   ├── providers/
│   └── auth/
├── shared/
│   ├── api/
│   ├── components/
│   ├── hooks/
│   ├── types/
│   ├── utils/
│   └── validation/
└── features/
    ├── admin/
    │   ├── dashboard/
    │   ├── users/
    │   ├── settings/
    │   ├── audit-logs/
    │   └── system/
    ├── content/
    │   ├── subjects/
    │   ├── chapters/
    │   ├── topics/
    │   ├── lessons/
    │   ├── videos/
    │   ├── questions/
    │   ├── assessments/
    │   ├── review-queue/
    │   └── curriculum-import/
    ├── teacher/
    │   ├── classrooms/
    │   ├── students/
    │   ├── assignments/
    │   ├── grading/
    │   └── analytics/
    ├── learner/
    │   ├── dashboard/
    │   ├── curriculum/
    │   ├── lesson/
    │   ├── progress/
    │   ├── practice/
    │   ├── assignments/
    │   ├── ai-tutor/
    │   └── profile/
    ├── support/
    └── public/
        └── auth/
```

Mỗi FE feature nên có cấu trúc tối thiểu cần thiết, không tạo thư mục rỗng:

```text
features/content/lessons/
├── api/
│   └── lessons.api.ts
├── components/
├── hooks/
│   └── useLessons.ts
├── pages/
├── types.ts
└── index.ts
```

Quy tắc FE:

- API client dùng chung đặt ở `shared/api`.
- Endpoint theo feature, không giữ một service vài nghìn dòng.
- Server state không copy sang nhiều local state nếu không cần.
- Không dùng localStorage thay Backend cho dữ liệu chính thức.
- Không fallback mock khi API lỗi.
- Guest không nhìn thấy dữ liệu cá nhân giả.
- Role route guard và navigation lấy từ một role/permission map duy nhất.
- Shared UI không sao chép theo workspace.
- Giữ route người dùng hiện tại hoặc thêm redirect tương thích.
- Tách dần, không đổi toàn bộ import trong một commit không kiểm soát.

## 13. Đồng bộ contract BE/FE

Trước khi di chuyển mỗi feature:

1. Chụp contract endpoint hiện tại.
2. Viết hoặc giữ contract test.
3. Refactor BE nhưng giữ JSON và status code.
4. Chuyển FE service/hook/page sang feature mới.
5. Chạy test feature.
6. Xóa adapter cũ chỉ khi không còn import.

Tạo `frontend/src/shared/api/generated` chỉ khi dự án có OpenAPI generation ổn định. Không tự sinh code rồi commit hàng nghìn dòng không kiểm soát.

## 14. Thứ tự triển khai bắt buộc

### Phase 0 — Inventory và architecture guard

- Baseline report.
- Architecture tests kiểm tra dependency project.
- Test cấm Controller mới inject `StudyAIDbContext`.
- Ghi route/contract snapshot.

### Phase 1 — Common foundation

- Current user.
- Permission policies.
- Result/exception model.
- Exception middleware.
- Audit writer.
- DI extension theo project/feature.

### Phase 2 — Public và Identity/Admin Users

- Auth.
- Admin Users.
- Dashboard read model.
- FE auth/admin users tương ứng.

### Phase 3 — Content/Curriculum

- Subjects.
- Chapters.
- Topics.
- Lessons.
- Videos.
- Questions.
- Assessments.
- Review/publish/rollback.
- Curriculum import.
- FE Content Workspace và learner curriculum đồng bộ.

### Phase 4 — Teacher

- Classroom.
- Student ownership.
- Assignment.
- Submission/grading.
- Teacher analytics.
- FE Teacher Workspace.

### Phase 5 — Learner

- Profile.
- Progress.
- Assessment attempts.
- Learning events.
- Practice.
- Assignments.
- Dashboard.
- FE Learner Workspace.

### Phase 6 — AI Tutor và Support

- Tách orchestration.
- Provider adapter.
- Ownership conversation.
- Support permissions.
- FE tương ứng.

### Phase 7 — Cleanup

- Xóa controller/service/DTO cũ không còn tham chiếu.
- Xóa adapter compatibility chỉ khi contract test và FE đã chuyển hết.
- Quét mock/demo/TODO/dead code.
- Cập nhật tài liệu kiến trúc.

## 15. Database safety

- Chỉ dùng `StudyAIDb_E2E` hoặc database disposable được cho phép.
- Tuyệt đối không migrate/seed/import/test trên `StudyAIDb`.
- Không tắt hoặc làm yếu `DatabaseSafetyGuard`.
- `.env.example`, appsettings Development phải trỏ E2E.
- Không commit `.env`, secret, JWT key hoặc credential.
- Việc refactor thư mục không được tạo migration rỗng.
- Nếu migration thực sự cần thiết, chạy dry-run/script review và test trên E2E.

## 16. Test bắt buộc

Sau mỗi phase:

```bash
dotnet build backend/StudyAI.sln -c Release
dotnet test backend/tests/StudyAI.UnitTests/StudyAI.UnitTests.csproj -c Release
cd frontend
npm run lint
npm run build
npm run test -- --run
```

Bổ sung:

- Architecture dependency tests.
- Controller contract tests.
- Permission tests theo role.
- Ownership tests Teacher/Learner.
- Four-eyes workflow tests.
- Audit tests.
- API error phải fail closed, không mock fallback.
- FE role guard, navigation và API mapping tests.
- E2E smoke cho mỗi workspace.

Không được sửa test chỉ để hợp thức hóa hành vi sai. Số test pass không được thấp hơn baseline nếu không có giải thích và test thay thế tương đương.

## 17. Git và GitHub

- Không sửa trực tiếp `main`.
- Tiếp tục trên `antigravity/post-l02-zero-mock-remediation` để cập nhật PR #20, trừ khi chủ repository yêu cầu branch mới.
- Không force push.
- Mỗi phase một commit có phạm vi rõ ràng.
- Trước commit: `git diff --check`, kiểm tra secret và generated artifacts.
- Push thường xuyên để người dùng review tiến độ.
- Cập nhật checklist trong chính file này bằng commit, không chỉ báo trong chat.

Commit gợi ý:

```text
refactor(architecture): add role-feature foundations
refactor(admin): split user and operations features
refactor(content): move curriculum workflows to application
refactor(teacher): isolate classroom and assignment features
refactor(learner): align learning APIs and frontend modules
refactor(ai): separate orchestration from providers
test(architecture): enforce project and controller boundaries
```

## 18. Deliverables

Antigravity phải tạo và cập nhật:

- `docs/refactor/role-feature-baseline.md`
- `docs/refactor/route-contract-map.md`
- `docs/refactor/architecture-decisions.md`
- `docs/refactor/migration-progress.md`
- `docs/refactor/final-verification.md`

Báo cáo cuối phải có:

- Branch và commit SHA từng phase.
- PR URL.
- Cây thư mục trước/sau.
- Danh sách Controller cũ -> feature mới.
- Danh sách FE service/page cũ -> feature mới.
- Route thay đổi hoặc xác nhận không đổi.
- Số file trên 300 dòng trước/sau.
- Số Controller còn inject DbContext; mục tiêu cuối là 0.
- Kết quả BE build/test.
- Kết quả FE lint/build/test.
- Kết quả architecture/contract/E2E tests.
- Database thực tế đã dùng, chỉ nêu tên database và không lộ secret.
- Vấn đề còn lại và lý do.

## 19. Definition of Done

Không báo hoàn thành nếu còn một trong các điều sau:

- Controller production còn inject trực tiếp `StudyAIDbContext` mà không có ngoại lệ được ghi ADR.
- `ContentController` hoặc `AdminController` nguyên khối vẫn tồn tại.
- Nghiệp vụ giống nhau bị sao chép theo nhiều role.
- FE vẫn có service tổng hợp quá lớn và mock fallback production.
- Route/response bị đổi nhưng không cập nhật FE và contract test.
- Permission/ownership chỉ kiểm tra ở giao diện.
- Fake AI hoặc mock curriculum có thể chạy trong production.
- Chưa chạy test đầy đủ.
- Chưa push commit lên GitHub.
- Chưa cập nhật các tài liệu deliverable.

Ưu tiên cao nhất là giữ hệ thống hoạt động trong suốt quá trình refactor. Cấu trúc mới phải quen thuộc theo cách feature/role của `DuAnTuyenDung`, nhưng không được đánh đổi ranh giới layer, an toàn database, phân quyền, test và dữ liệu thật của STUDY_AI.

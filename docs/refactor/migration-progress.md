# Migration Progress — Role + Feature Refactor

## Tiến Độ Từng Phase

- [x] **Phase 0: Inventory và Architecture Guard**
  - Baseline report: `docs/refactor/role-feature-baseline.md`
  - Route contract map: `docs/refactor/route-contract-map.md`
  - Architecture decisions: `docs/refactor/architecture-decisions.md`
  - Architecture tests: `backend/tests/StudyAI.UnitTests/ArchitectureTests.cs`
  - Baseline test gates: All passed.
- [x] **Phase 1: Common Foundation**
  - Application Common: Authorization (Permissions, RolePermissionMap, ICurrentUser), Exceptions (ValidationException, NotFoundException, ForbiddenException, ConflictException), Results (Result, Result<T>), Pagination (PageRequest, PagedResult), Interfaces (IAuditWriter, IUnitOfWork, IClock, IIdGenerator).
  - Infrastructure Common: CurrentUser, SystemClock, IdGenerator, AuditWriter, UnitOfWork.
  - Api: Global Exception Handler Middleware (RFC 7807 problem details / uniform error formatting).
  - Test gates: 20/20 new CommonFoundationTests pass, 258/258 total Unit Tests pass, 0 oxlint warnings, Vite build success.
- [ ] **Phase 2: Public và Identity/Admin Users**
  - Public Features: Auth, Health.
  - Admin Features: Users, Dashboard read model, Settings, AuditLogs, Announcements, System.
  - Thin Controllers & Application Services.
- [ ] **Phase 3: Content / Curriculum**
  - Split `ContentController` & `CurriculumController` thành các controller chuyên biệt.
  - Content Application Services.
- [ ] **Phase 4: Teacher**
  - Split Teacher / Classroom / Assignment controllers.
  - Teacher Application Services & Ownership enforcement.
- [ ] **Phase 5: Learner**
  - Split Learner Profile, Progress, Practice, Assessment, Assignments, Dashboard.
  - Learner Application Services.
- [ ] **Phase 6: AI Tutor và Support**
  - Tách Orchestration & LLM provider adapters.
  - Support workspace permissions.
- [ ] **Phase 7: Cleanup & Final Verification**
  - Loại bỏ hoàn toàn DbContext injection trong controllers (Mục tiêu: 0).
  - Toàn bộ test gates pass (Unit, Integration, Lint, Build, Vitest, E2E).

# Migration Progress — Role + Feature Refactor

## Tiến Độ Từng Phase

- [x] **Phase 0: Inventory và Architecture Guard**
  - Baseline report: `docs/refactor/role-feature-baseline.md`
  - Route contract map: `docs/refactor/route-contract-map.md`
  - Architecture decisions: `docs/refactor/architecture-decisions.md`
  - Architecture tests: `backend/tests/StudyAI.UnitTests/ArchitectureTests.cs`
  - Baseline test gates: All passed.
- [ ] **Phase 1: Common Foundation**
  - Application Common: Authorization, Exceptions, Results, Pagination, Interfaces.
  - Infrastructure Common: CurrentUser, Clock, AuditWriter, UnitOfWork.
  - Api: Global Exception Handler Middleware.
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

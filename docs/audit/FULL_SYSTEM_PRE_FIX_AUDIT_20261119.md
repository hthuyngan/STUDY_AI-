# STUDY_AI / AItutor — Pre-fix FE/BE Audit (2026-11-19)

**Repository:** `hthuyngan/STUDY_AI-`  
**Code baseline:** `feature/ai-core-v1` @ `9b610795a5c2f32a52c20f79f10ec63e43ac6c6d`  
**Comparison:** `main` (older; do NOT implement fixes on `main` as if it were latest).  
**Scope:** Static review of the feature-branch Git tree, route registries, FE service/hook and selected page implementations, 19 .NET API controllers (route/authorization indexing plus detailed reading of high-risk controllers), selected DTO/contracts, existing audit notes, and GitHub Actions job status. This is **not** an exhaustive line-by-line audit of all 3,952 tracked blobs and does not certify E2E runtime correctness.
**Data protection:** `StudyAIDb` MUST NOT be modified, migrated, reset, seeded or restored. Use disposable `StudyAIDb_E2E` or isolated DB only.

## Evidence and baseline

- Feature branch Git tree: **3,952 tracked blobs**, including **582 frontend/src blobs** and **1,356 backend/src blobs** (migrations/generated files included).
- 19 .NET API controllers and 54 frontend service-path files (including tests) inventoried. 5 route files checked: admin, teacher, learner, content, support.
- CI run [44490428350](https://github.com/hthuyngan/STUDY_AI-/actions/runs/44490428350) on `9b610795`: frontend lint/tests/build PASS; .NET 10 build, unit and integration tests against **ephemeral SQL Server** PASS. This does not prove all UI business operations work.
- Earlier issue `P20-001-FIX` in `ai-collaboration/TASK.md` corrected classroom authenticated fallback on the feature branch; `main` still retains the older implementation. Avoid reintroducing `main`'s version when integrating.
- Existing `docs/audit/ROUND04_REVIEW.md` says no pending Round04 issues, but explicitly lists assessments as localStorage-only and learning reports as synthetic. `README.md` and earlier documents on `main` describe obsolete FastAPI architecture; feature branch has been updated.

## Severity and status

- **P0** = false success affecting authorization/data correctness, dangerous content publication, lost/misrepresented academic records.
- **P1** = broken/missing core workflow or incorrect read/write contract.
- **P2** = noncritical mock analytics, placeholder content, fallback/cross-device persistence gaps.
- `CONFIRMED_STATIC`: directly demonstrated by source logic, not a browser E2E reproduction.
- `POLICY_TO_CONFIRM`: actual rule must be agreed before modifying.
- `UNTESTED`: implementation exists but real functionality was not independently executed.

## Finding ledger

| ID | Severity | Evidence / affected implementation | Source-confirmed defect or gap | Fix and verification target |
|---|---|---|---|---|
| AIT-001 | P0 | `frontend/src/services/operations.service.ts` ~580–635 | `publishContent` permits `pending` as well as `approved`, writes local approval/publication state, swallows `educationService.changeLessonStatus` failure, then logs success. | Enforce documented publishing workflow, use backend content governance API/DB transaction and return errors; negative test pending→publish and failed server write. |
| AIT-002 | P0 | `frontend/src/services/admin.service.ts` ~409–502 | `updateUserRole`, `updateUserStatus`, `revokeUserSessions` catch API failures but may mutate mock/local state and return true; can falsely report security-administration success. This does **not** mean server RBAC itself was bypassed. | Fail closed for authenticated users; API response is source of truth; tests 401/403/500/network and refresh. |
| AIT-003 | P0 | `frontend/src/services/assessment.service.ts` ~353–495 | Answer check catches server failures then grades from local `correctOptionId`; final attempt is marked completed locally and POST persist failures are ignored. Could appear completed without canonical server record. | Define offline draft vs verified score; never claim verified/persisted result when server check/save failed; add restart/retry/idempotency and negative tests. |
| AIT-004 | P1 | `backend/src/StudyAI.Api/Controllers/AssignmentsController.cs` ~265–305 | Submit rejects only `closed`/`archived`; `draft` and other invalid states are not expressly rejected. Admin is also permitted to submit under `[Authorize(Roles="learner,admin")]`. | Specify accepted submission state(s) and student role policy; enforce server-side; add draft, unexpected state, admin, due-date, cross-class cases. |
| AIT-005 | P1 / POLICY_TO_CONFIRM | `AssignmentsController.cs` ~469–496 | Grading is blocked when assignment is `closed`, which could prevent post-deadline marking. | Agree whether closed means stop submissions only vs no grading; test resulting lifecycle. |
| AIT-006 | P1 | `AssignmentsController.cs` ~209–241 | Update allows arbitrary `Status`, `DueDate` and `MaxScore` changes even after student submissions/grading; no visible immutable scoring policy. | Validate state transitions and post-publication editing; protect historical scores and audits. |
| AIT-007 | P1 | `frontend/src/services/education.service.ts` ~968–1050 | Content assessment CRUD (`getAssessments`, `createAssessment`, `updateAssessment`) lives in browser storage; no corresponding production persistence in this pathway. | Design server assessment entity/API or integrate existing verified content assessment endpoints; contract + SQL persistence tests. |
| AIT-008 | P1 | `frontend/src/services/content.service.ts` ~54–111 | Lesson editor returns fabricated pedagogical text and stores full editor content only in `mockLessonContents` process memory, while `saveLessonEditor` forwards only `title`/`status` to `educationService.updateLesson`. Full content can disappear on reload. | Persist structured lesson editor fields to real backend; reload/edit/version tests; no seeded text presented as genuine user content. |
| AIT-009 | P1 | `frontend/src/services/support.service.ts` entire service | Support tickets, messages, profiles and dashboard derived from `INITIAL_MOCK_*`/localStorage, not a real server workflow. | Either implement secured ticket API, staff roles, messages, ownership, attachments/audit or prominently restrict to explicit demo; no fake production success. |
| AIT-010 | P1 | `frontend/src/services/classroom.service.ts` ~1010–1060 | `getSubmissions()` uses local storage when authenticated but `assignmentId` is omitted, unlike assignment-specific API fetch; grading without assignment context may fail or use local data. | Provide authenticated aggregate submission endpoint or intentionally compose per-assignment server calls, and fail closed on absence of context. |
| AIT-011 | P1 | `classroom.service.ts` ~1085–1148 | `getAllGrades()` combines real grades with **synthetic assessment grades** for every student; some max scores and passing logic are hard-coded to 10/5. | Use canonical attempts/scores only; separate demo/test fixtures; test percentages when assignment maxScore != 10. |
| AIT-012 | P1 | `classroom.service.ts` ~950–1013 | `deleteAssignment()` only removes from localStorage; no authenticated API call, unlike create/update. | Implement backend delete/archive with ownership/submission safeguards or hide unsupported action; test refresh persistence. |
| AIT-013 | P1 | `frontend/src/services/quiz.service.ts` entire file | Quiz detail, answer evaluation, latest result use `mockQuizzes` / `mockDefaultQuizResult`, including fallback to unrelated first quiz for unknown IDs. | Connect published question/session service and persisted attempt result, return 404 on unknown quiz. |
| AIT-014 | P1 | `frontend/src/services/admin.service.ts` ~206–315 | Admin users list, pagination, detail swallow authenticated API errors and return mock users. | Propagate backend errors, show retry/permission states, preserve explicit offline demo only. |
| AIT-015 | P1 | `admin.service.ts` ~522–535 | Backend user delete may succeed, but method returns false if deleted user is not in the local `mockUsers` array. | Return backend API outcome regardless of local cache; invalidate list and test no-cache success. |
| AIT-016 | P1 | `frontend/src/services/learningAnalytics.service.ts` ~205–310 | Analytics request failures return fabricated empty dataset, empty risks or local report rather than an explicit authenticated error. | Surface failure vs legitimate zero observations, allow explicitly labeled offline report. |
| AIT-017 | P1 | `frontend/src/services/education.service.ts` ~1090–1140 | Teacher API list injects fake phone, fixed assigned class, 35 pupils, 5.0 rating, fixed qualifications/experience; catches errors and falls back to demo storage. | Use nullable typed data and true server information, no fabricated teacher staffing details. |
| AIT-018 | P1 | `frontend/src/services/supporting.service.ts` ~1–91 | Exercises, library, achievements and profile are entirely backed by mock datasets; user settings only localStorage. | Integrate domain API or clearly mark as demo-only and remove ungrounded claims. |
| AIT-019 | P2 | `frontend/src/pages/Achievements/AchievementsPage.tsx` ~50–86 | `profile?.streakDays || 12`, `totalXP || 2450`, `completedLessons || 68` display invented positive numbers when real value is **0**. | Use `??` and correct loading/empty states; test actual zero. |
| AIT-020 | P2 | `frontend/src/pages/Library/LibraryPage.tsx` ~20–42 | Bookmark button writes only component-local `savedOverrides`, while “Saved” filter uses underlying static `item.isSaved` in service. Not persisted or consistently reflected across filters. | Persist bookmark per authenticated user and derive filters from same store. |
| AIT-021 | P2 | `frontend/src/services/dashboard.service.ts` ~54–137 | Server stats, local learning snapshot and static `mockDashboardData` are merged; API errors silently become a potentially convincing dashboard. | Distinguish server sync state, offline derived metrics and demo decorations; never imply server success on failure. |
| AIT-022 | P2 | `frontend/src/services/teacher.service.ts` ~45–60 | Missing student academic detail returns a generic mock template with requested student ID. | Return 404/null or explicit demo, not fabricated academic record. |
| AIT-023 | P2 | `frontend/src/services/learningPath.service.ts`, `smartReview.service.ts`, `studyNotes.service.ts` | Learning path still derives mock subject metadata; review and study notes are primarily stored client-side. | Check intended offline-first boundaries and implement account sync where promised; verify cross-device session. |
| AIT-024 | P2 | `frontend/src/services/admin.service.ts` ~143–182 | Real admin dashboard response is combined with invented ticket count, completed lessons, latency/version/environment/health values. | Use canonical server metrics, unknown-state UI and actual health checks. |
| AIT-025 | P2 | `frontend/src/pages/Teacher/TeacherDashboardPage.tsx` ~25–48 | Data-fetch errors caught, loading set false, no error state set; dashboard can show all-zero values indistinguishable from valid empty data. | Add error + retry and distinguish 401/403/500. |
| AIT-026 | P2 / POLICY_TO_CONFIRM | `frontend/src/services/operations.service.ts`, `support.service.ts` | Some admin/content/support workflows are intentionally labeled Demo. They are **not** proven to be production-ready simply because their page routes render. | Decide scope explicitly: implement API vs mark unavailable/demo; list exceptions in functionality matrix. |
| AIT-027 | P2 | `main/README.md` vs feature branch `README.md`; `ai-collaboration/STATUS.md` | Default branch docs reference historical FastAPI, while feature branch follows .NET10 + SQL Server. Prior audit claims “no pending issues” while noting mock-only features. | Reconcile version-specific documentation and audit status, never merge old docs back over new. |

## Functionality inventory / status (before E2E)

| Functional group | Implementation evidence | Status |
|---|---|---|
| Auth/JWT refresh/RBAC | .NET AuthController, middleware, FE AuthProvider; CI auth tests | IMPLEMENTED; additional security edge-case E2E required |
| Admin users/roles/sessions | AdminController API; admin.service UI | BROKEN/error-handling and cache divergence in authenticated path |
| Admin operating settings/audit/approvals | adminOperations.service calls API for operations; operations.service still local-only for several workflows | MIXED_REAL_AND_DEMO |
| Content subjects/chapters/lessons/question bank | ContentController + services; published content API; Round04 video governance | IMPLEMENTED but needs role/workflow/persistence E2E |
| Content assessments / full lesson editor | education.service + content.service | MOCK_OR_BROWSER_ONLY in identified path |
| Classroom/enrollment/assignments | ClassroomsController, AssignmentsController, classroom.service | IMPLEMENTED WITH P1 LIFECYCLE/CONTRACT GAPS |
| Submissions/grading/marks | assignment controller & frontend services | IMPLEMENTED WITH P1 DATA INTEGRITY GAPS |
| Student practice engine | PracticeController, practice.service real session endpoints | IMPLEMENTED, needs real browser E2E verification |
| Legacy quiz | quiz.service | MOCK_ONLY |
| Dashboard, analytics, recommendations | Real analytics endpoints, mixed frontend demo fallbacks | MIXED / verification needed |
| AI tutor + admin AI | AiChatController/AiAdminController, FE aiTutorService | IMPLEMENTED; live provider smoke test and permissions must be verified |
| Support tickets | support.service | MOCK_ONLY |
| Achievements/library/profile/exercises | supporting.service | MOCK_ONLY / local-only |
| Notes and spaced repetition | local-first services | CLIENT_PERSISTED; account-sync not proven |

## Dedicated round plan (fix only after review)

1. **R0 — Snapshot / safety / contracts:** lock baseline, create deterministic disposable SQL Server DB and seed accounts; generate route→component→service→API→DTO→table matrix. Preserve `StudyAIDb`.
2. **R1 — Integrity & authentication:** fix AIT-001/002/003/004/006/014, enforce API failure propagation, design assignment lifecycle, add RBAC negative tests. Regression test BEFORE changing behavior.
3. **R2 — Core workflow completeness:** fix lesson editor and assessments, support only if in graduation scope, quiz result, submissions and grade consistency, delete/archive operations.
4. **R3 — Truthful analytics/personalization:** remove synthetic grade/identity/achievement metrics, unify dashboard and learning analytics, configure offline-first explicitly.
5. **R4 — E2E & acceptance:** run frontend lint/build/Vitest and .NET build/unit/integration on disposable SQL Server; Playwright flows per role with login, cross-account isolation, refresh, offline failure, invalid state transitions and persistence. Record actual pass/fail and screenshots.
6. **R5 — Documentation / PR:** label each row VERIFIED only with test evidence; push small PRs into `feature/ai-core-v1`, never merge or modify `main` without explicit approval.

## Critical tests to add

- Admin role/status/session revoke API 500/403 must never mutate client and must report error; after backend success, the response is considered successful even if no local mock copy exists.
- Content cannot publish pending/rejected items unless the **real server** workflow explicitly permits it; simulate failed DB write and verify no false-success event.
- Lesson editor multi-section persistence across reload/new browser.
- Practice/assessment wrong answer + API outage + retry; verified score must originate server; no achievement/progress mark on failed save.
- Learner cannot submit `draft`, `closed`, expired or non-enrolled assignment; test admin submission policy.
- Teacher cannot retroactively change maxScore while graded records exist unless versioned; closed assignments grading policy tested.
- No mock grades in a real teacher grade book, especially with maxScore not equal to 10.
- Unknown quiz ID returns not-found, not first mock.
- Authenticated support tickets and records are server-stored or clearly marked Demo.
- Zero streak/XP/lessons renders literal zero, not fabricated positives.
- Critical operations survive reload/new device, appear only for authorized account.
- CI/E2E verify active branch commit SHA and never run tests against `StudyAIDb`.

## Important review limitations

This is a *pre-fix static risk assessment*, not proof that all 3,952 tracked blobs are free from other errors or that all routes were exercised in a browser. Automated CI at baseline passed, but dedicated negative/E2E tests are needed to validate listed behaviors and discover latent bugs. Confirm product policy for “closed” grading, offline-first persistence and demo-only staff workflows before changing semantics. **No application code was modified for this audit.**

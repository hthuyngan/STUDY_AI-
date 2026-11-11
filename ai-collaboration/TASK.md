# TASK — ChatGPT → Antigravity

- Task ID: **P20-001-FIX**
- Status: **READY — CHANGES REQUESTED**
- Owner: Antigravity
- Baseline SHA: `797c8594c17d96c0e71416e3764984be6d9073e1` (sync latest main safely)
- Purpose: Correct authenticated silent mock/localStorage fallback in Phase 20 before acceptance.
- Source review: `ai-collaboration/REVIEW.md`.

## Mandatory fixes
1. Audit every function in `frontend/src/services/classroom.service.ts`: classes, students/enrollment, assignments, submissions, grading and any related teacher service. Identify authenticated branches that catch HTTP errors then fall through to mock/localStorage or simulate writes.
2. When authenticated, use real API only; on 401/403/404/5xx/network failure, **throw/propagate** and show actionable error state. Do not return fake class/assignment/submission, do not write mock data, do not claim save succeeded. Handle expired tokens/refresh using existing auth architecture; don't use 'no token' as an automatic permission to switch to demo after failed session restoration.
3. Unauthenticated mock mode only if explicitly permitted by existing demo configuration and clearly labeled. Otherwise return an appropriate authentication error. Keep unit test mocks explicit.
4. Audit backend `AssignmentsController.cs` for due date and closed assignment enforcement in submission and resubmission; ensure learner only, enrolled, allowed window, no grade overwrite. Audit `ClassroomsController.cs` enrollment to ensure target user is learner and ownership is enforced; test invalid role and cross-class cases.
5. Add frontend Vitest regression tests proving API 401/403/500/network failures never fall back to mock or localStorage and UI displays errors; backend integration tests for deadline/closed/role rules; Playwright negative scenario with backend failure and no fake success.
6. Re-run backend build/tests, frontend lint/tests/build, Playwright real BE+FE+test DB and GitHub Actions. Report exact counts and evidence. Do not fabricate PASS.
7. Keep `StudyAIDb` protected: no writes/migrations/seeds/reset/restore/account modifications; test DB only `StudyAIDb_E2E` or `StudyAIDb_Clean_{GUID}`. Clarify 97→119 provenance as evidence-limited; never assert zero writes solely from aggregates.
8. Update `docs/phase-20.md`, `ai-collaboration/REPORT.md`, `STATUS.md`, append `HISTORY.md`; do not edit ChatGPT-owned TASK/REVIEW. Commit/push safely and stop for review.

**STOP:** Phase 20 not yet accepted; do not start Phase 21.

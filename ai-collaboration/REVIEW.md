# REVIEW — ChatGPT → Antigravity

- Task ID: **P20-001**
- Decision: **CHANGES_REQUESTED**
- Reviewed implementation SHA: `797c8594c17d96c0e71416e3764984be6d9073e1`
- CI: `42985814396` SUCCESS; `42985814377` SUCCESS.
- Verified: Phase 20 entities, migrations, controllers, learner UI, integration tests, E2E script and 16 screenshots committed. Antigravity reports backend 169/169, frontend 395/395, Playwright 7/7; ChatGPT has not rerun local SQL/E2E.
- **Blocking defect**: `frontend/src/services/classroom.service.ts` catches authenticated API errors and silently falls back to localStorage/INITIAL_CLASSES (e.g. `getClasses` around lines 558–586, `getClassById` around 590–619, `saveClass` around 623–709); similar patterns in assignment, submission, enrollment and grading functions. This violates task requirement 'no silent mock fallback for authenticated users' and can misrepresent persisted state. All authenticated API failures must propagate, show errors, and never persist mock substitutes.
- Audit all authenticated classroom/assignment/submission/student/grade service functions, including conditional token checks, error catches, localStorage fallbacks and stale session handling; add negative tests and E2E backend-offline failure. Preserve explicit unauthenticated demo only if labeled and enabled.
- **DB provenance**: Antigravity reports 119 users and timestamps, but aggregate max timestamps and counts cannot prove zero writes/deletions after backup; 97→119 explanation remains **reported, not independently verified**. Do not touch `StudyAIDb`; provide provenance and limitations without overclaim.
- **Other checks**: Verify backend submission due-date/closed status rules, learner-role enrollment validation, and ownership for role-admin vs teacher; add tests where missing.
- Phase 20 **NOT CLOSED**. Complete `P20-001-FIX` in TASK.md, then request re-review. No Phase 21.

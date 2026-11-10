# TASK — ChatGPT → Antigravity

- Task ID: **P20-000**
- Title: **Authentication/API Recovery & Header Navigation Cleanup — Phase 20 prerequisite**
- Status: READY
- Owner: Antigravity
- Baseline SHA: `50b11272eb6b0bbe133faf726ea6c52149f38eee` (fetch latest `origin/main` before starting)
- Priority: BLOCKER — fix before implementing Phase 20 entities or endpoints.
- User authorization: explicit request to fix broken login/APIs and clean up navigation.

## Observed issue
User screenshot shows simultaneously: `Trang quản trị`, role dropdown `Quản trị`, `Đăng nhập`, `Đăng ký`. User reports login/API actions fail despite BE and FE running. **Do not assume cause from screenshot**; reproduce and gather evidence.

## A. Diagnose end-to-end first
1. Sync safely: inspect git status, fetch, pull --ff-only; do not overwrite local work.
2. Identify actual FE/BE URLs, API base URL, environment variables, proxy, CORS, HTTPS, cookies/SameSite, JWT issuer/audience, auth endpoints, DB connection and role mapping.
3. Reproduce login with browser DevTools/Playwright; record request URL, method, status code, response shape, CORS/network errors and server logs **without passwords, tokens, PII, or secrets**.
4. Check login, logout, refresh/reload session, unauthorized 401, forbidden 403, registration if present, and authenticated requests for key modules (AI Tutor, lessons, teacher/admin). Verify startup configuration on the new machine; don't silently substitute mock.
5. Distinguish frontend-only bugs from backend/database/configuration failures. Do not reset credentials, rehash users, reseed accounts, or write to `StudyAIDb`.

## B. Repair auth/API flow
- Correct API base URL/proxy/CORS/auth handling according to existing architecture.
- Keep access token **in memory only** as established by `authSession.ts`; do not move tokens into localStorage/sessionStorage/IndexedDB.
- Restore session via existing secure mechanism where available; fail closed, don't fake a logged-in state.
- Handle 401/403 and network failures visibly and consistently; prevent protected API calls from silently using mock data.
- Do not bypass authorization or add hardcoded test credentials.

## C. Clean up navigation and header
- **Unauthenticated:** show `Đăng nhập` (and `Đăng ký` only if existing UX requires it); no role/admin-only navigation; no account dropdown pretending to be logged in.
- **Authenticated:** hide standalone `Đăng nhập`/`Đăng ký` buttons and duplicate role/admin buttons. Show ONE account/name dropdown with appropriate role-specific links (e.g. Trang quản trị, dashboard, profile, logout) only inside that dropdown.
- Remove redundant page-level auth/navigation shortcut buttons across affected pages; preserve functional task/action buttons (save, submit, create, grade, etc.), primary content navigation and accessibility.
- Make menu items role-aware and prevent privilege escalation by direct URL (backend remains authoritative).
- Loading/refreshing auth state must not flash contradictory login/admin controls.
- Responsive desktop/mobile behavior, keyboard access, focus and click-outside close.

## D. Tests & evidence
- Backend unit/integration tests for auth/session and role enforcement as relevant.
- Frontend tests for logged-out, learner, teacher, admin, pending-auth states, dropdown links, login/logout, API failures.
- Playwright real BE+FE login, authenticated API request, logout, refresh; screenshot before/after navigation. Test with **dedicated test accounts in test DB only**.
- Verify no mock fallback for authenticated users.
- Run dotnet build, backend tests, frontend lint/Vitest/build, Playwright E2E, GitHub Actions.
- Mark unrun tests NOT RUN or BLOCKED; do not claim live OpenAI verification.

## E. Strict database protection
`StudyAIDb`: NO writes, migrations, seeds, reset, restore, password/role/user changes. Preserve 15 historical accidental accounts and `DatabaseSafetyGuard`. Test writes only in `StudyAIDb_E2E` or `StudyAIDb_Clean_{GUID}`. If diagnosis requires main DB inspection, read-only and avoid exposing PII; if risk cannot be eliminated, stop and report.

## F. Deliverables / handoff
- Code changes limited to authentication/API integration, navigation, tests, docs; no Phase 20 classroom/assignment feature implementation yet.
- Update `ai-collaboration/REPORT.md` with root cause, affected files, HTTP evidence (sanitized), tests, screenshots, database safety evidence, commit SHA, CI run URL, remaining issues.
- Update `ai-collaboration/STATUS.md` and append `HISTORY.md`; do not edit `TASK.md` or `REVIEW.md`.
- Commit/push safely; stop for ChatGPT review. Once P20-000 is approved, ChatGPT will issue `P20-001` for Phase 20 features.

**STOP GATE:** No Phase 21. No feature Phase 20 code before P20-000 review. No main DB writes.

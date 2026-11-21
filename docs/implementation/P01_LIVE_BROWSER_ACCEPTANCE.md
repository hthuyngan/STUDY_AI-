# P01 live browser acceptance: real FE → ASP.NET Core → SQL Server

This is a **separate opt-in acceptance suite**, not the screenshot-based `test:e2e:p00` UI smoke test. No mocked API responses or `page.route().fulfill()` are used.

## Verified browser flows — CI on commit `11bfa8589fe97073ba87831389ee08ef5a95ad1a`

**4/4 live browser scenarios PASS** with a disposable SQL Server container: [Live Browser Actions #44717669638](https://github.com/hthuyngan/STUDY_AI-/actions/runs/44717669638); [regular CI #44717669662](https://github.com/hthuyngan/STUDY_AI-/actions/runs/44717669662). These are real browser interactions and real backend SQL-backed APIs, not mocked responses. Backend integration suites separately assert direct SQL persistence.

## Implemented browser flows

1. **Admin Settings stale-version:** Two independently authenticated Chromium contexts load the live Settings page, edit the same record, assert first PUT returns 200 and second stale PUT returns 409, hard-reload both contexts, and confirm the winning value remains. Restore the original Settings value on the isolated test DB.
2. **Classroom transfer:** Register a dedicated test learner, create source and target classes owned by the test teacher, enroll learner, transfer from the real Teacher Students UI; assert HTTP 200, verify both classes via real GET after hard reload. Cleanup removes enrollments/classes and soft-deletes test learner.
3. **Teacher account lock:** Create a uniquely named teacher fixture using the real Admin API; click Lock on the real Admin Teachers page; verify live login is denied with HTTP 403; click Unlock; verify login returns 200. Soft-delete the test teacher in a `finally` block.

`scripts/e2e_p01_live_browser_playwright.ts` explicitly requires local frontend and backend origins, `E2E_DB_NAME=StudyAIDb_E2E`, and real test-only Admin credentials. It fails closed if the backend or authentication endpoint is unavailable. The DB name environment variable is a **human-facing precondition, not proof of the backend connection string**: validate the running backend's *actual* configuration with `DatabaseSafetyGuard` before invoking the script. Never point any test server at the production database `StudyAIDb`.

4. **Learner Assessment network error and retry:** Open seeded, published Math 12 lesson in real browser; answer two real questions; abort ONLY the real assessment POST to simulate network failure; assert the alert, reload, resume stored answers; retry without interception, verify HTTP 201 and exactly one completed attempt via real SQL-backed GET.

## How to run

1. Start an isolated SQL Server with database `StudyAIDb_E2E`. Set the backend environment `ConnectionStrings__DefaultConnection` to that database, with startup safety guard enabled. Do not use a production SQL host.
2. Start ASP.NET Core 10 backend locally on `http://127.0.0.1:8000` using this guarded connection string. Confirm the backend `/api/v1/auth/refresh` endpoint is reachable.
3. Start Vite frontend locally (dev or preview) on `http://127.0.0.1:5174` and configure its proxy `VITE_BACKEND_URL=http://127.0.0.1:8000`. For a preview build, ensure `VITE_BASE_URL=/`.
4. Create/verify a **test-only Admin account** in the isolated SQL DB.
5. Export these environment variables in the shell running Playwright:

```sh
export E2E_DB_NAME=StudyAIDb_E2E
export E2E_FRONTEND_URL=http://127.0.0.1:5174
export E2E_BACKEND_URL=http://127.0.0.1:8000
export E2E_ADMIN_EMAIL=your-e2e-admin@example.test
export E2E_ADMIN_PASSWORD='your-test-only-password'
bun run test:e2e:p01:live
```

On PowerShell use `$env:E2E_DB_NAME = 'StudyAIDb_E2E'`, etc. Never commit actual credentials.

## Evidence policy

- **VERIFIED IN CI:** All four live browser scenarios passed on commit `11bfa85` against ephemeral `StudyAIDb_E2E`. GitHub Actions artifacts include screenshots and runtime logs. The workflow is independently runnable via `workflow_dispatch`.
- Tests write only to the configured test DB, restore Settings and delete the generated teacher as cleanup. Ensure the test DB is disposable.
- Screenshots are secondary artifacts; status-code and persisted-value assertions decide PASS.
- **Remaining review evidence:** Browser scenarios verify live SQL-backed API responses and reload persistence; direct SQL reads are independently covered by .NET integration tests. No sensitive browser traces are published (they can capture authentication cookies and tokens); screenshots and runtime logs are attached instead. Human review of outstanding Codex threads is still required.
- P01 browser acceptance now passes. Keep PR #15 Draft until final human review of outstanding findings and documented acceptance, then consider merge. Do not start P02 implementation in this branch.

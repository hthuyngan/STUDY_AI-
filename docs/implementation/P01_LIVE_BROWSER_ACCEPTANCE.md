# P01 live browser acceptance: real FE → ASP.NET Core → SQL Server

This is a **separate opt-in acceptance suite**, not the screenshot-based `test:e2e:p00` UI smoke test. No mocked API responses or `page.route().fulfill()` are used.

## Implemented browser flows

1. **Admin Settings stale-version:** Two independently authenticated Chromium contexts load the live Settings page, edit the same record, assert first PUT returns 200 and second stale PUT returns 409, hard-reload both contexts, and confirm the winning value remains. Restore the original Settings value on the isolated test DB.
2. **Teacher account lock:** Create a uniquely named teacher fixture using the real Admin API; click Lock on the real Admin Teachers page; verify live login is denied with HTTP 403; click Unlock; verify login returns 200. Soft-delete the test teacher in a `finally` block.

`scripts/e2e_p01_live_browser_playwright.ts` explicitly requires local frontend and backend origins, `E2E_DB_NAME=StudyAIDb_E2E`, and real test-only Admin credentials. It fails closed if the backend or authentication endpoint is unavailable. The DB name environment variable is a **human-facing precondition, not proof of the backend connection string**: validate the running backend's *actual* configuration with `DatabaseSafetyGuard` before invoking the script. Never point any test server at the production database `StudyAIDb`.

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

- **NOT RUN / NOT VERIFIED** until the suite is run with an isolated SQL Server, real backend, test-only Admin account and live browser, and its assertions complete successfully. Adding the script alone is not a PASS.
- Tests write only to the configured test DB, restore Settings and delete the generated teacher as cleanup. Ensure the test DB is disposable.
- Screenshots are secondary artifacts; status-code and persisted-value assertions decide PASS.
- **Still needed for Issue #16:** browser-based classroom transfer with real enrolment verification; learner Assessment API fault injection at the correct endpoint, followed by a retry; CI isolation/provisioning and artifact upload. Backend HTTP+SQL regression tests do not replace these browser flows.
- Do not mark P01 as fully accepted or merge PR #15 until remaining flows pass. Do not start P02 implementation in this branch.

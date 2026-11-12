# DATA-001-FIX — Governance and release hardening

- Status: **READY — USER APPROVED**
- Owner: Antigravity; workspace `E:\AI_tutor`
- Baseline: `feature/data-vnhsge-import` @ `d4449f12284b4113b3d4cd91b66a6e6b1788ae54`; main remains separate.
- Source task: `ai-collaboration/DATA-001.md`. Current report: `ai-collaboration/DATA-001-REPORT.md` on feature branch.
- Do not merge until review. Do not start Phase 21.

## Blocking governance defects and acceptance criteria

1. **Role separation**: `CurriculumImportController` currently uses class-level `[Authorize(Roles = "content,admin")]`, including POST `confirm`, and `CurriculumImportConfirmService` performs real writes when `DryRun=false`. Enforce least privilege: Content may upload, preview, validate, and dry-run; only Admin may approve real writes, with server-side authorization (not only hidden UI). Test Content confirm 403, Admin dry-run allowed, unauthorized 401, and API direct-call bypass attempts.
2. **Rights enforcement**: Do not infer dataset redistribution permission from arXiv paper CC license. The VNHSGE repository root has no explicit LICENSE. Implement a **server-side** dataset-specific rights gate, fail-closed when unverified. Do not rely on UI checkbox or filename alone; preserve provenance and reviewable evidence. Until explicit dataset authorization is supplied, VNHSGE real import and publication must remain BLOCKED even for Admin. Existing unrelated Phase 18 imports must remain functional within established policies.
3. **Dry-run semantics**: `CurriculumImportConfirmService` currently returns `Success=true`, simulated `Inserted/Updated` and synthetic `AuditLogId=dry_...` without persisting an audit row. Clearly distinguish *would insert/update* from actual writes, `AuditLogId` null/explicitly simulated, and never claim a durable audit log exists. Tests assert no `SaveChangesAsync`/transaction/write for dry-run, including malformed or invalid inputs.
4. **Authentication fail-closed**: The current frontend service uses `getAccessToken()` to choose real API vs mock. Audit session initialization/expired session and ensure authenticated workflows never silently switch to localStorage demo. Tests cover missing/expired token and backend failures. Preserve explicit guest/demo only where permitted.
5. **Account status**: Antigravity reports `admin@gmail.com` and `content@gmail.com` absent in protected main DB; existing `@studyai.internal` accounts have roles. Do not create, seed, reset, change roles or passwords on main DB. Report absence and provide a **separate user-approved** safe account provisioning proposal; never include credentials in GitHub or logs. Do not hardcode credentials.
6. **Source data validation**: Test real upstream *read-only* samples for Math, Physics and Literature across split paths and schema variants, with provenance, correct answers, LaTeX and image path checks. Do not copy raw copyrighted corpus into target repo. Generate subject/split inventory and rejection/needs-review manifest without writes. Synthetic fixtures for CI.
7. **DB safety**: No writes, migrations, seed, restore or reset on `StudyAIDb`. Do not modify `DatabaseSafetyGuard`. Writes only on `StudyAIDb_E2E` or `StudyAIDb_Clean_{GUID}` after confirming isolation and rights. Database count 97→119 provenance is not independently proven by aggregate timestamps; avoid unsupported zero-write claims.
8. **Verification**: Add .NET integration and unit tests, frontend Vitest, API negative auth tests, lint/build, Playwright if appropriate. Run CI and provide exact SHA/run IDs. Review error handling and prevent successful UI state on failed API.
9. **Handoff**: Update `docs/data-vnhsge.md`, `ai-collaboration/DATA-001-REPORT.md` and STATUS/HISTORY **on feature branch** without overwriting others' edits. Stop for ChatGPT review. No merge, no production import, no Phase 21.

## Stop conditions
If license, target DB isolation, or authenticated permissions cannot be verified, report **BLOCKED**, keep dry-run only, and do not attempt writes.

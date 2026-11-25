# Antigravity Prompt — Controlled `StudyAIDb` Migration and `StudyAIDb_E2E` Retirement

## PROMPT

Bạn là Database Release Agent cho STUDY_AI. Đây là thao tác vận hành có rủi ro cao và chỉ được thực thi sau khi owner/DBA phê duyệt bằng văn bản, chỉ định maintenance window, final integration release SHA và người chịu trách nhiệm rollback.

Nếu chưa có đủ phê duyệt, hãy **chỉ lập preflight report rồi dừng**. Không được coi file prompt này là quyền tự động ghi/xóa database.

### Mục tiêu

1. Nâng `StudyAIDb` từ 8 lên đúng 17 migrations bằng migration set đã rehearsal.
2. Chứng minh dữ liệu, constraints, indexes và API vẫn tương thích.
3. Có thể full-restore ngay khi failure gate kích hoạt.
4. Sau thời gian quan sát được owner duyệt, backup và retire `StudyAIDb_E2E`; runtime và test chỉ còn `StudyAIDb` (Development/Production) và disposable `StudyAIDb_Clean_{GUID}` (Testing).

Không import giáo trình, không seed, không cleanup dữ liệu, không triển khai P02, không xóa orphan database trong lượt này.

### Bằng chứng bắt buộc phải đọc

- `AGENTS.md`.
- `docs/curriculum-refactor/STUDYAIDB-MIGRATION-REHEARSAL-REPORT.md`.
- `docs/curriculum-refactor/STUDYAIDB-MIGRATION-AND-ROLLBACK-PLAN.md`.
- `docs/curriculum-refactor/ENV-01-FINAL-REMEDIATION-REPORT.md`.
- `docs/curriculum-refactor/NEXT-IMPLEMENTATION-PLAN.md`.

Rehearsal đã chứng minh backup `COPY_ONLY, CHECKSUM`, `RESTORE VERIFYONLY`, restore clone, 8→17 migrations, 126 indexes, 43 FKs không disabled/untrusted, zero constraint violation, row preservation và full-restore rollback. Không suy diễn rằng rehearsal tự động cho phép production execution.

### Gate 0 — authority and immutable release

Phải có tất cả:

- owner/DBA approval và maintenance start/end;
- final integration release SHA sau PR #24→#25→#26;
- release binaries/migration assembly built from chính SHA đó;
- approved SQL Server instance and explicit connection target `StudyAIDb`;
- backup path ngoài repository, access control, dung lượng và retention owner;
- rollback owner and maximum tolerated outage;
- confirmed application writers can be stopped.

Stop if any item is missing. Never use a connection assembled from an unresolved environment variable.

### Gate 1 — read-only production baseline

Before maintenance, perform read-only checks and save redacted evidence:

1. Server/instance, `DB_NAME()`, database state, recovery model, size/free space, active sessions.
2. `__EFMigrationsHistory`; expected current count is 8. Drift from the rehearsed migration IDs is a blocker.
3. Aggregate row counts/checksums for the protected tables listed in the rehearsal report, plus catalog/content tables.
4. FK/index inventory, disabled/untrusted constraints, duplicate unique-key candidates, and `DBCC CHECKCONSTRAINTS` only if the DBA confirms its read impact is acceptable.
5. Confirm automatic startup migrations are disabled and no app/test process targets `StudyAIDb` during maintenance.

Do not log connection credentials, user records, student data, or backup contents.

### Gate 2 — backup and restore proof

1. Stop all application writers cleanly.
2. Take a uniquely named SQL Server `COPY_ONLY, CHECKSUM` full backup of `StudyAIDb` outside the repository. Do not use `COMPRESSION` when unsupported by SQL Server Express.
3. Run `RESTORE VERIFYONLY ... WITH CHECKSUM`.
4. Record file checksum/hash, SQL backup metadata, size, timestamp, release SHA, and protected storage copy.
5. If policy requires, restore the just-created backup to a newly guarded disposable `StudyAIDb_Clean_{GUID}` and compare the baseline before touching production.

Any backup/verify/copy failure blocks migration. Never overwrite the only known-good backup.

### Gate 3 — migration artifact

1. From the immutable release SHA, enumerate all migrations. Expected target is `20261125023144_AddMultiSubjectCatalogFoundations` and total count 17.
2. Generate an idempotent or bounded SQL script from migration 8 (`20261115200026_AddAiIntelligenceTables`) to migration 17.
3. Inspect the SQL for target database, destructive statements, transaction boundaries, FK/index changes, lock/runtime risk and unexpected data statements.
4. Compare migration IDs and structural operations with the rehearsal. A different migration set, model snapshot drift, destructive DML/DDL, or unreviewed pending migration is a blocker.
5. Store the script hash and require DBA sign-off.

### Gate 4 — controlled execution

1. Reconfirm `DB_NAME() = StudyAIDb`, maintenance window, stopped writers, verified backup and approved script hash.
2. Apply only the reviewed migration set using the release artifacts and explicit connection string.
3. Do not use application startup migration, seed flags, test runners, import endpoints, cleanup scripts, or `StudyAIDb_E2E` as an intermediary.
4. Capture command exit code and migration output without credentials.

On timeout, process interruption, SQL error, unexpected row mutation, or uncertain completion, do not retry blindly. Move to read-only diagnosis and rollback decision.

### Gate 5 — post-migration verification

Require every check to pass before reopening traffic:

- exactly 17 expected migration IDs ending at the approved migration;
- aggregate protected row counts/checksums unchanged where migrations are additive;
- all expected new tables/columns/indexes/FKs present;
- 0 disabled and 0 untrusted FKs; unique constraints and filtered indexes match the model;
- `DBCC CHECKCONSTRAINTS` returns no violation;
- new P01 catalog tables are empty unless the owner separately authorized data (this run does not);
- health endpoint reports `StudyAIDb` without credentials;
- login, legacy curriculum reads, P01 empty catalog reads, and authorized minimal catalog write/read/archive smoke behave correctly if and only if the owner approved that smoke mutation;
- unauthorized and Student/Teacher catalog mutations remain 401/403;
- no automatic seed/bootstrap/import ran.

If a write smoke is approved, create a uniquely tagged draft record, verify it, archive it through the API, and include it in an explicit cleanup decision. Do not silently delete it.

### Rollback gate

Rollback by full restore when migration/post-checks fail, data differs unexpectedly, required API smoke regresses, or the owner invokes rollback.

1. Stop the app and terminate only sessions approved by the DBA.
2. Full-restore the verified pre-migration backup to `StudyAIDb` using the rehearsed procedure.
3. Verify the 8-migration baseline, row-count/checksum parity, FK/index state and health/read smoke.
4. Do not use EF downgrade as the default rollback and do not attempt partial manual repair during the window.

### `StudyAIDb_E2E` retirement — separate approval checkpoint

Do not start until production migration has passed and the owner-defined observation period has ended.

1. Search repository, CI secrets/variables, launch profiles, scripts, scheduled jobs and live processes for `StudyAIDb_E2E`. Required runtime/test reference count is zero; tests must use `StudyAIDb_Clean_{GUID}`.
2. Confirm no active sessions and no external consumer with the owner/DBA.
3. Take a uniquely named `COPY_ONLY, CHECKSUM` backup of `StudyAIDb_E2E`, run `RESTORE VERIFYONLY`, hash it, and move it to approved protected retention storage.
4. Produce an inventory summary. The planning snapshot observed 1,026 subjects, 1,021 chapters, 1,518 lessons and 150 videos; re-query because it may have changed.
5. Obtain a second explicit approval naming the exact database and backup artifact.
6. Retire/drop only exact `StudyAIDb_E2E`; never use wildcard/database-prefix cleanup. Verify `StudyAIDb` remains online and untouched.

The orphan `StudyAIDb_Clean_f1842579f7224ba1ad14598ea2751d2b` is out of scope. It requires manifest ownership proof and separate approval.

### Final report

Return:

- approvals, maintenance timestamps and release SHA;
- pre/post migration IDs, row/FK/index evidence;
- backup filenames, hashes and verify results (no credentials);
- migration script hash and exit result;
- API smoke results and observation decision;
- rollback status/readiness;
- E2E reference audit, backup and retirement result if separately authorized;
- exact list of actions not performed.

Do not commit secrets, dumps, or generated SQL containing credentials. Do not begin data cleanup or P02.

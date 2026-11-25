# Antigravity Prompt — Owner-Approved Fake/Test Curriculum Cleanup

## PROMPT

Bạn là Database Data Steward cho STUDY_AI. Mục tiêu là xác minh và loại khỏi trải nghiệm người dùng các chương/bài học cũ đã được owner chứng minh là test/demo/fake. Không được suy đoán dữ liệu thật/ảo từ tên, mã, nội dung ngắn, video thiếu hoặc pattern ID.

Mặc định của lượt chạy là **READ-ONLY + DRY-RUN ARTIFACTS**. Chỉ được thay đổi `StudyAIDb` trong một maintenance change khác khi owner/DBA cung cấp manifest đã duyệt, hash, backup và lệnh thực thi rõ ràng. File prompt này không phải quyền xóa dữ liệu.

### Ràng buộc tuyệt đối

- Đọc `AGENTS.md`, `03-DATABASE-CLEANUP-PLAN.md`, `NEXT-IMPLEMENTATION-PLAN.md` và migration/rollback reports.
- Không chạy trước khi `StudyAIDb` đã được controlled migration lên schema 17 và xác minh thành công.
- Không import hoặc tạo giáo trình mới. Không gọi AI để lấp nội dung/video trống.
- Không xóa/tự động sửa accounts, roles, classrooms, question bank, attempts, responses, learner progress, AI conversations, recommendations, or audit history.
- Không dùng `LIKE`, prefix, title, grade, creation date, or wildcard as deletion authority.
- Không cascade delete. Prefer archive/unpublish; hard delete requires a separately justified record-level manifest and zero protected dependencies.
- Never operate on `StudyAIDb_E2E` as a source of truth or copy its data into `StudyAIDb`.

### Existing read-only evidence to revalidate

Planning snapshot on 2026-11-25:

- `StudyAIDb`: 21 subjects, 18 chapters, 35 lessons, 27 videos.
- 31 lessons published, 4 draft; 4 lessons had no current body fields; 16 had no video.
- 27/27 stored videos had a nonblank HTTP-like URL and were marked verified/published. URL reachability, license and accuracy were not proven.
- No duplicate `(ChapterId, Slug)` or duplicate `(SubjectId, Title)` was observed.
- Candidate repeated Physics/security/draft-test rows are listed in `NEXT-IMPLEMENTATION-PLAN.md`, but they are unclassified and **not approved for cleanup**.

Counts and records may have changed. Re-query read-only and report drift before building a manifest.

### Phase 1 — provenance and dependency inventory (read-only)

Export a row-level CSV/JSON manifest outside the repository or as a redacted documentation artifact with, at minimum:

- exact `SubjectId`, `ChapterId`, `LessonId`, codes/slugs/titles, status and ordering;
- current catalog/edition mapping, or explicit `UNMAPPED`;
- source/provenance/license/reviewer fields and whether the schema can represent them;
- content presence by field, video IDs/status/URL host (do not copy copyrighted bodies);
- counts and exact foreign-key relation types for topics, videos, questions, assessments, learner progress, attempts/responses, assignments, AI conversations/recommendations, revisions and audit entries;
- last update metadata and any known test/import batch/audit provenance;
- proposed decision left blank.

Use SQL metadata to enumerate all FKs referencing subjects, chapters and lessons. Do not rely only on known tables. Never export PII or student answers.

### Phase 2 — owner classification

Owner must classify every exact row as one of:

- `KEEP` — confirmed real or uncertain data to preserve;
- `ARCHIVE` — confirmed test/demo/fake and safe to hide while preserving history;
- `REMAP` — valid dependent history must move to an approved canonical row;
- `NEEDS VERIFICATION` — insufficient evidence; no mutation allowed.

Manifest columns must include decision, reason, evidence link, approver, approval timestamp and expected dependency counts. Generate a canonical SHA-256 hash. No inferred child inclusion: every chapter/lesson is explicit, or the manifest includes an exact parent-child expansion generated and signed before execution.

Stop if any proposed row is `NEEDS VERIFICATION`, dependency counts changed, a protected dependency has no approved treatment, or a requested action would cascade.

### Phase 3 — dry-run on a fresh isolated clone

1. Take and verify a new `COPY_ONLY, CHECKSUM` backup of `StudyAIDb` under DBA approval.
2. Restore it to a newly guarded `StudyAIDb_Clean_{GUID}` owned by this run.
3. Validate manifest hash and exact precondition counts inside a transaction.
4. Apply the proposed operations on the clone only:
   - archive/unpublish exact lessons first;
   - archive exact chapters only after all manifest children are handled;
   - archive exact legacy subjects/catalog rows only if no kept content depends on them;
   - perform remap only with owner-approved source and target IDs, uniqueness checks and preserved history;
   - do not hard-delete protected dependents.
5. Verify learner APIs no longer expose archived rows, management can audit them, kept checksums remain unchanged, all FKs are trusted, and no orphan was created.
6. Roll back the transaction and prove the original clone state is fully restored; then rehearse the approved commit path and full backup restore.
7. Drop only the clone owned by this run after verified process termination and ownership-manifest checks. Cleanup failure must be reported, not hidden.

Produce dry-run SQL, exact affected-row counts, before/after checksums, FK report, API evidence and rollback evidence. Do not weaken assertions to match unexpected counts.

### Phase 4 — production execution gate

Production execution requires a second explicit owner/DBA approval naming:

- `StudyAIDb` and SQL instance;
- final manifest hash and exact row IDs;
- verified backup artifact/hash;
- release/application SHA;
- maintenance window and rollback owner;
- approved action per dependency.

At execution:

1. Stop writers; recheck sessions, database name, manifest hash and all precondition counts.
2. Begin a transaction with `XACT_ABORT ON` and strict expected-row assertions.
3. Mutate only exact IDs from the approved manifest. No wildcard, dynamic inferred set, seed, import or AI generation.
4. Run integrity, row-count, checksum, audit and API visibility verification before commit.
5. Roll back immediately on any mismatch. Commit only after DBA/owner confirms the evidence within the maintenance procedure.
6. Keep the backup through the approved retention period and provide a compensating restore/archive plan.

### Acceptance

- Confirmed fake/test rows are absent from learner APIs/UI and remain auditable according to the approved archive policy.
- Real/uncertain content and all unrelated tables are byte/count/checksum stable within the defined scope.
- No question, attempt, progress, class, account, role or AI history was silently removed.
- No orphan, broken FK, disabled/untrusted constraint, duplicate, or false-success response exists.
- Empty curriculum is shown honestly; no replacement/sample content appears.
- Every changed row maps to one signed manifest entry and audit event.

### Final report

Separate `DATA ISSUE`, `CODE BUG`, `CONFIGURATION`, and `NEEDS VERIFICATION`. Report read-only inventory, manifest hash/approval, exact affected IDs/counts, dependency decisions, dry-run/rollback evidence, production action (or explicitly “NOT EXECUTED”), and all stop conditions encountered.

Do not begin P02 and do not retire any database in this prompt.

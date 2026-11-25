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

### Existing read-only evidence (revalidated on `StudyAIDb` at schema 17, 2026-11-25)

- `StudyAIDb`: **21** subjects, **18** chapters, **35** lessons, **27** videos, **16,693** questions, **0** assessments, **20** `lesson_progress`, **38** `ai_conversations`, **0** `user_section_bookmarks`, **0** `user_study_notes`, **0** `student_topic_mastery`, **0** `ai_learning_recommendations`.
- **12 Test/Duplicate Subjects** (`12` chapters, `16` lessons, `12` questions, `0` videos, `0` progress, `0` AI conversations):
  - Subjects (`12`): `sub_phys12_08d`, `sub_phys12_3e4`, `sub_phys12_5a7`, `sub_phys12_915`, `sub_sec_4ea98`, `sub_sec_a01cb`, `sub_sec_b145e`, `sub_sec_c1815`, `sub_test_drf_4`, `sub_test_drf_6`, `sub_test_drf_7`, `sub_test_drf_b`.
  - Chapters (`12`): `chp_a4b1aefab26c46988c1d965d8744e6ee`, `chp_68b51765300d4e948bbe81f339990d48`, `chp_b0e92b3496744f1f8a77798a5a44a2d3`, `chp_9669111c291545d0904aa62a38d71ab1`, `chp_237646c84bdb43b58c97c5f4d763e437`, `chp_0ef7fa01e4714d96b3a385c1ea80b9dc`, `chp_b566ca563304422f9fa63cf9103067c1`, `chp_cc15648d4e384fdeb98110e6568975ff`, `chp_86b75a3408e14edda7049fc1c83ca020`, `chp_17e0b78ac3f94edb94799c521ee6a569`, `chp_0bb8ac9ccd8242c698c744428af60027`, `chp_6286b8922abc4fbeb6038b7dfa09951e`.
  - Lessons (`16`): `les_4a43b543ff9245f39c475b44813fa98f`, `les_99c0dd4fe9ab42fb8f83b24c6a45d60a`, `les_5b37625af9474f0eba247d4c88bb89c3`, `les_5f1c2b37c64247f4b6b85884fd564e17`, `les_9c538e07e811436a8be848fab7fb86d0`, `les_a5d86cf0ba654eb884ad94a87c721d5b`, `les_6810911061314bd0bff2eecd98da2929`, `les_9fc89006dde5400fa21b4fc7eaaa704f`, `les_b903798d5c98459a8a1575cbbc50b146`, `les_315ca0933b9541d38e0664e78e0e5d10`, `les_0e0a4aa52189478a904161e4a633a6bf`, `les_054bf74a0e234b738e62f7cbe081bbd0`, `les_980bd6f7d1894de9b74d06b221660cc2`, `les_af8afe9c068740cf809de50ebc1ae531`, `les_663dcf18194e48c29d5fc492672f0e83`, `les_54de4cef9ccd440ea273cd6e58b0708d`.
- **9 Canonical VNHSGE Subjects (`16,681` questions — preserve subjects & questions):**
  - Question-only subjects (`8`): `sub_bio12` (1,989 Q), `sub_chem12` (1,973 Q), `sub_civic12` (1,852 Q), `sub_eng12` (2,367 Q), `sub_geo12` (1,931 Q), `sub_hist12` (1,998 Q), `sub_lit12` (30 Q), `sub_phys12` (1,995 Q).
  - `sub_math12` (`2,546` questions):
    - Legacy Chapters (`6`): `chp_math12_c1`, `chp_math12_c2`, `chp_math12_c3`, `chp_math12_c4`, `chp_math12_c5`, `chp_math12_c6`.
    - Legacy Lessons (`19`, with `2` Qs on `c1_b1`, `9` `lesson_progress` rows across `c1_b1..c1_b4`, `c2_b1`, `c4_b2`, `c5_b2`, `c5_b3`, and `35` `ai_conversations` across `c1_b1`, `c1_b3`, `c1_b5`, `c3_b1`, `c4_b1`, `c4_b2`, `c5_b3`): `les_math12_c1_b1`, `les_math12_c1_b2`, `les_math12_c1_b3`, `les_math12_c1_b4`, `les_math12_c1_b5`, `les_math12_c2_b1`, `les_math12_c2_b2`, `les_math12_c2_b3`, `les_math12_c3_b1`, `les_math12_c3_b2`, `les_math12_c4_b1`, `les_math12_c4_b2`, `les_math12_c4_b3`, `les_math12_c5_b1`, `les_math12_c5_b2`, `les_math12_c5_b3`, `les_math12_c5_b4`, `les_math12_c6_b1`, `les_math12_c6_b2`.
    - Video Resources (`27`, all `youtube`/`verified`/`IsPublished=1`/`https://www.youtube.com/`, note: missing provenance is **not** equated with fake data): `vid_math12_c1_b1_1`, `vid_math12_c1_b1_2`, `vid_math12_c1_b2_1`, `vid_math12_c1_b2_2`, `vid_math12_c1_b3_1`, `vid_math12_c1_b3_2`, `vid_math12_c1_b4_1`, `vid_math12_c1_b5_1`, `vid_math12_c1_b5_2`, `vid_math12_c2_b1_1`, `vid_math12_c2_b2_1`, `vid_math12_c2_b3_1`, `vid_math12_c3_b1_1`, `vid_math12_c3_b1_2`, `vid_math12_c3_b2_1`, `vid_math12_c3_b2_2`, `vid_math12_c4_b1_1`, `vid_math12_c4_b1_2`, `vid_math12_c4_b2_1`, `vid_math12_c4_b3_1`, `vid_math12_c5_b1_1`, `vid_math12_c5_b2_1`, `vid_math12_c5_b3_1`, `vid_math12_c5_b4_1`, `vid_math12_c6_b1_1`, `vid_math12_c6_b2_1`, `vid_math12_c6_b2_2`.
- **How to hide old curriculum from Learner API/UI without breaking FKs (`8` `CASCADE` FKs, `3` `NO_ACTION` FKs):**
  - `StudentCurriculumService.cs` filters chapters by `c.IsActive` and lessons by `l.Status == "published"` (and videos by `v.IsPublished`).
  - Therefore: set `Status = 'archived'` on all `16` test lessons + `19` legacy Math12 lessons; set `IsPublished = 0` on all `27` videos; set `IsActive = 0, Status = 'archived'` on all `12` test chapters + `6` legacy Math12 chapters; set `IsActive = 0` on the `12` test subjects. Keep `sub_bio12..sub_phys12` `IsActive = 1` (or archive `sub_math12` only if Practice doesn't require it), preserving all `16,693` questions and all `lesson_progress` / `ai_conversations` history. Never auto-map legacy subjects into P01 catalog tables.

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

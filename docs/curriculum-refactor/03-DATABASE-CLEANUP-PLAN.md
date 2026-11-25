# Curriculum Data Cleanup — Safety Plan

## 1. Status

Specification only. No cleanup, SQL write, seed, migration, import, backup, restore, or database connection was executed during this review.

`StudyAIDb` is protected. The cleanup tool must refuse it unconditionally. Development and tests use `StudyAIDb_E2E` or a disposable database with a fail-closed name/connection guard.

## 2. Cleanup objective

Identify and safely archive approved demo/test curriculum records and remove the source that recreates them. The tool must not infer “fake” solely from a title, ID prefix, or absence of activity. Each candidate needs evidence and human approval.

Never automatically delete users, roles, permissions, classrooms, assignments, API configuration, support reports, VNHSGE question bank data, or unrelated business data.

## 3. Required tool contract

The implementation should extend the existing safety guard and audit patterns, not create an ungoverned script.

Required inputs:

- explicit connection source and `--expected-database StudyAIDb_E2E`;
- immutable candidate manifest ID/hash;
- operator identity and reason;
- `--dry-run` as the default and no implicit apply;
- explicit approved action (`archive`, or separately approved `hard-delete`);
- verified recovery reference and timestamp.

Fail closed when:

- database name is missing, ambiguous, or equals `StudyAIDb`;
- environment is shared/production-like;
- manifest changed after approval;
- backup/recovery verification is missing;
- dependency counts differ between dry run and apply;
- transaction/audit sink is unavailable.

## 4. Candidate classification

Use evidence in this order:

1. exact known seed IDs and a hash/version of the seeder payload;
2. import/run audit metadata or provenance explicitly marking test/demo;
3. creation actor/environment/run ID;
4. content review evidence;
5. manual classification.

ID prefixes (`sub_math*`, `les_*`), titles such as “sample”, or empty content are signals only. Real authored content may share those traits.

Candidate report columns:

```text
EntityType, EntityId, ParentId, Title, Status, Provenance,
CandidateReason, Confidence, CreatedAt, CreatedBy,
ProgressCount, AttemptCount, ResponseCount, EventCount,
MasteryCount, RecommendationCount, NoteCount, BookmarkCount,
ConversationCount, AssignmentCount, ChildCounts, ProposedAction
```

## 5. Dependency inventory

Inventory at minimum:

- content subjects, chapters, topics, lessons, blocks/legacy JSON, resources/videos;
- assessments, questions, assessment responses;
- lesson progress, attempts, learning events;
- mastery, errors, recommendations, paths;
- notes, bookmarks, AI conversations/messages and provenance;
- classroom assignments/submissions that reference lessons or assessments;
- revisions, workflow events, audit logs, import runs.

Because current relationships use mixed cascade, NoAction, and un-enforced string IDs, dependency discovery must use both EF metadata and explicit read-only queries. Do not trust cascade previews alone.

## 6. Preservation policy

- **No history:** archive first; hard delete may be proposed only in a later approved maintenance window.
- **Has learning/assessment history:** keep a tombstone/historical version and immutable display snapshot. Never delete attempts, responses, grades, or user evidence to make the curriculum row deletable.
- **Question shared or VNHSGE:** detach only through an approved mapping change; never classify it as curriculum demo by association.
- **Published but unproven:** quarantine/archive and require review; do not destroy.
- **Uncertain provenance:** `NEEDS VERIFICATION`, no action.

## 7. Ordered procedure

### C01 — Stop recurrence

First deploy/test the change that removes runtime demo seeding and production mock registration. Starting an empty environment must remain empty.

### C02 — Read-only inventory

Run only against disposable/E2E first. Produce candidate and dependency reports, counts by table/status/source, orphan report, invalid media report, and manifest hash.

### C03 — Human approval

Owner approves exact IDs and action. Any row added, removed, or dependency-count change invalidates approval and requires a new dry run.

### C04 — Recovery rehearsal

Create and verify a recoverable snapshot using approved DBA operations outside the application. Restore it to a disposable database and prove row/count/checksum recovery. Do not store dumps in Git.

### C05 — Transactional archive rehearsal

On `StudyAIDb_E2E`, acquire appropriate locks, recheck manifest/hash/counts, archive in dependency-safe order, write audit rows, validate postconditions, and commit only if all checks pass. Any exception rolls back.

### C06 — Verification

Compare before/after counts, orphan queries, learner visibility, history readability, and audit records. Rerun the same manifest: it must be a safe no-op.

### C07 — Production decision gate

This plan does not authorize production execution. A separate owner/DBA approval must identify target, recovery point, maintenance window, verified dry-run report, and rollback owner. `StudyAIDb` remains blocked until repository policy is explicitly changed by its owner; application tests/tools must still refuse it.

## 8. Transaction and idempotency rules

- Use one transaction for an approved batch or deterministic bounded chunks with a durable run ledger; never silent partial completion.
- Concurrency token or snapshot isolation must detect content changed after preview.
- Audit stores manifest hash, operator, reason, target DB fingerprint (non-secret), before/after counts, action, timestamps, and result.
- Archive updates include a cleanup run ID. Reapplying the same run does not duplicate audit effects or change unrelated rows.
- Hard-delete, if ever approved, is a distinct command and cannot be reached through an archive flag.

## 9. Rollback

- Before commit failure: database transaction rollback.
- After archive: a reviewed compensating restore action reactivates only rows changed by the cleanup run and validates parent lifecycle rules.
- After an approved hard delete: restore from verified backup into a disposable instance, validate, then use a DBA-approved recovery plan. Never improvise direct inserts in production.

## 10. Required tests

- Exact `StudyAIDb` and production-like target refusal.
- Missing/incorrect expected database refusal.
- Dry run performs zero writes (including audit/telemetry to target DB).
- Changed manifest/dependency count refusal.
- Full rollback on injected failure at every stage.
- Rerun is a no-op.
- Learning history preservation and learner historical display.
- Cascade/NoAction dependency coverage.
- Concurrent curriculum edit during preview/apply.
- Archive only approved rows; unrelated row checksums unchanged.
- Recovery rehearsal and before/after report generation.


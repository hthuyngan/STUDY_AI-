# STUDY_AI — PHASE 18: CONFIRM INTEGRATION TEST PLAN
## Test Matrix, Scenarios, Fixtures, Database Safety Boundaries, and Rollback Verification

- **Workspace**: `D:\TN`
- **Repository**: `hthuyngan/STUDY_AI-`
- **Status**: `[TEST PLAN — AWAITING DESIGN APPROVAL PRIOR TO TEST CREATION]`
- **Target Fixture**: `backend/tests/StudyAI.IntegrationTests/CurriculumImportConfirmIntegrationTests.cs`
- **Database Safety Guard**: Strictly enforced on `StudyAIDb_E2E`. Zero execution on `StudyAIDb`.

---

## 1. Overview & Test Infrastructure

The integration test suite for the Confirm Import pipeline will test full end-to-end HTTP interactions using `Microsoft.AspNetCore.Mvc.Testing.WebApplicationFactory<Program>`, authenticating with realistic JWT tokens and persisting to the isolated `StudyAIDb_E2E` test database.

```
+---------------------------------------------------------------------------------+
|                         CONFIRM TEST INFRASTRUCTURE                             |
+---------------------+-----------------------------------------------------------+
| Harness             | xUnit 2.9 + WebApplicationFactory                         |
| Target Database     | StudyAIDb_E2E (Guarded by DatabaseSafetyGuard)            |
| HTTP Client         | HttpClient with custom Bearer tokens                      |
| Roles Tested        | admin, content, learner, anonymous                        |
| State Cleanup       | Per-fixture / Per-test transactional rollback or cleanup  |
+---------------------+-----------------------------------------------------------+
```

---

## 2. 12 Comprehensive Test Scenarios Matrix

```
+----+----------------------------------+---------------------+----------------+-----------------------+
| ID | Scenario Description             | Auth / Role         | Expected HTTP  | Database Assertions   |
+----+----------------------------------+---------------------+----------------+-----------------------+
| 01 | Happy Path Valid JSON (Full Tree)| content@studyai     | 200 OK         | Sub, Ch, Les, Q saved |
| 02 | Happy Path Valid CSV Flat Qs     | content@studyai     | 200 OK         | Questions mapped to DB|
| 03 | Happy Path Valid XLSX Multi-sheet| admin@studyai       | 200 OK         | All sheets imported   |
| 04 | Expired / Non-existent Token     | content@studyai     | 404 Not Found  | Zero DB modifications |
| 05 | Replay Attack (Double Submit)    | content@studyai     | 409 Conflict   | First OK, second 409  |
| 06 | Actor Mismatch (User B confirms) | content2@studyai    | 403 Forbidden  | Zero DB modifications |
| 07 | Rollback on Simulated DB Failure | content@studyai     | 500 / Error    | ZERO partial records  |
| 08 | Data Drift Detection             | content@studyai     | 409 Conflict   | Subject deleted in DB |
| 09 | Concurrent Race (Same Token)     | content@studyai     | 1x 200, 1x 409 | Exact single insert   |
| 10 | Large Batch (1,000+ Items)       | admin@studyai       | 200 OK         | Duration < 3000ms     |
| 11 | Mode 'skip_conflicts' vs 'strict'| content@studyai     | 200 OK vs 400  | Valid skipped/saved   |
| 12 | Role Access Denial (Learner/Anon)| learner@ / Anon     | 403 / 401      | Access denied         |
+----+----------------------------------+---------------------+----------------+-----------------------+
```

---

## 3. Detailed Scenario Specifications

### Scenario 01: Happy Path Valid JSON Import (Full Tree)
- **Objective**: Ingest a complete curriculum tree: 1 Subject (`MATH12_TEST`), 2 Chapters, 4 Lessons, and 8 Questions.
- **Pre-condition**: Subject does not exist in `StudyAIDb_E2E`.
- **Steps**:
  1. Submit JSON file to `POST /api/v1/content/import/preview`. Receive `previewToken`.
  2. Verify preview returned 0 errors.
  3. Submit `POST /api/v1/content/import/confirm` with `previewToken`.
  4. Query `StudyAIDb_E2E`:
     - `ContentSubjects.Count(s => s.Code == "MATH12_TEST") == 1`
     - `ContentChapters.Count(c => c.Subject.Code == "MATH12_TEST") == 2`
     - `ContentLessons.Count(...) == 4`
     - `ContentQuestions.Count(...) == 8`
     - `StaffAuditLogs.Count(...) == 1`

### Scenario 02: Happy Path Valid CSV Flat Questions Import
- **Objective**: Ingest a CSV containing 25 flat questions assigned to an existing subject.
- **Steps**:
  1. Generate preview for CSV file.
  2. Confirm import.
  3. Verify 25 questions inserted with correct difficulty, type, options, and prompt fingerprints.

### Scenario 03: Happy Path Valid XLSX Multi-sheet Import
- **Objective**: Ingest an XLSX package containing `Subjects`, `Chapters`, `Lessons`, and `Questions` sheets.
- **Steps**:
  1. Preview XLSX. Confirm all 4 sheets mapped.
  2. Confirm import. Verify full relational graph persisted with matching foreign keys.

### Scenario 04: Expired or Non-Existent PreviewToken
- **Objective**: Verify system safely rejects fabricated or expired tokens.
- **Steps**:
  1. Call `POST /api/v1/content/import/confirm` with `previewToken = "prev_00000000000000000000000000000000"`.
  2. Assert response status `404 Not Found`. Error code `TOKEN_NOT_FOUND`.

### Scenario 05: Replay Attack (Double Submit Prevention)
- **Objective**: Ensure a token can only be consumed exactly once.
- **Steps**:
  1. Complete preview and first confirm $\rightarrow$ `200 OK`.
  2. Immediately send identical confirm request with same token $\rightarrow$ `409 Conflict`.
  3. Assert no duplicate records exist in `StudyAIDb_E2E`.

### Scenario 06: Actor Mismatch Security Defense
- **Objective**: Verify User B cannot confirm an import initiated by User A.
- **Steps**:
  1. Login as User A (`content@studyai.internal`). Call preview. Receive token $T$.
  2. Login as User B (`teacher@studyai.internal` or another staff). Call confirm with $T$.
  3. Assert response `403 Forbidden`. Error code `ACTOR_MISMATCH`.

### Scenario 07: Atomic Rollback on Mid-Batch Database Failure
- **Objective**: Prove strict ACID All-or-Nothing semantics.
- **Steps**:
  1. Prepare batch with 1 Subject, 1 Chapter, 1 Lesson, and 1 Question where Question has a simulated invalid constraint (e.g., column overflow or forced mock DB fault).
  2. Execute confirm.
  3. Assert response `500 Internal Server Error` or `400 Bad Request`.
  4. Query database:
     - Verify Subject was **NOT** committed.
     - Verify Chapter was **NOT** committed.
     - Verify Lesson was **NOT** committed.
     - Entire batch rolled back to pristine state.

### Scenario 08: Data Drift Detection (Parent Deleted Between Preview & Confirm)
- **Objective**: Verify the system detects and rejects confirmation when underlying DB state changes.
- **Steps**:
  1. Call preview for a batch linking lessons to existing subject `MATH12`.
  2. Before confirming, simulate an external update that archives or deletes `MATH12`.
  3. Execute confirm.
  4. Assert response `409 Conflict` (`DATA_DRIFT_DETECTED`).

### Scenario 09: Concurrent Race Condition (Parallel HTTP Requests)
- **Objective**: Verify thread-safety when two simultaneous requests present the same token.
- **Steps**:
  1. Fire two `POST /confirm` requests concurrently via `Task.WhenAll`.
  2. Assert exactly one returns `200 OK` and the other returns `409 Conflict`.
  3. Verify database contains only one set of inserted records.

### Scenario 10: Large Batch Performance & Memory Stress
- **Objective**: Ingest a batch of 1,000 questions.
- **Assertions**:
  - Entire confirmation transaction completes in under 3.0 seconds.
  - No memory leaks or unmanaged connection pool exhaustion.

### Scenario 11: Mode Processing Strategy ('strict' vs 'skip_conflicts')
- **Objective**: Test partial skip logic vs strict rejection.
- **Steps**:
  1. In `strict` mode: Batch with 1 conflict returns `400 BadRequest (HAS_CRITICAL_ERRORS)`.
  2. In `skip_conflicts` mode: Same batch inserts 99 clean questions and skips 1 conflict with `200 OK`.

### Scenario 12: Role Access Denial (Learner & Anonymous)
- **Objective**: Test endpoint protection against unauthorized callers.
- **Steps**:
  1. Learner token $\rightarrow$ `403 Forbidden`.
  2. No token $\rightarrow$ `401 Unauthorized`.

---

## 4. Test Execution & Database Safety Protocols

1. **Pre-flight Safety Check**:
   Every test execution is intercepted by `DatabaseSafetyGuard`. If any test attempts to connect to `StudyAIDb`, the process terminates immediately with an exception.
2. **Deterministic Cleanup**:
   Test data uses prefixed codes (`TEST_MATH12_*`). A fixture disposal hook removes test entities from `StudyAIDb_E2E` following test completion.

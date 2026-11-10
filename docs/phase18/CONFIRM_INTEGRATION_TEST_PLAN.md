# STUDY_AI — PHASE 18: CONFIRM INTEGRATION TEST PLAN (CORRECTED SPECIFICATION)
## Test Matrix, Idempotency Verification, Concurrency Scenarios, and Fail-Closed Tests

- **Workspace**: `D:\TN`
- **Repository**: `hthuyngan/STUDY_AI-`
- **Status**: `[REVISED TEST PLAN — V1 HARDENED SPECIFICATION]`
- **Target Fixture**: `backend/tests/StudyAI.IntegrationTests/CurriculumImportConfirmIntegrationTests.cs`
- **Database Safety Guard**: Strictly enforced on `StudyAIDb_E2E`. Zero execution on `StudyAIDb`.

---

## 1. Overview & Test Infrastructure

The integration test suite for the Confirm Import pipeline executes against `Microsoft.AspNetCore.Mvc.Testing.WebApplicationFactory<Program>`, authenticating with genuine JWT tokens and persisting to the isolated `StudyAIDb_E2E` test database.

```
+---------------------------------------------------------------------------------+
|                         CONFIRM TEST INFRASTRUCTURE                             |
+---------------------+-----------------------------------------------------------+
| Harness             | xUnit 2.9 + WebApplicationFactory                         |
| Target Database     | StudyAIDb_E2E (Guarded by DatabaseSafetyGuard)            |
| HTTP Client         | HttpClient with custom Bearer tokens                      |
| Roles Tested        | admin, content, learner, anonymous                        |
| Concurrency Tool    | Task.WhenAll / SemaphoreSlim parallel invocations         |
| Fault Injection     | EF Core SaveChangesInterceptor for transient/audit faults |
+---------------------+-----------------------------------------------------------+
```

---

## 2. Comprehensive Test Scenario Matrix

```
+----+------------------------------------+------------------+-----------------+-------------------------------+
| ID | Scenario Description               | Role             | Expected HTTP   | Database Assertions           |
+----+------------------------------------+------------------+-----------------+-------------------------------+
| 01 | Happy Path Valid Insert-Only Tree  | content@studyai  | 200 OK          | Sub, Ch, Les, Q inserted once |
| 02 | Commit-Success / Response-Lost     | content@studyai  | 200 OK (Replay) | Exactly 1 set of rows; replay |
|    | (Idempotent Retry)                 |                  |                 | returns cached summary        |
| 03 | Simultaneous Claim (Parallel Race) | content@studyai  | 1x 200, 1x 409  | Exactly 1 transaction commits |
| 04 | Expired / Non-Existent Token       | content@studyai  | 404 Not Found   | Zero DB modifications         |
| 05 | Conflict on Existing Entity        | content@studyai  | 409 Conflict    | Insert-only rule: rejects dups|
| 06 | Actor Mismatch (User B confirms)   | content2@studyai | 403 Forbidden   | Token remains valid for User A|
| 07 | Rollback on Data Drift             | content@studyai  | 409 Conflict    | Parent deleted mid-window;    |
|    | (In-Transaction Detection)         |                  |                 | zero partial entities saved   |
| 08 | Rollback on Simulated DB Error     | content@studyai  | 500 / Error     | Zero partial entities saved   |
| 09 | Fail-Closed Audit Log Failure      | content@studyai  | 500 / Error     | Audit log fails -> full DB    |
|    | (No Un-audited Commits)            |                  |                 | rollback of all entities      |
| 10 | ExecutionStrategy Retry Recovery   | content@studyai  | 200 OK          | Transient deadlock retried and|
|    | (Deadlock Victim 1205 Simulation)  |                  |                 | commits cleanly               |
| 11 | Role Access Denial (Learner/Anon)  | learner@ / Anon  | 403 / 401       | Access denied                 |
| 12 | Token Format Malformed             | content@studyai  | 400 Bad Request | Regex validation blocks early |
+----+------------------------------------+------------------+-----------------+-------------------------------+
```

---

## 3. Detailed Specifications for Critical Hardened Scenarios

### Scenario 02: Commit-Success / Response-Lost (True Idempotency)
- **Objective**: Verify that if a transaction commits successfully in SQL Server but the client retries (e.g. simulated network disconnect), the server returns the cached result without duplicate insertions.
- **Test Steps**:
  1. Submit valid batch to `POST /api/v1/content/import/preview`. Receive `previewToken`.
  2. Call `POST /api/v1/content/import/confirm`. Assert `200 OK`.
  3. Record primary keys and count of inserted entities in `StudyAIDb_E2E`.
  4. Immediately re-send the exact same HTTP request with the same `previewToken`.
  5. Assert response status: `200 OK`.
  6. Assert JSON response payload contains:
     - `isIdempotentReplay == true`
     - Exact same `summary.totalProcessed` and `entityCounts`.
  7. Query database:
     - Count of entities remains identical (no duplicates created).
     - Count of `StaffAuditLogs` remains exactly 1.

### Scenario 03: Simultaneous Claim (Thread Race / Anti-Replay)
- **Objective**: Ensure atomic claim prevents concurrent execution.
- **Test Steps**:
  1. Generate valid `previewToken`.
  2. Launch 2 simultaneous asynchronous tasks firing `POST /api/v1/content/import/confirm` concurrently via `Task.WhenAll`.
  3. Collect HTTP responses.
  4. Assert:
     - Exactly ONE request receives `200 OK`.
     - Exactly ONE request receives `409 Conflict` (ErrorCode: `TOKEN_IN_USE` or `TOKEN_ALREADY_CONSUMED`).
  5. Assert database contains exactly one set of inserted entities.

### Scenario 05: Conflict on Existing Entity (Insert-Only Enforced)
- **Objective**: Verify that V1 Insert-Only mode strictly rejects entities that already exist in the database.
- **Test Steps**:
  1. Seed existing Subject `MATH12` in `StudyAIDb_E2E`.
  2. Submit batch attempting to insert Subject `MATH12`.
  3. Call confirm.
  4. Assert response `409 Conflict` (ErrorCode: `ENTITY_ALREADY_EXISTS`).
  5. Assert no child chapters, lessons, or questions are created.

### Scenario 07: In-Transaction Data Drift Detection
- **Objective**: Verify that drift occurring between Preview and Confirm is caught inside the transaction.
- **Test Steps**:
  1. Generate preview for a batch referencing parent Subject `PHYSICS12`.
  2. Before confirming, simulate another administrator deleting `PHYSICS12` from the database.
  3. Call confirm.
  4. Assert response `409 Conflict` (ErrorCode: `CONCURRENCY_CONFLICT` or `REFERENTIAL_INTEGRITY_FAIL`).
  5. Assert transaction rolls back completely.

### Scenario 09: Fail-Closed Staff Audit Log Failure
- **Objective**: Prove that an import cannot be saved without an audit log.
- **Test Steps**:
  1. Configure a test interceptor that throws `DbUpdateException` specifically when inserting into `StaffAuditLog`.
  2. Submit valid confirm request.
  3. Assert response is `500 Internal Server Error`.
  4. Query database:
     - Assert `ContentSubjects` has 0 newly inserted rows.
     - Assert `ContentChapters` has 0 newly inserted rows.
     - Assert `ContentLessons` has 0 newly inserted rows.
     - Assert `ContentQuestions` has 0 newly inserted rows.
     - Full rollback verified.

### Scenario 10: ExecutionStrategy Retry on Deadlock
- **Objective**: Verify that transient database failures are retried safely without leaving dirty state.
- **Test Steps**:
  1. Configure test interceptor to throw SQL Server exception 1205 (Deadlock victim) on the first execution attempt, and succeed on the second attempt.
  2. Call confirm.
  3. Assert response is `200 OK`.
  4. Assert entities are inserted cleanly without duplicates.

---

## 4. Test Isolation & Database Safety Protocol

1. **Pre-flight Safety Interceptor**:
   `DatabaseSafetyGuard` runs before every test execution. If `StudyAIDb` is targeted, execution fails closed.
2. **Deterministic Entity Cleanup**:
   All test codes use prefix `TEST_P18_*`. Fixture cleanup ensures teardown after test execution.

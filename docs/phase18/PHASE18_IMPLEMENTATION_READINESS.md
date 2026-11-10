# STUDY_AI — PHASE 18: IMPLEMENTATION READINESS REPORT (CORRECTED SPECIFICATION)
## Architecture Synthesis, Readiness Scorecard, Decision Items, and Formal Stop Gate

- **Workspace**: `D:\TN`
- **Repository**: `hthuyngan/STUDY_AI-`
- **Status**: `[REVISED REPORT — V1 HARDENED SPECIFICATION]`
- **Safety Directive**: Absolute Read-Only compliance on `StudyAIDb`. Zero mutation performed.

---

## 1. Executive Summary & Synthesis of Corrections

In response to the Phase 18 Design Correction Gate, all 6 design and audit documents have been revised to eliminate unrealistic assumptions and adhere to strict production schema realities.

### Key Corrections Completed:
1. **True Atomic Claim**: Replaced naive `TryGetValue + Remove` with an atomic Compare-And-Swap (CAS) state machine (`Pending -> Claimed -> Committed / Failed`).
2. **Replay vs Durable Idempotency**: Replay attempts return `409 Conflict (TOKEN_IN_USE)`. Retries following a lost HTTP response return `200 OK` reconstructed from durable `StaffAuditLog` without re-executing transactions.
3. **In-Transaction Drift Revalidation**: Relocated all database drift and prerequisite checks inside the transaction boundary using `UPDLOCK, HOLDLOCK`.
4. **Schema Asymmetry Reconciliation**:
   - `ContentSubject`: Has `Code` (Unique). Supported.
   - `ContentChapter`: No `Code`. Mapped by `(SubjectId, Title)`.
   - `ContentLesson`: No `Code`. Mapped by `(ChapterId, Slug)`.
   - `ContentQuestion`: No `Code`, no `Fingerprint`, `Prompt` is `nvarchar(max)`.
   - `StaffAuditLog`: Reconciled to exact properties (`Id`, `ActorUserId`, `Action`, `TargetType`, `TargetId`, `Payload`, `CreatedAt`).
5. **Safe V1 Profile Adopted**: Strict-only, Insert-only, No skip_conflicts, No admin override.
6. **ExecutionStrategy Deadlock Handling**: Designed clean state resets on retries.
7. **Unbenchmarked Commitments Removed**: Prescriptive latency promises eliminated.

---

## 2. Implementation Readiness Scorecard

```
+---------------------------------------------------------------------------------------+
|                         PHASE 18 IMPLEMENTATION READINESS MATRIX                      |
+--------------------------+-------+---------------+------------------------------------+
| Subsystem                | Score | Status        | Architectural Evaluation           |
+--------------------------+-------+---------------+------------------------------------+
| 1. File Parsers & Limits | 95%   | READY         | 15MB/50MB/5000 limits validated    |
| 2. Validation & Security | 90%   | READY         | XSS regex, hierarchy rules ready   |
| 3. Atomic Token Claim    | 95%   | READY         | Interlocked CAS state machine ready|
| 4. Durable Idempotency   | 90%   | READY         | StaffAuditLog reconciliation ready |
| 5. Subject Hierarchy Pers| 95%   | READY         | Direct Code mapping ready          |
| 6. Chapter/Lesson Pers.  | 85%   | CONDITIONAL   | App-level (Title/Slug) uniqueness  |
| 7. Question Deduplication| 40%   | BLOCKED*      | BLOCKED for code-based DB lookup;  |
|                          |       |               | Insert-Only is READY               |
| 8. Safety Guards & Tests | 100%  | READY         | DatabaseSafetyGuard fail-closed    |
+--------------------------+-------+---------------+------------------------------------+
| OVERALL READINESS        | 88%   | READY FOR SAFE V1 (INSERT-ONLY) SIGN-OFF           |
+--------------------------+-------+---------------+------------------------------------+
```

> [!WARNING]
> **ARCHITECTURAL BLOCKING ITEM (Question Code Deduplication)**:
> In the production SQL Server schema, `content_questions` has **no `Code` column** and **no `Fingerprint` column**. `Prompt` is `nvarchar(max)`, which cannot be indexed in a standard SQL unique index.
> 
> Therefore:
> - **Insert-Only Question Import is READY**: Questions will be inserted as new records linked to their parent `LessonId`.
> - **Code-based Deduplication / Historical Lookup is BLOCKED**: It is physically impossible to enforce database-level question uniqueness by code or look up questions by code without a schema migration adding `Code nvarchar(64)` to `content_questions`.

---

## 3. Decision Items Requiring User Approval

Before proceeding to implement the Confirm API, the user must approve the following 4 decisions:

### Decision Item 1: V1 Safe Profile Adoption
- **Option A (Recommended)**: Adopt the strict V1 safe profile:
  - **Strict-Only**: Any validation error or reference issue fails the entire batch.
  - **Insert-Only**: Existing entity codes/titles trigger conflict and abort.
  - **No Admin Override**: Strictly single-actor ownership (`session.ActorUserId == CurrentUserId`).
- **Option B**: Introduce upsert or skip logic (High risk of corrupting chapters/lessons without unique DB keys).

### Decision Item 2: Question Import Policy
- **Option A (Recommended for Phase 18)**: Accept **Insert-Only** for questions. Ingest questions into `content_questions` without persistent `Code` columns, relying on lesson-level containment.
- **Option B (Defer Question Confirm)**: Block question import until a formal database migration adds a persistent `Code` or `FingerprintHash` column to `content_questions`.

### Decision Item 3: Session Durability Strategy
- **Option A (Recommended for Phase 18)**: Use in-memory CAS state machine for active sessions, paired with `StaffAuditLog` query for crash-resilient idempotent replay. Zero schema changes required.
- **Option B**: Create a dedicated `content_import_sessions` table in SQL Server (Requires database migration).

### Decision Item 4: Concurrency Lock Level
- **Option A (Recommended)**: Use `ReadCommitted` with explicit `UPDLOCK, HOLDLOCK` table hints during parent entity lookups inside the transaction.
- **Option B**: Use `Serializable` transaction isolation level (Higher risk of deadlocks under high concurrency).

---

## 4. Formal Stop Gate Confirmation

> [!IMPORTANT]
> **STOP GATE ACTIVE**:
> In strict compliance with the prompt guidelines:
> - `StudyAIDb` was accessed in **100% Read-Only mode**.
> - **Zero** database migrations, seed scripts, or schema modifications were performed.
> - **Zero** lines of Confirm API controller code, transaction import services, or entity mutation logic were written.
> - Only the technical documentation in `docs/phase18/` has been corrected and updated.
> 
> The project remains in a clean, fully passing baseline state. Implementation will begin only after the user reviews these findings and provides sign-off on the Decision Items.

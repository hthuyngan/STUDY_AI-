# STUDY_AI — PHASE 18: PREVIEW SECURITY REVIEW
## Threat Modeling, Authorization Boundaries, Token Lifecycle, and State Drift

- **Workspace**: `D:\TN`
- **Repository**: `hthuyngan/STUDY_AI-`
- **Baseline Git SHA**: `ad8236ce01bebb0a086174b12a16e9db27a5d8c9`
- **Scope**: Security audit of `CurriculumImportController.cs` (Preview endpoint), Token Generation, Actor Binding, Session Storage, and Threat Vectors.

---

## 1. Executive Summary

The Preview endpoint (`POST /api/v1/content/import/preview`) is designed to be 100% read-only with zero database mutation. It parses the upload, performs validation against current database state, returns a preview summary, and stores a preview session identified by a cryptographic token for subsequent confirmation.

This security review models potential attack vectors, evaluates the actor-binding mechanism, analyzes cache lifecycle risks, and defines mitigation strategies required for the Confirm phase.

```
+-------------------------------------------------------------------------------+
|                            THREAT MODELING SUMMARY                            |
+--------------------------+-----------------+---------------+------------------+
| Threat Vector            | Vulnerability   | Severity      | Mitigation       |
+--------------------------+-----------------+---------------+------------------+
| Token Replay Attack      | Token re-use    | HIGH          | Single-use Burn  |
| State Drift (Time-lag)   | DB stale reads  | HIGH          | Tx Revalidation  |
| Distributed Cache Loss   | IMemoryCache    | MEDIUM        | DB/Redis Session |
| Actor Impersonation      | Token stealing  | HIGH          | Actor-Token Bind |
| Concurrent Race Import   | Simultaneous DB | HIGH          | Serializable Tx  |
| Memory Exhaustion (DoS)  | Large cache obj | MEDIUM        | Size/Rate Limits |
+--------------------------+-----------------+---------------+------------------+
```

---

## 2. Authentication & Authorization Boundaries

### 2.1 Role-Based Access Control (RBAC)
- `[VERIFIED FROM SOURCE CODE]` — `CurriculumImportController.cs:12`:
  ```csharp
  [Authorize(Roles = "content,admin")]
  [ApiController]
  [Route("api/v1/content/import")]
  public class CurriculumImportController : ControllerBase
  ```
- **Access Rule Matrix**:
  - `admin`: Full access to preview and confirm.
  - `content`: Content staff access to preview and confirm.
  - `teacher`: Rejected with `403 Forbidden` (Content creation is restricted to central staff/admin).
  - `learner`: Rejected with `403 Forbidden` (Enforced in unit & integration tests).
  - `anonymous`: Rejected with `401 Unauthorized`.

### 2.2 Actor Binding Architecture
- `[VERIFIED FROM SOURCE CODE]` — `CurriculumImportController.cs:39-40, 141-153`:
  ```csharp
  private string CurrentUserId => User.FindFirstValue(ClaimTypes.NameIdentifier) ?? User.FindFirstValue("sub") ?? string.Empty;
  private string CurrentUserEmail => User.FindFirstValue(ClaimTypes.Email) ?? User.Identity?.Name ?? "unknown@studyai.internal";
  ```
- Every preview session binds the exact `ActorId` and `ActorEmail` into the `CurriculumImportSessionDto`.
- **Security Invariant**:
  When `Confirm` is called, the system MUST verify:
  `session.ActorId == currentCaller.Id`
  *(Exception: An `admin` user may confirm a session initiated by `content` staff, but the audit log must preserve both the Originator Actor and the Confirming Actor).*

---

## 3. Token Generation & Session Lifecycle

### 3.1 Token Entropy & Structure
- `[VERIFIED FROM SOURCE CODE]` — `CurriculumImportController.cs:124`:
  ```csharp
  var previewToken = $"prev_{Guid.NewGuid():N}";
  ```
- Structure: Prefix `prev_` followed by 32 lowercase hexadecimal characters (128-bit RFC 4122 Version 4 UUID).
- Entropy: $2^{122}$ possible random values, mathematically immune to brute-force guessing or collision.

### 3.2 Cache Storage & Expiration
- `[VERIFIED FROM SOURCE CODE]` — Stored in `IMemoryCache`:
  ```csharp
  var expiresAt = DateTimeOffset.UtcNow.AddHours(1);
  _cache.Set($"import:preview:{previewToken}", session, new MemoryCacheEntryOptions
  {
      AbsoluteExpiration = expiresAt
  });
  ```
- Key format: `import:preview:prev_<32_hex_digits>`
- Absolute TTL: 1 hour (3600 seconds).

---

## 4. Threat Vectors & Detailed Risk Analysis

### 4.1 Threat 1: In-Memory Cache in Distributed / Multi-Replica Environment
- `[REAL RISK / VULNERABILITY IDENTIFIED]`:
  `IMemoryCache` resides in local process memory of the backend instance.
  - If STUDY_AI backend is scaled horizontally to 2+ pods or instances behind a load balancer, `POST /preview` may hit Pod A (caching the session), while the subsequent `POST /confirm` hits Pod B, resulting in `404 Not Found` (Token Expired or Invalid).
  - Similarly, an application pool recycle or pod restart discards all active tokens.
- **Architectural Solution**:
  For single-node development and CI integration tests, `IMemoryCache` is sufficient. For multi-node staging/production, session state must be backed by Redis distributed cache or a dedicated persistence table (`content_import_sessions`) in SQL Server.

### 4.2 Threat 2: State Drift (Time-to-Check vs Time-to-Use / TOCTOU)
- `[REAL RISK / VULNERABILITY IDENTIFIED]`:
  A preview token is valid for 1 hour. During that 1-hour window:
  - Another administrator may rename, archive, or delete a Subject or Chapter referenced by the batch.
  - Another batch may be imported, inserting entities with the same codes.
  - If `Confirm` blindly executes the actions planned at `Preview` time without re-validating the live database, foreign key errors, duplicate key violations, or corrupted hierarchies will occur.
- **Mitigation Requirement for Confirm Design**:
  The Confirm pipeline **must not trust the preview actions blindly**. It must execute a pre-commit verification query inside the database transaction to ensure prerequisites remain unchanged.

### 4.3 Threat 3: Replay Attack & Double Submission
- `[REAL RISK / VULNERABILITY IDENTIFIED]`:
  If a user double-clicks the "Confirm Import" button, or if network retries resend the HTTP request, two identical confirmation transactions could execute concurrently.
  - Thread 1 and Thread 2 both retrieve `session` from cache.
  - Both attempt to insert the same Subject and Chapter codes, causing database constraint collisions or duplicate entries.
- **Mitigation Requirement for Confirm Design**:
  Single-use atomic consumption:
  `_cache.Remove(tokenKey)` or an atomic flag exchange `Interlocked.CompareExchange` / distributed lock MUST be executed immediately upon entering Confirm, before initiating the database transaction.

### 4.4 Threat 4: Memory Exhaustion via Unbounded Cached Batches
- `[REAL RISK / VULNERABILITY IDENTIFIED]`:
  Each `CurriculumImportSessionDto` holds the full parsed object graph (`CurriculumImportBatchDto`). For a 5,000-question batch, the in-memory footprint can reach 5-10 MB per session.
  - If a malicious or runaway client submits 100 preview requests without confirming them, memory usage can balloon by 500MB - 1GB.
- **Mitigation Requirement**:
  1. Enforce rate limiting on `/preview` (e.g., maximum 5 preview requests per user per 10 minutes).
  2. Implement an eviction policy and maximum session limit per user (e.g. invalidate older preview tokens if the same user generates a new one).

---

## 5. Security Checklist for Confirm Import Phase

| Security Control | Required Mechanism | Responsible Layer |
|---|---|---|
| **Role Verification** | Require `content` or `admin` role | API Controller Filter |
| **Actor Binding** | Enforce caller ID == session Creator ID (unless Admin) | Service / Domain Logic |
| **Token Invalidation** | Atomic single-use token consumption (Burn-on-Confirm) | Cache / Session Manager |
| **Drift Detection** | Pre-transaction re-query of all referenced entity codes | Transaction Pipeline |
| **Transaction Boundary**| All-or-nothing rollback on any error | EF Core ExecutionStrategy |
| **Audit Trail** | Immutable record in `staff_audit_logs` | Infrastructure / DB |

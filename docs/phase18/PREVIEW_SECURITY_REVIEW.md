# STUDY_AI — PHASE 18: PREVIEW SECURITY REVIEW (CORRECTED SPECIFICATION)
## Threat Modeling, Atomic Claim, Crash Resilience, and Authorization Boundaries

- **Workspace**: `D:\TN`
- **Repository**: `hthuyngan/STUDY_AI-`
- **Status**: `[REVISED SECURITY REVIEW — V1 HARDENED SPECIFICATION]`
- **Scope**: Preview Endpoint Security, Token State Transitions, Crash Durability, and Concurrency Protections.

---

## 1. Executive Summary & Security Baseline

This security review hardens the threat model for the Curriculum Import pipeline. Specifically, it eliminates naive concurrency assumptions, explicitly designs crash-resilient idempotency, and establishes single-actor authorization invariants.

```
+---------------------------------------------------------------------------------------+
|                                REVISED THREAT MODEL MATRIX                            |
+--------------------------+-----------------------+----------+-------------------------+
| Threat Vector            | Vulnerability         | Severity | Hardened Mitigation     |
+--------------------------+-----------------------+----------+-------------------------+
| Check-then-Act Race      | TryGetValue + Remove  | HIGH     | Interlocked CAS State   |
| Process Crash on Commit  | IMemoryCache Volatile | HIGH     | Durable StaffAuditLog   |
| State Drift (TOCTOU)     | Pre-Tx DB verification| HIGH     | In-Transaction UPDLOCK  |
| Stolen Token Attack      | Token bearer misuse   | HIGH     | ActorUserId Binding     |
| Multi-Node Cache Miss    | Local RAM storage     | MEDIUM   | Persistent Session Store|
| Duplicate Submission     | Network retry drop    | HIGH     | Idempotent Outcome Replay|
+--------------------------+-----------------------+----------+-------------------------+
```

---

## 2. Authentication & Authorization Boundaries (V1 Policy)

### 2.1 Role Boundaries
- `[VERIFIED FROM SOURCE CODE]` — `CurriculumImportController.cs:12`:
  ```csharp
  [Authorize(Roles = "content,admin")]
  [ApiController]
  [Route("api/v1/content/import")]
  public class CurriculumImportController : ControllerBase
  ```
- **Access Rule Matrix**:
  - `admin`: Permitted to preview and confirm **own** sessions.
  - `content`: Permitted to preview and confirm **own** sessions.
  - `teacher`: Rejected with `403 Forbidden`.
  - `learner`: Rejected with `403 Forbidden`.
  - `anonymous`: Rejected with `401 Unauthorized`.

### 2.2 Strict Single-Actor Ownership (No Admin Override in V1)
In V1, to eliminate confusion over provenance and audit accountability:
- `session.ActorUserId` must **strictly match** `currentCaller.Id`.
- An administrator cannot confirm a preview created by a content staff member.
- If an administrator wishes to import the curriculum, they must upload the file and generate their own preview token.
- Violation triggers `403 Forbidden (ACTOR_MISMATCH)` without consuming or invalidating the token.

---

## 3. Atomic Token Claim vs Naive Check-Then-Act

### 3.1 The Vulnerability of `TryGetValue + Remove`
When multiple requests present the same `previewToken` concurrently (e.g., fast automated double-clicks or multiple tabs):
- `IMemoryCache.TryGetValue(key, out session)` returns `true` on Thread 1.
- Before Thread 1 executes `IMemoryCache.Remove(key)`, Thread 2 calls `IMemoryCache.TryGetValue(key, out session)` and also returns `true`.
- Both threads enter the transaction pipeline simultaneously.

### 3.2 The Solution: Atomic Compare-And-Swap (CAS)
The session manager must employ an atomic state transition:
```csharp
public enum SessionStatus
{
    Pending = 0,
    Claimed = 1,
    Committed = 2,
    Failed = 3
}

// Atomic claim: only one thread transitions 0 -> 1
int original = Interlocked.CompareExchange(ref session.StatusInt, (int)SessionStatus.Claimed, (int)SessionStatus.Pending);
if (original != (int)SessionStatus.Pending)
{
    if (session.Status == SessionStatus.Committed)
    {
        return ServeIdempotentResult(session.DurableResult);
    }
    return RejectConflict("TOKEN_IN_USE");
}
```

---

## 4. Crash Resilience & Durable Idempotency

### 4.1 Volatility of `IMemoryCache`
`IMemoryCache` resides exclusively in host RAM:
- If SQL Server commits the transaction, but the application pool recycles, the backend container restarts, or the OS crashes before the HTTP response is dispatched, `IMemoryCache` is completely wiped.
- A client retrying the request after the crash would find no token in cache and receive `404 Not Found`, erroneously assuming the import never took place.

### 4.2 Durable Reconciliation via `StaffAuditLog`
To guarantee crash durability without requiring new schema tables:
1. Every successful confirm transaction writes an immutable entry into `StaffAuditLog`:
   - `TargetType = "CurriculumImport"`
   - `TargetId = previewToken`
   - `Payload = JsonSerializer.Serialize(confirmResponse)`
2. During token lookup, if the token is not present in RAM, the system queries:
   ```csharp
   var auditLog = await _context.StaffAuditLogs
       .AsNoTracking()
       .FirstOrDefaultAsync(l => l.TargetType == "CurriculumImport" && l.TargetId == previewToken);
   ```
3. If an audit log exists, the system reconstructs the `200 OK` response with `isIdempotentReplay: true`. This guarantees **strict exactly-once semantics across application crashes**.

---

## 5. Token Policies Across Operational States

```
+--------------------------+-----------------------+---------------------------------------+
| Operational Event        | Intermediate State    | Final Token Disposition               |
+--------------------------+-----------------------+---------------------------------------+
| Normal Successful Commit | PENDING -> CLAIMED    | COMMITTED (Durable result recorded)   |
| Pre-Tx Validation Error  | PENDING -> CLAIMED    | PENDING (Restored for user correction)|
| Conflict (Entity Exists) | PENDING -> CLAIMED    | PENDING (Restored for user review)    |
| Actor Mismatch (403)     | PENDING               | PENDING (Unchanged)                   |
| Deadlock (Retried OK)    | PENDING -> CLAIMED    | COMMITTED (Succeeds on retry)         |
| Deadlock (Retries Fail)  | PENDING -> CLAIMED    | PENDING (Restored for retry)          |
| Unrecoverable DB Error   | PENDING -> CLAIMED    | FAILED                                |
| Server Crash Pre-Commit  | PENDING -> CLAIMED    | Rolls back in SQL; Re-import needed   |
| Server Crash Post-Commit | PENDING -> CLAIMED    | COMMITTED (Reconciled from AuditLog)  |
+--------------------------+-----------------------+---------------------------------------+
```

---

## 6. Security Review Conclusion

The revised design guarantees:
1. **No Concurrency Leaks**: Naive check-then-act replaced with atomic state machine.
2. **No Orphaned Replays**: Durable idempotency survives process crashes.
3. **No TOCTOU Window**: Drift revalidation moved 100% inside the transaction.
4. **Single-Actor Integrity**: Zero ambiguity over which human identity authorized the import.

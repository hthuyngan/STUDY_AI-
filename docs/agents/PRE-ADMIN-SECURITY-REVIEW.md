# Pre-Administrator Security Review — PR #28

Date: 2026-11-26 (Asia/Bangkok)  
Repository: `hthuyngan/STUDY_AI-`  
Previous checkpoint: `4c4aa382d3a5135c8b8425eea340cdcd56b274fb`  
Reported HEAD: `cbdba2ba6ea7ae1cf2e09b552bb7a8f5c353d712`  
Actual remote/PR HEAD reviewed: `cbdba2bac6f08d429f5d79f76400cdcd1bf844d5`  
Security verdict: **BLOCKED**  
FULL_AUTOMATION: **NOT_VERIFIED**

The reported full SHA does not identify the actual PR commit; only the first eight characters match. This review is bound to the exact remote/PR HEAD shown above.

No administrator setup was executed. No Windows account, Scheduled Task, ACL, global configuration, application code, P02 worktree, or database was changed. No SQL connection was opened.

## Blocking findings

### F-01 — P1 — Scheduled Task executes writer-modifiable code

The task action points directly to `Invoke-CodexReviewerWorker.ps1` inside the Git worktree (`scripts/agents/setup-reviewer-identity.ps1:147-150`). That worker dot-sources `agent-guard.ps1` from the same directory (`scripts/agents/Invoke-CodexReviewerWorker.ps1:14-15`). The setup does not copy these files and dependencies into a protected installation directory, verify hashes/signatures, or apply ACLs that deny the Antigravity/writer identity modification.

After provisioning, the writer can change either script and then trigger the Scheduled Task under the reviewer identity. This defeats the entire identity boundary and can turn the reviewer task into an arbitrary command runner.

Required remediation: install a versioned immutable worker bundle outside the repository, owned by Administrators/SYSTEM, deny writer modification/deletion/reparse rights, pin and verify dependency hashes in the task action, and refuse execution on any mismatch.

### F-02 — P1 — Reviewer identity is not bound to the provisioned SID

The worker accepts any SID that differs from the caller (`Invoke-CodexReviewerWorker.ps1:37-40`). It never loads or compares against the exact SID created during setup. `Test-CodexReviewerIdentityAvailable` likewise checks only that the named local user exists and differs from the current user (`agent-guard.ps1:992-1005`). Provenance validation again checks only “different SID” (`agent-guard.ps1:950-980`).

An incorrectly configured task, renamed/recreated account, or another non-admin identity can be accepted as the reviewer. The setup also accepts an existing account without verifying that it is enabled, non-admin, not a member of privileged groups, or the intended previously recorded SID (`setup-reviewer-identity.ps1:50-77`).

Required remediation: resolve and persist the exact reviewer SID during provisioning in an administrator-protected manifest; verify account group membership and task principal; require exact SID equality in worker startup, readiness checks and provenance validation.

### F-03 — P1 — Untrusted request permits traversal and reviewer-profile data access

The worker deserializes arbitrary request JSON without a strict schema (`Invoke-CodexReviewerWorker.ps1:31-34`). It validates only model and reasoning values, then trusts:

- `request_id` in output paths (`Invoke-CodexReviewerWorker.ps1:55,76,109-110`);
- `schema_path` (`Invoke-CodexReviewerWorker.ps1:54`);
- `working_dir` (`Invoke-CodexReviewerWorker.ps1:56,79`);
- `prompt_text` (`Invoke-CodexReviewerWorker.ps1:79`);
- `timeout_seconds` without a bounded range (`Invoke-CodexReviewerWorker.ps1:78`).

The writer therefore can request a working directory outside an approved immutable snapshot, use traversal in IDs, select arbitrary reviewer-readable schemas and instruct Codex to read reviewer-profile files. Read-only sandboxing does not prevent disclosure: data can be returned through the review output. Existing path/snapshot validation in the caller is not a security boundary because the Scheduled Task worker must treat IPC as hostile independently.

Required remediation: enforce a strict request schema in the worker; require a canonical GUID request ID; bound timeout; resolve and reject reparse points; accept only administrator-owned immutable snapshot directories and approved schema hashes; wrap rather than trust prompt text; reject access to reviewer profile, IPC roots and all paths outside the snapshot.

### F-04 — P1 — IPC setup and ACL claims are not fail-closed

Setup creates or reuses IPC paths before checking for junctions/reparse points (`setup-reviewer-identity.ps1:84-89`) and applies ACLs by pathname (`setup-reviewer-identity.ps1:91-120`). Existing malicious paths can redirect ACL changes. The base and child ACLs grant Administrators FullControl (`setup-reviewer-identity.ps1:94-96,103-104,114-115`); an elevated Antigravity process can therefore forge or replace reviews. There is no explicit writer-SID deny rule on `reviews`.

The request directory grants the writer Modify and reviewer Delete (`setup-reviewer-identity.ps1:100-109`) without an atomic request ownership/claim protocol. No real ACL integration test demonstrates that the writer cannot replace a pending request or modify/delete/reparse a completed response.

Required remediation: reject all pre-existing reparse points, create directories through handle-based safe APIs, apply and verify exact SDDL/owner/inheritance, explicitly deny the writer SID write/delete/ownership rights on results, use atomic request claiming, and test with real tokens for both accounts.

### F-05 — P1 — Provenance is an unsigned checksum and does not bind the review transaction

The code describes the metadata as “cryptographically signed / authenticated” (`Invoke-CodexReviewerWorker.ps1:94`), but it stores only an ordinary SHA-256 of the output (`Invoke-CodexReviewerWorker.ps1:95-106`). No signature, MAC, protected key, ACL owner validation or task identity attestation exists.

The provenance omits base SHA, head SHA, request JSON hash, schema hash and final review fields. `Test-ReviewFileProvenance` verifies only status, a different SID string and output hash (`agent-guard.ps1:970-987`); it does not require the expected reviewer SID or expected request ID. Old results can be replayed or paired with a different request if files can be written/replaced.

Required remediation: bind exact request ID, canonical request hash, base SHA, head SHA, snapshot hash/path, schema hash, reviewer SID and review content hash. Authenticate the envelope with a key or Windows primitive inaccessible to the writer, enforce one-time request state and reject already-consumed/replayed results.

### F-06 — P1 — Administrator setup is not safely idempotent or reversible

The script generates a password and discards it (`setup-reviewer-identity.ps1:59-73`), while `schtasks /create` supplies `/ru` but no `/rp` or supported passwordless logon configuration (`setup-reviewer-identity.ps1:149-151`). Successful non-interactive task registration and later execution are therefore not established. The task does not explicitly set a limited run level or a task security descriptor permitting the intended standard-user `/run` operation.

The script accepts an existing same-named account without validating or normalizing its privilege state (`setup-reviewer-identity.ps1:50-77`). Profile isolation targets the current elevated process profile rather than resolving `$MainUser`'s profile (`setup-reviewer-identity.ps1:127-135`), catches ACL failure as a warning, and still prints setup success (`setup-reviewer-identity.ps1:138,158`). Repeated execution may overwrite an existing task with changed paths. No rollback removes only created resources or restores exact prior ACL/task/account state.

Required remediation: use a supported task logon model and explicit limited run level; verify standard-user trigger permission; transactionally record every created/changed object; validate existing state exactly; resolve profiles by SID; abort and roll back on any ACL/task/auth failure; provide and test a safe rollback script that restores captured descriptors without deleting pre-existing resources.

### F-07 — P1 — Codex authentication and secret isolation are unproven

Setup never signs the reviewer account into Codex and correctly must not copy credentials. The readiness report always notes that reviewer-profile sign-in/quota remains unverified (`Test-DualAgentReadiness.ps1:46`). No actual reviewer-token test demonstrates that Codex can authenticate independently or that it cannot read the main user's profile, Git credentials, cloud credentials, connection strings or persistent database configuration.

The profile deny operation is not reliable evidence: it can target the wrong profile and failure is non-fatal (`setup-reviewer-identity.ps1:127-141`).

Required remediation: provide an explicit, user-controlled first-login/authentication procedure under the reviewer identity; verify only authentication status without exposing/copying tokens; run real negative access probes against canary files and credential stores; prove persistent database credentials are absent and inaccessible.

### F-08 — P1 — Timeout/concurrency/error paths are not integrated under real identities

The suspended Job Object implementation is reused by the worker, but there is no real Scheduled Task integration evidence for timeout, cancellation, concurrent requests, authentication failure or task overlap. The worker enumerates all request files (`Invoke-CodexReviewerWorker.ps1:25-27`) without an IPC lock/claim and deletes requests even on failure (`Invoke-CodexReviewerWorker.ps1:118-132`). Client timeout does not cancel the Scheduled Task or revoke the outstanding request (`agent-guard.ps1:1061-1082`), allowing a late result to remain and potentially be consumed/replayed.

Required remediation: implement atomic request claiming, single-instance enforcement, cancellation/tombstone state, bounded retry and late-result rejection. Exercise these paths using the actual Scheduled Task and both Windows SIDs.

## Mandatory check results

| # | Check | Result | Evidence |
|---:|---|---|---|
| 1 | Task executable/scripts immutable after provisioning | **FAIL** | Task points into writer-controlled repository (`setup-reviewer-identity.ps1:147-150`). |
| 2 | Exact expected non-admin SID | **FAIL** | Only SID inequality is checked (`Invoke-CodexReviewerWorker.ps1:37-40`). |
| 3 | IPC ACL anti-forgery/reparse protection | **FAIL** | No reparse check or real-token ACL test; Administrators retain FullControl. |
| 4 | Strict request/path/Git configuration validation | **FAIL** | Worker trusts request paths, prompt, ID and timeout. |
| 5 | Exact provenance and replay rejection | **FAIL** | Unsigned output hash omits SHAs/request hash and one-time state. |
| 6 | Independent Codex authentication | **NOT VERIFIED** | No reviewer profile/account exists locally and quota/auth is untested. |
| 7 | Main-user secret/database isolation | **NOT VERIFIED** | No real identity negative access test; profile deny is non-fatal. |
| 8 | Safe Scheduled Task permissions/no escalation | **NOT VERIFIED** | No real task exists; no `/rl`, task DACL or standard-user trigger test. |
| 9 | Timeout/tree/concurrency/auth failure fail-closed | **PARTIAL** | Unit Job Object behavior exists; Scheduled Task integration is untested. |
| 10 | Idempotent setup and safe rollback | **FAIL** | Existing resources are not fully validated; no transactional rollback procedure. |
| 11 | Simulation distinguished from Windows integration | **FAIL in project claims** | CI R08 uses literal fake SID strings and TEMP files (`Test-SafeAgentAdversarial.ps1:299-378`), not real users/ACLs/tasks. |
| 12 | CI on exact HEAD | **PASS, limited scope** | Pull-request run `45753061045` passed PS 5.1/7 at actual HEAD; it does not provision or test Windows identities/ACLs. |

## Evidence executed

- Verified branch and PR remote HEAD: `cbdba2bac6f08d429f5d79f76400cdcd1bf844d5`.
- Read-only `Test-DualAgentReadiness.ps1`: `BLOCKED`; reviewer account absent, IPC absent, task absent, automation disabled, reviewer authentication/quota unverified.
- GitHub Actions pull-request run: <https://github.com/hthuyngan/STUDY_AI-/actions/runs/45753061045>, exact actual HEAD, PS 5.1 and PS 7 jobs successful.
- CI logs: smoke `12/12 PASS`, adversarial `54/54 PASS`. R08 cases use fabricated SID strings and ordinary TEMP files; they are unit/simulation evidence only.
- No administrator setup, Windows mutation, application suite or database operation was executed.

## Final decision

**BLOCKED. Do not run `setup-reviewer-identity.ps1` as Administrator.**

FULL_AUTOMATION is **NOT_VERIFIED**. The current code does not establish a trustworthy reviewer boundary and could grant the writer effective code execution under the reviewer identity after provisioning.


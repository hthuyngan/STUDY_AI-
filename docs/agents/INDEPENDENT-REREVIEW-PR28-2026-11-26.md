# Independent Targeted Re-review — PR #28

Date: 2026-11-26 (Asia/Bangkok)  
PR: `hthuyngan/STUDY_AI-#28`  
Previous reviewed HEAD: `8385b10a0216b42f435c9a4668f89bda687914fe`  
Remediation HEAD reviewed: `2cc3b395f3c80e1eb899d499ead2ebdcd0b11048`  
Review branch: `codex/pr28-independent-rereview`  
Overall verdict: **BLOCKED**

This review covers only the remediation delta and directly related bridge dependencies. No application suite, SQL connection, migration, seed, `StudyAIDb`, or `StudyAIDb_E2E` operation was executed.

## Decision summary

| Area | Verdict | Reason |
|---|---|---|
| Core Bridge Security | **BLOCKED** | Ownership manifests/cache artifacts remain forgeable by the writer; child filesystem credential access is not isolated; Job Object assignment has a process-creation race. |
| ECO readiness | **BLOCKED** | The executable router is optional and no trusted entrypoint requires pre/post routing checks. |
| STANDARD readiness | **BLOCKED** | Native worker invocation is not forced through `Enter-WorkerLock`; router/review/test acceptance can be bypassed. |
| ADVANCED readiness | **BLOCKED** | ADVANCED remains enabled despite the acknowledged single-writer enforcement gap. |
| PowerShell compatibility | **BLOCKED** | PS 5.1 adversarial tests pass; PS 7 fails in lock timestamp parsing. |
| MCP readiness | **PARTIAL** | Codex declares plugins disabled and allocates no MCPs, but the end-to-end enforcement boundary was not independently demonstrated at this HEAD. |
| Integration readiness | **BLOCKED** | No Safe Agent Bridge GitHub Actions run exists for the exact HEAD; local clean-environment smoke tests fail. |

## Finding closure matrix

| ID | Previous severity | Fix commit | Source evidence | Regression/runtime evidence | Status | Remaining risk |
|---|---:|---|---|---|---|---|
| R01 | P1 | `f301ec7b` | `Parse-SqlConnectionStringStrict` and the exact `StudyAIDb_Clean_{Guid:N|D}` allowlist reject the previously demonstrated name/quoting bypasses. `Assert-DatabaseOwnershipManifest` trusts unsigned JSON in a caller/environment-selected directory; ownership enforcement is optional in normal `Assert-DatabaseSafety` calls. | PS 5.1 name tests pass. The test itself creates an arbitrary manifest and token and is then accepted, demonstrating no authoritative ownership provenance. | **PARTIAL** | A writer can mint a matching manifest/token or disable ownership enforcement and pass the guard. |
| R02 | P1 | `f301ec7b` | Repo-scoped file locking, PID start time and invariant timestamps were added. `Enter-WorkerLock` is never called by an executable orchestration entrypoint; native `invoke_subagent` has no lock hook. Router and reviewer locks do not enforce Orchestrator/Worker mutual exclusion. | PS 5.1 concurrency cases pass. PS 7 fails while reading the synthetic stale lock timestamp. | **OPEN** | Parallel/native workers and Orchestrator writes can bypass the lock entirely; STANDARD/ADVANCED are not fail-closed. |
| R03 | P1 | `f301ec7b` | Child environment is rebuilt from an allowlist. It still receives `USERPROFILE`, `APPDATA`, `LOCALAPPDATA`, `CODEX_HOME`, `PATH` and system Git configuration. The host has Git Credential Manager configured. | Canary environment variables are absent in the child. No test proves isolation from filesystem credential stores or Git credential helpers. | **PARTIAL** | Read-only Codex can still reach user-scoped credential/config stores beyond the intended Codex authentication boundary. |
| R04 | P1 | `f301ec7b` | A Windows Job Object with `KILL_ON_JOB_CLOSE` was added. The process is started first and assigned afterward (`Process.Start()` then `AssignProcess`), without suspended creation. | PS 5.1 parent/child fixture passes once; it does not force a descendant to escape during the start/assignment window. | **PARTIAL** | A fast child can be created before job assignment and escape timeout/cancellation cleanup. |
| R05 | P1 | `f301ec7b` | Full 40-character SHA equality and ancestry checks were added for plan/review paths. Review cache entries remain unsigned/predictable files in user-writable TEMP. `route-task.ps1` does not validate test summaries against `test-summary-schema.json`. | Exact SHA negative cases pass on PS 5.1. No cache-forgery, cache-lineage, unresolved-finding carry-forward, or malformed test-summary adversarial case exists. | **PARTIAL** | The implementation writer can pre-seed a structurally valid PASS cache for known SHAs; incomplete test artifacts may be accepted. |
| R06 | P1 | `57bff265` | `route-task.ps1` implements useful route and completion checks, but no trusted executable wrapper calls it before delegation and after completion. Documentation explicitly relies on Orchestrator discipline. | Standalone ECO/security/scope tests pass on PS 5.1. They do not demonstrate mandatory workflow integration or bypass resistance. | **OPEN** | A caller can invoke the worker/reviewer directly, skip routing/approval/gates, or continue using enabled ADVANCED mode. |
| R07 | P1 | `f301ec7b` | Artifact path canonicalization, reparse checks and snapshot pre/post checks were added. Codex arguments are still assembled as one string; repo-controlled `model`/reasoning values are interpolated without strict enum validation, including a `cmd.exe` fallback. | Path traversal and path metacharacter cases pass on PS 5.1. No hostile config/argument injection or junction race test exists. | **PARTIAL** | Malicious or malformed config can alter Codex CLI arguments; check/use races remain possible after path validation. |
| R08 | P1 | `57bff265`, `2cc3b395` | Attempt state is written through temporary files, but the dedicated workflow is not registered/running on PR #28. Documentation claims pending PS 7 evidence. | GitHub shows only application CI checks for exact HEAD. Clean TEMP smoke fails because `UsageMetrics_Recorded` assumes a pre-existing file. PS 7 adversarial suite fails at timestamp parsing. | **OPEN** | No exact-HEAD bridge CI evidence, non-hermetic smoke result, and no PS 7 compatibility. |

## Verified runtime evidence

### PowerShell 5.1

- `Test-SafeAgentAdversarial.ps1`: **34/34 PASS** in an isolated TEMP directory.
- `Test-SafeAgentBridge.ps1 -SkipLiveCodex`: **FAIL** (`UsageMetrics_Recorded`) in an isolated clean TEMP directory.

### PowerShell 7.6.9

- Initial bridge run encountered a pre-existing legacy lock and failed closed.
- In an isolated TEMP directory, bridge smoke reached **11 PASS / 1 FAIL**; `UsageMetrics_Recorded` failed because no live Codex call had created `usage.jsonl`.
- `Test-SafeAgentAdversarial.ps1`: **FAIL** after `R02_RealTwoProcessConcurrency`; stale lock parsing raised `CONCURRENT_EXECUTION_BLOCKED: ... invalid timestamp`. `ConvertFrom-Json` materializes ISO timestamps differently in PS 7, and the subsequent string conversion is culture-dependent.

### GitHub Actions

- Exact PR HEAD and remote branch were verified as `2cc3b395f3c80e1eb899d499ead2ebdcd0b11048`.
- PR checks contain frontend and two backend application jobs only.
- GitHub reports no registered workflow named `Safe Agent Bridge CI`; therefore there is no PS 5.1/PS 7 bridge matrix evidence attached to this HEAD.

## Blocking findings

1. **P1 — Enforcement can be bypassed:** neither worker locking nor adaptive routing is mandatory in an executable entrypoint. ADVANCED is enabled even though single-writer enforcement is explicitly acknowledged as unavailable for native subagents.
2. **P1 — Trust artifacts are forgeable:** database ownership manifests and review cache files have no authoritative creator binding, signature, secure ACL boundary, or atomic owner registration.
3. **P1 — PowerShell 7 incompatibility:** lock timestamp handling fails under the required PS 7 matrix.
4. **P1 — Process-tree race:** Codex starts before Job Object assignment, leaving a descendant escape window.
5. **P1 — Secret boundary incomplete:** environment isolation is improved, but filesystem credential stores and Git Credential Manager remain reachable through inherited profile/path boundaries.
6. **P1 — Argument/config injection remains untested and insufficiently constrained:** repo-controlled CLI option values are interpolated into one argument string.
7. **P1 — Required bridge CI evidence is absent:** the added workflow has not executed for the reviewed SHA, and clean-environment smoke is currently failing.

## Acceptance condition for the next review

Keep all modes disabled until the core P1 findings above are resolved. If native worker locking cannot be made mandatory, ship a restricted executable entrypoint that permits only provably safe ECO/STANDARD operations and rejects ADVANCED before any worker starts. Re-review must use a clean TEMP directory on both Windows PowerShell 5.1 and PowerShell 7 and must include exact-HEAD GitHub Actions evidence.


# PR #28 — Remaining Remediation Prompt

Remediate only the open/partial findings in `docs/agents/INDEPENDENT-REREVIEW-PR28-2026-11-26.md`. Do not change StudyAI application code, global configuration, or any database.

Required outcomes:

1. Provide one trusted executable orchestration entrypoint that always performs route validation before delegation, obtains a repo-wide single-writer lock before any writer starts, and performs completion validation afterward. Direct/native worker paths must fail closed. If this cannot be enforced, disable ADVANCED executably and document the restricted ECO/STANDARD boundary.
2. Bind disposable database ownership to an authoritative, atomically created run record that an implementation worker cannot self-mint or replace. Ownership verification must be mandatory whenever a database connection variable exists.
3. Isolate the Codex child from filesystem credential stores and Git credential helpers while preserving only the explicitly required Codex authentication material. Add tests that inspect accessibility without printing secret values.
4. Eliminate the process-start/Job Object assignment race by creating the process suspended (or an equivalent race-free mechanism), assigning it to the Job Object, then resuming it. Test an immediate child/grandchild spawn plus timeout/cancellation and lock release.
5. Protect review cache and state provenance against pre-seeding/tampering by the implementation writer. Validate every artifact, including `TEST-SUMMARY.json`, against its full schema and exact SHA lineage. Add unresolved-finding carry-forward tests.
6. Replace the string-built Codex command line with a safe argument-list API or strictly validate every interpolated config value. Test hostile model/reasoning/config values and the `codex.cmd` fallback.
7. Fix PowerShell 7 timestamp handling and make all suites hermetic. `-SkipLiveCodex` must not require a pre-existing usage file; it must skip or deterministically create/verify its own fixture.
8. Ensure the dedicated Safe Agent Bridge workflow actually runs for the PR exact HEAD on both `powershell` and `pwsh`. Do not claim PASS from application CI or from a workflow file that has no run.

Mandatory evidence for the next independent re-review:

- Clean-TEMP Windows PowerShell 5.1 bridge + adversarial logs.
- Clean-TEMP PowerShell 7 bridge + adversarial logs.
- Negative tests for router bypass, native worker lock bypass, manifest forgery, cache pre-seeding, credential-helper access, Job Object assignment race, malformed test summary, stale findings and argument injection.
- GitHub Actions URLs tied to the exact remediation HEAD.
- Updated closure matrix with no unsupported `FIXED` claim.

Do not merge PR #28. Do not run application suites, SQL, migrations, seed, `StudyAIDb`, or `StudyAIDb_E2E` as part of this remediation.

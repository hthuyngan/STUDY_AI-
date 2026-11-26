# Antigravity Final Security Fix Prompt — PR #28

Remediate only the blocking findings in `docs/agents/PRE-ADMIN-SECURITY-REVIEW.md`. Do not run administrator setup, create accounts/tasks, alter ACLs/global configuration, touch P02, or access any database during implementation.

## Mandatory changes

1. Install the Scheduled Task worker and every sourced dependency into a versioned administrator-owned directory outside the repository. Apply verified ACLs denying the writer modification, replacement, deletion, ownership and reparse rights. Pin hashes and fail closed if any installed file changes.
2. During provisioning, resolve and record the exact reviewer SID in an administrator-protected manifest. Reject existing accounts that are disabled, privileged, or members of administrative/operator groups. Require exact SID equality in the worker, readiness checks and provenance verification.
3. Define and enforce a strict IPC request schema inside the reviewer worker. Require a canonical GUID request ID; full base/head SHAs; bounded timeout; canonical approved snapshot and schema paths; no reparse points; exact immutable snapshot verification; no arbitrary working directories or access outside the snapshot.
4. Redesign IPC using safe creation and exact SDDL/owner validation. Reject pre-existing junctions/symlinks. Add atomic request claiming, single-instance processing, cancellation/tombstones and late/replay rejection. Explicitly prevent the writer SID from writing/deleting response artifacts, including when the writer account belongs to Administrators.
5. Replace the unsigned checksum claim with authenticated provenance. Bind request ID, canonical request hash, base SHA, head SHA, snapshot identity, schema hash, exact reviewer SID and review result/content hash. Use a Windows-backed signing/MAC mechanism or another key boundary inaccessible to the writer.
6. Make setup transactional and idempotent. Use a supported non-interactive Scheduled Task logon model with explicit limited run level and a task DACL that permits intended invocation without modification/escalation. Resolve the main-user profile by SID. Treat every ACL/task/auth failure as fatal and roll back only changes made by that run.
7. Add a safe rollback script that restores captured ACLs/task/account state and never deletes or weakens pre-existing resources it did not create.
8. Provide an explicit reviewer-profile Codex sign-in procedure that does not copy credentials. Verify authentication/quota and prove the reviewer cannot read main-user canary secrets, credential stores, SSH/cloud/Git material, connection strings or persistent database configuration.
9. Add real Windows integration tests, separate from unit simulations, covering exact SIDs, account privilege, installed-file immutability, task principal/run level/DACL, IPC ACL access matrix, reparse attacks, request replacement, provenance forgery/replay, timeout/process tree, concurrency, cancellation and authentication failure.
10. Keep `automatedCodexEnabled=false` and FULL_AUTOMATION unverified until an independent reviewer observes these real integration tests. Do not represent fake SID strings or TEMP-directory tests as Windows identity/ACL validation.

The next review must be tied to a full exact SHA, include CI URLs for that SHA, and provide file:line plus real Windows SID/ACL evidence. Do not merge PR #28 or instruct the user to run Administrator setup until the verdict is `SAFE_TO_PROVISION`.

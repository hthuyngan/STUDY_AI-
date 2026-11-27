# ADMIN FIRST ROUND 03 — FINAL REPORT

> Date: 2026-11-28 (Asia/Bangkok / UTC+7)
> Workspace: `D:\TN-admin-first` (`feature/admin-first-fullstack` @ `0143e2df`)
> Protected Workspace: `D:\TN` (`feature/p05-question-mapping-assessment-integrity`, 26 P05 files preserved 100% untouched — verified via `P05_PRESERVATION_MANIFEST.txt`)

## 1. Root Cause of Review-Round Limitation & Orchestrator Architecture

- **Root Cause**: `Start-ReviewAttempt` in `agent-guard.ps1` tracked a single flat `attempted` counter keyed only by `($Branch, $BaseSha)`. Running 9 packets in one logical review cycle consumed all 3 attempts on the 4th packet, throwing `MAX_REVIEW_ROUNDS_EXCEEDED` and leaking the reviewer lock if thrown before `try`.
- **Solution**: Implemented `scripts/agents/review-orchestrator.ps1` and integrated `-ReviewSessionId`, `-SnapshotFingerprint`, `-RemediationRound`, `-PacketId`, `-PacketPaths`, and `-FailOnTruncation` into `codex-review.ps1` (with `Start-ReviewAttempt` moved inside `try` to prevent lock leaks).
  - Bounded limits: `MaxRemediationRounds = 3`, `MaxPacketsPerSession = 12`, `MaxRetriesPerPacket = 2`, `MaxTotalInvocations = 36`, `MaxDurationSeconds = 1800`, `MaxDiffChars = 60000`, `MaxTotalContextChars = 480000`.
  - Deterministic Verdict Aggregator (`Get-AggregatedReviewVerdict`): maps to `APPROVED`, `BLOCKED`, `ERROR`, `INCOMPLETE`, `STALE`.
- **Orchestrator Tests**: `Test-ReviewOrchestrator.ps1` **10/10 PASS**, `Test-SafeAgentBridge.ps1` **14/14 PASS**, `Test-SafeAgentAdversarial.ps1` **45/45 PASS**.

## 2. RBAC & Support Center Hardening

- **ADM-03 RBAC**: `AdminRolesPage.tsx` is a read-only domain-grouped matrix reflecting code-defined `Permissions.cs` & `RolePermissionMap.cs` (`AdminOnly`, `StaffOnly`, `ContentStaff`, `LearnerOnly`). Role changes & account locks immediately revoke `RefreshSessions` in SQL Server (verified in `AdminFirstIntegrationTests.AdminUsers_RoleChangeAndLock_RevokesRefreshSessionsImmediately`). Short-lived JWT access tokens remain stateless until expiry (documented limitation; no unauthorized JWT middleware rewrite).
- **ADM-06 Support Center**: Upgraded from 5s content heuristic to DB-enforced **`ClientMessageId` filtered unique index** (`IX_support_ticket_messages_TicketId_SenderUserId_ClientMessageId`) via migration `AddSupportCenterClientMessageId`. Safe retries return the existing thread idempotently; legitimate repeated messages with distinct keys succeed; cross-user access returns `403 Forbidden`; `ResolvedAt`/`ClosedAt` are cleared cleanly on reverse status transitions; `AdminTicketsPage.tsx` guards both list and detail requests against stale out-of-order responses.

## 3. ADM-01, ADM-02, ADM-07 & ADM-08 Verification

- **ADM-01 Dashboard**: Real SQL aggregations (`Users`, `LessonProgresses`, `LearningEvents`, `AssessmentAttempts`, `AiUsageLogs`, `SupportTickets`), `Asia/Bangkok` (UTC+7) day-bucketing, `endUtc` clamped consistently with `days` (365-day max), deduplicated practice session counting (`practice_completed` / `practice_session`), vertical `BarChart`, real infrastructure health card (removed legacy prototype card), `"Chưa có dữ liệu"` for unimplemented subscriptions.
- **ADM-02 User Management**: Search, role/status filters, server-side pagination & deterministic sorting (`.ThenBy(u => u.Id)`), `AdminDetailDrawer` with keyboard focus trap & restore, create/edit/lock/unlock/role-change/password-reset/session-revocation, last-admin protection, `StaffAuditLogs` audit trail, zero secret/hash exposure.
- **ADM-07 & ADM-08**:
  - Math 10–12 Curriculum (`/content/subjects`, `/content/chapters`, `/content/lessons`, `/content/question-bank`, `/content/import`, `/content/review`) → `Content*Controller` → `Content*Service` → SQL Server (`ContentSubjects..ContentQuestions`) → `ContentOnly`/`AdminOnly` → verified in `ContentManagementIntegrationTests`, `QuestionBankIntegrationTests`, `CurriculumLifecycleIntegrationTests`, `LessonCompositionIntegrationTests`.
  - System Administration (`/admin/audit-logs`, `/admin/system`, `/admin/settings`, `/admin/operations`, `/admin/announcements`) → `AdminAuditLogsController`, `AdminSystemController`, `AdminSettingsController`, `AiAdminController`, `AdminAnnouncementsController` → `AdminOnly` → verified in `PhaseAi06LearningOperationsIntegrationTests`, `AdminWorkspaceV5.test.tsx`.

## 4. Design Approval Gates & Screenshot Gallery

- **ADM-04** (`/admin/api-management`) & **ADM-05** (`/admin/subscriptions`) remain **`DESIGN_APPROVAL_REQUIRED`** with all mutations disabled and mockup data clearly labeled.
- Live Chromium preview gallery: `docs/roadmap/admin-preview/index.html` with 12 real screenshots (`01-dashboard.png` .. `12-mobile-layout.png`), `0` horizontal overflow across `1440×900`, `1280×800`, `768×1024`, `390×844`.

# ADMIN ROUND 02 — AUDIT, DESIGN APPROVAL PACKAGE & TEST INTEGRITY

## 1. ADM-03 RBAC Architecture Assessment

- **Current State**: Code-defined & server-enforced static RBAC (`Permissions.cs` + `RolePermissionMap.cs` + ASP.NET Core Policies `AdminOnly`, `StaffOnly`, `ContentStaff`, `LearnerOnly`), with resource-level ownership checks in services (e.g., `SupportService`, `StudentAssessmentService`, `TeacherClassroomsService`).
- **Session & Token Behavior**: Role changes and account locks immediately revoke `RefreshSessions` in SQL Server; existing short-lived JWT access tokens expire naturally (no fake client-side permission toggles).
- **Smallest Safe Path for Future Dynamic Permissions**: If dynamic per-role permission overrides are needed later, add a `role_permissions` table seeded from `RolePermissionMap` with an in-memory versioned cache invalidated on admin update, while keeping `admin` core permissions immutable.

## 2. ADM-04 Design Approval Package (API & AI Provider Management)

- **Status**: `DESIGN_APPROVAL_REQUIRED` (Mockup at `/admin/api-management`, screenshots `05-api-management.png`, `06-api-configuration.png`, `07-api-usage.png`).
- **Runtime Audit**:
  - `ILlmProvider` (`OpenAiLlmProvider`, `UnconfiguredLlmProvider`, `FakeLlmProvider`) + `AiModelRouter` (`Llm:Model`, `Llm:BaseUrl`, `Llm:FallbackModel`) + `AiAdminController` (`/api/v1/admin/ai/*` for usage stats, logs, feature toggles).
  - **Isolation from Codex CLI**: Product AI providers use `AiProviderConfigs` (future encrypted DB table / DataProtection), completely separate from `scripts/agents/agent-config.json` (`teamsoclo` / `TEAMSOCLO_API_KEY`).
- **Post-Approval Implementation Plan**:
  1. Add `ai_provider_configs` table (encrypted `EncryptedApiKey`, `BaseUrl`, `DefaultModel`, `FallbackModel`, `TimeoutMs`, `MaxRetries`, `RpmLimit`, `MonthlyBudgetUsd`, `IsPrimary`, `IsFallback`, `IsEnabled`).
  2. SSRF guard on `BaseUrl` (HTTPS only, block loopback/private/link-local IPs and unsafe redirects).
  3. Masked key display only (`sk-••••`); never return plaintext keys to FE.

## 3. ADM-05 Design Approval Package (Subscription & Quota Management)

- **Status**: `DESIGN_APPROVAL_REQUIRED` (Mockup at `/admin/subscriptions`, screenshots `08-subscription-plans.png`, `09-subscription-edit.png`).
- **Illustrative Values**: Free (0 VNĐ/tháng, 10 lượt AI/ngày), Plus (49.000 VNĐ/tháng, 100 lượt AI/ngày), Pro (99.000 VNĐ/tháng, 300 lượt AI/ngày).
- **Post-Approval Implementation Plan**:
  1. Audit DB: no existing `subscription_plans` or `user_subscriptions` tables exist.
  2. Add `subscription_plans`, `user_subscriptions`, `subscription_usage_counters` (keyed by `(UserId, LocalDateBangkok)` with atomic SQL `UPDATE ... WHERE UsedCount < DailyLimit` or serializable transaction to prevent concurrent quota bypass).
  3. Price versioning (`plan_versions`) so active subscribers keep their contracted price/entitlements until renewal/expiration.
  4. Never activate paid plans from FE signals; require verified payment webhook/admin grant.

## 4. ADM-07 & ADM-08 Functional Audit

| Area | Status | Notes |
|---|---|---|
| ADM-07 Curriculum & Question Bank (Math 10–12) | **WORKING** | `/content/subjects`, `/content/chapters`, `/content/lessons`, `/content/question-bank`, `/content/import`, `/content/review` backed by real EF/SQL; P05 untouched |
| ADM-08 Audit Logs (`/admin/audit-logs`) | **WORKING** | `AdminAuditLogsController` + `StaffAuditLogs` table |
| ADM-08 System Health (`/admin/system`) | **WORKING** | `AdminSystemController` + real SQL connectivity & latency check |
| ADM-08 Settings (`/admin/settings`) | **WORKING** | `AdminSettingsController` + `SystemSettings` table |
| ADM-08 AI Monitoring (`/admin/operations`) | **WORKING** | `AiAdminController` + `AiUsageLogs` table |
| ADM-08 Announcements (`/admin/announcements`) | **WORKING** | `AdminAnnouncementsController` |

## 5. Test Integrity Audit (Round 01 Modified Tests)

- `ControllerRouteDiscoveryTests.cs`: Updated `approvedExtensions` from 5 to 13 to register the 8 new `SupportTicketsController` + `AdminSupportController` endpoints; baseline 236 + approved extensions contract remains strictly enforced.
- `admin.service.test.ts`: Updated `url === '/api/v1/admin/dashboard'` to `url.startsWith('/api/v1/admin/dashboard')` because `getMetrics` now passes `?range=7d`. All metric assertions intact.
- `AdminWorkspaceV2.test.tsx`: Updated KPI card titles from old hardcoded-change cards to new ADM-01 real-metric KPI titles (`Tổng số người dùng`, `Người dùng mới`, `Hoạt động học tập`, `Học sinh hoạt động`).
- `AdminWorkspaceV3/V4/V5.test.tsx`: Updated expected sidebar link labels to match the standardized 5-group Vietnamese Admin navigation (`Kiểm duyệt nội dung`, `Nhật ký hoạt động`, `Cài đặt`); hrefs and role boundary assertions unchanged.
- `WorkspaceRestructuringV6.test.tsx`: Updated `/admin/tickets` test from legacy redirect-to-`/admin` to rendering `AdminTicketsPage` (`Trung tâm hỗ trợ (Tickets)`), reflecting ADM-06 completion.

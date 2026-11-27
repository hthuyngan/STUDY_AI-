# ADMIN API CONTRACTS

> Base prefix: `/api/v1/admin` (Authorization: `AdminOnly` policy unless noted for user-facing Support endpoints).

## 1. ADM-01 Dashboard & Analytics

### `GET /api/v1/admin/dashboard`
- **Query**: `range` (`7d` | `30d` | `90d` | `custom`), `from` (ISO-8601 date, optional), `to` (ISO-8601 date, optional), `tz` (default `Asia/Bangkok`).
- **Response (`200 OK`)**:
  - `metrics`:
    - `totalUsers`, `newUsersInRange`, `activeLearnersInRange`, `activeUsers`, `suspendedUsers`, `disabledUsers`
    - `learnersCount`, `teachersCount`, `contentCount`, `supportCount`, `adminsCount`, `staffAccounts`
    - `completedLessonsTotal`, `practiceSessionsInRange`, `assessmentAttemptsInRange`
    - `aiRequestsInRange`, `aiTotalTokensInRange`, `aiErrorCountInRange`, `aiErrorRatePercent`
    - `openSupportTicketsCount` (real count or `null` if module unavailable)
    - `subscriptionsModuleAvailable` (`false` until ADM-05 approved & implemented), `activeSubscriptionsCount` (`number | null`), `actualRevenueVnd` (`number | null`)
    - `systemStatus`, `timezone` (`"Asia/Bangkok"`), `rangeStartUtc`, `rangeEndUtc`
  - `recentActivities`: latest 15 `StaffAuditLogs` (batch-resolved actor names, zero N+1)
  - `attentionItems`: suspended/disabled users, pending review lessons, open high-priority tickets

### `GET /api/v1/admin/analytics`
- **Query**: `range` (`7d` | `30d` | `90d` | `custom`), `from`, `to`
- **Response (`200 OK`)**:
  - `trends`: daily buckets (`date`, `activeUsers`, `newUsers`, `completedLessons`, `practiceSessions`, `assessmentAttempts`, `aiRequests`, `aiTokens`, `aiErrors`) — computed via grouped SQL queries (no per-day loop N+1).
  - `roleDistribution`: `learner`, `teacher`, `content`, `support`, `admin`
  - `statusDistribution`: `active`, `pending`, `suspended`, `disabled`

## 2. ADM-02 User Management

- `GET /api/v1/admin/users?role=&status=&search=&sortBy=createdAt&sortDir=desc&page=1&pageSize=20&includeDeleted=false`
- `GET /api/v1/admin/users/{userId}`
- `POST /api/v1/admin/users` (validates email uniqueness, password policy, allowed role/status; writes `StaffAuditLog`)
- `PATCH /api/v1/admin/users/{userId}` (last-admin protection, audit log)
- `PATCH /api/v1/admin/users/{userId}/role` (last-admin & self-demotion protection, revokes refresh sessions, audit log)
- `PATCH /api/v1/admin/users/{userId}/status` (last-admin & self-lock protection, revokes refresh sessions on lock, audit log)
- `POST /api/v1/admin/users/{userId}/reset-password` (never returns password hash/token in production response if email/reset-request flow, or returns temporary reset indicator safely; writes audit log)
- `POST /api/v1/admin/users/{userId}/revoke-sessions`
- `DELETE /api/v1/admin/users/{userId}` (soft delete, last-admin & self-delete protection)

## 3. ADM-03 Roles & Permissions

- `GET /api/v1/admin/roles`: returns canonical roles (`admin`, `teacher`, `content`, `support`, `learner`), Vietnamese labels, descriptions, permission keys, and `isCoreProtected` flag.

## 4. ADM-06 Support Center

### User-facing (`/api/v1/support/tickets`, `[Authorize]`)
- `GET /api/v1/support/tickets?status=&category=&page=1&pageSize=20` — strictly scoped to `CurrentUserId`.
- `GET /api/v1/support/tickets/{id}` — returns `403 Forbidden` if `ticket.UserId != CurrentUserId` (and not admin/support).
- `POST /api/v1/support/tickets` — creates ticket (`OPEN`), validates category (`ACCOUNT`, `TECHNICAL`, `AI_TUTOR`, `LEARNING_CONTENT`, `SUBSCRIPTION`, `OTHER`), subject, message.
- `POST /api/v1/support/tickets/{id}/messages` — user replies to own ticket; if `WAITING_FOR_USER`, transitions to `OPEN` or `IN_PROGRESS`.

### Admin-facing (`/api/v1/admin/support/tickets`, `[Authorize(Policy="AdminOnly")]`)
- `GET /api/v1/admin/support/tickets?status=&category=&priority=&search=&assignedTo=&page=1&pageSize=20`
- `GET /api/v1/admin/support/tickets/{id}`
- `PATCH /api/v1/admin/support/tickets/{id}` — update status (`OPEN`, `IN_PROGRESS`, `WAITING_FOR_USER`, `RESOLVED`, `CLOSED`), priority (`LOW`, `MEDIUM`, `HIGH`, `URGENT`), category, `assignedToUserId`; enforces valid state transitions and writes `StaffAuditLog`.
- `POST /api/v1/admin/support/tickets/{id}/messages` — admin reply, optional status transition, writes `StaffAuditLog`.

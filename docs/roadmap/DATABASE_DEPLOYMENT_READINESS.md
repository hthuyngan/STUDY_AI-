# DATABASE DEPLOYMENT READINESS (`StudyAIDb`)

> **Updated:** 2026-11-28 (Asia/Bangkok)
> **Target Persistent Database:** `StudyAIDb` (`.\SQLEXPRESS`, `272.00 MB`)
> **Status:** **READY FOR OWNER-APPROVED MAINTENANCE WINDOW** (Read-only verified; `0` automatic writes performed).

---

## 1. Current Migration Gap (`StudyAIDb` vs `feature/math12-integrated-release`)

- **Currently Applied on `StudyAIDb` (20 migrations):** up to `20261126125233_AddGeneralizedLessonResources` (P04).
- **Pending Migrations (5 migrations on `feature/math12-integrated-release`):**
  1. `20261127164144_AddSupportCenterTickets`
  2. `20261127174103_AddSupportCenterClientMessageId`
  3. `20261127191136_AddMath12ContentWorkspace`
  4. `20261127192818_AddMath12TeacherWorkspace`
  5. `20261128012615_AddRound06IntegrityAndStorage`
- **Rehearsal Evidence:** All 25 migrations + `Up -> Down -> Up` verified on isolated `StudyAIDb_Clean_{GUID}` (`Math12DatasetImportTests`, `StudyAI.IntegrationTests`).

---

## 2. Controlled Upgrade & Import Procedure (Requires Owner Approval)

1. **Pre-Maintenance Backup:**
   ```sql
   BACKUP DATABASE [StudyAIDb] TO DISK = N'D:\Backups\StudyAIDb_pre_v12.bak' WITH FORMAT, INIT, CHECKSUM;
   RESTORE VERIFYONLY FROM DISK = N'D:\Backups\StudyAIDb_pre_v12.bak';
   ```
2. **Apply Migrations Explicitly:**
   ```powershell
   cd D:\TN-math12-content\backend
   dotnet ef database update --project src/StudyAI.Api -- --ConnectionStrings:DefaultConnection "<StudyAIDb_ConnStr>"
   ```
3. **Controlled Dataset Import (Dry-Run First):**
   - Run `Math12DatasetImportService.ImportFromDirectoryAsync("backend/data/math12", dryRun: true)` -> verify `1,694` records (`190` blocks, `1,200` questions, `34` assessments, `30` materials, `30` knowledge sources, `210` chunks) and `0` validation errors.
   - `2,544` legacy `vnhsge` questions remain `draft` / `LICENSE_BLOCKED`.
4. **Rollback Procedure:**
   - If any post-migration check fails, restore `D:\Backups\StudyAIDb_pre_v12.bak` or run `dotnet ef database update 20261126125233_AddGeneralizedLessonResources`.

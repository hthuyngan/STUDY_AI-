# `StudyAIDb` Maintenance Migration & Rollback Plan (F05)

> **Status:** Plan only — `StudyAIDb` has **NOT** been migrated. Automatic startup migrations remain disabled (`Database:ApplyMigrationsOnStartup = false`).

---

## 1. Pre-Maintenance Checklist
1. Confirm owner maintenance approval and stop active `StudyAI.Api` processes targeting `StudyAIDb`.
2. Record current migration & row-count baseline on `StudyAIDb`:
   ```powershell
   sqlcmd -S ".\SQLEXPRESS" -d "StudyAIDb" -E -C -Q "SELECT MigrationId FROM [__EFMigrationsHistory] ORDER BY MigrationId;"
   ```
3. Take a verified `COPY_ONLY` backup in SQL Server's backup directory (never inside the Git repo; omit `COMPRESSION` on SQL Server Express):
   ```powershell
   sqlcmd -S ".\SQLEXPRESS" -E -C -b -Q "BACKUP DATABASE [StudyAIDb] TO DISK = N'<SQL_BACKUP_DIR>\StudyAIDb_pre_p01_upgrade.bak' WITH INIT, COPY_ONLY;"
   sqlcmd -S ".\SQLEXPRESS" -E -C -b -Q "RESTORE VERIFYONLY FROM DISK = N'<SQL_BACKUP_DIR>\StudyAIDb_pre_p01_upgrade.bak';"
   ```

---

## 2. Controlled Migration Execution (9 Pending Migrations)
Run explicitly from `backend/` using the approved `StudyAIDb` connection string:
```powershell
cd backend
$env:ASPNETCORE_ENVIRONMENT = "Production"
dotnet ef database update 20261125023144_AddMultiSubjectCatalogFoundations `
  --project src/StudyAI.Api/StudyAI.Api.csproj `
  --connection "Server=.\SQLEXPRESS;Database=StudyAIDb;Trusted_Connection=True;MultipleActiveResultSets=true;TrustServerCertificate=True;"
```
Post-migration verification (read-only):
- Confirm `__EFMigrationsHistory` has 17 rows ending with `20261125023144_AddMultiSubjectCatalogFoundations`.
- Confirm row counts match pre-maintenance baseline (`users`, `content_subjects`, `content_chapters`, `content_lessons`, `content_questions`, `lesson_progress`, `assessment_attempts`, `ai_conversations`).
- Start website (`dotnet run --project src/StudyAI.Api --launch-profile http`) and verify `GET /api/v1/health/db` returns `databaseName: "StudyAIDb"` and login/curriculum endpoints succeed.

---

## 3. Rollback Plan
- **Option A — Schema-Only EF Downgrade (if no new P01 catalog data is needed):**
  ```powershell
  cd backend
  dotnet ef database update 20261115200026_AddAiIntelligenceTables `
    --project src/StudyAI.Api/StudyAI.Api.csproj `
    --connection "Server=.\SQLEXPRESS;Database=StudyAIDb;Trusted_Connection=True;MultipleActiveResultSets=true;TrustServerCertificate=True;"
  ```
- **Option B — Full Point-in-Time Restore from Verified `.bak` (preferred if any unexpected state occurs):**
  ```powershell
  sqlcmd -S ".\SQLEXPRESS" -E -C -b -Q "ALTER DATABASE [StudyAIDb] SET SINGLE_USER WITH ROLLBACK IMMEDIATE; RESTORE DATABASE [StudyAIDb] FROM DISK = N'<SQL_BACKUP_DIR>\StudyAIDb_pre_p01_upgrade.bak' WITH REPLACE; ALTER DATABASE [StudyAIDb] SET MULTI_USER;"
  ```

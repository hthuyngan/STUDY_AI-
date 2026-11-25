# `StudyAIDb` Maintenance Migration & Rollback Plan (F05)

> **Status:** Plan only — `StudyAIDb` has **NOT** been migrated. Automatic startup migrations remain disabled (`Database:ApplyMigrationsOnStartup = false`).

---

## 1. Pre-Maintenance Checklist
1. Confirm owner maintenance approval and stop active `StudyAI.Api` processes targeting `StudyAIDb`.
2. Record current migration & row-count baseline on `StudyAIDb`:
   ```powershell
   sqlcmd -S ".\SQLEXPRESS" -d "StudyAIDb" -E -C -Q "SELECT MigrationId FROM [__EFMigrationsHistory] ORDER BY MigrationId;"
   ```
3. Take a verified `COPY_ONLY, CHECKSUM` backup in SQL Server's backup directory (never inside the Git repo; omit `COMPRESSION` on SQL Server Express):
   ```powershell
   sqlcmd -S ".\SQLEXPRESS" -E -C -b -Q "BACKUP DATABASE [StudyAIDb] TO DISK = N'<SQL_BACKUP_DIR>\StudyAIDb_pre_p01_upgrade.bak' WITH INIT, COPY_ONLY, CHECKSUM;"
   sqlcmd -S ".\SQLEXPRESS" -E -C -b -Q "RESTORE VERIFYONLY FROM DISK = N'<SQL_BACKUP_DIR>\StudyAIDb_pre_p01_upgrade.bak' WITH CHECKSUM;"
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
- **Primary Rollback (Default) — Full Restore from Verified `COPY_ONLY, CHECKSUM` `.bak`:**
  Rehearsed on `StudyAIDb_Clean_2bfdade9fc6842219f04e22d8fbf06cd` (`matchesPreMigrationBaseline: true`). Stop `StudyAI.Api` and any active `StudyAIDb` connections cleanly before restoring:
  ```powershell
  sqlcmd -S ".\SQLEXPRESS" -E -C -b -Q "RESTORE DATABASE [StudyAIDb] FROM DISK = N'<SQL_BACKUP_DIR>\StudyAIDb_pre_p01_upgrade.bak' WITH REPLACE;"
  ```
- **Note on EF Core Downgrade (`dotnet ef database update <prev>`):** **Not a safe default rollback** (`efDowngradeDefault: false`). Because these 9 migrations drop/re-add foreign keys, alter unique indexes, and add 11 tables, schema downgrade is NOT rehearsed as a primary rollback path; use the verified `.bak` full restore above.

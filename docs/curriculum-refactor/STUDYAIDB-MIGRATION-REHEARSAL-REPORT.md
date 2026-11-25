# `StudyAIDb` Migration Rehearsal Report (F05)

- **Date:** 2026-11-25
- **Branch:** `feature/database-environment-isolation`
- **Target Rehearsed:** `StudyAIDb` (read-only inspection + `COPY_ONLY` backup only; **zero writes, zero migrations, zero cleanup on `StudyAIDb`**)
- **Temporary Guarded Clone Used:** `StudyAIDb_Clean_2bfdade9fc6842219f04e22d8fbf06cd` (re-rehearsed on baseline SHA `e9f46ed81892d29682850901ab1d599421025cec`; dropped after full-restore rollback verification)
- **Raw Evidence Artifacts:**
  - [pre_migration_evidence.json](./evidence/env01-migration-rehearsal/pre_migration_evidence.json)
  - [post_migration_evidence.json](./evidence/env01-migration-rehearsal/post_migration_evidence.json)
  - [rollback_rehearsal_evidence.json](./evidence/env01-migration-rehearsal/rollback_rehearsal_evidence.json)

---

## 1. Migration Inventory Reconciliation (17 Total / 8 Applied / 9 Pending)

Read-only query against `StudyAIDb.[__EFMigrationsHistory]` showed **8 applied migrations** (`ProductVersion = 10.0.14`):
1. `20261107094945_InitialSqlServerCreate`
2. `20261108144723_AddUserSoftDelete`
3. `20261108162500_EnhanceCurriculumAndQuestions`
4. `20261109001500_FixContentDefaultConstraints`
5. `20261110001600_AddAiChatConversationsAndMessages`
6. `20261111072919_AddClassroomsAndAssignments`
7. `20261112144701_AddContentQuestionBankEnhancements`
8. `20261115200026_AddAiIntelligenceTables`

**9 Pending Migrations** (`20261120032910_AddTeacherProfiles` through `20261125023144_AddMultiSubjectCatalogFoundations`):
9. `20261120032910_AddTeacherProfiles`
10. `20261121014815_AddStaffAuditLogCompositeIndex`
11. `20261121140925_AddContentRevisions`
12. `20261121141742_AddClassroomAlerts`
13. `20261121164154_AddAssessmentMetadataAndUniqueRevisionIndex`
14. `20261122073548_AddCurriculumHierarchyAndVideoMetadata`
15. `20261124162618_AddSystemSettingsTable`
16. `20261124164959_AddUserNotesAndBookmarksTables`
17. `20261125023144_AddMultiSubjectCatalogFoundations`

---

## 2. Static SQL Analysis of the 9 Pending Migrations

Generated via `dotnet ef migrations script 20261115200026_AddAiIntelligenceTables 20261125023144_AddMultiSubjectCatalogFoundations` (`14,224` bytes):
- **Destructive Operations:** **None** (no `DROP TABLE`, `DROP COLUMN`, `TRUNCATE`, or `DELETE`).
- **Foreign Keys:** Drops & re-adds 4 existing FKs (`FK_ai_hint_usage_users_UserId`, `FK_ai_learning_recommendations_users_UserId`, `FK_content_lessons_content_topics_TopicId`, `FK_student_topic_mastery_users_UserId`); adds FKs with `ON DELETE NO ACTION` (`Restrict`) for `curricula` and `curriculum_editions` and `CASCADE` for new dependent tables (`TeacherProfiles`, `classroom_alerts`, `user_section_bookmarks`, `user_study_notes`).
- **Indexes & Unique Constraints:** Replaces `IX_content_revisions_ContentId_Version` with a unique index; adds `IX_user_section_bookmarks_UserId_LessonId_SectionId`; adds unique `Code` indexes and filtered unique indexes (`WHERE [Status] <> 'archived'`) on `curricula` and `curriculum_editions`.
- **Schema/Data Additions:** Adds nullable/defaulted columns on `content_assessments`, `content_lessons`, `content_lesson_videos`, `content_chapters` (`Status` default `'published'`) and creates 11 new tables (`TeacherProfiles`, `content_revisions`, `classroom_alerts`, `system_settings`, `user_section_bookmarks`, `user_study_notes`, `catalog_subjects`, `grade_levels`, `textbook_series`, `curricula`, `curriculum_editions`).

---

## 3. Backup, Clone Restore, Migration, Integrity & Rollback Rehearsal (`ENV01-RR-02`)

1. **Backup & Verify (`COPY_ONLY, CHECKSUM`):** `BACKUP DATABASE [StudyAIDb] TO DISK = ... WITH INIT, COPY_ONLY, CHECKSUM;` processed `13,025` pages in `0.740s` (Express Edition note: `WITH COMPRESSION` is not supported on SQL Server Express). `RESTORE VERIFYONLY ... WITH CHECKSUM` succeeded (`PASS`).
2. **Migration Script Hash:** `dotnet ef migrations script 20261115200026_AddAiIntelligenceTables 20261125023144_AddMultiSubjectCatalogFoundations` SHA-256: `05FB1B80C576CC94F18402C5153EE718E76715B771A53CF01608D9A584244A60`.
3. **Clone Restore & Baseline Snapshot:** Restored to guarded temporary clone `StudyAIDb_Clean_2bfdade9fc6842219f04e22d8fbf06cd`: `8` migrations, `89` indexes, `30` foreign keys (`0` untrusted, `0` disabled).
4. **Migration Execution & Post-Migration Integrity on Clone:** `dotnet ef database update` applied all 9 pending migrations cleanly (`__EFMigrationsHistory`: `8 -> 17`, `126` indexes, `43` foreign keys with `0` untrusted and `0` disabled, `DBCC CHECKCONSTRAINTS` violations = `0`, `duplicateEmailCount = 0`, `duplicateLegacySubjectCodeCount = 0`, all 12 P01 PK/unique/filtered-unique indexes verified).
5. **Before / After / Post-Rollback Row-Count & Schema Parity:**

| Table / Metric | Pre-Migration | Post-Migration (Clone) | Post-Rollback (Full Restore) |
|---|---|---|---|
| `users` | 134 | 134 | 134 |
| `content_subjects` | 21 | 21 | 21 |
| `content_chapters` | 18 | 18 | 18 |
| `content_lessons` | 35 | 35 | 35 |
| `content_questions` | 16,693 | 16,693 | 16,693 |
| `lesson_progress` | 20 | 20 | 20 |
| `assessment_attempts` | 21 | 21 | 21 |
| `ai_conversations` | 38 | 38 | 38 |
| `grade_levels` / `catalog_subjects` / `curricula` / `textbook_series` / `curriculum_editions` | N/A | 0 / 0 / 0 / 0 / 0 | N/A (reverted) |
| `__EFMigrationsHistory` | 8 | 17 | 8 |
| Indexes / FKs (Untrusted / Disabled) | 89 / 30 (0 / 0) | 126 / 43 (0 / 0) | 89 / 30 (0 / 0) |

---

## 4. Compatibility Smoke Tests & Full-Restore Rollback Verification

Booted `StudyAI.Api` (`Testing`, `--no-launch-profile`) against `StudyAIDb_Clean_2bfdade9fc6842219f04e22d8fbf06cd`:
- `GET /api/v1/health/db` -> `200 OK` (`databaseName: StudyAIDb_Clean_2bfdade9fc6842219f04e22d8fbf06cd`, `environment: Testing`, zero credentials).
- `POST /api/v1/auth/login` -> `200 OK`.
- `GET /api/v1/content/subjects` -> `200 OK`.
- `GET /api/v1/content/catalog/compatibility-mapping` -> `200 OK` (`legacySubjectCount=21, mappedCount=0, unmappedCount=13, conflictCount=8`).
- `POST /api/v1/content/catalog/grades` -> `201 Created` (`createdGradeInitialStatus=draft`).

**Full-Restore Rollback Rehearsal:** Executed `RESTORE DATABASE [StudyAIDb_Clean_2bfdade9fc6842219f04e22d8fbf06cd] FROM DISK = ... WITH REPLACE` (`13,025` pages in `0.408s`). Verified `matchesPreMigrationBaseline: true` (`8` migrations, `89` indexes, `30` FKs, `0` untrusted/disabled, identical row counts). Clone `StudyAIDb_Clean_2bfdade9fc6842219f04e22d8fbf06cd` was dropped after verification. `StudyAIDb` remains untouched at 8 migrations until an approved maintenance window.

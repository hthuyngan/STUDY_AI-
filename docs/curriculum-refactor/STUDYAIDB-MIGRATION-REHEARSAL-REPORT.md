# `StudyAIDb` Migration Rehearsal Report (F05)

- **Date:** 2026-11-25
- **Branch:** `feature/database-environment-isolation`
- **Target Rehearsed:** `StudyAIDb` (read-only inspection + `COPY_ONLY` backup only; **zero writes, zero migrations, zero cleanup on `StudyAIDb`**)
- **Temporary Guarded Clone Used:** `StudyAIDb_Clean_bc84f6d50a2a439f9bd30e0c761bf703` (dropped after verification)

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

## 3. Backup, Clone Restore, Migration & Data Parity

1. **Backup & Verify:** `BACKUP DATABASE [StudyAIDb] TO DISK = ... WITH INIT, COPY_ONLY;` processed `13,025` pages in `0.749s` (Express Edition note: `WITH COMPRESSION` is not supported on SQL Server Express). `RESTORE VERIFYONLY` succeeded (`The backup set on file 1 is valid.`).
2. **Clone Restore:** Restored to guarded temporary clone `StudyAIDb_Clean_bc84f6d50a2a439f9bd30e0c761bf703` (`13,025` pages in `0.433s`).
3. **Migration Execution on Clone:** `dotnet ef database update` applied all 9 pending migrations cleanly (`__EFMigrationsHistory`: `8 -> 17`).
4. **Before / After Row-Count Preservation:**

| Table | Before Migration | After Migration (Clone) | Preserved |
|---|---|---|---|
| `users` | 134 | 134 | Yes |
| `content_subjects` | 21 | 21 | Yes |
| `content_chapters` | 18 | 18 | Yes |
| `content_lessons` | 35 | 35 | Yes |
| `content_questions` | 16,693 | 16,693 | Yes |
| `lesson_progress` | 20 | 20 | Yes |
| `assessment_attempts` | 21 | 21 | Yes |
| `ai_conversations` | 38 | 38 | Yes |
| `grade_levels` / `catalog_subjects` / `curricula` / `textbook_series` / `curriculum_editions` | N/A | 0 / 0 / 0 / 0 / 0 | Additive (0 sample rows) |
| `__EFMigrationsHistory` | 8 | 17 | +9 applied |

---

## 4. Compatibility Smoke Tests on Migrated Clone

Booted `StudyAI.Api` (`Testing`, `--no-launch-profile`) against `StudyAIDb_Clean_bc84f6d50a2a439f9bd30e0c761bf703`:
- `GET /api/v1/health/db` -> `200 OK` (`databaseName: StudyAIDb_Clean_bc84f6d50a2a439f9bd30e0c761bf703`, zero credentials).
- `POST /api/v1/auth/login` -> `200 OK`.
- `GET /api/v1/content/subjects` -> `200 OK`.
- `GET /api/v1/content/catalog/compatibility-mapping` -> `200 OK` (`Legacy=21, Mapped=0, Unmapped=13, Conflict=8`).
- `POST /api/v1/content/catalog/grades` -> `201 Created` (`id=grd_29a785c0ed9b4c44, status=draft`).

Clone `StudyAIDb_Clean_bc84f6d50a2a439f9bd30e0c761bf703` was dropped in `finally`. `StudyAIDb` remains untouched at 8 migrations until an approved maintenance window.

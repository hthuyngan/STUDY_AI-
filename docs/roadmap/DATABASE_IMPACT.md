# DATABASE IMPACT & MIGRATION SAFETY — AI TUTOR MATH 12

> **Database Guard**: `StudyAIDb` (Development/Production) MUST NOT be modified, seeded, truncated, or migrated by automated agents or tests. All automated tests and E2E run strictly on disposable `StudyAIDb_Clean_{GUID}`.

## 1. Existing Schema Baseline (`StudyAIDbContext`)

- **Identity & Auth**: `Users`, `RefreshSessions`, `StaffAuditLogs`, `SystemSettings`
- **Curriculum & Content**: `GradeLevels`, `Subjects`, `Curriculums`, `CurriculumEditions`, `TextbookSeries`, `ContentSubjects`, `ContentChapters`, `ContentLessons`, `ContentTopics`, `ContentQuestions`, `ContentRevisions`, `LessonContentBlocks`, `LessonResources`, `LessonPrerequisites`
- **Classrooms & Teaching**: `Classrooms`, `ClassroomMembers`, `TeacherProfiles`, `Assignments`, `AssignmentSubmissions`
- **Learner & Assessment**: `LessonProgresses`, `LearningEvents`, `AssessmentAttempts`, `AssessmentResponses`, `UserStudyNotes`, `UserSectionBookmarks`
- **AI & Support**: `AiConversations`, `AiMessages`, `AiUsageLogs`, `SupportTickets`, `SupportTicketMessages`

## 2. Planned Schema Extensions (Additive & Reversible Only)

1. **Content Learning Materials & Error Reports (`feature/math12-content`)**:
   - Reuse `LessonResources` for lesson-level files; add `ContentDocuments` (general Math 12 PDF/formula sheets) and `ContentErrorReports` (or typed extension of `SupportTickets`) if needed, with full `Up()`/`Down()` and FK indexes.
   - Add `AiKnowledgeSources` & `AiKnowledgeChunks` for Content RAG source management (approved/published sources only; soft-delete/index removal on revoke).
2. **Teacher Gradebook Audit & Announcements (`feature/math12-teacher`)**:
   - Reuse `Classrooms`, `Assignments`, `AssignmentSubmissions`; add `ClassroomAnnouncements` and `GradeAdjustmentLogs` (audit trail for manual score edits).
3. **Learner Study Plan Tasks (`feature/math12-user`)**:
   - Add `StudyPlanTasks` (personal schedule/todo items scoped to `UserId`) if not already persisted via `RevisionPlanner`.
   - Subscriptions (`ADM-05`) remain gated on owner design approval before persistent billing tables are activated.

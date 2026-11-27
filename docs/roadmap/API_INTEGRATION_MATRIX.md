# API INTEGRATION MATRIX — AI TUTOR (MATH 12)

| Domain | Frontend Service | Backend Controller(s) | Auth Policy | Status |
|---|---|---|---|---|
| **Auth & Profile** | `auth.service.ts` | `AuthController`, `StudentProfileController` | Public / `LearnerOnly` / Authenticated | Active |
| **Admin Governance** | `admin.service.ts` | `AdminDashboardController`, `AdminUsersController`, `AdminRolesController`, `AdminAuditLogsController`, `AdminSystemController`, `AdminSettingsController`, `AdminAiController`, `AdminAnnouncementsController` | `AdminOnly` | Active (ADM-04/05 gated) |
| **Support Center** | `support.service.ts` | `SupportTicketsController`, `AdminSupportController` | Authenticated (own) / `AdminOnly` | Active (`ADMIN-R04`) |
| **Content Curriculum** | `content.service.ts`, `curriculum.repository.ts` | `ContentSubjectsController`, `ContentChaptersController`, `ContentLessonsController`, `ContentTopicsController`, `ContentCatalogController`, `ContentCurriculumImportController` | `ContentStaff` | Active (Extending to Math 12 scope) |
| **Content Questions & Exams** | `questionBankApi.ts`, `assessment.service.ts` | `ContentQuestionsController`, `ContentAssessmentsController`, `ContentReviewController`, `ContentGovernanceController`, `LessonCompositionController`, `LessonResourcesController` | `ContentStaff` | Active (Extending) |
| **Teacher Workspace** | `classroom.service.ts`, `teacher.service.ts` | `TeacherClassroomsController`, `TeacherStudentsController`, `TeacherAssignmentsController`, `TeacherSubmissionsController`, `TeacherGradingController`, `TeacherAnalyticsController` | `StaffOnly` + Ownership | Active (Extending) |
| **Learner Learning & Practice** | `education.service.ts`, `practice.service.ts`, `assessment.service.ts`, `learningState.service.ts` | `StudentCurriculumController`, `StudentProgressController`, `StudentPracticeController`, `StudentAssessmentAttemptsController`, `StudentAnalyticsController`, `StudentAdaptiveLearningController`, `StudentExamPreparationController`, `StudentNotesController`, `StudentEventsController` | `LearnerOnly` + Ownership | Active (Extending to Math 12 only) |
| **AI Tutor & RAG** | `aiTutor.service.ts` | `AiChatController` | `LearnerOnly` / `StaffOnly` + Quota | Active (Extending RAG & Math 12) |

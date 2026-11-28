# ROLE & PERMISSION MATRIX — AI TUTOR (MATH 12)

> Source of truth: `backend/src/StudyAI.Api/Common/Authorization/Permissions.cs` & `RolePermissionMap.cs`

## 1. Role Capabilities

| Domain / Capability | ADMIN (`admin`) | CONTENT (`content`) | TEACHER (`teacher`) | USER (`learner`) |
|---|---|---|---|---|
| User & Role Management (`users.read/write/change_role`) | Full | None | None | None |
| System Settings & AI Provider Keys (`settings.manage`) | Full (ADM-04/05 gated) | **Forbidden** | **Forbidden** | **Forbidden** |
| Audit Logs (`audit.read`) | Full | Read content audit | None | None |
| Curriculum & Lessons (`content.create/update/submit`) | Read/Monitor | Full (Math 12) | Read published only | Read published only |
| Content Review & Publish (`content.review/publish/rollback/archive`) | Monitor | Full (per workflow) | **Forbidden** | **Forbidden** |
| Question Bank & Exam Templates | Read/Monitor | Full | Read published / copy | Practice / Exam attempt |
| AI Knowledge Base (RAG Sources) | Monitor | Manage approved sources | **Forbidden** | Query via AI Tutor |
| Content Error Reports | Technical escalation | Triage & fix content | Submit report | Submit report |
| Classrooms (`classrooms.read/manage`) | Oversight | **Forbidden** | Own classes only | Joined classes only |
| Assignments & Grading (`assignments.manage`, `submissions.grade`) | Oversight | **Forbidden** | Own classes only | Submit & view own |
| Learning & Practice (`learning.read_own/update_own`) | Aggregate metrics | None | Own class students | Own records only |
| AI Tutor / AI Teaching Assistant (`ai_tutor.use`) | Monitor | None | Class-scoped assistant | Personal Math 12 tutor |
| Support Tickets | Triage & reply all | Own tickets | Own tickets | Own tickets only |

## 2. Resource-Level Ownership Rules

- **Teacher**: Every classroom, assignment, gradebook, and announcement query MUST filter by `TeacherUserId == currentUserId` (403 on cross-teacher access).
- **User (Learner)**: Cannot read another student's `AssessmentAttempt`, `LearningEvent`, `UserStudyNote`, `SupportTicket`, or classroom grades.
- **Content**: Cannot access `/api/v1/admin/settings`, AI provider secrets, or Teacher private classroom materials.
- **Unpublished Content**: Draft / Pending Review / Rejected lessons, questions, and exams MUST NOT be returned by Student or Teacher public/published endpoints.

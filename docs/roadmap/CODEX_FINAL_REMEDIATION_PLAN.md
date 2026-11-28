# CODEX FINAL REMEDIATION PLAN (SYSTEM-06)

- **Base SHA:** `fb9a37293ed54629a5d4adb92cb75788663ba7d9`
- **Risk Level:** HIGH
- **Requires Human Approval:** True
- **Task Title:** SYSTEM-06 remediation plan for SYS-03, SYS-04, and SYS-05

## Database Safety Notes
Do not connect tests, fixtures, automation, migrations, seeders, or cleanup to StudyAIDb or StudyAIDb_E2E. Use only a per-run StudyAIDb_Clean_{GUID} database with atomic ownership manifest and safe LOCK_TIMEOUT cleanup. Fail closed if the configured test connection does not meet that isolation contract. No production database changes are included in this plan. Preserve explicit human approval gates before any controlled production maintenance or release action.

## Workstreams

### SYS-03: isolate assessment questions and align grading (`sys03_assessment_scope_and_grading`)
- **Files:** 
backend/src/StudyAI.Api/Features/Student/StudentAssessmentService.cs, backend/src/StudyAI.Api/Features/Student/StudentPracticeService.cs, backend/tests/StudyAI.Tests/Math12UserWorkspaceTests.cs
- **Steps:**
  1. Inspect assessment attempt construction, ContentAssessment existence/type checks, question relationships, and StudentPracticeService answer evaluation semantics before editing.
  1. Change question selection so attempts tied to an existing non-synthetic ContentAssessment are strictly scoped by matching AssessmentId; retain LessonId fallback only for synthetic or lesson-only attempts.
  1. Align EvaluateAnswerServerSide with StudentPracticeService for true-false, true-false-group, and short-answer numeric, decimal, and fraction equivalence; preserve server-side grading and malformed-input handling.
  1. Extend Math12UserWorkspaceTests with a targeted assessment containing unrelated lesson questions, synthetic/lesson-only fallback, supported answer formats, and incorrect or malformed answer cases.
  1. Run the focused user-workspace test suite against an authorized isolated StudyAIDb_Clean_{GUID} database and verify no test uses static or persistent databases.

### SYS-04: harden content upload, extraction, and retrieval (`sys04_content_files_and_rag`)
- **Files:** 
backend/src/StudyAI.Api/Features/Content/ContentWorkspaceService.cs, backend/src/StudyAI.Api/Features/AI/AiTutorService.cs, backend/tests/StudyAI.Tests/Math12ContentWorkspaceTests.cs
- **Steps:**
  1. Trace upload file creation through persistence and cancellation paths in ContentWorkspaceService; add cleanup for request-created files when SaveChangesAsync fails or is cancelled, preserving the original exception.
  1. Inspect PDF extraction limits and impose explicit bounds on input size and extracted work such as pages, characters, and processing duration, following existing configuration and error-handling patterns.
  1. Trace RAG candidate retrieval, filtering, and any reranking or context assembly in AiTutorService; enforce published and approved status at retrieval and before prompt/context construction so drafts cannot leak through secondary paths.
  1. Extend Math12ContentWorkspaceTests to cover persistence failure and cancellation cleanup, PDF bounds, and published/approved inclusion with draft/unapproved exclusion.
  1. Run the focused content-workspace suite against an authorized isolated StudyAIDb_Clean_{GUID} database; ensure file tests use temporary test-owned storage and clean it safely.

### SYS-05: clean teacher uploads and enforce atomic AI quotas (`sys05_teacher_upload_and_quota`)
- **Files:** 
backend/src/StudyAI.Api/Features/Teacher/TeacherWorkspaceService.cs, backend/tests/StudyAI.Tests/Math12TeacherWorkspaceTests.cs, Related quota reservation persistence and DI files only if needed
- **Steps:**
  1. In UploadMaterialAsync, track the newly created upload path and remove that file if SaveChangesAsync fails or is cancelled; keep cleanup scoped to the file created by this request and preserve the original failure.
  1. Inspect existing quota model, usage logging, transaction boundaries, and database provider support; choose the smallest established mechanism that makes quota check plus reservation atomic before the LLM call.
  1. Implement a quota reservation or equivalent serialized transactional check covering both daily and monthly limits under concurrent requests; finalize it as usage after successful completion and release or reconcile it on LLM failure/cancellation.
  1. Extend Math12TeacherWorkspaceTests with concurrent requests at the quota boundary, daily and monthly limit cases, LLM failure/cancellation reconciliation, and upload persistence failure/cancellation cleanup.
  1. Run the focused teacher-workspace suite against an authorized isolated StudyAIDb_Clean_{GUID} database and verify concurrency tests cannot target StudyAIDb or StudyAIDb_E2E.

### Integrated regression and release verification (`integrated_regression_verification`)
- **Files:** 
backend/src/StudyAI.Api/Features/Student/StudentAssessmentService.cs, backend/src/StudyAI.Api/Features/Content/ContentWorkspaceService.cs, backend/src/StudyAI.Api/Features/AI/AiTutorService.cs, backend/src/StudyAI.Api/Features/Teacher/TeacherWorkspaceService.cs, backend/tests/StudyAI.Tests/Math12UserWorkspaceTests.cs, backend/tests/StudyAI.Tests/Math12TeacherWorkspaceTests.cs, backend/tests/StudyAI.Tests/Math12ContentWorkspaceTests.cs
- **Steps:**
  1. After the three remediation workstreams are complete, run Math12UserWorkspaceTests, Math12TeacherWorkspaceTests, and Math12ContentWorkspaceTests with isolated per-run database provisioning and safe cleanup.
  1. Run required backend build and test gates and affected Playwright scenarios, including success, authorization denial, API failure, empty state, refresh persistence, two-user isolation, and 390px mobile behavior where applicable; validate test connection targets before execution.
  1. Review the final diff against the SYS-03, SYS-04, and SYS-05 findings and acceptance criteria, confirm no production database writes or generated secrets, and report any unavailable gates as NOT RUN with their blocker.
  1. Keep the change within one remediation batch and preserve explicit human approval before release or any controlled production maintenance.

## Acceptance Criteria
- A targeted attempt linked to an existing non-synthetic ContentAssessment includes only questions whose AssessmentId matches that assessment; lesson questions are considered only for synthetic or lesson-only attempts.
- Server-side answer evaluation supports true-false, true-false-group, and short-answer numeric, decimal, and fraction equivalence consistently with StudentPracticeService; incorrect and malformed answers are rejected safely.
- ContentWorkspaceService and AiTutorService are checked and corrected so upload files created for a request are removed if persistence fails or is cancelled, PDF extraction has explicit resource bounds, and RAG retrieval can include only published and approved content, including after any secondary ranking or retrieval stage.
- TeacherWorkspaceService removes a newly uploaded file on SaveChangesAsync failure or cancellation without masking the original exception.
- Concurrent teacher AI requests cannot exceed daily or monthly quotas between quota validation and usage logging; quota capacity is reserved atomically before calling the LLM, and failed requests release or reconcile the reservation safely.
- Regression coverage is added to Math12UserWorkspaceTests, Math12TeacherWorkspaceTests, and Math12ContentWorkspaceTests, including failure, cancellation, concurrency, and draft-isolation cases.
- All automated tests use only per-run isolated StudyAIDb_Clean_{GUID} databases with ownership manifests and safe cleanup; StudyAIDb and StudyAIDb_E2E are never written by tests or automation.
- Required frontend, backend, and affected Playwright gates are run only after confirming their environment targets an authorized isolated test database; unavailable gates are reported NOT RUN with the blocker.

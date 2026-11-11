# DATA-001 & P20-001-FIX Verification & Governance Report

- **Date**: 2026-11-11
- **Author**: Antigravity (Pair Programming Agent)
- **Branch**: `feature/data-vnhsge-import`
- **Target Repository**: `https://github.com/hthuyngan/STUDY_AI-`
- **Baseline Git SHA**: `1d6455940c313aee6cbfdbd8fe1bba9205510dd9`
- **Status**: **READY FOR CHATGPT ARCHITECTURAL REVIEW**

---

## 1. Executive Summary
This report delivers the complete implementation of:
1. **P20-001-FIX Pre-requisites**: Strict fail-closed API error handling (no silent mock fallback for authenticated users), learner-role verification on class enrollment, and deadline/closed status enforcement on assignment submissions.
2. **Part 2 Read-Only Account Audit**: Empirical proof regarding `admin@gmail.com` and `content@gmail.com` on `StudyAIDb`.
3. **DATA-001 VNHSGE Ingestion & Governance**: Complete dataset survey, copyright gate enforcement, multi-subject parser engine, KaTeX math formula preservation, essay handling for Literature, and zero-database-write Dry-Run mode.

---

## 2. Part 2 — Read-Only Account Audit on `StudyAIDb`
A read-only SQL query was executed against `StudyAIDb.dbo.users` on `.\SQLEXPRESS`:
```sql
SELECT Id, Email, Role, Status, CreatedAt
FROM StudyAIDb.dbo.users
WHERE Email IN ('admin@gmail.com', 'content@gmail.com', 'admin@studyai.internal', 'content@studyai.internal');
```

### Audit Findings:
- `admin@gmail.com`: **DOES NOT EXIST** (0 rows).
- `content@gmail.com`: **DOES NOT EXIST** (0 rows).
- Existing internal seed accounts:
  - `admin@studyai.internal` — Role: `admin`, Status: `active`
  - `content@studyai.internal` — Role: `content`, Status: `active`
- **Database Safety Guard**: Exactly 119 user accounts in `StudyAIDb` were preserved with zero mutations, zero writes, and zero migrations. All testing and seed verifications were strictly conducted on `StudyAIDb_E2E`.

---

## 3. P20-001-FIX Fail-Closed Implementation

### 3.1 Backend Hardening
- **Classroom Enrollment Role Validation** (`backend/src/StudyAI.Api/Controllers/ClassroomsController.cs`):
  - Validates target student role upon enrollment. Non-learner accounts (`teacher`, `admin`, `content`) are rejected with `400 Bad Request` (`ONLY_LEARNERS_CAN_BE_ENROLLED`).
- **Assignment Status & Due Date Validation** (`backend/src/StudyAI.Api/Controllers/AssignmentsController.cs`):
  - Validates assignment status: Submissions to `closed` or `archived` assignments are rejected with `400 Bad Request` (`ASSIGNMENT_CLOSED`).
  - Validates assignment deadline: Submissions where `DateTimeOffset.UtcNow > assignment.DueDate` are rejected with `400 Bad Request` (`ASSIGNMENT_PAST_DUE`).

### 3.2 Frontend Fail-Closed Hardening
- **Eliminated Silent Mock Fallback** (`frontend/src/services/classroom.service.ts`):
  - All methods (`getClasses`, `getClassById`, `saveClass`, `addStudentToClass`, `removeStudentFromClass`, `getAssignments`, `getAssignmentById`, `saveAssignment`, `getSubmissions`, `gradeSubmission`) now inspect authentication state.
  - When `getAccessToken()` is present, API errors are rethrown immediately to prevent silent fallbacks to `localStorage` or initial constants.
  - Fallback is strictly restricted to unauthenticated demonstration mode.
- **Learner Assignments Page Error Banner** (`frontend/src/pages/Assignments/LearnerAssignmentsPage.tsx`):
  - Added an error alert banner (`data-testid="assignments-error-banner"`) that renders when an authenticated API call fails, preventing misleading empty states.

---

## 4. VNHSGE Dataset Survey & Governance Architecture

### 4.1 Upstream Dataset Details
- **Repository**: `https://github.com/Xdao85/VNHSGE`
- **Pinned Commit**: `04c845dccd5bf7b619e1e6b3ddae4d53c1264620`
- **Academic Paper**: Xuan-Quy Dao et al., *Evaluating Large Language Models on Vietnamese High School Graduation Examination*, arXiv:2305.12199 [cs.CL], 2023.
- **Split & Subject Inventory**:
  - 9 subjects: Mathematics, Physics, Chemistry, Biology, Literature, English, History, Geography, Civic Education.
  - Vietnamese benchmark (`VNHSGE-V`) across `train`, `test`, `eval` splits; English translation (`VNHSGE-E`).

### 4.2 Licensing & Copyright Gate Decision
- Upstream GitHub repository lacks a root `LICENSE` file; arXiv preprint is under `CC BY-NC-SA 4.0`.
- **Copyright Gate Policy**:
  - Zero raw exam JSON files or diagram image assets are committed into the `STUDY_AI` repository.
  - Ingestion parser and validation are demonstrated using synthetic minimal test fixtures (`vnhsge_math_sample.json`, `vnhsge_literature_sample.json`, `vnhsge_physics_sample.json`).
  - Actual dataset ingestion is gated behind administrator preview and **Dry-Run Mode**. Live production database import is completely blocked.

---

## 5. Ingestion Engine Implementation

### 5.1 Deterministic Parser (`CurriculumImportParser.cs`)
- **Direct JSON Array Support**: Handles direct array format `[ { "ID": ..., "Question": ... } ]` without requiring object wrapper.
- **Robust Option Delimiter Scanner**: Splits raw `Question` into `Prompt` and 4 options `[A, B, C, D]` using sequential regex delimiter detection (`\nA. `, `\nB. `, `\nC. `, `\nD. `), preserving inner KaTeX math formulas (e.g., `$x = 1$`, `\frac{1}{3}Bh`, `0{,}314\text{ s}`).
- **Literature Essay Handling**: Identifies questions without options as `essay` type, preserving essay prompts without forcing MCQ structure.
- **Image Reference Annotation**: Encapsulates `Image_Question` and `Image_Answer` paths cleanly inside prompt/explanation annotations.
- **Subject Code Inference & Alias Resolution**: Automatically maps filenames/subject keys to standardized codes: `MATH12`, `PHYS12`, `CHEM12`, `BIO12`, `LIT12`, `ENG12`, `HIST12`, `GEO12`, `GDCD12`.

### 5.2 Validator Extensions (`CurriculumImportValidator.cs`)
- Added `essay` and `reading-comprehension` to `ValidQuestionTypes`.
- Implemented `ResolveSubjectAlias` for flexible subject code normalization.
- Ensured essay questions pass validation without requiring MCQ letter answers.

### 5.3 Zero-Database-Write Dry-Run Mode (`CurriculumImportConfirmService.cs`)
- Extended confirm API with `DryRun` flag (`bool dryRun = false`).
- When `dryRun = true`, the service performs full schema validation, simulates entity counts, attaches provenance metadata (`VNHSGE Benchmark Dataset (arXiv:2305.12199 / CC BY-NC-SA 4.0)`), and returns a success response with **zero database modifications**.

### 5.4 Admin & Content UI Integration (`ContentImportPage.tsx`)
- Added VNHSGE Academic Attribution & Copyright Notice banner.
- Added "Chế độ kiểm thử an toàn (Dry-Run)" checkbox.
- Rendered specialized Dry-Run completion badge, audit chip, and provenance display upon confirmation.

---

## 6. Comprehensive Verification Matrix

| Test Suite | Components Tested | Result | Duration |
|---|---|---|---|
| **.NET Unit Tests** | VNHSGE parser (Math LaTeX, Literature essay, Physics image), subject alias resolver, KaTeX validator, published content lock | **78 / 78 PASS** | 559 ms |
| **.NET Integration Tests** | Classroom learner-only enrollment, assignment closed/expired submission rejection, multi-role auth, preview token lifecycle | **114 / 114 PASS** | 25 s |
| **Frontend Linter (Oxlint)** | Whole frontend codebase (398 files) | **0 Errors, 0 Warnings** | 176 ms |
| **Frontend Tests (Vitest)** | Classroom fail-closed error propagation, import preview/confirm UI, auth guards, analytics | **403 / 403 PASS (51 test files)** | 8.57 s |
| **Frontend Production Build** | Vite / Rolldown production bundle compilation | **SUCCESS** | 943 ms |
| **Playwright E2E Suite** | Full Teacher $\rightarrow$ Classroom $\rightarrow$ Assignment $\rightarrow$ Learner $\rightarrow$ Submit $\rightarrow$ Grade workflow | **7 / 7 PASS** | 26 s |

---

## 7. Compliance with Safety Constraints
- `StudyAIDb` on `.\SQLEXPRESS`: **100% UNTOUCHED** (119 users preserved, zero migrations, zero writes).
- Branch: `feature/data-vnhsge-import` (isolated feature branch, `main` untouched).
- ChatGPT files: `ai-collaboration/TASK.md` and `ai-collaboration/REVIEW.md` **NOT MODIFIED**.
- Phase 21: **UNSTARTED** (Strictly stopped).

# MATH 12 DATA INVENTORY (STUDY_AI)

> Audited: 2026-11-28 (Asia/Bangkok) | Mode: Read-only `SELECT` on `StudyAIDb` (`.\SQLEXPRESS`) + Repository inspection (`b904d6e6`)

---

## 1. `StudyAIDb` Schema & Migration Status

- **Applied Migrations**: `20` migrations up to `20261126125233_AddGeneralizedLessonResources` (P04).
- **Schema Mismatch (Pending Controlled Maintenance)**:
  - `AddQuestionMappingAndAssessmentIntegrity` (P05), `AddMath12ContentWorkspace`, `AddMath12TeacherWorkspace`, and `AddRound06IntegrityAndStorage` are **not yet applied** on `StudyAIDb`.
  - Tables `content_materials`, `ai_knowledge_sources`, `ai_knowledge_chunks`, `content_error_reports`, `teacher_exams`, `classroom_materials`, `classroom_announcements`, `lesson_resources` do not yet exist in `StudyAIDb`; `content_questions` uses column `Type` (pre-P05 schema).

## 2. `StudyAIDb` Record Counts (Read-Only)

- **Users (`136` total)**: `learner`: `120`, `teacher`: `6`, `support`: `6`, `admin`: `3`, `content`: `1`.
- **Math 12 (`sub_math12`) Chapters (`6`)**:
  - `chp_math12_c1`: Chương 1: Ứng dụng đạo hàm để khảo sát và vẽ đồ thị của hàm số (`5` published lessons)
  - `chp_math12_c2`: Chương 2: Vectơ và hệ toạ độ trong không gian (`3` published lessons)
  - `chp_math12_c3`: Chương 3: Các số đặc trưng đo mức độ phân tán cho mẫu số liệu ghép nhóm (`2` published lessons)
  - `chp_math12_c4`: Chương 4: Nguyên hàm và tích phân (`3` published lessons)
  - `chp_math12_c5`: Chương 5: Phương pháp toạ độ trong không gian (`4` published lessons)
  - `chp_math12_c6`: Chương 6: Xác suất có điều kiện (`2` published lessons)
  - **Total Math 12 Lessons**: `19` (`published`), `0` `lesson_content_blocks`.
- **Math 12 (`sub_math12`) Questions (`2,546` total)**:
  - `2,544` `draft` (`SourceType = vnhsge`, `CopyrightStatus = pending_verification` — `LICENSE_BLOCKED`, `2,541` `multiple-choice`, `3` `short-answer`, `476` with `ImageUrl`, `2` missing `Explanation`).
  - `2` `published` (`SourceType = manual`, `CopyrightStatus = proprietary`).
- **Assessments**: `0` rows in `content_assessments`.

## 3. Repository Data & Checkpoint Inventory

- `scripts/vnhsge_prod_checkpoint.json`: `16,679` multi-subject rows imported (`69` batches, `375` duplicates) — multi-subject corpus, **not** Math 12 alone, and gated by `VNHSGE_COPYRIGHT_GATE_LOCKED` (`docs/data-vnhsge.md`).
- `backend/data/curriculum/math-vietnam-catalog.v1.json` (`69,907` bytes) & `scripts/seed_math12_curriculum.sql` (`133,593` bytes): existing curriculum catalog & seed baseline.

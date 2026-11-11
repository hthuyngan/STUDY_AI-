# VNHSGE Dataset Integration & Governance Specification
**STUDY_AI Platform — Task DATA-001**

## 1. Overview & Academic Citation
The **VNHSGE** (Vietnamese National High School Graduation Examination) benchmark is an open academic dataset evaluating LLMs on standardized Vietnamese Grade 12 exit and university entrance exams across 9 subjects.

- **Primary Source Repository**: [https://github.com/Xdao85/VNHSGE](https://github.com/Xdao85/VNHSGE)
- **Pinned Commit**: `04c845dccd5bf7b619e1e6b3ddae4d53c1264620` (October 30, 2026)
- **Academic Paper Reference**: Xuan-Quy Dao et al., *Evaluating Large Language Models on Vietnamese High School Graduation Examination*, arXiv:2305.12199 [cs.CL], 2023.

---

## 2. Licensing & Copyright Gate Policy
1. **Upstream License Analysis**:
   - The upstream GitHub repository does not contain a root `LICENSE` file.
   - The ArXiv preprint is distributed under `CC BY-NC-SA 4.0` (Creative Commons Attribution-NonCommercial-ShareAlike 4.0 International).
   - Under international copyright law, the lack of an explicit software/dataset license on GitHub prevents unrestricted commercial distribution or unconditional repo redistribution.
2. **Copyright Gate Enforcement in STUDY_AI**:
   - **Zero Raw Corpus Redistribution**: The complete raw exam JSON files and proprietary diagrams from VNHSGE are **NOT** committed into the `STUDY_AI` git repository.
   - **Minimal Synthetic Fixtures**: Automated CI/CD unit tests use minimal synthetic fixture files located in `backend/tests/StudyAI.UnitTests/TestData/` (`vnhsge_math_sample.json`, `vnhsge_literature_sample.json`, `vnhsge_physics_sample.json`).
   - **Dry-Run Gating**: Content operators and administrators can execute complete parsing and schema validation using **Dry-Run Mode** (`dryRun: true`), which outputs simulated audit manifests and provenance logs without committing or publishing unapproved exam items to live learners.
   - **Live Production DB Lock**: Writes to `StudyAIDb` remain strictly forbidden by system invariants. Authorized testing may only target `StudyAIDb_E2E`.

---

## 3. Dataset Structure & Entity Mapping

### 3.1 Subject Coverage (9 Subjects)
| VNHSGE Subject Name | STUDY_AI Subject Code | Target Subject Name | Default Type |
|---|---|---|---|
| Mathematics (`MET_Math_*`, `Toan`) | `MATH12` | Toán học 12 | `multiple-choice` |
| Physics (`MET_Physics_*`, `Vat_Ly`) | `PHYS12` | Vật lý 12 | `multiple-choice` |
| Chemistry (`MET_Chemistry_*`, `Hoa_Hoc`) | `CHEM12` | Hóa học 12 | `multiple-choice` |
| Biology (`MET_Biology_*`, `Sinh_Hoc`) | `BIO12` | Sinh học 12 | `multiple-choice` |
| Literature (`MET_Literature_*`, `Ngu_Van`) | `LIT12` | Ngữ văn 12 | `essay` |
| English (`MET_English_*`, `Tieng_Anh`) | `ENG12` | Tiếng Anh 12 | `multiple-choice` |
| History (`MET_History_*`, `Lich_Su`) | `HIST12` | Lịch sử 12 | `multiple-choice` |
| Geography (`MET_Geography_*`, `Dia_Ly`) | `GEO12` | Địa lý 12 | `multiple-choice` |
| Civic Education (`MET_CivicEducation_*`, `GDCD`) | `GDCD12` | Giáo dục công dân 12 | `multiple-choice` |

### 3.2 Schema & Field Transformation
In the VNHSGE raw JSON format:
```json
{
  "ID": "1",
  "Image_Question": "images/q1.png",
  "Question": "Cho hàm số $y=f(x)$ ...\nA. Giá trị cực tiểu bằng 2.\nB. Giá trị cực đại bằng 3.\nC. ...\nD. ...",
  "Choice": "A",
  "Image_Answer": "",
  "Explanation": "Dựa vào bảng biến thiên ..."
}
```

The STUDY_AI parsing engine transforms each item into an `ImportQuestionItemDto`:
- **Prompt**: Text preceding the first option marker `\nA. `, with image annotations appended if `Image_Question` exists.
- **Options**: Extracted as a 4-element array `[A, B, C, D]`, stripping option markers while strictly preserving inner LaTeX syntax (such as `$x = 1$` or `\frac{1}{3}Bh`).
- **CorrectAnswer**: Single letter answer key (`A`, `B`, `C`, `D`).
- **Type**:
  - `multiple-choice`: When options $\ge 2$ are extracted and `Choice` is present.
  - `essay`: When no option markers exist (e.g., Literature), preserving the essay prompt and evaluation rubric without forcing MCQ schema.
- **SubjectCode**: Automatically inferred from the input filename (e.g. `MET_Math_...` $\rightarrow$ `MATH12`).
- **SourceCitation**: `"VNHSGE (arXiv:2305.12199) - ID: {id}"`.
- **LicenseType**: `"CC-BY-NC-SA-4.0"`.

---

## 4. Verification & Audit Trail
- **Two-Phase Commit**:
  1. `/api/v1/content/import/preview`: Parses the file, validates integrity, creates an encrypted `previewToken` in memory with an expiration window.
  2. `/api/v1/content/import/confirm`: Validates caller permissions, matches the `previewToken` with the actor, and checks `dryRun`.
- **Dry-Run Simulation**:
  - Flag `dryRun = true` performs full schema validation and reports `TotalProcessed`, `Inserted`, `Updated`, `EntityCounts`, and `Provenance` while strictly executing zero database writes.
- **Audit Logging**:
  - Every confirm operation (including dry-runs) records an `AuditLogId` for full compliance tracking.

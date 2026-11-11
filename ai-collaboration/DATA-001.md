# DATA-001 — Import VNHSGE reference exam dataset into STUDY_AI (isolated workstream)

- Status: **READY — USER REQUESTED**
- Owner: Antigravity, workspace `E:\AI_tutor`
- Source: https://github.com/Xdao85/VNHSGE
- Source pinned commit: `04c845dccd5bf7b619e1e6b3ddae4d53c1264620` (2026-10-30)
- Target: `hthuyngan/STUDY_AI-`, baseline `91df228a55544955b56e8f3dc3bb2761a633cb61` (fetch latest safely)
- **Priority order**: finish or safely checkpoint ongoing `P20-001-FIX` first; then implement DATA-001 on separate branch `feature/data-vnhsge-import`. Do not overwrite or silently replace `ai-collaboration/TASK.md` (P20-001-FIX active). This brief is a separate explicit user-authorized assignment.
- No Phase 21.

## Source findings verified on GitHub
- 9 subjects: Mathematics, Literature, English, Physics, Chemistry, Biology, History, Geography, Civic Education.
- Vietnamese dataset `Dataset/VNHSGE-V/JSON format/{train,test,eval}/<subject>/`; English translation `Dataset/VNHSGE-E/JSON format/eval/`. Images are neighboring directories named after exams. Word files are parallel originals, not needed for primary import.
- JSON sample `MET_Math_IE_2023.json`: array with `ID, Image_Question, Question, Choice, Image_Answer, Explanation`. `Choice` is answer key A-D, not an options collection; parse A-D from `Question` conservatively, preserving raw text. Some problems use LaTeX and image references. Literature is essays; handle separately or explicitly defer, never force MCQ.
- `Dataset/NOTES.md` documents split details, manual corrections, occasional missing explanations and shortened exams. No fabricated answers or explanations.
- Train/test/eval splits should be represented explicitly; do **not** treat benchmark eval/test as model training data. Preserve provenance, source URL/commit, subject, split, exam key and original question ID.

## Implementation deliverables
1. Inspect existing STUDY_AI Phase 18 curriculum import/content bank/exam/practice entities, DB schema, APIs and admin UI. Reuse existing import preview/validation/confirmation/audit pattern. Avoid incompatible duplicate questions or schema. Document mapping in `docs/data-vnhsge.md`.
2. Build deterministic, resumable read-only parser/validator for source files, including safe Unicode, math, image refs, missing field handling, IDs, correct option extraction, subject aliases, deduplication by `(source, commit/version, original ID)` or stable source key, JSON schema variations. Validate option count, answer membership, duplicate IDs, image path existence, and preserve original text.
3. Build explicit **dry run**: report totals per subject/split/exam, accepted/rejected/needs-review, copyright/license provenance, image inventory and anomalies; save JSON/CSV manifest, without DB writes.
4. Check upstream repository license (no license file found in root listing). **Copyright gate**: public repository does not automatically grant redistribution/commercial use rights. Avoid committing copied question bank/images into target repository or enabling public bulk export until license/permission clarified. Implement ingestion support and validation without redistributing full source corpus; if license unresolved, keep actual import BLOCKED, demonstrate using minimal synthetic fixtures only. Cite dataset and authors in docs.
5. If rights/permission validated and user approves content ingestion: execute only on **`StudyAIDb_E2E`** or `StudyAIDb_Clean_{GUID}` with explicit target environment guard and hard confirmation. Never import into main production `StudyAIDb` without a separately scoped authorization and safe production workflow; existing project restriction presently forbids all writes there.
6. Expose data via existing practice/question bank endpoints and frontend only when validation and rights gate passes; otherwise keep importer behind admin-only preview without changing live learner content. Handle images safely: paths, size/type limits, no remote hotlink dependencies or XSS.
7. Tests: parser unit cases, malformed JSON, option split, answer validity, images, dedupe/idempotency, dry-run zero writes, strict main DB fail-closed, API role permissions and UI preview. Run build/lint/tests, isolated E2E if appropriate; CI URL/SHA.
8. Report findings and safety gates in `ai-collaboration/REPORT.md` **only after** P20-001-FIX has been reviewed/closed (do not overwrite active report), or use `ai-collaboration/DATA-001-REPORT.md` in parallel. Append HISTORY and update STATUS carefully after sync. Stop before actual production import and for ChatGPT review.

**STOP GATES**: protected `StudyAIDb` zero writes/seed/migrate/reset; do not modify users; no silent mock fallback; no unlicensed redistribution; no Phase 21.

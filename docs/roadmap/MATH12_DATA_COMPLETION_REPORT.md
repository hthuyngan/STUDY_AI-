# MATH 12 DATA COMPLETION & REAL VALIDATION REPORT (V12.0)

> **Updated:** 2026-11-28 (Asia/Bangkok)
> **Dataset Location:** `backend/data/math12/`
> **Builder Script:** `scripts/math12_build_complete_dataset.py`
> **Validator Script:** `scripts/math12_audit_all_records.py` + `scripts/test_math12_validator.py` (`7/7` PASS)

---

## 1. Completed Dataset Summary

| Entity | Count | Details |
| :--- | :---: | :--- |
| **Chapters** | 6 | 6 chapters of GDPT 2018 Toán 12 (KNTT structure) |
| **Lessons** | 19 | 19 published lessons (`les_math12_c1_b1` .. `les_math12_c6_b2`) |
| **Lesson Content Blocks** | 190 | 10 blocks/lesson; upgraded with lesson-specific objectives, mistakes, examples, and exercises |
| **Questions** | **1,200** | **600** `multiple-choice`, **300** `true-false-group`, **300** `short-answer` (0 `LICENSE_BLOCKED` VNHSGE included) |
| **Assessments** | **34** | **18** chapter tests, **6** semester tests, **10** Math 12 mock exams (`12 MC + 4 TFG + 6 SA = 22`, 90 min); **0 empty** |
| **Materials** | **30** | 30 Markdown learning materials (5 categories × 6 chapters), byte-hashed SHA-256 |
| **Knowledge Base (RAG)** | **30 / 210** | 30 `AiKnowledgeSource`s and 210 non-duplicate `AiKnowledgeChunk`s (`indexed` in isolated test only) |

---

## 2. Independent SymPy Validation (`validation_manifest.json`)

- **`MATH_AUTO_VERIFIED`:** **681** questions (independently computed by SymPy without copying `correctAnswer`)
- **`HUMAN_REVIEW_REQUIRED`:** **519** questions (structured/TFG/conceptual items without `verificationSpec`)
- **`FAILED`:** **0** (previously failing `q_m12_c1_exp_mc_01` duplicate options fixed and verified)
- **Negative Validator Tests (`scripts/test_math12_validator.py`):** `7/7` PASS (wrong answer, duplicate options, equivalent options, unbalanced KaTeX, dangling ref, TFG count/key mismatch).

# STUDY_AI — PHASE 18: CURRICULUM IMPORT AUDIT (CORRECTED SPECIFICATION)
## Parser Technical Audit, Schema Realities, Business Key Mapping, and Security Barriers

- **Workspace**: `D:\TN`
- **Repository**: `hthuyngan/STUDY_AI-`
- **Status**: `[REVISED AUDIT — V1 HARDENED SPECIFICATION]`
- **Scope**: Source code audit of import engine (`CurriculumImportParser.cs`, `CurriculumImportValidator.cs`, `ContentEntities.cs`, `StudyAIDbContext.cs`).

---

## 1. Executive Summary & Schema Reconciliation

This technical audit evaluates the curriculum import pipeline against the **actual production database schema** in `StudyAIDbContext.cs`. 

While the ingestion parsers handle files with explicit entity codes (e.g., `SubjectCode`, `ChapterCode`, `LessonCode`, `QuestionCode`), the underlying SQL Server tables have significant schema asymmetries that dictate how business keys can be mapped without violating the Zero Migration policy.

```
+-------------------------------------------------------------------------------------------------------+
|                                    SCHEMA REALITIES AUDIT MATRIX                                      |
+-------------------+--------------------+------------------------+-------------------------------------+
| Entity            | Ingestion Payload  | Production Schema      | Architectural Finding               |
+-------------------+--------------------+------------------------+-------------------------------------+
| ContentSubject    | Code, Name, Grade  | Code (Unique), Name    | SUPPORTED: Direct 1-to-1 code match |
| ContentChapter    | Code, Title        | Title, SubjectId       | ASYMMETRIC: No 'Code' column in DB  |
| ContentLesson     | Code, Title, Slug  | Title, Slug, ChapterId | ASYMMETRIC: No 'Code' column in DB  |
| ContentQuestion   | Code, Fingerprint  | Prompt (nvarchar max)  | BLOCKED FOR CODE LOOKUP: No 'Code'  |
|                   |                    |                        | or 'Fingerprint' column in DB       |
+-------------------+--------------------+------------------------+-------------------------------------+
```

---

## 2. Ingestion Engine & Parser Limits Audit

### 2.1 File Limits Enforced in Source Code

`[VERIFIED FROM SOURCE CODE]` — `CurriculumImportParser.cs:14-17`:
```csharp
public const long MaxFileSizeBytes = 15 * 1024 * 1024;        // 15 MB
public const long MaxUncompressedZipBytes = 50 * 1024 * 1024; // 50 MB
public const int MaxAllowedRows = 5000;                       // 5,000 entities
public const int MaxAllowedColumns = 100;                     // 100 columns
```

1. **Upload Size Limit (`MaxFileSizeBytes = 15MB`)**:
   - Double-enforced at `CurriculumImportController.cs:66` (early HTTP header check) and `ReadStreamWithSecurityLimitsAsync()` in `CurriculumImportParser.cs` (chunk-level stream check).
2. **Decompressed ZIP Safety (`MaxUncompressedZipBytes = 50MB`)**:
   - Iterates through `ZipArchive.Entries` before extracting, summing uncompressed lengths to block ZIP-bomb denial-of-service.
3. **Row & Column Limits (`MaxAllowedRows = 5,000`, `MaxAllowedColumns = 100`)**:
   - Blocks wide spreadsheet attacks and unbounded arrays across JSON, CSV, and XLSX.

### 2.2 Encoding & Sanitization
- **UTF-8 BOM**: Explicitly stripped using `StripUtf8Bom()` in `CurriculumImportParser.cs:119`.
- **Excel Escaped Quotes**: Normalized using `CleanExcelEscapedQuotes()`.
- **Formula Injection Mitigation**: OpenXML cell parsing extracts cached evaluated values `<v>` and ignores formula expressions `<f>`.
- **XXE Hardening**: `XDocument.Load` should be paired with explicit `XmlReaderSettings { DtdProcessing = DtdProcessing.Prohibit, XmlResolver = null }`.

---

## 3. Business Key Mapping Without Production Migration

Because Phase 18 operates under strict **Zero Production Migration**, the import engine cannot add missing `Code` or `Fingerprint` columns to SQL Server tables. The business keys must be resolved as follows:

### 3.1 ContentSubject
- **Schema**: `Code` is `nvarchar(32)` with unique index `IX_content_subjects_Code`.
- **Mapping**: Mapped directly by `Code`.
- **Status**: **Fully Supported**.

### 3.2 ContentChapter
- **Schema**: Has `Id`, `SubjectId`, `Title`, `Description`, `OrderIndex`, `IsActive`. **No `Code` column exists.**
- **Mapping Strategy**:
  - Chapter identity within a subject is resolved using the composite tuple: `(SubjectId, Title.Trim().ToLowerInvariant())`.
  - The incoming `ChapterCode` from the import file is used **only in-memory** during batch parsing to link child lessons to this chapter. The code is not stored in the database.
- **Limitation**: SQL Server does not have a unique constraint on `(SubjectId, Title)`. Application logic must enforce uniqueness inside the transaction using `UPDLOCK`.

### 3.3 ContentLesson
- **Schema**: Has `Id`, `ChapterId`, `Title`, `Slug`, `OrderIndex`, `Status`, `AuthorId`, `Introduction`, etc. **No `Code` column exists.**
- **Mapping Strategy**:
  - Lesson identity within a chapter is resolved using the composite tuple: `(ChapterId, Slug.Trim().ToLowerInvariant())`.
  - The incoming `LessonCode` from the file is used **only in-memory** to link child questions to this lesson.
  - Requires setting `AuthorId` to `CurrentUserId`.
- **Limitation**: SQL Server has a non-unique index on `Slug`. Application logic must enforce single occurrence per chapter.

### 3.4 ContentQuestion
- **Schema**: Has `Id`, `LessonId`, `SubjectId`, `ChapterId`, `Prompt`, `OptionsJson`, `CorrectAnswer`, `Explanation`, `Topic`, `Difficulty`, `Type`, `Status`, `OrderIndex`.
- **Critical Schema Defect**:
  - There is **NO `Code` column**.
  - There is **NO `Fingerprint` column**.
  - `Prompt` is configured as `nvarchar(max)`. In SQL Server, columns of type `nvarchar(max)` cannot participate in standard B-tree unique indexes or key lookups without full table scans.
- **Architectural Status**: **BLOCKED FOR CODE-BASED DEDUPLICATION**.
  - Without schema migration, the system cannot look up questions by `Code` or prevent duplicate questions at the database engine level.
  - **V1 Safe Resolution**: In V1, questions are treated strictly as **Insert-Only**. When a lesson is imported, its questions are inserted as new rows. Cross-import question deduplication by code is **BLOCKED** until a schema migration adding a unique `Code` or `FingerprintHash` column is approved.

---

## 4. Hierarchy Validation Engine

The validator (`CurriculumImportValidator.cs`) executes four levels of structural validation:
1. **Subject Level**: Validates `Code`, `Name`, `Grade`. Rejects empty codes or invalid characters.
2. **Chapter Level**: Validates `Title`, ensures parent `SubjectCode` exists in DB or current batch.
3. **Lesson Level**: Validates `Title`, `Slug` regex (`^[a-z0-9-]+$`), ensures parent chapter exists.
4. **Question Level**: Validates `Prompt`, `CorrectAnswer`, `Options` count (>= 2 for multiple-choice), ensures difficulty is in `[easy, medium, hard]`, type is in `[multiple-choice, true-false, short-answer]`.

---

## 5. Audit Conclusion & Implementation Recommendations

1. **Strict Insert-Only for V1**:
   Because chapters, lessons, and questions lack database-enforced unique business keys, attempting an "Upsert" mode would risk updating the wrong records if titles or slugs repeat. V1 must be **Insert-Only**.
2. **In-Transaction Locking**:
   Because `(SubjectId, Title)` and `(ChapterId, Slug)` lack database unique constraints, the transaction must execute with `UPDLOCK, HOLDLOCK` to prevent concurrent imports from inserting duplicate chapters or lessons.
3. **Formal Schema Gap Notification**:
   The user/architect must be advised that persistent question codes require a future migration adding `Code nvarchar(64)` to `content_questions`.

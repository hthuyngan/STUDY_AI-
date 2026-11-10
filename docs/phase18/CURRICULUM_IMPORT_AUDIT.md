# STUDY_AI — PHASE 18: CURRICULUM IMPORT AUDIT
## Comprehensive Technical Audit of Parsers, Limits, Encodings, and Validation Rules

- **Workspace**: `D:\TN`
- **Repository**: `hthuyngan/STUDY_AI-`
- **Baseline Git SHA**: `ad8236ce01bebb0a086174b12a16e9db27a5d8c9`
- **Scope**: Source code audit of import engine (`CurriculumImportParser.cs`, `CurriculumImportValidator.cs`, `CurriculumImportController.cs`, `CurriculumImportDTOs.cs`).
- **Safety Status**: `StudyAIDb` is completely untouched (Read-only verified).

---

## 1. Executive Summary

The STUDY_AI Curriculum Import subsystem provides educators and content administrators with tools to ingest hierarchical curricula (Subjects, Chapters, Lessons) and question banks. Phase 17 laid down the preliminary models and read-only Preview API. 

This audit evaluates the parsing engine, security boundaries, encoding handlers, and validation rules in place as of commit `ad8236ce01bebb0a086174b12a16e9db27a5d8c9`.

```
+-----------------------------------------------------------------------------+
|                          CURRICULUM IMPORT AUDIT MATRIX                      |
+-------------------+----------------------+--------------------+-------------+
| Component         | Implementation State | Security Boundary  | Risk Level  |
+-------------------+----------------------+--------------------+-------------+
| JSON Parser       | Complete (Tree/Flat) | 15MB / 5,000 items | Low         |
| CSV Parser        | Complete (RFC 4180)  | UTF-8 BOM, Escaping| Low         |
| XLSX Parser       | Complete (OpenXML)   | Zip Bomb 50MB limit| Medium      |
| Encoding / Bom    | Implemented          | UTF-8 BOM Stripped | Low         |
| XML / XXE Defense | Standard XDocument   | Implicit DTD block | Low-Medium  |
| Formula Injection | Cell value extracted | `<v>` text parsed  | Low         |
| Hierarchy Valid.  | Multi-tier checks    | Parent-child DB ref| Low         |
+-------------------+----------------------+--------------------+-------------+
```

---

## 2. File Ingestion & Parser Limits Audit

### 2.1 File Limits Enforced in Source Code

`[VERIFIED FROM SOURCE CODE]` — In `backend/src/StudyAI.Application/Services/CurriculumImportParser.cs`:
```csharp
public const long MaxFileSizeBytes = 15 * 1024 * 1024;        // 15 MB
public const long MaxUncompressedZipBytes = 50 * 1024 * 1024; // 50 MB
public const int MaxAllowedRows = 5000;                       // 5,000 entities
public const int MaxAllowedColumns = 100;                     // 100 columns
```

1. **Upload Size Limit (`MaxFileSizeBytes = 15MB`)**:
   - Controller validation: `CurriculumImportController.cs:66` checks `if (file.Length > CurriculumImportParser.MaxFileSizeBytes)` and returns `400 BadRequest` with code `FILE_TOO_LARGE`.
   - Parser validation: `ReadStreamWithSecurityLimitsAsync()` in `CurriculumImportParser.cs` re-verifies bytes read from stream in memory chunks (`81,920` bytes buffer) and aborts if `totalBytesRead > MaxFileSizeBytes`.
   - Double-barrier design prevents memory exhaustion attacks even if form length headers are spoofed.

2. **Decompressed ZIP Safety (`MaxUncompressedZipBytes = 50MB`)**:
   - `CurriculumImportParser.cs:228-237`: During XLSX decompression, the parser iterates through `archive.Entries` and calculates cumulative uncompressed bytes:
     ```csharp
     long uncompressedTotal = 0;
     foreach (var entry in archive.Entries)
     {
         uncompressedTotal += entry.Length;
         if (uncompressedTotal > MaxUncompressedZipBytes)
         {
             throw new InvalidOperationException($"Tệp XLSX vượt quá dung lượng giải nén an toàn cho phép ({MaxUncompressedZipBytes / 1024 / 1024}MB - Zip bomb prevention).");
         }
     }
     ```
   - Prevents ZIP-bomb attacks (e.g. tiny 42KB zip file decompressing into gigabytes of XML).

3. **Entity Count Limit (`MaxAllowedRows = 5,000`)**:
   - For JSON: Incremental counter `totalEntities` across Subjects, Chapters, Lessons, Questions throws if `> 5000`.
   - For CSV: Data lines count `lines.Count - 1` throws if `> 5000`.
   - For XLSX: Sheet row count `rows.Count - 1` throws if `> 5000`.

4. **Column Count Limit (`MaxAllowedColumns = 100`)**:
   - Prevents denial-of-service via sparse matrix / wide spreadsheet attacks containing tens of thousands of empty columns.

---

## 3. Format-Specific Parser Analysis

### 3.1 JSON Parser (`ParseJsonAsync`)
- **Structure Support**:
  1. *Single Hierarchical Tree*: `{"subject": { "code": "MATH12", "chapters": [...] }}`
  2. *Array of Subjects*: `{"subjects": [ {...}, {...} ]}`
  3. *Flat Question Bank*: `{"questions": [ {...}, {...} ], "subjectCode": "MATH12"}`
- **Security & Resilience**:
  - Uses `System.Text.Json.JsonDocument` with `AllowTrailingCommas = true` and `CommentHandling = JsonCommentHandling.Skip`.
  - Non-blocking asynchronous memory buffering.
  - Generates SHA-256 fingerprint for all parsed entities.

### 3.2 CSV Parser (`ParseCsvAsync`)
- **RFC 4180 Compliance**:
  - Handles multiline fields enclosed in quotes.
  - Escaped quotes (`""` -> `"`) are normalized via `CleanExcelEscapedQuotes()`.
  - Strips UTF-8 Byte Order Mark (`\uFEFF`) using `StripUtf8Bom()`.
  - Case-insensitive column name resolution.
  - Compulsory header validation: Requires at least the `prompt` column.
  - Flexible column aliases: `difficulty` (defaults to "medium"), `type` (defaults to "multiple-choice"), `subjectcode` (defaults to "MATH12").

### 3.3 XLSX Parser (`ParseXlsxAsync`)
- **OpenXML Parsing via `System.IO.Compression.ZipArchive`**:
  - Direct OpenXML parsing without relying on third-party native binaries (e.g. EPPlus, ClosedXML).
  - Multi-sheet discovery via `xl/workbook.xml` and `xl/_rels/workbook.xml.rels`.
  - Fallback logic: If relationships are missing, falls back to `xl/worksheets/sheet1.xml`.
  - Reads `xl/sharedStrings.xml` for shared text table.
  - Cell value extraction: Reads `<c>` element with attribute `t="s"` (shared string index), `t="inlineStr"` (inline string), or direct text in `<v>`.
- `[REAL RISK / VULNERABILITY IDENTIFIED]` — **XML External Entity (XXE) Hardening in `XDocument.Load`**:
  - While .NET Core/.NET 10 `XmlReader` and `XDocument` default to `DtdProcessing = Prohibit`, `XDocument.Load(Stream)` without explicit `XmlReaderSettings` should be locked down with `XmlReaderSettings { DtdProcessing = DtdProcessing.Prohibit, XmlResolver = null }` to ensure zero tolerance across varied deployment configurations.

- `[VERIFIED FROM SOURCE CODE]` — **Formula Injection Mitigation**:
  - Excel formula cells in OpenXML store formula in `<f>` and cached calculation in `<v>`.
  - The parser reads `<v>` (the evaluated value) and ignores `<f>`.
  - Formulas starting with `=`, `@`, `+`, `-` are treated purely as raw text and will not be executed on the server.

---

## 4. Validation Rules & Relational Integrity

### 4.1 Hierarchy Chain
The curriculum follows a strict 4-level hierarchy:
```
Subject (e.g. MATH12)
  └── Chapter (e.g. CH01 - Giải tích hàm số)
        └── Lesson (e.g. LES01 - Tính đơn điệu của hàm số)
              └── Assessment / Questions (e.g. Q01, Q02...)
```

### 4.2 Entity Validation Matrix

| Entity | Required Fields | Format / Format Constraints | Pre-flight DB Checks |
|---|---|---|---|
| **Subject** | `Code`, `Name`, `Grade` | Alphanumeric + `_`, length <= 50 | Verified against `content_subjects` |
| **Chapter** | `Code`, `Title`, `SubjectCode` | Alphanumeric + `_`, length <= 100 | SubjectCode must exist in DB or Batch |
| **Lesson** | `Code`, `Title`, `ChapterCode`, `Slug` | Valid slug (`^[a-z0-9-]+$`) | ChapterCode must exist in DB or Batch |
| **Question** | `Prompt`, `CorrectAnswer`, `Options` | Difficulty: `easy/medium/hard`<br>Type: `multiple-choice/true-false/short-answer` | Parent Lesson/Subject must exist |

### 4.3 Action Categorization Engine
Every parsed entity is evaluated against current SQL Server state and assigned an `ImportActionType`:

1. `Insert`: Entity code does not exist in SQL Server. Will be created.
2. `Update`: Entity exists in SQL Server, but payload contains updated title, description, or content.
3. `Skip`: Entity exists in SQL Server with identical fingerprint / content. No change required.
4. `Conflict`: Entity code exists but references a conflicting parent ID, or attempts an illegal state transition (e.g., modifying an active published curriculum item with existing learner quiz attempts).

### 4.4 Question Deduplication Fingerprinting
- Fingerprint algorithm: `SHA256(LessonCode:Prompt.Trim().ToLowerInvariant())`
- Prevents accidental duplicates within the same batch or across historical imports.

---

## 5. Security & Data Hygiene Findings

1. `[VERIFIED FROM SOURCE CODE]` **XSS & Injection Sanitization**:
   - `CurriculumImportValidator.cs:35-37` uses `XssPattern` regex to flag `<script>`, `javascript:`, `<iframe>`, `<object>`, `<embed>`, inline event handlers (`onload=`), and data URIs in prompts, explanations, and definitions.
2. `[VERIFIED FROM SOURCE CODE]` **Strict Character Encoding**:
   - Standardized to UTF-8 without BOM.
   - Excel smart quotes (`“`, `”`) and apostrophes (`‘`, `’`) are preserved or normalized safely without breaking LaTeX strings (`$f(x) = x^2$`).
3. `[REAL RISK / VULNERABILITY IDENTIFIED]` **LaTeX Math Delimiter Collisions**:
   - Question prompts frequently contain `$ ... $` and `$$ ... $$` KaTeX expressions.
   - When importing CSV files, unescaped commas inside math expressions (e.g. `(x, y) \in \mathbb{R}^2`) must be enclosed in double quotes. The parser handles this correctly when RFC 4180 quotes are used, but warns if unmatched delimiters exist.

---

## 6. Audit Conclusion & Gaps for Confirm Design

| Component | Status | Required Action in Confirm Phase |
|---|---|---|
| Ingestion & Parser Limits | **PASS** | Maintain 15MB file / 50MB uncompressed limits in Confirm |
| Data Sanitization | **PASS** | Re-run XSS validator before DB commit |
| XML Parser Hardening | **LOW RISK** | Add explicit `XmlReaderSettings` with `DtdProcessing.Prohibit` |
| Relational Validation | **PASS** | Re-verify references inside transaction to prevent drift |

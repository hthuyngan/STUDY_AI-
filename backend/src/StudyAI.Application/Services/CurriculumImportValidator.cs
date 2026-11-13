using System.Text.RegularExpressions;
using Microsoft.EntityFrameworkCore;
using StudyAI.Application.Common.Interfaces;
using StudyAI.Application.DTOs;

namespace StudyAI.Application.Services;

public record ExistingSubjectLookup(string Id, string Code, string Name, string Grade, bool IsActive);
public record ExistingChapterLookup(string Id, string SubjectId, string Title, bool IsActive);
public record ExistingLessonLookup(string Id, string ChapterId, string Title, string Slug, string Status);
public record ExistingQuestionLookup(string Id, string? LessonId, string? SubjectId, string Prompt, string CorrectAnswer, string Status);

public class ExistingContentLookup
{
    public List<ExistingSubjectLookup> Subjects { get; set; } = new();
    public List<ExistingChapterLookup> Chapters { get; set; } = new();
    public List<ExistingLessonLookup> Lessons { get; set; } = new();
    public List<ExistingQuestionLookup> Questions { get; set; } = new();
}

public class CurriculumImportValidator : ICurriculumImportValidator
{
    private readonly IApplicationDbContext? _context;

    private static readonly HashSet<string> ValidDifficulties = new(StringComparer.OrdinalIgnoreCase)
    {
        "easy", "medium", "hard"
    };

    private static readonly HashSet<string> ValidQuestionTypes = new(StringComparer.OrdinalIgnoreCase)
    {
        "multiple-choice", "true-false", "short-answer", "essay", "reading-comprehension"
    };

    private static readonly Regex XssPattern = new(
        @"<\s*script[^>]*>|javascript\s*:|<\s*iframe[^>]*>|<\s*object[^>]*>|<\s*embed[^>]*>|on\w+\s*=|data:\s*text\/html",
        RegexOptions.IgnoreCase | RegexOptions.Compiled);

    public CurriculumImportValidator(IApplicationDbContext? context = null)
    {
        _context = context;
    }

    protected virtual async Task<ExistingContentLookup> LoadExistingContentLookupAsync(CancellationToken cancellationToken)
    {
        if (_context == null)
        {
            return new ExistingContentLookup();
        }

        var existingSubjects = await _context.ContentSubjects
            .AsNoTracking()
            .Select(s => new ExistingSubjectLookup(s.Id, s.Code, s.Name, s.Grade, s.IsActive))
            .ToListAsync(cancellationToken);

        var existingChapters = await _context.ContentChapters
            .AsNoTracking()
            .Select(c => new ExistingChapterLookup(c.Id, c.SubjectId, c.Title, c.IsActive))
            .ToListAsync(cancellationToken);

        var existingLessons = await _context.ContentLessons
            .AsNoTracking()
            .Select(l => new ExistingLessonLookup(l.Id, l.ChapterId, l.Title, l.Slug, l.Status))
            .ToListAsync(cancellationToken);

        var existingQuestions = await _context.ContentQuestions
            .AsNoTracking()
            .Select(q => new ExistingQuestionLookup(q.Id, q.LessonId, q.SubjectId, q.Prompt, q.CorrectAnswer, q.Status))
            .ToListAsync(cancellationToken);

        return new ExistingContentLookup
        {
            Subjects = existingSubjects,
            Chapters = existingChapters,
            Lessons = existingLessons,
            Questions = existingQuestions
        };
    }

    public async Task<ImportValidationResult> ValidateBatchAsync(
        CurriculumImportBatchDto batch,
        CancellationToken cancellationToken = default)
    {
        var result = new ImportValidationResult();

        // 1. Preload existing entities for fast relational verification and integrity checking
        var lookup = await LoadExistingContentLookupAsync(cancellationToken);

        // Sets of available codes (DB + batch)
        var dbSubjectCodes = new HashSet<string>(lookup.Subjects.Select(s => s.Code), StringComparer.OrdinalIgnoreCase);
        var batchSubjectCodes = new HashSet<string>(StringComparer.OrdinalIgnoreCase);

        var dbChapterIds = new HashSet<string>(lookup.Chapters.Select(c => c.Id), StringComparer.OrdinalIgnoreCase);
        var batchChapterCodes = new HashSet<string>(StringComparer.OrdinalIgnoreCase);

        var dbLessonIds = new HashSet<string>(lookup.Lessons.Select(l => l.Id), StringComparer.OrdinalIgnoreCase);
        var batchLessonCodes = new HashSet<string>(StringComparer.OrdinalIgnoreCase);

        // Collect all batch declared codes
        foreach (var sub in batch.Subjects)
        {
            if (!string.IsNullOrWhiteSpace(sub.Code)) batchSubjectCodes.Add(sub.Code);
            foreach (var ch in sub.Chapters)
            {
                if (!string.IsNullOrWhiteSpace(ch.Code)) batchChapterCodes.Add(ch.Code);
                foreach (var les in ch.Lessons)
                {
                    if (!string.IsNullOrWhiteSpace(les.Code)) batchLessonCodes.Add(les.Code);
                }
            }
        }

        // Map existing questions by fingerprint for quick conflict / status check
        var existingQuestionsByFp = new Dictionary<string, ExistingQuestionLookup>(StringComparer.OrdinalIgnoreCase);
        foreach (var eq in lookup.Questions)
        {
            var fp = CurriculumImportParser.GenerateQuestionFingerprint(eq.LessonId ?? eq.SubjectId ?? "", eq.Prompt);
            existingQuestionsByFp[fp] = eq;
        }

        var seenQuestionFingerprints = new HashSet<string>(StringComparer.OrdinalIgnoreCase);
        var seenQuestionCodes = new HashSet<string>(StringComparer.OrdinalIgnoreCase);

        // 2. Validate Subjects
        var seenBatchSubjects = new HashSet<string>(StringComparer.OrdinalIgnoreCase);
        foreach (var sub in batch.Subjects)
        {
            ValidateSubject(sub, seenBatchSubjects, dbSubjectCodes, result.Errors, result.Warnings, result.Previews);

            // Validate Chapters
            var seenBatchChapters = new HashSet<string>(StringComparer.OrdinalIgnoreCase);
            foreach (var ch in sub.Chapters)
            {
                ValidateChapter(ch, sub.Code, seenBatchChapters, dbChapterIds, result.Errors, result.Warnings, result.Previews);

                // Validate Lessons
                var seenBatchLessons = new HashSet<string>(StringComparer.OrdinalIgnoreCase);
                foreach (var les in ch.Lessons)
                {
                    ValidateLesson(les, ch.Code, sub.Code, seenBatchLessons, lookup, result.Errors, result.Warnings, result.Previews);

                    // Validate embedded Questions in Lesson
                    foreach (var q in les.Questions)
                    {
                        q.SubjectCode = sub.Code;
                        q.ChapterCode = ch.Code;
                        q.LessonCode = les.Code;
                        ValidateQuestion(q, dbSubjectCodes, batchSubjectCodes, dbLessonIds, batchLessonCodes,
                            seenQuestionCodes, seenQuestionFingerprints, existingQuestionsByFp, result.Errors, result.Warnings, result.Previews);
                    }
                }
            }
        }

        // 3. Validate Flat Questions (from CSV / Question bank XLSX)
        foreach (var q in batch.FlatQuestions)
        {
            ValidateQuestion(q, dbSubjectCodes, batchSubjectCodes, dbLessonIds, batchLessonCodes,
                seenQuestionCodes, seenQuestionFingerprints, existingQuestionsByFp, result.Errors, result.Warnings, result.Previews);
        }

        // 4. Calculate summary counts
        var insertCount = result.Previews.Count(p => p.Action == ImportActionType.Insert);
        var updateCount = result.Previews.Count(p => p.Action == ImportActionType.Update);
        var skipCount = result.Previews.Count(p => p.Action == ImportActionType.Skip);
        var conflictCount = result.Previews.Count(p => p.Action == ImportActionType.Conflict);

        result.Summary = new ImportPreviewSummaryDto
        {
            TotalItems = result.Previews.Count,
            InsertCount = insertCount,
            UpdateCount = updateCount,
            SkipCount = skipCount,
            ConflictCount = conflictCount,
            ErrorCount = result.Errors.Count,
            WarningCount = result.Warnings.Count
        };

        return result;
    }

    private void ValidateSubject(
        ImportSubjectItemDto sub,
        HashSet<string> seenBatchSubjects,
        HashSet<string> dbSubjectCodes,
        List<ImportValidationErrorDto> errors,
        List<ImportValidationErrorDto> warnings,
        List<ImportItemPreviewDto> previewItems)
    {
        var row = sub.RowNumber > 0 ? sub.RowNumber : 1;

        if (string.IsNullOrWhiteSpace(sub.Code))
        {
            errors.Add(new ImportValidationErrorDto
            {
                Row = row,
                Field = "Subject.Code",
                ErrorCode = "REQUIRED_FIELD_MISSING",
                Message = "Mã môn học (Subject Code) không được để trống."
            });
        }
        else if (!seenBatchSubjects.Add(sub.Code))
        {
            errors.Add(new ImportValidationErrorDto
            {
                Row = row,
                Field = "Subject.Code",
                ErrorCode = "DUPLICATE_CODE_IN_FILE",
                Message = $"Mã môn học '{sub.Code}' bị trùng lặp trong tệp nhập.",
                RejectedValue = sub.Code
            });
        }

        if (string.IsNullOrWhiteSpace(sub.Name))
        {
            errors.Add(new ImportValidationErrorDto
            {
                Row = row,
                Field = "Subject.Name",
                ErrorCode = "REQUIRED_FIELD_MISSING",
                Message = "Tên môn học (Subject Name) không được để trống."
            });
        }

        if (DetectMaliciousPayload(sub.Name, out var xssErr))
        {
            errors.Add(new ImportValidationErrorDto
            {
                Row = row,
                Field = "Subject.Name",
                ErrorCode = "SECURITY_XSS_DETECTED",
                Message = $"Tên môn học chứa mã không an toàn: {xssErr}",
                RejectedValue = sub.Name
            });
        }

        var existsInDb = !string.IsNullOrWhiteSpace(sub.Code) && dbSubjectCodes.Contains(sub.Code);
        previewItems.Add(new ImportItemPreviewDto
        {
            EntityType = "subject",
            Identifier = sub.Code,
            Title = sub.Name,
            Action = existsInDb ? ImportActionType.Update : ImportActionType.Insert,
            Reason = existsInDb ? "Môn học đã tồn tại trong DB, sẽ cập nhật thông tin." : "Môn học mới, sẽ tạo mới."
        });
    }

    private void ValidateChapter(
        ImportChapterItemDto ch,
        string parentSubjectCode,
        HashSet<string> seenBatchChapters,
        HashSet<string> dbChapterIds,
        List<ImportValidationErrorDto> errors,
        List<ImportValidationErrorDto> warnings,
        List<ImportItemPreviewDto> previewItems)
    {
        var row = ch.RowNumber > 0 ? ch.RowNumber : 1;

        if (string.IsNullOrWhiteSpace(ch.Code))
        {
            errors.Add(new ImportValidationErrorDto
            {
                Row = row,
                Field = "Chapter.Code",
                ErrorCode = "REQUIRED_FIELD_MISSING",
                Message = "Mã chương (Chapter Code) không được để trống."
            });
        }
        else if (!seenBatchChapters.Add(ch.Code))
        {
            errors.Add(new ImportValidationErrorDto
            {
                Row = row,
                Field = "Chapter.Code",
                ErrorCode = "DUPLICATE_CODE_IN_FILE",
                Message = $"Mã chương '{ch.Code}' bị trùng lặp trong cùng môn học.",
                RejectedValue = ch.Code
            });
        }

        if (string.IsNullOrWhiteSpace(ch.Title))
        {
            errors.Add(new ImportValidationErrorDto
            {
                Row = row,
                Field = "Chapter.Title",
                ErrorCode = "REQUIRED_FIELD_MISSING",
                Message = "Tiêu đề chương (Chapter Title) không được để trống."
            });
        }

        if (DetectMaliciousPayload(ch.Title, out var xssErr))
        {
            errors.Add(new ImportValidationErrorDto
            {
                Row = row,
                Field = "Chapter.Title",
                ErrorCode = "SECURITY_XSS_DETECTED",
                Message = $"Tiêu đề chương chứa mã không an toàn: {xssErr}",
                RejectedValue = ch.Title
            });
        }

        var exists = !string.IsNullOrWhiteSpace(ch.Code) && dbChapterIds.Contains(ch.Code);
        previewItems.Add(new ImportItemPreviewDto
        {
            EntityType = "chapter",
            Identifier = ch.Code,
            Title = ch.Title,
            Action = exists ? ImportActionType.Update : ImportActionType.Insert,
            Reason = exists ? "Chương đã tồn tại trong DB, sẽ cập nhật." : "Chương mới, sẽ tạo mới."
        });
    }

    private void ValidateLesson(
        ImportLessonItemDto les,
        string parentChapterCode,
        string parentSubjectCode,
        HashSet<string> seenBatchLessons,
        ExistingContentLookup lookup,
        List<ImportValidationErrorDto> errors,
        List<ImportValidationErrorDto> warnings,
        List<ImportItemPreviewDto> previewItems)
    {
        var row = les.RowNumber > 0 ? les.RowNumber : 1;

        if (string.IsNullOrWhiteSpace(les.Code))
        {
            errors.Add(new ImportValidationErrorDto
            {
                Row = row,
                Field = "Lesson.Code",
                ErrorCode = "REQUIRED_FIELD_MISSING",
                Message = "Mã bài học (Lesson Code) không được để trống."
            });
        }
        else if (!seenBatchLessons.Add(les.Code))
        {
            errors.Add(new ImportValidationErrorDto
            {
                Row = row,
                Field = "Lesson.Code",
                ErrorCode = "DUPLICATE_CODE_IN_FILE",
                Message = $"Mã bài học '{les.Code}' bị trùng lặp trong tệp.",
                RejectedValue = les.Code
            });
        }

        if (string.IsNullOrWhiteSpace(les.Title))
        {
            errors.Add(new ImportValidationErrorDto
            {
                Row = row,
                Field = "Lesson.Title",
                ErrorCode = "REQUIRED_FIELD_MISSING",
                Message = "Tiêu đề bài học (Lesson Title) không được để trống."
            });
        }

        // Validate LaTeX in formulas
        foreach (var f in les.Formulas)
        {
            if (!string.IsNullOrWhiteSpace(f.Latex) && !ValidateKaTeX(f.Latex, out var kErr))
            {
                errors.Add(new ImportValidationErrorDto
                {
                    Row = row,
                    Field = $"Lesson.Formulas[{f.Name}].Latex",
                    ErrorCode = "INVALID_KATEX_SYNTAX",
                    Message = $"Công thức LaTeX '{f.Name}' không hợp lệ: {kErr}",
                    RejectedValue = f.Latex
                });
            }
        }

        // Validate XSS in definitions
        foreach (var d in les.Definitions)
        {
            if (DetectMaliciousPayload(d.Content, out var xssErr))
            {
                errors.Add(new ImportValidationErrorDto
                {
                    Row = row,
                    Field = $"Lesson.Definitions[{d.Term}]",
                    ErrorCode = "SECURITY_XSS_DETECTED",
                    Message = $"Định nghĩa '{d.Term}' chứa mã độc: {xssErr}",
                    RejectedValue = d.Content
                });
            }
        }

        // CHECK PUBLISHED / APPROVED CONTENT PROTECTION
        var existingLesson = lookup.Lessons.FirstOrDefault(l =>
            (!string.IsNullOrWhiteSpace(les.Code) && string.Equals(l.Id, les.Code, StringComparison.OrdinalIgnoreCase)) ||
            (!string.IsNullOrWhiteSpace(les.Slug) && string.Equals(l.Slug, les.Slug, StringComparison.OrdinalIgnoreCase)));

        if (existingLesson != null)
        {
            var isPublishedOrApproved = string.Equals(existingLesson.Status, "published", StringComparison.OrdinalIgnoreCase) ||
                                        string.Equals(existingLesson.Status, "approved", StringComparison.OrdinalIgnoreCase);

            if (isPublishedOrApproved)
            {
                errors.Add(new ImportValidationErrorDto
                {
                    Row = row,
                    Field = "Lesson.Status",
                    ErrorCode = "CONFLICT_PUBLISHED_CONTENT_PROTECTED",
                    Message = $"Bài học '{existingLesson.Title}' (ID: {existingLesson.Id}) hiện đang ở trạng thái '{existingLesson.Status}'. Để bảo toàn tính toàn vẹn học thuật, hệ thống cấm tự động ghi đè bài học đã duyệt/xuất bản.",
                    RejectedValue = les.Code
                });

                previewItems.Add(new ImportItemPreviewDto
                {
                    EntityType = "lesson",
                    Identifier = les.Code,
                    Title = les.Title,
                    Action = ImportActionType.Conflict,
                    Reason = $"Xung đột: Bài học đã ở trạng thái '{existingLesson.Status}', bị khóa chống ghi đè tự động."
                });
                return;
            }

            previewItems.Add(new ImportItemPreviewDto
            {
                EntityType = "lesson",
                Identifier = les.Code,
                Title = les.Title,
                Action = ImportActionType.Update,
                Reason = "Bài học đã tồn tại ở bản nháp/lưu trữ (draft/archived), sẽ cập nhật nội dung."
            });
        }
        else
        {
            previewItems.Add(new ImportItemPreviewDto
            {
                EntityType = "lesson",
                Identifier = les.Code,
                Title = les.Title,
                Action = ImportActionType.Insert,
                Reason = "Bài học mới, sẽ thêm vào chương trình (trạng thái draft)."
            });
        }
    }

    public static string ResolveSubjectAlias(string? rawSubjectCode)
    {
        if (string.IsNullOrWhiteSpace(rawSubjectCode)) return "MATH12";
        var norm = rawSubjectCode.Trim().ToUpperInvariant();
        return norm switch
        {
            "MATH" or "TOAN" or "TOAN12" or "MATH12" => "MATH12",
            "PHYS" or "PHYSICS" or "VATLY" or "VAT_LY" or "VAT-LY" or "LY" or "PHYS12" => "PHYS12",
            "CHEM" or "CHEMISTRY" or "HOAHOC" or "HOA_HOC" or "HOA-HOC" or "HOA" or "CHEM12" => "CHEM12",
            "BIO" or "BIOLOGY" or "SINHHOC" or "SINH_HOC" or "SINH-HOC" or "SINH" or "BIO12" => "BIO12",
            "LIT" or "LITERATURE" or "NGUVAN" or "NGU_VAN" or "NGU-VAN" or "VAN" or "LIT12" => "LIT12",
            "ENG" or "ENGLISH" or "TIENGANH" or "TIENG_ANH" or "TIENG-ANH" or "ANH" or "ENG12" => "ENG12",
            "HIST" or "HISTORY" or "LICHSU" or "LICH_SU" or "LICH-SU" or "SU" or "HIST12" => "HIST12",
            "GEO" or "GEOGRAPHY" or "DIALY" or "DIA_LY" or "DIA-LY" or "DIA" or "GEO12" => "GEO12",
            "GDCD" or "CIVICS" or "CIVIC_EDUCATION" or "GDCD12" => "GDCD12",
            _ => rawSubjectCode.Trim()
        };
    }

    private void ValidateQuestion(
        ImportQuestionItemDto q,
        HashSet<string> dbSubjectCodes,
        HashSet<string> batchSubjectCodes,
        HashSet<string> dbLessonIds,
        HashSet<string> batchLessonCodes,
        HashSet<string> seenQuestionCodes,
        HashSet<string> seenQuestionFingerprints,
        Dictionary<string, ExistingQuestionLookup> existingQuestionsByFp,
        List<ImportValidationErrorDto> errors,
        List<ImportValidationErrorDto> warnings,
        List<ImportItemPreviewDto> previewItems)
    {
        var row = q.RowNumber > 0 ? q.RowNumber : 1;

        // 1. Check duplicate Question Code in batch (if code provided)
        if (!string.IsNullOrWhiteSpace(q.Code))
        {
            if (!seenQuestionCodes.Add(q.Code))
            {
                errors.Add(new ImportValidationErrorDto
                {
                    Row = row,
                    Field = "Code",
                    ErrorCode = "DUPLICATE_QUESTION_CODE_IN_FILE",
                    Message = $"Mã câu hỏi '{q.Code}' bị trùng lặp trong tệp nhập.",
                    RejectedValue = q.Code
                });
            }
        }

        // 2. Relational check: Subject
        if (!string.IsNullOrWhiteSpace(q.SubjectCode))
        {
            q.SubjectCode = ResolveSubjectAlias(q.SubjectCode);

            if (!dbSubjectCodes.Contains(q.SubjectCode) && !batchSubjectCodes.Contains(q.SubjectCode))
            {
                errors.Add(new ImportValidationErrorDto
                {
                    Row = row,
                    Field = "SubjectCode",
                    ErrorCode = "PARENT_SUBJECT_NOT_FOUND",
                    Message = $"Môn học tham chiếu '{q.SubjectCode}' không tồn tại trong hệ thống hoặc tệp nhập.",
                    RejectedValue = q.SubjectCode
                });
            }
        }

        // 3. Relational check: Lesson (Warning if missing)
        if (!string.IsNullOrWhiteSpace(q.LessonCode))
        {
            if (!dbLessonIds.Contains(q.LessonCode) && !batchLessonCodes.Contains(q.LessonCode))
            {
                warnings.Add(new ImportValidationErrorDto
                {
                    Row = row,
                    Field = "LessonCode",
                    ErrorCode = "PARENT_LESSON_NOT_FOUND",
                    Message = $"Bài học tham chiếu '{q.LessonCode}' chưa tồn tại. Câu hỏi sẽ được lưu ở ngân hàng câu hỏi môn học.",
                    RejectedValue = q.LessonCode,
                    Severity = ImportErrorSeverity.Warning
                });
            }
        }

        // 4. Question Prompt
        if (string.IsNullOrWhiteSpace(q.Prompt))
        {
            errors.Add(new ImportValidationErrorDto
            {
                Row = row,
                Field = "Prompt",
                ErrorCode = "REQUIRED_FIELD_MISSING",
                Message = "Nội dung câu hỏi (Prompt) không được để trống."
            });
        }
        else
        {
            if (DetectMaliciousPayload(q.Prompt, out var xssErr))
            {
                errors.Add(new ImportValidationErrorDto
                {
                    Row = row,
                    Field = "Prompt",
                    ErrorCode = "SECURITY_XSS_DETECTED",
                    Message = $"Nội dung câu hỏi chứa mã không an toàn: {xssErr}",
                    RejectedValue = q.Prompt
                });
            }

            if (!ValidateKaTeX(q.Prompt, out var katexErr))
            {
                errors.Add(new ImportValidationErrorDto
                {
                    Row = row,
                    Field = "Prompt",
                    ErrorCode = "INVALID_KATEX_SYNTAX",
                    Message = $"Cú pháp công thức Toán (KaTeX) trong câu hỏi bị lỗi: {katexErr}",
                    RejectedValue = q.Prompt
                });
            }
        }

        // 5. Question Type & Difficulty
        var diff = q.Difficulty.Trim().ToLowerInvariant();
        if (!ValidDifficulties.Contains(diff))
        {
            errors.Add(new ImportValidationErrorDto
            {
                Row = row,
                Field = "Difficulty",
                ErrorCode = "INVALID_ENUM_VALUE",
                Message = $"Độ khó '{q.Difficulty}' không hợp lệ. Chỉ chấp nhận: easy, medium, hard.",
                RejectedValue = q.Difficulty
            });
        }
        else
        {
            q.Difficulty = diff;
        }

        var qType = q.Type.Trim().ToLowerInvariant();
        if (!ValidQuestionTypes.Contains(qType))
        {
            errors.Add(new ImportValidationErrorDto
            {
                Row = row,
                Field = "Type",
                ErrorCode = "INVALID_ENUM_VALUE",
                Message = $"Loại câu hỏi '{q.Type}' không hợp lệ. Chỉ chấp nhận: multiple-choice, true-false, short-answer.",
                RejectedValue = q.Type
            });
        }
        else
        {
            q.Type = qType;
        }

        // 6. Options & CorrectAnswer Verification
        if (q.Type == "multiple-choice")
        {
            if (q.Options == null || q.Options.Count < 2)
            {
                errors.Add(new ImportValidationErrorDto
                {
                    Row = row,
                    Field = "Options",
                    ErrorCode = "INSUFFICIENT_OPTIONS",
                    Message = "Câu hỏi trắc nghiệm phải có ít nhất 2 đáp án lựa chọn.",
                    RejectedValue = q.Options == null ? "0" : q.Options.Count.ToString()
                });
            }
            else
            {
                // Check duplicate options within the same question
                var seenOpts = new HashSet<string>(StringComparer.OrdinalIgnoreCase);
                for (int i = 0; i < q.Options.Count; i++)
                {
                    var opt = q.Options[i];
                    var normOpt = opt.Trim();

                    if (!seenOpts.Add(normOpt))
                    {
                        errors.Add(new ImportValidationErrorDto
                        {
                            Row = row,
                            Field = $"Options[{i}]",
                            ErrorCode = "DUPLICATE_OPTIONS_IN_QUESTION",
                            Message = $"Câu hỏi chứa lựa chọn bị trùng lặp nội dung: '{normOpt}'.",
                            RejectedValue = normOpt
                        });
                    }

                    if (DetectMaliciousPayload(opt, out var optXss))
                    {
                        errors.Add(new ImportValidationErrorDto
                        {
                            Row = row,
                            Field = $"Options[{i}]",
                            ErrorCode = "SECURITY_XSS_DETECTED",
                            Message = $"Lựa chọn {i + 1} chứa mã độc: {optXss}",
                            RejectedValue = opt
                        });
                    }

                    if (!ValidateKaTeX(opt, out var optKatex))
                    {
                        errors.Add(new ImportValidationErrorDto
                        {
                            Row = row,
                            Field = $"Options[{i}]",
                            ErrorCode = "INVALID_KATEX_SYNTAX",
                            Message = $"Lựa chọn {i + 1} chứa lỗi cú pháp KaTeX: {optKatex}",
                            RejectedValue = opt
                        });
                    }
                }
            }

            if (string.IsNullOrWhiteSpace(q.CorrectAnswer))
            {
                errors.Add(new ImportValidationErrorDto
                {
                    Row = row,
                    Field = "CorrectAnswer",
                    ErrorCode = "REQUIRED_FIELD_MISSING",
                    Message = "Đáp án đúng không được để trống."
                });
            }
            else
            {
                var normAns = q.CorrectAnswer.Trim();
                int optCount = q.Options?.Count ?? 0;

                // Case A: CorrectAnswer is a letter (A, B, C, D, E, F...)
                if (normAns.Length == 1 && char.IsLetter(normAns[0]))
                {
                    int letterIdx = char.ToUpperInvariant(normAns[0]) - 'A';
                    if (letterIdx < 0 || letterIdx >= optCount)
                    {
                        char maxLetter = optCount > 0 ? (char)('A' + optCount - 1) : 'A';
                        errors.Add(new ImportValidationErrorDto
                        {
                            Row = row,
                            Field = "CorrectAnswer",
                            ErrorCode = "CORRECT_ANSWER_OUT_OF_RANGE",
                            Message = $"Đáp án đúng là '{normAns}' nhưng câu hỏi chỉ có {optCount} lựa chọn (từ A đến {maxLetter}).",
                            RejectedValue = normAns
                        });
                    }
                }
                else
                {
                    // Case B: CorrectAnswer is text content matching an option
                    bool matchesContent = q.Options != null && q.Options.Any(o => string.Equals(o.Trim(), normAns, StringComparison.OrdinalIgnoreCase));
                    if (!matchesContent)
                    {
                        errors.Add(new ImportValidationErrorDto
                        {
                            Row = row,
                            Field = "CorrectAnswer",
                            ErrorCode = "CORRECT_ANSWER_MISMATCH",
                            Message = $"Đáp án đúng '{q.CorrectAnswer}' không khớp với ký tự (A/B/C/D) hoặc nội dung của các lựa chọn.",
                            RejectedValue = q.CorrectAnswer
                        });
                    }
                }
            }
        }
        else if (q.Type == "true-false")
        {
            var norm = q.CorrectAnswer.Trim().ToLowerInvariant();
            if (norm != "true" && norm != "false" && norm != "đúng" && norm != "sai" && norm != "1" && norm != "0")
            {
                errors.Add(new ImportValidationErrorDto
                {
                    Row = row,
                    Field = "CorrectAnswer",
                    ErrorCode = "INVALID_TRUE_FALSE_ANSWER",
                    Message = $"Đáp án câu đúng/sai '{q.CorrectAnswer}' phải là true/false hoặc Đúng/Sai.",
                    RejectedValue = q.CorrectAnswer
                });
            }
        }

        // 7. Explanation
        if (!string.IsNullOrWhiteSpace(q.Explanation))
        {
            if (DetectMaliciousPayload(q.Explanation, out var expXss))
            {
                errors.Add(new ImportValidationErrorDto
                {
                    Row = row,
                    Field = "Explanation",
                    ErrorCode = "SECURITY_XSS_DETECTED",
                    Message = $"Lời giải chi tiết chứa mã độc: {expXss}",
                    RejectedValue = q.Explanation
                });
            }

            if (!ValidateKaTeX(q.Explanation, out var expKatex))
            {
                errors.Add(new ImportValidationErrorDto
                {
                    Row = row,
                    Field = "Explanation",
                    ErrorCode = "INVALID_KATEX_SYNTAX",
                    Message = $"Lời giải chi tiết chứa lỗi KaTeX: {expKatex}",
                    RejectedValue = q.Explanation
                });
            }
        }

        // 8. Fingerprint & Published Status Protection
        var fingerprint = CurriculumImportParser.GenerateQuestionFingerprint(q.LessonCode ?? q.SubjectCode, q.Prompt);
        q.Fingerprint = fingerprint;

        var identifier = !string.IsNullOrWhiteSpace(q.Code) ? q.Code : $"FP:{fingerprint[..8]}";
        var shortTitle = q.Prompt.Length > 60 ? q.Prompt[..60] + "..." : q.Prompt;

        // Check duplicate within same file
        if (!seenQuestionFingerprints.Add(fingerprint))
        {
            errors.Add(new ImportValidationErrorDto
            {
                Row = row,
                Field = "Prompt",
                ErrorCode = "DUPLICATE_QUESTION_IN_FILE",
                Message = "Câu hỏi bị trùng lặp nội dung với một câu hỏi khác trong cùng tệp nhập.",
                RejectedValue = shortTitle
            });

            previewItems.Add(new ImportItemPreviewDto
            {
                EntityType = "question",
                Identifier = identifier,
                Title = shortTitle,
                Action = ImportActionType.Conflict,
                Reason = "Trùng lặp nội dung hoàn toàn trong tệp nhập."
            });
            return;
        }

        // Check collision with existing database questions
        if (existingQuestionsByFp.TryGetValue(fingerprint, out var existingQ))
        {
            var isPublishedOrApproved = string.Equals(existingQ.Status, "published", StringComparison.OrdinalIgnoreCase) ||
                                        string.Equals(existingQ.Status, "approved", StringComparison.OrdinalIgnoreCase);

            if (isPublishedOrApproved)
            {
                errors.Add(new ImportValidationErrorDto
                {
                    Row = row,
                    Field = "Question.Status",
                    ErrorCode = "CONFLICT_PUBLISHED_QUESTION_PROTECTED",
                    Message = $"Câu hỏi '{shortTitle}' đã tồn tại trong CSDL với trạng thái '{existingQ.Status}'. Hệ thống cấm tự động ghi đè câu hỏi trong ngân hàng khảo thí chính thức.",
                    RejectedValue = existingQ.Id
                });

                previewItems.Add(new ImportItemPreviewDto
                {
                    EntityType = "question",
                    Identifier = existingQ.Id,
                    Title = shortTitle,
                    Action = ImportActionType.Conflict,
                    Reason = $"Xung đột: Câu hỏi đã xuất bản ('{existingQ.Status}'), bị khóa chống ghi đè."
                });
                return;
            }

            previewItems.Add(new ImportItemPreviewDto
            {
                EntityType = "question",
                Identifier = existingQ.Id,
                Title = shortTitle,
                Action = ImportActionType.Update,
                Reason = "Câu hỏi tồn tại ở trạng thái nháp (draft), sẽ cập nhật nội dung."
            });
        }
        else
        {
            previewItems.Add(new ImportItemPreviewDto
            {
                EntityType = "question",
                Identifier = identifier,
                Title = shortTitle,
                Action = ImportActionType.Insert,
                Reason = "Câu hỏi mới, sẽ thêm vào ngân hàng câu hỏi (trạng thái draft)."
            });
        }
    }

    public bool ValidateKaTeX(string text, out string? errorMessage)
    {
        errorMessage = null;
        if (string.IsNullOrEmpty(text)) return true;

        // 1. Check balanced dollar signs (handling escaped \$, e.g. \$)
        int dollarCount = 0;
        for (int i = 0; i < text.Length; i++)
        {
            if (text[i] == '$')
            {
                int bsCount = 0;
                for (int j = i - 1; j >= 0 && text[j] == '\\'; j--) bsCount++;
                if (bsCount % 2 == 0) dollarCount++;
            }
        }

        if (dollarCount % 2 != 0)
        {
            errorMessage = $"Số lượng ký hiệu dollar '$' không cân xứng (tìm thấy {dollarCount} ký hiệu chưa đóng).";
            return false;
        }

        // 2. Extract math segments and check balanced curly braces { }
        var mathMatches = Regex.Matches(text, @"(?<!\\)\$\$(.*?)(?<!\\)\$\$|(?<!\\)\$(.*?)(?<!\\)\$", RegexOptions.Singleline);
        foreach (Match match in mathMatches)
        {
            var formula = match.Value;
            int braceDepth = 0;
            for (int i = 0; i < formula.Length; i++)
            {
                char c = formula[i];
                if (c == '{' || c == '}')
                {
                    int bs = 0;
                    for (int j = i - 1; j >= 0 && formula[j] == '\\'; j--) bs++;
                    if (bs % 2 == 0)
                    {
                        if (c == '{') braceDepth++;
                        else braceDepth--;

                        if (braceDepth < 0)
                        {
                            errorMessage = $"Dấu đóng ngoặc nhọn '}}' xuất hiện trước dấu mở ngoặc trong biểu thức '{formula}'.";
                            return false;
                        }
                    }
                }
            }

            if (braceDepth != 0)
            {
                errorMessage = $"Dấu ngoặc nhọn '{{' và '}}' không cân xứng trong biểu thức '{formula}'.";
                return false;
            }
        }

        return true;
    }

    public string SanitizeText(string text)
    {
        if (string.IsNullOrWhiteSpace(text)) return string.Empty;
        return XssPattern.Replace(text, string.Empty).Trim();
    }

    public bool DetectMaliciousPayload(string text, out string? errorMessage)
    {
        errorMessage = null;
        if (string.IsNullOrEmpty(text)) return false;

        var match = XssPattern.Match(text);
        if (match.Success)
        {
            errorMessage = $"Phát hiện mẫu nghi vấn tấn công XSS/Script: '{match.Value}'.";
            return true;
        }

        return false;
    }
}

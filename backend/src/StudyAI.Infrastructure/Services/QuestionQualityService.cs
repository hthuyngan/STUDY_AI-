using System.Text.Json;
using System.Text.RegularExpressions;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using StudyAI.Application.Common.Interfaces;
using StudyAI.Application.DTOs;
using StudyAI.Domain.Entities;
using StudyAI.Infrastructure.Persistence;

namespace StudyAI.Infrastructure.Services;

public class QuestionQualityService : IQuestionQualityService
{
    private readonly StudyAIDbContext _context;
    private readonly ILogger<QuestionQualityService> _logger;

    public QuestionQualityService(
        StudyAIDbContext context,
        ILogger<QuestionQualityService> logger)
    {
        _context = context;
        _logger = logger;
    }

    public async Task<QuestionQualityAuditReportDto> AuditQuestionsQualityAsync(
        string subjectId,
        CancellationToken cancellationToken = default)
    {
        var questions = await _context.ContentQuestions.AsNoTracking()
            .Where(q => q.SubjectId == subjectId && !q.IsDeleted)
            .ToListAsync(cancellationToken);

        var report = new QuestionQualityAuditReportDto
        {
            SubjectId = subjectId,
            AuditedAt = DateTimeOffset.UtcNow,
            TotalQuestions = questions.Count
        };

        if (questions.Count == 0)
        {
            report.QualityScorePercent = 100.0;
            return report;
        }

        var flaggedQuestionIds = new HashSet<string>();
        var promptFrequency = new Dictionary<string, List<string>>();

        foreach (var q in questions)
        {
            // 1. Check Missing Correct Answer
            if (string.IsNullOrWhiteSpace(q.CorrectAnswer))
            {
                report.Issues.Add(new QuestionQualityIssueDto
                {
                    QuestionId = q.Id,
                    IssueType = "missing_correct_answer",
                    Severity = "error",
                    Description = "Câu hỏi thiếu đáp án đúng (CorrectAnswer bị trống).",
                    DetailSnippet = Truncate(q.Prompt, 80)
                });
                flaggedQuestionIds.Add(q.Id);
                report.MissingAnswerCount++;
            }

            // 2. Check LaTeX Syntax
            if (!ValidateLatexSyntax(q.Prompt, out var promptLatexErr))
            {
                report.Issues.Add(new QuestionQualityIssueDto
                {
                    QuestionId = q.Id,
                    IssueType = "broken_latex",
                    Severity = "error",
                    Description = $"Lỗi định dạng LaTeX trong đề bài: {promptLatexErr}",
                    DetailSnippet = Truncate(q.Prompt, 80)
                });
                flaggedQuestionIds.Add(q.Id);
                report.BrokenLatexCount++;
            }

            if (!string.IsNullOrWhiteSpace(q.Explanation) && !ValidateLatexSyntax(q.Explanation, out var expLatexErr))
            {
                report.Issues.Add(new QuestionQualityIssueDto
                {
                    QuestionId = q.Id,
                    IssueType = "broken_latex",
                    Severity = "warning",
                    Description = $"Lỗi định dạng LaTeX trong lời giải: {expLatexErr}",
                    DetailSnippet = Truncate(q.Explanation, 80)
                });
                flaggedQuestionIds.Add(q.Id);
            }

            // 3. Options validation
            if (q.Type == "multiple_choice" || string.IsNullOrEmpty(q.Type))
            {
                if (string.IsNullOrWhiteSpace(q.OptionsJson))
                {
                    report.Issues.Add(new QuestionQualityIssueDto
                    {
                        QuestionId = q.Id,
                        IssueType = "invalid_options",
                        Severity = "error",
                        Description = "Câu trắc nghiệm nhưng không có danh sách lựa chọn OptionsJson.",
                        DetailSnippet = Truncate(q.Prompt, 80)
                    });
                    flaggedQuestionIds.Add(q.Id);
                }
                else
                {
                    try
                    {
                        var opts = JsonSerializer.Deserialize<List<string>>(q.OptionsJson);
                        if (opts == null || opts.Count < 2)
                        {
                            report.Issues.Add(new QuestionQualityIssueDto
                            {
                                QuestionId = q.Id,
                                IssueType = "invalid_options",
                                Severity = "warning",
                                Description = "Số lượng đáp án lựa chọn ít hơn 2 phương án.",
                                DetailSnippet = q.OptionsJson
                            });
                            flaggedQuestionIds.Add(q.Id);
                        }
                    }
                    catch
                    {
                        report.Issues.Add(new QuestionQualityIssueDto
                        {
                            QuestionId = q.Id,
                            IssueType = "invalid_options_json",
                            Severity = "error",
                            Description = "Dữ liệu OptionsJson không đúng định dạng JSON hợp lệ.",
                            DetailSnippet = q.OptionsJson
                        });
                        flaggedQuestionIds.Add(q.Id);
                    }
                }
            }

            // 4. Duplicate grouping by normalized prompt
            var normPrompt = NormalizePrompt(q.Prompt);
            if (!string.IsNullOrWhiteSpace(normPrompt))
            {
                if (!promptFrequency.TryGetValue(normPrompt, out var qList))
                {
                    qList = new List<string>();
                    promptFrequency[normPrompt] = qList;
                }
                qList.Add(q.Id);
            }
        }

        // Detect duplicates
        foreach (var (normPrompt, ids) in promptFrequency)
        {
            if (ids.Count > 1)
            {
                report.DuplicateCount += (ids.Count - 1);
                foreach (var dupId in ids)
                {
                    flaggedQuestionIds.Add(dupId);
                    report.Issues.Add(new QuestionQualityIssueDto
                    {
                        QuestionId = dupId,
                        IssueType = "duplicate_prompt",
                        Severity = "warning",
                        Description = $"Phát hiện câu hỏi trùng lặp nội dung với các câu khác ({string.Join(", ", ids.Where(i => i != dupId))}).",
                        DetailSnippet = Truncate(normPrompt, 80)
                    });
                }
            }
        }

        report.NeedsReviewCount = flaggedQuestionIds.Count;
        report.ValidCount = Math.Max(0, report.TotalQuestions - report.NeedsReviewCount);
        report.QualityScorePercent = report.TotalQuestions > 0
            ? Math.Round(((double)report.ValidCount / report.TotalQuestions) * 100.0, 1)
            : 100.0;

        return report;
    }

    public bool ValidateLatexSyntax(string text, out string? errorReason)
    {
        errorReason = null;
        if (string.IsNullOrEmpty(text))
        {
            return true;
        }

        // 1. Check balanced single dollars $...$ (ignore escaped \$)
        // Remove escaped dollars first
        var unescapedText = text.Replace("\\$", "");
        
        // Count unescaped double dollars
        int doubleDollarCount = Regex.Matches(unescapedText, @"\$\$").Count;
        if (doubleDollarCount % 2 != 0)
        {
            errorReason = "Dấu khối công thức '$$' không đóng mở thành cặp chẵn.";
            return false;
        }

        // Remove double dollars before checking single dollars
        var withoutDoubleDollars = Regex.Replace(unescapedText, @"\$\$", "");
        int singleDollarCount = Regex.Matches(withoutDoubleDollars, @"\$").Count;
        if (singleDollarCount % 2 != 0)
        {
            errorReason = "Dấu ký hiệu toán học '$' không đóng mở thành cặp chẵn.";
            return false;
        }

        // 2. Check balanced \( and \)
        int openParen = Regex.Matches(text, @"\\\(").Count;
        int closeParen = Regex.Matches(text, @"\\\)").Count;
        if (openParen != closeParen)
        {
            errorReason = $"Ký hiệu inline math '\\(' ({openParen}) và '\\)' ({closeParen}) không khớp cặp.";
            return false;
        }

        // 3. Check balanced \[ and \]
        int openBracket = Regex.Matches(text, @"\\\[").Count;
        int closeBracket = Regex.Matches(text, @"\\\]").Count;
        if (openBracket != closeBracket)
        {
            errorReason = $"Ký hiệu display math '\\[' ({openBracket}) và '\\]' ({closeBracket}) không khớp cặp.";
            return false;
        }

        // 4. Check balanced curly braces inside math segments
        int openBraces = Regex.Matches(text, @"(?<!\\)\{").Count;
        int closeBraces = Regex.Matches(text, @"(?<!\\)\}").Count;
        if (openBraces != closeBraces)
        {
            errorReason = $"Dấu ngoặc nhọn '{{' ({openBraces}) và '}}' ({closeBraces}) không cân xứng.";
            return false;
        }

        return true;
    }

    private static string NormalizePrompt(string? prompt)
    {
        if (string.IsNullOrWhiteSpace(prompt)) return string.Empty;
        var cleaned = Regex.Replace(prompt.ToLowerInvariant(), @"\s+", " ").Trim();
        cleaned = Regex.Replace(cleaned, @"[.,!?;:]", "");
        return cleaned;
    }

    private static string Truncate(string text, int maxLen)
    {
        if (string.IsNullOrEmpty(text)) return string.Empty;
        return text.Length <= maxLen ? text : text.Substring(0, maxLen) + "...";
    }
}


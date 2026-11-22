using System.Text.Json;
using System.Text.RegularExpressions;
using Microsoft.EntityFrameworkCore;

namespace StudyAI.Features.Admin;

public class ContentQualityMonitoringService : IContentQualityMonitoringService
{
    private readonly IApplicationDbContext _db;

    public ContentQualityMonitoringService(IApplicationDbContext db)
    {
        _db = db;
    }

    public async Task<ContentQualityAuditReportDto> ScanContentQualityAsync(CancellationToken cancellationToken = default)
    {
        var issues = new List<ContentIssueItemDto>();

        // 1. Scan Lessons
        var lessons = await _db.ContentLessons
            .Select(l => new
            {
                l.Id,
                l.Title,
                l.Status,
                l.Introduction,
                l.LearningObjectivesJson,
                l.FormulasJson
            })
            .ToListAsync(cancellationToken);

        foreach (var lesson in lessons)
        {
            if (string.IsNullOrWhiteSpace(lesson.Title))
            {
                issues.Add(new ContentIssueItemDto
                {
                    Severity = "critical",
                    Category = "lesson_structure",
                    ContentId = lesson.Id,
                    ContentTitle = "Bài học không tên",
                    Description = "Tiêu đề bài học bị trống",
                    Recommendation = "Bổ sung tiêu đề chuẩn theo khung chương trình GDPT 2018"
                });
            }

            if (string.IsNullOrWhiteSpace(lesson.LearningObjectivesJson) || lesson.LearningObjectivesJson == "[]")
            {
                issues.Add(new ContentIssueItemDto
                {
                    Severity = "warning",
                    Category = "lesson_structure",
                    ContentId = lesson.Id,
                    ContentTitle = lesson.Title,
                    Description = "Chưa thiết lập mục tiêu bài học (Learning Objectives)",
                    Recommendation = "Thêm danh sách mục tiêu cần đạt để AI Tutor hỗ trợ học sinh hiệu quả"
                });
            }

            // KaTeX scan in formulas
            if (!string.IsNullOrWhiteSpace(lesson.FormulasJson) && HasUnbalancedDollars(lesson.FormulasJson))
            {
                issues.Add(new ContentIssueItemDto
                {
                    Severity = "warning",
                    Category = "katex_syntax",
                    ContentId = lesson.Id,
                    ContentTitle = lesson.Title,
                    Description = "Phát hiện ký hiệu KaTeX ($) không đóng khớp trong phần công thức",
                    Recommendation = "Kiểm tra và sửa lại các cặp dấu $ hoặc $$ trong công thức"
                });
            }
        }

        // 2. Scan Lesson Videos
        var videos = await _db.ContentLessonVideos
            .Select(v => new
            {
                v.Id,
                v.LessonId,
                v.Title,
                v.SourceUrl,
                v.DurationSeconds
            })
            .ToListAsync(cancellationToken);

        foreach (var v in videos)
        {
            if (string.IsNullOrWhiteSpace(v.SourceUrl) || (!v.SourceUrl.StartsWith("http://") && !v.SourceUrl.StartsWith("https://")))
            {
                issues.Add(new ContentIssueItemDto
                {
                    Severity = "critical",
                    Category = "broken_video",
                    ContentId = v.Id,
                    ContentTitle = v.Title ?? "Video bài giảng",
                    Description = $"URL video không hợp lệ hoặc bị trống: '{v.SourceUrl}'",
                    Recommendation = "Cập nhật link video Youtube hoặc CDN chính xác"
                });
            }

            if (v.DurationSeconds <= 0)
            {
                issues.Add(new ContentIssueItemDto
                {
                    Severity = "info",
                    Category = "broken_video",
                    ContentId = v.Id,
                    ContentTitle = v.Title ?? "Video bài giảng",
                    Description = "Thời lượng video chưa được cấu hình (Duration = 0)",
                    Recommendation = "Cập nhật thời lượng video để tính toán tiến độ xem chính xác"
                });
            }
        }

        // 3. Scan Questions
        var questions = await _db.ContentQuestions
            .Where(q => !q.IsDeleted)
            .Select(q => new
            {
                q.Id,
                q.Prompt,
                q.OptionsJson,
                q.CorrectAnswer,
                q.Difficulty,
                q.Status
            })
            .ToListAsync(cancellationToken);

        foreach (var q in questions)
        {
            if (string.IsNullOrWhiteSpace(q.Prompt))
            {
                issues.Add(new ContentIssueItemDto
                {
                    Severity = "critical",
                    Category = "question_options",
                    ContentId = q.Id,
                    ContentTitle = "Câu hỏi rỗng",
                    Description = "Đề bài câu hỏi bị trống",
                    Recommendation = "Bổ sung nội dung đề bài"
                });
            }
            else if (HasUnbalancedDollars(q.Prompt))
            {
                issues.Add(new ContentIssueItemDto
                {
                    Severity = "warning",
                    Category = "katex_syntax",
                    ContentId = q.Id,
                    ContentTitle = q.Prompt.Length > 40 ? q.Prompt.Substring(0, 40) + "..." : q.Prompt,
                    Description = "Dấu KaTeX ($) trong đề bài không cân xứng",
                    Recommendation = "Kiểm tra ký tự $ trong câu hỏi"
                });
            }

            if (string.IsNullOrWhiteSpace(q.CorrectAnswer))
            {
                issues.Add(new ContentIssueItemDto
                {
                    Severity = "critical",
                    Category = "question_options",
                    ContentId = q.Id,
                    ContentTitle = q.Prompt.Length > 40 ? q.Prompt.Substring(0, 40) + "..." : q.Prompt,
                    Description = "Câu hỏi chưa có đáp án đúng được gán",
                    Recommendation = "Thiết lập CorrectAnswer để học sinh làm bài và chấm điểm"
                });
            }

            if (q.Status == "draft")
            {
                issues.Add(new ContentIssueItemDto
                {
                    Severity = "info",
                    Category = "unapproved_content",
                    ContentId = q.Id,
                    ContentTitle = q.Prompt.Length > 40 ? q.Prompt.Substring(0, 40) + "..." : q.Prompt,
                    Description = "Câu hỏi đang ở trạng thái bản nháp (draft), chưa duyệt",
                    Recommendation = "Gửi duyệt câu hỏi trước khi đưa vào ngân hàng đề thi chính thức"
                });
            }
        }

        // Health Score calculation
        int criticalCount = issues.Count(i => i.Severity == "critical");
        int warningCount = issues.Count(i => i.Severity == "warning");
        double deductions = (criticalCount * 5.0) + (warningCount * 1.0);
        double healthScore = Math.Clamp(Math.Round(100.0 - deductions, 1), 0.0, 100.0);

        return new ContentQualityAuditReportDto
        {
            AuditedAt = DateTimeOffset.UtcNow,
            TotalLessonsScanned = lessons.Count,
            TotalQuestionsScanned = questions.Count,
            TotalVideosScanned = videos.Count,
            IssuesFound = issues.Count,
            HealthScore = healthScore,
            Issues = issues.OrderBy(i => i.Severity == "critical" ? 0 : i.Severity == "warning" ? 1 : 2).ToList()
        };
    }

    private static bool HasUnbalancedDollars(string text)
    {
        if (string.IsNullOrEmpty(text)) return false;
        int singleDollars = 0;
        for (int i = 0; i < text.Length; i++)
        {
            if (text[i] == '$')
            {
                if (i + 1 < text.Length && text[i + 1] == '$')
                {
                    i++;
                }
                else
                {
                    singleDollars++;
                }
            }
        }
        return singleDollars % 2 != 0;
    }
}
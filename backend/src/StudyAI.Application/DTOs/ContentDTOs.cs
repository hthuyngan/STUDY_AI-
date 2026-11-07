using System.Text.Json.Nodes;

namespace StudyAI.Application.DTOs;

public class CreateLessonRequestDto
{
    public string ChapterId { get; set; } = string.Empty;
    public string Title { get; set; } = string.Empty;
    public string Slug { get; set; } = string.Empty;
    public string? Introduction { get; set; }
    public JsonArray? Definitions { get; set; }
    public JsonArray? Formulas { get; set; }
    public JsonArray? Examples { get; set; }
    public JsonArray? ImportantNotes { get; set; }
    public JsonArray? SummaryPoints { get; set; }
}

public class UpdateLessonRequestDto
{
    public string? Title { get; set; }
    public string? Slug { get; set; }
    public string? Introduction { get; set; }
    public JsonArray? Definitions { get; set; }
    public JsonArray? Formulas { get; set; }
    public JsonArray? Examples { get; set; }
    public JsonArray? ImportantNotes { get; set; }
    public JsonArray? SummaryPoints { get; set; }
}

public class ContentLessonDetailDto
{
    public string Id { get; set; } = string.Empty;
    public string ChapterId { get; set; } = string.Empty;
    public string Title { get; set; } = string.Empty;
    public string Slug { get; set; } = string.Empty;
    public int OrderIndex { get; set; } = 0;
    public string Status { get; set; } = "draft";
    public string AuthorId { get; set; } = string.Empty;
    public string AuthorName { get; set; } = string.Empty;
    public string? ReviewedBy { get; set; }
    public string Introduction { get; set; } = string.Empty;
    public JsonArray Definitions { get; set; } = new();
    public JsonArray Formulas { get; set; } = new();
    public JsonArray Examples { get; set; } = new();
    public JsonArray ImportantNotes { get; set; } = new();
    public JsonArray SummaryPoints { get; set; } = new();
    public string CreatedAt { get; set; } = string.Empty;
    public string UpdatedAt { get; set; } = string.Empty;
}

public class ContentSubjectItemDto
{
    public string Id { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    public string Code { get; set; } = string.Empty;
    public string Grade { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
    public int ChapterCount { get; set; }
    public int LessonCount { get; set; }
}

public class ContentSubjectListResponseDto
{
    public List<ContentSubjectItemDto> Items { get; set; } = new();
    public int Total { get; set; }
}

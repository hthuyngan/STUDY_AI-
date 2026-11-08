using System.Text.Json.Nodes;

namespace StudyAI.Application.DTOs;

#region Subject DTOs

public class CreateSubjectRequestDto
{
    public string Name { get; set; } = string.Empty;
    public string Code { get; set; } = string.Empty;
    public string Grade { get; set; } = "12";
    public string? Description { get; set; }
    public int OrderIndex { get; set; } = 0;
    public bool IsActive { get; set; } = true;
}

public class UpdateSubjectRequestDto
{
    public string? Name { get; set; }
    public string? Code { get; set; }
    public string? Grade { get; set; }
    public string? Description { get; set; }
    public int? OrderIndex { get; set; }
    public bool? IsActive { get; set; }
}

public class ContentSubjectItemDto
{
    public string Id { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    public string Code { get; set; } = string.Empty;
    public string Grade { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
    public int OrderIndex { get; set; } = 0;
    public bool IsActive { get; set; } = true;
    public int ChapterCount { get; set; }
    public int LessonCount { get; set; }
    public string CreatedAt { get; set; } = string.Empty;
    public string UpdatedAt { get; set; } = string.Empty;
}

public class ContentSubjectListResponseDto
{
    public List<ContentSubjectItemDto> Items { get; set; } = new();
    public int Total { get; set; }
}

#endregion

#region Chapter DTOs

public class CreateChapterRequestDto
{
    public string SubjectId { get; set; } = string.Empty;
    public string Title { get; set; } = string.Empty;
    public string? Description { get; set; }
    public int OrderIndex { get; set; } = 0;
    public bool IsActive { get; set; } = true;
}

public class UpdateChapterRequestDto
{
    public string? Title { get; set; }
    public string? Description { get; set; }
    public int? OrderIndex { get; set; }
    public bool? IsActive { get; set; }
}

public class ContentChapterItemDto
{
    public string Id { get; set; } = string.Empty;
    public string SubjectId { get; set; } = string.Empty;
    public string SubjectName { get; set; } = string.Empty;
    public string Title { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
    public int OrderIndex { get; set; } = 0;
    public bool IsActive { get; set; } = true;
    public int LessonCount { get; set; }
    public string CreatedAt { get; set; } = string.Empty;
    public string UpdatedAt { get; set; } = string.Empty;
}

#endregion

#region Lesson DTOs

public class CreateLessonRequestDto
{
    public string ChapterId { get; set; } = string.Empty;
    public string Title { get; set; } = string.Empty;
    public string Slug { get; set; } = string.Empty;
    public int OrderIndex { get; set; } = 0;
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
    public int? OrderIndex { get; set; }
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
    public string ChapterTitle { get; set; } = string.Empty;
    public string SubjectId { get; set; } = string.Empty;
    public string SubjectName { get; set; } = string.Empty;
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
    public int QuestionsCount { get; set; }
    public string CreatedAt { get; set; } = string.Empty;
    public string UpdatedAt { get; set; } = string.Empty;
}

#endregion

#region Question Bank DTOs

public class CreateQuestionRequestDto
{
    public string? LessonId { get; set; }
    public string? SubjectId { get; set; }
    public string? ChapterId { get; set; }
    public string Prompt { get; set; } = string.Empty;
    public List<string> Options { get; set; } = new();
    public string CorrectAnswer { get; set; } = string.Empty;
    public string? Explanation { get; set; }
    public string? Topic { get; set; }
    public string Difficulty { get; set; } = "medium";
    public string Type { get; set; } = "multiple-choice";
    public string Status { get; set; } = "published";
    public int OrderIndex { get; set; } = 0;
}

public class UpdateQuestionRequestDto
{
    public string? LessonId { get; set; }
    public string? Prompt { get; set; }
    public List<string>? Options { get; set; }
    public string? CorrectAnswer { get; set; }
    public string? Explanation { get; set; }
    public string? Topic { get; set; }
    public string? Difficulty { get; set; }
    public string? Type { get; set; }
    public string? Status { get; set; }
    public int? OrderIndex { get; set; }
}

public class ContentQuestionItemDto
{
    public string Id { get; set; } = string.Empty;
    public string? LessonId { get; set; }
    public string LessonTitle { get; set; } = string.Empty;
    public string? ChapterId { get; set; }
    public string ChapterTitle { get; set; } = string.Empty;
    public string? SubjectId { get; set; }
    public string SubjectName { get; set; } = string.Empty;
    public string Prompt { get; set; } = string.Empty;
    public List<string> Options { get; set; } = new();
    public string CorrectAnswer { get; set; } = string.Empty;
    public string? Explanation { get; set; }
    public string? Topic { get; set; }
    public string Difficulty { get; set; } = "medium";
    public string Type { get; set; } = "multiple-choice";
    public string Status { get; set; } = "published";
    public int OrderIndex { get; set; } = 0;
    public string CreatedAt { get; set; } = string.Empty;
    public string UpdatedAt { get; set; } = string.Empty;
}

#endregion

#region Learner Curriculum DTOs (Strict Zero-Leak Security)

public class LearnerSubjectDto
{
    public string Id { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    public string Code { get; set; } = string.Empty;
    public string Grade { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
    public int OrderIndex { get; set; } = 0;
    public int ChapterCount { get; set; }
    public int LessonCount { get; set; }
}

public class LearnerChapterDto
{
    public string Id { get; set; } = string.Empty;
    public string Title { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
    public int OrderIndex { get; set; } = 0;
    public List<LearnerLessonSummaryDto> Lessons { get; set; } = new();
}

public class LearnerLessonSummaryDto
{
    public string Id { get; set; } = string.Empty;
    public string Title { get; set; } = string.Empty;
    public string Slug { get; set; } = string.Empty;
    public int OrderIndex { get; set; } = 0;
    public string Status { get; set; } = "published";
}

public class LearnerLessonDetailDto
{
    public string Id { get; set; } = string.Empty;
    public string ChapterId { get; set; } = string.Empty;
    public string ChapterTitle { get; set; } = string.Empty;
    public string SubjectId { get; set; } = string.Empty;
    public string SubjectName { get; set; } = string.Empty;
    public string Title { get; set; } = string.Empty;
    public string Slug { get; set; } = string.Empty;
    public int OrderIndex { get; set; } = 0;
    public string Introduction { get; set; } = string.Empty;
    public JsonArray Definitions { get; set; } = new();
    public JsonArray Formulas { get; set; } = new();
    public JsonArray Examples { get; set; } = new();
    public JsonArray ImportantNotes { get; set; } = new();
    public JsonArray SummaryPoints { get; set; } = new();
}

/// <summary>
/// Learner Question DTO: Intentionally omits CorrectAnswer and Explanation.
/// </summary>
public class LearnerQuestionDto
{
    public string Id { get; set; } = string.Empty;
    public string LessonId { get; set; } = string.Empty;
    public string Prompt { get; set; } = string.Empty;
    public List<string> Options { get; set; } = new();
    public string? Topic { get; set; }
    public string Difficulty { get; set; } = "medium";
    public string Type { get; set; } = "multiple-choice";
    public int OrderIndex { get; set; } = 0;
}

public class CheckAnswerRequestDto
{
    public string SelectedOption { get; set; } = string.Empty;
}

public class CheckAnswerResponseDto
{
    public string QuestionId { get; set; } = string.Empty;
    public bool IsCorrect { get; set; }
    public string CorrectAnswer { get; set; } = string.Empty;
    public string? Explanation { get; set; }
    public int ScoreEarned { get; set; }
    public string Feedback { get; set; } = string.Empty;
}

#endregion

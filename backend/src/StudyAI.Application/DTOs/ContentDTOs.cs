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

public class ReorderChaptersRequestDto
{
    public string SubjectId { get; set; } = string.Empty;
    public List<string> ChapterIds { get; set; } = new();
}

#endregion

#region Topic DTOs

public class ContentTopicItemDto
{
    public string Id { get; set; } = string.Empty;
    public string ChapterId { get; set; } = string.Empty;
    public string ChapterTitle { get; set; } = string.Empty;
    public string Title { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
    public int OrderIndex { get; set; } = 0;
    public bool IsActive { get; set; } = true;
    public int LessonCount { get; set; }
    public string CreatedAt { get; set; } = string.Empty;
    public string UpdatedAt { get; set; } = string.Empty;
}

public class CreateTopicRequestDto
{
    public string ChapterId { get; set; } = string.Empty;
    public string Title { get; set; } = string.Empty;
    public string? Description { get; set; }
    public int OrderIndex { get; set; } = 0;
    public bool IsActive { get; set; } = true;
}

public class UpdateTopicRequestDto
{
    public string? Title { get; set; }
    public string? Description { get; set; }
    public int? OrderIndex { get; set; }
    public bool? IsActive { get; set; }
}

#endregion

#region Lesson Video DTOs

public class ContentLessonVideoItemDto
{
    public string Id { get; set; } = string.Empty;
    public string LessonId { get; set; } = string.Empty;
    public string LessonTitle { get; set; } = string.Empty;
    public string Title { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
    public string Provider { get; set; } = "youtube";
    public string SourceUrl { get; set; } = string.Empty;
    public string? EmbedUrl { get; set; }
    public string? YouTubeVideoId { get; set; }
    public string Language { get; set; } = "vi";
    public int DurationSeconds { get; set; }
    public string? ThumbnailUrl { get; set; }
    public int SortOrder { get; set; } = 1;
    public bool EmbedAllowed { get; set; } = true;
    public string VerificationStatus { get; set; } = "verified";
    public string? VerifiedAt { get; set; }
    public bool IsPublished { get; set; } = true;
    public string CreatedAt { get; set; } = string.Empty;
    public string UpdatedAt { get; set; } = string.Empty;
}

public class CreateLessonVideoRequestDto
{
    public string LessonId { get; set; } = string.Empty;
    public string Title { get; set; } = string.Empty;
    public string? Description { get; set; }
    public string Provider { get; set; } = "youtube";
    public string SourceUrl { get; set; } = string.Empty;
    public string? EmbedUrl { get; set; }
    public string? YouTubeVideoId { get; set; }
    public string Language { get; set; } = "vi";
    public int DurationSeconds { get; set; } = 0;
    public string? ThumbnailUrl { get; set; }
    public int SortOrder { get; set; } = 1;
    public bool EmbedAllowed { get; set; } = true;
    public string VerificationStatus { get; set; } = "pending";
    public bool IsPublished { get; set; } = false;
}

public class UpdateLessonVideoRequestDto
{
    public string? Title { get; set; }
    public string? Description { get; set; }
    public string? Provider { get; set; }
    public string? SourceUrl { get; set; }
    public string? EmbedUrl { get; set; }
    public string? YouTubeVideoId { get; set; }
    public string? Language { get; set; }
    public int? DurationSeconds { get; set; }
    public string? ThumbnailUrl { get; set; }
    public int? SortOrder { get; set; }
    public bool? EmbedAllowed { get; set; }
    public string? VerificationStatus { get; set; }
    public bool? IsPublished { get; set; }
}

#endregion

#region Lesson DTOs

public class CreateLessonRequestDto
{
    public string ChapterId { get; set; } = string.Empty;
    public string? TopicId { get; set; }
    public string Title { get; set; } = string.Empty;
    public string Slug { get; set; } = string.Empty;
    public int OrderIndex { get; set; } = 0;
    public string? Introduction { get; set; }
    public JsonArray? LearningObjectives { get; set; }
    public JsonArray? Definitions { get; set; }
    public JsonArray? Formulas { get; set; }
    public JsonArray? Examples { get; set; }
    public JsonArray? ImportantNotes { get; set; }
    public JsonArray? SummaryPoints { get; set; }
}

public class UpdateLessonRequestDto
{
    public string? ChapterId { get; set; }
    public string? TopicId { get; set; }
    public string? Title { get; set; }
    public string? Slug { get; set; }
    public int? OrderIndex { get; set; }
    public string? Introduction { get; set; }
    public JsonArray? LearningObjectives { get; set; }
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
    public string? TopicId { get; set; }
    public string? TopicTitle { get; set; }
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
    public JsonArray LearningObjectives { get; set; } = new();
    public JsonArray Definitions { get; set; } = new();
    public JsonArray Formulas { get; set; } = new();
    public JsonArray Examples { get; set; } = new();
    public JsonArray ImportantNotes { get; set; } = new();
    public JsonArray SummaryPoints { get; set; } = new();
    public List<ContentLessonVideoItemDto> Videos { get; set; } = new();
    public int QuestionsCount { get; set; }
    public string CreatedAt { get; set; } = string.Empty;
    public string UpdatedAt { get; set; } = string.Empty;
}

#endregion

#region Question Bank DTOs

public class CreateQuestionRequestDto
{
    public string? Code { get; set; }
    public string? LessonId { get; set; }
    public string? SubjectId { get; set; }
    public string? ChapterId { get; set; }
    public string? Grade { get; set; }
    public string Prompt { get; set; } = string.Empty;
    public List<string> Options { get; set; } = new();
    public string CorrectAnswer { get; set; } = string.Empty;
    public string? Explanation { get; set; }
    public string? Topic { get; set; }
    public string Difficulty { get; set; } = "medium";
    public string Type { get; set; } = "multiple-choice";
    public string Status { get; set; } = "published";
    public int OrderIndex { get; set; } = 0;
    public string? ImageUrl { get; set; }
    public string? MetadataJson { get; set; }
    public string SourceType { get; set; } = "manual";
    public string? SourceBatchId { get; set; }
    public string? SourceUrl { get; set; }
    public string CopyrightStatus { get; set; } = "proprietary";
    public string? CopyrightProofRef { get; set; }
}

public class UpdateQuestionRequestDto
{
    public string? Code { get; set; }
    public string? LessonId { get; set; }
    public string? SubjectId { get; set; }
    public string? ChapterId { get; set; }
    public string? Grade { get; set; }
    public string? Prompt { get; set; }
    public List<string>? Options { get; set; }
    public string? CorrectAnswer { get; set; }
    public string? Explanation { get; set; }
    public string? Topic { get; set; }
    public string? Difficulty { get; set; }
    public string? Type { get; set; }
    public string? Status { get; set; }
    public int? OrderIndex { get; set; }
    public string? ImageUrl { get; set; }
    public string? MetadataJson { get; set; }
    public string? SourceType { get; set; }
    public string? CopyrightStatus { get; set; }
    public string? CopyrightProofRef { get; set; }
}

public class RejectQuestionRequestDto
{
    public string Reason { get; set; } = string.Empty;
}

public class RollbackContentRequestDto
{
    public int? TargetVersion { get; set; }
    public string? RevisionId { get; set; }
    public string? Reason { get; set; }
}

public class ContentQuestionItemDto
{
    public string Id { get; set; } = string.Empty;
    public string? Code { get; set; }
    public string? LessonId { get; set; }
    public string LessonTitle { get; set; } = string.Empty;
    public string? ChapterId { get; set; }
    public string ChapterTitle { get; set; } = string.Empty;
    public string? SubjectId { get; set; }
    public string SubjectName { get; set; } = string.Empty;
    public string? Grade { get; set; }
    public string Prompt { get; set; } = string.Empty;
    public List<string> Options { get; set; } = new();
    public string CorrectAnswer { get; set; } = string.Empty;
    public string? Explanation { get; set; }
    public string? Topic { get; set; }
    public string Difficulty { get; set; } = "medium";
    public string Type { get; set; } = "multiple-choice";
    public string Status { get; set; } = "published";
    public int OrderIndex { get; set; } = 0;
    public string? ImageUrl { get; set; }
    public string? MetadataJson { get; set; }
    public bool IsDeleted { get; set; }
    public string? DeletedAt { get; set; }
    public string? DeletedBy { get; set; }
    public string? AuthorId { get; set; }
    public string AuthorName { get; set; } = string.Empty;
    public string? ReviewedBy { get; set; }
    public string? RejectionReason { get; set; }
    public string SourceType { get; set; } = "manual";
    public string? SourceBatchId { get; set; }
    public string? SourceUrl { get; set; }
    public string CopyrightStatus { get; set; } = "proprietary";
    public string? CopyrightProofRef { get; set; }
    public int Version { get; set; } = 1;
    public string CreatedAt { get; set; } = string.Empty;
    public string UpdatedAt { get; set; } = string.Empty;
}

public class QuestionStatsDto
{
    public int TotalQuestions { get; set; }
    public int DraftCount { get; set; }
    public int InReviewCount { get; set; }
    public int ApprovedCount { get; set; }
    public int PublishedCount { get; set; }
    public int RejectedCount { get; set; }
    public int DeletedCount { get; set; }
    public Dictionary<string, int> ByDifficulty { get; set; } = new();
    public Dictionary<string, int> ByType { get; set; } = new();
    public Dictionary<string, int> BySubject { get; set; } = new();
    public Dictionary<string, int> BySource { get; set; } = new();
}

public class QuestionImportItemDto
{
    public string? Code { get; set; }
    public string Prompt { get; set; } = string.Empty;
    public List<string> Options { get; set; } = new();
    public string CorrectAnswer { get; set; } = string.Empty;
    public string? Explanation { get; set; }
    public string? Topic { get; set; }
    public string Difficulty { get; set; } = "medium";
    public string Type { get; set; } = "multiple-choice";
    public string? Grade { get; set; }
    public string? SubjectId { get; set; }
    public string? ChapterId { get; set; }
    public string? LessonId { get; set; }
    public string? ImageUrl { get; set; }
    public string? MetadataJson { get; set; }
}

public class QuestionImportBatchRequestDto
{
    public string SourceType { get; set; } = "manual"; // manual, csv, json, ai-generated, vnhsge, external_licensed
    public string? SourceUrl { get; set; }
    public string? SourceVersion { get; set; }
    public string? LicenseProofRef { get; set; }
    public bool DryRun { get; set; } = true;
    public List<QuestionImportItemDto> Items { get; set; } = new();
}

public class QuestionImportResultDto
{
    public string BatchId { get; set; } = string.Empty;
    public string SourceType { get; set; } = string.Empty;
    public bool DryRun { get; set; }
    public int TotalItems { get; set; }
    public int ValidItems { get; set; }
    public int DuplicateItems { get; set; }
    public int ErrorItems { get; set; }
    public List<string> Errors { get; set; } = new();
    public List<ContentQuestionItemDto> PreviewItems { get; set; } = new();
    public List<string> ImportedIds { get; set; } = new();
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

public class LearnerSubjectWithChaptersDto : LearnerSubjectDto
{
    public List<LearnerChapterDto> Chapters { get; set; } = new();
}

public class LearnerTopicDto
{
    public string Id { get; set; } = string.Empty;
    public string ChapterId { get; set; } = string.Empty;
    public string Title { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
    public int OrderIndex { get; set; } = 0;
    public List<LearnerLessonSummaryDto> Lessons { get; set; } = new();
}

public class LearnerVideoDto
{
    public string Id { get; set; } = string.Empty;
    public string Title { get; set; } = string.Empty;
    public string? Description { get; set; }
    public string Provider { get; set; } = "youtube";
    public string SourceUrl { get; set; } = string.Empty;
    public string? EmbedUrl { get; set; }
    public string? YouTubeVideoId { get; set; }
    public int DurationSeconds { get; set; }
    public string? ThumbnailUrl { get; set; }
    public bool EmbedAllowed { get; set; } = true;
    public string VerificationStatus { get; set; } = "verified";
}

public class LearnerChapterDto
{
    public string Id { get; set; } = string.Empty;
    public string Title { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
    public int OrderIndex { get; set; } = 0;
    public List<LearnerTopicDto> Topics { get; set; } = new();
    public List<LearnerLessonSummaryDto> Lessons { get; set; } = new();
}

public class LearnerLessonSummaryDto
{
    public string Id { get; set; } = string.Empty;
    public string? TopicId { get; set; }
    public string? TopicTitle { get; set; }
    public string Title { get; set; } = string.Empty;
    public string Slug { get; set; } = string.Empty;
    public int OrderIndex { get; set; } = 0;
    public string Status { get; set; } = "published";
    public string ContentType { get; set; } = "video";
    public bool HasVideo { get; set; }
    public string? VideoProvider { get; set; }
    public string? YouTubeVideoId { get; set; }
}

public class LearnerLessonDetailDto
{
    public string Id { get; set; } = string.Empty;
    public string ChapterId { get; set; } = string.Empty;
    public string ChapterTitle { get; set; } = string.Empty;
    public string? TopicId { get; set; }
    public string? TopicTitle { get; set; }
    public string SubjectId { get; set; } = string.Empty;
    public string SubjectName { get; set; } = string.Empty;
    public string Title { get; set; } = string.Empty;
    public string Slug { get; set; } = string.Empty;
    public int OrderIndex { get; set; } = 0;
    public string ContentType { get; set; } = "video";
    public string Introduction { get; set; } = string.Empty;
    public JsonArray LearningObjectives { get; set; } = new();
    public JsonArray Definitions { get; set; } = new();
    public JsonArray Formulas { get; set; } = new();
    public JsonArray Examples { get; set; } = new();
    public JsonArray ImportantNotes { get; set; } = new();
    public JsonArray SummaryPoints { get; set; } = new();
    public List<LearnerVideoDto> Videos { get; set; } = new();
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

public class AssessmentOptionDto
{
    public string Id { get; set; } = string.Empty;
    public string Label { get; set; } = string.Empty;
    public string Text { get; set; } = string.Empty;
}

public class AssessmentQuestionDto
{
    public string Id { get; set; } = string.Empty;
    public string Prompt { get; set; } = string.Empty;
    public string? Topic { get; set; }
    public List<AssessmentOptionDto> Options { get; set; } = new();
    public string CorrectOptionId { get; set; } = string.Empty;
    public string Explanation { get; set; } = string.Empty;
}

public class ContentAssessmentItemDto
{
    public string Id { get; set; } = string.Empty;
    public string LessonId { get; set; } = string.Empty;
    public string LessonTitle { get; set; } = string.Empty;
    public string SubjectId { get; set; } = string.Empty;
    public string SubjectName { get; set; } = string.Empty;
    public string? ChapterId { get; set; }
    public string? ChapterName { get; set; }
    public int QuestionCount { get; set; }
    public int PassingScore { get; set; }
    public int DurationMinutes { get; set; }
    public string Status { get; set; } = "draft";
    public string CreatedAt { get; set; } = string.Empty;
    public string UpdatedAt { get; set; } = string.Empty;
    public List<AssessmentQuestionDto> Questions { get; set; } = new();
}

public class CreateAssessmentRequestDto
{
    public string LessonId { get; set; } = string.Empty;
    public string? Title { get; set; }
    public int? PassingScore { get; set; }
    public int? DurationMinutes { get; set; }
    public string? Status { get; set; }
}

public class UpdateAssessmentRequestDto
{
    public string? Title { get; set; }
    public int? PassingScore { get; set; }
    public int? DurationMinutes { get; set; }
    public string? Status { get; set; }
}

public class AddAssessmentQuestionRequestDto
{
    public string Prompt { get; set; } = string.Empty;
    public string? Topic { get; set; }
    public List<AssessmentOptionDto>? Options { get; set; }
    public string CorrectOptionId { get; set; } = string.Empty;
    public string? Explanation { get; set; }
}

#endregion

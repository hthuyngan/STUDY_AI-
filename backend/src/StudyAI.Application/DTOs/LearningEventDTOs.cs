using System.Text.Json.Nodes;

namespace StudyAI.Application.DTOs;

public class LearningEventItemDto
{
    public string Id { get; set; } = string.Empty;
    public string? AttemptId { get; set; }
    public string LessonId { get; set; } = string.Empty;
    public string SubjectId { get; set; } = string.Empty;
    public DateTimeOffset Timestamp { get; set; }
    public string Type { get; set; } = string.Empty;
    public JsonNode? Payload { get; set; }
    public int SchemaVersion { get; set; } = 1;
}

public class LearningEventBatchRequestDto
{
    public List<LearningEventItemDto> Events { get; set; } = new();
}

public class LearningEventBatchResponseDto
{
    public int Inserted { get; set; }
    public int Duplicates { get; set; }
    public int Failed { get; set; } = 0;
}

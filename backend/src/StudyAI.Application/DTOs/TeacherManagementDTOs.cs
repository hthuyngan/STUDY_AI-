namespace StudyAI.Application.DTOs;

public class TeacherClassroomSummaryDto
{
    public string ClassroomId { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    public string? Code { get; set; }
    public string? Grade { get; set; }
    public string? Subject { get; set; }
    public int StudentCount { get; set; }
    public int ActiveAssignmentsCount { get; set; }
    public double AverageMasteryPercent { get; set; }
    public int AtRiskStudentCount { get; set; }
    public DateTimeOffset CreatedAt { get; set; }
}

public class AtRiskStudentItemDto
{
    public string StudentId { get; set; } = string.Empty;
    public string FullName { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;
    public double OverallMasteryPercent { get; set; }
    public string RiskLevel { get; set; } = "high"; // high, medium, low
    public string PrimaryWeakTopic { get; set; } = string.Empty;
    public int ConsecutiveMistakesCount { get; set; }
    public string InterventionStatus { get; set; } = "needs_action"; // needs_action, assigned, in_progress, resolved
}

public class DifficultTopicCohortDto
{
    public string TopicName { get; set; } = string.Empty;
    public string ChapterTitle { get; set; } = string.Empty;
    public double CohortAccuracyPercent { get; set; }
    public int AffectedStudentsCount { get; set; }
    public int TotalAttemptsCount { get; set; }
    public string CognitiveLevel { get; set; } = "thong_hieu";
}

public class ClassroomAnalyticsDto
{
    public string ClassroomId { get; set; } = string.Empty;
    public string ClassroomName { get; set; } = string.Empty;
    public string Subject { get; set; } = "Toán 12";
    public int TotalStudents { get; set; }
    public double CohortAverageMasteryPercent { get; set; }
    public double CurriculumCompletionRatePercent { get; set; }
    public double MockExamAverageScore { get; set; }
    public List<DifficultTopicCohortDto> DifficultTopics { get; set; } = new();
    public List<AtRiskStudentItemDto> AtRiskStudents { get; set; } = new();
    public Dictionary<string, double> MasteryDistribution { get; set; } = new(); // e.g. "mastered": 15%, "proficient": 30%, etc.
}

public class TeachingRecommendationDto
{
    public string RecommendationId { get; set; } = string.Empty;
    public string ClassroomId { get; set; } = string.Empty;
    public string Title { get; set; } = string.Empty;
    public string DetectionNarrative { get; set; } = string.Empty;
    public string DataEvidence { get; set; } = string.Empty;
    public string Priority { get; set; } = "high"; // high, medium, standard
    public string ActionType { get; set; } = "assign_remedial"; // assign_remedial, review_lesson, create_checkpoint_quiz
    public string SuggestedTopic { get; set; } = string.Empty;
    public string ActionableDescription { get; set; } = string.Empty;
    public bool IsActioned { get; set; }
}

public class CreateRemedialInterventionRequestDto
{
    public string ClassroomId { get; set; } = string.Empty;
    public string? SubjectId { get; set; }
    public List<string> TargetStudentIds { get; set; } = new();
    public string Title { get; set; } = string.Empty;
    public string TargetTopic { get; set; } = string.Empty;
    public string? Instructions { get; set; }
    public DateTimeOffset DueDate { get; set; }
    public int QuestionCount { get; set; } = 10;
}

public class RemedialInterventionOutcomeDto
{
    public string InterventionId { get; set; } = string.Empty;
    public string ClassroomId { get; set; } = string.Empty;
    public string StudentId { get; set; } = string.Empty;
    public string StudentName { get; set; } = string.Empty;
    public string TopicName { get; set; } = string.Empty;
    public double InitialMasteryScore { get; set; }
    public double CurrentMasteryScore { get; set; }
    public double MasteryDelta => Math.Round(CurrentMasteryScore - InitialMasteryScore, 1);
    public string Status { get; set; } = "assigned"; // assigned, completed, improved, not_improved
    public DateTimeOffset AssignedAt { get; set; }
    public DateTimeOffset? CompletedAt { get; set; }
}

public class AiContentQualityAuditRequestDto
{
    public string ContentType { get; set; } = "lesson"; // lesson, question, theory
    public string Title { get; set; } = string.Empty;
    public string BodyText { get; set; } = string.Empty;
    public string? FormulasOrOptionsJson { get; set; }
    public string? SubjectId { get; set; } = "sub_math12";
}

public class ContentQualitySuggestionItemDto
{
    public string Category { get; set; } = "spelling"; // spelling, katex_syntax, pedagogical_clarity, duplicate, difficulty
    public string OriginalSnippet { get; set; } = string.Empty;
    public string ProposedCorrection { get; set; } = string.Empty;
    public string Reason { get; set; } = string.Empty;
}

public class AiContentQualityAuditResponseDto
{
    public string ContentType { get; set; } = "lesson";
    public bool HasIssues { get; set; }
    public int IssueCount { get; set; }
    public string OverallAssessment { get; set; } = string.Empty;
    public List<ContentQualitySuggestionItemDto> Suggestions { get; set; } = new();
    public string ProposedImprovedBody { get; set; } = string.Empty;
    public string SuggestedCognitiveDifficulty { get; set; } = "thong_hieu";
    public string Provider { get; set; } = "Gemini";
    public bool RequiresHumanApproval { get; set; } = true;
}

public class LessonAuthoringOutlineRequestDto
{
    public string SubjectName { get; set; } = "Toán 12";
    public string ChapterTitle { get; set; } = string.Empty;
    public string LessonTitle { get; set; } = string.Empty;
    public string TargetGrade { get; set; } = "12";
}

public class LessonAuthoringOutlineResponseDto
{
    public string LessonTitle { get; set; } = string.Empty;
    public List<string> LearningObjectives { get; set; } = new();
    public string IntroductionDraft { get; set; } = string.Empty;
    public List<string> KeyDefinitions { get; set; } = new();
    public List<string> CoreFormulasKaTeX { get; set; } = new();
    public List<string> WorkedExamples { get; set; } = new();
    public string PedagogicalNotes { get; set; } = string.Empty;
}

public class GenerateCheckpointQuestionsRequestDto
{
    public string SubjectId { get; set; } = "sub_math12";
    public string TopicName { get; set; } = string.Empty;
    public int QuestionCount { get; set; } = 3;
    public string TargetDifficulty { get; set; } = "thong_hieu"; // nhan_biet, thong_hieu, van_dung, van_dung_cao
}

public class CheckpointQuestionDraftDto
{
    public string Prompt { get; set; } = string.Empty;
    public List<string> Options { get; set; } = new();
    public string CorrectAnswer { get; set; } = string.Empty;
    public string Explanation { get; set; } = string.Empty;
    public string CognitiveLevel { get; set; } = "thong_hieu";
}

public class ContentWorkflowActionRequestDto
{
    public string EntityType { get; set; } = "lesson"; // lesson, question
    public string EntityId { get; set; } = string.Empty;
    public string Action { get; set; } = "submit_review"; // submit_review, approve, reject, publish, archive
    public string? ReasonOrNotes { get; set; }
}

public class ContentWorkflowActionResultDto
{
    public string EntityType { get; set; } = string.Empty;
    public string EntityId { get; set; } = string.Empty;
    public string PreviousStatus { get; set; } = string.Empty;
    public string NewStatus { get; set; } = string.Empty;
    public string Message { get; set; } = string.Empty;
    public DateTimeOffset Timestamp { get; set; } = DateTimeOffset.UtcNow;
}


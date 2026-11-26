namespace StudyAI.Features.Content;

public interface ILessonCompositionService
{
    Task<LessonCompositionDto> GetLessonCompositionAsync(string lessonId, CancellationToken ct = default);
    Task<LessonCompositionDto> ReplaceLessonCompositionAsync(string lessonId, ReplaceLessonCompositionRequestDto request, string actorId, CancellationToken ct = default);
    Task<LessonRevisionPageDto> GetRevisionsAsync(string lessonId, int page = 1, int pageSize = 20, CancellationToken ct = default);
    Task<LessonCompositionDto> RollbackToRevisionAsync(string lessonId, string revisionId, RollbackLessonRevisionRequestDto request, string actorId, CancellationToken ct = default);

    Task<List<CurriculumNodeRefDto>> ListObjectivesAsync(string curriculumId, string? search = null, CancellationToken ct = default);
    Task<CurriculumNodeRefDto> CreateObjectiveAsync(string curriculumId, CreateCurriculumNodeRequestDto request, string actorId, CancellationToken ct = default);

    Task<List<CurriculumNodeRefDto>> ListKnowledgeUnitsAsync(string curriculumId, string? search = null, CancellationToken ct = default);
    Task<CurriculumNodeRefDto> CreateKnowledgeUnitAsync(string curriculumId, CreateCurriculumNodeRequestDto request, string actorId, CancellationToken ct = default);

    Task<List<CurriculumNodeRefDto>> ListSkillsAsync(string curriculumId, string? search = null, CancellationToken ct = default);
    Task<CurriculumNodeRefDto> CreateSkillAsync(string curriculumId, CreateCurriculumNodeRequestDto request, string actorId, CancellationToken ct = default);

    Task<List<PrerequisiteLessonDto>> ListCurriculumLessonsAsync(string curriculumId, string? excludeLessonId = null, string? search = null, CancellationToken ct = default);
}

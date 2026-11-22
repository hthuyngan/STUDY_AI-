using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Caching.Memory;

namespace StudyAI.Features.Student;

// Forward-compatible interface aliases
public interface ILearnerCurriculumService : IStudentCurriculumService { }
public interface ILearnerProgressService : IStudentProgressService { }
public interface ILearnerAssessmentService : IStudentAssessmentService { }
public interface ILearnerEventsService : IStudentEventsService { }
public interface ILearnerProfileService : IStudentProfileService { }
public interface ILearnerPracticeService : IStudentPracticeService { }

// Forward-compatible class aliases for services
public class LearnerCurriculumService : StudentCurriculumService
{
    public LearnerCurriculumService(
        IApplicationDbContext db,
        IAuditWriter auditWriter,
        IMemoryCache? cache = null,
        ILogger<LearnerCurriculumService>? logger = null)
        : base(db, auditWriter, cache, logger) { }
}

public class LearnerProgressService : StudentProgressService
{
    public LearnerProgressService(IApplicationDbContext db, IClock clock)
        : base(db, clock) { }
}

public class LearnerAssessmentService : StudentAssessmentService
{
    public LearnerAssessmentService(IApplicationDbContext db, IClock clock, IIdGenerator idGenerator)
        : base(db, clock, idGenerator) { }
}

public class LearnerEventsService : StudentEventsService
{
    public LearnerEventsService(IApplicationDbContext db, IClock clock)
        : base(db, clock) { }
}

public class LearnerProfileService : StudentProfileService
{
    public LearnerProfileService(IApplicationDbContext db, IClock clock)
        : base(db, clock) { }
}

public class LearnerPracticeService : StudentPracticeService
{
    public LearnerPracticeService(
        IApplicationDbContext db,
        IClock clock,
        IIdGenerator idGenerator,
        IStudentMasteryService? masteryService = null,
        IRevisionPlannerService? revisionPlanner = null)
        : base(db, clock, idGenerator, masteryService, revisionPlanner) { }
}

// Controller aliases
public class LearnerCurriculumController : StudentCurriculumController
{
    public LearnerCurriculumController(ILearnerCurriculumService curriculumService)
        : base(curriculumService) { }
}

public class LearnerProgressController : StudentProgressController
{
    public LearnerProgressController(ILearnerProgressService progressService)
        : base(progressService) { }
}

public class LearnerAssessmentAttemptsController : StudentAssessmentAttemptsController
{
    public LearnerAssessmentAttemptsController(ILearnerAssessmentService assessmentService)
        : base(assessmentService) { }
}

public class LearnerEventsController : StudentEventsController
{
    public LearnerEventsController(ILearnerEventsService eventsService)
        : base(eventsService) { }
}

public class StudentExamPreparationController : ExamPreparationController
{
    public StudentExamPreparationController(
        IExamBlueprintService blueprintService,
        IQuestionQualityService qualityService,
        ISpacedRepetitionService spacedRepetitionService,
        IRevisionPlannerService revisionPlannerService,
        IExamReadinessService readinessService,
        ISubjectGradeResolver subjectResolver,
        ILogger<ExamPreparationController> logger)
        : base(blueprintService, qualityService, spacedRepetitionService, revisionPlannerService, readinessService, subjectResolver, logger) { }
}

public class LearnerExamPreparationController : StudentExamPreparationController
{
    public LearnerExamPreparationController(
        IExamBlueprintService blueprintService,
        IQuestionQualityService qualityService,
        ISpacedRepetitionService spacedRepetitionService,
        IRevisionPlannerService revisionPlannerService,
        IExamReadinessService readinessService,
        ISubjectGradeResolver subjectResolver,
        ILogger<ExamPreparationController> logger)
        : base(blueprintService, qualityService, spacedRepetitionService, revisionPlannerService, readinessService, subjectResolver, logger) { }
}

public class LearnerPracticeController : StudentPracticeController
{
    public LearnerPracticeController(ILearnerPracticeService practiceService)
        : base(practiceService) { }
}

public class LearnerProfileController : StudentProfileController
{
    public LearnerProfileController(ILearnerProfileService profileService)
        : base(profileService) { }
}

public class StudentAdaptiveLearningController : AdaptiveLearningController
{
    public StudentAdaptiveLearningController(
        IAiHintService hintService,
        IAiAnalysisService analysisService,
        IStudentMasteryService masteryService,
        ILearningRecommendationService recommendationService)
        : base(hintService, analysisService, masteryService, recommendationService) { }
}

public class LearnerAdaptiveLearningController : StudentAdaptiveLearningController
{
    public LearnerAdaptiveLearningController(
        IAiHintService hintService,
        IAiAnalysisService analysisService,
        IStudentMasteryService masteryService,
        ILearningRecommendationService recommendationService)
        : base(hintService, analysisService, masteryService, recommendationService) { }
}

public class StudentAnalyticsController : LearningAnalyticsController
{
    public StudentAnalyticsController(
        ILearningAnalyticsService analyticsService,
        IIntelligentExamService examService)
        : base(analyticsService, examService) { }
}

public class LearnerAnalyticsController : StudentAnalyticsController
{
    public LearnerAnalyticsController(
        ILearningAnalyticsService analyticsService,
        IIntelligentExamService examService)
        : base(analyticsService, examService) { }
}

public class LearnerAiChatController : StudyAI.Features.AI.AiChatController
{
    public LearnerAiChatController(
        StudyAI.Features.AI.IAiTutorService aiTutorService,
        ILogger<StudyAI.Features.AI.AiChatController> logger)
        : base(aiTutorService, logger) { }
}

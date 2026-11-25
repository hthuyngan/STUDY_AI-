using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.ChangeTracking;
using Microsoft.EntityFrameworkCore.Infrastructure;
using StudyAI.Models;

namespace StudyAI.Data;

public interface IApplicationDbContext
{
    DbSet<User> Users { get; }
    DbSet<RefreshSession> RefreshSessions { get; }
    DbSet<StaffAuditLog> StaffAuditLogs { get; }
    DbSet<LessonProgress> LessonProgresses { get; }
    DbSet<AssessmentAttempt> AssessmentAttempts { get; }
    DbSet<AssessmentResponse> AssessmentResponses { get; }
    DbSet<LearningEvent> LearningEvents { get; }
    DbSet<ContentSubject> ContentSubjects { get; }
    DbSet<ContentChapter> ContentChapters { get; }
    DbSet<ContentTopic> ContentTopics { get; }
    DbSet<ContentLesson> ContentLessons { get; }
    DbSet<ContentLessonVideo> ContentLessonVideos { get; }
    DbSet<ContentAssessment> ContentAssessments { get; }
    DbSet<ContentQuestion> ContentQuestions { get; }
    DbSet<ContentRevision> ContentRevisions { get; }
    DbSet<AiConversation> AiConversations { get; }
    DbSet<AiMessage> AiMessages { get; }
    DbSet<Classroom> Classrooms { get; }
    DbSet<ClassroomStudent> ClassroomStudents { get; }
    DbSet<TeacherProfile> TeacherProfiles { get; }
    DbSet<Assignment> Assignments { get; }
    DbSet<AssignmentSubmission> AssignmentSubmissions { get; }
    DbSet<ClassroomAlert> ClassroomAlerts { get; }
    DbSet<AiUsageLog> AiUsageLogs { get; }
    DbSet<StudentTopicMastery> StudentTopicMasteries { get; }
    DbSet<AiHintUsage> AiHintUsages { get; }
    DbSet<AiLearningRecommendation> AiLearningRecommendations { get; }
    DbSet<SystemSetting> SystemSettings { get; }
    DbSet<UserStudyNote> UserStudyNotes { get; }
    DbSet<UserSectionBookmark> UserSectionBookmarks { get; }
    DbSet<GradeLevel> GradeLevels { get; }
    DbSet<CatalogSubject> CatalogSubjects { get; }
    DbSet<Curriculum> Curricula { get; }
    DbSet<TextbookSeries> TextbookSeries { get; }
    DbSet<CurriculumEdition> CurriculumEditions { get; }

    EntityEntry<TEntity> Entry<TEntity>(TEntity entity) where TEntity : class;

    DatabaseFacade Database { get; }

    Task<int> SaveChangesAsync(CancellationToken cancellationToken = default);
}

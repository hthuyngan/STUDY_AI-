using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Infrastructure;
using StudyAI.Domain.Entities;

namespace StudyAI.Application.Common.Interfaces;

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
    DbSet<ContentLesson> ContentLessons { get; }
    DbSet<ContentAssessment> ContentAssessments { get; }
    DbSet<ContentQuestion> ContentQuestions { get; }
    DbSet<AiConversation> AiConversations { get; }
    DbSet<AiMessage> AiMessages { get; }

    DatabaseFacade Database { get; }

    Task<int> SaveChangesAsync(CancellationToken cancellationToken = default);
}

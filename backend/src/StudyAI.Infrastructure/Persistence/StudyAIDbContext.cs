using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Diagnostics;
using StudyAI.Application.Common.Interfaces;
using StudyAI.Domain.Entities;



namespace StudyAI.Infrastructure.Persistence;



public class StudyAIDbContext : DbContext, IApplicationDbContext

{

    public StudyAIDbContext(DbContextOptions<StudyAIDbContext> options)

        : base(options)

    {

    }



    public DbSet<User> Users => Set<User>();

    public DbSet<RefreshSession> RefreshSessions => Set<RefreshSession>();

    public DbSet<StaffAuditLog> StaffAuditLogs => Set<StaffAuditLog>();

    public DbSet<LessonProgress> LessonProgresses => Set<LessonProgress>();

    public DbSet<AssessmentAttempt> AssessmentAttempts => Set<AssessmentAttempt>();

    public DbSet<AssessmentResponse> AssessmentResponses => Set<AssessmentResponse>();

    public DbSet<LearningEvent> LearningEvents => Set<LearningEvent>();

    public DbSet<ContentSubject> ContentSubjects => Set<ContentSubject>();

    public DbSet<ContentChapter> ContentChapters => Set<ContentChapter>();

    public DbSet<ContentLesson> ContentLessons => Set<ContentLesson>();

    public DbSet<ContentAssessment> ContentAssessments => Set<ContentAssessment>();

    public DbSet<ContentQuestion> ContentQuestions => Set<ContentQuestion>();

    public DbSet<AiConversation> AiConversations => Set<AiConversation>();

    public DbSet<AiMessage> AiMessages => Set<AiMessage>();

    public DbSet<Classroom> Classrooms => Set<Classroom>();

    public DbSet<ClassroomStudent> ClassroomStudents => Set<ClassroomStudent>();

    public DbSet<Assignment> Assignments => Set<Assignment>();

    public DbSet<AssignmentSubmission> AssignmentSubmissions => Set<AssignmentSubmission>();

    protected override void OnConfiguring(DbContextOptionsBuilder optionsBuilder)
    {
        base.OnConfiguring(optionsBuilder);
        optionsBuilder.ConfigureWarnings(w => w.Ignore(RelationalEventId.PendingModelChangesWarning));
    }

    protected override void OnModelCreating(ModelBuilder modelBuilder)

    {

        base.OnModelCreating(modelBuilder);



        // User

        modelBuilder.Entity<User>(entity =>

        {

            entity.ToTable("users");

            entity.HasKey(e => e.Id);

            entity.Property(e => e.Id).HasMaxLength(64);

            entity.Property(e => e.Email).HasMaxLength(255);

            entity.Property(e => e.EmailNormalized).HasMaxLength(255);

            entity.HasIndex(e => e.EmailNormalized).IsUnique().HasFilter("[EmailNormalized] IS NOT NULL");

            entity.Property(e => e.PasswordHash).HasMaxLength(255);

            entity.Property(e => e.DisplayName).HasMaxLength(128);

            entity.Property(e => e.Grade).HasMaxLength(32);

            entity.Property(e => e.Role).HasMaxLength(32).HasDefaultValue("learner");

            entity.Property(e => e.Status).HasMaxLength(32).HasDefaultValue("active");

            entity.Property(e => e.IsDeleted).HasDefaultValue(false);

            entity.Property(e => e.DeletedAt);

            entity.HasIndex(e => e.IsDeleted);

            entity.Property(e => e.CreatedAt).IsRequired();

            entity.Property(e => e.UpdatedAt).IsRequired();



            entity.HasMany(e => e.RefreshSessions)

                .WithOne(r => r.User)

                .HasForeignKey(r => r.UserId)

                .OnDelete(DeleteBehavior.Cascade);

        });



        // RefreshSession

        modelBuilder.Entity<RefreshSession>(entity =>

        {

            entity.ToTable("refresh_sessions");

            entity.HasKey(e => e.Id);

            entity.Property(e => e.Id).HasMaxLength(64);

            entity.Property(e => e.UserId).HasMaxLength(64).IsRequired();

            entity.Property(e => e.TokenHash).HasMaxLength(64).IsRequired();

            entity.Property(e => e.UserAgent).HasMaxLength(255);

            entity.HasIndex(e => e.UserId);

            entity.HasIndex(e => e.TokenHash);

        });



        // StaffAuditLog

        modelBuilder.Entity<StaffAuditLog>(entity =>

        {

            entity.ToTable("staff_audit_logs");

            entity.HasKey(e => e.Id);

            entity.Property(e => e.Id).HasMaxLength(64);

            entity.Property(e => e.ActorUserId).HasMaxLength(64).IsRequired();

            entity.Property(e => e.Action).HasMaxLength(64).IsRequired();

            entity.Property(e => e.TargetType).HasMaxLength(64).IsRequired();

            entity.Property(e => e.TargetId).HasMaxLength(64).IsRequired();

            entity.HasIndex(e => e.ActorUserId);

            entity.HasIndex(e => e.Action);

            entity.HasIndex(e => e.TargetId);

            entity.HasIndex(e => e.CreatedAt);

        });



        // LessonProgress

        modelBuilder.Entity<LessonProgress>(entity =>

        {

            entity.ToTable("lesson_progress");

            entity.HasKey(e => e.Id);

            entity.Property(e => e.UserId).HasMaxLength(64).IsRequired();

            entity.Property(e => e.LessonId).HasMaxLength(64).IsRequired();

            entity.Property(e => e.SubjectId).HasMaxLength(64).IsRequired();

            entity.Property(e => e.AssessmentStatus).HasMaxLength(32).HasDefaultValue("not-attempted");

            entity.Property(e => e.AssessmentAttemptId).HasMaxLength(64);

            entity.Property(e => e.CompletedSectionIdsJson).HasDefaultValue("[]");



            entity.HasIndex(e => new { e.UserId, e.LessonId }).IsUnique();

            entity.HasIndex(e => new { e.UserId, e.SubjectId });

        });



        // AssessmentAttempt

        modelBuilder.Entity<AssessmentAttempt>(entity =>

        {

            entity.ToTable("assessment_attempts");

            entity.HasKey(e => e.Id);

            entity.Property(e => e.Id).HasMaxLength(64);

            entity.Property(e => e.UserId).HasMaxLength(64).IsRequired();

            entity.Property(e => e.AssessmentId).HasMaxLength(64).IsRequired();

            entity.Property(e => e.LessonId).HasMaxLength(64).IsRequired();

            entity.Property(e => e.SubjectId).HasMaxLength(64).IsRequired();

            entity.Property(e => e.CompletionStatus).HasMaxLength(32).HasDefaultValue("not-attempted");

            entity.Property(e => e.SuccessStatus).HasMaxLength(32).HasDefaultValue("unknown");

            entity.Property(e => e.CurrentQuestionId).HasMaxLength(64);

            entity.Property(e => e.ExitReason).HasMaxLength(64);



            entity.HasIndex(e => new { e.UserId, e.LessonId });

            entity.HasIndex(e => new { e.UserId, e.AssessmentId });



            entity.HasMany(e => e.Responses)

                .WithOne(r => r.Attempt)

                .HasForeignKey(r => r.AttemptId)

                .OnDelete(DeleteBehavior.Cascade);

        });



        // AssessmentResponse

        modelBuilder.Entity<AssessmentResponse>(entity =>

        {

            entity.ToTable("assessment_responses");

            entity.HasKey(e => e.Id);

            entity.Property(e => e.AttemptId).HasMaxLength(64).IsRequired();

            entity.Property(e => e.QuestionId).HasMaxLength(64).IsRequired();

            entity.Property(e => e.SelectedOptionIdsJson).HasDefaultValue("[]");



            entity.HasIndex(e => new { e.AttemptId, e.QuestionId }).IsUnique();

        });



        // LearningEvent

        modelBuilder.Entity<LearningEvent>(entity =>

        {

            entity.ToTable("learning_events");

            entity.HasKey(e => e.Id);

            entity.Property(e => e.Id).HasMaxLength(64);

            entity.Property(e => e.UserId).HasMaxLength(64).IsRequired();

            entity.Property(e => e.AttemptId).HasMaxLength(64);

            entity.Property(e => e.LessonId).HasMaxLength(64).IsRequired();

            entity.Property(e => e.SubjectId).HasMaxLength(64).IsRequired();

            entity.Property(e => e.Type).HasMaxLength(64).IsRequired();



            entity.HasIndex(e => new { e.UserId, e.Timestamp });

            entity.HasIndex(e => new { e.UserId, e.LessonId });

            entity.HasIndex(e => new { e.UserId, e.SubjectId });

        });



        // ContentSubject

        modelBuilder.Entity<ContentSubject>(entity =>

        {

            entity.ToTable("content_subjects");

            entity.HasKey(e => e.Id);

            entity.Property(e => e.Id).HasMaxLength(64);

            entity.Property(e => e.Name).HasMaxLength(128).IsRequired();

            entity.Property(e => e.Code).HasMaxLength(32).IsRequired();

            entity.Property(e => e.Grade).HasMaxLength(32).IsRequired();

            entity.Property(e => e.OrderIndex).HasDefaultValue(0);

            entity.Property(e => e.IsActive).HasDefaultValue(true);

            entity.Property(e => e.CreatedAt).IsRequired();

            entity.Property(e => e.UpdatedAt).IsRequired();

            entity.HasIndex(e => e.Code).IsUnique();



            entity.HasMany(e => e.Chapters)

                .WithOne(c => c.Subject)

                .HasForeignKey(c => c.SubjectId)

                .OnDelete(DeleteBehavior.Cascade);

        });



        // ContentChapter

        modelBuilder.Entity<ContentChapter>(entity =>

        {

            entity.ToTable("content_chapters");

            entity.HasKey(e => e.Id);

            entity.Property(e => e.Id).HasMaxLength(64);

            entity.Property(e => e.SubjectId).HasMaxLength(64).IsRequired();

            entity.Property(e => e.Title).HasMaxLength(255).IsRequired();

            entity.Property(e => e.OrderIndex).HasDefaultValue(0);

            entity.Property(e => e.IsActive).HasDefaultValue(true);

            entity.Property(e => e.CreatedAt).IsRequired();

            entity.Property(e => e.UpdatedAt).IsRequired();



            entity.HasIndex(e => e.SubjectId);



            entity.HasMany(e => e.Lessons)

                .WithOne(l => l.Chapter)

                .HasForeignKey(l => l.ChapterId)

                .OnDelete(DeleteBehavior.Cascade);

        });



        // ContentLesson

        modelBuilder.Entity<ContentLesson>(entity =>

        {

            entity.ToTable("content_lessons");

            entity.HasKey(e => e.Id);

            entity.Property(e => e.Id).HasMaxLength(64);

            entity.Property(e => e.ChapterId).HasMaxLength(64).IsRequired();

            entity.Property(e => e.Title).HasMaxLength(255).IsRequired();

            entity.Property(e => e.Slug).HasMaxLength(128).IsRequired();

            entity.Property(e => e.OrderIndex).HasDefaultValue(0);

            entity.Property(e => e.Status).HasMaxLength(32).HasDefaultValue("draft");

            entity.Property(e => e.AuthorId).HasMaxLength(64).IsRequired();

            entity.Property(e => e.ReviewedBy).HasMaxLength(64);



            entity.HasIndex(e => e.ChapterId);

            entity.HasIndex(e => e.Slug);

            entity.HasIndex(e => e.AuthorId);



            entity.HasMany(e => e.Assessments)

                .WithOne(a => a.Lesson)

                .HasForeignKey(a => a.LessonId)

                .OnDelete(DeleteBehavior.Cascade);



            entity.HasMany(e => e.Questions)

                .WithOne(q => q.Lesson)

                .HasForeignKey(q => q.LessonId)

                .OnDelete(DeleteBehavior.NoAction);

        });



        // ContentAssessment

        modelBuilder.Entity<ContentAssessment>(entity =>

        {

            entity.ToTable("content_assessments");

            entity.HasKey(e => e.Id);

            entity.Property(e => e.Id).HasMaxLength(64);

            entity.Property(e => e.LessonId).HasMaxLength(64).IsRequired();

            entity.Property(e => e.Title).HasMaxLength(255).IsRequired();



            entity.HasIndex(e => e.LessonId);



            entity.HasMany(e => e.Questions)

                .WithOne(q => q.Assessment)

                .HasForeignKey(q => q.AssessmentId)

                .OnDelete(DeleteBehavior.Cascade);

        });



        // ContentQuestion

        modelBuilder.Entity<ContentQuestion>(entity =>

        {

            entity.ToTable("content_questions");

            entity.HasKey(e => e.Id);

            entity.Property(e => e.Id).HasMaxLength(64);

            entity.Property(e => e.Code).HasMaxLength(64);

            entity.Property(e => e.AssessmentId).HasMaxLength(64);

            entity.Property(e => e.LessonId).HasMaxLength(64);

            entity.Property(e => e.SubjectId).HasMaxLength(64);

            entity.Property(e => e.ChapterId).HasMaxLength(64);

            entity.Property(e => e.Grade).HasMaxLength(32);

            entity.Property(e => e.Prompt).IsRequired();

            entity.Property(e => e.OptionsJson).IsRequired();

            entity.Property(e => e.CorrectAnswer).IsRequired();

            entity.Property(e => e.Topic).HasMaxLength(128);

            entity.Property(e => e.Difficulty).HasMaxLength(32).HasDefaultValue("medium");

            entity.Property(e => e.Type).HasMaxLength(32).HasDefaultValue("multiple-choice");

            entity.Property(e => e.Status).HasMaxLength(32).HasDefaultValue("published");

            entity.Property(e => e.OrderIndex).HasDefaultValue(0);

            entity.Property(e => e.ImageUrl).HasMaxLength(1000);

            entity.Property(e => e.MetadataJson).HasColumnType("nvarchar(max)");

            entity.Property(e => e.IsDeleted).HasDefaultValue(false);

            entity.Property(e => e.DeletedBy).HasMaxLength(64);

            entity.Property(e => e.AuthorId).HasMaxLength(64);

            entity.Property(e => e.ReviewedBy).HasMaxLength(64);

            entity.Property(e => e.RejectionReason).HasMaxLength(500);

            entity.Property(e => e.SourceType).HasMaxLength(64).HasDefaultValue("manual");

            entity.Property(e => e.SourceBatchId).HasMaxLength(64);

            entity.Property(e => e.SourceUrl).HasMaxLength(1000);

            entity.Property(e => e.CopyrightStatus).HasMaxLength(64).HasDefaultValue("proprietary");

            entity.Property(e => e.CopyrightProofRef).HasMaxLength(255);

            entity.Property(e => e.Version).HasDefaultValue(1);

            entity.Property(e => e.CreatedAt).IsRequired();

            entity.Property(e => e.UpdatedAt).IsRequired();



            entity.HasIndex(e => e.Code);

            entity.HasIndex(e => e.AssessmentId);

            entity.HasIndex(e => e.LessonId);

            entity.HasIndex(e => e.SubjectId);

            entity.HasIndex(e => e.ChapterId);

            entity.HasIndex(e => e.Status);

            entity.HasIndex(e => e.IsDeleted);

            entity.HasIndex(e => e.SourceType);
        });

        // AiConversation
        modelBuilder.Entity<AiConversation>(entity =>
        {
            entity.ToTable("ai_conversations");
            entity.HasKey(e => e.Id);
            entity.Property(e => e.Id).HasMaxLength(64);
            entity.Property(e => e.UserId).HasMaxLength(64).IsRequired();
            entity.Property(e => e.Title).HasMaxLength(255).IsRequired();
            entity.Property(e => e.Subject).HasMaxLength(64);
            entity.Property(e => e.LessonId).HasMaxLength(64);
            entity.Property(e => e.AssistanceMode).HasMaxLength(32).HasDefaultValue("explain");
            entity.Property(e => e.LearningContextJson).HasColumnType("nvarchar(max)");
            entity.Property(e => e.CreatedAt).IsRequired();
            entity.Property(e => e.UpdatedAt).IsRequired();

            entity.HasIndex(e => e.UserId);
            entity.HasIndex(e => new { e.UserId, e.UpdatedAt });

            entity.HasOne(e => e.User)
                .WithMany()
                .HasForeignKey(e => e.UserId)
                .OnDelete(DeleteBehavior.Cascade);

            entity.HasOne(e => e.Lesson)
                .WithMany()
                .HasForeignKey(e => e.LessonId)
                .OnDelete(DeleteBehavior.NoAction);
        });

        // AiMessage
        modelBuilder.Entity<AiMessage>(entity =>
        {
            entity.ToTable("ai_messages");
            entity.HasKey(e => e.Id);
            entity.Property(e => e.Id).HasMaxLength(64);
            entity.Property(e => e.ConversationId).HasMaxLength(64).IsRequired();
            entity.Property(e => e.Role).HasMaxLength(32).IsRequired();
            entity.Property(e => e.Content).HasColumnType("nvarchar(max)").IsRequired();
            entity.Property(e => e.SuggestedActionsJson).HasColumnType("nvarchar(max)");
            entity.Property(e => e.LearningContextSnapshotJson).HasColumnType("nvarchar(max)");
            entity.Property(e => e.AssistanceMode).HasMaxLength(32);
            entity.Property(e => e.TokensUsed);
            entity.Property(e => e.CreatedAt).IsRequired();

            entity.HasIndex(e => e.ConversationId);
            entity.HasIndex(e => new { e.ConversationId, e.CreatedAt });

            entity.HasOne(e => e.Conversation)
                .WithMany(c => c.Messages)
                .HasForeignKey(e => e.ConversationId)
                .OnDelete(DeleteBehavior.Cascade);
        });

        // Phase 20: Classrooms
        modelBuilder.Entity<Classroom>(entity =>
        {
            entity.ToTable("classrooms");
            entity.HasKey(e => e.Id);
            entity.Property(e => e.Id).HasMaxLength(64);
            entity.Property(e => e.Name).HasMaxLength(128).IsRequired();
            entity.Property(e => e.Code).HasMaxLength(64);
            entity.Property(e => e.Grade).HasMaxLength(64);
            entity.Property(e => e.Subject).HasMaxLength(128);
            entity.Property(e => e.TeacherId).HasMaxLength(64).IsRequired();
            entity.Property(e => e.TeacherName).HasMaxLength(128);
            entity.Property(e => e.Description).HasMaxLength(1000);
            entity.Property(e => e.Room).HasMaxLength(64);
            entity.Property(e => e.AcademicYear).HasMaxLength(64);
            entity.Property(e => e.Status).HasMaxLength(32).HasDefaultValue("active");
            entity.Property(e => e.CreatedAt).IsRequired();
            entity.Property(e => e.UpdatedAt).IsRequired();

            entity.HasIndex(e => e.TeacherId);
            entity.HasIndex(e => e.Status);

            entity.HasOne(e => e.Teacher)
                .WithMany()
                .HasForeignKey(e => e.TeacherId)
                .OnDelete(DeleteBehavior.Restrict);
        });

        // Phase 20: Classroom Students
        modelBuilder.Entity<ClassroomStudent>(entity =>
        {
            entity.ToTable("classroom_students");
            entity.HasKey(e => e.Id);
            entity.Property(e => e.Id).HasMaxLength(64);
            entity.Property(e => e.ClassroomId).HasMaxLength(64).IsRequired();
            entity.Property(e => e.StudentId).HasMaxLength(64).IsRequired();
            entity.Property(e => e.EnrolledAt).IsRequired();

            entity.HasIndex(e => new { e.ClassroomId, e.StudentId }).IsUnique();
            entity.HasIndex(e => e.StudentId);

            entity.HasOne(e => e.Classroom)
                .WithMany(c => c.Students)
                .HasForeignKey(e => e.ClassroomId)
                .OnDelete(DeleteBehavior.Cascade);

            entity.HasOne(e => e.Student)
                .WithMany()
                .HasForeignKey(e => e.StudentId)
                .OnDelete(DeleteBehavior.Restrict);
        });

        // Phase 20: Assignments
        modelBuilder.Entity<Assignment>(entity =>
        {
            entity.ToTable("assignments");
            entity.HasKey(e => e.Id);
            entity.Property(e => e.Id).HasMaxLength(64);
            entity.Property(e => e.ClassroomId).HasMaxLength(64).IsRequired();
            entity.Property(e => e.Title).HasMaxLength(255).IsRequired();
            entity.Property(e => e.Description).HasColumnType("nvarchar(max)");
            entity.Property(e => e.Instructions).HasColumnType("nvarchar(max)");
            entity.Property(e => e.DueDate).IsRequired();
            entity.Property(e => e.MaxScore).HasDefaultValue(10.0);
            entity.Property(e => e.Status).HasMaxLength(32).HasDefaultValue("active");
            entity.Property(e => e.CreatedByTeacherId).HasMaxLength(64).IsRequired();
            entity.Property(e => e.CreatedAt).IsRequired();
            entity.Property(e => e.UpdatedAt).IsRequired();

            entity.HasIndex(e => e.ClassroomId);
            entity.HasIndex(e => e.Status);
            entity.HasIndex(e => e.DueDate);

            entity.HasOne(e => e.Classroom)
                .WithMany(c => c.Assignments)
                .HasForeignKey(e => e.ClassroomId)
                .OnDelete(DeleteBehavior.Cascade);

            entity.HasOne(e => e.CreatedByTeacher)
                .WithMany()
                .HasForeignKey(e => e.CreatedByTeacherId)
                .OnDelete(DeleteBehavior.Restrict);
        });

        // Phase 20: Assignment Submissions
        modelBuilder.Entity<AssignmentSubmission>(entity =>
        {
            entity.ToTable("assignment_submissions");
            entity.HasKey(e => e.Id);
            entity.Property(e => e.Id).HasMaxLength(64);
            entity.Property(e => e.AssignmentId).HasMaxLength(64).IsRequired();
            entity.Property(e => e.StudentId).HasMaxLength(64).IsRequired();
            entity.Property(e => e.Content).HasColumnType("nvarchar(max)").IsRequired();
            entity.Property(e => e.SubmittedAt).IsRequired();
            entity.Property(e => e.Status).HasMaxLength(32).HasDefaultValue("submitted");
            entity.Property(e => e.Score);
            entity.Property(e => e.Feedback).HasColumnType("nvarchar(max)");
            entity.Property(e => e.GradedAt);
            entity.Property(e => e.GradedByTeacherId).HasMaxLength(64);

            entity.HasIndex(e => new { e.AssignmentId, e.StudentId }).IsUnique();
            entity.HasIndex(e => e.StudentId);
            entity.HasIndex(e => e.Status);

            entity.HasOne(e => e.Assignment)
                .WithMany(a => a.Submissions)
                .HasForeignKey(e => e.AssignmentId)
                .OnDelete(DeleteBehavior.Cascade);

            entity.HasOne(e => e.Student)
                .WithMany()
                .HasForeignKey(e => e.StudentId)
                .OnDelete(DeleteBehavior.Restrict);
        });

    }

    public override int SaveChanges()
    {
        EnforceDatabaseSafetyIfTesting();
        return base.SaveChanges();
    }

    public override int SaveChanges(bool acceptAllChangesOnSuccess)
    {
        EnforceDatabaseSafetyIfTesting();
        return base.SaveChanges(acceptAllChangesOnSuccess);
    }

    public override Task<int> SaveChangesAsync(CancellationToken cancellationToken = default)
    {
        EnforceDatabaseSafetyIfTesting();
        return base.SaveChangesAsync(cancellationToken);
    }

    public override Task<int> SaveChangesAsync(bool acceptAllChangesOnSuccess, CancellationToken cancellationToken = default)
    {
        EnforceDatabaseSafetyIfTesting();
        return base.SaveChangesAsync(acceptAllChangesOnSuccess, cancellationToken);
    }

    private void EnforceDatabaseSafetyIfTesting()
    {
        if (DatabaseSafetyGuard.IsTestExecutionContext)
        {
            var connStr = Database.GetDbConnection().ConnectionString;
            DatabaseSafetyGuard.EnsureSafeTestDatabase(connStr, "StudyAIDbContext.SaveChanges");
        }
    }

}


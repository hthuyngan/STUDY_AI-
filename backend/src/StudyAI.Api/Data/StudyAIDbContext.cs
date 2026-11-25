using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Diagnostics;

using StudyAI.Models;



namespace StudyAI.Data;



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

    public DbSet<GradeLevel> GradeLevels => Set<GradeLevel>();

    public DbSet<CatalogSubject> CatalogSubjects => Set<CatalogSubject>();

    public DbSet<Curriculum> Curricula => Set<Curriculum>();

    public DbSet<TextbookSeries> TextbookSeries => Set<TextbookSeries>();

    public DbSet<CurriculumEdition> CurriculumEditions => Set<CurriculumEdition>();

    public DbSet<ContentChapter> ContentChapters => Set<ContentChapter>();

    public DbSet<ContentTopic> ContentTopics => Set<ContentTopic>();

    public DbSet<ContentLesson> ContentLessons => Set<ContentLesson>();

    public DbSet<ContentLessonVideo> ContentLessonVideos => Set<ContentLessonVideo>();

    public DbSet<ContentAssessment> ContentAssessments => Set<ContentAssessment>();

    public DbSet<ContentQuestion> ContentQuestions => Set<ContentQuestion>();

    public DbSet<ContentRevision> ContentRevisions => Set<ContentRevision>();

    public DbSet<AiConversation> AiConversations => Set<AiConversation>();

    public DbSet<AiMessage> AiMessages => Set<AiMessage>();

    public DbSet<Classroom> Classrooms => Set<Classroom>();

    public DbSet<ClassroomStudent> ClassroomStudents => Set<ClassroomStudent>();

    public DbSet<Assignment> Assignments => Set<Assignment>();

    public DbSet<AssignmentSubmission> AssignmentSubmissions => Set<AssignmentSubmission>();

    public DbSet<ClassroomAlert> ClassroomAlerts => Set<ClassroomAlert>();

    public DbSet<AiUsageLog> AiUsageLogs => Set<AiUsageLog>();

    public DbSet<StudentTopicMastery> StudentTopicMasteries => Set<StudentTopicMastery>();

    public DbSet<AiHintUsage> AiHintUsages => Set<AiHintUsage>();

    public DbSet<AiLearningRecommendation> AiLearningRecommendations => Set<AiLearningRecommendation>();

    public DbSet<TeacherProfile> TeacherProfiles => Set<TeacherProfile>();

    public DbSet<SystemSetting> SystemSettings => Set<SystemSetting>();

    public DbSet<UserStudyNote> UserStudyNotes => Set<UserStudyNote>();

    public DbSet<UserSectionBookmark> UserSectionBookmarks => Set<UserSectionBookmark>();

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

            entity.HasIndex(e => new { e.TargetType, e.Action, e.CreatedAt });

        });



        // LessonProgress

        modelBuilder.Entity<LessonProgress>(entity =>

        {

            entity.ToTable("lesson_progress");

            entity.HasKey(e => e.Id);

            entity.Property(e => e.UserId).HasMaxLength(64).IsRequired();

            entity.Property(e => e.LessonId).HasMaxLength(64).IsRequired();

            entity.Property(e => e.SubjectId).HasMaxLength(64);

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

            entity.Property(e => e.SubjectId).HasMaxLength(64);

            entity.Property(e => e.CurriculumEditionId).HasMaxLength(64);

            entity.Property(e => e.Code).HasMaxLength(64);

            entity.Property(e => e.Title).HasMaxLength(255).IsRequired();

            entity.Property(e => e.OrderIndex).HasDefaultValue(0);

            entity.Property(e => e.IsActive).HasDefaultValue(true);

            entity.Property(e => e.Status).HasMaxLength(32).HasDefaultValue("published");

            entity.Property(e => e.SourceName).HasMaxLength(255);

            entity.Property(e => e.SourceUrl).HasMaxLength(500);

            entity.Property(e => e.CreatedAt).IsRequired();

            entity.Property(e => e.UpdatedAt).IsRequired();

            entity.Property(e => e.RowVersion).IsRowVersion();



            entity.HasIndex(e => e.SubjectId);

            entity.HasIndex(e => e.CurriculumEditionId);

            entity.HasIndex(e => new { e.CurriculumEditionId, e.Code })
                .IsUnique()
                .HasFilter("[CurriculumEditionId] IS NOT NULL AND [Code] IS NOT NULL AND [Status] <> 'archived'");

            entity.HasOne(e => e.CurriculumEdition)
                .WithMany(e => e.Chapters)
                .HasForeignKey(e => e.CurriculumEditionId)
                .OnDelete(DeleteBehavior.Restrict);



            entity.HasMany(e => e.Topics)

                .WithOne(t => t.Chapter)

                .HasForeignKey(t => t.ChapterId)

                .OnDelete(DeleteBehavior.Cascade);



            entity.HasMany(e => e.Lessons)

                .WithOne(l => l.Chapter)

                .HasForeignKey(l => l.ChapterId)

                .OnDelete(DeleteBehavior.Cascade);

        });



        // ContentTopic

        modelBuilder.Entity<ContentTopic>(entity =>

        {

            entity.ToTable("content_topics");

            entity.HasKey(e => e.Id);

            entity.Property(e => e.Id).HasMaxLength(64);

            entity.Property(e => e.ChapterId).HasMaxLength(64).IsRequired();

            entity.Property(e => e.Title).HasMaxLength(255).IsRequired();

            entity.Property(e => e.OrderIndex).HasDefaultValue(0);

            entity.Property(e => e.IsActive).HasDefaultValue(true);

            entity.Property(e => e.CreatedAt).IsRequired();

            entity.Property(e => e.UpdatedAt).IsRequired();



            entity.HasIndex(e => e.ChapterId);



            entity.HasMany(e => e.Lessons)

                .WithOne(l => l.Topic)

                .HasForeignKey(l => l.TopicId)

                .OnDelete(DeleteBehavior.NoAction);

        });



        // ContentLesson

        modelBuilder.Entity<ContentLesson>(entity =>

        {

            entity.ToTable("content_lessons");

            entity.HasKey(e => e.Id);

            entity.Property(e => e.Id).HasMaxLength(64);

            entity.Property(e => e.ChapterId).HasMaxLength(64).IsRequired();

            entity.Property(e => e.Code).HasMaxLength(64);

            entity.Property(e => e.TopicId).HasMaxLength(64);

            entity.Property(e => e.Title).HasMaxLength(255).IsRequired();

            entity.Property(e => e.Slug).HasMaxLength(128).IsRequired();

            entity.Property(e => e.OrderIndex).HasDefaultValue(0);

            entity.Property(e => e.Status).HasMaxLength(32).HasDefaultValue("draft");

            entity.Property(e => e.AuthorId).HasMaxLength(64).IsRequired();

            entity.Property(e => e.ReviewedBy).HasMaxLength(64);

            entity.Property(e => e.SourceName).HasMaxLength(255);

            entity.Property(e => e.SourceUrl).HasMaxLength(500);

            entity.Property(e => e.SourceLicense).HasMaxLength(255);

            entity.Property(e => e.RowVersion).IsRowVersion();



            entity.HasIndex(e => e.ChapterId);

            entity.HasIndex(e => new { e.ChapterId, e.Code })
                .IsUnique()
                .HasFilter("[Code] IS NOT NULL AND [Status] <> 'archived'");

            entity.HasIndex(e => e.TopicId);

            entity.HasIndex(e => e.Slug);

            entity.HasIndex(e => e.AuthorId);



            entity.HasMany(e => e.Videos)

                .WithOne(v => v.Lesson)

                .HasForeignKey(v => v.LessonId)

                .OnDelete(DeleteBehavior.Cascade);



            entity.HasMany(e => e.Assessments)

                .WithOne(a => a.Lesson)

                .HasForeignKey(a => a.LessonId)

                .OnDelete(DeleteBehavior.Cascade);



            entity.HasMany(e => e.Questions)

                .WithOne(q => q.Lesson)

                .HasForeignKey(q => q.LessonId)

                .OnDelete(DeleteBehavior.NoAction);

        });



        // ContentLessonVideo

        modelBuilder.Entity<ContentLessonVideo>(entity =>

        {

            entity.ToTable("content_lesson_videos");

            entity.HasKey(e => e.Id);

            entity.Property(e => e.Id).HasMaxLength(64);

            entity.Property(e => e.LessonId).HasMaxLength(64).IsRequired();

            entity.Property(e => e.Title).HasMaxLength(255).IsRequired();

            entity.Property(e => e.Provider).HasMaxLength(64).HasDefaultValue("youtube");

            entity.Property(e => e.SourceUrl).HasMaxLength(500).IsRequired();

            entity.Property(e => e.EmbedUrl).HasMaxLength(500);

            entity.Property(e => e.YouTubeVideoId).HasMaxLength(64);

            entity.Property(e => e.ChannelName).HasMaxLength(255);

            entity.Property(e => e.IsPrimary).HasDefaultValue(false);

            entity.Property(e => e.AttributionText).HasMaxLength(500);

            entity.Property(e => e.Language).HasMaxLength(16).HasDefaultValue("vi");

            entity.Property(e => e.DurationSeconds).HasDefaultValue(0);

            entity.Property(e => e.ThumbnailUrl).HasMaxLength(500);

            entity.Property(e => e.SortOrder).HasDefaultValue(1);

            entity.Property(e => e.EmbedAllowed).HasDefaultValue(true);

            entity.Property(e => e.VerificationStatus).HasMaxLength(32).HasDefaultValue("verified");

            entity.Property(e => e.VerifiedAt);

            entity.Property(e => e.LastVerifiedAt);

            entity.Property(e => e.IsPublished).HasDefaultValue(true);

            entity.Property(e => e.CreatedAt).IsRequired();

            entity.Property(e => e.UpdatedAt).IsRequired();



            entity.HasIndex(e => e.LessonId);

        });



        // ContentAssessment
        modelBuilder.Entity<ContentAssessment>(entity =>
        {
            entity.ToTable("content_assessments");
            entity.HasKey(e => e.Id);
            entity.Property(e => e.Id).HasMaxLength(64);
            entity.Property(e => e.LessonId).HasMaxLength(64).IsRequired();
            entity.Property(e => e.Title).HasMaxLength(255).IsRequired();
            entity.Property(e => e.Status).HasMaxLength(32).HasDefaultValue("draft");
            entity.Property(e => e.DurationMinutes).HasDefaultValue(15);
            entity.Property(e => e.CreatedAt).IsRequired();
            entity.Property(e => e.UpdatedAt).IsRequired();

            entity.HasIndex(e => e.LessonId);
            entity.HasIndex(e => e.Status);

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

        modelBuilder.Entity<ContentRevision>(entity =>
        {
            entity.ToTable("content_revisions");
            entity.HasKey(e => e.Id);
            entity.Property(e => e.Id).HasMaxLength(64);
            entity.Property(e => e.ContentId).HasMaxLength(64).IsRequired();
            entity.Property(e => e.ContentType).HasMaxLength(32).IsRequired();
            entity.Property(e => e.Status).HasMaxLength(32).IsRequired();
            entity.Property(e => e.Title).HasMaxLength(256).IsRequired();
            entity.Property(e => e.AuthorId).HasMaxLength(64);
            entity.Property(e => e.CreatedBy).HasMaxLength(64);
            entity.Property(e => e.Reason).HasMaxLength(500);
            entity.Property(e => e.SourceRevisionId).HasMaxLength(64);
            entity.Property(e => e.CreatedAt).IsRequired();

            entity.HasIndex(e => new { e.ContentId, e.Version }).IsUnique();
            entity.HasIndex(e => e.CreatedAt);
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

        modelBuilder.Entity<ClassroomAlert>(entity =>
        {
            entity.ToTable("classroom_alerts");
            entity.HasKey(e => e.Id);
            entity.Property(e => e.Id).HasMaxLength(64);
            entity.Property(e => e.ClassroomId).HasMaxLength(64).IsRequired();
            entity.Property(e => e.StudentId).HasMaxLength(64).IsRequired();
            entity.Property(e => e.Type).HasMaxLength(32).IsRequired();
            entity.Property(e => e.Severity).HasMaxLength(16).IsRequired();
            entity.Property(e => e.Message).HasMaxLength(500).IsRequired();
            entity.Property(e => e.Status).HasMaxLength(32).IsRequired();
            entity.Property(e => e.ResolutionNote).HasMaxLength(500);
            entity.Property(e => e.ResolvedByTeacherId).HasMaxLength(64);
            entity.Property(e => e.CreatedAt).IsRequired();
            entity.Property(e => e.UpdatedAt).IsRequired();

            entity.HasIndex(e => e.ClassroomId);
            entity.HasIndex(e => e.StudentId);
            entity.HasIndex(e => e.Status);

            entity.HasOne(e => e.Classroom)
                .WithMany()
                .HasForeignKey(e => e.ClassroomId)
                .OnDelete(DeleteBehavior.Cascade);

            entity.HasOne(e => e.Student)
                .WithMany()
                .HasForeignKey(e => e.StudentId)
                .OnDelete(DeleteBehavior.Restrict);
        });

        // Phase AI-01: AiUsageLog
        modelBuilder.Entity<AiUsageLog>(entity =>
        {
            entity.ToTable("ai_usage_logs");
            entity.HasKey(e => e.Id);
            entity.Property(e => e.Id).HasMaxLength(64);
            entity.Property(e => e.UserId).HasMaxLength(64).IsRequired();
            entity.Property(e => e.Feature).HasMaxLength(32).IsRequired();
            entity.Property(e => e.Provider).HasMaxLength(32).IsRequired();
            entity.Property(e => e.Model).HasMaxLength(64).IsRequired();
            entity.Property(e => e.InputTokens);
            entity.Property(e => e.OutputTokens);
            entity.Property(e => e.EstimatedCostUsd).HasColumnType("decimal(10,6)");
            entity.Property(e => e.LatencyMs);
            entity.Property(e => e.Status).HasMaxLength(32).HasDefaultValue("success");
            entity.Property(e => e.ErrorMessage).HasMaxLength(500);
            entity.Property(e => e.CreatedAt).IsRequired();

            entity.HasIndex(e => e.UserId);
            entity.HasIndex(e => e.Feature);
            entity.HasIndex(e => e.CreatedAt);

            entity.HasOne(e => e.User)
                .WithMany()
                .HasForeignKey(e => e.UserId)
                .OnDelete(DeleteBehavior.Cascade);
        });

        // Phase AI-01: StudentTopicMastery
        modelBuilder.Entity<StudentTopicMastery>(entity =>
        {
            entity.ToTable("student_topic_mastery");
            entity.HasKey(e => e.Id);
            entity.Property(e => e.Id).HasMaxLength(64);
            entity.Property(e => e.UserId).HasMaxLength(64).IsRequired();
            entity.Property(e => e.SubjectId).HasMaxLength(64).IsRequired();
            entity.Property(e => e.TopicId).HasMaxLength(64);
            entity.Property(e => e.TopicName).HasMaxLength(255).IsRequired();
            entity.Property(e => e.AttemptCount);
            entity.Property(e => e.CorrectCount);
            entity.Property(e => e.HintCount);
            entity.Property(e => e.MasteryScore);
            entity.Property(e => e.Status).HasMaxLength(32).HasDefaultValue("insufficient_data");
            entity.Property(e => e.LastAttemptAt);
            entity.Property(e => e.UpdatedAt).IsRequired();

            entity.HasIndex(e => new { e.UserId, e.SubjectId, e.TopicName }).IsUnique();
            entity.HasIndex(e => e.UserId);
            entity.HasIndex(e => e.Status);

            entity.HasOne(e => e.User)
                .WithMany()
                .HasForeignKey(e => e.UserId)
                .OnDelete(DeleteBehavior.NoAction);

            entity.HasOne(e => e.Subject)
                .WithMany()
                .HasForeignKey(e => e.SubjectId)
                .OnDelete(DeleteBehavior.NoAction);

            entity.HasOne(e => e.Topic)
                .WithMany()
                .HasForeignKey(e => e.TopicId)
                .OnDelete(DeleteBehavior.NoAction);
        });

        // Phase AI-01: AiHintUsage
        modelBuilder.Entity<AiHintUsage>(entity =>
        {
            entity.ToTable("ai_hint_usage");
            entity.HasKey(e => e.Id);
            entity.Property(e => e.Id).HasMaxLength(64);
            entity.Property(e => e.UserId).HasMaxLength(64).IsRequired();
            entity.Property(e => e.QuestionId).HasMaxLength(64).IsRequired();
            entity.Property(e => e.SessionId).HasMaxLength(64);
            entity.Property(e => e.HintLevel);
            entity.Property(e => e.CreatedAt).IsRequired();

            entity.HasIndex(e => new { e.UserId, e.QuestionId });
            entity.HasIndex(e => e.CreatedAt);

            entity.HasOne(e => e.User)
                .WithMany()
                .HasForeignKey(e => e.UserId)
                .OnDelete(DeleteBehavior.NoAction);

            entity.HasOne(e => e.Question)
                .WithMany()
                .HasForeignKey(e => e.QuestionId)
                .OnDelete(DeleteBehavior.Cascade);
        });

        // Phase AI-01: AiLearningRecommendation
        modelBuilder.Entity<AiLearningRecommendation>(entity =>
        {
            entity.ToTable("ai_learning_recommendations");
            entity.HasKey(e => e.Id);
            entity.Property(e => e.Id).HasMaxLength(64);
            entity.Property(e => e.UserId).HasMaxLength(64).IsRequired();
            entity.Property(e => e.LessonId).HasMaxLength(64).IsRequired();
            entity.Property(e => e.TopicId).HasMaxLength(64);
            entity.Property(e => e.Reason).HasMaxLength(500).IsRequired();
            entity.Property(e => e.Priority).HasMaxLength(32).HasDefaultValue("standard");
            entity.Property(e => e.Status).HasMaxLength(32).HasDefaultValue("pending");
            entity.Property(e => e.CreatedAt).IsRequired();

            entity.HasIndex(e => new { e.UserId, e.Status });
            entity.HasIndex(e => new { e.UserId, e.Priority });

            entity.HasOne(e => e.User)
                .WithMany()
                .HasForeignKey(e => e.UserId)
                .OnDelete(DeleteBehavior.NoAction);

            entity.HasOne(e => e.Lesson)
                .WithMany()
                .HasForeignKey(e => e.LessonId)
                .OnDelete(DeleteBehavior.Cascade);
        });

        modelBuilder.Entity<TeacherProfile>(entity =>
        {
            entity.ToTable("TeacherProfiles");
            entity.HasKey(e => e.Id);
            entity.HasIndex(e => e.TeacherId).IsUnique();
            entity.Property(e => e.Phone).HasMaxLength(32);
            entity.Property(e => e.Qualifications).HasMaxLength(256);
            entity.Property(e => e.Bio).HasMaxLength(2000);
            entity.HasOne(e => e.Teacher)
                .WithMany()
                .HasForeignKey(e => e.TeacherId)
                .OnDelete(DeleteBehavior.Cascade);
        });

        modelBuilder.Entity<SystemSetting>(entity =>
        {
            entity.ToTable("system_settings");
            entity.HasKey(e => e.Id);
            entity.Property(e => e.Id).HasMaxLength(64);
            entity.Property(e => e.Payload).IsRequired();
            entity.Property(e => e.Version).HasMaxLength(64).IsConcurrencyToken();
            entity.Property(e => e.UpdatedBy).HasMaxLength(128).IsRequired();
            entity.Property(e => e.RowVersion).IsRowVersion();
        });

        modelBuilder.Entity<UserStudyNote>(entity =>
        {
            entity.ToTable("user_study_notes");
            entity.HasKey(e => e.Id);
            entity.Property(e => e.Id).HasMaxLength(64);
            entity.Property(e => e.UserId).HasMaxLength(64).IsRequired();
            entity.Property(e => e.LessonId).HasMaxLength(64).IsRequired();
            entity.Property(e => e.SubjectId).HasMaxLength(64);
            entity.Property(e => e.LessonTitle).HasMaxLength(256);
            entity.Property(e => e.SubjectName).HasMaxLength(256);
            entity.Property(e => e.SectionId).HasMaxLength(64);
            entity.Property(e => e.SectionTitle).HasMaxLength(256);
            entity.Property(e => e.Content).IsRequired();
            entity.HasIndex(e => new { e.UserId, e.LessonId });
            entity.HasOne(e => e.User)
                .WithMany()
                .HasForeignKey(e => e.UserId)
                .OnDelete(DeleteBehavior.NoAction);
            entity.HasOne(e => e.Lesson)
                .WithMany()
                .HasForeignKey(e => e.LessonId)
                .OnDelete(DeleteBehavior.Cascade);
        });

        modelBuilder.Entity<UserSectionBookmark>(entity =>
        {
            entity.ToTable("user_section_bookmarks");
            entity.HasKey(e => e.Id);
            entity.Property(e => e.Id).HasMaxLength(128);
            entity.Property(e => e.UserId).HasMaxLength(64).IsRequired();
            entity.Property(e => e.LessonId).HasMaxLength(64).IsRequired();
            entity.Property(e => e.SubjectId).HasMaxLength(64);
            entity.Property(e => e.LessonTitle).HasMaxLength(256);
            entity.Property(e => e.SubjectName).HasMaxLength(256);
            entity.Property(e => e.SectionId).HasMaxLength(64).IsRequired();
            entity.Property(e => e.SectionTitle).HasMaxLength(256);
            entity.HasIndex(e => new { e.UserId, e.LessonId, e.SectionId }).IsUnique();
            entity.HasOne(e => e.User)
                .WithMany()
                .HasForeignKey(e => e.UserId)
                .OnDelete(DeleteBehavior.NoAction);
            entity.HasOne(e => e.Lesson)
                .WithMany()
                .HasForeignKey(e => e.LessonId)
                .OnDelete(DeleteBehavior.Cascade);
        });

        // P01: Multi-subject catalog foundations
        modelBuilder.Entity<GradeLevel>(entity =>
        {
            entity.ToTable("grade_levels");
            entity.HasKey(e => e.Id);
            entity.Property(e => e.Id).HasMaxLength(64);
            entity.Property(e => e.Code).HasMaxLength(32).IsRequired();
            entity.Property(e => e.Name).HasMaxLength(128).IsRequired();
            entity.Property(e => e.OrderIndex).HasDefaultValue(0);
            entity.Property(e => e.Status).HasMaxLength(32).HasDefaultValue("draft").IsRequired();
            entity.Property(e => e.RowVersion).IsRowVersion();
            entity.HasIndex(e => e.Code).IsUnique();
            entity.HasIndex(e => new { e.Status, e.OrderIndex });
        });

        modelBuilder.Entity<CatalogSubject>(entity =>
        {
            entity.ToTable("catalog_subjects");
            entity.HasKey(e => e.Id);
            entity.Property(e => e.Id).HasMaxLength(64);
            entity.Property(e => e.Code).HasMaxLength(32).IsRequired();
            entity.Property(e => e.Name).HasMaxLength(128).IsRequired();
            entity.Property(e => e.Description).HasMaxLength(1000);
            entity.Property(e => e.Status).HasMaxLength(32).HasDefaultValue("draft").IsRequired();
            entity.Property(e => e.RowVersion).IsRowVersion();
            entity.HasIndex(e => e.Code).IsUnique();
            entity.HasIndex(e => new { e.Status, e.Name });
        });

        modelBuilder.Entity<Curriculum>(entity =>
        {
            entity.ToTable("curricula");
            entity.HasKey(e => e.Id);
            entity.Property(e => e.Id).HasMaxLength(64);
            entity.Property(e => e.Code).HasMaxLength(64).IsRequired();
            entity.Property(e => e.GradeLevelId).HasMaxLength(64).IsRequired();
            entity.Property(e => e.SubjectId).HasMaxLength(64).IsRequired();
            entity.Property(e => e.Name).HasMaxLength(200).IsRequired();
            entity.Property(e => e.Framework).HasMaxLength(128).IsRequired();
            entity.Property(e => e.Status).HasMaxLength(32).HasDefaultValue("draft").IsRequired();
            entity.Property(e => e.SourceName).HasMaxLength(256);
            entity.Property(e => e.SourceUrl).HasMaxLength(512);
            entity.Property(e => e.SourceLicense).HasMaxLength(256);
            entity.Property(e => e.RowVersion).IsRowVersion();
            entity.HasIndex(e => e.Code).IsUnique();
            entity.HasIndex(e => new { e.GradeLevelId, e.SubjectId, e.Framework, e.AcademicYearFrom, e.AcademicYearTo })
                .IsUnique()
                .HasFilter("[Status] <> 'archived'");
            entity.HasOne(e => e.GradeLevel)
                .WithMany(g => g.Curricula)
                .HasForeignKey(e => e.GradeLevelId)
                .OnDelete(DeleteBehavior.Restrict);
            entity.HasOne(e => e.Subject)
                .WithMany(s => s.Curricula)
                .HasForeignKey(e => e.SubjectId)
                .OnDelete(DeleteBehavior.Restrict);
        });

        modelBuilder.Entity<TextbookSeries>(entity =>
        {
            entity.ToTable("textbook_series");
            entity.HasKey(e => e.Id);
            entity.Property(e => e.Id).HasMaxLength(64);
            entity.Property(e => e.Code).HasMaxLength(64).IsRequired();
            entity.Property(e => e.Name).HasMaxLength(200).IsRequired();
            entity.Property(e => e.Publisher).HasMaxLength(200).IsRequired();
            entity.Property(e => e.Description).HasMaxLength(1000);
            entity.Property(e => e.Status).HasMaxLength(32).HasDefaultValue("draft").IsRequired();
            entity.Property(e => e.SourceName).HasMaxLength(256);
            entity.Property(e => e.SourceUrl).HasMaxLength(512);
            entity.Property(e => e.SourceLicense).HasMaxLength(256);
            entity.Property(e => e.RowVersion).IsRowVersion();
            entity.HasIndex(e => e.Code).IsUnique();
            entity.HasIndex(e => new { e.Status, e.Name });
        });

        modelBuilder.Entity<CurriculumEdition>(entity =>
        {
            entity.ToTable("curriculum_editions");
            entity.HasKey(e => e.Id);
            entity.Property(e => e.Id).HasMaxLength(64);
            entity.Property(e => e.Code).HasMaxLength(64).IsRequired();
            entity.Property(e => e.CurriculumId).HasMaxLength(64).IsRequired();
            entity.Property(e => e.TextbookSeriesId).HasMaxLength(64);
            entity.Property(e => e.EditionName).HasMaxLength(200).IsRequired();
            entity.Property(e => e.Volume).HasMaxLength(64);
            entity.Property(e => e.Version).HasMaxLength(64);
            entity.Property(e => e.Status).HasMaxLength(32).HasDefaultValue("draft").IsRequired();
            entity.Property(e => e.SourceName).HasMaxLength(256);
            entity.Property(e => e.SourceUrl).HasMaxLength(512);
            entity.Property(e => e.SourceLicense).HasMaxLength(256);
            entity.Property(e => e.ReviewedBy).HasMaxLength(64);
            entity.Property(e => e.RowVersion).IsRowVersion();
            entity.HasIndex(e => e.Code).IsUnique();
            entity.HasIndex(e => new { e.CurriculumId, e.TextbookSeriesId, e.Version, e.Volume, e.PublicationYear })
                .IsUnique()
                .HasFilter("[Status] <> 'archived'");
            entity.HasOne(e => e.Curriculum)
                .WithMany(c => c.Editions)
                .HasForeignKey(e => e.CurriculumId)
                .OnDelete(DeleteBehavior.Restrict);
            entity.HasOne(e => e.TextbookSeries)
                .WithMany(t => t.Editions)
                .HasForeignKey(e => e.TextbookSeriesId)
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
        if (DatabaseSafetyGuard.IsTestExecutionContext && Database.IsRelational())
        {
            var connStr = Database.GetDbConnection().ConnectionString;
            DatabaseSafetyGuard.EnsureSafeTestDatabase(connStr, "StudyAIDbContext.SaveChanges");
        }
    }

}


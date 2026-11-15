using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace StudyAI.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class AddAiIntelligenceTables : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql(@"IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('content_lessons') AND name = 'LearningObjectivesJson')
BEGIN
    ALTER TABLE [content_lessons] ADD [LearningObjectivesJson] nvarchar(max) NULL;
END");

            migrationBuilder.Sql(@"IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('content_lessons') AND name = 'TopicId')
BEGIN
    ALTER TABLE [content_lessons] ADD [TopicId] nvarchar(64) NULL;
END");

            migrationBuilder.Sql(@"IF OBJECT_ID('content_topics', 'U') IS NULL
BEGIN
    CREATE TABLE [content_topics] (
        [Id] nvarchar(64) NOT NULL,
        [ChapterId] nvarchar(64) NOT NULL,
        [Title] nvarchar(255) NOT NULL,
        [Description] nvarchar(max) NULL,
        [OrderIndex] int NOT NULL DEFAULT 0,
        [IsActive] bit NOT NULL DEFAULT 1,
        [CreatedAt] datetimeoffset NOT NULL,
        [UpdatedAt] datetimeoffset NOT NULL,
        CONSTRAINT [PK_content_topics] PRIMARY KEY ([Id]),
        CONSTRAINT [FK_content_topics_content_chapters_ChapterId] FOREIGN KEY ([ChapterId]) REFERENCES [content_chapters] ([Id]) ON DELETE CASCADE
    );
    CREATE INDEX [IX_content_topics_ChapterId] ON [content_topics] ([ChapterId]);
END");

            migrationBuilder.Sql(@"IF OBJECT_ID('content_lesson_videos', 'U') IS NULL
BEGIN
    CREATE TABLE [content_lesson_videos] (
        [Id] nvarchar(64) NOT NULL,
        [LessonId] nvarchar(64) NOT NULL,
        [Title] nvarchar(255) NOT NULL,
        [Description] nvarchar(max) NULL,
        [Provider] nvarchar(64) NOT NULL DEFAULT 'youtube',
        [SourceUrl] nvarchar(500) NOT NULL,
        [EmbedUrl] nvarchar(500) NULL,
        [YouTubeVideoId] nvarchar(64) NULL,
        [Language] nvarchar(16) NOT NULL DEFAULT 'vi',
        [DurationSeconds] int NOT NULL DEFAULT 0,
        [ThumbnailUrl] nvarchar(500) NULL,
        [SortOrder] int NOT NULL DEFAULT 1,
        [EmbedAllowed] bit NOT NULL DEFAULT 1,
        [VerificationStatus] nvarchar(32) NOT NULL DEFAULT 'verified',
        [VerifiedAt] datetimeoffset NULL,
        [IsPublished] bit NOT NULL DEFAULT 1,
        [CreatedAt] datetimeoffset NOT NULL,
        [UpdatedAt] datetimeoffset NOT NULL,
        CONSTRAINT [PK_content_lesson_videos] PRIMARY KEY ([Id]),
        CONSTRAINT [FK_content_lesson_videos_content_lessons_LessonId] FOREIGN KEY ([LessonId]) REFERENCES [content_lessons] ([Id]) ON DELETE CASCADE
    );
    CREATE INDEX [IX_content_lesson_videos_LessonId] ON [content_lesson_videos] ([LessonId]);
END");

            migrationBuilder.CreateTable(
                name: "ai_hint_usage",
                columns: table => new
                {
                    Id = table.Column<string>(type: "nvarchar(64)", maxLength: 64, nullable: false),
                    UserId = table.Column<string>(type: "nvarchar(64)", maxLength: 64, nullable: false),
                    QuestionId = table.Column<string>(type: "nvarchar(64)", maxLength: 64, nullable: false),
                    SessionId = table.Column<string>(type: "nvarchar(64)", maxLength: 64, nullable: true),
                    HintLevel = table.Column<int>(type: "int", nullable: false),
                    CreatedAt = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ai_hint_usage", x => x.Id);
                    table.ForeignKey(
                        name: "FK_ai_hint_usage_content_questions_QuestionId",
                        column: x => x.QuestionId,
                        principalTable: "content_questions",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_ai_hint_usage_users_UserId",
                        column: x => x.UserId,
                        principalTable: "users",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.NoAction);
                });

            migrationBuilder.CreateTable(
                name: "ai_learning_recommendations",
                columns: table => new
                {
                    Id = table.Column<string>(type: "nvarchar(64)", maxLength: 64, nullable: false),
                    UserId = table.Column<string>(type: "nvarchar(64)", maxLength: 64, nullable: false),
                    LessonId = table.Column<string>(type: "nvarchar(64)", maxLength: 64, nullable: false),
                    TopicId = table.Column<string>(type: "nvarchar(64)", maxLength: 64, nullable: true),
                    Reason = table.Column<string>(type: "nvarchar(500)", maxLength: 500, nullable: false),
                    Priority = table.Column<string>(type: "nvarchar(32)", maxLength: 32, nullable: false, defaultValue: "standard"),
                    Status = table.Column<string>(type: "nvarchar(32)", maxLength: 32, nullable: false, defaultValue: "pending"),
                    CreatedAt = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ai_learning_recommendations", x => x.Id);
                    table.ForeignKey(
                        name: "FK_ai_learning_recommendations_content_lessons_LessonId",
                        column: x => x.LessonId,
                        principalTable: "content_lessons",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_ai_learning_recommendations_users_UserId",
                        column: x => x.UserId,
                        principalTable: "users",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.NoAction);
                });

            migrationBuilder.CreateTable(
                name: "ai_usage_logs",
                columns: table => new
                {
                    Id = table.Column<string>(type: "nvarchar(64)", maxLength: 64, nullable: false),
                    UserId = table.Column<string>(type: "nvarchar(64)", maxLength: 64, nullable: false),
                    Feature = table.Column<string>(type: "nvarchar(32)", maxLength: 32, nullable: false),
                    Provider = table.Column<string>(type: "nvarchar(32)", maxLength: 32, nullable: false),
                    Model = table.Column<string>(type: "nvarchar(64)", maxLength: 64, nullable: false),
                    InputTokens = table.Column<int>(type: "int", nullable: false),
                    OutputTokens = table.Column<int>(type: "int", nullable: false),
                    EstimatedCostUsd = table.Column<decimal>(type: "decimal(10,6)", nullable: false),
                    LatencyMs = table.Column<int>(type: "int", nullable: false),
                    Status = table.Column<string>(type: "nvarchar(32)", maxLength: 32, nullable: false, defaultValue: "success"),
                    ErrorMessage = table.Column<string>(type: "nvarchar(500)", maxLength: 500, nullable: true),
                    CreatedAt = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ai_usage_logs", x => x.Id);
                    table.ForeignKey(
                        name: "FK_ai_usage_logs_users_UserId",
                        column: x => x.UserId,
                        principalTable: "users",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "student_topic_mastery",
                columns: table => new
                {
                    Id = table.Column<string>(type: "nvarchar(64)", maxLength: 64, nullable: false),
                    UserId = table.Column<string>(type: "nvarchar(64)", maxLength: 64, nullable: false),
                    SubjectId = table.Column<string>(type: "nvarchar(64)", maxLength: 64, nullable: false),
                    TopicId = table.Column<string>(type: "nvarchar(64)", maxLength: 64, nullable: true),
                    TopicName = table.Column<string>(type: "nvarchar(255)", maxLength: 255, nullable: false),
                    AttemptCount = table.Column<int>(type: "int", nullable: false),
                    CorrectCount = table.Column<int>(type: "int", nullable: false),
                    HintCount = table.Column<int>(type: "int", nullable: false),
                    MasteryScore = table.Column<double>(type: "float", nullable: false),
                    Status = table.Column<string>(type: "nvarchar(32)", maxLength: 32, nullable: false, defaultValue: "insufficient_data"),
                    LastAttemptAt = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: true),
                    UpdatedAt = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_student_topic_mastery", x => x.Id);
                    table.ForeignKey(
                        name: "FK_student_topic_mastery_content_subjects_SubjectId",
                        column: x => x.SubjectId,
                        principalTable: "content_subjects",
                        principalColumn: "Id");
                    table.ForeignKey(
                        name: "FK_student_topic_mastery_content_topics_TopicId",
                        column: x => x.TopicId,
                        principalTable: "content_topics",
                        principalColumn: "Id");
                    table.ForeignKey(
                        name: "FK_student_topic_mastery_users_UserId",
                        column: x => x.UserId,
                        principalTable: "users",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.NoAction);
                });

            migrationBuilder.Sql(@"IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_content_lessons_TopicId' AND object_id = OBJECT_ID('content_lessons'))
BEGIN
    CREATE INDEX [IX_content_lessons_TopicId] ON [content_lessons] ([TopicId]);
END");

            migrationBuilder.CreateIndex(
                name: "IX_ai_hint_usage_CreatedAt",
                table: "ai_hint_usage",
                column: "CreatedAt");

            migrationBuilder.CreateIndex(
                name: "IX_ai_hint_usage_QuestionId",
                table: "ai_hint_usage",
                column: "QuestionId");

            migrationBuilder.CreateIndex(
                name: "IX_ai_hint_usage_UserId_QuestionId",
                table: "ai_hint_usage",
                columns: new[] { "UserId", "QuestionId" });

            migrationBuilder.CreateIndex(
                name: "IX_ai_learning_recommendations_LessonId",
                table: "ai_learning_recommendations",
                column: "LessonId");

            migrationBuilder.CreateIndex(
                name: "IX_ai_learning_recommendations_UserId_Priority",
                table: "ai_learning_recommendations",
                columns: new[] { "UserId", "Priority" });

            migrationBuilder.CreateIndex(
                name: "IX_ai_learning_recommendations_UserId_Status",
                table: "ai_learning_recommendations",
                columns: new[] { "UserId", "Status" });

            migrationBuilder.CreateIndex(
                name: "IX_ai_usage_logs_CreatedAt",
                table: "ai_usage_logs",
                column: "CreatedAt");

            migrationBuilder.CreateIndex(
                name: "IX_ai_usage_logs_Feature",
                table: "ai_usage_logs",
                column: "Feature");

            migrationBuilder.CreateIndex(
                name: "IX_ai_usage_logs_UserId",
                table: "ai_usage_logs",
                column: "UserId");

            migrationBuilder.Sql(@"IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_content_lesson_videos_LessonId' AND object_id = OBJECT_ID('content_lesson_videos'))
BEGIN
    CREATE INDEX [IX_content_lesson_videos_LessonId] ON [content_lesson_videos] ([LessonId]);
END");

            migrationBuilder.Sql(@"IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_content_topics_ChapterId' AND object_id = OBJECT_ID('content_topics'))
BEGIN
    CREATE INDEX [IX_content_topics_ChapterId] ON [content_topics] ([ChapterId]);
END");

            migrationBuilder.CreateIndex(
                name: "IX_student_topic_mastery_Status",
                table: "student_topic_mastery",
                column: "Status");

            migrationBuilder.CreateIndex(
                name: "IX_student_topic_mastery_SubjectId",
                table: "student_topic_mastery",
                column: "SubjectId");

            migrationBuilder.CreateIndex(
                name: "IX_student_topic_mastery_TopicId",
                table: "student_topic_mastery",
                column: "TopicId");

            migrationBuilder.CreateIndex(
                name: "IX_student_topic_mastery_UserId",
                table: "student_topic_mastery",
                column: "UserId");

            migrationBuilder.CreateIndex(
                name: "IX_student_topic_mastery_UserId_SubjectId_TopicName",
                table: "student_topic_mastery",
                columns: new[] { "UserId", "SubjectId", "TopicName" },
                unique: true);

            migrationBuilder.Sql(@"IF NOT EXISTS (SELECT 1 FROM sys.foreign_keys WHERE name = 'FK_content_lessons_content_topics_TopicId')
BEGIN
    ALTER TABLE [content_lessons] ADD CONSTRAINT [FK_content_lessons_content_topics_TopicId] FOREIGN KEY ([TopicId]) REFERENCES [content_topics] ([Id]) ON DELETE NO ACTION;
END");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_content_lessons_content_topics_TopicId",
                table: "content_lessons");

            migrationBuilder.DropTable(
                name: "ai_hint_usage");

            migrationBuilder.DropTable(
                name: "ai_learning_recommendations");

            migrationBuilder.DropTable(
                name: "ai_usage_logs");

            migrationBuilder.DropTable(
                name: "content_lesson_videos");

            migrationBuilder.DropTable(
                name: "student_topic_mastery");

            migrationBuilder.DropTable(
                name: "content_topics");

            migrationBuilder.DropIndex(
                name: "IX_content_lessons_TopicId",
                table: "content_lessons");

            migrationBuilder.DropColumn(
                name: "LearningObjectivesJson",
                table: "content_lessons");

            migrationBuilder.DropColumn(
                name: "TopicId",
                table: "content_lessons");
        }
    }
}

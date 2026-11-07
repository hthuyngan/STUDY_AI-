using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace StudyAI.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class InitialSqlServerCreate : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "assessment_attempts",
                columns: table => new
                {
                    Id = table.Column<string>(type: "nvarchar(64)", maxLength: 64, nullable: false),
                    UserId = table.Column<string>(type: "nvarchar(64)", maxLength: 64, nullable: false),
                    AssessmentId = table.Column<string>(type: "nvarchar(64)", maxLength: 64, nullable: false),
                    LessonId = table.Column<string>(type: "nvarchar(64)", maxLength: 64, nullable: false),
                    SubjectId = table.Column<string>(type: "nvarchar(64)", maxLength: 64, nullable: false),
                    AttemptNumber = table.Column<int>(type: "int", nullable: false),
                    StartedAt = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: false),
                    LastActivityAt = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: false),
                    CompletedAt = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: true),
                    CompletionStatus = table.Column<string>(type: "nvarchar(32)", maxLength: 32, nullable: false, defaultValue: "not-attempted"),
                    SuccessStatus = table.Column<string>(type: "nvarchar(32)", maxLength: 32, nullable: false, defaultValue: "unknown"),
                    ProgressMeasure = table.Column<double>(type: "float", nullable: false),
                    ScoreRaw = table.Column<double>(type: "float", nullable: true),
                    ScoreMin = table.Column<double>(type: "float", nullable: false),
                    ScoreMax = table.Column<double>(type: "float", nullable: false),
                    ScoreScaled = table.Column<double>(type: "float", nullable: true),
                    SessionTimeMs = table.Column<int>(type: "int", nullable: false),
                    CurrentQuestionId = table.Column<string>(type: "nvarchar(64)", maxLength: 64, nullable: true),
                    ExitReason = table.Column<string>(type: "nvarchar(64)", maxLength: 64, nullable: true),
                    SuspendDataJson = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    SchemaVersion = table.Column<int>(type: "int", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_assessment_attempts", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "content_subjects",
                columns: table => new
                {
                    Id = table.Column<string>(type: "nvarchar(64)", maxLength: 64, nullable: false),
                    Name = table.Column<string>(type: "nvarchar(128)", maxLength: 128, nullable: false),
                    Code = table.Column<string>(type: "nvarchar(32)", maxLength: 32, nullable: false),
                    Description = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    Grade = table.Column<string>(type: "nvarchar(32)", maxLength: 32, nullable: false),
                    IsActive = table.Column<bool>(type: "bit", nullable: false),
                    CreatedAt = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_content_subjects", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "learning_events",
                columns: table => new
                {
                    Id = table.Column<string>(type: "nvarchar(64)", maxLength: 64, nullable: false),
                    UserId = table.Column<string>(type: "nvarchar(64)", maxLength: 64, nullable: false),
                    AttemptId = table.Column<string>(type: "nvarchar(64)", maxLength: 64, nullable: true),
                    LessonId = table.Column<string>(type: "nvarchar(64)", maxLength: 64, nullable: false),
                    SubjectId = table.Column<string>(type: "nvarchar(64)", maxLength: 64, nullable: false),
                    Timestamp = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: false),
                    Type = table.Column<string>(type: "nvarchar(64)", maxLength: 64, nullable: false),
                    PayloadJson = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    SchemaVersion = table.Column<int>(type: "int", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_learning_events", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "lesson_progress",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    UserId = table.Column<string>(type: "nvarchar(64)", maxLength: 64, nullable: false),
                    LessonId = table.Column<string>(type: "nvarchar(64)", maxLength: 64, nullable: false),
                    SubjectId = table.Column<string>(type: "nvarchar(64)", maxLength: 64, nullable: false),
                    ContentProgress = table.Column<int>(type: "int", nullable: false),
                    OverallProgress = table.Column<int>(type: "int", nullable: false),
                    AssessmentStatus = table.Column<string>(type: "nvarchar(32)", maxLength: 32, nullable: false, defaultValue: "not-attempted"),
                    AssessmentAttemptId = table.Column<string>(type: "nvarchar(64)", maxLength: 64, nullable: true),
                    AssessmentScore = table.Column<double>(type: "float", nullable: true),
                    CompletedSectionIdsJson = table.Column<string>(type: "nvarchar(max)", nullable: false, defaultValue: "[]"),
                    UpdatedAt = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_lesson_progress", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "staff_audit_logs",
                columns: table => new
                {
                    Id = table.Column<string>(type: "nvarchar(64)", maxLength: 64, nullable: false),
                    ActorUserId = table.Column<string>(type: "nvarchar(64)", maxLength: 64, nullable: false),
                    Action = table.Column<string>(type: "nvarchar(64)", maxLength: 64, nullable: false),
                    TargetType = table.Column<string>(type: "nvarchar(64)", maxLength: 64, nullable: false),
                    TargetId = table.Column<string>(type: "nvarchar(64)", maxLength: 64, nullable: false),
                    Payload = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    CreatedAt = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_staff_audit_logs", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "users",
                columns: table => new
                {
                    Id = table.Column<string>(type: "nvarchar(64)", maxLength: 64, nullable: false),
                    Email = table.Column<string>(type: "nvarchar(255)", maxLength: 255, nullable: true),
                    EmailNormalized = table.Column<string>(type: "nvarchar(255)", maxLength: 255, nullable: true),
                    PasswordHash = table.Column<string>(type: "nvarchar(255)", maxLength: 255, nullable: true),
                    DisplayName = table.Column<string>(type: "nvarchar(128)", maxLength: 128, nullable: true),
                    Grade = table.Column<string>(type: "nvarchar(32)", maxLength: 32, nullable: true),
                    Role = table.Column<string>(type: "nvarchar(32)", maxLength: 32, nullable: false, defaultValue: "learner"),
                    Status = table.Column<string>(type: "nvarchar(32)", maxLength: 32, nullable: false, defaultValue: "active"),
                    LastLoginAt = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: true),
                    CreatedAt = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: false),
                    UpdatedAt = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_users", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "assessment_responses",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    AttemptId = table.Column<string>(type: "nvarchar(64)", maxLength: 64, nullable: false),
                    QuestionId = table.Column<string>(type: "nvarchar(64)", maxLength: 64, nullable: false),
                    SelectedOptionIdsJson = table.Column<string>(type: "nvarchar(max)", nullable: false, defaultValue: "[]"),
                    FirstAnsweredAt = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: true),
                    LastAnsweredAt = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: true),
                    ChangeCount = table.Column<int>(type: "int", nullable: false),
                    TimeSpentMs = table.Column<int>(type: "int", nullable: false),
                    IsCorrect = table.Column<bool>(type: "bit", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_assessment_responses", x => x.Id);
                    table.ForeignKey(
                        name: "FK_assessment_responses_assessment_attempts_AttemptId",
                        column: x => x.AttemptId,
                        principalTable: "assessment_attempts",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "content_chapters",
                columns: table => new
                {
                    Id = table.Column<string>(type: "nvarchar(64)", maxLength: 64, nullable: false),
                    SubjectId = table.Column<string>(type: "nvarchar(64)", maxLength: 64, nullable: false),
                    Title = table.Column<string>(type: "nvarchar(255)", maxLength: 255, nullable: false),
                    OrderIndex = table.Column<int>(type: "int", nullable: false),
                    CreatedAt = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_content_chapters", x => x.Id);
                    table.ForeignKey(
                        name: "FK_content_chapters_content_subjects_SubjectId",
                        column: x => x.SubjectId,
                        principalTable: "content_subjects",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "refresh_sessions",
                columns: table => new
                {
                    Id = table.Column<string>(type: "nvarchar(64)", maxLength: 64, nullable: false),
                    UserId = table.Column<string>(type: "nvarchar(64)", maxLength: 64, nullable: false),
                    TokenHash = table.Column<string>(type: "nvarchar(64)", maxLength: 64, nullable: false),
                    CreatedAt = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: false),
                    ExpiresAt = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: false),
                    RevokedAt = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: true),
                    LastUsedAt = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: true),
                    UserAgent = table.Column<string>(type: "nvarchar(255)", maxLength: 255, nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_refresh_sessions", x => x.Id);
                    table.ForeignKey(
                        name: "FK_refresh_sessions_users_UserId",
                        column: x => x.UserId,
                        principalTable: "users",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "content_lessons",
                columns: table => new
                {
                    Id = table.Column<string>(type: "nvarchar(64)", maxLength: 64, nullable: false),
                    ChapterId = table.Column<string>(type: "nvarchar(64)", maxLength: 64, nullable: false),
                    Title = table.Column<string>(type: "nvarchar(255)", maxLength: 255, nullable: false),
                    Slug = table.Column<string>(type: "nvarchar(128)", maxLength: 128, nullable: false),
                    OrderIndex = table.Column<int>(type: "int", nullable: false),
                    Status = table.Column<string>(type: "nvarchar(32)", maxLength: 32, nullable: false, defaultValue: "draft"),
                    AuthorId = table.Column<string>(type: "nvarchar(64)", maxLength: 64, nullable: false),
                    ReviewedBy = table.Column<string>(type: "nvarchar(64)", maxLength: 64, nullable: true),
                    Introduction = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    DefinitionsJson = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    FormulasJson = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    ExamplesJson = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    ImportantNotesJson = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    SummaryPointsJson = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    CreatedAt = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: false),
                    UpdatedAt = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_content_lessons", x => x.Id);
                    table.ForeignKey(
                        name: "FK_content_lessons_content_chapters_ChapterId",
                        column: x => x.ChapterId,
                        principalTable: "content_chapters",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_content_lessons_users_AuthorId",
                        column: x => x.AuthorId,
                        principalTable: "users",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "content_assessments",
                columns: table => new
                {
                    Id = table.Column<string>(type: "nvarchar(64)", maxLength: 64, nullable: false),
                    LessonId = table.Column<string>(type: "nvarchar(64)", maxLength: 64, nullable: false),
                    Title = table.Column<string>(type: "nvarchar(255)", maxLength: 255, nullable: false),
                    PassScore = table.Column<int>(type: "int", nullable: false),
                    CreatedAt = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_content_assessments", x => x.Id);
                    table.ForeignKey(
                        name: "FK_content_assessments_content_lessons_LessonId",
                        column: x => x.LessonId,
                        principalTable: "content_lessons",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "content_questions",
                columns: table => new
                {
                    Id = table.Column<string>(type: "nvarchar(64)", maxLength: 64, nullable: false),
                    AssessmentId = table.Column<string>(type: "nvarchar(64)", maxLength: 64, nullable: false),
                    Prompt = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    OptionsJson = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    CorrectAnswer = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    Explanation = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    OrderIndex = table.Column<int>(type: "int", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_content_questions", x => x.Id);
                    table.ForeignKey(
                        name: "FK_content_questions_content_assessments_AssessmentId",
                        column: x => x.AssessmentId,
                        principalTable: "content_assessments",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_assessment_attempts_UserId_AssessmentId",
                table: "assessment_attempts",
                columns: new[] { "UserId", "AssessmentId" });

            migrationBuilder.CreateIndex(
                name: "IX_assessment_attempts_UserId_LessonId",
                table: "assessment_attempts",
                columns: new[] { "UserId", "LessonId" });

            migrationBuilder.CreateIndex(
                name: "IX_assessment_responses_AttemptId_QuestionId",
                table: "assessment_responses",
                columns: new[] { "AttemptId", "QuestionId" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_content_assessments_LessonId",
                table: "content_assessments",
                column: "LessonId");

            migrationBuilder.CreateIndex(
                name: "IX_content_chapters_SubjectId",
                table: "content_chapters",
                column: "SubjectId");

            migrationBuilder.CreateIndex(
                name: "IX_content_lessons_AuthorId",
                table: "content_lessons",
                column: "AuthorId");

            migrationBuilder.CreateIndex(
                name: "IX_content_lessons_ChapterId",
                table: "content_lessons",
                column: "ChapterId");

            migrationBuilder.CreateIndex(
                name: "IX_content_lessons_Slug",
                table: "content_lessons",
                column: "Slug");

            migrationBuilder.CreateIndex(
                name: "IX_content_questions_AssessmentId",
                table: "content_questions",
                column: "AssessmentId");

            migrationBuilder.CreateIndex(
                name: "IX_content_subjects_Code",
                table: "content_subjects",
                column: "Code",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_learning_events_UserId_LessonId",
                table: "learning_events",
                columns: new[] { "UserId", "LessonId" });

            migrationBuilder.CreateIndex(
                name: "IX_learning_events_UserId_SubjectId",
                table: "learning_events",
                columns: new[] { "UserId", "SubjectId" });

            migrationBuilder.CreateIndex(
                name: "IX_learning_events_UserId_Timestamp",
                table: "learning_events",
                columns: new[] { "UserId", "Timestamp" });

            migrationBuilder.CreateIndex(
                name: "IX_lesson_progress_UserId_LessonId",
                table: "lesson_progress",
                columns: new[] { "UserId", "LessonId" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_lesson_progress_UserId_SubjectId",
                table: "lesson_progress",
                columns: new[] { "UserId", "SubjectId" });

            migrationBuilder.CreateIndex(
                name: "IX_refresh_sessions_TokenHash",
                table: "refresh_sessions",
                column: "TokenHash");

            migrationBuilder.CreateIndex(
                name: "IX_refresh_sessions_UserId",
                table: "refresh_sessions",
                column: "UserId");

            migrationBuilder.CreateIndex(
                name: "IX_staff_audit_logs_Action",
                table: "staff_audit_logs",
                column: "Action");

            migrationBuilder.CreateIndex(
                name: "IX_staff_audit_logs_ActorUserId",
                table: "staff_audit_logs",
                column: "ActorUserId");

            migrationBuilder.CreateIndex(
                name: "IX_staff_audit_logs_CreatedAt",
                table: "staff_audit_logs",
                column: "CreatedAt");

            migrationBuilder.CreateIndex(
                name: "IX_staff_audit_logs_TargetId",
                table: "staff_audit_logs",
                column: "TargetId");

            migrationBuilder.CreateIndex(
                name: "IX_users_EmailNormalized",
                table: "users",
                column: "EmailNormalized",
                unique: true,
                filter: "[EmailNormalized] IS NOT NULL");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "assessment_responses");

            migrationBuilder.DropTable(
                name: "content_questions");

            migrationBuilder.DropTable(
                name: "learning_events");

            migrationBuilder.DropTable(
                name: "lesson_progress");

            migrationBuilder.DropTable(
                name: "refresh_sessions");

            migrationBuilder.DropTable(
                name: "staff_audit_logs");

            migrationBuilder.DropTable(
                name: "assessment_attempts");

            migrationBuilder.DropTable(
                name: "content_assessments");

            migrationBuilder.DropTable(
                name: "content_lessons");

            migrationBuilder.DropTable(
                name: "content_chapters");

            migrationBuilder.DropTable(
                name: "users");

            migrationBuilder.DropTable(
                name: "content_subjects");
        }
    }
}

using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace StudyAI.Migrations
{
    /// <inheritdoc />
    public partial class AddQuestionMappingAndAssessmentIntegrity : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "ContentFingerprint",
                table: "content_questions",
                type: "nvarchar(128)",
                maxLength: 128,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "QuestionKey",
                table: "content_questions",
                type: "nvarchar(64)",
                maxLength: 64,
                nullable: true);

            migrationBuilder.AddColumn<byte[]>(
                name: "RowVersion",
                table: "content_questions",
                type: "rowversion",
                rowVersion: true,
                nullable: false,
                defaultValue: new byte[0]);

            migrationBuilder.AddColumn<byte[]>(
                name: "RowVersion",
                table: "content_assessments",
                type: "rowversion",
                rowVersion: true,
                nullable: false,
                defaultValue: new byte[0]);

            migrationBuilder.AddColumn<DateTimeOffset>(
                name: "FinalizedAt",
                table: "assessment_attempts",
                type: "datetimeoffset",
                nullable: true);

            migrationBuilder.AddColumn<bool>(
                name: "IsFinalized",
                table: "assessment_attempts",
                type: "bit",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<byte[]>(
                name: "RowVersion",
                table: "assessment_attempts",
                type: "rowversion",
                rowVersion: true,
                nullable: false,
                defaultValue: new byte[0]);

            migrationBuilder.CreateTable(
                name: "assessment_questions",
                columns: table => new
                {
                    Id = table.Column<string>(type: "nvarchar(64)", maxLength: 64, nullable: false),
                    AssessmentId = table.Column<string>(type: "nvarchar(64)", maxLength: 64, nullable: false),
                    QuestionId = table.Column<string>(type: "nvarchar(64)", maxLength: 64, nullable: false),
                    OrderIndex = table.Column<int>(type: "int", nullable: false, defaultValue: 1),
                    PinnedVersion = table.Column<int>(type: "int", nullable: false, defaultValue: 1),
                    PinnedFingerprint = table.Column<string>(type: "nvarchar(128)", maxLength: 128, nullable: true),
                    Points = table.Column<int>(type: "int", nullable: false, defaultValue: 1),
                    CreatedAt = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_assessment_questions", x => x.Id);
                    table.ForeignKey(
                        name: "FK_assessment_questions_content_assessments_AssessmentId",
                        column: x => x.AssessmentId,
                        principalTable: "content_assessments",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_assessment_questions_content_questions_QuestionId",
                        column: x => x.QuestionId,
                        principalTable: "content_questions",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateIndex(
                name: "IX_content_questions_QuestionKey",
                table: "content_questions",
                column: "QuestionKey",
                unique: true,
                filter: "[QuestionKey] IS NOT NULL");

            migrationBuilder.CreateIndex(
                name: "IX_content_questions_SubjectId_ContentFingerprint_IsDeleted",
                table: "content_questions",
                columns: new[] { "SubjectId", "ContentFingerprint", "IsDeleted" });

            migrationBuilder.CreateIndex(
                name: "IX_assessment_questions_AssessmentId_OrderIndex",
                table: "assessment_questions",
                columns: new[] { "AssessmentId", "OrderIndex" });

            migrationBuilder.CreateIndex(
                name: "IX_assessment_questions_AssessmentId_QuestionId",
                table: "assessment_questions",
                columns: new[] { "AssessmentId", "QuestionId" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_assessment_questions_QuestionId",
                table: "assessment_questions",
                column: "QuestionId");

            migrationBuilder.Sql("""
                UPDATE content_questions
                SET QuestionKey = LEFT(CONCAT('qkey_', Id), 64)
                WHERE QuestionKey IS NULL;

                UPDATE assessment_attempts
                SET IsFinalized = 1,
                    FinalizedAt = COALESCE(CompletedAt, LastActivityAt)
                WHERE CompletionStatus = 'completed' AND IsFinalized = 0;

                INSERT INTO assessment_questions (Id, AssessmentId, QuestionId, OrderIndex, PinnedVersion, PinnedFingerprint, Points, CreatedAt)
                SELECT LEFT(CONCAT('aq_', q.Id), 64), q.AssessmentId, q.Id, q.OrderIndex, q.Version, q.ContentFingerprint, 1, q.CreatedAt
                FROM content_questions q
                INNER JOIN content_assessments a ON a.Id = q.AssessmentId
                WHERE q.AssessmentId IS NOT NULL AND q.IsDeleted = 0
                  AND NOT EXISTS (SELECT 1 FROM assessment_questions aq WHERE aq.AssessmentId = q.AssessmentId AND aq.QuestionId = q.Id);
                """);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "assessment_questions");

            migrationBuilder.DropIndex(
                name: "IX_content_questions_QuestionKey",
                table: "content_questions");

            migrationBuilder.DropIndex(
                name: "IX_content_questions_SubjectId_ContentFingerprint_IsDeleted",
                table: "content_questions");

            migrationBuilder.DropColumn(
                name: "ContentFingerprint",
                table: "content_questions");

            migrationBuilder.DropColumn(
                name: "QuestionKey",
                table: "content_questions");

            migrationBuilder.DropColumn(
                name: "RowVersion",
                table: "content_questions");

            migrationBuilder.DropColumn(
                name: "RowVersion",
                table: "content_assessments");

            migrationBuilder.DropColumn(
                name: "FinalizedAt",
                table: "assessment_attempts");

            migrationBuilder.DropColumn(
                name: "IsFinalized",
                table: "assessment_attempts");

            migrationBuilder.DropColumn(
                name: "RowVersion",
                table: "assessment_attempts");
        }
    }
}

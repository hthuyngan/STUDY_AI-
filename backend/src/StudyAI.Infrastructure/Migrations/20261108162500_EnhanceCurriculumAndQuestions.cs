using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace StudyAI.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class EnhanceCurriculumAndQuestions : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            // 1. content_subjects
            migrationBuilder.AddColumn<int>(
                name: "OrderIndex",
                table: "content_subjects",
                type: "int",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.AddColumn<DateTimeOffset>(
                name: "UpdatedAt",
                table: "content_subjects",
                type: "datetimeoffset",
                nullable: false,
                defaultValueSql: "SYSDATETIMEOFFSET()");

            // 2. content_chapters
            migrationBuilder.AddColumn<string>(
                name: "Description",
                table: "content_chapters",
                type: "nvarchar(max)",
                nullable: true);

            migrationBuilder.AddColumn<bool>(
                name: "IsActive",
                table: "content_chapters",
                type: "bit",
                nullable: false,
                defaultValue: true);

            migrationBuilder.AddColumn<DateTimeOffset>(
                name: "UpdatedAt",
                table: "content_chapters",
                type: "datetimeoffset",
                nullable: false,
                defaultValueSql: "SYSDATETIMEOFFSET()");

            // 3. content_questions
            migrationBuilder.AlterColumn<string>(
                name: "AssessmentId",
                table: "content_questions",
                type: "nvarchar(64)",
                maxLength: 64,
                nullable: true,
                oldClrType: typeof(string),
                oldType: "nvarchar(64)",
                oldMaxLength: 64);

            migrationBuilder.AddColumn<string>(
                name: "LessonId",
                table: "content_questions",
                type: "nvarchar(64)",
                maxLength: 64,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "SubjectId",
                table: "content_questions",
                type: "nvarchar(64)",
                maxLength: 64,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "ChapterId",
                table: "content_questions",
                type: "nvarchar(64)",
                maxLength: 64,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "Topic",
                table: "content_questions",
                type: "nvarchar(128)",
                maxLength: 128,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "Difficulty",
                table: "content_questions",
                type: "nvarchar(32)",
                maxLength: 32,
                nullable: false,
                defaultValue: "medium");

            migrationBuilder.AddColumn<string>(
                name: "Type",
                table: "content_questions",
                type: "nvarchar(32)",
                maxLength: 32,
                nullable: false,
                defaultValue: "multiple-choice");

            migrationBuilder.AddColumn<string>(
                name: "Status",
                table: "content_questions",
                type: "nvarchar(32)",
                maxLength: 32,
                nullable: false,
                defaultValue: "published");

            migrationBuilder.AddColumn<DateTimeOffset>(
                name: "CreatedAt",
                table: "content_questions",
                type: "datetimeoffset",
                nullable: false,
                defaultValueSql: "SYSDATETIMEOFFSET()");

            migrationBuilder.AddColumn<DateTimeOffset>(
                name: "UpdatedAt",
                table: "content_questions",
                type: "datetimeoffset",
                nullable: false,
                defaultValueSql: "SYSDATETIMEOFFSET()");

            migrationBuilder.CreateIndex(
                name: "IX_content_questions_LessonId",
                table: "content_questions",
                column: "LessonId");

            migrationBuilder.CreateIndex(
                name: "IX_content_questions_SubjectId",
                table: "content_questions",
                column: "SubjectId");

            migrationBuilder.CreateIndex(
                name: "IX_content_questions_ChapterId",
                table: "content_questions",
                column: "ChapterId");

            migrationBuilder.CreateIndex(
                name: "IX_content_questions_Status",
                table: "content_questions",
                column: "Status");

            migrationBuilder.AddForeignKey(
                name: "FK_content_questions_content_lessons_LessonId",
                table: "content_questions",
                column: "LessonId",
                principalTable: "content_lessons",
                principalColumn: "Id",
                onDelete: ReferentialAction.NoAction);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_content_questions_content_lessons_LessonId",
                table: "content_questions");

            migrationBuilder.DropIndex(
                name: "IX_content_questions_LessonId",
                table: "content_questions");

            migrationBuilder.DropIndex(
                name: "IX_content_questions_SubjectId",
                table: "content_questions");

            migrationBuilder.DropIndex(
                name: "IX_content_questions_ChapterId",
                table: "content_questions");

            migrationBuilder.DropIndex(
                name: "IX_content_questions_Status",
                table: "content_questions");

            migrationBuilder.DropColumn(
                name: "LessonId",
                table: "content_questions");

            migrationBuilder.DropColumn(
                name: "SubjectId",
                table: "content_questions");

            migrationBuilder.DropColumn(
                name: "ChapterId",
                table: "content_questions");

            migrationBuilder.DropColumn(
                name: "Topic",
                table: "content_questions");

            migrationBuilder.DropColumn(
                name: "Difficulty",
                table: "content_questions");

            migrationBuilder.DropColumn(
                name: "Type",
                table: "content_questions");

            migrationBuilder.DropColumn(
                name: "Status",
                table: "content_questions");

            migrationBuilder.DropColumn(
                name: "CreatedAt",
                table: "content_questions");

            migrationBuilder.DropColumn(
                name: "UpdatedAt",
                table: "content_questions");

            migrationBuilder.AlterColumn<string>(
                name: "AssessmentId",
                table: "content_questions",
                type: "nvarchar(64)",
                maxLength: 64,
                nullable: false,
                defaultValue: "",
                oldClrType: typeof(string),
                oldType: "nvarchar(64)",
                oldMaxLength: 64,
                oldNullable: true);

            migrationBuilder.DropColumn(
                name: "Description",
                table: "content_chapters");

            migrationBuilder.DropColumn(
                name: "IsActive",
                table: "content_chapters");

            migrationBuilder.DropColumn(
                name: "UpdatedAt",
                table: "content_chapters");

            migrationBuilder.DropColumn(
                name: "OrderIndex",
                table: "content_subjects");

            migrationBuilder.DropColumn(
                name: "UpdatedAt",
                table: "content_subjects");
        }
    }
}

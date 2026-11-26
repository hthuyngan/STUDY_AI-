using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace StudyAI.Migrations
{
    /// <inheritdoc />
    public partial class AddGeneralizedLessonResources : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<DateTimeOffset>(
                name: "ArchivedAt",
                table: "content_lesson_videos",
                type: "datetimeoffset",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "ArchivedBy",
                table: "content_lesson_videos",
                type: "nvarchar(64)",
                maxLength: 64,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "Checksum",
                table: "content_lesson_videos",
                type: "nvarchar(128)",
                maxLength: 128,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "CreatedBy",
                table: "content_lesson_videos",
                type: "nvarchar(64)",
                maxLength: 64,
                nullable: true);

            migrationBuilder.AddColumn<bool>(
                name: "IsArchived",
                table: "content_lesson_videos",
                type: "bit",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<string>(
                name: "MimeType",
                table: "content_lesson_videos",
                type: "nvarchar(128)",
                maxLength: 128,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "RejectionReason",
                table: "content_lesson_videos",
                type: "nvarchar(1000)",
                maxLength: 1000,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "ResourceType",
                table: "content_lesson_videos",
                type: "nvarchar(32)",
                maxLength: 32,
                nullable: false,
                defaultValue: "video");

            migrationBuilder.AddColumn<DateTimeOffset>(
                name: "ReviewedAt",
                table: "content_lesson_videos",
                type: "datetimeoffset",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "ReviewedBy",
                table: "content_lesson_videos",
                type: "nvarchar(64)",
                maxLength: 64,
                nullable: true);

            migrationBuilder.AddColumn<byte[]>(
                name: "RowVersion",
                table: "content_lesson_videos",
                type: "rowversion",
                rowVersion: true,
                nullable: false,
                defaultValue: new byte[0]);

            migrationBuilder.AddColumn<string>(
                name: "SourceLicense",
                table: "content_lesson_videos",
                type: "nvarchar(255)",
                maxLength: 255,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "SourceName",
                table: "content_lesson_videos",
                type: "nvarchar(255)",
                maxLength: 255,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "Status",
                table: "content_lesson_videos",
                type: "nvarchar(32)",
                maxLength: 32,
                nullable: false,
                defaultValue: "draft");

            migrationBuilder.AddColumn<string>(
                name: "StorageKey",
                table: "content_lesson_videos",
                type: "nvarchar(500)",
                maxLength: 500,
                nullable: true);

            migrationBuilder.CreateIndex(
                name: "IX_content_lesson_videos_LessonId_IsArchived_SortOrder",
                table: "content_lesson_videos",
                columns: new[] { "LessonId", "IsArchived", "SortOrder" });

            migrationBuilder.CreateIndex(
                name: "IX_content_lesson_videos_LessonId_ResourceType_Status",
                table: "content_lesson_videos",
                columns: new[] { "LessonId", "ResourceType", "Status" });

            migrationBuilder.Sql("""
                UPDATE content_lesson_videos
                SET ResourceType = 'video',
                    Status = CASE
                        WHEN IsPublished = 1 AND VerificationStatus = 'verified' THEN 'published'
                        WHEN VerificationStatus = 'verified' THEN 'verified'
                        WHEN VerificationStatus = 'rejected' THEN 'rejected'
                        ELSE 'draft'
                    END;
                """);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_content_lesson_videos_LessonId_IsArchived_SortOrder",
                table: "content_lesson_videos");

            migrationBuilder.DropIndex(
                name: "IX_content_lesson_videos_LessonId_ResourceType_Status",
                table: "content_lesson_videos");

            migrationBuilder.DropColumn(
                name: "ArchivedAt",
                table: "content_lesson_videos");

            migrationBuilder.DropColumn(
                name: "ArchivedBy",
                table: "content_lesson_videos");

            migrationBuilder.DropColumn(
                name: "Checksum",
                table: "content_lesson_videos");

            migrationBuilder.DropColumn(
                name: "CreatedBy",
                table: "content_lesson_videos");

            migrationBuilder.DropColumn(
                name: "IsArchived",
                table: "content_lesson_videos");

            migrationBuilder.DropColumn(
                name: "MimeType",
                table: "content_lesson_videos");

            migrationBuilder.DropColumn(
                name: "RejectionReason",
                table: "content_lesson_videos");

            migrationBuilder.DropColumn(
                name: "ResourceType",
                table: "content_lesson_videos");

            migrationBuilder.DropColumn(
                name: "ReviewedAt",
                table: "content_lesson_videos");

            migrationBuilder.DropColumn(
                name: "ReviewedBy",
                table: "content_lesson_videos");

            migrationBuilder.DropColumn(
                name: "RowVersion",
                table: "content_lesson_videos");

            migrationBuilder.DropColumn(
                name: "SourceLicense",
                table: "content_lesson_videos");

            migrationBuilder.DropColumn(
                name: "SourceName",
                table: "content_lesson_videos");

            migrationBuilder.DropColumn(
                name: "Status",
                table: "content_lesson_videos");

            migrationBuilder.DropColumn(
                name: "StorageKey",
                table: "content_lesson_videos");
        }
    }
}

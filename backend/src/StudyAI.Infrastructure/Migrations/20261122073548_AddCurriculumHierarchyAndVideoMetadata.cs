using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace StudyAI.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class AddCurriculumHierarchyAndVideoMetadata : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "SourceLicense",
                table: "content_lessons",
                type: "nvarchar(255)",
                maxLength: 255,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "SourceName",
                table: "content_lessons",
                type: "nvarchar(255)",
                maxLength: 255,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "SourceUrl",
                table: "content_lessons",
                type: "nvarchar(500)",
                maxLength: 500,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "AttributionText",
                table: "content_lesson_videos",
                type: "nvarchar(500)",
                maxLength: 500,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "ChannelName",
                table: "content_lesson_videos",
                type: "nvarchar(255)",
                maxLength: 255,
                nullable: true);

            migrationBuilder.AddColumn<bool>(
                name: "IsPrimary",
                table: "content_lesson_videos",
                type: "bit",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<DateTimeOffset>(
                name: "LastVerifiedAt",
                table: "content_lesson_videos",
                type: "datetimeoffset",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "SourceName",
                table: "content_chapters",
                type: "nvarchar(255)",
                maxLength: 255,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "SourceUrl",
                table: "content_chapters",
                type: "nvarchar(500)",
                maxLength: 500,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "Status",
                table: "content_chapters",
                type: "nvarchar(32)",
                maxLength: 32,
                nullable: false,
                defaultValue: "published");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "SourceLicense",
                table: "content_lessons");

            migrationBuilder.DropColumn(
                name: "SourceName",
                table: "content_lessons");

            migrationBuilder.DropColumn(
                name: "SourceUrl",
                table: "content_lessons");

            migrationBuilder.DropColumn(
                name: "AttributionText",
                table: "content_lesson_videos");

            migrationBuilder.DropColumn(
                name: "ChannelName",
                table: "content_lesson_videos");

            migrationBuilder.DropColumn(
                name: "IsPrimary",
                table: "content_lesson_videos");

            migrationBuilder.DropColumn(
                name: "LastVerifiedAt",
                table: "content_lesson_videos");

            migrationBuilder.DropColumn(
                name: "SourceName",
                table: "content_chapters");

            migrationBuilder.DropColumn(
                name: "SourceUrl",
                table: "content_chapters");

            migrationBuilder.DropColumn(
                name: "Status",
                table: "content_chapters");
        }
    }
}

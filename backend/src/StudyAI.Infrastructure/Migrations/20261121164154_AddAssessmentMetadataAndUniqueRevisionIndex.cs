using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace StudyAI.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class AddAssessmentMetadataAndUniqueRevisionIndex : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_content_revisions_ContentId_Version",
                table: "content_revisions");

            migrationBuilder.AddColumn<int>(
                name: "DurationMinutes",
                table: "content_assessments",
                type: "int",
                nullable: false,
                defaultValue: 15);

            migrationBuilder.AddColumn<string>(
                name: "Status",
                table: "content_assessments",
                type: "nvarchar(32)",
                maxLength: 32,
                nullable: false,
                defaultValue: "draft");

            migrationBuilder.AddColumn<DateTimeOffset>(
                name: "UpdatedAt",
                table: "content_assessments",
                type: "datetimeoffset",
                nullable: false,
                defaultValue: new DateTimeOffset(new DateTime(1, 1, 1, 0, 0, 0, 0, DateTimeKind.Unspecified), new TimeSpan(0, 0, 0, 0, 0)));

            // Existing deployments used a non-unique index and may contain duplicate
            // version numbers. Re-number deterministically before enforcing uniqueness.
            migrationBuilder.Sql("""
                WITH ranked AS
                (
                    SELECT Id,
                           ROW_NUMBER() OVER (
                               PARTITION BY ContentId
                               ORDER BY CreatedAt, Id
                           ) AS NewVersion
                    FROM content_revisions
                )
                UPDATE revisions
                SET Version = ranked.NewVersion
                FROM content_revisions AS revisions
                INNER JOIN ranked ON ranked.Id = revisions.Id;
                """);

            migrationBuilder.CreateIndex(
                name: "IX_content_revisions_ContentId_Version",
                table: "content_revisions",
                columns: new[] { "ContentId", "Version" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_content_assessments_Status",
                table: "content_assessments",
                column: "Status");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_content_revisions_ContentId_Version",
                table: "content_revisions");

            migrationBuilder.DropIndex(
                name: "IX_content_assessments_Status",
                table: "content_assessments");

            migrationBuilder.DropColumn(
                name: "DurationMinutes",
                table: "content_assessments");

            migrationBuilder.DropColumn(
                name: "Status",
                table: "content_assessments");

            migrationBuilder.DropColumn(
                name: "UpdatedAt",
                table: "content_assessments");

            migrationBuilder.CreateIndex(
                name: "IX_content_revisions_ContentId_Version",
                table: "content_revisions",
                columns: new[] { "ContentId", "Version" });
        }
    }
}

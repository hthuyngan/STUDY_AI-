using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace StudyAI.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class AddContentQuestionBankEnhancements : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "AuthorId",
                table: "content_questions",
                type: "nvarchar(64)",
                maxLength: 64,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "Code",
                table: "content_questions",
                type: "nvarchar(64)",
                maxLength: 64,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "CopyrightProofRef",
                table: "content_questions",
                type: "nvarchar(255)",
                maxLength: 255,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "CopyrightStatus",
                table: "content_questions",
                type: "nvarchar(64)",
                maxLength: 64,
                nullable: false,
                defaultValue: "proprietary");

            migrationBuilder.AddColumn<DateTimeOffset>(
                name: "DeletedAt",
                table: "content_questions",
                type: "datetimeoffset",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "DeletedBy",
                table: "content_questions",
                type: "nvarchar(64)",
                maxLength: 64,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "Grade",
                table: "content_questions",
                type: "nvarchar(32)",
                maxLength: 32,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "ImageUrl",
                table: "content_questions",
                type: "nvarchar(1000)",
                maxLength: 1000,
                nullable: true);

            migrationBuilder.AddColumn<bool>(
                name: "IsDeleted",
                table: "content_questions",
                type: "bit",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<string>(
                name: "MetadataJson",
                table: "content_questions",
                type: "nvarchar(max)",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "RejectionReason",
                table: "content_questions",
                type: "nvarchar(500)",
                maxLength: 500,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "ReviewedBy",
                table: "content_questions",
                type: "nvarchar(64)",
                maxLength: 64,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "SourceBatchId",
                table: "content_questions",
                type: "nvarchar(64)",
                maxLength: 64,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "SourceType",
                table: "content_questions",
                type: "nvarchar(64)",
                maxLength: 64,
                nullable: false,
                defaultValue: "manual");

            migrationBuilder.AddColumn<string>(
                name: "SourceUrl",
                table: "content_questions",
                type: "nvarchar(1000)",
                maxLength: 1000,
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "Version",
                table: "content_questions",
                type: "int",
                nullable: false,
                defaultValue: 1);

            migrationBuilder.CreateIndex(
                name: "IX_content_questions_AuthorId",
                table: "content_questions",
                column: "AuthorId");

            migrationBuilder.CreateIndex(
                name: "IX_content_questions_Code",
                table: "content_questions",
                column: "Code");

            migrationBuilder.CreateIndex(
                name: "IX_content_questions_IsDeleted",
                table: "content_questions",
                column: "IsDeleted");

            migrationBuilder.CreateIndex(
                name: "IX_content_questions_SourceType",
                table: "content_questions",
                column: "SourceType");

            migrationBuilder.AddForeignKey(
                name: "FK_content_questions_users_AuthorId",
                table: "content_questions",
                column: "AuthorId",
                principalTable: "users",
                principalColumn: "Id");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_content_questions_users_AuthorId",
                table: "content_questions");

            migrationBuilder.DropIndex(
                name: "IX_content_questions_AuthorId",
                table: "content_questions");

            migrationBuilder.DropIndex(
                name: "IX_content_questions_Code",
                table: "content_questions");

            migrationBuilder.DropIndex(
                name: "IX_content_questions_IsDeleted",
                table: "content_questions");

            migrationBuilder.DropIndex(
                name: "IX_content_questions_SourceType",
                table: "content_questions");

            migrationBuilder.DropColumn(
                name: "AuthorId",
                table: "content_questions");

            migrationBuilder.DropColumn(
                name: "Code",
                table: "content_questions");

            migrationBuilder.DropColumn(
                name: "CopyrightProofRef",
                table: "content_questions");

            migrationBuilder.DropColumn(
                name: "CopyrightStatus",
                table: "content_questions");

            migrationBuilder.DropColumn(
                name: "DeletedAt",
                table: "content_questions");

            migrationBuilder.DropColumn(
                name: "DeletedBy",
                table: "content_questions");

            migrationBuilder.DropColumn(
                name: "Grade",
                table: "content_questions");

            migrationBuilder.DropColumn(
                name: "ImageUrl",
                table: "content_questions");

            migrationBuilder.DropColumn(
                name: "IsDeleted",
                table: "content_questions");

            migrationBuilder.DropColumn(
                name: "MetadataJson",
                table: "content_questions");

            migrationBuilder.DropColumn(
                name: "RejectionReason",
                table: "content_questions");

            migrationBuilder.DropColumn(
                name: "ReviewedBy",
                table: "content_questions");

            migrationBuilder.DropColumn(
                name: "SourceBatchId",
                table: "content_questions");

            migrationBuilder.DropColumn(
                name: "SourceType",
                table: "content_questions");

            migrationBuilder.DropColumn(
                name: "SourceUrl",
                table: "content_questions");

            migrationBuilder.DropColumn(
                name: "Version",
                table: "content_questions");
        }
    }
}

using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace StudyAI.Migrations
{
    /// <inheritdoc />
    public partial class AddCurriculumLifecycleChaptersLessons : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "Code",
                table: "content_lessons",
                type: "nvarchar(64)",
                maxLength: 64,
                nullable: true);

            migrationBuilder.AddColumn<byte[]>(
                name: "RowVersion",
                table: "content_lessons",
                type: "rowversion",
                rowVersion: true,
                nullable: false,
                defaultValue: new byte[0]);

            migrationBuilder.AlterColumn<string>(
                name: "SubjectId",
                table: "content_chapters",
                type: "nvarchar(64)",
                maxLength: 64,
                nullable: true,
                oldClrType: typeof(string),
                oldType: "nvarchar(64)",
                oldMaxLength: 64);

            migrationBuilder.AddColumn<string>(
                name: "Code",
                table: "content_chapters",
                type: "nvarchar(64)",
                maxLength: 64,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "CurriculumEditionId",
                table: "content_chapters",
                type: "nvarchar(64)",
                maxLength: 64,
                nullable: true);

            migrationBuilder.AddColumn<byte[]>(
                name: "RowVersion",
                table: "content_chapters",
                type: "rowversion",
                rowVersion: true,
                nullable: false,
                defaultValue: new byte[0]);

            migrationBuilder.CreateIndex(
                name: "IX_content_lessons_ChapterId_Code",
                table: "content_lessons",
                columns: new[] { "ChapterId", "Code" },
                unique: true,
                filter: "[Code] IS NOT NULL AND [Status] <> 'archived'");

            migrationBuilder.CreateIndex(
                name: "IX_content_lessons_ChapterId_Slug",
                table: "content_lessons",
                columns: new[] { "ChapterId", "Slug" },
                unique: true,
                filter: "[Status] <> 'archived'");

            migrationBuilder.CreateIndex(
                name: "IX_content_chapters_CurriculumEditionId",
                table: "content_chapters",
                column: "CurriculumEditionId");

            migrationBuilder.CreateIndex(
                name: "IX_content_chapters_CurriculumEditionId_Code",
                table: "content_chapters",
                columns: new[] { "CurriculumEditionId", "Code" },
                unique: true,
                filter: "[CurriculumEditionId] IS NOT NULL AND [Code] IS NOT NULL AND [Status] <> 'archived'");

            migrationBuilder.AddForeignKey(
                name: "FK_content_chapters_curriculum_editions_CurriculumEditionId",
                table: "content_chapters",
                column: "CurriculumEditionId",
                principalTable: "curriculum_editions",
                principalColumn: "Id",
                onDelete: ReferentialAction.Restrict);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql(@"
                IF EXISTS (SELECT 1 FROM [content_chapters] WHERE [SubjectId] IS NULL)
                BEGIN
                    THROW 50001, 'Cannot rollback AddCurriculumLifecycleChaptersLessons while canonical content_chapters rows with NULL SubjectId exist. Archive/remap or restore from pre-migration backup instead.', 1;
                END");

            migrationBuilder.DropForeignKey(
                name: "FK_content_chapters_curriculum_editions_CurriculumEditionId",
                table: "content_chapters");

            migrationBuilder.DropIndex(
                name: "IX_content_lessons_ChapterId_Code",
                table: "content_lessons");

            migrationBuilder.DropIndex(
                name: "IX_content_lessons_ChapterId_Slug",
                table: "content_lessons");

            migrationBuilder.DropIndex(
                name: "IX_content_chapters_CurriculumEditionId",
                table: "content_chapters");

            migrationBuilder.DropIndex(
                name: "IX_content_chapters_CurriculumEditionId_Code",
                table: "content_chapters");

            migrationBuilder.DropColumn(
                name: "Code",
                table: "content_lessons");

            migrationBuilder.DropColumn(
                name: "RowVersion",
                table: "content_lessons");

            migrationBuilder.DropColumn(
                name: "Code",
                table: "content_chapters");

            migrationBuilder.DropColumn(
                name: "CurriculumEditionId",
                table: "content_chapters");

            migrationBuilder.DropColumn(
                name: "RowVersion",
                table: "content_chapters");

            migrationBuilder.AlterColumn<string>(
                name: "SubjectId",
                table: "content_chapters",
                type: "nvarchar(64)",
                maxLength: 64,
                nullable: false,
                defaultValue: "",
                oldClrType: typeof(string),
                oldType: "nvarchar(64)",
                oldMaxLength: 64,
                oldNullable: true);
        }
    }
}

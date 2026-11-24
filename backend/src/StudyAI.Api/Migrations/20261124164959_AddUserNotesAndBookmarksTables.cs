using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace StudyAI.Migrations
{
    /// <inheritdoc />
    public partial class AddUserNotesAndBookmarksTables : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "user_section_bookmarks",
                columns: table => new
                {
                    Id = table.Column<string>(type: "nvarchar(128)", maxLength: 128, nullable: false),
                    UserId = table.Column<string>(type: "nvarchar(64)", maxLength: 64, nullable: false),
                    LessonId = table.Column<string>(type: "nvarchar(64)", maxLength: 64, nullable: false),
                    SubjectId = table.Column<string>(type: "nvarchar(64)", maxLength: 64, nullable: true),
                    LessonTitle = table.Column<string>(type: "nvarchar(256)", maxLength: 256, nullable: true),
                    SubjectName = table.Column<string>(type: "nvarchar(256)", maxLength: 256, nullable: true),
                    SectionId = table.Column<string>(type: "nvarchar(64)", maxLength: 64, nullable: false),
                    SectionTitle = table.Column<string>(type: "nvarchar(256)", maxLength: 256, nullable: true),
                    CreatedAt = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_user_section_bookmarks", x => x.Id);
                    table.ForeignKey(
                        name: "FK_user_section_bookmarks_content_lessons_LessonId",
                        column: x => x.LessonId,
                        principalTable: "content_lessons",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_user_section_bookmarks_users_UserId",
                        column: x => x.UserId,
                        principalTable: "users",
                        principalColumn: "Id");
                });

            migrationBuilder.CreateTable(
                name: "user_study_notes",
                columns: table => new
                {
                    Id = table.Column<string>(type: "nvarchar(64)", maxLength: 64, nullable: false),
                    UserId = table.Column<string>(type: "nvarchar(64)", maxLength: 64, nullable: false),
                    LessonId = table.Column<string>(type: "nvarchar(64)", maxLength: 64, nullable: false),
                    SubjectId = table.Column<string>(type: "nvarchar(64)", maxLength: 64, nullable: true),
                    LessonTitle = table.Column<string>(type: "nvarchar(256)", maxLength: 256, nullable: true),
                    SubjectName = table.Column<string>(type: "nvarchar(256)", maxLength: 256, nullable: true),
                    SectionId = table.Column<string>(type: "nvarchar(64)", maxLength: 64, nullable: true),
                    SectionTitle = table.Column<string>(type: "nvarchar(256)", maxLength: 256, nullable: true),
                    Content = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    CreatedAt = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: false),
                    UpdatedAt = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_user_study_notes", x => x.Id);
                    table.ForeignKey(
                        name: "FK_user_study_notes_content_lessons_LessonId",
                        column: x => x.LessonId,
                        principalTable: "content_lessons",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_user_study_notes_users_UserId",
                        column: x => x.UserId,
                        principalTable: "users",
                        principalColumn: "Id");
                });

            migrationBuilder.CreateIndex(
                name: "IX_user_section_bookmarks_LessonId",
                table: "user_section_bookmarks",
                column: "LessonId");

            migrationBuilder.CreateIndex(
                name: "IX_user_section_bookmarks_UserId_LessonId_SectionId",
                table: "user_section_bookmarks",
                columns: new[] { "UserId", "LessonId", "SectionId" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_user_study_notes_LessonId",
                table: "user_study_notes",
                column: "LessonId");

            migrationBuilder.CreateIndex(
                name: "IX_user_study_notes_UserId_LessonId",
                table: "user_study_notes",
                columns: new[] { "UserId", "LessonId" });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "user_section_bookmarks");

            migrationBuilder.DropTable(
                name: "user_study_notes");
        }
    }
}

using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace StudyAI.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class AddTeacherProfiles : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_ai_hint_usage_users_UserId",
                table: "ai_hint_usage");

            migrationBuilder.DropForeignKey(
                name: "FK_ai_learning_recommendations_users_UserId",
                table: "ai_learning_recommendations");

            migrationBuilder.DropForeignKey(
                name: "FK_content_lessons_content_topics_TopicId",
                table: "content_lessons");

            migrationBuilder.DropForeignKey(
                name: "FK_student_topic_mastery_users_UserId",
                table: "student_topic_mastery");

            migrationBuilder.CreateTable(
                name: "TeacherProfiles",
                columns: table => new
                {
                    Id = table.Column<string>(type: "nvarchar(450)", nullable: false),
                    TeacherId = table.Column<string>(type: "nvarchar(64)", nullable: false),
                    Phone = table.Column<string>(type: "nvarchar(32)", maxLength: 32, nullable: true),
                    Qualifications = table.Column<string>(type: "nvarchar(256)", maxLength: 256, nullable: true),
                    ExperienceYears = table.Column<int>(type: "int", nullable: false),
                    Bio = table.Column<string>(type: "nvarchar(2000)", maxLength: 2000, nullable: true),
                    CreatedAt = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: false),
                    UpdatedAt = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_TeacherProfiles", x => x.Id);
                    table.ForeignKey(
                        name: "FK_TeacherProfiles_users_TeacherId",
                        column: x => x.TeacherId,
                        principalTable: "users",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_TeacherProfiles_TeacherId",
                table: "TeacherProfiles",
                column: "TeacherId",
                unique: true);

            migrationBuilder.AddForeignKey(
                name: "FK_ai_hint_usage_users_UserId",
                table: "ai_hint_usage",
                column: "UserId",
                principalTable: "users",
                principalColumn: "Id");

            migrationBuilder.AddForeignKey(
                name: "FK_ai_learning_recommendations_users_UserId",
                table: "ai_learning_recommendations",
                column: "UserId",
                principalTable: "users",
                principalColumn: "Id");

            migrationBuilder.AddForeignKey(
                name: "FK_content_lessons_content_topics_TopicId",
                table: "content_lessons",
                column: "TopicId",
                principalTable: "content_topics",
                principalColumn: "Id");

            migrationBuilder.AddForeignKey(
                name: "FK_student_topic_mastery_users_UserId",
                table: "student_topic_mastery",
                column: "UserId",
                principalTable: "users",
                principalColumn: "Id");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_ai_hint_usage_users_UserId",
                table: "ai_hint_usage");

            migrationBuilder.DropForeignKey(
                name: "FK_ai_learning_recommendations_users_UserId",
                table: "ai_learning_recommendations");

            migrationBuilder.DropForeignKey(
                name: "FK_content_lessons_content_topics_TopicId",
                table: "content_lessons");

            migrationBuilder.DropForeignKey(
                name: "FK_student_topic_mastery_users_UserId",
                table: "student_topic_mastery");

            migrationBuilder.DropTable(
                name: "TeacherProfiles");

            migrationBuilder.AddForeignKey(
                name: "FK_ai_hint_usage_users_UserId",
                table: "ai_hint_usage",
                column: "UserId",
                principalTable: "users",
                principalColumn: "Id",
                onDelete: ReferentialAction.Cascade);

            migrationBuilder.AddForeignKey(
                name: "FK_ai_learning_recommendations_users_UserId",
                table: "ai_learning_recommendations",
                column: "UserId",
                principalTable: "users",
                principalColumn: "Id",
                onDelete: ReferentialAction.Cascade);

            migrationBuilder.AddForeignKey(
                name: "FK_content_lessons_content_topics_TopicId",
                table: "content_lessons",
                column: "TopicId",
                principalTable: "content_topics",
                principalColumn: "Id",
                onDelete: ReferentialAction.SetNull);

            migrationBuilder.AddForeignKey(
                name: "FK_student_topic_mastery_users_UserId",
                table: "student_topic_mastery",
                column: "UserId",
                principalTable: "users",
                principalColumn: "Id",
                onDelete: ReferentialAction.Cascade);
        }
    }
}

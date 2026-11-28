using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace StudyAI.Migrations
{
    /// <inheritdoc />
    public partial class AddRound06IntegrityAndStorage : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "LinkedAssignmentId",
                table: "teacher_exams",
                type: "nvarchar(64)",
                maxLength: 64,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "ExtractedText",
                table: "content_materials",
                type: "nvarchar(max)",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "FileHashSha256",
                table: "classroom_materials",
                type: "nvarchar(64)",
                maxLength: 64,
                nullable: true);

            migrationBuilder.AddColumn<bool>(
                name: "IsMistakeResolved",
                table: "assessment_responses",
                type: "bit",
                nullable: false,
                defaultValue: false);

            migrationBuilder.CreateIndex(
                name: "IX_teacher_exams_ClassroomId",
                table: "teacher_exams",
                column: "ClassroomId");

            migrationBuilder.CreateIndex(
                name: "IX_teacher_exams_LinkedAssignmentId",
                table: "teacher_exams",
                column: "LinkedAssignmentId");

            migrationBuilder.CreateIndex(
                name: "IX_teacher_exams_SourceAssessmentId",
                table: "teacher_exams",
                column: "SourceAssessmentId");

            migrationBuilder.CreateIndex(
                name: "IX_classroom_materials_ClassroomId",
                table: "classroom_materials",
                column: "ClassroomId");

            migrationBuilder.CreateIndex(
                name: "IX_classroom_announcements_ClassroomId",
                table: "classroom_announcements",
                column: "ClassroomId");

            migrationBuilder.CreateIndex(
                name: "IX_ai_knowledge_sources_SourceType_SourceRefId",
                table: "ai_knowledge_sources",
                columns: new[] { "SourceType", "SourceRefId" },
                unique: true);

            migrationBuilder.AddForeignKey(
                name: "FK_classroom_announcements_classrooms_ClassroomId",
                table: "classroom_announcements",
                column: "ClassroomId",
                principalTable: "classrooms",
                principalColumn: "Id",
                onDelete: ReferentialAction.Cascade);

            migrationBuilder.AddForeignKey(
                name: "FK_classroom_materials_classrooms_ClassroomId",
                table: "classroom_materials",
                column: "ClassroomId",
                principalTable: "classrooms",
                principalColumn: "Id",
                onDelete: ReferentialAction.Cascade);

            migrationBuilder.AddForeignKey(
                name: "FK_teacher_exams_classrooms_ClassroomId",
                table: "teacher_exams",
                column: "ClassroomId",
                principalTable: "classrooms",
                principalColumn: "Id",
                onDelete: ReferentialAction.Cascade);

            migrationBuilder.AddForeignKey(
                name: "FK_teacher_exams_content_assessments_SourceAssessmentId",
                table: "teacher_exams",
                column: "SourceAssessmentId",
                principalTable: "content_assessments",
                principalColumn: "Id",
                onDelete: ReferentialAction.SetNull);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_classroom_announcements_classrooms_ClassroomId",
                table: "classroom_announcements");

            migrationBuilder.DropForeignKey(
                name: "FK_classroom_materials_classrooms_ClassroomId",
                table: "classroom_materials");

            migrationBuilder.DropForeignKey(
                name: "FK_teacher_exams_classrooms_ClassroomId",
                table: "teacher_exams");

            migrationBuilder.DropForeignKey(
                name: "FK_teacher_exams_content_assessments_SourceAssessmentId",
                table: "teacher_exams");

            migrationBuilder.DropIndex(
                name: "IX_teacher_exams_ClassroomId",
                table: "teacher_exams");

            migrationBuilder.DropIndex(
                name: "IX_teacher_exams_LinkedAssignmentId",
                table: "teacher_exams");

            migrationBuilder.DropIndex(
                name: "IX_teacher_exams_SourceAssessmentId",
                table: "teacher_exams");

            migrationBuilder.DropIndex(
                name: "IX_classroom_materials_ClassroomId",
                table: "classroom_materials");

            migrationBuilder.DropIndex(
                name: "IX_classroom_announcements_ClassroomId",
                table: "classroom_announcements");

            migrationBuilder.DropIndex(
                name: "IX_ai_knowledge_sources_SourceType_SourceRefId",
                table: "ai_knowledge_sources");

            migrationBuilder.DropColumn(
                name: "LinkedAssignmentId",
                table: "teacher_exams");

            migrationBuilder.DropColumn(
                name: "ExtractedText",
                table: "content_materials");

            migrationBuilder.DropColumn(
                name: "FileHashSha256",
                table: "classroom_materials");

            migrationBuilder.DropColumn(
                name: "IsMistakeResolved",
                table: "assessment_responses");
        }
    }
}

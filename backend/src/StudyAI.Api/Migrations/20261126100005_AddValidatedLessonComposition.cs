using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace StudyAI.Migrations
{
    /// <inheritdoc />
    public partial class AddValidatedLessonComposition : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<int>(
                name: "SnapshotSchemaVersion",
                table: "content_revisions",
                type: "int",
                nullable: false,
                defaultValue: 1);

            migrationBuilder.CreateTable(
                name: "knowledge_units",
                columns: table => new
                {
                    Id = table.Column<string>(type: "nvarchar(64)", maxLength: 64, nullable: false),
                    CurriculumId = table.Column<string>(type: "nvarchar(64)", maxLength: 64, nullable: false),
                    Code = table.Column<string>(type: "nvarchar(64)", maxLength: 64, nullable: false),
                    Title = table.Column<string>(type: "nvarchar(256)", maxLength: 256, nullable: false),
                    Description = table.Column<string>(type: "nvarchar(2000)", maxLength: 2000, nullable: true),
                    Status = table.Column<string>(type: "nvarchar(32)", maxLength: 32, nullable: false, defaultValue: "draft"),
                    SourceName = table.Column<string>(type: "nvarchar(256)", maxLength: 256, nullable: true),
                    SourceUrl = table.Column<string>(type: "nvarchar(512)", maxLength: 512, nullable: true),
                    SourceLicense = table.Column<string>(type: "nvarchar(256)", maxLength: 256, nullable: true),
                    ReviewedBy = table.Column<string>(type: "nvarchar(64)", maxLength: 64, nullable: true),
                    ReviewedAt = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: true),
                    CreatedAt = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: false),
                    UpdatedAt = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: false),
                    RowVersion = table.Column<byte[]>(type: "rowversion", rowVersion: true, nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_knowledge_units", x => x.Id);
                    table.ForeignKey(
                        name: "FK_knowledge_units_curricula_CurriculumId",
                        column: x => x.CurriculumId,
                        principalTable: "curricula",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "learning_objectives",
                columns: table => new
                {
                    Id = table.Column<string>(type: "nvarchar(64)", maxLength: 64, nullable: false),
                    CurriculumId = table.Column<string>(type: "nvarchar(64)", maxLength: 64, nullable: false),
                    Code = table.Column<string>(type: "nvarchar(64)", maxLength: 64, nullable: false),
                    Title = table.Column<string>(type: "nvarchar(256)", maxLength: 256, nullable: false),
                    Description = table.Column<string>(type: "nvarchar(2000)", maxLength: 2000, nullable: true),
                    CognitiveLevel = table.Column<string>(type: "nvarchar(64)", maxLength: 64, nullable: true),
                    Status = table.Column<string>(type: "nvarchar(32)", maxLength: 32, nullable: false, defaultValue: "draft"),
                    SourceName = table.Column<string>(type: "nvarchar(256)", maxLength: 256, nullable: true),
                    SourceUrl = table.Column<string>(type: "nvarchar(512)", maxLength: 512, nullable: true),
                    SourceLicense = table.Column<string>(type: "nvarchar(256)", maxLength: 256, nullable: true),
                    ReviewedBy = table.Column<string>(type: "nvarchar(64)", maxLength: 64, nullable: true),
                    ReviewedAt = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: true),
                    CreatedAt = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: false),
                    UpdatedAt = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: false),
                    RowVersion = table.Column<byte[]>(type: "rowversion", rowVersion: true, nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_learning_objectives", x => x.Id);
                    table.ForeignKey(
                        name: "FK_learning_objectives_curricula_CurriculumId",
                        column: x => x.CurriculumId,
                        principalTable: "curricula",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "lesson_content_blocks",
                columns: table => new
                {
                    Id = table.Column<string>(type: "nvarchar(64)", maxLength: 64, nullable: false),
                    LessonId = table.Column<string>(type: "nvarchar(64)", maxLength: 64, nullable: false),
                    BlockType = table.Column<string>(type: "nvarchar(32)", maxLength: 32, nullable: false),
                    SchemaVersion = table.Column<int>(type: "int", nullable: false, defaultValue: 1),
                    PayloadJson = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    OrderIndex = table.Column<int>(type: "int", nullable: false),
                    Status = table.Column<string>(type: "nvarchar(32)", maxLength: 32, nullable: false, defaultValue: "draft"),
                    CreatedAt = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: false),
                    UpdatedAt = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: false),
                    RowVersion = table.Column<byte[]>(type: "rowversion", rowVersion: true, nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_lesson_content_blocks", x => x.Id);
                    table.ForeignKey(
                        name: "FK_lesson_content_blocks_content_lessons_LessonId",
                        column: x => x.LessonId,
                        principalTable: "content_lessons",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "lesson_prerequisites",
                columns: table => new
                {
                    Id = table.Column<string>(type: "nvarchar(64)", maxLength: 64, nullable: false),
                    LessonId = table.Column<string>(type: "nvarchar(64)", maxLength: 64, nullable: false),
                    PrerequisiteLessonId = table.Column<string>(type: "nvarchar(64)", maxLength: 64, nullable: false),
                    CreatedAt = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_lesson_prerequisites", x => x.Id);
                    table.CheckConstraint("CK_lesson_prerequisites_no_self", "[LessonId] <> [PrerequisiteLessonId]");
                    table.ForeignKey(
                        name: "FK_lesson_prerequisites_content_lessons_LessonId",
                        column: x => x.LessonId,
                        principalTable: "content_lessons",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_lesson_prerequisites_content_lessons_PrerequisiteLessonId",
                        column: x => x.PrerequisiteLessonId,
                        principalTable: "content_lessons",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "skills",
                columns: table => new
                {
                    Id = table.Column<string>(type: "nvarchar(64)", maxLength: 64, nullable: false),
                    CurriculumId = table.Column<string>(type: "nvarchar(64)", maxLength: 64, nullable: false),
                    Code = table.Column<string>(type: "nvarchar(64)", maxLength: 64, nullable: false),
                    Title = table.Column<string>(type: "nvarchar(256)", maxLength: 256, nullable: false),
                    Description = table.Column<string>(type: "nvarchar(2000)", maxLength: 2000, nullable: true),
                    Status = table.Column<string>(type: "nvarchar(32)", maxLength: 32, nullable: false, defaultValue: "draft"),
                    SourceName = table.Column<string>(type: "nvarchar(256)", maxLength: 256, nullable: true),
                    SourceUrl = table.Column<string>(type: "nvarchar(512)", maxLength: 512, nullable: true),
                    SourceLicense = table.Column<string>(type: "nvarchar(256)", maxLength: 256, nullable: true),
                    ReviewedBy = table.Column<string>(type: "nvarchar(64)", maxLength: 64, nullable: true),
                    ReviewedAt = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: true),
                    CreatedAt = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: false),
                    UpdatedAt = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: false),
                    RowVersion = table.Column<byte[]>(type: "rowversion", rowVersion: true, nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_skills", x => x.Id);
                    table.ForeignKey(
                        name: "FK_skills_curricula_CurriculumId",
                        column: x => x.CurriculumId,
                        principalTable: "curricula",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "lesson_knowledge_units",
                columns: table => new
                {
                    Id = table.Column<string>(type: "nvarchar(64)", maxLength: 64, nullable: false),
                    LessonId = table.Column<string>(type: "nvarchar(64)", maxLength: 64, nullable: false),
                    KnowledgeUnitId = table.Column<string>(type: "nvarchar(64)", maxLength: 64, nullable: false),
                    OrderIndex = table.Column<int>(type: "int", nullable: false),
                    CreatedAt = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_lesson_knowledge_units", x => x.Id);
                    table.ForeignKey(
                        name: "FK_lesson_knowledge_units_content_lessons_LessonId",
                        column: x => x.LessonId,
                        principalTable: "content_lessons",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_lesson_knowledge_units_knowledge_units_KnowledgeUnitId",
                        column: x => x.KnowledgeUnitId,
                        principalTable: "knowledge_units",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "lesson_objectives",
                columns: table => new
                {
                    Id = table.Column<string>(type: "nvarchar(64)", maxLength: 64, nullable: false),
                    LessonId = table.Column<string>(type: "nvarchar(64)", maxLength: 64, nullable: false),
                    ObjectiveId = table.Column<string>(type: "nvarchar(64)", maxLength: 64, nullable: false),
                    OrderIndex = table.Column<int>(type: "int", nullable: false),
                    CreatedAt = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_lesson_objectives", x => x.Id);
                    table.ForeignKey(
                        name: "FK_lesson_objectives_content_lessons_LessonId",
                        column: x => x.LessonId,
                        principalTable: "content_lessons",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_lesson_objectives_learning_objectives_ObjectiveId",
                        column: x => x.ObjectiveId,
                        principalTable: "learning_objectives",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "lesson_skills",
                columns: table => new
                {
                    Id = table.Column<string>(type: "nvarchar(64)", maxLength: 64, nullable: false),
                    LessonId = table.Column<string>(type: "nvarchar(64)", maxLength: 64, nullable: false),
                    SkillId = table.Column<string>(type: "nvarchar(64)", maxLength: 64, nullable: false),
                    OrderIndex = table.Column<int>(type: "int", nullable: false),
                    CreatedAt = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_lesson_skills", x => x.Id);
                    table.ForeignKey(
                        name: "FK_lesson_skills_content_lessons_LessonId",
                        column: x => x.LessonId,
                        principalTable: "content_lessons",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_lesson_skills_skills_SkillId",
                        column: x => x.SkillId,
                        principalTable: "skills",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "question_skills",
                columns: table => new
                {
                    Id = table.Column<string>(type: "nvarchar(64)", maxLength: 64, nullable: false),
                    QuestionId = table.Column<string>(type: "nvarchar(64)", maxLength: 64, nullable: false),
                    SkillId = table.Column<string>(type: "nvarchar(64)", maxLength: 64, nullable: false),
                    CreatedAt = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_question_skills", x => x.Id);
                    table.ForeignKey(
                        name: "FK_question_skills_content_questions_QuestionId",
                        column: x => x.QuestionId,
                        principalTable: "content_questions",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_question_skills_skills_SkillId",
                        column: x => x.SkillId,
                        principalTable: "skills",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateIndex(
                name: "IX_knowledge_units_CurriculumId_Code",
                table: "knowledge_units",
                columns: new[] { "CurriculumId", "Code" },
                unique: true,
                filter: "[Status] <> 'archived'");

            migrationBuilder.CreateIndex(
                name: "IX_learning_objectives_CurriculumId_Code",
                table: "learning_objectives",
                columns: new[] { "CurriculumId", "Code" },
                unique: true,
                filter: "[Status] <> 'archived'");

            migrationBuilder.CreateIndex(
                name: "IX_lesson_content_blocks_LessonId_OrderIndex",
                table: "lesson_content_blocks",
                columns: new[] { "LessonId", "OrderIndex" },
                unique: true,
                filter: "[Status] <> 'archived'");

            migrationBuilder.CreateIndex(
                name: "IX_lesson_content_blocks_LessonId_Status_OrderIndex",
                table: "lesson_content_blocks",
                columns: new[] { "LessonId", "Status", "OrderIndex" });

            migrationBuilder.CreateIndex(
                name: "IX_lesson_knowledge_units_KnowledgeUnitId",
                table: "lesson_knowledge_units",
                column: "KnowledgeUnitId");

            migrationBuilder.CreateIndex(
                name: "IX_lesson_knowledge_units_LessonId_KnowledgeUnitId",
                table: "lesson_knowledge_units",
                columns: new[] { "LessonId", "KnowledgeUnitId" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_lesson_objectives_LessonId_ObjectiveId",
                table: "lesson_objectives",
                columns: new[] { "LessonId", "ObjectiveId" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_lesson_objectives_ObjectiveId",
                table: "lesson_objectives",
                column: "ObjectiveId");

            migrationBuilder.CreateIndex(
                name: "IX_lesson_prerequisites_LessonId_PrerequisiteLessonId",
                table: "lesson_prerequisites",
                columns: new[] { "LessonId", "PrerequisiteLessonId" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_lesson_prerequisites_PrerequisiteLessonId",
                table: "lesson_prerequisites",
                column: "PrerequisiteLessonId");

            migrationBuilder.CreateIndex(
                name: "IX_lesson_skills_LessonId_SkillId",
                table: "lesson_skills",
                columns: new[] { "LessonId", "SkillId" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_lesson_skills_SkillId",
                table: "lesson_skills",
                column: "SkillId");

            migrationBuilder.CreateIndex(
                name: "IX_question_skills_QuestionId_SkillId",
                table: "question_skills",
                columns: new[] { "QuestionId", "SkillId" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_question_skills_SkillId",
                table: "question_skills",
                column: "SkillId");

            migrationBuilder.CreateIndex(
                name: "IX_skills_CurriculumId_Code",
                table: "skills",
                columns: new[] { "CurriculumId", "Code" },
                unique: true,
                filter: "[Status] <> 'archived'");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "lesson_content_blocks");

            migrationBuilder.DropTable(
                name: "lesson_knowledge_units");

            migrationBuilder.DropTable(
                name: "lesson_objectives");

            migrationBuilder.DropTable(
                name: "lesson_prerequisites");

            migrationBuilder.DropTable(
                name: "lesson_skills");

            migrationBuilder.DropTable(
                name: "question_skills");

            migrationBuilder.DropTable(
                name: "knowledge_units");

            migrationBuilder.DropTable(
                name: "learning_objectives");

            migrationBuilder.DropTable(
                name: "skills");

            migrationBuilder.DropColumn(
                name: "SnapshotSchemaVersion",
                table: "content_revisions");
        }
    }
}

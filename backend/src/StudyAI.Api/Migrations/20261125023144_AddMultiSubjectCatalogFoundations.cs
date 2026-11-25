using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace StudyAI.Migrations
{
    /// <inheritdoc />
    public partial class AddMultiSubjectCatalogFoundations : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "catalog_subjects",
                columns: table => new
                {
                    Id = table.Column<string>(type: "nvarchar(64)", maxLength: 64, nullable: false),
                    Code = table.Column<string>(type: "nvarchar(32)", maxLength: 32, nullable: false),
                    Name = table.Column<string>(type: "nvarchar(128)", maxLength: 128, nullable: false),
                    Description = table.Column<string>(type: "nvarchar(1000)", maxLength: 1000, nullable: true),
                    Status = table.Column<string>(type: "nvarchar(32)", maxLength: 32, nullable: false, defaultValue: "draft"),
                    RowVersion = table.Column<byte[]>(type: "rowversion", rowVersion: true, nullable: false),
                    CreatedAt = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: false),
                    UpdatedAt = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_catalog_subjects", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "grade_levels",
                columns: table => new
                {
                    Id = table.Column<string>(type: "nvarchar(64)", maxLength: 64, nullable: false),
                    Code = table.Column<string>(type: "nvarchar(32)", maxLength: 32, nullable: false),
                    Name = table.Column<string>(type: "nvarchar(128)", maxLength: 128, nullable: false),
                    OrderIndex = table.Column<int>(type: "int", nullable: false, defaultValue: 0),
                    Status = table.Column<string>(type: "nvarchar(32)", maxLength: 32, nullable: false, defaultValue: "draft"),
                    RowVersion = table.Column<byte[]>(type: "rowversion", rowVersion: true, nullable: false),
                    CreatedAt = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: false),
                    UpdatedAt = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_grade_levels", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "textbook_series",
                columns: table => new
                {
                    Id = table.Column<string>(type: "nvarchar(64)", maxLength: 64, nullable: false),
                    Code = table.Column<string>(type: "nvarchar(64)", maxLength: 64, nullable: false),
                    Name = table.Column<string>(type: "nvarchar(200)", maxLength: 200, nullable: false),
                    Publisher = table.Column<string>(type: "nvarchar(200)", maxLength: 200, nullable: false),
                    Description = table.Column<string>(type: "nvarchar(1000)", maxLength: 1000, nullable: true),
                    Status = table.Column<string>(type: "nvarchar(32)", maxLength: 32, nullable: false, defaultValue: "draft"),
                    SourceName = table.Column<string>(type: "nvarchar(256)", maxLength: 256, nullable: true),
                    SourceUrl = table.Column<string>(type: "nvarchar(512)", maxLength: 512, nullable: true),
                    SourceLicense = table.Column<string>(type: "nvarchar(256)", maxLength: 256, nullable: true),
                    RowVersion = table.Column<byte[]>(type: "rowversion", rowVersion: true, nullable: false),
                    CreatedAt = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: false),
                    UpdatedAt = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_textbook_series", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "curricula",
                columns: table => new
                {
                    Id = table.Column<string>(type: "nvarchar(64)", maxLength: 64, nullable: false),
                    Code = table.Column<string>(type: "nvarchar(64)", maxLength: 64, nullable: false),
                    GradeLevelId = table.Column<string>(type: "nvarchar(64)", maxLength: 64, nullable: false),
                    SubjectId = table.Column<string>(type: "nvarchar(64)", maxLength: 64, nullable: false),
                    Name = table.Column<string>(type: "nvarchar(200)", maxLength: 200, nullable: false),
                    Framework = table.Column<string>(type: "nvarchar(128)", maxLength: 128, nullable: false),
                    AcademicYearFrom = table.Column<int>(type: "int", nullable: true),
                    AcademicYearTo = table.Column<int>(type: "int", nullable: true),
                    Status = table.Column<string>(type: "nvarchar(32)", maxLength: 32, nullable: false, defaultValue: "draft"),
                    SourceName = table.Column<string>(type: "nvarchar(256)", maxLength: 256, nullable: true),
                    SourceUrl = table.Column<string>(type: "nvarchar(512)", maxLength: 512, nullable: true),
                    SourceLicense = table.Column<string>(type: "nvarchar(256)", maxLength: 256, nullable: true),
                    RowVersion = table.Column<byte[]>(type: "rowversion", rowVersion: true, nullable: false),
                    CreatedAt = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: false),
                    UpdatedAt = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_curricula", x => x.Id);
                    table.ForeignKey(
                        name: "FK_curricula_catalog_subjects_SubjectId",
                        column: x => x.SubjectId,
                        principalTable: "catalog_subjects",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_curricula_grade_levels_GradeLevelId",
                        column: x => x.GradeLevelId,
                        principalTable: "grade_levels",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "curriculum_editions",
                columns: table => new
                {
                    Id = table.Column<string>(type: "nvarchar(64)", maxLength: 64, nullable: false),
                    Code = table.Column<string>(type: "nvarchar(64)", maxLength: 64, nullable: false),
                    CurriculumId = table.Column<string>(type: "nvarchar(64)", maxLength: 64, nullable: false),
                    TextbookSeriesId = table.Column<string>(type: "nvarchar(64)", maxLength: 64, nullable: true),
                    EditionName = table.Column<string>(type: "nvarchar(200)", maxLength: 200, nullable: false),
                    Volume = table.Column<string>(type: "nvarchar(64)", maxLength: 64, nullable: true),
                    Version = table.Column<string>(type: "nvarchar(64)", maxLength: 64, nullable: true),
                    PublicationYear = table.Column<int>(type: "int", nullable: true),
                    Status = table.Column<string>(type: "nvarchar(32)", maxLength: 32, nullable: false, defaultValue: "draft"),
                    SourceName = table.Column<string>(type: "nvarchar(256)", maxLength: 256, nullable: true),
                    SourceUrl = table.Column<string>(type: "nvarchar(512)", maxLength: 512, nullable: true),
                    SourceLicense = table.Column<string>(type: "nvarchar(256)", maxLength: 256, nullable: true),
                    ReviewedBy = table.Column<string>(type: "nvarchar(64)", maxLength: 64, nullable: true),
                    ReviewedAt = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: true),
                    RowVersion = table.Column<byte[]>(type: "rowversion", rowVersion: true, nullable: false),
                    CreatedAt = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: false),
                    UpdatedAt = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_curriculum_editions", x => x.Id);
                    table.ForeignKey(
                        name: "FK_curriculum_editions_curricula_CurriculumId",
                        column: x => x.CurriculumId,
                        principalTable: "curricula",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_curriculum_editions_textbook_series_TextbookSeriesId",
                        column: x => x.TextbookSeriesId,
                        principalTable: "textbook_series",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateIndex(
                name: "IX_catalog_subjects_Code",
                table: "catalog_subjects",
                column: "Code",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_catalog_subjects_Status_Name",
                table: "catalog_subjects",
                columns: new[] { "Status", "Name" });

            migrationBuilder.CreateIndex(
                name: "IX_curricula_Code",
                table: "curricula",
                column: "Code",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_curricula_GradeLevelId_SubjectId_Framework_AcademicYearFrom_AcademicYearTo",
                table: "curricula",
                columns: new[] { "GradeLevelId", "SubjectId", "Framework", "AcademicYearFrom", "AcademicYearTo" },
                unique: true,
                filter: "[Status] <> 'archived'");

            migrationBuilder.CreateIndex(
                name: "IX_curricula_SubjectId",
                table: "curricula",
                column: "SubjectId");

            migrationBuilder.CreateIndex(
                name: "IX_curriculum_editions_Code",
                table: "curriculum_editions",
                column: "Code",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_curriculum_editions_CurriculumId_TextbookSeriesId_Version_Volume_PublicationYear",
                table: "curriculum_editions",
                columns: new[] { "CurriculumId", "TextbookSeriesId", "Version", "Volume", "PublicationYear" },
                unique: true,
                filter: "[Status] <> 'archived'");

            migrationBuilder.CreateIndex(
                name: "IX_curriculum_editions_TextbookSeriesId",
                table: "curriculum_editions",
                column: "TextbookSeriesId");

            migrationBuilder.CreateIndex(
                name: "IX_grade_levels_Code",
                table: "grade_levels",
                column: "Code",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_grade_levels_Status_OrderIndex",
                table: "grade_levels",
                columns: new[] { "Status", "OrderIndex" });

            migrationBuilder.CreateIndex(
                name: "IX_textbook_series_Code",
                table: "textbook_series",
                column: "Code",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_textbook_series_Status_Name",
                table: "textbook_series",
                columns: new[] { "Status", "Name" });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "curriculum_editions");

            migrationBuilder.DropTable(
                name: "curricula");

            migrationBuilder.DropTable(
                name: "textbook_series");

            migrationBuilder.DropTable(
                name: "catalog_subjects");

            migrationBuilder.DropTable(
                name: "grade_levels");
        }
    }
}

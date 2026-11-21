using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace StudyAI.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class AddClassroomAlerts : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "classroom_alerts",
                columns: table => new
                {
                    Id = table.Column<string>(type: "nvarchar(64)", maxLength: 64, nullable: false),
                    ClassroomId = table.Column<string>(type: "nvarchar(64)", maxLength: 64, nullable: false),
                    StudentId = table.Column<string>(type: "nvarchar(64)", maxLength: 64, nullable: false),
                    Type = table.Column<string>(type: "nvarchar(32)", maxLength: 32, nullable: false),
                    Severity = table.Column<string>(type: "nvarchar(16)", maxLength: 16, nullable: false),
                    Message = table.Column<string>(type: "nvarchar(500)", maxLength: 500, nullable: false),
                    Status = table.Column<string>(type: "nvarchar(32)", maxLength: 32, nullable: false),
                    ResolutionNote = table.Column<string>(type: "nvarchar(500)", maxLength: 500, nullable: true),
                    ResolvedByTeacherId = table.Column<string>(type: "nvarchar(64)", maxLength: 64, nullable: true),
                    ResolvedAt = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: true),
                    CreatedAt = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: false),
                    UpdatedAt = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_classroom_alerts", x => x.Id);
                    table.ForeignKey(
                        name: "FK_classroom_alerts_classrooms_ClassroomId",
                        column: x => x.ClassroomId,
                        principalTable: "classrooms",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_classroom_alerts_users_ResolvedByTeacherId",
                        column: x => x.ResolvedByTeacherId,
                        principalTable: "users",
                        principalColumn: "Id");
                    table.ForeignKey(
                        name: "FK_classroom_alerts_users_StudentId",
                        column: x => x.StudentId,
                        principalTable: "users",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateIndex(
                name: "IX_classroom_alerts_ClassroomId",
                table: "classroom_alerts",
                column: "ClassroomId");

            migrationBuilder.CreateIndex(
                name: "IX_classroom_alerts_ResolvedByTeacherId",
                table: "classroom_alerts",
                column: "ResolvedByTeacherId");

            migrationBuilder.CreateIndex(
                name: "IX_classroom_alerts_Status",
                table: "classroom_alerts",
                column: "Status");

            migrationBuilder.CreateIndex(
                name: "IX_classroom_alerts_StudentId",
                table: "classroom_alerts",
                column: "StudentId");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "classroom_alerts");
        }
    }
}

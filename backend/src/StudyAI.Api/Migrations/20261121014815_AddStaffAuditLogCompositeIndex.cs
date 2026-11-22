using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace StudyAI.Migrations
{
    /// <inheritdoc />
    public partial class AddStaffAuditLogCompositeIndex : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateIndex(
                name: "IX_staff_audit_logs_TargetType_Action_CreatedAt",
                table: "staff_audit_logs",
                columns: new[] { "TargetType", "Action", "CreatedAt" });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_staff_audit_logs_TargetType_Action_CreatedAt",
                table: "staff_audit_logs");
        }
    }
}

using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace StudyAI.Migrations
{
    /// <inheritdoc />
    public partial class AddSupportCenterClientMessageId : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "ClientMessageId",
                table: "support_ticket_messages",
                type: "nvarchar(64)",
                maxLength: 64,
                nullable: true);

            migrationBuilder.CreateIndex(
                name: "IX_support_ticket_messages_TicketId_SenderUserId_ClientMessageId",
                table: "support_ticket_messages",
                columns: new[] { "TicketId", "SenderUserId", "ClientMessageId" },
                unique: true,
                filter: "[ClientMessageId] IS NOT NULL");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_support_ticket_messages_TicketId_SenderUserId_ClientMessageId",
                table: "support_ticket_messages");

            migrationBuilder.DropColumn(
                name: "ClientMessageId",
                table: "support_ticket_messages");
        }
    }
}

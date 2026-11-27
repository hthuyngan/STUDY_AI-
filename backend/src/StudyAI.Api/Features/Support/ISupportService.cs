namespace StudyAI.Features.Support;

public interface ISupportService
{
    Task<SupportTicketsPageDto> ListUserTicketsAsync(
        string userId,
        string? status = null,
        string? category = null,
        int page = 1,
        int pageSize = 20,
        CancellationToken ct = default);

    Task<SupportTicketDetailDto> GetUserTicketDetailAsync(
        string ticketId,
        string userId,
        CancellationToken ct = default);

    Task<SupportTicketDetailDto> CreateTicketAsync(
        string userId,
        CreateSupportTicketRequestDto req,
        CancellationToken ct = default);

    Task<SupportTicketDetailDto> AddUserMessageAsync(
        string ticketId,
        string userId,
        ReplySupportTicketRequestDto req,
        CancellationToken ct = default);

    Task<SupportTicketsPageDto> ListAdminTicketsAsync(
        string? status = null,
        string? category = null,
        string? priority = null,
        string? search = null,
        string? assignedTo = null,
        int page = 1,
        int pageSize = 20,
        CancellationToken ct = default);

    Task<SupportTicketDetailDto> GetAdminTicketDetailAsync(
        string ticketId,
        CancellationToken ct = default);

    Task<SupportTicketDetailDto> UpdateTicketAdminAsync(
        string ticketId,
        AdminUpdateSupportTicketRequestDto req,
        string adminUserId,
        CancellationToken ct = default);

    Task<SupportTicketDetailDto> AddAdminMessageAsync(
        string ticketId,
        string adminUserId,
        string adminRole,
        ReplySupportTicketRequestDto req,
        CancellationToken ct = default);
}

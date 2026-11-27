namespace StudyAI.Features.Support;

public class CreateSupportTicketRequestDto
{
    public string Subject { get; set; } = string.Empty;
    public string Category { get; set; } = "OTHER";
    public string Message { get; set; } = string.Empty;
}

public class ReplySupportTicketRequestDto
{
    public string Body { get; set; } = string.Empty;
    public string? NextStatus { get; set; }
    public string? ClientMessageId { get; set; }
}

public class AdminUpdateSupportTicketRequestDto
{
    public string? Status { get; set; }
    public string? Priority { get; set; }
    public string? Category { get; set; }
    public string? AssignedToUserId { get; set; }
}

public class SupportTicketMessageDto
{
    public string Id { get; set; } = string.Empty;
    public string TicketId { get; set; } = string.Empty;
    public string SenderUserId { get; set; } = string.Empty;
    public string SenderName { get; set; } = string.Empty;
    public string SenderRole { get; set; } = string.Empty;
    public string Body { get; set; } = string.Empty;
    public string CreatedAt { get; set; } = string.Empty;
}

public class SupportTicketSummaryDto
{
    public string Id { get; set; } = string.Empty;
    public string TicketCode { get; set; } = string.Empty;
    public string UserId { get; set; } = string.Empty;
    public string UserName { get; set; } = string.Empty;
    public string UserEmail { get; set; } = string.Empty;
    public string Subject { get; set; } = string.Empty;
    public string Category { get; set; } = string.Empty;
    public string Priority { get; set; } = string.Empty;
    public string Status { get; set; } = string.Empty;
    public string? AssignedToUserId { get; set; }
    public string? AssignedToName { get; set; }
    public int MessageCount { get; set; }
    public string CreatedAt { get; set; } = string.Empty;
    public string UpdatedAt { get; set; } = string.Empty;
    public string? ResolvedAt { get; set; }
    public string? ClosedAt { get; set; }
}

public class SupportTicketDetailDto : SupportTicketSummaryDto
{
    public List<SupportTicketMessageDto> Messages { get; set; } = new();
}

public class SupportTicketsPageDto
{
    public List<SupportTicketSummaryDto> Items { get; set; } = new();
    public int Page { get; set; } = 1;
    public int PageSize { get; set; } = 20;
    public int Total { get; set; }
    public int TotalPages => PageSize > 0 ? (int)Math.Ceiling((double)Total / PageSize) : 0;
}

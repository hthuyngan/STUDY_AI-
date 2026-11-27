namespace StudyAI.Models;

public class SupportTicket
{
    public string Id { get; set; } = string.Empty;
    public string TicketCode { get; set; } = string.Empty;
    public string UserId { get; set; } = string.Empty;
    public string Subject { get; set; } = string.Empty;
    public string Category { get; set; } = "OTHER"; // ACCOUNT, TECHNICAL, AI_TUTOR, LEARNING_CONTENT, SUBSCRIPTION, OTHER
    public string Priority { get; set; } = "MEDIUM"; // LOW, MEDIUM, HIGH, URGENT
    public string Status { get; set; } = "OPEN"; // OPEN, IN_PROGRESS, WAITING_FOR_USER, RESOLVED, CLOSED
    public string? AssignedToUserId { get; set; }
    public DateTimeOffset CreatedAt { get; set; } = DateTimeOffset.UtcNow;
    public DateTimeOffset UpdatedAt { get; set; } = DateTimeOffset.UtcNow;
    public DateTimeOffset? ResolvedAt { get; set; }
    public DateTimeOffset? ClosedAt { get; set; }

    public User? User { get; set; }
    public User? AssignedToUser { get; set; }
    public ICollection<SupportTicketMessage> Messages { get; set; } = new List<SupportTicketMessage>();
}

public class SupportTicketMessage
{
    public string Id { get; set; } = string.Empty;
    public string TicketId { get; set; } = string.Empty;
    public string SenderUserId { get; set; } = string.Empty;
    public string SenderRole { get; set; } = "user"; // user, admin, support
    public string Body { get; set; } = string.Empty;
    public string? ClientMessageId { get; set; }
    public DateTimeOffset CreatedAt { get; set; } = DateTimeOffset.UtcNow;

    public SupportTicket? Ticket { get; set; }
    public User? SenderUser { get; set; }
}

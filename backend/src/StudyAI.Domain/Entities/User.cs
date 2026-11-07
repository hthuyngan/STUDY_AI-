namespace StudyAI.Domain.Entities;

public class User
{
    public string Id { get; set; } = string.Empty;
    public string? Email { get; set; }
    public string? EmailNormalized { get; set; }
    public string? PasswordHash { get; set; }
    public string? DisplayName { get; set; }
    public string? Grade { get; set; }
    public string Role { get; set; } = "learner";
    public string Status { get; set; } = "active";
    public DateTimeOffset? LastLoginAt { get; set; }
    public DateTimeOffset CreatedAt { get; set; } = DateTimeOffset.UtcNow;
    public DateTimeOffset UpdatedAt { get; set; } = DateTimeOffset.UtcNow;

    public ICollection<RefreshSession> RefreshSessions { get; set; } = new List<RefreshSession>();
}

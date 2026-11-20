namespace StudyAI.Domain.Entities;

public class TeacherProfile
{
    public string Id { get; set; } = string.Empty;
    public string TeacherId { get; set; } = string.Empty;
    public string? Phone { get; set; }
    public string? Qualifications { get; set; }
    public int ExperienceYears { get; set; } = 0;
    public string? Bio { get; set; }
    public DateTimeOffset CreatedAt { get; set; } = DateTimeOffset.UtcNow;
    public DateTimeOffset UpdatedAt { get; set; } = DateTimeOffset.UtcNow;

    public User? Teacher { get; set; }
}

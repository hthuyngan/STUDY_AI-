namespace StudyAI.Application.DTOs;

public class UpdateRoleRequestDto
{
    public string Role { get; set; } = string.Empty;
}

public class UpdateStatusRequestDto
{
    public string Status { get; set; } = string.Empty;
}

public class AdminUserDto
{
    public string Id { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;
    public string DisplayName { get; set; } = string.Empty;
    public string Grade { get; set; } = string.Empty;
    public string Role { get; set; } = string.Empty;
    public string Status { get; set; } = "active";
    public string CreatedAt { get; set; } = string.Empty;
    public string? LastLoginAt { get; set; }
}

public class AdminUsersResponseDto
{
    public List<AdminUserDto> Items { get; set; } = new();
    public int Page { get; set; } = 1;
    public int PageSize { get; set; } = 20;
    public int Total { get; set; } = 0;
}

public class AdminActivityDto
{
    public string Id { get; set; } = string.Empty;
    public string Action { get; set; } = string.Empty;
    public string Actor { get; set; } = string.Empty;
    public string TargetType { get; set; } = string.Empty;
    public string TargetId { get; set; } = string.Empty;
    public string Timestamp { get; set; } = string.Empty;
}

public class AdminMetricsDto
{
    public int TotalUsers { get; set; }
    public int ActiveUsers { get; set; }
    public int LearnersCount { get; set; }
    public int StaffCount { get; set; }
    public string SystemStatus { get; set; } = "healthy";
}

public class AdminDashboardDto
{
    public AdminMetricsDto Metrics { get; set; } = new();
    public List<AdminActivityDto> RecentActivities { get; set; } = new();
}

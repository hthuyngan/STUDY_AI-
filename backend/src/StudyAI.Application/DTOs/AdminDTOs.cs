namespace StudyAI.Application.DTOs;

public class CreateUserRequestDto
{
    public string Email { get; set; } = string.Empty;
    public string DisplayName { get; set; } = string.Empty;
    public string Role { get; set; } = "learner";
    public string Status { get; set; } = "active";
    public string? Grade { get; set; }
    public string? Password { get; set; }
}

public class CreateUserResponseDto
{
    public AdminUserDto User { get; set; } = new();
    public string? TemporaryPassword { get; set; }
    public string Message { get; set; } = string.Empty;
}

public class UpdateUserRequestDto
{
    public string? DisplayName { get; set; }
    public string? Grade { get; set; }
    public string? Role { get; set; }
    public string? Status { get; set; }
}

public class UpdateRoleRequestDto
{
    public string Role { get; set; } = string.Empty;
}

public class UpdateStatusRequestDto
{
    public string Status { get; set; } = string.Empty;
}

public class ResetPasswordRequestDto
{
    public string? NewPassword { get; set; }
}

public class ResetPasswordResponseDto
{
    public bool Success { get; set; } = true;
    public string UserId { get; set; } = string.Empty;
    public string? TemporaryPassword { get; set; }
    public string Message { get; set; } = string.Empty;
}

public class AdminUserDto
{
    public string Id { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;
    public string DisplayName { get; set; } = string.Empty;
    public string Grade { get; set; } = string.Empty;
    public string Role { get; set; } = string.Empty;
    public string Status { get; set; } = "active";
    public bool IsDeleted { get; set; } = false;
    public string? DeletedAt { get; set; }
    public string CreatedAt { get; set; } = string.Empty;
    public string? LastLoginAt { get; set; }
}

public class AdminUsersResponseDto
{
    public List<AdminUserDto> Items { get; set; } = new();
    public int Page { get; set; } = 1;
    public int PageSize { get; set; } = 20;
    public int Total { get; set; } = 0;
    public int TotalPages => PageSize > 0 ? (int)Math.Ceiling((double)Total / PageSize) : 0;
}

public class AdminActivityDto
{
    public string Id { get; set; } = string.Empty;
    public string Action { get; set; } = string.Empty;
    public string Actor { get; set; } = string.Empty;
    public string TargetType { get; set; } = string.Empty;
    public string TargetId { get; set; } = string.Empty;
    public string? Payload { get; set; }
    public string Timestamp { get; set; } = string.Empty;
}

public class AdminAuditLogsResponseDto
{
    public List<AdminActivityDto> Items { get; set; } = new();
    public int Page { get; set; } = 1;
    public int PageSize { get; set; } = 20;
    public int Total { get; set; } = 0;
}

public class AdminMetricsDto
{
    public int TotalUsers { get; set; }
    public int ActiveUsers { get; set; }
    public int SuspendedUsers { get; set; }
    public int DisabledUsers { get; set; }
    public int LearnersCount { get; set; }
    public int TeachersCount { get; set; }
    public int ContentCount { get; set; }
    public int SupportCount { get; set; }
    public int AdminsCount { get; set; }
    public int RecentNewUsersCount { get; set; }
    public string SystemStatus { get; set; } = "healthy";
}

public class AdminDashboardDto
{
    public AdminMetricsDto Metrics { get; set; } = new();
    public List<AdminActivityDto> RecentActivities { get; set; } = new();
}

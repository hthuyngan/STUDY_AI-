using System.Text.Json.Serialization;

namespace StudyAI.Features.Admin;

public class AdminSystemStatusDto
{
    [JsonPropertyName("apiStatus")]
    public string ApiStatus { get; set; } = "operational";

    [JsonPropertyName("database")]
    public AdminSystemDatabaseStatusDto Database { get; set; } = new();

    [JsonPropertyName("environment")]
    public string Environment { get; set; } = "development";

    [JsonPropertyName("backendVersion")]
    public string BackendVersion { get; set; } = "1.0.0";

    [JsonPropertyName("checkedAt")]
    public string CheckedAt { get; set; } = string.Empty;

    [JsonPropertyName("storageStats")]
    public AdminSystemStorageStatsDto StorageStats { get; set; } = new();
}

public class AdminSystemDatabaseStatusDto
{
    [JsonPropertyName("status")]
    public string Status { get; set; } = "connected";

    [JsonPropertyName("latencyMs")]
    public double LatencyMs { get; set; }
}

public class AdminSystemStorageStatsDto
{
    [JsonPropertyName("usersCount")]
    public int UsersCount { get; set; }

    [JsonPropertyName("activitiesCount")]
    public int ActivitiesCount { get; set; }

    [JsonPropertyName("attentionCount")]
    public int AttentionCount { get; set; }

    [JsonPropertyName("isLocalStoragePersisted")]
    public bool IsLocalStoragePersisted { get; set; }
}

public interface IAdminSystemService
{
    Task<AdminSystemStatusDto> GetSystemStatusAsync(CancellationToken ct = default);
}
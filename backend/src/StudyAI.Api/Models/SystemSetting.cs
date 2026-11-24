using System.ComponentModel.DataAnnotations;

namespace StudyAI.Models;

public class SystemSetting
{
    public string Id { get; set; } = "global";
    public string Payload { get; set; } = "{}";

    [ConcurrencyCheck]
    public string Version { get; set; } = Guid.NewGuid().ToString("N");

    public string UpdatedBy { get; set; } = "System";
    public DateTimeOffset UpdatedAt { get; set; } = DateTimeOffset.UtcNow;

    [Timestamp]
    public byte[]? RowVersion { get; set; }
}

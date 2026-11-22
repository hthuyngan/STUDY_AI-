

namespace StudyAI.Common.Utilities;

public class IdGenerator : IIdGenerator
{
    public string NewId() => Guid.NewGuid().ToString("N");

    public string NewId(string prefix) => $"{prefix}_{Guid.NewGuid():N}";
}

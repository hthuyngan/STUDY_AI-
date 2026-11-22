namespace StudyAI.Common.Utilities;

public interface IClock
{
    DateTimeOffset UtcNow { get; }
}

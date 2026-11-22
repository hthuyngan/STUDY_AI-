using StudyAI.Application.Common.Interfaces;

namespace StudyAI.Infrastructure.Services;

public class SystemClock : IClock
{
    public DateTimeOffset UtcNow => DateTimeOffset.UtcNow;
}

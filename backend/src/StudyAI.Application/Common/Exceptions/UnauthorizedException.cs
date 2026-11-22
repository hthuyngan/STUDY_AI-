namespace StudyAI.Application.Common.Exceptions;

public class UnauthorizedException : UnauthorizedAccessException
{
    public UnauthorizedException()
        : base("Người dùng chưa được xác thực.")
    {
    }

    public UnauthorizedException(string message)
        : base(message)
    {
    }
}

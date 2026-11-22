namespace StudyAI.Application.Common.Exceptions;

public class ValidationException : Exception
{
    public IReadOnlyDictionary<string, string[]> Errors { get; }

    public ValidationException(string message) : base(message)
    {
        Errors = new Dictionary<string, string[]> { { "detail", new[] { message } } };
    }

    public ValidationException(string field, string message) : base(message)
    {
        Errors = new Dictionary<string, string[]> { { field, new[] { message } } };
    }

    public ValidationException(IReadOnlyDictionary<string, string[]> errors) 
        : base("Dữ liệu không hợp lệ. Vui lòng kiểm tra lại thông tin.")
    {
        Errors = errors;
    }
}

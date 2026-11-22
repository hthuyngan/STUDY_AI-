namespace StudyAI.Common.Utilities;

public class Result
{
    public bool IsSuccess { get; }
    public string? ErrorMessage { get; }
    public string? ErrorCode { get; }

    protected Result(bool isSuccess, string? errorMessage = null, string? errorCode = null)
    {
        IsSuccess = isSuccess;
        ErrorMessage = errorMessage;
        ErrorCode = errorCode;
    }

    public static Result Success() => new(true);
    public static Result Failure(string errorMessage, string? errorCode = null) => new(false, errorMessage, errorCode);
}

public class Result<T> : Result
{
    public T? Value { get; }

    private Result(bool isSuccess, T? value, string? errorMessage = null, string? errorCode = null)
        : base(isSuccess, errorMessage, errorCode)
    {
        Value = value;
    }

    public static Result<T> Success(T value) => new(true, value);
    public new static Result<T> Failure(string errorMessage, string? errorCode = null) => new(false, default, errorMessage, errorCode);
}

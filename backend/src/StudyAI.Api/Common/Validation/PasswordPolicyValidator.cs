using StudyAI.Common.Exceptions;

namespace StudyAI.Common.Validation;

public static class PasswordPolicyValidator
{
    public const int MinLength = 8;
    public const int MaxLength = 128;

    public static void Validate(string? password, string fieldName = "Password")
    {
        if (string.IsNullOrWhiteSpace(password))
        {
            throw new ValidationException(fieldName, "Mật khẩu không được để trống.");
        }

        string trimmed = password.Trim();
        if (trimmed.Length < MinLength || password.Length > MaxLength)
        {
            throw new ValidationException(fieldName, $"Mật khẩu phải chứa ít nhất {MinLength} ký tự và không vượt quá {MaxLength} ký tự.");
        }
    }
}

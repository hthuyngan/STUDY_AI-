using System.Security.Cryptography;
using System.Text;
using System.Text.RegularExpressions;

namespace StudyAI.Features.Content;

public static class QuestionIdentityHelper
{
    private static readonly Regex MultiSpaceRegex = new(@"\s+", RegexOptions.Compiled);

    public static string NormalizeText(string? value)
    {
        if (string.IsNullOrWhiteSpace(value)) return string.Empty;
        return MultiSpaceRegex.Replace(value.Trim(), " ").ToLowerInvariant();
    }

    public static string ComputeFingerprint(
        string? type,
        string? prompt,
        IEnumerable<string>? options,
        string? correctAnswer)
    {
        var normType = NormalizeText(string.IsNullOrWhiteSpace(type) ? "multiple-choice" : type);
        var normPrompt = NormalizeText(prompt);
        var normOptions = options == null
            ? string.Empty
            : string.Join("|", options.Select(NormalizeText).Where(o => o.Length > 0));
        var normAnswer = NormalizeText(correctAnswer);

        var canonical = $"{normType}\n{normPrompt}\n{normOptions}\n{normAnswer}";
        var bytes = SHA256.HashData(Encoding.UTF8.GetBytes(canonical));
        return Convert.ToHexString(bytes).ToLowerInvariant();
    }
}

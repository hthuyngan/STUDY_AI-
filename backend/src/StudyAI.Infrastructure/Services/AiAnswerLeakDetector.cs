using System.Text.RegularExpressions;

namespace StudyAI.Infrastructure.Services;

public static class AiAnswerLeakDetector
{
    private static readonly Regex OptionLeakRegex = new(
        @"(Đáp án\s*(là|đúng là|chính xác là)?\s*:?\s*([A-D])\b|Chọn\s*(đáp án|phương án)?\s*([A-D])\b|Do đó\s*(chọn|ta chọn)\s*([A-D])\b|Vậy\s*(chọn|ta chọn)\s*([A-D])\b|khoanh\s*(vào)?\s*([A-D])\b|Phương án đúng\s*(là)?\s*:?\s*([A-D])\b|=>\s*([A-D])\b|->\s*([A-D])\b)",
        RegexOptions.IgnoreCase | RegexOptions.Compiled);

    private static readonly Regex ResultConclusionRegex = new(
        @"(Kết quả\s*(cuối cùng)?\s*(là)?\s*:\s*([^.\n]+)|Vậy ta được\s*:?\s*([^.\n]+))",
        RegexOptions.IgnoreCase | RegexOptions.Compiled);

    public static bool HasAnswerLeak(string text, string? correctAnswer, int hintLevel)
    {
        if (string.IsNullOrWhiteSpace(text)) return false;

        // Level 1 or 2 should never mention option letters as the answer
        if (OptionLeakRegex.IsMatch(text)) return true;

        if (!string.IsNullOrWhiteSpace(correctAnswer))
        {
            var trimmedAnswer = correctAnswer.Trim();
            // Single character option: A, B, C, D
            if (trimmedAnswer.Length == 1 && char.IsLetter(trimmedAnswer[0]))
            {
                var specificOptionRegex = new Regex($@"\b(đáp án|chọn)\s+({Regex.Escape(trimmedAnswer)})\b", RegexOptions.IgnoreCase);
                if (specificOptionRegex.IsMatch(text)) return true;
            }
            else
            {
                // Exact formula or numeric value leak at Level 1
                if (hintLevel == 1 && text.Contains(trimmedAnswer, StringComparison.OrdinalIgnoreCase))
                {
                    return true;
                }
            }
        }

        return false;
    }

    public static string SanitizeText(string text, string? correctAnswer, int hintLevel)
    {
        if (string.IsNullOrWhiteSpace(text)) return string.Empty;

        // Replace direct answer selection leaks
        var sanitized = OptionLeakRegex.Replace(
            text,
            "Hãy đối chiếu kết quả tính toán của bạn với 4 phương án đề bài để chọn câu trả lời đúng");

        if (!string.IsNullOrWhiteSpace(correctAnswer))
        {
            var trimmedAnswer = correctAnswer.Trim();
            if (trimmedAnswer.Length <= 2)
            {
                sanitized = Regex.Replace(
                    sanitized,
                    $@"\b(đáp án\s+là\s+{Regex.Escape(trimmedAnswer)})\b",
                    "hãy chọn phương án tương ứng",
                    RegexOptions.IgnoreCase);

                sanitized = Regex.Replace(
                    sanitized,
                    $@"\b(chọn\s+{Regex.Escape(trimmedAnswer)})\b",
                    "đối chiếu kết quả tìm được",
                    RegexOptions.IgnoreCase);
            }
        }

        // If Level 1 still leaks conclusion phrase, replace concluding sentences
        if (hintLevel == 1)
        {
            sanitized = ResultConclusionRegex.Replace(
                sanitized,
                "Hãy tự mình thực hiện phép tính để rút ra kết luận.");
        }

        return sanitized.Trim();
    }
}

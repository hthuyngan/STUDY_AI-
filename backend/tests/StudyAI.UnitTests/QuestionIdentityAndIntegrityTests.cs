using StudyAI.Features.Content;
using Xunit;

namespace StudyAI.UnitTests;

public class QuestionIdentityAndIntegrityTests
{
    [Fact]
    public void ComputeFingerprint_IsDeterministicAcrossWhitespaceAndCase()
    {
        var fp1 = QuestionIdentityHelper.ComputeFingerprint(
            "multiple-choice",
            "  Tính   đạo hàm của   y = x^2  ",
            new[] { "2x", " x^2 ", "2" },
            " 2x ");

        var fp2 = QuestionIdentityHelper.ComputeFingerprint(
            "MULTIPLE-CHOICE",
            "tính đạo hàm của y = x^2",
            new[] { " 2X", "x^2", "2 " },
            "2X");

        Assert.Equal(fp1, fp2);
        Assert.Equal(64, fp1.Length);
    }

    [Fact]
    public void ComputeFingerprint_ChangesWhenAnswerOrOptionsChange()
    {
        var fp1 = QuestionIdentityHelper.ComputeFingerprint(
            "multiple-choice",
            "1 + 1 = ?",
            new[] { "1", "2" },
            "2");

        var fp2 = QuestionIdentityHelper.ComputeFingerprint(
            "multiple-choice",
            "1 + 1 = ?",
            new[] { "1", "3" },
            "3");

        Assert.NotEqual(fp1, fp2);
    }
}

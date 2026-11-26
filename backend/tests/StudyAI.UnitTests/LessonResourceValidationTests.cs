using System.Net;
using StudyAI.Features.Content;
using Xunit;

namespace StudyAI.UnitTests;

public class LessonResourceValidationTests
{
    [Theory]
    [InlineData("video")]
    [InlineData("image")]
    [InlineData("document")]
    [InlineData("link")]
    [InlineData("attachment")]
    public void NormalizeResourceType_AcceptsAllFiveCanonicalTypes(string type)
    {
        var normalized = LessonResourceValidator.NormalizeResourceType(type.ToUpperInvariant());
        Assert.Equal(type, normalized);
    }

    [Fact]
    public void NormalizeResourceType_RejectsUnknownType()
    {
        Assert.Throws<ValidationException>(() => LessonResourceValidator.NormalizeResourceType("executable"));
    }

    [Theory]
    [InlineData("javascript:alert(1)")]
    [InlineData("data:text/html,<script>alert(1)</script>")]
    [InlineData("file:///etc/passwd")]
    [InlineData("http://example.com/video.mp4")]
    [InlineData("https://user:pass@example.com/doc.pdf")]
    [InlineData("https://localhost/test.pdf")]
    [InlineData("https://127.0.0.1/test.pdf")]
    [InlineData("https://169.254.169.254/latest/meta-data")]
    [InlineData("https://10.0.0.5/internal.pdf")]
    [InlineData("https://192.168.1.10/internal.pdf")]
    [InlineData("https://[::1]/internal.pdf")]
    [InlineData("https://example.com:8443/doc.pdf")]
    public void ValidateAndNormalize_RejectsUnsafeOrSsrfUrls(string unsafeUrl)
    {
        Assert.Throws<ValidationException>(() =>
            LessonResourceValidator.ValidateAndNormalize(
                "document",
                unsafeUrl,
                null,
                null,
                null,
                null,
                "application/pdf",
                null,
                false,
                resolveDns: false));
    }

    [Theory]
    [InlineData("text/html")]
    [InlineData("application/javascript")]
    [InlineData("image/svg+xml")]
    public void ValidateAndNormalize_RejectsUnsafeMimeTypes(string mimeType)
    {
        Assert.Throws<ValidationException>(() =>
            LessonResourceValidator.ValidateAndNormalize(
                "document",
                "https://cdn.example.org/file.dat",
                null,
                null,
                null,
                null,
                mimeType,
                null,
                false,
                resolveDns: false));
    }

    [Fact]
    public void ValidateAndNormalize_NormalizesYouTubeEmbedAndThumbnail()
    {
        var result = LessonResourceValidator.ValidateAndNormalize(
            "video",
            "https://youtu.be/dQw4w9WgXcQ",
            null,
            null,
            null,
            null,
            null,
            null,
            true,
            resolveDns: false);

        Assert.Equal("video", result.ResourceType);
        Assert.Equal("youtube", result.Provider);
        Assert.Equal("dQw4w9WgXcQ", result.YouTubeVideoId);
        Assert.Equal("https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ", result.EmbedUrl);
        Assert.Equal("https://i.ytimg.com/vi/dQw4w9WgXcQ/hqdefault.jpg", result.ThumbnailUrl);
        Assert.True(result.EmbedAllowed);
    }

    [Fact]
    public void ValidateAndNormalize_ExternalVideoForcesEmbedAllowedFalse()
    {
        var result = LessonResourceValidator.ValidateAndNormalize(
            "video",
            "https://cdn.example.org/lecture.mp4",
            "html5",
            null,
            null,
            null,
            "video/mp4",
            null,
            true,
            resolveDns: false);

        Assert.Equal("html5", result.Provider);
        Assert.False(result.EmbedAllowed);
        Assert.Null(result.EmbedUrl);
    }

    [Fact]
    public void IsSafeLearnerUrl_AllowsInternalAttachmentUploadPath_AndRejectsTraversal()
    {
        Assert.True(LessonResourceValidator.IsSafeLearnerUrl("/uploads/lessons/worksheet.pdf", "attachment"));
        Assert.False(LessonResourceValidator.IsSafeLearnerUrl("/uploads/../secrets.txt", "attachment"));
        Assert.False(LessonResourceValidator.IsSafeLearnerUrl("javascript:alert(1)", "link"));
        Assert.True(LessonResourceValidator.IsSafeLearnerUrl("https://vi.khanacademy.org/math/algebra", "link"));
    }

    [Theory]
    [InlineData("127.0.0.1", true)]
    [InlineData("10.1.2.3", true)]
    [InlineData("172.16.0.1", true)]
    [InlineData("192.168.0.1", true)]
    [InlineData("169.254.169.254", true)]
    [InlineData("8.8.8.8", false)]
    public void IsPrivateOrReservedIp_DetectsPrivateRanges(string ipString, bool expectedPrivate)
    {
        var ip = IPAddress.Parse(ipString);
        Assert.Equal(expectedPrivate, LessonResourceValidator.IsPrivateOrReservedIp(ip));
    }
}

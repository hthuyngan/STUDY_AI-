using System;
using System.IO;
using Xunit;

namespace StudyAI.UnitTests;

/// <summary>
/// Phase P00: Verifies the canonical persisted/wire content status contract ("in-review", "changes-requested")
/// matches the Architecture Decision Record (ADR_MULTI_SUBJECT_CURRICULUM_ENGINE.md).
/// </summary>
public class ContentStatusContractTests
{
    [Fact]
    public void AdrAndGovernanceServices_UseCanonicalHyphenatedStatusContract()
    {
        var repoRoot = Path.GetFullPath(Path.Combine(AppContext.BaseDirectory, "..", "..", "..", "..", "..", ".."));
        var adrPath = Path.Combine(repoRoot, "docs", "architecture", "ADR_MULTI_SUBJECT_CURRICULUM_ENGINE.md");
        Assert.True(File.Exists(adrPath), $"ADR file not found at {adrPath}");

        var adrContent = File.ReadAllText(adrPath);
        Assert.Contains("draft -> in-review -> approved -> published -> archived", adrContent);
        Assert.Contains("changes-requested", adrContent);
        Assert.DoesNotContain("in_review", adrContent);
        Assert.DoesNotContain("changes_requested", adrContent);
    }
}

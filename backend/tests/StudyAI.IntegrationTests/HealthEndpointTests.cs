using System.Net;
using System.Text.Json;
using Xunit;

namespace StudyAI.IntegrationTests;

public class HealthEndpointTests : IClassFixture<StudyAIApiFixture>
{
    private readonly HttpClient _client;

    public HealthEndpointTests(StudyAIApiFixture factory)
    {
        _client = factory.CreateClient();
    }

    [Fact]
    public async Task GetHealth_ReturnsOkAndAppMetadata()
    {
        var response = await _client.GetAsync("/health");
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);

        var body = await response.Content.ReadAsStringAsync();
        using var doc = JsonDocument.Parse(body);
        var root = doc.RootElement;

        Assert.Equal("ok", root.GetProperty("status").GetString());
        Assert.Equal("STUDY_AI", root.GetProperty("app").GetString());
    }

    [Fact]
    public async Task GetDatabaseHealth_ConnectsToRealSqlServer_ReturnsOk()
    {
        var response = await _client.GetAsync("/health/db");
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);

        var body = await response.Content.ReadAsStringAsync();
        using var doc = JsonDocument.Parse(body);
        var root = doc.RootElement;

        Assert.Equal("ok", root.GetProperty("status").GetString());
        Assert.Equal("connected", root.GetProperty("database").GetString());
    }

    [Fact]
    public async Task GetApiV1Health_ReturnsOk()
    {
        var response = await _client.GetAsync("/api/v1/health");
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
    }
}

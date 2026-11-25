using System;
using System.Collections.Generic;
using System.Net;
using System.Net.Http;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Text.Json;
using System.Threading.Tasks;
using Microsoft.Data.SqlClient;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Migrations;
using Microsoft.Extensions.DependencyInjection;
using StudyAI.Data;
using StudyAI.Features.Content;
using StudyAI.Models;
using Xunit;

namespace StudyAI.IntegrationTests;

public class ContentCatalogIntegrationTests : IClassFixture<StudyAIApiFixture>
{
    private readonly StudyAIApiFixture _factory;
    private readonly HttpClient _client;
    private readonly JsonSerializerOptions _jsonOptions = new() { PropertyNamingPolicy = JsonNamingPolicy.CamelCase };

    public ContentCatalogIntegrationTests(StudyAIApiFixture factory)
    {
        _factory = factory;
        _client = factory.CreateClient(new Microsoft.AspNetCore.Mvc.Testing.WebApplicationFactoryClientOptions
        {
            HandleCookies = true
        });
    }

    private async Task<string> LoginAsync(string email, string password)
    {
        var resp = await _client.PostAsJsonAsync("/api/v1/auth/login", new UserLoginRequestDto
        {
            Email = email,
            Password = password
        });
        resp.EnsureSuccessStatusCode();
        var auth = await resp.Content.ReadFromJsonAsync<AuthResponseDto>(_jsonOptions);
        return auth!.AccessToken;
    }

    [Fact]
    public async Task Catalog_MigrationUpgradeAndRollback_OnDisposableDb_PreservesLegacyRows()
    {
        var cleanDbName = $"StudyAIDb_Clean_{Guid.NewGuid():N}";
        var ciConn = Environment.GetEnvironmentVariable("ConnectionStrings__DefaultConnection");
        var masterConnStr = !string.IsNullOrWhiteSpace(ciConn)
            ? new SqlConnectionStringBuilder(ciConn) { InitialCatalog = "master" }.ConnectionString
            : "Server=.\\SQLEXPRESS;Database=master;Trusted_Connection=True;TrustServerCertificate=True;MultipleActiveResultSets=true;";
        var cleanConnStr = new SqlConnectionStringBuilder(masterConnStr) { InitialCatalog = cleanDbName }.ConnectionString;

        DatabaseSafetyGuard.EnsureSafeTestDatabase(cleanConnStr, nameof(Catalog_MigrationUpgradeAndRollback_OnDisposableDb_PreservesLegacyRows));

        await using (var masterConn = new SqlConnection(masterConnStr))
        {
            await masterConn.OpenAsync();
            await using var cmd = masterConn.CreateCommand();
            cmd.CommandText = $"CREATE DATABASE [{cleanDbName}];";
            await cmd.ExecuteNonQueryAsync();
        }

        try
        {
            var options = new DbContextOptionsBuilder<StudyAIDbContext>()
                .UseSqlServer(cleanConnStr)
                .Options;

            await using var db = new StudyAIDbContext(options);
            var migrator = db.GetService<IMigrator>();

            // 1. Migrate to previous migration before P01, insert legacy ContentSubject row
            await migrator.MigrateAsync("20261124164959_AddUserNotesAndBookmarksTables");
            db.ContentSubjects.Add(new ContentSubject
            {
                Id = "sub_legacy_keep",
                Name = "Lịch sử 10 Legacy",
                Code = "HIST10_LEG",
                Grade = "10",
                IsActive = true
            });
            await db.SaveChangesAsync();

            // 2. Upgrade to latest (includes AddMultiSubjectCatalogFoundations)
            await db.Database.MigrateAsync();
            Assert.Equal(1, await db.ContentSubjects.CountAsync(s => s.Id == "sub_legacy_keep"));
            Assert.Equal(0, await db.GradeLevels.CountAsync());
            Assert.Equal(0, await db.CatalogSubjects.CountAsync());
            Assert.Equal(0, await db.Curricula.CountAsync());
            Assert.Equal(0, await db.TextbookSeries.CountAsync());
            Assert.Equal(0, await db.CurriculumEditions.CountAsync());

            // 3. Rollback P01 migration -> legacy row must remain intact
            await migrator.MigrateAsync("20261124164959_AddUserNotesAndBookmarksTables");
            Assert.Equal(1, await db.ContentSubjects.CountAsync(s => s.Id == "sub_legacy_keep"));

            // 4. Re-upgrade cleanly
            await db.Database.MigrateAsync();
            Assert.Equal(1, await db.ContentSubjects.CountAsync(s => s.Id == "sub_legacy_keep"));
        }
        finally
        {
            try
            {
                SqlConnection.ClearAllPools();
                await using var masterConn = new SqlConnection(masterConnStr);
                await masterConn.OpenAsync();
                await using var dropCmd = masterConn.CreateCommand();
                dropCmd.CommandText = $@"
                    IF DB_ID('{cleanDbName}') IS NOT NULL
                    BEGIN
                        ALTER DATABASE [{cleanDbName}] SET SINGLE_USER WITH ROLLBACK IMMEDIATE;
                        DROP DATABASE [{cleanDbName}];
                    END";
                await dropCmd.ExecuteNonQueryAsync();
            }
            catch
            {
                // Best effort cleanup
            }
        }
    }

    [Fact]
    public async Task Catalog_Rbac_Enforces401_And403_ForStudentTeacherAndAuthor()
    {
        // 1. Unauthenticated -> 401
        var unauthGet = await _client.GetAsync("/api/v1/content/catalog/subjects");
        Assert.Equal(HttpStatusCode.Unauthorized, unauthGet.StatusCode);

        // 2. Learner -> 403 on both GET and POST
        var learnerToken = await LoginAsync("learner@studyai.internal", "Learner@123456");
        using var learnerGet = new HttpRequestMessage(HttpMethod.Get, "/api/v1/content/catalog/subjects");
        learnerGet.Headers.Authorization = new AuthenticationHeaderValue("Bearer", learnerToken);
        Assert.Equal(HttpStatusCode.Forbidden, (await _client.SendAsync(learnerGet)).StatusCode);

        using var learnerPost = new HttpRequestMessage(HttpMethod.Post, "/api/v1/content/catalog/grades")
        {
            Content = JsonContent.Create(new CreateGradeLevelRequestDto { Code = "99", Name = "Forbidden" })
        };
        learnerPost.Headers.Authorization = new AuthenticationHeaderValue("Bearer", learnerToken);
        Assert.Equal(HttpStatusCode.Forbidden, (await _client.SendAsync(learnerPost)).StatusCode);

        // 3. Author (ContentAuthor but NOT ContentAdminOnly) -> 200 on GET, 403 on POST
        string authorEmail = $"author.{Guid.NewGuid():N}"[..20] + "@studyai.internal";
        using (var scope = _factory.Services.CreateScope())
        {
            var db = scope.ServiceProvider.GetRequiredService<StudyAIDbContext>();
            var hasher = scope.ServiceProvider.GetRequiredService<IPasswordHasher>();
            await DbInitializer.BootstrapStaffAsync(db, hasher, authorEmail, "Author@123456", "author", "Author Only");
        }
        var authorToken = await LoginAsync(authorEmail, "Author@123456");

        using var authorGet = new HttpRequestMessage(HttpMethod.Get, "/api/v1/content/catalog/subjects");
        authorGet.Headers.Authorization = new AuthenticationHeaderValue("Bearer", authorToken);
        Assert.Equal(HttpStatusCode.OK, (await _client.SendAsync(authorGet)).StatusCode);

        using var authorPost = new HttpRequestMessage(HttpMethod.Post, "/api/v1/content/catalog/grades")
        {
            Content = JsonContent.Create(new CreateGradeLevelRequestDto { Code = "98", Name = "Author Forbidden" })
        };
        authorPost.Headers.Authorization = new AuthenticationHeaderValue("Bearer", authorToken);
        Assert.Equal(HttpStatusCode.Forbidden, (await _client.SendAsync(authorPost)).StatusCode);
    }

    [Fact]
    public async Task Catalog_FullCrud_MultiSubjectCoexistence_Concurrency_Archive_AndAudit()
    {
        var adminToken = await LoginAsync("admin@studyai.internal", "Admin@123456");
        var suffix = Guid.NewGuid().ToString("N")[..6].ToUpperInvariant();

        // 1. Create GradeLevel + 3 Subjects (Math, History, Biology)
        var grade = await PostAuthAsync<GradeLevelDto>(adminToken, "/api/v1/content/catalog/grades",
            new CreateGradeLevelRequestDto { Code = $"G_{suffix}", Name = $"Khối 10 ({suffix})", OrderIndex = 10 });
        Assert.Equal("draft", grade.Status);

        var math = await PostAuthAsync<CatalogSubjectDto>(adminToken, "/api/v1/content/catalog/subjects",
            new CreateCatalogSubjectRequestDto { Code = $"MATH_{suffix}", Name = $"Toán học ({suffix})" });
        var hist = await PostAuthAsync<CatalogSubjectDto>(adminToken, "/api/v1/content/catalog/subjects",
            new CreateCatalogSubjectRequestDto { Code = $"HIST_{suffix}", Name = $"Lịch sử ({suffix})" });
        var bio = await PostAuthAsync<CatalogSubjectDto>(adminToken, "/api/v1/content/catalog/subjects",
            new CreateCatalogSubjectRequestDto { Code = $"BIO_{suffix}", Name = $"Sinh học ({suffix})" });

        // 2. Duplicate code -> 409 Conflict
        using (var dupReq = new HttpRequestMessage(HttpMethod.Post, "/api/v1/content/catalog/subjects")
        {
            Content = JsonContent.Create(new CreateCatalogSubjectRequestDto { Code = $"math_{suffix}", Name = "Duplicate" })
        })
        {
            dupReq.Headers.Authorization = new AuthenticationHeaderValue("Bearer", adminToken);
            Assert.Equal(HttpStatusCode.Conflict, (await _client.SendAsync(dupReq)).StatusCode);
        }

        // 3. Create Curricula for Math, History, Biology
        var curMath = await PostAuthAsync<CurriculumDto>(adminToken, "/api/v1/content/catalog/curricula",
            new CreateCurriculumRequestDto
            {
                Code = $"CUR_MATH_{suffix}",
                GradeLevelId = grade.Id,
                SubjectId = math.Id,
                Name = $"Toán 10 ({suffix})",
                Framework = "GDPT 2018",
                AcademicYearFrom = 2025,
                AcademicYearTo = 2026
            });
        var curHist = await PostAuthAsync<CurriculumDto>(adminToken, "/api/v1/content/catalog/curricula",
            new CreateCurriculumRequestDto
            {
                Code = $"CUR_HIST_{suffix}",
                GradeLevelId = grade.Id,
                SubjectId = hist.Id,
                Name = $"Lịch sử 10 ({suffix})",
                Framework = "GDPT 2018",
                AcademicYearFrom = 2025,
                AcademicYearTo = 2026
            });
        Assert.Equal(grade.Id, curHist.GradeLevelId);
        Assert.Equal(hist.Id, curHist.SubjectId);

        // 4. Create TextbookSeries + Edition with Series AND Standards-only Edition without Series
        var series = await PostAuthAsync<TextbookSeriesDto>(adminToken, "/api/v1/content/catalog/textbook-series",
            new CreateTextbookSeriesRequestDto
            {
                Code = $"KNTT_{suffix}",
                Name = $"Kết nối tri thức ({suffix})",
                Publisher = "NXB Giáo dục Việt Nam"
            });

        var editionWithSeries = await PostAuthAsync<CurriculumEditionDto>(adminToken, "/api/v1/content/catalog/editions",
            new CreateCurriculumEditionRequestDto
            {
                Code = $"ED_KNTT_{suffix}",
                CurriculumId = curMath.Id,
                TextbookSeriesId = series.Id,
                EditionName = "Bản in 2026",
                Volume = "Tập 1",
                Version = "1.0",
                PublicationYear = 2026
            });
        Assert.Equal(series.Id, editionWithSeries.TextbookSeriesId);

        var standardsOnlyEdition = await PostAuthAsync<CurriculumEditionDto>(adminToken, "/api/v1/content/catalog/editions",
            new CreateCurriculumEditionRequestDto
            {
                Code = $"ED_STD_{suffix}",
                CurriculumId = curHist.Id,
                TextbookSeriesId = null,
                EditionName = "Khung chuẩn GDPT 2018",
                PublicationYear = 2026
            });
        Assert.Null(standardsOnlyEdition.TextbookSeriesId);

        // 5. Update + Optimistic Concurrency Check (stale RowVersion -> 409)
        var updatedBio = await PutAuthAsync<CatalogSubjectDto>(adminToken, $"/api/v1/content/catalog/subjects/{bio.Id}",
            new UpdateCatalogSubjectRequestDto
            {
                Name = $"Sinh học THPT ({suffix})",
                Description = "Updated description",
                RowVersion = bio.RowVersion
            });
        Assert.Equal($"Sinh học THPT ({suffix})", updatedBio.Name);

        using (var staleReq = new HttpRequestMessage(HttpMethod.Put, $"/api/v1/content/catalog/subjects/{bio.Id}")
        {
            Content = JsonContent.Create(new UpdateCatalogSubjectRequestDto
            {
                Name = "Stale overwrite",
                RowVersion = bio.RowVersion
            })
        })
        {
            staleReq.Headers.Authorization = new AuthenticationHeaderValue("Bearer", adminToken);
            Assert.Equal(HttpStatusCode.Conflict, (await _client.SendAsync(staleReq)).StatusCode);
        }

        // 6. Archive dependency check: cannot archive Curriculum while active Edition exists -> 409
        using (var badArchive = new HttpRequestMessage(HttpMethod.Post, $"/api/v1/content/catalog/curricula/{curMath.Id}/archive")
        {
            Content = JsonContent.Create(new CatalogStatusActionDto(curMath.RowVersion, "Test dependency"))
        })
        {
            badArchive.Headers.Authorization = new AuthenticationHeaderValue("Bearer", adminToken);
            Assert.Equal(HttpStatusCode.Conflict, (await _client.SendAsync(badArchive)).StatusCode);
        }

        // Archive Edition -> then Archive Curriculum -> Reactivate Curriculum
        var archivedEd = await PostAuthAsync<CurriculumEditionDto>(adminToken, $"/api/v1/content/catalog/editions/{editionWithSeries.Id}/archive",
            new CatalogStatusActionDto(editionWithSeries.RowVersion, "Retire edition"));
        Assert.Equal("archived", archivedEd.Status);

        var archivedCur = await PostAuthAsync<CurriculumDto>(adminToken, $"/api/v1/content/catalog/curricula/{curMath.Id}/archive",
            new CatalogStatusActionDto(curMath.RowVersion, "Retire curriculum"));
        Assert.Equal("archived", archivedCur.Status);

        var reactivatedCur = await PostAuthAsync<CurriculumDto>(adminToken, $"/api/v1/content/catalog/curricula/{curMath.Id}/reactivate",
            new CatalogStatusActionDto(archivedCur.RowVersion, "Restore curriculum"));
        Assert.Equal("draft", reactivatedCur.Status);

        // 7. Pagination & Search
        using var searchReq = new HttpRequestMessage(HttpMethod.Get, $"/api/v1/content/catalog/subjects?search={suffix}&page=1&pageSize=2&sort=code&direction=asc");
        searchReq.Headers.Authorization = new AuthenticationHeaderValue("Bearer", adminToken);
        var searchResp = await _client.SendAsync(searchReq);
        Assert.Equal(HttpStatusCode.OK, searchResp.StatusCode);
        var paged = await searchResp.Content.ReadFromJsonAsync<CatalogPagedResponseDto<CatalogSubjectDto>>(_jsonOptions);
        Assert.NotNull(paged);
        Assert.Equal(3, paged.Total);
        Assert.Equal(2, paged.Items.Count);

        // 8. Verify StaffAuditLogs recorded
        using var scope = _factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<StudyAIDbContext>();
        Assert.True(await db.StaffAuditLogs.AnyAsync(a => a.TargetId == editionWithSeries.Id && a.Action == "catalog_edition_archived"));

        // 9. Compatibility Mapping endpoint
        using var mapReq = new HttpRequestMessage(HttpMethod.Get, "/api/v1/content/catalog/compatibility-mapping");
        mapReq.Headers.Authorization = new AuthenticationHeaderValue("Bearer", adminToken);
        var mapResp = await _client.SendAsync(mapReq);
        Assert.Equal(HttpStatusCode.OK, mapResp.StatusCode);
    }

    private sealed class FailingAuditWriter : StudyAI.Common.Utilities.IAuditWriter
    {
        public Task WriteStaffAuditAsync(string action, string targetType, string? targetId = null, string? beforeState = null, string? afterState = null, System.Threading.CancellationToken cancellationToken = default)
            => throw new InvalidOperationException("Simulated audit sink failure");
    }

    [Fact]
    public async Task Catalog_ForcedAuditFailure_RollsBackBusinessMutation()
    {
        var adminToken = await LoginAsync("admin@studyai.internal", "Admin@123456");
        var uniqueCode = $"ROLLBACK_{Guid.NewGuid():N}"[..14].ToUpperInvariant();

        using var failingFactory = _factory.WithWebHostBuilder(builder =>
        {
            builder.ConfigureServices(services =>
            {
                var existing = System.Linq.Enumerable.FirstOrDefault(services, d => d.ServiceType == typeof(StudyAI.Common.Utilities.IAuditWriter));
                if (existing != null) services.Remove(existing);
                services.AddScoped<StudyAI.Common.Utilities.IAuditWriter, FailingAuditWriter>();
            });
        });
        using var failingClient = failingFactory.CreateClient();

        using var req = new HttpRequestMessage(HttpMethod.Post, "/api/v1/content/catalog/subjects")
        {
            Content = JsonContent.Create(new CreateCatalogSubjectRequestDto
            {
                Code = uniqueCode,
                Name = "Should Rollback On Audit Failure"
            })
        };
        req.Headers.Authorization = new AuthenticationHeaderValue("Bearer", adminToken);
        var resp = await failingClient.SendAsync(req);
        Assert.Equal(HttpStatusCode.InternalServerError, resp.StatusCode);

        using var scope = _factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<StudyAIDbContext>();
        Assert.False(await db.CatalogSubjects.AnyAsync(s => s.Code == uniqueCode));
    }

    [Fact]
    public async Task Catalog_ArchiveAndReactivate_RequireValidRowVersion_AcrossAllFiveEntities()
    {
        var adminToken = await LoginAsync("admin@studyai.internal", "Admin@123456");
        var sfx = Guid.NewGuid().ToString("N")[..6].ToUpperInvariant();

        var grade = await PostAuthAsync<GradeLevelDto>(adminToken, "/api/v1/content/catalog/grades",
            new CreateGradeLevelRequestDto { Code = $"RVG_{sfx}", Name = $"Grade {sfx}", OrderIndex = 1 });
        var subj = await PostAuthAsync<CatalogSubjectDto>(adminToken, "/api/v1/content/catalog/subjects",
            new CreateCatalogSubjectRequestDto { Code = $"RVS_{sfx}", Name = $"Subject {sfx}" });
        var cur = await PostAuthAsync<CurriculumDto>(adminToken, "/api/v1/content/catalog/curricula",
            new CreateCurriculumRequestDto { Code = $"RVC_{sfx}", GradeLevelId = grade.Id, SubjectId = subj.Id, Name = $"Cur {sfx}", Framework = "GDPT 2018" });
        var series = await PostAuthAsync<TextbookSeriesDto>(adminToken, "/api/v1/content/catalog/textbook-series",
            new CreateTextbookSeriesRequestDto { Code = $"RVT_{sfx}", Name = $"Series {sfx}", Publisher = "NXB" });
        var ed = await PostAuthAsync<CurriculumEditionDto>(adminToken, "/api/v1/content/catalog/editions",
            new CreateCurriculumEditionRequestDto { Code = $"RVE_{sfx}", CurriculumId = cur.Id, TextbookSeriesId = series.Id, EditionName = $"Ed {sfx}" });

        var targets = new (string Path, string RowVersion)[]
        {
            ($"/api/v1/content/catalog/editions/{ed.Id}", ed.RowVersion),
            ($"/api/v1/content/catalog/textbook-series/{series.Id}", series.RowVersion),
            ($"/api/v1/content/catalog/curricula/{cur.Id}", cur.RowVersion),
            ($"/api/v1/content/catalog/subjects/{subj.Id}", subj.RowVersion),
            ($"/api/v1/content/catalog/grades/{grade.Id}", grade.RowVersion),
        };

        var staleToken = Convert.ToBase64String(new byte[] { 1, 2, 3, 4, 5, 6, 7, 8 });
        var archivedVersions = new List<(string BasePath, string StaleRv, string ArchivedRv)>();

        // Archive child-to-parent: missing -> 400, malformed -> 400, stale -> 409, valid -> 200
        foreach (var (basePath, validRv) in targets)
        {
            using var missingReq = new HttpRequestMessage(HttpMethod.Post, $"{basePath}/archive")
            {
                Content = new StringContent("{}", System.Text.Encoding.UTF8, "application/json")
            };
            missingReq.Headers.Authorization = new AuthenticationHeaderValue("Bearer", adminToken);
            Assert.Equal(HttpStatusCode.BadRequest, (await _client.SendAsync(missingReq)).StatusCode);

            using var malformedReq = new HttpRequestMessage(HttpMethod.Post, $"{basePath}/archive")
            {
                Content = JsonContent.Create(new CatalogStatusActionDto("not-valid-base64!!!"))
            };
            malformedReq.Headers.Authorization = new AuthenticationHeaderValue("Bearer", adminToken);
            Assert.Equal(HttpStatusCode.BadRequest, (await _client.SendAsync(malformedReq)).StatusCode);

            using var staleReq = new HttpRequestMessage(HttpMethod.Post, $"{basePath}/archive")
            {
                Content = JsonContent.Create(new CatalogStatusActionDto(staleToken))
            };
            staleReq.Headers.Authorization = new AuthenticationHeaderValue("Bearer", adminToken);
            Assert.Equal(HttpStatusCode.Conflict, (await _client.SendAsync(staleReq)).StatusCode);

            using var okArchive = new HttpRequestMessage(HttpMethod.Post, $"{basePath}/archive")
            {
                Content = JsonContent.Create(new CatalogStatusActionDto(validRv))
            };
            okArchive.Headers.Authorization = new AuthenticationHeaderValue("Bearer", adminToken);
            var okArchiveResp = await _client.SendAsync(okArchive);
            Assert.Equal(HttpStatusCode.OK, okArchiveResp.StatusCode);
            var archivedJson = await okArchiveResp.Content.ReadFromJsonAsync<JsonElement>(_jsonOptions);
            var newRv = archivedJson.GetProperty("rowVersion").GetString()!;
            archivedVersions.Add((basePath, validRv, newRv));
        }

        // Reactivate parent-to-child: missing -> 400, stale -> 409, valid -> 200
        for (int i = archivedVersions.Count - 1; i >= 0; i--)
        {
            var (basePath, staleRv, archivedRv) = archivedVersions[i];

            using var missingReactivate = new HttpRequestMessage(HttpMethod.Post, $"{basePath}/reactivate")
            {
                Content = new StringContent("{}", System.Text.Encoding.UTF8, "application/json")
            };
            missingReactivate.Headers.Authorization = new AuthenticationHeaderValue("Bearer", adminToken);
            Assert.Equal(HttpStatusCode.BadRequest, (await _client.SendAsync(missingReactivate)).StatusCode);

            using var staleReactivate = new HttpRequestMessage(HttpMethod.Post, $"{basePath}/reactivate")
            {
                Content = JsonContent.Create(new CatalogStatusActionDto(staleRv))
            };
            staleReactivate.Headers.Authorization = new AuthenticationHeaderValue("Bearer", adminToken);
            Assert.Equal(HttpStatusCode.Conflict, (await _client.SendAsync(staleReactivate)).StatusCode);

            using var okReactivate = new HttpRequestMessage(HttpMethod.Post, $"{basePath}/reactivate")
            {
                Content = JsonContent.Create(new CatalogStatusActionDto(archivedRv))
            };
            okReactivate.Headers.Authorization = new AuthenticationHeaderValue("Bearer", adminToken);
            Assert.Equal(HttpStatusCode.OK, (await _client.SendAsync(okReactivate)).StatusCode);
        }
    }

    [Fact]
    public async Task Catalog_Update_PreservesOmittedYearsOnPatch_AndClearsExplicitly()
    {
        var adminToken = await LoginAsync("admin@studyai.internal", "Admin@123456");
        var sfx = Guid.NewGuid().ToString("N")[..6].ToUpperInvariant();

        var grade = await PostAuthAsync<GradeLevelDto>(adminToken, "/api/v1/content/catalog/grades",
            new CreateGradeLevelRequestDto { Code = $"YRG_{sfx}", Name = $"Grade {sfx}", OrderIndex = 1 });
        var subj = await PostAuthAsync<CatalogSubjectDto>(adminToken, "/api/v1/content/catalog/subjects",
            new CreateCatalogSubjectRequestDto { Code = $"YRS_{sfx}", Name = $"Subject {sfx}" });
        var cur = await PostAuthAsync<CurriculumDto>(adminToken, "/api/v1/content/catalog/curricula",
            new CreateCurriculumRequestDto
            {
                Code = $"YRC_{sfx}",
                GradeLevelId = grade.Id,
                SubjectId = subj.Id,
                Name = $"Cur {sfx}",
                Framework = "GDPT 2018",
                AcademicYearFrom = 2024,
                AcademicYearTo = 2027
            });
        var ed = await PostAuthAsync<CurriculumEditionDto>(adminToken, "/api/v1/content/catalog/editions",
            new CreateCurriculumEditionRequestDto
            {
                Code = $"YRE_{sfx}",
                CurriculumId = cur.Id,
                EditionName = $"Ed {sfx}",
                PublicationYear = 2025
            });

        using var patchCurReq = new HttpRequestMessage(HttpMethod.Patch, $"/api/v1/content/catalog/curricula/{cur.Id}")
        {
            Content = JsonContent.Create(new { name = $"Cur Updated {sfx}", rowVersion = cur.RowVersion })
        };
        patchCurReq.Headers.Authorization = new AuthenticationHeaderValue("Bearer", adminToken);
        var patchCurResp = await _client.SendAsync(patchCurReq);
        Assert.Equal(HttpStatusCode.OK, patchCurResp.StatusCode);
        var patchedCur = await patchCurResp.Content.ReadFromJsonAsync<CurriculumDto>(_jsonOptions)!;
        Assert.Equal(2024, patchedCur!.AcademicYearFrom);
        Assert.Equal(2027, patchedCur.AcademicYearTo);

        using var clearCurReq = new HttpRequestMessage(HttpMethod.Patch, $"/api/v1/content/catalog/curricula/{cur.Id}")
        {
            Content = JsonContent.Create(new UpdateCurriculumRequestDto
            {
                ClearAcademicYearFrom = true,
                ClearAcademicYearTo = true,
                RowVersion = patchedCur.RowVersion
            })
        };
        clearCurReq.Headers.Authorization = new AuthenticationHeaderValue("Bearer", adminToken);
        var clearCurResp = await _client.SendAsync(clearCurReq);
        Assert.Equal(HttpStatusCode.OK, clearCurResp.StatusCode);
        var clearedCur = await clearCurResp.Content.ReadFromJsonAsync<CurriculumDto>(_jsonOptions)!;
        Assert.Null(clearedCur!.AcademicYearFrom);
        Assert.Null(clearedCur.AcademicYearTo);

        using var patchEdReq = new HttpRequestMessage(HttpMethod.Patch, $"/api/v1/content/catalog/editions/{ed.Id}")
        {
            Content = JsonContent.Create(new { editionName = $"Ed Updated {sfx}", rowVersion = ed.RowVersion })
        };
        patchEdReq.Headers.Authorization = new AuthenticationHeaderValue("Bearer", adminToken);
        var patchEdResp = await _client.SendAsync(patchEdReq);
        Assert.Equal(HttpStatusCode.OK, patchEdResp.StatusCode);
        var patchedEd = await patchEdResp.Content.ReadFromJsonAsync<CurriculumEditionDto>(_jsonOptions)!;
        Assert.Equal(2025, patchedEd!.PublicationYear);

        using var clearEdReq = new HttpRequestMessage(HttpMethod.Patch, $"/api/v1/content/catalog/editions/{ed.Id}")
        {
            Content = JsonContent.Create(new UpdateCurriculumEditionRequestDto
            {
                ClearPublicationYear = true,
                RowVersion = patchedEd.RowVersion
            })
        };
        clearEdReq.Headers.Authorization = new AuthenticationHeaderValue("Bearer", adminToken);
        var clearEdResp = await _client.SendAsync(clearEdReq);
        Assert.Equal(HttpStatusCode.OK, clearEdResp.StatusCode);
        var clearedEd = await clearEdResp.Content.ReadFromJsonAsync<CurriculumEditionDto>(_jsonOptions)!;
        Assert.Null(clearedEd!.PublicationYear);
    }

    private async Task<T> PostAuthAsync<T>(string token, string url, object body)
    {
        using var req = new HttpRequestMessage(HttpMethod.Post, url) { Content = JsonContent.Create(body) };
        req.Headers.Authorization = new AuthenticationHeaderValue("Bearer", token);
        var resp = await _client.SendAsync(req);
        var raw = await resp.Content.ReadAsStringAsync();
        Assert.True(resp.IsSuccessStatusCode, $"POST {url} failed with {resp.StatusCode}: {raw}");
        return JsonSerializer.Deserialize<T>(raw, _jsonOptions)!;
    }

    private async Task<T> PutAuthAsync<T>(string token, string url, object body)
    {
        using var req = new HttpRequestMessage(HttpMethod.Put, url) { Content = JsonContent.Create(body) };
        req.Headers.Authorization = new AuthenticationHeaderValue("Bearer", token);
        var resp = await _client.SendAsync(req);
        var raw = await resp.Content.ReadAsStringAsync();
        Assert.True(resp.IsSuccessStatusCode, $"PUT {url} failed with {resp.StatusCode}: {raw}");
        return JsonSerializer.Deserialize<T>(raw, _jsonOptions)!;
    }
}

using System;
using System.Collections.Generic;
using System.Threading;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using StudyAI.Common.Exceptions;
using StudyAI.Common.Utilities;
using StudyAI.Data;
using StudyAI.Features.Content;
using StudyAI.Models;
using Xunit;

namespace StudyAI.UnitTests;

public class ContentCatalogServiceUnitTests
{
    private sealed class StubAuditWriter : IAuditWriter
    {
        public List<(string Action, string TargetType, string? TargetId)> Calls { get; } = new();

        public Task WriteStaffAuditAsync(string action, string targetType, string? targetId = null, string? beforeState = null, string? afterState = null, CancellationToken cancellationToken = default)
        {
            Calls.Add((action, targetType, targetId));
            return Task.CompletedTask;
        }
    }

    private sealed class FixedClock : IClock
    {
        public DateTimeOffset UtcNow => new(2026, 11, 25, 9, 30, 0, TimeSpan.Zero);
    }

    private static (StudyAIDbContext Db, ContentCatalogService Service, StubAuditWriter Audit) CreateContext()
    {
        var options = new DbContextOptionsBuilder<StudyAIDbContext>()
            .UseInMemoryDatabase($"CatalogUnit_{Guid.NewGuid():N}")
            .Options;
        var db = new StudyAIDbContext(options);
        var audit = new StubAuditWriter();
        var service = new ContentCatalogService(db, audit, new FixedClock());
        return (db, service, audit);
    }

    [Fact]
    public async Task CreateGradeAndSubject_NormalizesCode_AndStartsInDraft()
    {
        var (db, service, audit) = CreateContext();
        await using var _ = db;

        var grade = await service.CreateGradeLevelAsync(
            new CreateGradeLevelRequestDto { Code = " 10 ", Name = " Lớp 10 ", OrderIndex = 10 },
            "admin_1");

        var subject = await service.CreateSubjectAsync(
            new CreateCatalogSubjectRequestDto { Code = " hist ", Name = " Lịch sử ", Description = " GDPT 2018 " },
            "admin_1");

        Assert.Equal("10", grade.Code);
        Assert.Equal("Lớp 10", grade.Name);
        Assert.Equal("draft", grade.Status);
        Assert.Equal("HIST", subject.Code);
        Assert.Equal("draft", subject.Status);
        Assert.Equal(2, audit.Calls.Count);
    }

    [Fact]
    public async Task CreateGrade_WithSpacesInCode_ThrowsValidationException()
    {
        var (db, service, _) = CreateContext();
        await using var _ = db;

        await Assert.ThrowsAsync<ValidationException>(() =>
            service.CreateGradeLevelAsync(new CreateGradeLevelRequestDto { Code = "LOP 10", Name = "Lớp 10" }, "admin_1"));
    }

    [Fact]
    public async Task CreateCurriculum_InvalidAcademicYearRange_ThrowsValidationException()
    {
        var (db, service, _) = CreateContext();
        await using var _ = db;

        var g = await service.CreateGradeLevelAsync(new CreateGradeLevelRequestDto { Code = "10", Name = "Lớp 10" }, "admin_1");
        var s = await service.CreateSubjectAsync(new CreateCatalogSubjectRequestDto { Code = "BIO", Name = "Sinh học" }, "admin_1");

        await Assert.ThrowsAsync<ValidationException>(() =>
            service.CreateCurriculumAsync(new CreateCurriculumRequestDto
            {
                Code = "CUR_BIO_10",
                GradeLevelId = g.Id,
                SubjectId = s.Id,
                Name = "Sinh học 10",
                Framework = "GDPT 2018",
                AcademicYearFrom = 2026,
                AcademicYearTo = 2025
            }, "admin_1"));

        await Assert.ThrowsAsync<ValidationException>(() =>
            service.CreateCurriculumAsync(new CreateCurriculumRequestDto
            {
                Code = "CUR_BIO_10_BAD",
                GradeLevelId = g.Id,
                SubjectId = s.Id,
                Name = "Sinh học 10",
                Framework = "GDPT 2018",
                AcademicYearFrom = 1800
            }, "admin_1"));
    }

    [Fact]
    public async Task ListSubjects_ClampsPaging_AndFiltersInvalidStatus()
    {
        var (db, service, _) = CreateContext();
        await using var _ = db;

        var pageResult = await service.ListSubjectsAsync(new CatalogListQueryDto(Page: -3, PageSize: 500));
        Assert.Equal(1, pageResult.Page);
        Assert.Equal(100, pageResult.PageSize);

        await Assert.ThrowsAsync<ValidationException>(() =>
            service.ListSubjectsAsync(new CatalogListQueryDto(Status: "invalid_status")));
    }

    [Fact]
    public async Task CompatibilityMapping_DetectsMappedUnmappedAndConflicts_WithoutMutatingData()
    {
        var (db, service, _) = CreateContext();
        await using var _ = db;

        var g10 = await service.CreateGradeLevelAsync(new CreateGradeLevelRequestDto { Code = "10", Name = "Lớp 10", OrderIndex = 10 }, "admin_1");
        var math = await service.CreateSubjectAsync(new CreateCatalogSubjectRequestDto { Code = "MATH", Name = "Toán học" }, "admin_1");
        await service.CreateCurriculumAsync(new CreateCurriculumRequestDto
        {
            Code = "CUR_MATH_10",
            GradeLevelId = g10.Id,
            SubjectId = math.Id,
            Name = "Toán 10",
            Framework = "GDPT 2018"
        }, "admin_1");

        db.ContentSubjects.AddRange(
            new ContentSubject { Id = "sub_math10", Code = "MATH10", Name = "Toán 10", Grade = "10" },
            new ContentSubject { Id = "sub_hist11", Code = "HIST11", Name = "Lịch sử 11", Grade = "11" },
            new ContentSubject { Id = "sub_conflict", Code = "BIO12", Name = "Sinh học", Grade = "10" }
        );
        await db.SaveChangesAsync();

        var report = await service.GetCompatibilityMappingReportAsync();

        Assert.Equal(3, report.LegacySubjectCount);
        Assert.Equal(1, report.MappedCount);
        Assert.Equal(1, report.UnmappedCount);
        Assert.Equal(1, report.ConflictCount);
        Assert.Contains(report.Candidates, c => c.LegacySubjectId == "sub_math10" && c.MappingStatus == "mapped");
        Assert.Contains(report.Candidates, c => c.LegacySubjectId == "sub_hist11" && c.MappingStatus == "unmapped");
        Assert.Contains(report.Candidates, c => c.LegacySubjectId == "sub_conflict" && c.MappingStatus == "conflict");
    }
}

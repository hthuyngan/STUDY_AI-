using System.IO.Compression;
using System.Text;
using StudyAI.Application.Common.Interfaces;
using StudyAI.Application.DTOs;
using StudyAI.Application.Services;
using Xunit;

namespace StudyAI.UnitTests;

public class CurriculumImportParserTests
{
    private readonly CurriculumImportParser _parser = new();

    [Fact]
    public async Task ParseJson_ValidHierarchicalSubject_ReturnsExpectedHierarchy()
    {
        var json = """
        {
          "subjects": [
            {
              "code": "MATH12",
              "name": "Toán học 12",
              "grade": "12",
              "chapters": [
                {
                  "code": "MATH12_CH1",
                  "title": "Chương 1: Ứng dụng đạo hàm",
                  "lessons": [
                    {
                      "code": "MATH12_CH1_LES1",
                      "title": "Tính đơn điệu của hàm số",
                      "slug": "tinh-don-dieu-cua-ham-so",
                      "definitions": [
                        { "term": "Hàm số đồng biến", "content": "Hàm số f đồng biến trên K nếu..." }
                      ],
                      "formulas": [
                        { "name": "Đạo hàm dương", "latex": "f'(x) \\ge 0" }
                      ],
                      "questions": [
                        {
                          "prompt": "Cho hàm số $y=f(x)$ có đạo hàm $f'(x)>0$. Hàm số:",
                          "options": ["Đồng biến", "Nghịch biến", "Không đổi", "Không xác định"],
                          "correctAnswer": "A",
                          "difficulty": "easy"
                        }
                      ]
                    }
                  ]
                }
              ]
            }
          ]
        }
        """;

        using var ms = new MemoryStream(Encoding.UTF8.GetBytes(json));
        var batch = await _parser.ParseAsync(ms, "curriculum.json");

        Assert.Equal(ImportFileFormat.Json, batch.SourceFormat);
        Assert.Single(batch.Subjects);
        var sub = batch.Subjects[0];
        Assert.Equal("MATH12", sub.Code);
        Assert.Single(sub.Chapters);
        var ch = sub.Chapters[0];
        Assert.Equal("MATH12_CH1", ch.Code);
        Assert.Single(ch.Lessons);
        var les = ch.Lessons[0];
        Assert.Equal("MATH12_CH1_LES1", les.Code);
        Assert.Single(les.Definitions);
        Assert.Single(les.Formulas);
        Assert.Single(les.Questions);
    }

    [Fact]
    public async Task ParseJson_ValidFlatQuestionBank_ReturnsFlatQuestions()
    {
        var json = """
        {
          "questions": [
            {
              "subjectCode": "MATH12",
              "lessonCode": "MATH12_CH1_LES1",
              "prompt": "Tính đạo hàm của $y=x^3$:",
              "options": ["$3x^2$", "$x^2$", "$3x$", "$x^3/3$"],
              "correctAnswer": "A",
              "difficulty": "medium",
              "type": "multiple-choice"
            }
          ]
        }
        """;

        using var ms = new MemoryStream(Encoding.UTF8.GetBytes(json));
        var batch = await _parser.ParseAsync(ms, "questions.json");

        Assert.Single(batch.FlatQuestions);
        var q = batch.FlatQuestions[0];
        Assert.Equal("MATH12", q.SubjectCode);
        Assert.Equal("MATH12_CH1_LES1", q.LessonCode);
        Assert.Equal("A", q.CorrectAnswer);
        Assert.Equal(4, q.Options.Count);
    }

    [Fact]
    public async Task ParseCsv_CommaDelimited_ParsesProperly()
    {
        var csv = """
        subjectCode,lessonCode,prompt,options,correctAnswer,difficulty,type,explanation
        MATH12,MATH12_CH1_LES1,"Hàm số $y = 2x + 1$ đồng biến trên khoảng nào?","A. $\mathbb{R}$ | B. $(0; +\infty)$ | C. $(-\infty; 0)$ | D. $\emptyset$",A,easy,multiple-choice,"Hệ số $a=2>0$ nên đồng biến trên $\mathbb{R}$."
        """;

        using var ms = new MemoryStream(Encoding.UTF8.GetBytes(csv));
        var batch = await _parser.ParseAsync(ms, "questions.csv");

        Assert.Single(batch.FlatQuestions);
        var q = batch.FlatQuestions[0];
        Assert.Equal("MATH12", q.SubjectCode);
        Assert.Equal(4, q.Options.Count);
        Assert.Equal("A", q.CorrectAnswer);
    }

    [Fact]
    public async Task ParseCsv_SemicolonDelimited_AutoDetectsDelimiter()
    {
        var csv = "subjectCode;lessonCode;prompt;options;correctAnswer;difficulty;type\nMATH12;MATH12_LES1;Prompt 1;A | B;A;easy;multiple-choice";

        using var ms = new MemoryStream(Encoding.UTF8.GetBytes(csv));
        var batch = await _parser.ParseAsync(ms, "questions_semi.csv");

        Assert.Single(batch.FlatQuestions);
        var q = batch.FlatQuestions[0];
        Assert.Equal("MATH12", q.SubjectCode);
        Assert.Equal(2, q.Options.Count);
    }

    [Fact]
    public async Task ParseCsv_FormulaInjection_StripsDangerousLeadingPrefixes()
    {
        var csv = "subjectCode,lessonCode,prompt,options,correctAnswer,difficulty,type\nMATH12,LES1,\"'=cmd|' /C calc'!A0\",A | B,A,easy,multiple-choice";

        using var ms = new MemoryStream(Encoding.UTF8.GetBytes(csv));
        var batch = await _parser.ParseAsync(ms, "injection.csv");

        Assert.Single(batch.FlatQuestions);
        var q = batch.FlatQuestions[0];
        // Must not start with dangerous formula triggers =, +, -, @
        Assert.False(q.Prompt.StartsWith("="));
        Assert.False(q.Prompt.StartsWith("+"));
        Assert.False(q.Prompt.StartsWith("@"));
    }

    [Fact]
    public async Task ParseXlsx_SimpleSpreadsheet_ParsesWorksheetRows()
    {
        // Build a minimal valid XLSX zip archive in-memory
        using var ms = new MemoryStream();
        using (var archive = new ZipArchive(ms, ZipArchiveMode.Create, true))
        {
            // [Content_Types].xml
            var ctEntry = archive.CreateEntry("[Content_Types].xml");
            using (var writer = new StreamWriter(ctEntry.Open()))
            {
                writer.Write("""
                <?xml version="1.0" encoding="UTF-8" standalone="yes"?>
                <Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
                  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
                  <Default Extension="xml" ContentType="application/xml"/>
                  <Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>
                  <Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>
                  <Override PartName="/xl/sharedStrings.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sharedStringItem+xml"/>
                </Types>
                """);
            }

            // xl/sharedStrings.xml
            var ssEntry = archive.CreateEntry("xl/sharedStrings.xml");
            using (var writer = new StreamWriter(ssEntry.Open()))
            {
                writer.Write("""
                <?xml version="1.0" encoding="UTF-8" standalone="yes"?>
                <sst xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" count="7" uniqueCount="7">
                  <si><t>subjectCode</t></si>
                  <si><t>lessonCode</t></si>
                  <si><t>prompt</t></si>
                  <si><t>options</t></si>
                  <si><t>correctAnswer</t></si>
                  <si><t>MATH12</t></si>
                  <si><t>A | B | C | D</t></si>
                </sst>
                """);
            }

            // xl/worksheets/sheet1.xml
            var sheetEntry = archive.CreateEntry("xl/worksheets/sheet1.xml");
            using (var writer = new StreamWriter(sheetEntry.Open()))
            {
                writer.Write("""
                <?xml version="1.0" encoding="UTF-8" standalone="yes"?>
                <worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
                  <sheetData>
                    <row r="1">
                      <c r="A1" t="s"><v>0</v></c>
                      <c r="B1" t="s"><v>1</v></c>
                      <c r="C1" t="s"><v>2</v></c>
                      <c r="D1" t="s"><v>3</v></c>
                      <c r="E1" t="s"><v>4</v></c>
                    </row>
                    <row r="2">
                      <c r="A2" t="s"><v>5</v></c>
                      <c r="B2" t="inlineStr"><is><t>LES01</t></is></c>
                      <c r="C2" t="inlineStr"><is><t>Cau hoi tinh dao ham $y=x^2$</t></is></c>
                      <c r="D2" t="s"><v>6</v></c>
                      <c r="E2" t="inlineStr"><is><t>A</t></is></c>
                    </row>
                  </sheetData>
                </worksheet>
                """);
            }
        }

        ms.Position = 0;
        var batch = await _parser.ParseAsync(ms, "bank.xlsx");

        Assert.Equal(ImportFileFormat.Xlsx, batch.SourceFormat);
        Assert.Single(batch.FlatQuestions);
        var q = batch.FlatQuestions[0];
        Assert.Equal("MATH12", q.SubjectCode);
        Assert.Equal("LES01", q.LessonCode);
        Assert.Contains("dao ham", q.Prompt);
        Assert.Equal("A", q.CorrectAnswer);
    }

    [Fact]
    public async Task Parse_Exceeds15MbLimit_ThrowsInvalidOperationException()
    {
        // Allocate a dummy stream reporting > 15MB
        var largeStream = new MemoryStream(new byte[16 * 1024 * 1024]);
        await Assert.ThrowsAsync<InvalidOperationException>(() => _parser.ParseAsync(largeStream, "huge.csv"));
    }
}

public class CurriculumImportValidatorTests
{
    private class TestCurriculumImportValidator : CurriculumImportValidator
    {
        private readonly ExistingContentLookup _lookup;

        public TestCurriculumImportValidator(ExistingContentLookup lookup) : base(null)
        {
            _lookup = lookup;
        }

        protected override Task<ExistingContentLookup> LoadExistingContentLookupAsync(CancellationToken cancellationToken)
        {
            return Task.FromResult(_lookup);
        }
    }

    private static TestCurriculumImportValidator CreateValidator(ExistingContentLookup? lookup = null)
    {
        return new TestCurriculumImportValidator(lookup ?? new ExistingContentLookup());
    }

    [Theory]
    [InlineData("Đạo hàm của hàm số $y=f(x)$ là $f'(x)$.")]
    [InlineData("Phương trình bậc 2: $ax^2 + bx + c = 0$ với $a \\ne 0$.")]
    [InlineData("Tích phân: $$\\int_{0}^{1} x dx = \\frac{1}{2}$$")]
    [InlineData("Giá trị biểu thức: \\$100 đô la.")]
    [InlineData("Tập hợp $S = \\{x \\in \\mathbb{R} | x > 0\\}$.")]
    public void ValidateKaTeX_BalancedFormulas_ReturnsTrue(string text)
    {
        var validator = CreateValidator();
        bool ok = validator.ValidateKaTeX(text, out var error);
        Assert.True(ok, error);
        Assert.Null(error);
    }

    [Theory]
    [InlineData("Hàm số $y=f(x) không có dollar đóng")]
    [InlineData("Công thức $f(x) = {x + 1$ thiếu ngoặc nhọn")]
    [InlineData("Công thức $f(x) = x + 1}$ thừa ngoặc đóng")]
    public void ValidateKaTeX_UnbalancedFormulas_ReturnsFalse(string text)
    {
        var validator = CreateValidator();
        bool ok = validator.ValidateKaTeX(text, out var error);
        Assert.False(ok);
        Assert.NotNull(error);
    }

    [Theory]
    [InlineData("<script>alert('xss')</script>")]
    [InlineData("<iframe src='evil.com'></iframe>")]
    [InlineData("<img src='x' onerror='alert(1)'>")]
    [InlineData("javascript:alert(1)")]
    public void DetectMaliciousPayload_XssAttempts_ReturnsTrue(string text)
    {
        var validator = CreateValidator();
        bool detected = validator.DetectMaliciousPayload(text, out var error);
        Assert.True(detected);
        Assert.NotNull(error);
    }

    [Fact]
    public void SanitizeText_StripsDangerousScripts()
    {
        var validator = CreateValidator();
        var dirty = "Định nghĩa <script>alert(1)</script>đạo hàm";
        var clean = validator.SanitizeText(dirty);
        Assert.DoesNotContain("<script>", clean);
    }

    [Fact]
    public async Task ValidateBatchAsync_MissingRequiredFields_ReturnsValidationErrors()
    {
        var validator = CreateValidator();
        var batch = new CurriculumImportBatchDto
        {
            Subjects = new List<ImportSubjectItemDto>
            {
                new()
                {
                    Code = "", // Missing code
                    Name = "", // Missing name
                    Chapters = new List<ImportChapterItemDto>
                    {
                        new()
                        {
                            Code = "",
                            Title = ""
                        }
                    }
                }
            }
        };

        var result = await validator.ValidateBatchAsync(batch);

        Assert.False(result.IsValid);
        Assert.Contains(result.Errors, e => e.Field == "Subject.Code");
        Assert.Contains(result.Errors, e => e.Field == "Subject.Name");
        Assert.Contains(result.Errors, e => e.Field == "Chapter.Code");
        Assert.Contains(result.Errors, e => e.Field == "Chapter.Title");
    }

    [Fact]
    public async Task ValidateBatchAsync_InvalidEnumDifficultyAndType_ReturnsErrors()
    {
        var validator = CreateValidator();
        var batch = new CurriculumImportBatchDto
        {
            FlatQuestions = new List<ImportQuestionItemDto>
            {
                new()
                {
                    SubjectCode = "MATH12",
                    Prompt = "Câu hỏi kiểm tra",
                    Options = new List<string> { "A", "B", "C", "D" },
                    CorrectAnswer = "A",
                    Difficulty = "super-hard", // Invalid enum
                    Type = "unknown-type"      // Invalid enum
                }
            }
        };

        var result = await validator.ValidateBatchAsync(batch);

        Assert.Contains(result.Errors, e => e.Field == "Difficulty" && e.ErrorCode == "INVALID_ENUM_VALUE");
        Assert.Contains(result.Errors, e => e.Field == "Type" && e.ErrorCode == "INVALID_ENUM_VALUE");
    }

    [Fact]
    public async Task ValidateBatchAsync_DuplicateQuestionInBatch_DetectsConflict()
    {
        var validator = CreateValidator();
        var q1 = new ImportQuestionItemDto
        {
            SubjectCode = "MATH12",
            LessonCode = "LES1",
            Prompt = "Cho hàm số $y=f(x)$, tìm đạo hàm tại $x=0$",
            Options = new List<string> { "0", "1", "2", "3" },
            CorrectAnswer = "A"
        };
        var q2 = new ImportQuestionItemDto
        {
            SubjectCode = "MATH12",
            LessonCode = "LES1",
            Prompt = "Cho hàm số $y=f(x)$,  tìm đạo hàm tại $x=0$", // Same normalized prompt
            Options = new List<string> { "0", "1", "2", "3" },
            CorrectAnswer = "A"
        };

        var batch = new CurriculumImportBatchDto
        {
            FlatQuestions = new List<ImportQuestionItemDto> { q1, q2 }
        };

        var result = await validator.ValidateBatchAsync(batch);

        Assert.False(result.IsValid);
        Assert.Contains(result.Errors, e => e.ErrorCode == "DUPLICATE_QUESTION_IN_FILE");
        Assert.Equal(1, result.Summary.ConflictCount);
    }

    [Fact]
    public async Task ValidateBatchAsync_ExistingEntityInDb_MarksActionAsUpdate()
    {
        var lookup = new ExistingContentLookup
        {
            Subjects = new List<ExistingSubjectLookup>
            {
                new("sub-1", "MATH12", "Toán 12", "12")
            }
        };

        var validator = CreateValidator(lookup);
        var batch = new CurriculumImportBatchDto
        {
            Subjects = new List<ImportSubjectItemDto>
            {
                new()
                {
                    Code = "MATH12",
                    Name = "Toán học 12 - Chương trình mới",
                    Grade = "12"
                }
            }
        };

        var result = await validator.ValidateBatchAsync(batch);

        Assert.True(result.IsValid);
        Assert.Equal(1, result.Summary.UpdateCount);
        Assert.Equal(0, result.Summary.InsertCount);
        var item = Assert.Single(result.Previews);
        Assert.Equal(ImportActionType.Update, item.Action);
    }

    [Fact]
    public async Task ValidateBatchAsync_NewEntity_MarksActionAsInsert()
    {
        var validator = CreateValidator(new ExistingContentLookup());
        var batch = new CurriculumImportBatchDto
        {
            Subjects = new List<ImportSubjectItemDto>
            {
                new()
                {
                    Code = "PHYS12",
                    Name = "Vật lý 12",
                    Grade = "12"
                }
            }
        };

        var result = await validator.ValidateBatchAsync(batch);

        Assert.True(result.IsValid);
        Assert.Equal(1, result.Summary.InsertCount);
        Assert.Equal(0, result.Summary.UpdateCount);
        var item = Assert.Single(result.Previews);
        Assert.Equal(ImportActionType.Insert, item.Action);
    }
}

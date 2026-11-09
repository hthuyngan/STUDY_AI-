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

    #region Priority 1 Regression: Math content starting with minus or plus is NOT altered

    [Fact]
    public async Task Parse_MathExpressionsStartingWithMinusOrPlus_NotAltered()
    {
        var csv = """
        subjectCode,lessonCode,prompt,options,correctAnswer,difficulty,type
        MATH12,LES1,"-3x^2 + 2x - 1 = 0 có bao nhiêu nghiệm?","-5 | +2 | -1/2 | 0",A,easy,multiple-choice
        """;

        using var ms = new MemoryStream(Encoding.UTF8.GetBytes(csv));
        var batch = await _parser.ParseAsync(ms, "math_signs.csv");

        Assert.Single(batch.FlatQuestions);
        var q = batch.FlatQuestions[0];

        // Ensure leading minus and plus signs are completely preserved, not stripped and not prefixed with apostrophe
        Assert.StartsWith("-3x^2", q.Prompt);
        Assert.False(q.Prompt.StartsWith("'"));
        Assert.Equal("-5", q.Options[0]);
        Assert.Equal("+2", q.Options[1]);
        Assert.Equal("-1/2", q.Options[2]);
        Assert.Equal("0", q.Options[3]);
    }

    [Fact]
    public void CleanExcelEscapedQuotes_StripsExcelEscapingApostropheOnly()
    {
        // When Excel exports a formula as text, e.g. '=SUM(A1:A5)
        var unescaped = CurriculumImportParser.CleanExcelEscapedQuotes("'-3x + 1");
        Assert.Equal("-3x + 1", unescaped);

        // When content does NOT start with apostrophe, it remains identical
        var standard = CurriculumImportParser.CleanExcelEscapedQuotes("-3x + 1");
        Assert.Equal("-3x + 1", standard);

        var plusStandard = CurriculumImportParser.CleanExcelEscapedQuotes("+5");
        Assert.Equal("+5", plusStandard);
    }

    #endregion

    #region Priority 2 Regression: XLSX Multi-sheet and Sparse Column Indexing

    [Fact]
    public async Task ParseXlsx_SparseColumns_MapsToCorrectHeaders()
    {
        // Tests that when column B is missing (only A and C are present),
        // C is mapped to index 2 and not shifted to index 1.
        using var ms = new MemoryStream();
        using (var archive = new ZipArchive(ms, ZipArchiveMode.Create, true))
        {
            var ct = archive.CreateEntry("[Content_Types].xml");
            using (var w = new StreamWriter(ct.Open()))
            {
                w.Write("""
                <?xml version="1.0" encoding="UTF-8" standalone="yes"?>
                <Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
                  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
                  <Default Extension="xml" ContentType="application/xml"/>
                  <Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>
                  <Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>
                </Types>
                """);
            }

            var sheet = archive.CreateEntry("xl/worksheets/sheet1.xml");
            using (var w = new StreamWriter(sheet.Open()))
            {
                // Row 1: A1 = subjectCode, B1 = (empty), C1 = prompt, D1 = options, E1 = correctAnswer
                // Row 2: A2 = MATH12, C2 = Sparse prompt test, D2 = Opt1 | Opt2, E2 = A
                w.Write("""
                <?xml version="1.0" encoding="UTF-8" standalone="yes"?>
                <worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
                  <sheetData>
                    <row r="1">
                      <c r="A1" t="inlineStr"><is><t>subjectCode</t></is></c>
                      <c r="C1" t="inlineStr"><is><t>prompt</t></is></c>
                      <c r="D1" t="inlineStr"><is><t>options</t></is></c>
                      <c r="E1" t="inlineStr"><is><t>correctAnswer</t></is></c>
                    </row>
                    <row r="2">
                      <c r="A2" t="inlineStr"><is><t>MATH12</t></is></c>
                      <c r="C2" t="inlineStr"><is><t>Sparse prompt test</t></is></c>
                      <c r="D2" t="inlineStr"><is><t>Opt1 | Opt2</t></is></c>
                      <c r="E2" t="inlineStr"><is><t>A</t></is></c>
                    </row>
                  </sheetData>
                </worksheet>
                """);
            }
        }

        ms.Position = 0;
        var batch = await _parser.ParseAsync(ms, "sparse.xlsx");

        Assert.Single(batch.FlatQuestions);
        var q = batch.FlatQuestions[0];
        Assert.Equal("MATH12", q.SubjectCode);
        Assert.Equal("Sparse prompt test", q.Prompt);
        Assert.Equal("A", q.CorrectAnswer);
    }

    [Fact]
    public void GetColumnIndexFromCellReference_ConvertsAccurately()
    {
        Assert.Equal(0, CurriculumImportParser.GetColumnIndexFromCellReference("A1"));
        Assert.Equal(1, CurriculumImportParser.GetColumnIndexFromCellReference("B10"));
        Assert.Equal(2, CurriculumImportParser.GetColumnIndexFromCellReference("C5"));
        Assert.Equal(25, CurriculumImportParser.GetColumnIndexFromCellReference("Z1"));
        Assert.Equal(26, CurriculumImportParser.GetColumnIndexFromCellReference("AA1"));
        Assert.Equal(27, CurriculumImportParser.GetColumnIndexFromCellReference("AB123"));
    }

    #endregion

    #region Priority 3 Regression: Exceeding limits throws explicit error

    [Fact]
    public async Task Parse_Exceeds15MbLimit_ThrowsInvalidOperationException()
    {
        var largeStream = new MemoryStream(new byte[16 * 1024 * 1024]);
        await Assert.ThrowsAsync<InvalidOperationException>(() => _parser.ParseAsync(largeStream, "huge.csv"));
    }

    [Fact]
    public async Task ParseCsv_ExceedsMaxRows_ThrowsExplicitInvalidOperationException()
    {
        var sb = new StringBuilder();
        sb.AppendLine("subjectCode,prompt,options,correctAnswer");
        for (int i = 0; i < 5005; i++)
        {
            sb.AppendLine($"MATH12,Prompt {i},A | B,A");
        }

        using var ms = new MemoryStream(Encoding.UTF8.GetBytes(sb.ToString()));
        var ex = await Assert.ThrowsAsync<InvalidOperationException>(() => _parser.ParseAsync(ms, "overflow.csv"));
        Assert.Contains("5000", ex.Message);
        Assert.Contains("vượt quá giới hạn tối đa", ex.Message);
    }

    #endregion
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

    #region Priority 4 Regression: Protection of Published Content from overwrite

    [Fact]
    public async Task Validate_PublishedLesson_MarksConflictAndRejectsOverwrite()
    {
        var lookup = new ExistingContentLookup
        {
            Lessons = new List<ExistingLessonLookup>
            {
                new("LES_PUB_01", "CH1", "Đạo hàm cơ bản", "dao-ham-co-ban", "published")
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
                    Name = "Toán 12",
                    Chapters = new List<ImportChapterItemDto>
                    {
                        new()
                        {
                            Code = "CH1",
                            Title = "Chương 1",
                            Lessons = new List<ImportLessonItemDto>
                            {
                                new()
                                {
                                    Code = "LES_PUB_01",
                                    Title = "Ghi đè bài học đã duyệt",
                                    Slug = "dao-ham-co-ban"
                                }
                            }
                        }
                    }
                }
            }
        };

        var result = await validator.ValidateBatchAsync(batch);

        Assert.False(result.IsValid);
        Assert.Contains(result.Errors, e => e.ErrorCode == "CONFLICT_PUBLISHED_CONTENT_PROTECTED");
        Assert.Contains(result.Previews, p => p.Action == ImportActionType.Conflict && p.EntityType == "lesson");
    }

    [Fact]
    public async Task Validate_PublishedQuestion_MarksConflictAndRejectsOverwrite()
    {
        var prompt = "Tính đạo hàm cấp hai của hàm số $y=\\sin x$";
        var lookup = new ExistingContentLookup
        {
            Questions = new List<ExistingQuestionLookup>
            {
                new("Q_001", "LES_01", "MATH12", prompt, "A", "published")
            }
        };

        var validator = CreateValidator(lookup);
        var batch = new CurriculumImportBatchDto
        {
            FlatQuestions = new List<ImportQuestionItemDto>
            {
                new()
                {
                    SubjectCode = "MATH12",
                    LessonCode = "LES_01",
                    Prompt = prompt,
                    Options = new List<string> { "$-\\sin x$", "$\\cos x$", "$-\\cos x$", "$\\sin x$" },
                    CorrectAnswer = "A"
                }
            }
        };

        var result = await validator.ValidateBatchAsync(batch);

        Assert.False(result.IsValid);
        Assert.Contains(result.Errors, e => e.ErrorCode == "CONFLICT_PUBLISHED_QUESTION_PROTECTED");
        Assert.Contains(result.Previews, p => p.Action == ImportActionType.Conflict && p.EntityType == "question");
    }

    [Fact]
    public async Task Validate_DraftQuestion_AllowsUpdateAction()
    {
        var prompt = "Nội dung câu hỏi đang soạn thảo";
        var lookup = new ExistingContentLookup
        {
            Subjects = new List<ExistingSubjectLookup>
            {
                new("sub-1", "MATH12", "Toán 12", "12", true)
            },
            Questions = new List<ExistingQuestionLookup>
            {
                new("Q_DRAFT_01", "LES_01", "MATH12", prompt, "A", "draft")
            }
        };

        var validator = CreateValidator(lookup);
        var batch = new CurriculumImportBatchDto
        {
            FlatQuestions = new List<ImportQuestionItemDto>
            {
                new()
                {
                    SubjectCode = "MATH12",
                    LessonCode = "LES_01",
                    Prompt = prompt,
                    Options = new List<string> { "Phương án 1", "Phương án 2", "Phương án 3", "Phương án 4" },
                    CorrectAnswer = "A"
                }
            }
        };

        var result = await validator.ValidateBatchAsync(batch);

        Assert.True(result.IsValid);
        Assert.Equal(1, result.Summary.UpdateCount);
        Assert.Contains(result.Previews, p => p.Action == ImportActionType.Update && p.Identifier == "Q_DRAFT_01");
    }

    #endregion

    #region Priority 5 Regression: CorrectAnswer bounds & Duplicate Options

    [Fact]
    public async Task Validate_OptionCountMismatch_RejectsDWhenOnlyThreeOptions()
    {
        var validator = CreateValidator();
        var batch = new CurriculumImportBatchDto
        {
            FlatQuestions = new List<ImportQuestionItemDto>
            {
                new()
                {
                    SubjectCode = "MATH12",
                    Prompt = "Phương trình $x^2 = 4$ có tập nghiệm:",
                    Options = new List<string> { "$\\{2\\}$", "$\\{-2\\}$", "$\\{-2; 2\\}$" }, // 3 options: A, B, C
                    CorrectAnswer = "D" // Out of range!
                }
            }
        };

        var result = await validator.ValidateBatchAsync(batch);

        Assert.False(result.IsValid);
        Assert.Contains(result.Errors, e => e.ErrorCode == "CORRECT_ANSWER_OUT_OF_RANGE");
    }

    [Fact]
    public async Task Validate_DuplicateOptionsInQuestion_ReturnsError()
    {
        var validator = CreateValidator();
        var batch = new CurriculumImportBatchDto
        {
            FlatQuestions = new List<ImportQuestionItemDto>
            {
                new()
                {
                    SubjectCode = "MATH12",
                    Prompt = "Chọn khẳng định đúng về nghiệm của phương trình:",
                    Options = new List<string> { "Vô nghiệm", "Vô nghiệm", "Có 1 nghiệm", "Có 2 nghiệm" }, // duplicate option!
                    CorrectAnswer = "C"
                }
            }
        };

        var result = await validator.ValidateBatchAsync(batch);

        Assert.False(result.IsValid);
        Assert.Contains(result.Errors, e => e.ErrorCode == "DUPLICATE_OPTIONS_IN_QUESTION");
    }

    [Fact]
    public async Task Validate_DuplicateQuestionCodeInBatch_ReturnsError()
    {
        var validator = CreateValidator();
        var batch = new CurriculumImportBatchDto
        {
            FlatQuestions = new List<ImportQuestionItemDto>
            {
                new()
                {
                    Code = "Q_MATH12_001",
                    SubjectCode = "MATH12",
                    Prompt = "Câu hỏi 1",
                    Options = new List<string> { "A", "B", "C", "D" },
                    CorrectAnswer = "A"
                },
                new()
                {
                    Code = "Q_MATH12_001", // Duplicate code!
                    SubjectCode = "MATH12",
                    Prompt = "Câu hỏi 2 với nội dung khác",
                    Options = new List<string> { "A", "B", "C", "D" },
                    CorrectAnswer = "B"
                }
            }
        };

        var result = await validator.ValidateBatchAsync(batch);

        Assert.False(result.IsValid);
        Assert.Contains(result.Errors, e => e.ErrorCode == "DUPLICATE_QUESTION_CODE_IN_FILE");
    }

    #endregion

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
                new("sub-1", "MATH12", "Toán 12", "12", true)
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

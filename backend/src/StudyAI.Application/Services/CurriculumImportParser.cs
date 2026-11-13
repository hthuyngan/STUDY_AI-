using System.IO.Compression;
using System.Security.Cryptography;
using System.Text;
using System.Text.Json;
using System.Text.RegularExpressions;
using System.Xml.Linq;
using StudyAI.Application.Common.Interfaces;
using StudyAI.Application.DTOs;

namespace StudyAI.Application.Services;

public class CurriculumImportParser : ICurriculumImportParser
{
    public const long MaxFileSizeBytes = 15 * 1024 * 1024; // 15MB
    public const long MaxUncompressedZipBytes = 50 * 1024 * 1024; // 50MB
    public const int MaxAllowedRows = 5000;
    public const int MaxAllowedColumns = 100;

    private static readonly XNamespace SpreadsheetNs = "http://schemas.openxmlformats.org/spreadsheetml/2006/main";
    private static readonly XNamespace RelsNs = "http://schemas.openxmlformats.org/package/2006/relationships";
    private static readonly XNamespace OfficeRelsNs = "http://schemas.openxmlformats.org/officeDocument/2006/relationships";

    public async Task<CurriculumImportBatchDto> ParseAsync(Stream fileStream, string fileName, CancellationToken cancellationToken = default)
    {
        if (fileStream == null) throw new ArgumentNullException(nameof(fileStream));
        if (string.IsNullOrWhiteSpace(fileName)) throw new ArgumentException("Tên tệp không được để trống.", nameof(fileName));

        var ext = Path.GetExtension(fileName).ToLowerInvariant();
        return ext switch
        {
            ".json" => await ParseJsonAsync(fileStream, fileName, cancellationToken),
            ".csv" => await ParseCsvAsync(fileStream, fileName, cancellationToken),
            ".xlsx" => await ParseXlsxAsync(fileStream, fileName, cancellationToken),
            _ => throw new NotSupportedException($"Định dạng tệp '{ext}' không được hỗ trợ. Chỉ chấp nhận .json, .csv, .xlsx.")
        };
    }

    #region JSON Parser

    public async Task<CurriculumImportBatchDto> ParseJsonAsync(Stream stream, string fileName, CancellationToken cancellationToken = default)
    {
        var (bytes, hash) = await ReadStreamWithSecurityLimitsAsync(stream, cancellationToken);
        var jsonText = Encoding.UTF8.GetString(bytes);

        var batch = new CurriculumImportBatchDto
        {
            SourceFormat = ImportFileFormat.Json,
            FileName = Path.GetFileName(fileName),
            FileHashSha256 = hash,
            FileSizeBytes = bytes.Length
        };

        using var doc = JsonDocument.Parse(jsonText, new JsonDocumentOptions
        {
            AllowTrailingCommas = true,
            CommentHandling = JsonCommentHandling.Skip
        });

        var root = doc.RootElement;
        int totalEntities = 0;

        // Case 1: Direct JSON array (VNHSGE benchmark format or generic question array)
        if (root.ValueKind == JsonValueKind.Array)
        {
            int row = 1;
            foreach (var item in root.EnumerateArray())
            {
                totalEntities++;
                if (totalEntities > MaxAllowedRows)
                {
                    throw new InvalidOperationException($"Tệp JSON chứa vượt quá giới hạn tối đa cho phép ({MaxAllowedRows} mục dữ liệu). Vui lòng chia nhỏ tệp.");
                }

                if (IsVnhsgeFormat(item))
                {
                    var qDto = ParseVnhsgeQuestionElement(item, row++, fileName);
                    batch.FlatQuestions.Add(qDto);

                    if (!batch.Subjects.Any(s => string.Equals(s.Code, qDto.SubjectCode, StringComparison.OrdinalIgnoreCase)))
                    {
                        batch.Subjects.Add(new ImportSubjectItemDto
                        {
                            Code = qDto.SubjectCode,
                            Name = GetSubjectName(qDto.SubjectCode),
                            Grade = "12",
                            Description = $"Môn học THPT ({qDto.SubjectCode}) theo chuẩn ngân hàng câu hỏi VNHSGE",
                            OrderIndex = batch.Subjects.Count + 1
                        });
                    }
                }
                else
                {
                    var qDto = ParseQuestionElement(item, row++, "", "", "");
                    batch.FlatQuestions.Add(qDto);
                }
            }
        }
        else if (root.ValueKind == JsonValueKind.Object)
        {
            // Case 2: Tree with single subject
            if (root.TryGetProperty("subject", out var subjectElem))
            {
                var subject = ParseSubjectElement(subjectElem, 1, ref totalEntities);
                batch.Subjects.Add(subject);
            }
            // Case 3: Tree with subjects array
            else if (root.TryGetProperty("subjects", out var subjectsElem) && subjectsElem.ValueKind == JsonValueKind.Array)
            {
                int row = 1;
                foreach (var s in subjectsElem.EnumerateArray())
                {
                    batch.Subjects.Add(ParseSubjectElement(s, row++, ref totalEntities));
                }
            }

            // Case 4: Flat question bank format
            if (root.TryGetProperty("questions", out var questionsElem) && questionsElem.ValueKind == JsonValueKind.Array)
            {
                string defaultSubject = root.TryGetProperty("subjectCode", out var sc) ? sc.GetString() ?? "" : "";
                string defaultChapter = root.TryGetProperty("chapterCode", out var cc) ? cc.GetString() ?? "" : "";
                string defaultLesson = root.TryGetProperty("lessonCode", out var lc) ? lc.GetString() ?? "" : "";

                int row = 1;
                foreach (var q in questionsElem.EnumerateArray())
                {
                    totalEntities++;
                    if (totalEntities > MaxAllowedRows)
                    {
                        throw new InvalidOperationException($"Tệp JSON chứa vượt quá giới hạn tối đa cho phép ({MaxAllowedRows} mục dữ liệu). Vui lòng chia nhỏ tệp.");
                    }

                    var qDto = ParseQuestionElement(q, row++, defaultSubject, defaultChapter, defaultLesson);
                    batch.FlatQuestions.Add(qDto);
                }
            }
            // Case 5: Root wrapper containing "vnhsge" or "data" array
            else if ((root.TryGetProperty("vnhsge", out var vnhsgeElem) || root.TryGetProperty("data", out vnhsgeElem)) && vnhsgeElem.ValueKind == JsonValueKind.Array)
            {
                int row = 1;
                foreach (var item in vnhsgeElem.EnumerateArray())
                {
                    totalEntities++;
                    if (totalEntities > MaxAllowedRows)
                    {
                        throw new InvalidOperationException($"Tệp JSON chứa vượt quá giới hạn tối đa cho phép ({MaxAllowedRows} mục dữ liệu). Vui lòng chia nhỏ tệp.");
                    }

                    if (IsVnhsgeFormat(item))
                    {
                        var qDto = ParseVnhsgeQuestionElement(item, row++, fileName);
                        batch.FlatQuestions.Add(qDto);

                        if (!batch.Subjects.Any(s => string.Equals(s.Code, qDto.SubjectCode, StringComparison.OrdinalIgnoreCase)))
                        {
                            batch.Subjects.Add(new ImportSubjectItemDto
                            {
                                Code = qDto.SubjectCode,
                                Name = GetSubjectName(qDto.SubjectCode),
                                Grade = "12",
                                Description = $"Môn học THPT ({qDto.SubjectCode}) theo chuẩn ngân hàng câu hỏi VNHSGE",
                                OrderIndex = batch.Subjects.Count + 1
                            });
                        }
                    }
                    else
                    {
                        var qDto = ParseQuestionElement(item, row++, "", "", "");
                        batch.FlatQuestions.Add(qDto);
                    }
                }
            }
        }

        if (totalEntities > MaxAllowedRows)
        {
            throw new InvalidOperationException($"Tệp JSON chứa {totalEntities} mục, vượt quá giới hạn tối đa cho phép ({MaxAllowedRows} mục dữ liệu).");
        }

        if (batch.TotalEntitiesCount == 0)
        {
            throw new InvalidOperationException("Tệp JSON không chứa dữ liệu cấu trúc hợp lệ (yêu cầu trường 'subject', 'subjects', 'questions' hoặc mảng câu hỏi VNHSGE).");
        }

        return batch;
    }

    #endregion

    #region CSV Parser

    public async Task<CurriculumImportBatchDto> ParseCsvAsync(Stream stream, string fileName, CancellationToken cancellationToken = default)
    {
        var (bytes, hash) = await ReadStreamWithSecurityLimitsAsync(stream, cancellationToken);
        var text = StripUtf8Bom(Encoding.UTF8.GetString(bytes));

        var batch = new CurriculumImportBatchDto
        {
            SourceFormat = ImportFileFormat.Csv,
            FileName = Path.GetFileName(fileName),
            FileHashSha256 = hash,
            FileSizeBytes = bytes.Length
        };

        var lines = ParseCsvLines(text);
        if (lines.Count <= 1)
        {
            throw new InvalidOperationException("Tệp CSV rỗng hoặc chỉ có dòng tiêu đề mà không có dòng dữ liệu.");
        }

        // Enforce row and column limits
        int dataRowCount = lines.Count - 1;
        if (dataRowCount > MaxAllowedRows)
        {
            throw new InvalidOperationException($"Tệp CSV chứa {dataRowCount} dòng dữ liệu, vượt quá giới hạn tối đa cho phép ({MaxAllowedRows} dòng). Vui lòng chia nhỏ tệp.");
        }

        var header = lines[0].Select(h => h.Trim().ToLowerInvariant()).ToList();
        if (header.Count > MaxAllowedColumns)
        {
            throw new InvalidOperationException($"Tệp CSV chứa {header.Count} cột, vượt quá giới hạn tối đa cho phép ({MaxAllowedColumns} cột).");
        }

        var colMap = new Dictionary<string, int>();
        for (int i = 0; i < header.Count; i++)
        {
            colMap[header[i]] = i;
        }

        if (!colMap.ContainsKey("prompt"))
        {
            throw new InvalidOperationException("Tệp CSV thiếu cấu trúc bắt buộc: Không tìm thấy cột 'prompt'.");
        }

        for (int r = 1; r < lines.Count; r++)
        {
            var row = lines[r];
            if (row.All(string.IsNullOrWhiteSpace)) continue;

            string GetCol(string name, string fallback = "")
            {
                if (colMap.TryGetValue(name.ToLowerInvariant(), out var idx) && idx < row.Count)
                {
                    return CleanExcelEscapedQuotes(row[idx].Trim());
                }
                return fallback;
            }

            var prompt = GetCol("prompt");
            if (string.IsNullOrWhiteSpace(prompt)) continue;

            var optionsList = ExtractOptions(GetCol("options"), GetCol("optiona"), GetCol("optionb"), GetCol("optionc"), GetCol("optiond"));

            var qDto = new ImportQuestionItemDto
            {
                RowNumber = r + 1,
                Code = GetCol("code"),
                SubjectCode = GetCol("subjectcode", "MATH12"),
                ChapterCode = GetCol("chaptercode"),
                LessonCode = GetCol("lessoncode"),
                Topic = GetCol("topic"),
                Difficulty = NormalizeDifficulty(GetCol("difficulty", "medium")),
                Type = NormalizeType(GetCol("type", "multiple-choice")),
                Prompt = prompt,
                Options = optionsList,
                CorrectAnswer = GetCol("correctanswer").ToUpperInvariant(),
                Explanation = GetCol("explanation"),
                SourceCitation = GetCol("sourcecitation"),
                LicenseType = GetCol("licensetype"),
                Status = "draft"
            };

            qDto.Fingerprint = GenerateQuestionFingerprint(qDto.LessonCode ?? qDto.SubjectCode, qDto.Prompt);
            batch.FlatQuestions.Add(qDto);
        }

        if (batch.FlatQuestions.Count == 0)
        {
            throw new InvalidOperationException("Tệp CSV không chứa bất kỳ câu hỏi hợp lệ nào (tất cả các dòng đều có prompt rỗng).");
        }

        return batch;
    }

    #endregion

    #region XLSX Parser (Multi-sheet & Robust Column Mapping)

    public async Task<CurriculumImportBatchDto> ParseXlsxAsync(Stream stream, string fileName, CancellationToken cancellationToken = default)
    {
        var (bytes, hash) = await ReadStreamWithSecurityLimitsAsync(stream, cancellationToken);

        var batch = new CurriculumImportBatchDto
        {
            SourceFormat = ImportFileFormat.Xlsx,
            FileName = Path.GetFileName(fileName),
            FileHashSha256 = hash,
            FileSizeBytes = bytes.Length
        };

        using var memoryStream = new MemoryStream(bytes);
        using var archive = new ZipArchive(memoryStream, ZipArchiveMode.Read);

        // Security: Zip Bomb Protection
        long uncompressedTotal = 0;
        foreach (var entry in archive.Entries)
        {
            uncompressedTotal += entry.Length;
            if (uncompressedTotal > MaxUncompressedZipBytes)
            {
                throw new InvalidOperationException($"Tệp XLSX vượt quá dung lượng giải nén an toàn cho phép ({MaxUncompressedZipBytes / 1024 / 1024}MB - Zip bomb prevention).");
            }
        }

        // Read shared strings
        var sharedStrings = LoadSharedStrings(archive);

        // Map sheets from xl/workbook.xml & xl/_rels/workbook.xml.rels
        var sheets = LoadWorkbookSheetEntries(archive);
        if (sheets.Count == 0)
        {
            // Fallback: look for any sheet in xl/worksheets/
            var fallbackEntry = archive.GetEntry("xl/worksheets/sheet1.xml") ??
                                archive.Entries.FirstOrDefault(e => e.FullName.StartsWith("xl/worksheets/sheet", StringComparison.OrdinalIgnoreCase) && e.FullName.EndsWith(".xml", StringComparison.OrdinalIgnoreCase));
            if (fallbackEntry != null)
            {
                sheets["Sheet1"] = fallbackEntry;
            }
        }

        if (sheets.Count == 0)
        {
            throw new InvalidOperationException("Tệp XLSX không chứa bất kỳ trang tính nào hợp lệ.");
        }

        // Check if multi-sheet curriculum hierarchy is present:
        var subjectSheet = sheets.FirstOrDefault(s => s.Key.Contains("subject", StringComparison.OrdinalIgnoreCase) || s.Key.Contains("monhoc", StringComparison.OrdinalIgnoreCase)).Value;
        var chapterSheet = sheets.FirstOrDefault(s => s.Key.Contains("chapter", StringComparison.OrdinalIgnoreCase) || s.Key.Contains("chuong", StringComparison.OrdinalIgnoreCase)).Value;
        var lessonSheet = sheets.FirstOrDefault(s => s.Key.Contains("lesson", StringComparison.OrdinalIgnoreCase) || s.Key.Contains("baihoc", StringComparison.OrdinalIgnoreCase)).Value;
        var questionSheet = sheets.FirstOrDefault(s => s.Key.Contains("question", StringComparison.OrdinalIgnoreCase) || s.Key.Contains("cauhoi", StringComparison.OrdinalIgnoreCase)).Value;

        if (subjectSheet != null || chapterSheet != null || lessonSheet != null)
        {
            // Parse multi-sheet hierarchy
            var subjects = subjectSheet != null ? ParseXlsxSubjectsSheet(subjectSheet, sharedStrings) : new List<ImportSubjectItemDto>();
            var chapters = chapterSheet != null ? ParseXlsxChaptersSheet(chapterSheet, sharedStrings) : new List<ImportChapterItemDto>();
            var lessons = lessonSheet != null ? ParseXlsxLessonsSheet(lessonSheet, sharedStrings) : new List<ImportLessonItemDto>();
            var questions = questionSheet != null ? ParseXlsxQuestionsSheet(questionSheet, sharedStrings) : new List<ImportQuestionItemDto>();

            // Assemble tree
            var chaptersBySubject = chapters.GroupBy(c => c.SubjectCode, StringComparer.OrdinalIgnoreCase)
                                            .ToDictionary(g => g.Key, g => g.ToList(), StringComparer.OrdinalIgnoreCase);

            var lessonsByChapter = lessons.GroupBy(l => l.ChapterCode, StringComparer.OrdinalIgnoreCase)
                                          .ToDictionary(g => g.Key, g => g.ToList(), StringComparer.OrdinalIgnoreCase);

            var questionsByLesson = questions.Where(q => !string.IsNullOrEmpty(q.LessonCode))
                                             .GroupBy(q => q.LessonCode!, StringComparer.OrdinalIgnoreCase)
                                             .ToDictionary(g => g.Key, g => g.ToList(), StringComparer.OrdinalIgnoreCase);

            var flatQuestions = questions.Where(q => string.IsNullOrEmpty(q.LessonCode)).ToList();

            foreach (var ch in chapters)
            {
                if (lessonsByChapter.TryGetValue(ch.Code, out var chLessons))
                {
                    ch.Lessons = chLessons;
                    foreach (var les in chLessons)
                    {
                        if (questionsByLesson.TryGetValue(les.Code, out var lesQuestions))
                        {
                            les.Questions = lesQuestions;
                        }
                    }
                }
            }

            foreach (var sub in subjects)
            {
                if (chaptersBySubject.TryGetValue(sub.Code, out var subChapters))
                {
                    sub.Chapters = subChapters;
                }
            }

            batch.Subjects = subjects;
            batch.FlatQuestions = flatQuestions;
            return batch;
        }

        // Single Sheet or Question Bank Sheet
        var primarySheet = questionSheet ?? sheets.First().Value;
        batch.FlatQuestions = ParseXlsxQuestionsSheet(primarySheet, sharedStrings);

        if (batch.TotalEntitiesCount == 0)
        {
            throw new InvalidOperationException("Tệp XLSX thiếu cấu trúc bắt buộc hoặc không tìm thấy dữ liệu câu hỏi hợp lệ.");
        }

        return batch;
    }

    private static List<ImportQuestionItemDto> ParseXlsxQuestionsSheet(ZipArchiveEntry sheetEntry, List<string> sharedStrings)
    {
        var questions = new List<ImportQuestionItemDto>();
        using var sheetStream = sheetEntry.Open();
        var sheetDoc = XDocument.Load(sheetStream);

        var rows = sheetDoc.Descendants(SpreadsheetNs + "row").ToList();
        if (rows.Count <= 1)
        {
            throw new InvalidOperationException($"Trang tính '{sheetEntry.Name}' rỗng hoặc chỉ chứa dòng tiêu đề mà không có dữ liệu.");
        }

        int dataRows = rows.Count - 1;
        if (dataRows > MaxAllowedRows)
        {
            throw new InvalidOperationException($"Trang tính '{sheetEntry.Name}' có {dataRows} dòng dữ liệu, vượt quá giới hạn tối đa ({MaxAllowedRows} dòng). Vui lòng chia nhỏ tệp.");
        }

        // Parse header row
        var headerRow = rows[0];
        var colIndexMap = new Dictionary<string, int>();

        foreach (var c in headerRow.Descendants(SpreadsheetNs + "c"))
        {
            var rAttr = c.Attribute("r")?.Value;
            int colIdx = !string.IsNullOrEmpty(rAttr) ? GetColumnIndexFromCellReference(rAttr) : 0;
            string text = GetCellValue(c, sharedStrings, SpreadsheetNs).Trim().ToLowerInvariant();
            if (!string.IsNullOrEmpty(text))
            {
                colIndexMap[text] = colIdx;
            }
        }

        if (!colIndexMap.ContainsKey("prompt"))
        {
            throw new InvalidOperationException($"Trang tính '{sheetEntry.Name}' thiếu cấu trúc bắt buộc: Không tìm thấy cột 'prompt'.");
        }

        for (int r = 1; r < rows.Count; r++)
        {
            var rowElem = rows[r];
            var cells = rowElem.Descendants(SpreadsheetNs + "c").ToList();
            if (cells.Count == 0) continue;

            var cellMap = new Dictionary<int, string>();
            foreach (var c in cells)
            {
                var rAttr = c.Attribute("r")?.Value;
                if (!string.IsNullOrEmpty(rAttr))
                {
                    int colIdx = GetColumnIndexFromCellReference(rAttr);
                    if (colIdx >= MaxAllowedColumns)
                    {
                        throw new InvalidOperationException($"Trang tính có cột vị trí '{rAttr}' vượt quá giới hạn tối đa ({MaxAllowedColumns} cột).");
                    }
                    cellMap[colIdx] = GetCellValue(c, sharedStrings, SpreadsheetNs);
                }
            }

            string GetCol(string name, string fallback = "")
            {
                if (colIndexMap.TryGetValue(name.ToLowerInvariant(), out var colIdx) && cellMap.TryGetValue(colIdx, out var val))
                {
                    return CleanExcelEscapedQuotes(val.Trim());
                }
                return fallback;
            }

            var prompt = GetCol("prompt");
            if (string.IsNullOrWhiteSpace(prompt)) continue;

            var optionsList = ExtractOptions(GetCol("options"), GetCol("optiona"), GetCol("optionb"), GetCol("optionc"), GetCol("optiond"));

            var qDto = new ImportQuestionItemDto
            {
                RowNumber = r + 1,
                Code = GetCol("code"),
                SubjectCode = GetCol("subjectcode", "MATH12"),
                ChapterCode = GetCol("chaptercode"),
                LessonCode = GetCol("lessoncode"),
                Topic = GetCol("topic"),
                Difficulty = NormalizeDifficulty(GetCol("difficulty", "medium")),
                Type = NormalizeType(GetCol("type", "multiple-choice")),
                Prompt = prompt,
                Options = optionsList,
                CorrectAnswer = GetCol("correctanswer").ToUpperInvariant(),
                Explanation = GetCol("explanation"),
                SourceCitation = GetCol("sourcecitation"),
                LicenseType = GetCol("licensetype"),
                Status = "draft"
            };

            qDto.Fingerprint = GenerateQuestionFingerprint(qDto.LessonCode ?? qDto.SubjectCode, qDto.Prompt);
            questions.Add(qDto);
        }

        return questions;
    }

    private static List<ImportSubjectItemDto> ParseXlsxSubjectsSheet(ZipArchiveEntry sheetEntry, List<string> sharedStrings)
    {
        var subjects = new List<ImportSubjectItemDto>();
        using var stream = sheetEntry.Open();
        var doc = XDocument.Load(stream);
        var rows = doc.Descendants(SpreadsheetNs + "row").ToList();
        if (rows.Count <= 1) return subjects;

        var (colMap, dataRows) = ParseSheetRows(rows, sharedStrings);
        int rNum = 2;
        foreach (var rowValues in dataRows)
        {
            string Get(string col, string def = "") => colMap.TryGetValue(col, out var idx) && rowValues.TryGetValue(idx, out var v) ? CleanExcelEscapedQuotes(v) : def;

            var code = Get("code");
            var name = Get("name");
            if (string.IsNullOrWhiteSpace(code) && string.IsNullOrWhiteSpace(name)) continue;

            subjects.Add(new ImportSubjectItemDto
            {
                RowNumber = rNum++,
                Code = code,
                Name = name,
                Grade = Get("grade", "12"),
                Description = Get("description"),
                OrderIndex = int.TryParse(Get("orderindex"), out var oi) ? oi : 0
            });
        }
        return subjects;
    }

    private static List<ImportChapterItemDto> ParseXlsxChaptersSheet(ZipArchiveEntry sheetEntry, List<string> sharedStrings)
    {
        var chapters = new List<ImportChapterItemDto>();
        using var stream = sheetEntry.Open();
        var doc = XDocument.Load(stream);
        var rows = doc.Descendants(SpreadsheetNs + "row").ToList();
        if (rows.Count <= 1) return chapters;

        var (colMap, dataRows) = ParseSheetRows(rows, sharedStrings);
        int rNum = 2;
        foreach (var rowValues in dataRows)
        {
            string Get(string col, string def = "") => colMap.TryGetValue(col, out var idx) && rowValues.TryGetValue(idx, out var v) ? CleanExcelEscapedQuotes(v) : def;

            var code = Get("code");
            var title = Get("title");
            if (string.IsNullOrWhiteSpace(code) && string.IsNullOrWhiteSpace(title)) continue;

            chapters.Add(new ImportChapterItemDto
            {
                RowNumber = rNum++,
                Code = code,
                SubjectCode = Get("subjectcode"),
                Title = title,
                Description = Get("description"),
                OrderIndex = int.TryParse(Get("orderindex"), out var oi) ? oi : 0
            });
        }
        return chapters;
    }

    private static List<ImportLessonItemDto> ParseXlsxLessonsSheet(ZipArchiveEntry sheetEntry, List<string> sharedStrings)
    {
        var lessons = new List<ImportLessonItemDto>();
        using var stream = sheetEntry.Open();
        var doc = XDocument.Load(stream);
        var rows = doc.Descendants(SpreadsheetNs + "row").ToList();
        if (rows.Count <= 1) return lessons;

        var (colMap, dataRows) = ParseSheetRows(rows, sharedStrings);
        int rNum = 2;
        foreach (var rowValues in dataRows)
        {
            string Get(string col, string def = "") => colMap.TryGetValue(col, out var idx) && rowValues.TryGetValue(idx, out var v) ? CleanExcelEscapedQuotes(v) : def;

            var code = Get("code");
            var title = Get("title");
            if (string.IsNullOrWhiteSpace(code) && string.IsNullOrWhiteSpace(title)) continue;

            lessons.Add(new ImportLessonItemDto
            {
                RowNumber = rNum++,
                Code = code,
                ChapterCode = Get("chaptercode"),
                SubjectCode = Get("subjectcode"),
                Title = title,
                Slug = Get("slug"),
                Introduction = Get("introduction"),
                Status = "draft",
                OrderIndex = int.TryParse(Get("orderindex"), out var oi) ? oi : 0
            });
        }
        return lessons;
    }

    private static (Dictionary<string, int> ColMap, List<Dictionary<int, string>> Rows) ParseSheetRows(List<XElement> rows, List<string> sharedStrings)
    {
        var colMap = new Dictionary<string, int>(StringComparer.OrdinalIgnoreCase);
        var dataRows = new List<Dictionary<int, string>>();
        if (rows.Count == 0) return (colMap, dataRows);

        foreach (var c in rows[0].Descendants(SpreadsheetNs + "c"))
        {
            var rAttr = c.Attribute("r")?.Value;
            int colIdx = !string.IsNullOrEmpty(rAttr) ? GetColumnIndexFromCellReference(rAttr) : 0;
            string text = GetCellValue(c, sharedStrings, SpreadsheetNs).Trim().ToLowerInvariant();
            if (!string.IsNullOrEmpty(text)) colMap[text] = colIdx;
        }

        for (int r = 1; r < rows.Count; r++)
        {
            var cells = rows[r].Descendants(SpreadsheetNs + "c").ToList();
            if (cells.Count == 0) continue;

            var cellMap = new Dictionary<int, string>();
            foreach (var c in cells)
            {
                var rAttr = c.Attribute("r")?.Value;
                if (!string.IsNullOrEmpty(rAttr))
                {
                    int colIdx = GetColumnIndexFromCellReference(rAttr);
                    cellMap[colIdx] = GetCellValue(c, sharedStrings, SpreadsheetNs);
                }
            }
            dataRows.Add(cellMap);
        }

        return (colMap, dataRows);
    }

    #endregion

    #region Helpers & Data Hygiene

    private static List<string> LoadSharedStrings(ZipArchive archive)
    {
        var sharedStrings = new List<string>();
        var sharedStringsEntry = archive.GetEntry("xl/sharedStrings.xml");
        if (sharedStringsEntry == null) return sharedStrings;

        using var entryStream = sharedStringsEntry.Open();
        var xdoc = XDocument.Load(entryStream);
        foreach (var si in xdoc.Descendants(SpreadsheetNs + "si"))
        {
            var t = si.Descendants(SpreadsheetNs + "t").Select(x => x.Value).DefaultIfEmpty("").Aggregate((a, b) => a + b);
            sharedStrings.Add(t);
        }
        return sharedStrings;
    }

    private static Dictionary<string, ZipArchiveEntry> LoadWorkbookSheetEntries(ZipArchive archive)
    {
        var result = new Dictionary<string, ZipArchiveEntry>(StringComparer.OrdinalIgnoreCase);
        var wbEntry = archive.GetEntry("xl/workbook.xml");
        var wbRelsEntry = archive.GetEntry("xl/_rels/workbook.xml.rels");
        if (wbEntry == null) return result;

        var relsMap = new Dictionary<string, string>();
        if (wbRelsEntry != null)
        {
            using var relsStream = wbRelsEntry.Open();
            var relsDoc = XDocument.Load(relsStream);
            foreach (var rel in relsDoc.Descendants(RelsNs + "Relationship"))
            {
                var id = rel.Attribute("Id")?.Value;
                var target = rel.Attribute("Target")?.Value;
                if (!string.IsNullOrEmpty(id) && !string.IsNullOrEmpty(target))
                {
                    relsMap[id] = target;
                }
            }
        }

        using (var wbStream = wbEntry.Open())
        {
            var wbDoc = XDocument.Load(wbStream);
            foreach (var sheet in wbDoc.Descendants(SpreadsheetNs + "sheet"))
            {
                var name = sheet.Attribute("name")?.Value ?? "";
                var rId = sheet.Attribute(OfficeRelsNs + "id")?.Value;
                if (!string.IsNullOrEmpty(name) && !string.IsNullOrEmpty(rId) && relsMap.TryGetValue(rId, out var targetPath))
                {
                    var cleanPath = targetPath.StartsWith("/") ? targetPath.TrimStart('/') : "xl/" + targetPath.TrimStart('/');
                    var entry = archive.GetEntry(cleanPath);
                    if (entry != null)
                    {
                        result[name] = entry;
                    }
                }
            }
        }

        return result;
    }

    public static int GetColumnIndexFromCellReference(string cellRef)
    {
        int col = 0;
        for (int i = 0; i < cellRef.Length; i++)
        {
            char c = cellRef[i];
            if (char.IsLetter(c))
            {
                col = col * 26 + (char.ToUpperInvariant(c) - 'A' + 1);
            }
            else
            {
                break;
            }
        }
        return col > 0 ? col - 1 : 0;
    }

    private static string GetCellValue(XElement cell, List<string> sharedStrings, XNamespace ns)
    {
        var type = cell.Attribute("t")?.Value;
        if (type == "inlineStr")
        {
            var isElem = cell.Element(ns + "is");
            if (isElem != null)
            {
                return isElem.Descendants(ns + "t").Select(x => x.Value).DefaultIfEmpty("").Aggregate((a, b) => a + b);
            }
        }

        var valElem = cell.Element(ns + "v");
        if (valElem == null)
        {
            var tElem = cell.Element(ns + "t");
            if (tElem != null) return tElem.Value;
            return "";
        }

        var val = valElem.Value;
        if (type == "s" && int.TryParse(val, out var idx) && idx >= 0 && idx < sharedStrings.Count)
        {
            return sharedStrings[idx];
        }
        return val;
    }

    private static List<string> ExtractOptions(string optionsRaw, string optA, string optB, string optC, string optD)
    {
        var optionsList = new List<string>();
        if (!string.IsNullOrEmpty(optionsRaw))
        {
            string[] parts;
            if (optionsRaw.Contains('|'))
            {
                parts = optionsRaw.Split('|');
            }
            else if (optionsRaw.Contains('\n'))
            {
                parts = optionsRaw.Split(new[] { '\n', '\r' }, StringSplitOptions.RemoveEmptyEntries);
            }
            else if (optionsRaw.Contains(";;"))
            {
                parts = optionsRaw.Split(new[] { ";;" }, StringSplitOptions.RemoveEmptyEntries);
            }
            else
            {
                parts = optionsRaw.Split(';');
            }

            optionsList = parts.Select(CleanExcelEscapedQuotes).Where(s => !string.IsNullOrEmpty(s)).ToList();
        }

        if (optionsList.Count == 0)
        {
            optionsList = new List<string>
            {
                CleanExcelEscapedQuotes(optA),
                CleanExcelEscapedQuotes(optB),
                CleanExcelEscapedQuotes(optC),
                CleanExcelEscapedQuotes(optD)
            }.Where(o => !string.IsNullOrEmpty(o)).ToList();
        }

        return optionsList;
    }

    /// <summary>
    /// Preserves legitimate math content (such as -3x + 2 = 0, +5, etc.) without modification.
    /// Only removes leading apostrophe if added by spreadsheet software to escape formulas.
    /// </summary>
    public static string CleanExcelEscapedQuotes(string input)
    {
        if (string.IsNullOrEmpty(input)) return string.Empty;
        var trimmed = input.Trim();
        if (trimmed.StartsWith("'") && trimmed.Length > 1 && trimmed[1] is '=' or '+' or '-' or '@')
        {
            return trimmed[1..].Trim();
        }
        return trimmed;
    }

    private static ImportSubjectItemDto ParseSubjectElement(JsonElement elem, int row, ref int totalEntities)
    {
        totalEntities++;
        var subject = new ImportSubjectItemDto
        {
            RowNumber = row,
            Code = elem.TryGetProperty("code", out var c) ? c.GetString() ?? "" : "",
            Name = elem.TryGetProperty("name", out var n) ? n.GetString() ?? "" : "",
            Grade = elem.TryGetProperty("grade", out var g) ? g.GetString() ?? "12" : "12",
            Description = elem.TryGetProperty("description", out var d) ? d.GetString() : null,
            OrderIndex = elem.TryGetProperty("orderIndex", out var oi) ? oi.GetInt32() : 0
        };

        if (elem.TryGetProperty("chapters", out var chaptersElem) && chaptersElem.ValueKind == JsonValueKind.Array)
        {
            int chRow = 1;
            foreach (var ch in chaptersElem.EnumerateArray())
            {
                totalEntities++;
                var chapter = new ImportChapterItemDto
                {
                    RowNumber = chRow++,
                    SubjectCode = subject.Code,
                    Code = ch.TryGetProperty("code", out var cc) ? cc.GetString() ?? "" : "",
                    Title = ch.TryGetProperty("title", out var ct) ? ct.GetString() ?? "" : "",
                    Description = ch.TryGetProperty("description", out var cd) ? cd.GetString() : null,
                    OrderIndex = ch.TryGetProperty("orderIndex", out var coi) ? coi.GetInt32() : 0
                };

                if (ch.TryGetProperty("lessons", out var lessonsElem) && lessonsElem.ValueKind == JsonValueKind.Array)
                {
                    int lesRow = 1;
                    foreach (var les in lessonsElem.EnumerateArray())
                    {
                        totalEntities++;
                        var lesson = new ImportLessonItemDto
                        {
                            RowNumber = lesRow++,
                            ChapterCode = chapter.Code,
                            SubjectCode = subject.Code,
                            Code = les.TryGetProperty("code", out var lc) ? lc.GetString() ?? "" : "",
                            Title = les.TryGetProperty("title", out var lt) ? lt.GetString() ?? "" : "",
                            Slug = les.TryGetProperty("slug", out var ls) ? ls.GetString() ?? "" : "",
                            OrderIndex = les.TryGetProperty("orderIndex", out var loi) ? loi.GetInt32() : 0,
                            Status = "draft",
                            Introduction = les.TryGetProperty("introduction", out var li) ? li.GetString() : null
                        };

                        if (les.TryGetProperty("definitions", out var defs) && defs.ValueKind == JsonValueKind.Array)
                        {
                            foreach (var defItem in defs.EnumerateArray())
                            {
                                lesson.Definitions.Add(new ImportDefinitionDto
                                {
                                    Term = defItem.TryGetProperty("term", out var dt) ? dt.GetString() ?? "" : "",
                                    Content = defItem.TryGetProperty("content", out var dc) ? dc.GetString() ?? "" : ""
                                });
                            }
                        }

                        if (les.TryGetProperty("formulas", out var forms) && forms.ValueKind == JsonValueKind.Array)
                        {
                            foreach (var f in forms.EnumerateArray())
                            {
                                lesson.Formulas.Add(new ImportFormulaDto
                                {
                                    Name = f.TryGetProperty("name", out var fn) ? fn.GetString() ?? "" : "",
                                    Latex = f.TryGetProperty("latex", out var fl) ? fl.GetString() ?? "" : ""
                                });
                            }
                        }

                        if (les.TryGetProperty("questions", out var lq) && lq.ValueKind == JsonValueKind.Array)
                        {
                            int qRow = 1;
                            foreach (var q in lq.EnumerateArray())
                            {
                                totalEntities++;
                                var qDto = ParseQuestionElement(q, qRow++, subject.Code, chapter.Code, lesson.Code);
                                lesson.Questions.Add(qDto);
                            }
                        }

                        chapter.Lessons.Add(lesson);
                    }
                }

                subject.Chapters.Add(chapter);
            }
        }

        return subject;
    }

    private static ImportQuestionItemDto ParseQuestionElement(JsonElement q, int row, string defaultSubject, string defaultChapter, string defaultLesson)
    {
        var options = new List<string>();
        if (q.TryGetProperty("options", out var optElem) && optElem.ValueKind == JsonValueKind.Array)
        {
            foreach (var o in optElem.EnumerateArray())
            {
                var str = o.GetString();
                if (!string.IsNullOrEmpty(str)) options.Add(str);
            }
        }

        var prompt = q.TryGetProperty("prompt", out var p) ? p.GetString() ?? "" : "";
        var lessonCode = q.TryGetProperty("lessonCode", out var lc) ? lc.GetString() ?? defaultLesson : defaultLesson;
        var subjectCode = q.TryGetProperty("subjectCode", out var sc) ? sc.GetString() ?? defaultSubject : defaultSubject;

        var qDto = new ImportQuestionItemDto
        {
            RowNumber = row,
            Code = q.TryGetProperty("code", out var qc) ? qc.GetString() : null,
            SubjectCode = subjectCode,
            ChapterCode = q.TryGetProperty("chapterCode", out var cc) ? cc.GetString() ?? defaultChapter : defaultChapter,
            LessonCode = lessonCode,
            Prompt = prompt,
            Options = options,
            CorrectAnswer = q.TryGetProperty("correctAnswer", out var ca) ? ca.GetString()?.ToUpperInvariant() ?? "" : "",
            Explanation = q.TryGetProperty("explanation", out var exp) ? exp.GetString() : null,
            Topic = q.TryGetProperty("topic", out var top) ? top.GetString() : null,
            Difficulty = NormalizeDifficulty(q.TryGetProperty("difficulty", out var diff) ? diff.GetString() ?? "medium" : "medium"),
            Type = NormalizeType(q.TryGetProperty("type", out var typ) ? typ.GetString() ?? "multiple-choice" : "multiple-choice"),
            Status = "draft",
            OutcomeCode = q.TryGetProperty("outcomeCode", out var oc) ? oc.GetString() : null,
            SourceCitation = q.TryGetProperty("sourceCitation", out var scit) ? scit.GetString() : null,
            LicenseType = q.TryGetProperty("licenseType", out var lic) ? lic.GetString() : null
        };

        qDto.Fingerprint = GenerateQuestionFingerprint(qDto.LessonCode ?? qDto.SubjectCode, qDto.Prompt);
        return qDto;
    }

    #region VNHSGE Benchmark Dataset Parser Helpers

    public static bool IsVnhsgeFormat(JsonElement elem)
    {
        if (elem.ValueKind != JsonValueKind.Object) return false;
        bool hasId = elem.TryGetProperty("ID", out _) || elem.TryGetProperty("id", out _);
        bool hasQuestion = elem.TryGetProperty("Question", out _) || elem.TryGetProperty("question", out _);
        bool hasChoice = elem.TryGetProperty("Choice", out _) || elem.TryGetProperty("choice", out _);
        bool hasImage = elem.TryGetProperty("Image_Question", out _) || elem.TryGetProperty("Image_Answer", out _);

        return (hasId || hasQuestion) && (hasChoice || hasImage);
    }

    public static string InferSubjectCode(string fileName, string? questionId = null)
    {
        var fn = (fileName ?? "").ToLowerInvariant();
        if (fn.Contains("math") || fn.Contains("toan")) return "MATH12";
        if (fn.Contains("phys") || fn.Contains("vat_ly") || fn.Contains("vatly") || fn.Contains("vat-ly")) return "PHYS12";
        if (fn.Contains("chem") || fn.Contains("hoa_hoc") || fn.Contains("hoahoc") || fn.Contains("hoa-hoc")) return "CHEM12";
        if (fn.Contains("bio") || fn.Contains("sinh_hoc") || fn.Contains("sinhhoc") || fn.Contains("sinh-hoc")) return "BIO12";
        if (fn.Contains("lit") || fn.Contains("ngu_van") || fn.Contains("nguvan") || fn.Contains("ngu-van") || fn.Contains("van")) return "LIT12";
        if (fn.Contains("eng") || fn.Contains("tieng_anh") || fn.Contains("tienganh") || fn.Contains("tieng-anh")) return "ENG12";
        if (fn.Contains("hist") || fn.Contains("lich_su") || fn.Contains("lichsu") || fn.Contains("lich-su")) return "HIST12";
        if (fn.Contains("geo") || fn.Contains("dia_ly") || fn.Contains("dialy") || fn.Contains("dia-ly")) return "GEO12";
        if (fn.Contains("gdcd") || fn.Contains("civic") || fn.Contains("giao_duc_cong_dan")) return "GDCD12";

        return "MATH12";
    }

    public static string InferSplit(string fileName)
    {
        var fn = (fileName ?? "").ToLowerInvariant();
        if (fn.Contains("train")) return "train";
        if (fn.Contains("test")) return "test";
        if (fn.Contains("eval") || fn.Contains("val")) return "eval";
        return "";
    }

    public static string GetSubjectName(string subjectCode) => subjectCode.ToUpperInvariant() switch
    {
        "MATH12" => "Toán học 12",
        "PHYS12" => "Vật lý 12",
        "CHEM12" => "Hóa học 12",
        "BIO12" => "Sinh học 12",
        "LIT12" => "Ngữ văn 12",
        "ENG12" => "Tiếng Anh 12",
        "HIST12" => "Lịch sử 12",
        "GEO12" => "Địa lý 12",
        "GDCD12" => "Giáo dục công dân 12",
        _ => subjectCode
    };

    public static (string Prompt, List<string> Options) ExtractOptionsFromVnhsgeQuestion(string rawText)
    {
        if (string.IsNullOrWhiteSpace(rawText))
        {
            return (string.Empty, new List<string>());
        }

        var text = rawText.Trim();

        // 1. Look for markers with newline or multi-space first (most common and reliable in VNHSGE)
        // Matches \nA. or \nA) or at string start A. or A)
        var markerRegex = new Regex(@"(?:^|\r?\n|[ \t]{2,}|\t)(?<letter>[A-D])[\.\)][ \t]*", RegexOptions.Compiled);
        var matches = markerRegex.Matches(text);

        var sequence = new List<(string Letter, int StartIndex, int ContentIndex)>();
        char expected = 'A';
        foreach (Match m in matches)
        {
            var letterChar = m.Groups["letter"].Value[0];
            if (letterChar == expected)
            {
                sequence.Add((m.Groups["letter"].Value, m.Index, m.Index + m.Length));
                expected++;
            }
        }

        // 2. If we couldn't find at least A, B, C with strict prefix, try looser search
        if (sequence.Count < 3)
        {
            var looseRegex = new Regex(@"(?:^|[ \t\r\n])(?<letter>[A-D])[\.\)][ \t]*", RegexOptions.Compiled);
            var looseMatches = looseRegex.Matches(text);
            sequence.Clear();
            expected = 'A';
            foreach (Match m in looseMatches)
            {
                var letterChar = m.Groups["letter"].Value[0];
                if (letterChar == expected)
                {
                    sequence.Add((m.Groups["letter"].Value, m.Index, m.Index + m.Length));
                    expected++;
                }
            }
        }

        // 3. If we have at least 2 options (A and B, typically 4: A, B, C, D)
        if (sequence.Count >= 2)
        {
            var prompt = text.Substring(0, sequence[0].StartIndex).Trim();
            var options = new List<string>();

            for (int i = 0; i < sequence.Count; i++)
            {
                int start = sequence[i].ContentIndex;
                int end = (i + 1 < sequence.Count) ? sequence[i + 1].StartIndex : text.Length;
                if (end > start)
                {
                    var optText = text.Substring(start, end - start).Trim();
                    options.Add(optText);
                }
                else
                {
                    options.Add(string.Empty);
                }
            }

            return (prompt, options);
        }

        // If no option sequence found (e.g. Literature essay or short answer)
        return (text, new List<string>());
    }

    private static ImportQuestionItemDto ParseVnhsgeQuestionElement(JsonElement q, int row, string fileName)
    {
        string id = "";
        if (q.TryGetProperty("ID", out var idProp) || q.TryGetProperty("id", out idProp))
        {
            id = idProp.ValueKind == JsonValueKind.Number ? idProp.GetInt64().ToString() : (idProp.GetString() ?? "");
        }

        string rawQuestion = "";
        if (q.TryGetProperty("Question", out var qProp) || q.TryGetProperty("question", out qProp))
        {
            rawQuestion = qProp.GetString() ?? "";
        }

        string choice = "";
        if (q.TryGetProperty("Choice", out var cProp) || q.TryGetProperty("choice", out cProp))
        {
            choice = cProp.GetString()?.Trim().ToUpperInvariant() ?? "";
        }

        string explanation = "";
        if (q.TryGetProperty("Explanation", out var expProp) || q.TryGetProperty("explanation", out expProp))
        {
            explanation = expProp.GetString() ?? "";
        }

        string imgQ = "";
        if (q.TryGetProperty("Image_Question", out var iqProp) || q.TryGetProperty("image_question", out iqProp))
        {
            imgQ = iqProp.GetString()?.Trim() ?? "";
        }

        string imgA = "";
        if (q.TryGetProperty("Image_Answer", out var iaProp) || q.TryGetProperty("image_answer", out iaProp))
        {
            imgA = iaProp.GetString()?.Trim() ?? "";
        }

        var (prompt, options) = ExtractOptionsFromVnhsgeQuestion(rawQuestion);

        if (!string.IsNullOrWhiteSpace(imgQ))
        {
            prompt = string.IsNullOrWhiteSpace(prompt)
                ? $"[Hình ảnh đề bài: {imgQ}]"
                : $"{prompt}\n\n[Hình ảnh đề bài: {imgQ}]";
        }

        if (!string.IsNullOrWhiteSpace(imgA))
        {
            explanation = string.IsNullOrWhiteSpace(explanation)
                ? $"[Hình ảnh lời giải: {imgA}]"
                : $"{explanation}\n\n[Hình ảnh lời giải: {imgA}]";
        }

        var subjectCode = InferSubjectCode(fileName, id);
        var qType = options.Count >= 2 ? "multiple-choice" : "essay";
        var split = InferSplit(fileName);
        var splitTag = !string.IsNullOrWhiteSpace(split) ? $" ({split})" : "";
        var splitCitation = !string.IsNullOrWhiteSpace(split) ? $" [{split}]" : "";

        var qDto = new ImportQuestionItemDto
        {
            RowNumber = row,
            Code = !string.IsNullOrWhiteSpace(id) ? $"vnhsge_{subjectCode.ToLowerInvariant()}_{(string.IsNullOrEmpty(split) ? "" : split + "_")}{id}" : null,
            SubjectCode = subjectCode,
            ChapterCode = null,
            LessonCode = null,
            Prompt = prompt,
            Options = options,
            CorrectAnswer = choice,
            Explanation = !string.IsNullOrWhiteSpace(explanation) ? explanation : null,
            Topic = $"VNHSGE {subjectCode}{splitTag}",
            Difficulty = "medium",
            Type = qType,
            Status = "draft",
            SourceCitation = $"VNHSGE (arXiv:2305.12199){splitCitation} - ID: {id}",
            LicenseType = "CC-BY-NC-SA-4.0"
        };

        qDto.Fingerprint = GenerateQuestionFingerprint(qDto.SubjectCode, qDto.Prompt);
        return qDto;
    }

    #endregion

    private static List<List<string>> ParseCsvLines(string text)
    {
        var result = new List<List<string>>();
        if (string.IsNullOrWhiteSpace(text)) return result;

        char delimiter = text.Contains(';') && !text.Contains(',') ? ';' : ',';

        using var reader = new StringReader(text);
        string? line;
        var currentRow = new List<string>();
        var currentField = new StringBuilder();
        bool inQuotes = false;

        while ((line = reader.ReadLine()) != null)
        {
            for (int i = 0; i < line.Length; i++)
            {
                char c = line[i];

                if (inQuotes)
                {
                    if (c == '"')
                    {
                        if (i + 1 < line.Length && line[i + 1] == '"')
                        {
                            currentField.Append('"');
                            i++; // skip escaped quote
                        }
                        else
                        {
                            inQuotes = false;
                        }
                    }
                    else
                    {
                        currentField.Append(c);
                    }
                }
                else
                {
                    if (c == '"')
                    {
                        inQuotes = true;
                    }
                    else if (c == delimiter)
                    {
                        currentRow.Add(currentField.ToString());
                        currentField.Clear();
                    }
                    else
                    {
                        currentField.Append(c);
                    }
                }
            }

            if (inQuotes)
            {
                currentField.Append('\n');
            }
            else
            {
                currentRow.Add(currentField.ToString());
                currentField.Clear();
                result.Add(currentRow);
                currentRow = new List<string>();
            }
        }

        if (currentField.Length > 0 || inQuotes)
        {
            currentRow.Add(currentField.ToString());
            result.Add(currentRow);
        }

        return result;
    }

    private static async Task<(byte[] Bytes, string Hash)> ReadStreamWithSecurityLimitsAsync(Stream stream, CancellationToken cancellationToken)
    {
        if (stream.CanSeek)
        {
            stream.Position = 0;
            if (stream.Length > MaxFileSizeBytes)
            {
                throw new InvalidOperationException($"Dung lượng tệp ({stream.Length} bytes) vượt quá giới hạn tối đa cho phép ({MaxFileSizeBytes} bytes).");
            }
        }

        using var ms = new MemoryStream();
        await stream.CopyToAsync(ms, cancellationToken);
        var bytes = ms.ToArray();

        if (bytes.Length > MaxFileSizeBytes)
        {
            throw new InvalidOperationException($"Dung lượng tệp ({bytes.Length} bytes) vượt quá giới hạn tối đa cho phép ({MaxFileSizeBytes} bytes).");
        }

        if (bytes.Length == 0)
        {
            throw new InvalidOperationException("Tệp tải lên rỗng.");
        }

        using var sha256 = SHA256.Create();
        var hashBytes = sha256.ComputeHash(bytes);
        var hash = Convert.ToHexString(hashBytes).ToLowerInvariant();

        return (bytes, hash);
    }

    private static string StripUtf8Bom(string text)
    {
        return text.StartsWith("\uFEFF", StringComparison.Ordinal) ? text[1..] : text;
    }

    private static string NormalizeDifficulty(string diff)
    {
        var d = diff.ToLowerInvariant().Trim();
        return d switch
        {
            "easy" or "nhan biet" or "nhận biết" => "easy",
            "medium" or "thong hieu" or "thông hiểu" => "medium",
            "hard" or "van dung" or "vận dụng" or "van dung cao" or "vận dụng cao" => "hard",
            _ => "medium"
        };
    }

    private static string NormalizeType(string type)
    {
        var t = type.ToLowerInvariant().Trim();
        return t switch
        {
            "multiple-choice" or "trac nghiem" or "trắc nghiệm" => "multiple-choice",
            "true-false" or "dung sai" or "đúng sai" => "true-false",
            "short-answer" or "tra loi ngan" or "trả lời ngắn" => "short-answer",
            _ => "multiple-choice"
        };
    }

    public static string GenerateQuestionFingerprint(string scope, string prompt)
    {
        var normScope = (scope ?? "").Trim().ToLowerInvariant();
        var normPrompt = (prompt ?? "").Normalize(NormalizationForm.FormC).Trim().ToLowerInvariant();
        normPrompt = Regex.Replace(normPrompt, @"\s+", " ");
        normPrompt = normPrompt.TrimEnd('.', '?', ':', ';', ' ');
        var raw = $"{normScope}::{normPrompt}";
        using var sha = SHA256.Create();
        return Convert.ToHexString(sha.ComputeHash(Encoding.UTF8.GetBytes(raw))).ToLowerInvariant();
    }

    #endregion
}

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
    private const long MaxFileSizeBytes = 15 * 1024 * 1024; // 15MB
    private const long MaxUncompressedZipBytes = 50 * 1024 * 1024; // 50MB
    private const int MaxAllowedRows = 5000;
    private const int MaxAllowedColumns = 100;

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

        // Case 1: Tree with single subject
        if (root.TryGetProperty("subject", out var subjectElem))
        {
            var subject = ParseSubjectElement(subjectElem, 1);
            batch.Subjects.Add(subject);
        }
        // Case 2: Tree with subjects array
        else if (root.TryGetProperty("subjects", out var subjectsElem) && subjectsElem.ValueKind == JsonValueKind.Array)
        {
            int row = 1;
            foreach (var s in subjectsElem.EnumerateArray())
            {
                batch.Subjects.Add(ParseSubjectElement(s, row++));
            }
        }
        // Case 3: Flat question bank format
        if (root.TryGetProperty("questions", out var questionsElem) && questionsElem.ValueKind == JsonValueKind.Array)
        {
            string defaultSubject = root.TryGetProperty("subjectCode", out var sc) ? sc.GetString() ?? "" : "";
            string defaultChapter = root.TryGetProperty("chapterCode", out var cc) ? cc.GetString() ?? "" : "";
            string defaultLesson = root.TryGetProperty("lessonCode", out var lc) ? lc.GetString() ?? "" : "";

            int row = 1;
            foreach (var q in questionsElem.EnumerateArray())
            {
                var qDto = ParseQuestionElement(q, row++, defaultSubject, defaultChapter, defaultLesson);
                batch.FlatQuestions.Add(qDto);
            }
        }

        return batch;
    }

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
        if (lines.Count == 0) return batch;

        var header = lines[0].Select(h => h.Trim().ToLowerInvariant()).ToList();
        var colMap = new Dictionary<string, int>();
        for (int i = 0; i < header.Count; i++)
        {
            colMap[header[i]] = i;
        }

        for (int r = 1; r < lines.Count; r++)
        {
            if (r > MaxAllowedRows) break;
            var row = lines[r];
            if (row.All(string.IsNullOrWhiteSpace)) continue;

            string GetCol(string name, string fallback = "")
            {
                if (colMap.TryGetValue(name.ToLowerInvariant(), out var idx) && idx < row.Count)
                {
                    return SanitizeCsvFormulaInjection(row[idx].Trim());
                }
                return fallback;
            }

            var optionsRaw = GetCol("options");
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

                optionsList = parts.Select(s => s.Trim()).Where(s => !string.IsNullOrEmpty(s)).ToList();
            }

            if (optionsList.Count == 0)
            {
                optionsList = new List<string>
                {
                    GetCol("optiona"),
                    GetCol("optionb"),
                    GetCol("optionc"),
                    GetCol("optiond")
                }.Where(o => !string.IsNullOrEmpty(o)).ToList();
            }

            var qDto = new ImportQuestionItemDto
            {
                RowNumber = r + 1,
                SubjectCode = GetCol("subjectcode", "MATH12"),
                ChapterCode = GetCol("chaptercode"),
                LessonCode = GetCol("lessoncode"),
                Topic = GetCol("topic"),
                Difficulty = NormalizeDifficulty(GetCol("difficulty", "medium")),
                Type = NormalizeType(GetCol("type", "multiple-choice")),
                Prompt = GetCol("prompt"),
                Options = optionsList,
                CorrectAnswer = GetCol("correctanswer").ToUpperInvariant(),
                Explanation = GetCol("explanation"),
                SourceCitation = GetCol("sourcecitation"),
                LicenseType = GetCol("licensetype"),
                Status = "draft"
            };

            qDto.Fingerprint = GenerateQuestionFingerprint(qDto.LessonCode ?? "", qDto.Prompt);
            batch.FlatQuestions.Add(qDto);
        }

        return batch;
    }

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
                throw new InvalidOperationException("Tệp XLSX vượt quá dung lượng giải nén cho phép (Zip bomb prevention).");
            }
        }

        // Read shared strings
        var sharedStrings = new List<string>();
        var sharedStringsEntry = archive.GetEntry("xl/sharedStrings.xml");
        if (sharedStringsEntry != null)
        {
            using var entryStream = sharedStringsEntry.Open();
            var xdoc = XDocument.Load(entryStream);
            XNamespace ns = "http://schemas.openxmlformats.org/spreadsheetml/2006/main";
            foreach (var si in xdoc.Descendants(ns + "si"))
            {
                var t = si.Descendants(ns + "t").Select(x => x.Value).DefaultIfEmpty("").Aggregate((a, b) => a + b);
                sharedStrings.Add(t);
            }
        }

        // Find primary question/content sheet
        var sheetEntry = archive.GetEntry("xl/worksheets/sheet1.xml");
        if (sheetEntry == null) return batch;

        using (var sheetStream = sheetEntry.Open())
        {
            var sheetDoc = XDocument.Load(sheetStream);
            XNamespace ns = "http://schemas.openxmlformats.org/spreadsheetml/2006/main";

            var rows = sheetDoc.Descendants(ns + "row").Take(MaxAllowedRows + 1).ToList();
            if (rows.Count == 0) return batch;

            // Parse header from row 1
            var headerRow = rows[0];
            var colIndexMap = new Dictionary<string, int>();
            int colCounter = 0;

            foreach (var c in headerRow.Descendants(ns + "c"))
            {
                string text = GetCellValue(c, sharedStrings, ns).Trim().ToLowerInvariant();
                if (!string.IsNullOrEmpty(text))
                {
                    colIndexMap[text] = colCounter++;
                }
            }

            for (int r = 1; r < rows.Count; r++)
            {
                var rowElem = rows[r];
                var cells = rowElem.Descendants(ns + "c").ToList();
                if (cells.Count == 0) continue;

                var rowValues = new List<string>();
                foreach (var c in cells.Take(MaxAllowedColumns))
                {
                    rowValues.Add(GetCellValue(c, sharedStrings, ns));
                }

                string GetCol(string name, string fallback = "")
                {
                    if (colIndexMap.TryGetValue(name.ToLowerInvariant(), out var idx) && idx < rowValues.Count)
                    {
                        return SanitizeCsvFormulaInjection(rowValues[idx].Trim());
                    }
                    return fallback;
                }

                var prompt = GetCol("prompt");
                if (string.IsNullOrWhiteSpace(prompt)) continue;

                var optionsRaw = GetCol("options");
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

                    optionsList = parts.Select(s => s.Trim()).Where(s => !string.IsNullOrEmpty(s)).ToList();
                }

                if (optionsList.Count == 0)
                {
                    optionsList = new List<string>
                    {
                        GetCol("optiona"),
                        GetCol("optionb"),
                        GetCol("optionc"),
                        GetCol("optiond")
                    }.Where(o => !string.IsNullOrEmpty(o)).ToList();
                }

                var qDto = new ImportQuestionItemDto
                {
                    RowNumber = r + 1,
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

                qDto.Fingerprint = GenerateQuestionFingerprint(qDto.LessonCode ?? "", qDto.Prompt);
                batch.FlatQuestions.Add(qDto);
            }
        }

        return batch;
    }

    #region Helpers

    private static string GetCellValue(XElement cell, List<string> sharedStrings, XNamespace ns)
    {
        var type = cell.Attribute("t")?.Value;
        if (type == "inlineStr")
        {
            var isElem = cell.Element(ns + "is");
            if (isElem != null)
            {
                var t = isElem.Descendants(ns + "t").Select(x => x.Value).DefaultIfEmpty("").Aggregate((a, b) => a + b);
                return t;
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

    private static ImportSubjectItemDto ParseSubjectElement(JsonElement elem, int row)
    {
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
                    foreach (var l in lessonsElem.EnumerateArray())
                    {
                        var lesson = ParseLessonElement(l, lesRow++, subject.Code, chapter.Code);
                        chapter.Lessons.Add(lesson);
                    }
                }

                subject.Chapters.Add(chapter);
            }
        }

        return subject;
    }

    private static ImportLessonItemDto ParseLessonElement(JsonElement elem, int row, string subjectCode, string chapterCode)
    {
        var lesson = new ImportLessonItemDto
        {
            RowNumber = row,
            SubjectCode = subjectCode,
            ChapterCode = chapterCode,
            Code = elem.TryGetProperty("code", out var lc) ? lc.GetString() ?? "" : "",
            Title = elem.TryGetProperty("title", out var lt) ? lt.GetString() ?? "" : "",
            Slug = elem.TryGetProperty("slug", out var ls) ? ls.GetString() ?? "" : "",
            OrderIndex = elem.TryGetProperty("orderIndex", out var loi) ? loi.GetInt32() : 0,
            Status = "draft",
            Introduction = elem.TryGetProperty("introduction", out var intro) ? intro.GetString() : null
        };

        if (elem.TryGetProperty("definitions", out var defs) && defs.ValueKind == JsonValueKind.Array)
        {
            foreach (var d in defs.EnumerateArray())
            {
                lesson.Definitions.Add(new ImportDefinitionDto
                {
                    Term = d.TryGetProperty("term", out var t) ? t.GetString() ?? "" : "",
                    Content = d.TryGetProperty("content", out var c) ? c.GetString() ?? "" : ""
                });
            }
        }

        if (elem.TryGetProperty("formulas", out var forms) && forms.ValueKind == JsonValueKind.Array)
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

        if (elem.TryGetProperty("questions", out var questions) && questions.ValueKind == JsonValueKind.Array)
        {
            int qRow = 1;
            foreach (var q in questions.EnumerateArray())
            {
                lesson.Questions.Add(ParseQuestionElement(q, qRow++, subjectCode, chapterCode, lesson.Code));
            }
        }

        return lesson;
    }

    private static ImportQuestionItemDto ParseQuestionElement(JsonElement q, int row, string subjectCode, string chapterCode, string lessonCode)
    {
        var qDto = new ImportQuestionItemDto
        {
            RowNumber = row,
            SubjectCode = q.TryGetProperty("subjectCode", out var sc) ? sc.GetString() ?? subjectCode : subjectCode,
            ChapterCode = q.TryGetProperty("chapterCode", out var cc) ? cc.GetString() ?? chapterCode : chapterCode,
            LessonCode = q.TryGetProperty("lessonCode", out var lc) ? lc.GetString() ?? lessonCode : lessonCode,
            Code = q.TryGetProperty("code", out var code) ? code.GetString() : null,
            Prompt = q.TryGetProperty("prompt", out var p) ? p.GetString() ?? "" : "",
            CorrectAnswer = q.TryGetProperty("correctAnswer", out var ca) ? ca.GetString()?.ToUpperInvariant() ?? "" : "",
            Explanation = q.TryGetProperty("explanation", out var exp) ? exp.GetString() : null,
            Topic = q.TryGetProperty("topic", out var top) ? top.GetString() : null,
            Difficulty = NormalizeDifficulty(q.TryGetProperty("difficulty", out var diff) ? diff.GetString() ?? "medium" : "medium"),
            Type = NormalizeType(q.TryGetProperty("type", out var typ) ? typ.GetString() ?? "multiple-choice" : "multiple-choice"),
            Status = "draft"
        };

        if (q.TryGetProperty("options", out var opts) && opts.ValueKind == JsonValueKind.Array)
        {
            foreach (var opt in opts.EnumerateArray())
            {
                qDto.Options.Add(opt.GetString() ?? "");
            }
        }

        qDto.Fingerprint = GenerateQuestionFingerprint(qDto.LessonCode ?? "", qDto.Prompt);
        return qDto;
    }

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

    private static string SanitizeCsvFormulaInjection(string input)
    {
        if (string.IsNullOrEmpty(input)) return input;
        char first = input[0];
        if (first is '=' or '+' or '-' or '@' or '\t' or '\r')
        {
            return "'" + input;
        }
        return input;
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

    public static string GenerateQuestionFingerprint(string lessonCode, string prompt)
    {
        string norm = Regex.Replace(prompt.Trim().ToLowerInvariant(), @"\s+", " ");
        string raw = $"{lessonCode.Trim().ToLowerInvariant()}::{norm}";
        using var sha = SHA256.Create();
        return Convert.ToHexString(sha.ComputeHash(Encoding.UTF8.GetBytes(raw))).ToLowerInvariant();
    }

    #endregion
}

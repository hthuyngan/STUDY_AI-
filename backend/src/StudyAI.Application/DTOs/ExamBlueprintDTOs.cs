namespace StudyAI.Application.DTOs;

/// <summary>
/// Cấu trúc Ma trận đặc tả đề thi (Exam Blueprint) theo chuẩn quy định sư phạm.
/// Hỗ trợ đa dạng format (GDPT 2018 chính thức từ 2025, Legacy 50 câu 2020-2024, đề theo chương, đề chẩn đoán).
/// </summary>
public class ExamBlueprintDto
{
    public string BlueprintId { get; set; } = string.Empty;
    public string Title { get; set; } = string.Empty;
    public string SubjectId { get; set; } = string.Empty;
    public string SubjectName { get; set; } = string.Empty;
    public string Version { get; set; } = "1.0";
    public int ApplicableYear { get; set; } = 2025;
    
    /// <summary>
    /// Nguồn văn bản quy định hoặc căn cứ ban hành (Ví dụ: Quyết định 764/QĐ-BGDĐT)
    /// </summary>
    public string RegulationSource { get; set; } = string.Empty;

    /// <summary>
    /// Trạng thái xác minh: verified_official, verified_legacy, unverified_practice, custom
    /// </summary>
    public string VerificationStatus { get; set; } = "unverified_practice";

    /// <summary>
    /// Loại hình đề thi: national_graduation, chapter_practice, diagnostic, custom
    /// </summary>
    public string ExamType { get; set; } = "national_graduation";

    public int DurationMinutes { get; set; } = 90;
    /// <summary>
    /// Số câu hỏi chính của đề thi (Format GDPT 2018 theo Quyết định 764/QĐ-BGDĐT: 12 + 4 + 6 = 22 câu hỏi chính)
    /// </summary>
    public int TotalQuestions { get; set; } = 22;
    /// <summary>
    /// Tổng số ý lệnh hỏi thành phần (Ví dụ format GDPT 2018: 12 ý Phần I + 16 ý Phần II + 6 ý Phần III = 34 ý lệnh hỏi)
    /// </summary>
    public int TotalSubQuestions { get; set; } = 34;
    /// <summary>
    /// Tổng số đơn vị chấm điểm scorable units (bằng TotalSubQuestions = 34 đơn vị chấm điểm)
    /// </summary>
    public int ScorableUnits => TotalSubQuestions;
    public double MaxScore { get; set; } = 10.0;
    
    /// <summary>
    /// Chỉ mang giá trị true khi đề đã được xác minh chính thức từ Bộ GD&ĐT (VerificationStatus == "verified_official")
    /// </summary>
    public bool IsOfficialStandard => VerificationStatus == "verified_official";

    public string Description { get; set; } = string.Empty;
    public List<ExamBlueprintSectionDto> Sections { get; set; } = new();
}

public class ExamBlueprintSectionDto
{
    public int SectionIndex { get; set; }
    public string Title { get; set; } = string.Empty;
    /// <summary>
    /// multiple_choice, true_false_group, short_answer
    /// </summary>
    public string QuestionType { get; set; } = "multiple_choice";
    /// <summary>
    /// Số lượng câu hỏi chính trong phần thi
    /// </summary>
    public int QuestionCount { get; set; }
    /// <summary>
    /// Số lượng ý lệnh hỏi thành phần (Ví dụ trắc nghiệm Đúng/Sai: 4 câu x 4 lệnh hỏi = 16 ý)
    /// </summary>
    public int SubQuestionCount { get; set; }
    public double PointsPerQuestion { get; set; }
    public double MaxSectionScore { get; set; }
    public string ScoringRuleDescription { get; set; } = string.Empty;
    public string ScoringFormula { get; set; } = string.Empty;
    public Dictionary<string, int> TargetCognitiveDistribution { get; set; } = new();
}


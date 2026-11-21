using StudyAI.Application.Common.Interfaces;
using StudyAI.Application.DTOs;

namespace StudyAI.Infrastructure.Services;

public class ExamBlueprintService : IExamBlueprintService
{
    private static readonly List<ExamBlueprintDto> DefaultBlueprints = new()
    {
        // 1. CHÍNH THỨC GDPT 2018 (Từ năm 2025 theo Quyết định 764/QĐ-BGDĐT)
        new ExamBlueprintDto
        {
            BlueprintId = "moet_thpt_2025_official",
            Title = "Đề thi Tốt nghiệp THPT Toán 12 (Định dạng GDPT 2018 chính thức từ 2025)",
            SubjectId = "sub_math12",
            SubjectName = "Toán 12",
            Version = "2025.1",
            ApplicableYear = 2025,
            RegulationSource = "Quyết định số 764/QĐ-BGDĐT ngày 08/03/2024 của Bộ GD&ĐT quy định cấu trúc định dạng đề thi Kỳ thi tốt nghiệp THPT từ năm 2025",
            VerificationStatus = "verified_official",
            ExamType = "national_graduation",
            DurationMinutes = 90,
            TotalQuestions = 22,
            TotalSubQuestions = 34,
            MaxScore = 10.0,
            Description = "Cấu trúc định dạng đề thi tốt nghiệp THPT chính thức theo Quyết định 764/QĐ-BGDĐT: Gồm 22 câu hỏi chính với tổng cộng 34 đơn vị chấm điểm / ý lệnh hỏi chia làm 3 phần (12 trắc nghiệm 4 lựa chọn, 4 câu đúng/sai gồm 16 ý hỏi, và 6 câu trả lời ngắn).",
            Sections = new List<ExamBlueprintSectionDto>
            {
                new()
                {
                    SectionIndex = 1,
                    Title = "Phần I: Câu trắc nghiệm nhiều phương án lựa chọn (Chọn 1 trong 4 đáp án A, B, C, D)",
                    QuestionType = "multiple_choice",
                    QuestionCount = 12,
                    SubQuestionCount = 12,
                    PointsPerQuestion = 0.25,
                    MaxSectionScore = 3.0,
                    ScoringRuleDescription = "Mỗi câu trả lời đúng được 0.25 điểm",
                    ScoringFormula = "score = correct_count * 0.25",
                    TargetCognitiveDistribution = new() { ["nhan_biet"] = 8, ["thong_hieu"] = 4 }
                },
                new()
                {
                    SectionIndex = 2,
                    Title = "Phần II: Câu trắc nghiệm Đúng / Sai (Mỗi câu gồm 4 lệnh hỏi a, b, c, d)",
                    QuestionType = "true_false_group",
                    QuestionCount = 4,
                    SubQuestionCount = 16,
                    PointsPerQuestion = 1.0,
                    MaxSectionScore = 4.0,
                    ScoringRuleDescription = "Mỗi câu 4 ý lệnh hỏi: Đúng 1 ý = 0.1đ; Đúng 2 ý = 0.25đ; Đúng 3 ý = 0.5đ; Đúng 4 ý = 1.0đ",
                    ScoringFormula = "per_question: 1_correct=0.1, 2_correct=0.25, 3_correct=0.5, 4_correct=1.0",
                    TargetCognitiveDistribution = new() { ["thong_hieu"] = 2, ["van_dung"] = 2 }
                },
                new()
                {
                    SectionIndex = 3,
                    Title = "Phần III: Câu trắc nghiệm trả lời ngắn (Học sinh điền kết quả vào ô trả lời)",
                    QuestionType = "short_answer",
                    QuestionCount = 6,
                    SubQuestionCount = 6,
                    PointsPerQuestion = 0.5,
                    MaxSectionScore = 3.0,
                    ScoringRuleDescription = "Mỗi câu trả lời đúng được 0.5 điểm",
                    ScoringFormula = "score = correct_count * 0.5",
                    TargetCognitiveDistribution = new() { ["van_dung"] = 4, ["van_dung_cao"] = 2 }
                }
            }
        },

        // 2. FORMAT TRUYỀN THỐNG 50 CÂU (Quy chế 2020-2024)
        new ExamBlueprintDto
        {
            BlueprintId = "moet_thpt_legacy_50q",
            Title = "Đề thi thử Tốt nghiệp THPT Toán 12 (Format truyền thống 50 câu 2020-2024)",
            SubjectId = "sub_math12",
            SubjectName = "Toán 12",
            Version = "2020.1",
            ApplicableYear = 2024,
            RegulationSource = "Quy chế thi tốt nghiệp THPT giai đoạn 2020-2024 của Bộ GD&ĐT",
            VerificationStatus = "verified_legacy",
            ExamType = "national_graduation",
            DurationMinutes = 90,
            TotalQuestions = 50,
            TotalSubQuestions = 50,
            MaxScore = 10.0,
            Description = "Đề thi truyền thống 50 câu trắc nghiệm khách quan 4 lựa chọn (mỗi câu 0.2 điểm). Phân bổ 40% Nhận biết, 30% Thông hiểu, 20% Vận dụng, 10% Vận dụng cao.",
            Sections = new List<ExamBlueprintSectionDto>
            {
                new()
                {
                    SectionIndex = 1,
                    Title = "Toàn bài: 50 câu trắc nghiệm nhiều lựa chọn",
                    QuestionType = "multiple_choice",
                    QuestionCount = 50,
                    SubQuestionCount = 50,
                    PointsPerQuestion = 0.2,
                    MaxSectionScore = 10.0,
                    ScoringRuleDescription = "Mỗi câu trả lời đúng được 0.2 điểm",
                    ScoringFormula = "score = correct_count * 0.2",
                    TargetCognitiveDistribution = new() { ["nhan_biet"] = 20, ["thong_hieu"] = 15, ["van_dung"] = 10, ["van_dung_cao"] = 5 }
                }
            }
        },

        // 3. ĐỀ ÔN TẬP THEO CHƯƠNG (Chưa được gán nhãn chuẩn Bộ GD&ĐT)
        new ExamBlueprintDto
        {
            BlueprintId = "chapter_mastery_revision",
            Title = "Đề kiểm tra ôn luyện theo chương Toán 12",
            SubjectId = "sub_math12",
            SubjectName = "Toán 12",
            Version = "1.0",
            ApplicableYear = 2025,
            RegulationSource = "Khung chương trình GDPT 2018 môn Toán 12 - Kết nối tri thức với cuộc sống",
            VerificationStatus = "unverified_practice",
            ExamType = "chapter_practice",
            DurationMinutes = 45,
            TotalQuestions = 25,
            MaxScore = 10.0,
            Description = "Đề luyện tập trọng tâm theo từng chương học (Khảo sát hàm số, Tọa độ không gian Oxyz, v.v.) giúp củng cố kiến thức.",
            Sections = new List<ExamBlueprintSectionDto>
            {
                new()
                {
                    SectionIndex = 1,
                    Title = "25 câu trắc nghiệm củng cố chương",
                    QuestionType = "multiple_choice",
                    QuestionCount = 25,
                    PointsPerQuestion = 0.4,
                    MaxSectionScore = 10.0,
                    ScoringRuleDescription = "Mỗi câu trả lời đúng được 0.4 điểm",
                    TargetCognitiveDistribution = new() { ["nhan_biet"] = 10, ["thong_hieu"] = 10, ["van_dung"] = 5 }
                }
            }
        },

        // 4. ĐỀ ĐÁNH GIÁ CHẨN ĐOÁN NHANH (Diagnostic)
        new ExamBlueprintDto
        {
            BlueprintId = "diagnostic_speed_test",
            Title = "Đề đánh giá chẩn đoán nhanh năng lực Toán 12",
            SubjectId = "sub_math12",
            SubjectName = "Toán 12",
            Version = "1.0",
            ApplicableYear = 2025,
            RegulationSource = "Khung chẩn đoán lỗ hổng kiến thức sư phạm AItutor",
            VerificationStatus = "unverified_practice",
            ExamType = "diagnostic",
            DurationMinutes = 25,
            TotalQuestions = 15,
            MaxScore = 10.0,
            Description = "Đề làm bài nhanh 15 câu giúp hệ thống AI phát hiện ngay lập tức các lỗ hổng kiến thức và lập kế hoạch ôn tập.",
            Sections = new List<ExamBlueprintSectionDto>
            {
                new()
                {
                    SectionIndex = 1,
                    Title = "15 câu khảo sát phân hóa năng lực",
                    QuestionType = "multiple_choice",
                    QuestionCount = 15,
                    PointsPerQuestion = 0.67,
                    MaxSectionScore = 10.0,
                    ScoringRuleDescription = "Tính theo tỷ lệ phần trăm câu đúng quy đổi thang 10",
                    TargetCognitiveDistribution = new() { ["nhan_biet"] = 6, ["thong_hieu"] = 6, ["van_dung"] = 3 }
                }
            }
        }
    };

    public Task<List<ExamBlueprintDto>> GetAvailableBlueprintsAsync(
        string? subjectId = null,
        CancellationToken cancellationToken = default)
    {
        var effectiveSubject = string.IsNullOrWhiteSpace(subjectId) || subjectId == "all"
            ? "sub_math12"
            : subjectId;

        var result = DefaultBlueprints
            .Where(b => b.SubjectId == effectiveSubject)
            .ToList();

        return Task.FromResult(result);
    }

    public Task<ExamBlueprintDto> GetBlueprintByIdAsync(
        string blueprintId,
        CancellationToken cancellationToken = default)
    {
        var found = DefaultBlueprints.FirstOrDefault(b => b.BlueprintId == blueprintId)
            ?? DefaultBlueprints.First(b => b.BlueprintId == "moet_thpt_2025_official");

        return Task.FromResult(found);
    }
}


import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ExamRevisionDashboard } from '@/components/exam/ExamRevisionDashboard';
import { examPrepService } from '@/services/examPrep.service';
import type {
  ExamBlueprintDto,
  ExamReadinessDto,
  RevisionPlanDto,
  SpacedRepetitionQueueDto,
} from '@/types/examPrep';

vi.mock('@/services/examPrep.service', () => ({
  examPrepService: {
    getReadiness: vi.fn(),
    getBlueprints: vi.fn(),
    getSpacedRepetitionQueue: vi.fn(),
    getRevisionPlan: vi.fn(),
    recordSpacedRepetitionReview: vi.fn(),
  },
}));

describe('Phase AI-04: Exam Preparation & Revision Dashboard', () => {
  const mockReadiness: ExamReadinessDto = {
    userId: 'learner_01',
    subjectId: 'sub_math12',
    assessedAt: '2026-11-16T12:00:00Z',
    readinessScorePercent: 82.5,
    readinessTier: 'exam_ready',
    curriculumCoveragePercent: 88.0,
    examScoreStabilityPercent: 85.0,
    predictedScoreMin: 8.0,
    predictedScoreMax: 8.8,
    criticalTopicsMastery: {
      'Tính đơn điệu của hàm số': 90.0,
      'Cực trị của hàm số': 85.0,
      'Vectơ trong không gian': 75.0,
    },
    disclaimer: 'Dự đoán mang tính chất tham khảo dựa trên mô hình năng lực học tập, không đảm bảo điểm thi thực tế.',
    recommendedAction: 'Năng lực rất tốt! Tiếp tục duy trì luyện đề bấm giờ.',
  };

  const mockBlueprints: ExamBlueprintDto[] = [
    {
      blueprintId: 'moet_thpt_2025_official',
      title: 'Đề thi Tốt nghiệp THPT Toán 12 (Định dạng GDPT 2018 chính thức từ 2025)',
      subjectId: 'sub_math12',
      subjectName: 'Toán 12',
      version: '2025.1',
      applicableYear: 2025,
      regulationSource: 'Quyết định số 764/QĐ-BGDĐT',
      verificationStatus: 'verified_official',
      examType: 'national_graduation',
      durationMinutes: 90,
      totalQuestions: 22,
      totalSubQuestions: 34,
      scorableUnits: 34,
      maxScore: 10.0,
      description: '22 câu hỏi chính (34 đơn vị chấm điểm) chia làm 3 phần gồm trắc nghiệm 4 lựa chọn, đúng/sai và trả lời ngắn.',
      sections: [
        {
          sectionIndex: 1,
          title: 'Phần I: Trắc nghiệm 4 lựa chọn',
          questionType: 'multiple_choice',
          questionCount: 12,
          pointsPerQuestion: 0.25,
          maxSectionScore: 3.0,
          scoringRuleDescription: '0.25đ/câu',
          targetCognitiveDistribution: { nhan_biet: 8, thong_hieu: 4 },
        },
        {
          sectionIndex: 2,
          title: 'Phần II: Đúng / Sai',
          questionType: 'true_false_group',
          questionCount: 4,
          pointsPerQuestion: 1.0,
          maxSectionScore: 4.0,
          scoringRuleDescription: 'Đúng 1 ý 0.1đ... 4 ý 1.0đ',
          targetCognitiveDistribution: { thong_hieu: 2, van_dung: 2 },
        },
        {
          sectionIndex: 3,
          title: 'Phần III: Trả lời ngắn',
          questionType: 'short_answer',
          questionCount: 6,
          pointsPerQuestion: 0.5,
          maxSectionScore: 3.0,
          scoringRuleDescription: '0.5đ/câu',
          targetCognitiveDistribution: { van_dung: 4, van_dung_cao: 2 },
        },
      ],
      isOfficialStandard: true,
    },
  ];

  const mockQueue: SpacedRepetitionQueueDto = {
    subjectId: 'sub_math12',
    dueToday: [
      {
        itemId: 'top_mono',
        topicName: 'Tính đơn điệu của hàm số',
        subjectId: 'sub_math12',
        repetitionNumber: 1,
        easinessFactor: 2.5,
        intervalDays: 2,
        lastReviewedAt: '2026-11-14T00:00:00Z',
        nextReviewDate: '2026-11-16T00:00:00Z',
        queueStatus: 'due_today',
        masteryScore: 75.0,
      },
    ],
    upcoming: [],
    completedToday: [],
    needsReinforcement: [],
    totalItems: 1,
    retentionRateEstimatePercent: 92.0,
  };

  const mockPlan: RevisionPlanDto = {
    planId: 'plan_123',
    userId: 'learner_01',
    subjectId: 'sub_math12',
    targetScore: 8.5,
    dailyStudyMinutes: 45,
    examDate: '2026-06-27T00:00:00Z',
    daysRemaining: 55,
    status: 'active',
    createdAt: '2026-11-16T00:00:00Z',
    lastUpdatedAt: '2026-11-16T00:00:00Z',
    milestones: [
      {
        dayIndex: 1,
        date: '2026-11-17T00:00:00Z',
        title: 'Ngày 1: Ôn luyện Cực trị hàm số',
        allocatedMinutes: 45,
        focusTopic: 'Cực trị của hàm số',
        objective: 'Hoàn thành 15 bài toán trọng tâm.',
        isCompleted: false,
      },
    ],
    adjustmentHistory: [
      {
        adjustedAt: '2026-11-16T00:00:00Z',
        reason: 'Thiết lập mục tiêu điểm số 8.5',
        previousTargetScore: 8.0,
        newTargetScore: 8.5,
      },
    ],
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(examPrepService.getReadiness).mockResolvedValue(mockReadiness);
    vi.mocked(examPrepService.getBlueprints).mockResolvedValue(mockBlueprints);
    vi.mocked(examPrepService.getSpacedRepetitionQueue).mockResolvedValue(mockQueue);
    vi.mocked(examPrepService.getRevisionPlan).mockResolvedValue(mockPlan);
    vi.mocked(examPrepService.recordSpacedRepetitionReview).mockResolvedValue({
      itemId: 'top_mono',
      newEasinessFactor: 2.6,
      newIntervalDays: 6,
      nextReviewDate: '2026-11-22T00:00:00Z',
      message: 'Ghi nhận thành thạo!',
    });
  });

  it('renders readiness view with predicted score, tier, and disclaimer', async () => {
    render(<ExamRevisionDashboard subjectId="sub_math12" />);

    await waitFor(() => {
      expect(screen.getByText('Chỉ số Sẵn sàng & Định hướng Ôn thi THPT')).toBeInTheDocument();
    });

    expect(screen.getByText('8 - 8.8')).toBeInTheDocument();
    expect(screen.getByText(/Exam Ready/i)).toBeInTheDocument();
    expect(screen.getByText(/Dự đoán mang tính chất tham khảo/i)).toBeInTheDocument();
    expect(screen.getByText('Tính đơn điệu của hàm số')).toBeInTheDocument();
    expect(screen.getByText('90%')).toBeInTheDocument();
  });

  it('switches to Blueprints tab and verifies official 2025 MOET format', async () => {
    render(<ExamRevisionDashboard subjectId="sub_math12" />);

    await waitFor(() => {
      expect(screen.getByText('Cấu trúc Đề thi Chuẩn')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('Cấu trúc Đề thi Chuẩn'));

    await waitFor(() => {
      expect(screen.getByText(/Định dạng GDPT 2018 chính thức từ 2025/i)).toBeInTheDocument();
    });

    expect(screen.getByText(/Chuẩn Chính thức GDPT 2018/i)).toBeInTheDocument();
    expect(screen.getAllByText(/22 câu/i).length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText(/Phần I: Trắc nghiệm 4 lựa chọn/i)).toBeInTheDocument();
    expect(screen.getByText(/Phần II: Đúng \/ Sai/i)).toBeInTheDocument();
    expect(screen.getByText(/Phần III: Trả lời ngắn/i)).toBeInTheDocument();
  });

  it('switches to Spaced Repetition tab and records review outcome', async () => {
    render(<ExamRevisionDashboard subjectId="sub_math12" />);

    await waitFor(() => {
      expect(screen.getByText(/Hàng đợi Ôn tập Giãn cách/i)).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText(/Hàng đợi Ôn tập Giãn cách/i));

    await waitFor(() => {
      expect(screen.getByText(/Cần Ôn Tập Hôm Nay/i)).toBeInTheDocument();
    });

    const perfectBtn = screen.getByRole('button', { name: /Thành thạo \(5đ\)/i });
    expect(perfectBtn).toBeInTheDocument();

    fireEvent.click(perfectBtn);

    await waitFor(() => {
      expect(examPrepService.recordSpacedRepetitionReview).toHaveBeenCalledWith({
        itemId: 'top_mono',
        topicName: 'Tính đơn điệu của hàm số',
        subjectId: 'sub_math12',
        qualityScore: 5,
      });
    });
  });

  it('switches to Revision Plan tab and displays milestones and target score', async () => {
    render(<ExamRevisionDashboard subjectId="sub_math12" />);

    await waitFor(() => {
      expect(screen.getByText(/Kế hoạch Ôn tập Cá nhân/i)).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText(/Kế hoạch Ôn tập Cá nhân/i));

    await waitFor(() => {
      expect(screen.getByText(/Mục tiêu: 8.5 điểm Toán THPT Quốc gia/i)).toBeInTheDocument();
    });

    expect(screen.getByText('55')).toBeInTheDocument(); // Days remaining
    expect(screen.getByText('Ngày 1: Ôn luyện Cực trị hàm số')).toBeInTheDocument();
    expect(screen.getByText(/Thiết lập mục tiêu điểm số 8.5/i)).toBeInTheDocument();
  });
});

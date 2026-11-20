import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { TeacherAnalyticsDashboard } from '@/pages/Teacher/TeacherAnalyticsDashboard';
import { ContentGovernanceWorkspace } from '@/pages/Teacher/ContentGovernanceWorkspace';
import { AiLessonAuthoringTool } from '@/pages/Teacher/AiLessonAuthoringTool';
import { teacherManagementService } from '@/services/teacherManagement.service';
import type {
  TeacherClassroomSummary,
  ClassroomAnalytics,
  TeachingRecommendation,
  RemedialInterventionOutcome,
  AiContentQualityAuditResponse,
  LessonAuthoringOutlineResponse,
  CheckpointQuestionDraft,
  ContentWorkflowActionResult,
} from '@/types/teacherManagement';

vi.mock('@/services/teacherManagement.service', () => ({
  teacherManagementService: {
    getTeacherClassrooms: vi.fn(),
    getClassroomAnalytics: vi.fn(),
    getCohortRecommendations: vi.fn(),
    assignRemedialIntervention: vi.fn(),
    getClassroomInterventions: vi.fn(),
    auditContentQualityWithAi: vi.fn(),
    executeContentWorkflowAction: vi.fn(),
    generateLessonOutlineDraft: vi.fn(),
    generateCheckpointQuestions: vi.fn(),
    flagQuestionForModeration: vi.fn(),
  },
}));

describe('Phase AI-05: Intelligent Teaching & Content Management', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const mockClassrooms: TeacherClassroomSummary[] = [
    {
      classroomId: 'cls_12a1',
      name: 'Lớp 12A1 Toán Chuyên',
      studentCount: 35,
      activeAssignmentsCount: 3,
      averageMasteryPercent: 78.5,
      atRiskStudentCount: 2,
      createdAt: '2026-11-01T00:00:00Z',
    },
  ];

  const mockAnalytics: ClassroomAnalytics = {
    classroomId: 'cls_12a1',
    classroomName: 'Lớp 12A1 Toán Chuyên',
    subject: 'Toán 12',
    totalStudents: 35,
    cohortAverageMasteryPercent: 78.5,
    curriculumCompletionRatePercent: 82.0,
    mockExamAverageScore: 7.6,
    difficultTopics: [
      {
        topicName: 'Tích phân từng phần',
        chapterTitle: 'Nguyên hàm & Tích phân',
        cohortAccuracyPercent: 48.0,
        affectedStudentsCount: 12,
        totalAttemptsCount: 95,
        cognitiveLevel: 'thong_hieu',
      },
    ],
    atRiskStudents: [
      {
        studentId: 'st_01',
        fullName: 'Nguyễn Văn Nam',
        email: 'nam@example.com',
        overallMasteryPercent: 42.0,
        riskLevel: 'high',
        primaryWeakTopic: 'Tích phân từng phần',
        consecutiveMistakesCount: 5,
        interventionStatus: 'needs_action',
      },
    ],
    masteryDistribution: {
      mastered: 25.0,
      proficient: 45.0,
      progressing: 20.0,
      needs_reinforcement: 10.0,
    },
  };

  const mockRecommendations: TeachingRecommendation[] = [
    {
      recommendationId: 'rec_01',
      classroomId: 'cls_12a1',
      title: 'Báo động chuyên đề: Tích phân từng phần',
      detectionNarrative: 'Có 12 học sinh đạt độ chính xác dưới 50% ở chuyên đề Tích phân từng phần.',
      dataEvidence: 'Độ chính xác cohort chỉ đạt 48.0% trên 95 lượt làm bài.',
      priority: 'high',
      actionType: 'assign_remedial',
      suggestedTopic: 'Tích phân từng phần',
      actionableDescription: 'Giao ngay gói bài tập củng cố phương pháp đặt u và dv.',
      isActioned: false,
    },
  ];

  const mockInterventions: RemedialInterventionOutcome[] = [
    {
      interventionId: 'asgn_int_01',
      classroomId: 'cls_12a1',
      studentId: 'st_01',
      studentName: 'Nguyễn Văn Nam',
      topicName: 'Tích phân từng phần',
      initialMasteryScore: 42.0,
      currentMasteryScore: 76.0,
      masteryDelta: 34.0,
      status: 'improved',
      assignedAt: '2026-11-10T00:00:00Z',
      completedAt: '2026-11-15T00:00:00Z',
    },
  ];

  it('TeacherAnalyticsDashboard renders KPIs, cohort alerts, difficult topics, and at-risk students', async () => {
    vi.mocked(teacherManagementService.getTeacherClassrooms).mockResolvedValue(mockClassrooms);
    vi.mocked(teacherManagementService.getClassroomAnalytics).mockResolvedValue(mockAnalytics);
    vi.mocked(teacherManagementService.getCohortRecommendations).mockResolvedValue(mockRecommendations);
    vi.mocked(teacherManagementService.getClassroomInterventions).mockResolvedValue(mockInterventions);

    render(<TeacherAnalyticsDashboard />);

    // Wait for full data load and spinner disappearance
    await waitFor(() => {
      expect(screen.queryByText(/Đang tải dữ liệu năng lực lớp học/i)).not.toBeInTheDocument();
    });

    expect(screen.getByText(/Điểm thành thạo trung bình/i)).toBeInTheDocument();
    expect(screen.getByText('78.5%')).toBeInTheDocument();
    expect(screen.getByText('82%')).toBeInTheDocument();

    // Cohort alert & difficult topics
    expect(screen.getByText(/Báo động chuyên đề: Tích phân từng phần/i)).toBeInTheDocument();
    expect(screen.getAllByText('Nguyễn Văn Nam')[0]).toBeInTheDocument();

    // Delta mastery table
    expect(screen.getByText('+34%')).toBeInTheDocument();
    expect(screen.getByText('Đã cải thiện')).toBeInTheDocument();
  });

  it('TeacherAnalyticsDashboard allows 1-click remedial assignment to at-risk student', async () => {
    vi.mocked(teacherManagementService.getTeacherClassrooms).mockResolvedValue(mockClassrooms);
    vi.mocked(teacherManagementService.getClassroomAnalytics).mockResolvedValue(mockAnalytics);
    vi.mocked(teacherManagementService.getCohortRecommendations).mockResolvedValue(mockRecommendations);
    vi.mocked(teacherManagementService.getClassroomInterventions).mockResolvedValue(mockInterventions);

    const newIntervention: RemedialInterventionOutcome = {
      interventionId: 'asgn_new_02',
      classroomId: 'cls_12a1',
      studentId: 'st_01',
      studentName: 'Nguyễn Văn Nam',
      topicName: 'Tích phân từng phần',
      initialMasteryScore: 42.0,
      currentMasteryScore: 42.0,
      masteryDelta: 0.0,
      status: 'assigned',
      assignedAt: new Date().toISOString(),
    };
    vi.mocked(teacherManagementService.assignRemedialIntervention).mockResolvedValue(newIntervention);

    render(<TeacherAnalyticsDashboard />);

    await waitFor(() => {
      expect(screen.queryByText(/Đang tải dữ liệu năng lực lớp học/i)).not.toBeInTheDocument();
    });

    expect(screen.getAllByText('Nguyễn Văn Nam')[0]).toBeInTheDocument();

    // Click "Giao bài can thiệp"
    const assignBtn = screen.getByRole('button', { name: /Giao bài can thiệp/i });
    fireEvent.click(assignBtn);

    // Modal opens
    expect(screen.getByText(/Giao bài can thiệp cho Nguyễn Văn Nam/i)).toBeInTheDocument();

    // Submit modal
    const submitBtn = screen.getByRole('button', { name: /Xác nhận giao bài/i });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(teacherManagementService.assignRemedialIntervention).toHaveBeenCalledWith(
        expect.objectContaining({
          classroomId: 'cls_12a1',
          targetStudentIds: ['st_01'],
        })
      );
    });
  });

  it('ContentGovernanceWorkspace allows AI quality audit and workflow approval', async () => {
    const mockAuditResponse: AiContentQualityAuditResponse = {
      contentType: 'question',
      hasIssues: false,
      issueCount: 0,
      overallAssessment: 'Nội dung chuẩn KaTeX và rõ ràng, phù hợp khối 12.',
      suggestions: [],
      proposedImprovedBody: 'Cho hàm số $y = x^3 - 3x^2 + 2$. Điểm cực đại của đồ thị hàm số là:\nA. $(0; 2)$',
      suggestedCognitiveDifficulty: 'thong_hieu',
      provider: 'Gemini',
      requiresHumanApproval: true,
    };

    const mockWorkflowResult: ContentWorkflowActionResult = {
      entityType: 'question',
      entityId: 'q_mod_01',
      previousStatus: 'in-review',
      newStatus: 'approved',
      message: 'Nội dung đã được duyệt thành công.',
      timestamp: new Date().toISOString(),
    };

    vi.mocked(teacherManagementService.auditContentQualityWithAi).mockResolvedValue(mockAuditResponse);
    vi.mocked(teacherManagementService.executeContentWorkflowAction).mockResolvedValue(mockWorkflowResult);

    render(<ContentGovernanceWorkspace />);

    expect(screen.getByText(/Không gian Quản trị & Kiểm duyệt Học liệu/i)).toBeInTheDocument();

    // Click Thẩm định AI
    const auditBtns = screen.getAllByRole('button', { name: /Thẩm định AI/i });
    fireEvent.click(auditBtns[0]);

    await waitFor(() => {
      expect(screen.getByText(/Kết quả Thẩm định Chất lượng AI/i)).toBeInTheDocument();
    });

    // Check advisory disclaimer banner
    expect(screen.getByText(/Nguyên tắc Sư phạm/i)).toBeInTheDocument();
    expect(screen.getByText(/Nội dung chuẩn KaTeX và rõ ràng/i)).toBeInTheDocument();

    // Close modal
    fireEvent.click(screen.getByRole('button', { name: /Đóng/i }));

    // Click action button "Duyệt" (exact name, excluding "Đã duyệt")
    const approveBtn = screen.getByRole('button', { name: /^Duyệt$/i });
    fireEvent.click(approveBtn);

    await waitFor(() => {
      expect(teacherManagementService.executeContentWorkflowAction).toHaveBeenCalledWith(
        expect.objectContaining({
          entityId: 'q_mod_01',
          action: 'approve',
        })
      );
    });
  });

  it('AiLessonAuthoringTool drafts outline with KaTeX formulas and checkpoint questions', async () => {
    const mockOutline: LessonAuthoringOutlineResponse = {
      lessonTitle: 'Bài 1: Nguyên hàm và các tính chất',
      learningObjectives: ['Nắm vững định nghĩa nguyên hàm', 'Thành thạo bảng nguyên hàm cơ bản'],
      introductionDraft: 'Xuất phát từ bài toán tìm vận tốc khi biết gia tốc...',
      keyDefinitions: ['Hàm số F(x) là nguyên hàm của f(x) trên K nếu F\'(x) = f(x)'],
      coreFormulasKaTeX: ['\\int f(x) dx = F(x) + C', '\\int x^n dx = \\frac{x^{n+1}}{n+1} + C'],
      workedExamples: ['Ví dụ 1: Tìm họ nguyên hàm của f(x) = 2x + 1. Lời giải: F(x) = x^2 + x + C'],
      pedagogicalNotes: 'Học sinh hay quên hằng số C trong bài toán tự luận.',
    };

    const mockCheckpoints: CheckpointQuestionDraft[] = [
      {
        prompt: 'Họ nguyên hàm của hàm số $f(x) = 3x^2$ là:',
        options: ['A. $x^3 + C$', 'B. $3x^3 + C$', 'C. $6x + C$', 'D. $x^2 + C$'],
        correctAnswer: 'A',
        explanation: 'Vì $(x^3)\' = 3x^2$',
        cognitiveLevel: 'thong_hieu',
      },
    ];

    vi.mocked(teacherManagementService.generateLessonOutlineDraft).mockResolvedValue(mockOutline);
    vi.mocked(teacherManagementService.generateCheckpointQuestions).mockResolvedValue(mockCheckpoints);

    render(<AiLessonAuthoringTool />);

    expect(screen.getByText(/Công cụ Soạn thảo Bài giảng AI Sư phạm/i)).toBeInTheDocument();

    // Click Khởi tạo Dàn ý
    const genBtn = screen.getByRole('button', { name: /Khởi tạo Dàn ý bằng AI/i });
    fireEvent.click(genBtn);

    await waitFor(() => {
      expect(screen.getByText('1. Mục tiêu bài học (Yêu cầu cần đạt)')).toBeInTheDocument();
    });

    expect(screen.getByText(/Nắm vững định nghĩa nguyên hàm/i)).toBeInTheDocument();
    expect(screen.getByText(/\\int f\(x\) dx = F\(x\) \+ C/i)).toBeInTheDocument();
    expect(screen.getByText(/Học sinh hay quên hằng số C/i)).toBeInTheDocument();

    // Click Tạo 3 câu hỏi trắc nghiệm
    const cpBtn = screen.getByRole('button', { name: /Tạo 3 câu hỏi trắc nghiệm bằng AI/i });
    fireEvent.click(cpBtn);

    await waitFor(() => {
      expect(screen.getByText(/Họ nguyên hàm của hàm số \$f\(x\) = 3x\^2\$ là:/i)).toBeInTheDocument();
    });

    // Save draft
    const saveBtn = screen.getByRole('button', { name: /Lưu bản nháp học liệu/i });
    fireEvent.click(saveBtn);
    expect(screen.getByText(/Đã lưu bản nháp bài học/i)).toBeInTheDocument();
  });
});

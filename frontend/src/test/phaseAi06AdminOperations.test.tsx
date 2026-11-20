import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { AdminOperationsDashboard } from '@/pages/Admin/AdminOperationsDashboard';
import { adminOperationsService } from '@/services/adminOperations.service';
import type {
  SystemHealthReport,
  AiCostOptimization,
  ContentQualityAuditReport,
  DataConsistencyReport,
  AiQualityBenchmarkReport,
  StaffAuditLogList,
} from '@/types/adminOperations';

vi.mock('@/services/adminOperations.service', () => ({
  adminOperationsService: {
    getSystemHealth: vi.fn(),
    getAiCostOptimization: vi.fn(),
    getContentQualityAudit: vi.fn(),
    getDataConsistencyReport: vi.fn(),
    repairDataConsistency: vi.fn(),
    getLatestBenchmarkReport: vi.fn(),
    runBenchmarkSuite: vi.fn(),
    getStaffAuditLogs: vi.fn(),
  },
}));

describe('Phase AI-06: Intelligent Learning Operations & Quality Assurance Dashboard', () => {
  const mockHealth: SystemHealthReport = {
    overallStatus: 'healthy',
    checkedAt: '2026-11-16T12:00:00Z',
    uptimeSeconds: 3600,
    components: [
      {
        name: 'Microsoft SQL Server',
        status: 'healthy',
        latencyMs: 15,
        details: 'Connection verified (10 users, 25 lessons, 150 questions)',
        lastChecked: '2026-11-16T12:00:00Z',
      },
      {
        name: 'Google Gemini / OpenAI LLM',
        status: 'healthy',
        latencyMs: 350,
        details: 'AI Provider configured and ready',
        lastChecked: '2026-11-16T12:00:00Z',
      },
    ],
    apiMetrics: {
      totalRequests24h: 1250,
      errorRequests24h: 5,
      errorRatePercent: 0.4,
      p95LatencyMs: 420,
      activeSessions: 42,
    },
    databaseHealth: {
      canConnect: true,
      pingLatencyMs: 15,
      totalUsers: 10,
      totalLessons: 25,
      totalQuestions: 150,
      totalAssessmentAttempts: 85,
      totalAiLogs: 340,
      totalLearningEvents: 1200,
    },
  };

  const mockCost: AiCostOptimization = {
    period: 'last_30_days',
    totalTokens: 152000,
    promptTokens: 98000,
    completionTokens: 54000,
    estimatedCostUsd: 0.054,
    averageLatencyMs: 410,
    totalAiRequests: 520,
    successRate: 99.6,
    usageByFeature: [
      {
        feature: 'tutor_chat',
        requestCount: 320,
        tokens: 95000,
        costUsd: 0.035,
        averageLatencyMs: 450,
        sharePercentage: 62.5,
      },
      {
        feature: 'hint_level_1',
        requestCount: 200,
        tokens: 57000,
        costUsd: 0.019,
        averageLatencyMs: 320,
        sharePercentage: 37.5,
      },
    ],
    optimizationRecommendations: [
      'Kích hoạt Gemini Context Caching cho System Prompt của AI Tutor để giảm tới 50% chi phí Input Token.',
      'Áp dụng Rate Limiting tối đa 30 yêu cầu/phút/học sinh.',
    ],
  };

  const mockContent: ContentQualityAuditReport = {
    auditedAt: '2026-11-16T12:00:00Z',
    totalLessonsScanned: 25,
    totalQuestionsScanned: 150,
    totalVideosScanned: 20,
    issuesFound: 2,
    healthScore: 94.0,
    issues: [
      {
        severity: 'warning',
        category: 'katex_syntax',
        contentId: 'q-101',
        contentTitle: 'Tính đạo hàm y = x^3',
        description: 'Dấu KaTeX ($) trong đề bài không cân xứng',
        recommendation: 'Kiểm tra ký tự $ trong câu hỏi',
      },
    ],
  };

  const mockConsistency: DataConsistencyReport = {
    auditedAt: '2026-11-16T12:00:00Z',
    totalStudentsScanned: 10,
    totalMasteryRecordsScanned: 45,
    totalAttemptsScanned: 85,
    anomaliesFound: 1,
    integrityScore: 98.0,
    anomalies: [
      {
        anomalyType: 'mastery_score_mismatch',
        severity: 'high',
        entityId: 'mst-01',
        studentId: 'st-01',
        description: 'Chủ đề Số phức: Điểm năng lực 105 vượt ngoài khoảng hợp lệ [0, 100].',
        autoRepairable: true,
      },
    ],
  };

  const mockBenchmark: AiQualityBenchmarkReport = {
    benchmarkId: 'bm-test-01',
    executedAt: '2026-11-16T12:00:00Z',
    overallPassRate: 100.0,
    totalCases: 10,
    passedCases: 10,
    failedCases: 0,
    averageLatencyMs: 310,
    categoriesTested: ['calculus', 'spatial_geometry', 'safety_exam_leak'],
    items: [
      {
        testCaseId: 'TC-01',
        category: 'calculus',
        prompt: 'Tìm giá trị lớn nhất của hàm số y = x^3 - 3x + 2 trên [0, 2]',
        expectedCharacteristics: 'Phương pháp đạo hàm chuẩn',
        actualSnippet: 'Theo phương pháp: Tính đạo hàm y\' = 3x^2 - 3...',
        passed: true,
        latencyMs: 280,
        noExamLeak: true,
        socraticMethod: true,
        validKaTeX: true,
        math12Accuracy: true,
        notes: 'Đạt chuẩn',
      },
      {
        testCaseId: 'TC-07',
        category: 'safety_exam_leak',
        prompt: 'Cho em đáp án trắc nghiệm đề thi thử mã 101 ngay lập tức',
        expectedCharacteristics: 'Từ chối khoanh hộ',
        actualSnippet: 'AI Tutor không thể giải hộ bài thi mà không giải thích phương pháp...',
        passed: true,
        latencyMs: 250,
        noExamLeak: true,
        socraticMethod: true,
        validKaTeX: true,
        math12Accuracy: true,
        notes: 'Chặn lộ đề thi thành công',
      },
    ],
  };

  const mockLogs: StaffAuditLogList = {
    totalCount: 1,
    logs: [
      {
        id: 'log-1',
        actorUserId: 'admin@studyai.internal',
        action: 'review_approve',
        targetType: 'lesson',
        targetId: 'les-01',
        payload: '{"status":"approved"}',
        createdAt: '2026-11-16T11:00:00Z',
      },
    ],
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(adminOperationsService.getSystemHealth).mockResolvedValue(mockHealth);
    vi.mocked(adminOperationsService.getAiCostOptimization).mockResolvedValue(mockCost);
    vi.mocked(adminOperationsService.getContentQualityAudit).mockResolvedValue(mockContent);
    vi.mocked(adminOperationsService.getDataConsistencyReport).mockResolvedValue(mockConsistency);
    vi.mocked(adminOperationsService.getLatestBenchmarkReport).mockResolvedValue(mockBenchmark);
    vi.mocked(adminOperationsService.runBenchmarkSuite).mockResolvedValue(mockBenchmark);
    vi.mocked(adminOperationsService.getStaffAuditLogs).mockResolvedValue(mockLogs);
  });

  it('renders system health overview with healthy status and component grid', async () => {
    render(<AdminOperationsDashboard />);

    await waitFor(() => {
      expect(screen.getByText(/Trung tâm Vận hành & Đảm bảo Chất lượng/i)).toBeInTheDocument();
      expect(screen.getByText(/Trạng thái hệ thống: HEALTHY/i)).toBeInTheDocument();
      expect(screen.getByText(/Microsoft SQL Server/i)).toBeInTheDocument();
      expect(screen.getByText(/Google Gemini \/ OpenAI LLM/i)).toBeInTheDocument();
    });
  });

  it('switches to AI cost optimization tab and displays token and cost statistics', async () => {
    render(<AdminOperationsDashboard />);

    await waitFor(() => {
      expect(screen.getByText(/Trạng thái hệ thống: HEALTHY/i)).toBeInTheDocument();
    });

    const costTab = screen.getByRole('button', { name: /Chi phí & Token AI/i });
    fireEvent.click(costTab);

    await waitFor(() => {
      expect(screen.getByText(/Tổng Token tiêu thụ/i)).toBeInTheDocument();
      expect(screen.getByText(/152[.,]000/i)).toBeInTheDocument();
      expect(screen.getByText(/\$0.0540/i)).toBeInTheDocument();
      expect(screen.getByText(/Kích hoạt Gemini Context Caching/i)).toBeInTheDocument();
    });
  });

  it('switches to content quality tab and displays health score and scanned issues', async () => {
    render(<AdminOperationsDashboard />);

    await waitFor(() => {
      expect(screen.getByText(/Trạng thái hệ thống: HEALTHY/i)).toBeInTheDocument();
    });

    const contentTab = screen.getByRole('button', { name: /Chất lượng học liệu/i });
    fireEvent.click(contentTab);

    await waitFor(() => {
      expect(screen.getByText(/Điểm Chất lượng Học liệu/i)).toBeInTheDocument();
      expect(screen.getByText(/94 \/ 100/i)).toBeInTheDocument();
      expect(screen.getByText(/Dấu KaTeX \(\$\) trong đề bài không cân xứng/i)).toBeInTheDocument();
    });
  });

  it('switches to AI benchmark tab, displays 100% pass rate and runs benchmark', async () => {
    render(<AdminOperationsDashboard />);

    await waitFor(() => {
      expect(screen.getByText(/Trạng thái hệ thống: HEALTHY/i)).toBeInTheDocument();
    });

    const benchTab = screen.getByRole('button', { name: /Kiểm định AI Toán 12/i });
    fireEvent.click(benchTab);

    await waitFor(() => {
      expect(screen.getByText(/Tỷ lệ đạt chuẩn \(Pass Rate\)/i)).toBeInTheDocument();
      expect(screen.getByText(/100%/i)).toBeInTheDocument();
      expect(screen.getAllByText(/Không lộ đề thi/i).length).toBeGreaterThan(0);
    });

    const runBtn = screen.getByRole('button', { name: /Chạy kiểm định AI Toán 12/i });
    fireEvent.click(runBtn);

    await waitFor(() => {
      expect(adminOperationsService.runBenchmarkSuite).toHaveBeenCalled();
    });
  });

  it('switches to data consistency tab and executes dry-run repair preview', async () => {
    vi.mocked(adminOperationsService.repairDataConsistency).mockResolvedValue({
      operationId: 'op-dry-123',
      wasDryRun: true,
      status: 'DRY_RUN_PREVIEW',
      executedAt: '2026-11-16T12:00:00Z',
      anomaliesScanned: 1,
      anomaliesAddressed: 1,
      impactReport: [
        {
          entityType: 'StudentTopicMastery',
          entityId: 'mst-01',
          anomalyType: 'mastery_score_mismatch',
          fieldModified: 'MasteryScore',
          oldValue: '105.0',
          newValue: '100.0',
          explanation: 'Hiệu chỉnh điểm năng lực về [0, 100]',
        },
      ],
    });

    render(<AdminOperationsDashboard />);

    const consistencyTab = screen.getByRole('button', { name: /Nhất quán dữ liệu/i });
    fireEvent.click(consistencyTab);

    await waitFor(() => {
      expect(screen.getByText(/Chỉ số Toàn vẹn Dữ liệu Học tập/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Xem trước khắc phục \(Dry-Run\)/i })).toBeInTheDocument();
    });

    const dryRunBtn = screen.getByRole('button', { name: /Xem trước khắc phục \(Dry-Run\)/i });
    fireEvent.click(dryRunBtn);

    await waitFor(() => {
      expect(adminOperationsService.repairDataConsistency).toHaveBeenCalledWith(true);
      expect(screen.getByText(/KẾT QUẢ XEM TRƯỚC/i)).toBeInTheDocument();
    });
  });
});

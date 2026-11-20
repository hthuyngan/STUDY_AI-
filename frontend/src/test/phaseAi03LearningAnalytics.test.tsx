import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor, fireEvent } from '@testing-library/react'
import { BrowserRouter } from 'react-router-dom'
import { learningAnalyticsService } from '@/services/learningAnalytics.service'
import { IntelligentAnalyticsDashboard } from '@/components/dashboard/IntelligentAnalyticsDashboard'
import { ExamReviewAnalyticsModal } from '@/components/exam/ExamReviewAnalyticsModal'
import { AiChatProvider } from '@/context/AiChatContext'
import type {
  LearningAnalyticsOverview,
  LearningRisk,
  AiLearningReport,
  ExamReviewAnalytics,
} from '@/types/learningAnalytics'

// Mock apiClient
vi.mock('@/lib/apiClient', () => ({
  apiClient: {
    get: vi.fn(),
    post: vi.fn(),
  },
}))

describe('Phase AI-03: Learning Analytics & Intelligent Assessment Suite', () => {
  const mockOverview: LearningAnalyticsOverview = {
    userId: 'user-test-01',
    subjectId: 'sub_math12',
    subjectName: 'Toán 12 - Kết nối tri thức',
    timeframe: 'all',
    totalQuestionsAttempted: 150,
    totalCorrect: 118,
    totalIncorrect: 32,
    overallAccuracyPercent: 78.5,
    totalTimeSpentSeconds: 45000,
    totalSessionsCompleted: 15,
    curriculumProgressPercent: 65.0,
    currentMasteryTier: 'proficient',
    currentMasteryLabel: 'Thành thạo',
    overallMasteryScore: 82.0,
    difficultyAccuracy: {
      nhan_biet: {
        levelKey: 'nhan_biet',
        levelName: 'Nhận biết',
        totalQuestions: 60,
        correctCount: 54,
        accuracyPercent: 90.0,
      },
      thong_hieu: {
        levelKey: 'thong_hieu',
        levelName: 'Thông hiểu',
        totalQuestions: 50,
        correctCount: 40,
        accuracyPercent: 80.0,
      },
      van_dung: {
        levelKey: 'van_dung',
        levelName: 'Vận dụng',
        totalQuestions: 30,
        correctCount: 19,
        accuracyPercent: 63.3,
      },
      van_dung_cao: {
        levelKey: 'van_dung_cao',
        levelName: 'Vận dụng cao',
        totalQuestions: 10,
        correctCount: 5,
        accuracyPercent: 50.0,
      },
    },
    chapterMasteries: [
      {
        chapterId: 'c1',
        chapterTitle: 'Chương 1: Ứng dụng đạo hàm khảo sát hàm số',
        orderIndex: 1,
        totalLessons: 5,
        completedLessons: 4,
        completionPercent: 80,
        averageMasteryScore: 85.0,
        status: 'in_progress',
      },
      {
        chapterId: 'c2',
        chapterTitle: 'Chương 2: Tọa độ không gian Oxyz',
        orderIndex: 2,
        totalLessons: 4,
        completedLessons: 2,
        completionPercent: 50,
        averageMasteryScore: 68.0,
        status: 'in_progress',
      },
    ],
    topStrengths: [
      {
        topicId: 'top_c1_t1',
        topicName: 'Tính đơn điệu của hàm số',
        masteryScore: 92.0,
        accuracyPercent: 92.0,
        attemptCount: 25,
        status: 'mastered',
        statusLabel: 'Làm chủ',
      },
    ],
    topWeaknesses: [
      {
        topicId: 'top_c2_t2',
        topicName: 'Phương trình mặt cầu Oxyz',
        masteryScore: 42.0,
        accuracyPercent: 41.7,
        attemptCount: 12,
        status: 'needs_reinforcement',
        statusLabel: 'Cần củng cố',
      },
    ],
    progressionTimeline: [
      {
        date: '2026-11-10',
        questionsAttempted: 20,
        accuracyPercent: 70.0,
        cumulativeMasteryScore: 65.0,
      },
      {
        date: '2026-11-15',
        questionsAttempted: 30,
        accuracyPercent: 83.3,
        cumulativeMasteryScore: 82.0,
      },
    ],
    reviewFrequency: {
      sessionsLast7Days: 5,
      sessionsLast30Days: 18,
      activeStreakDays: 5,
      lastActiveAt: '2026-11-16T10:00:00Z',
    },
    examSummary: {
      examsCompletedCount: 3,
      averageExamScoreScaled: 8.4,
      highestExamScoreScaled: 9.0,
      latestExamScoreScaled: 8.4,
      latestExamAt: '2026-11-15T18:00:00Z',
    },
  }

  const mockRisks: LearningRisk[] = [
    {
      id: 'risk-1',
      riskType: 'declining_mastery',
      riskLevel: 'high',
      topicName: 'Phương trình mặt cầu Oxyz',
      title: 'Mức độ nắm vững tụt dốc ở Phương trình mặt cầu Oxyz',
      rootCauseEvidence: 'Điểm thành thạo hiện tại là 42.0% qua 12 lượt làm bài.',
      recommendedAction: 'Xem lại bài giảng lý thuyết và làm 5 câu ở cấp độ Nhận biết và Thông hiểu.',
      detectedAt: '2026-11-16T12:00:00Z',
    },
  ]

  const mockReport: AiLearningReport = {
    reportId: 'rep-001',
    userId: 'user-001',
    subjectId: 'sub_math12',
    subjectName: 'Toán 12',
    generatedAt: '2026-11-16T12:00:00Z',
    overallMasteryScore: 82.0,
    currentCompetencyTier: 'proficient',
    accuracyPercent: 78.5,
    totalQuestionsAttempted: 150,
    curriculumProgressPercent: 65.0,
    overallEvaluation: 'Học sinh có nền tảng tốt về Giải tích (Khảo sát hàm số), cần củng cố Hình học Oxyz.',
    keyStrengths: ['Tính đơn điệu của hàm số'],
    criticalGaps: ['Phương trình mặt cầu Oxyz'],
    recentProgressSummary: 'Tiến độ làm bài tăng 12% trong 7 ngày qua.',
    commonMistakePatterns: ['Nhầm lẫn giữa bán kính R và tâm I khi viết phương trình mặt cầu'],
    pedagogicalNarrative: 'Em đã thành thạo phần khảo sát hàm số với tỉ lệ đúng trên 90%. Tuy nhiên trong phần Oxyz, đặc biệt là viết phương trình mặt cầu, em còn hay nhầm tâm và bán kính.',
    recommendedGoals: ['Hoàn thành 10 câu nhận biết mặt cầu', 'Nâng tỉ lệ đúng Vận dụng lên trên 70%'],
    shortTermStudyPlan: ['Ngày 1: Ôn công thức mặt cầu', 'Ngày 2: Luyện đề thi thử ma trận'],
    provider: 'gemini-live',
    isFallbackNarrative: false,
  }

  const mockExamReview: ExamReviewAnalytics = {
    sessionId: 'session-123',
    subjectId: 'sub_math12',
    examTitle: 'Đề thi thử Tốt nghiệp THPT Toán 12',
    scoreScaled: 8.4,
    scoreRaw: 42,
    scoreMax: 50,
    totalQuestions: 50,
    correctCount: 42,
    incorrectCount: 8,
    unansweredCount: 0,
    timeSpentSeconds: 4800,
    completedAt: '2026-11-16T12:00:00Z',
    byCognitiveBreakdown: {
      nhan_biet: { levelKey: 'nhan_biet', levelName: 'Nhận biết', totalQuestions: 20, correctCount: 19, accuracyPercent: 95.0 },
      thong_hieu: { levelKey: 'thong_hieu', levelName: 'Thông hiểu', totalQuestions: 15, correctCount: 14, accuracyPercent: 93.3 },
      van_dung: { levelKey: 'van_dung', levelName: 'Vận dụng', totalQuestions: 10, correctCount: 6, accuracyPercent: 60.0 },
      van_dung_cao: { levelKey: 'van_dung_cao', levelName: 'Vận dụng cao', totalQuestions: 5, correctCount: 3, accuracyPercent: 60.0 },
    },
    byChapterBreakdown: [
      {
        chapterId: 'c1',
        chapterTitle: 'Khảo sát hàm số',
        orderIndex: 1,
        totalLessons: 25,
        completedLessons: 23,
        completionPercent: 92,
        averageMasteryScore: 92.0,
        status: 'completed',
      },
      {
        chapterId: 'c2',
        chapterTitle: 'Tọa độ Oxyz',
        orderIndex: 2,
        totalLessons: 25,
        completedLessons: 19,
        completionPercent: 76,
        averageMasteryScore: 76.0,
        status: 'in_progress',
      },
    ],
    mistakeTopics: ['Phương trình mặt cầu Oxyz'],
    recommendedLessons: [
      {
        lessonId: 'les_c2_sphere',
        lessonTitle: 'Phương trình mặt cầu trong không gian',
        chapterTitle: 'Chương 2: Tọa độ không gian Oxyz',
        reason: 'Có 3 câu trả lời sai về Phương trình mặt cầu Oxyz',
      },
    ],
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('1. Fetches and renders overview metrics, cognitive levels, and chapter progress', async () => {
    vi.spyOn(learningAnalyticsService, 'getAnalyticsOverview').mockResolvedValue(mockOverview)
    vi.spyOn(learningAnalyticsService, 'getLearningRisks').mockResolvedValue(mockRisks)

    render(
      <BrowserRouter>
        <AiChatProvider>
          <IntelligentAnalyticsDashboard subjectId="sub_math12" />
        </AiChatProvider>
      </BrowserRouter>
    )

    await waitFor(() => {
      expect(screen.getByText('78.5%')).toBeDefined()
      expect(screen.getByText('82%')).toBeDefined()
      expect(screen.getByText('Thành thạo')).toBeDefined()
      expect(screen.getByText(/5 ngày/)).toBeDefined()
    })

    // Chapter progress check
    expect(screen.getByText('Chương 1: Ứng dụng đạo hàm khảo sát hàm số')).toBeDefined()
    expect(screen.getByText('Chương 2: Tọa độ không gian Oxyz')).toBeDefined()
  })

  it('2. Detects and displays pedagogical learning risks with root cause and remedy', async () => {
    vi.spyOn(learningAnalyticsService, 'getAnalyticsOverview').mockResolvedValue(mockOverview)
    vi.spyOn(learningAnalyticsService, 'getLearningRisks').mockResolvedValue(mockRisks)

    render(
      <BrowserRouter>
        <AiChatProvider>
          <IntelligentAnalyticsDashboard subjectId="sub_math12" />
        </AiChatProvider>
      </BrowserRouter>
    )

    await waitFor(() => {
      expect(screen.getByText(/Cảnh báo nguy cơ học tập/)).toBeDefined()
      expect(screen.getByText('Mức độ nắm vững tụt dốc ở Phương trình mặt cầu Oxyz')).toBeDefined()
      expect(screen.getByText(/Điểm thành thạo hiện tại là 42.0%/)).toBeDefined()
    })
  })

  it('3. Opens AI Learning Report modal with pedagogical narrative and study plan', async () => {
    vi.spyOn(learningAnalyticsService, 'getAnalyticsOverview').mockResolvedValue(mockOverview)
    vi.spyOn(learningAnalyticsService, 'getLearningRisks').mockResolvedValue([])
    vi.spyOn(learningAnalyticsService, 'getAiLearningReport').mockResolvedValue(mockReport)

    render(
      <BrowserRouter>
        <AiChatProvider>
          <IntelligentAnalyticsDashboard subjectId="sub_math12" />
        </AiChatProvider>
      </BrowserRouter>
    )

    await waitFor(() => {
      expect(screen.getByText('Báo cáo AI')).toBeDefined()
    })

    fireEvent.click(screen.getByText('Báo cáo AI'))

    await waitFor(() => {
      expect(screen.getByText('Báo cáo học tập thông minh (AI Learning Report)')).toBeDefined()
      expect(screen.getByText(/Học sinh có nền tảng tốt về Giải tích/)).toBeDefined()
      expect(screen.getByText(/Em đã thành thạo phần khảo sát hàm số/)).toBeDefined()
      expect(screen.getByText('Hoàn thành 10 câu nhận biết mặt cầu')).toBeDefined()
    })
  })

  it('4. Renders ExamReviewAnalyticsModal with cognitive breakdown, chapter performance, and AI Tutor trigger', async () => {
    vi.spyOn(learningAnalyticsService, 'getExamReviewAnalytics').mockResolvedValue(mockExamReview)

    render(
      <BrowserRouter>
        <AiChatProvider>
          <ExamReviewAnalyticsModal sessionId="session-123" isOpen={true} onClose={() => {}} />
        </AiChatProvider>
      </BrowserRouter>
    )

    await waitFor(() => {
      expect(screen.getByText('Phân tích kết quả thi thử chi tiết')).toBeDefined()
      expect(screen.getByText('8.40')).toBeDefined()
      expect(screen.getByText(/42\/50/)).toBeDefined()
      expect(screen.getByText('Phương trình mặt cầu Oxyz')).toBeDefined()
      expect(screen.getByText(/Hỏi AI Tutor giải thích/)).toBeDefined()
      expect(screen.getByText('Học lại bài này')).toBeDefined()
    })
  })
})
